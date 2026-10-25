#!/usr/bin/env node
// Juxt benchmark runner: the same coding agent on the same tasks, with and without Juxt.
//
//   node bench/run.mjs                         # all tasks, both arms, 1 run, Claude Code
//   node bench/run.mjs --runs 3 --model sonnet
//   node bench/run.mjs --tasks cancel-order --arms juxt
//   node bench/run.mjs --agent stub            # pipeline check, no model (applies reference solutions)
//
// Fairness rules (see bench/README.md): same model, same repo, same permissions, same
// prompt. The juxt arm differs only by the installed Juxt skill and the words "use juxt:".
// Hidden acceptance tests are copied in after the agent finishes; it never sees them.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { BENCH, REPO, WIN, loadTasks, prepWorkdir, commitAll, diffStat, runAcceptance, runRepoTests, applyReference } from './lib.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const AGENT = opt('--agent', 'claude');
const ARMS = opt('--arms', 'baseline,juxt').split(',');
const RUNS = +opt('--runs', '1');
const MODEL = opt('--model', null);
const MAX_TURNS = +opt('--max-turns', '40');
const KEEP = argv.includes('--keep');
const TASKS = loadTasks(opt('--tasks', 'all'));

const SUFFIX = '\n\nThis is a non-interactive run: nobody can answer questions. If something is unclear, check the repo and its docs; if it is still unclear, choose the safest option and say which you chose. Finish with `npm test` passing.';
const promptFor = (task, arm) => (arm === 'juxt' ? 'use juxt: ' : '') + task.prompt + SUFFIX;

function setupJuxt(dir) {
  // Local CLI, so the run measures this checkout. init.sh needs bash; without it the
  // skill is still installed (Windows without Git Bash), which the notes record.
  const r = spawnSync(process.execPath, [path.join(REPO, 'packages', 'cli', 'bin', 'juxt.js'), 'init', '--host', 'claude'], { cwd: dir, encoding: 'utf8' });
  commitAll(dir, 'juxt init');
  return { initExit: r.status, contextFile: fs.existsSync(path.join(dir, 'juxt', 'context.juxt')) };
}

function parseResult(stdout) {
  const t = (stdout || '').trim();
  const tryParse = s => { try { return JSON.parse(s); } catch { return null; } };
  let j = tryParse(t);
  if (!j) { const lines = t.split(/\r?\n/).reverse(); for (const l of lines) { j = tryParse(l); if (j) break; } }
  return j || {};
}

function runClaude(dir, prompt) {
  const args = ['-p', '--output-format', 'json', '--permission-mode', 'acceptEdits',
    '--allowedTools', 'Read,Edit,Write,Glob,Grep,Bash(npm test:*),Bash(npm run:*),Bash(node:*)',
    '--max-turns', String(MAX_TURNS)];
  if (MODEL) args.push('--model', MODEL);
  const t0 = Date.now();
  const r = WIN
    ? spawnSync(['claude', ...args].map(a => `"${a}"`).join(' '), { cwd: dir, input: prompt, encoding: 'utf8', shell: true, timeout: 30 * 60e3, maxBuffer: 64 << 20 })
    : spawnSync('claude', args, { cwd: dir, input: prompt, encoding: 'utf8', timeout: 30 * 60e3, maxBuffer: 64 << 20 });
  if (r.error) throw new Error(`could not start claude: ${r.error.message}. Install Claude Code and sign in first.`);
  const j = parseResult(r.stdout);
  const u = j.usage || {};
  const tokens = {
    input: u.input_tokens || 0, output: u.output_tokens || 0,
    cacheRead: u.cache_read_input_tokens || 0, cacheWrite: u.cache_creation_input_tokens || 0,
  };
  tokens.total = tokens.input + tokens.output + tokens.cacheRead + tokens.cacheWrite;
  return { tokens, costUsd: j.total_cost_usd ?? null, turns: j.num_turns ?? null, ms: j.duration_ms ?? (Date.now() - t0), isError: !!j.is_error || r.status !== 0, finalMessage: String(j.result || '').slice(0, 2000), exit: r.status };
}

function runStub(dir, task) {
  applyReference(dir, task);
  return { tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }, costUsd: 0, turns: 0, ms: 0, isError: false, finalMessage: 'stub: applied reference solution', exit: 0 };
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
fs.mkdirSync(path.join(BENCH, 'results'), { recursive: true });
const outJsonl = path.join(BENCH, 'results', `${stamp}-${AGENT}.jsonl`);
const rows = [];

console.log(`Juxt benchmark · agent ${AGENT}${MODEL ? ' · model ' + MODEL : ''} · ${TASKS.length} task(s) × ${ARMS.join('/')} × ${RUNS} run(s)\n`);
for (let run = 1; run <= RUNS; run++) for (const task of TASKS) for (const arm of ARMS) {
  const dir = prepWorkdir(task, arm);
  const setup = arm === 'juxt' ? setupJuxt(dir) : {};
  let res;
  try { res = AGENT === 'stub' ? runStub(dir, task) : runClaude(dir, promptFor(task, arm)); }
  catch (e) { console.error(String(e.message || e)); process.exit(2); }
  const changed = diffStat(dir);
  const repo = runRepoTests(dir);
  const acc = runAcceptance(dir, task);
  const solved = acc.fail === 0 && acc.pass > 0 && repo.ok;
  const row = { run, task: task.id, arm, agent: AGENT, model: MODEL, solved, accept: acc, repoTests: repo, changed, setup, ...res };
  rows.push(row);
  fs.appendFileSync(outJsonl, JSON.stringify(row) + '\n');
  console.log(`${solved ? 'solved' : 'failed'}  ${task.id.padEnd(16)} ${arm.padEnd(8)} checks ${acc.pass}/${acc.pass + acc.fail}  repo ${repo.ok ? 'green' : 'RED'}  tokens ${res.tokens.total}  ${res.costUsd != null ? '$' + res.costUsd.toFixed(4) : ''}  turns ${res.turns ?? '-'}`);
  if (!KEEP) fs.rmSync(dir, { recursive: true, force: true }); else console.log('        kept: ' + dir);
}

// summary per arm
const med = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = a => a.length ? a.reduce((k, x) => k + x, 0) / a.length : 0;
const lines = ['| arm | solved | hidden checks passed | median tokens | mean cost | mean turns |', '|---|---|---|---|---|---|'];
for (const arm of ARMS) {
  const r = rows.filter(x => x.arm === arm);
  const p = r.reduce((k, x) => k + x.accept.pass, 0), t = r.reduce((k, x) => k + x.accept.pass + x.accept.fail, 0);
  const cost = r.filter(x => x.costUsd != null).map(x => x.costUsd);
  lines.push(`| ${arm} | ${r.filter(x => x.solved).length}/${r.length} | ${p}/${t} | ${Math.round(med(r.map(x => x.tokens.total)))} | ${cost.length ? '$' + mean(cost).toFixed(4) : '-'} | ${mean(r.map(x => x.turns || 0)).toFixed(1)} |`);
}
const md = [`# Juxt benchmark · ${stamp}`, '', `agent: ${AGENT}${MODEL ? ` · model: ${MODEL}` : ''} · runs per cell: ${RUNS} · tasks: ${TASKS.map(t => t.id).join(', ')}`, '', ...lines, '',
  'Tokens and cost are as reported by the agent (input + output + cache read + cache write). Every run is in the .jsonl file next to this one, including failures.'].join('\n');
fs.writeFileSync(outJsonl.replace(/\.jsonl$/, '.md'), md + '\n');
console.log('\n' + lines.join('\n'));
console.log(`\nraw results: ${path.relative(process.cwd(), outJsonl)}`);
