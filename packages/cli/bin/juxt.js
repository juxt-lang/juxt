#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { lint, toIR, toTypedIR } = require('../lib/lint');
const pkg = require('../package.json');

const SKILL = path.join(__dirname, '..', 'skill');
const RECIPES = path.join(__dirname, '..', 'recipes');
const TTY = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (TTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const HOSTS = {
  agents: '.agents/skills/juxt',   // Codex and other Agent Skills hosts
  claude: '.claude/skills/juxt',   // Claude Code (project skill)
  cursor: '.cursor/skills/juxt',
  gemini: '.gemini/skills/juxt',
};

function help() {
  console.log(`${c('1', 'juxt')} ${pkg.version} · Juxt-lang, the language for directing AI agents

Usage
  npx juxt-lang init [--host agents|claude|cursor|gemini|all] [--force]
      Add Juxt mode to this repo: installs the Agent Skill and writes juxt/context.juxt.
      Default host: agents (.agents/skills/juxt, read by Codex and other Agent Skills tools).
  npx juxt-lang php2shell            Fix PHP2Shell: sets up and starts your AI agent
      options: --agent claude|codex|gemini|cursor  --print  --no-launch
  npx juxt-lang fix <recipe>         Write a ready-made fix program, e.g. fix php2shell
  npx juxt-lang lint [files...]      Check .juxt programs (default: juxt/**/*.juxt)
  npx juxt-lang validate [files...]  Validate the typed IR against the JSON Schema
  npx juxt-lang check [files...]     Drift: verify tests, contract types and paths vs the repo (CI-friendly)
  npx juxt-lang ir <file> [--typed]  Print a program's intermediate representation as JSON
  npx juxt-lang schema [--path]      Print the typed-IR JSON Schema

  npx juxt-lang ask "<q>" [--file f] Answer from the program: cache -> compiled -> local model -> frontier
      options: --no-model  --url <endpoint>  --model <name>  --show
  npx juxt-lang context "<q>" [-f f] Show the briefing Juxt sends for a question: program + the types it touches
  npx juxt-lang receipts             Measured token receipts: tiers, cache rate, savings
  npx juxt-lang eval [--with-model]  Measure no-model answer rate and context reduction on this repo
  npx juxt-lang models               Check the configured local model endpoint (JUXT_MODEL_URL/JUXT_MODEL)

  npx juxt-lang digest [1d]          What changed in the repo, grouped by area (git only, no model)
  npx juxt-lang facts [7d]           Numbered, citable facts for status updates (git only)
  npx juxt-lang hosts                Skills, commands, subagents and MCP servers this repo already has

Local model (optional): set JUXT_MODEL_URL (default http://localhost:11434, Ollama)
and JUXT_MODEL (default qwen2.5-coder:7b). OpenAI-compatible endpoints work too.

Then tell your agent: "use juxt: <your request>"
Claude Code users can install the plugin instead:
  /plugin marketplace add juxt-lang/juxt
  /plugin install juxt@juxt-lang

Docs: https://juxt-lang.github.io/juxt/`);
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else { fs.copyFileSync(s, d); if (s.endsWith('.sh')) fs.chmodSync(d, 0o755); }
  }
}

function gitRoot() {
  const r = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : process.cwd();
}

function runScript(name, args) {
  const file = path.join(SKILL, 'scripts', name);
  if (!fs.existsSync(file)) { console.error(`juxt: bundled script ${name} is missing`); return 1; }
  const r = spawnSync('bash', [file, ...args], { stdio: 'inherit', cwd: gitRoot() });
  if (r.error) { console.error('juxt: this command needs bash and git on your PATH'); return 1; }
  return r.status ?? 1;
}

function init(args) {
  const force = args.includes('--force');
  const hi = args.indexOf('--host');
  const want = hi >= 0 ? (args[hi + 1] || '') : 'agents';
  const hosts = want === 'all' ? Object.keys(HOSTS) : want.split(',').filter(Boolean);
  const bad = hosts.filter(h => !HOSTS[h]);
  if (!hosts.length || bad.length) { console.error(`juxt: unknown host "${bad.join(',') || want}". Use one of: ${Object.keys(HOSTS).join(', ')}, all`); return 2; }
  const root = gitRoot();
  for (const h of hosts) {
    const dst = path.join(root, HOSTS[h]);
    if (fs.existsSync(dst) && !force) { console.log(`${c('33', 'skip')}  ${HOSTS[h]} already exists (use --force to update)`); continue; }
    copyDir(SKILL, dst);
    console.log(`${c('32', 'added')} ${HOSTS[h]}`);
  }
  const code = runScript('init.sh', []);
  console.log(`\nNext: tell your agent ${c('1', '"use juxt: <a small feature>"')}`);
  return code;
}


function fixCmd(args) {
  const list = fs.existsSync(RECIPES) ? fs.readdirSync(RECIPES).filter(f => f.endsWith('.juxt')).map(f => f.slice(0, -5)) : [];
  const name = (args.find(a => !a.startsWith('--')) || '').toLowerCase();
  if (!name || !list.includes(name)) {
    if (name) console.error(`juxt: no fix recipe named "${name}"\n`);
    console.log('Fix recipes (Juxt programs your AI agent runs safely):');
    for (const r of list) console.log(`  npx juxt-lang fix ${r}`);
    return name ? 2 : 0;
  }
  const root = gitRoot();
  const dst = path.join(root, 'juxt', name + '.juxt');
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (fs.existsSync(dst) && !args.includes('--force')) console.log(`${c('33', 'skip')}  juxt/${name}.juxt already exists (use --force to replace)`);
  else { fs.copyFileSync(path.join(RECIPES, name + '.juxt'), dst); console.log(`${c('32', 'wrote')} juxt/${name}.juxt`); }
  const skill = Object.values(HOSTS).some(h => fs.existsSync(path.join(root, h)));
  console.log(`\nNext, tell your AI agent:\n  ${c('1', `use juxt: run juxt/${name}.juxt`)}`);
  if (!skill) console.log(`\nNo Juxt skill in this repo yet. Run ${c('1', 'npx juxt-lang init')} first,\nor paste juxt/${name}.juxt into any AI agent that can run commands.`);
  console.log('\nThe agent shows what it found and asks before it changes anything.');
  return 0;
}

const AGENTS = {
  claude: { bin: 'claude', args: p => [p], host: 'claude' },
  codex:  { bin: 'codex', args: p => [p], host: 'agents' },
  gemini: { bin: 'gemini', args: p => ['-i', p], host: 'gemini' },
  cursor: { bin: 'cursor-agent', args: p => [p], host: 'cursor' },
};
const WIN = process.platform === 'win32';
function winFind(bin) {
  // PATH first, then the usual install folders (npm global, native installers).
  const r = spawnSync('where.exe', [bin], { encoding: 'utf8' });
  if (r.status === 0 && r.stdout.trim()) return r.stdout.trim().split(/\r?\n/)[0];
  const env = process.env, dirs = [];
  if (env.APPDATA) dirs.push(path.join(env.APPDATA, 'npm'));
  if (env.USERPROFILE) dirs.push(path.join(env.USERPROFILE, '.local', 'bin'), path.join(env.USERPROFILE, 'AppData', 'Roaming', 'npm'));
  if (env.LOCALAPPDATA) dirs.push(path.join(env.LOCALAPPDATA, 'Programs', bin), path.join(env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links'));
  const g = spawnSync('npm.cmd', ['prefix', '-g'], { encoding: 'utf8', shell: true });
  if (g.status === 0 && g.stdout.trim()) dirs.push(g.stdout.trim());
  for (const d of dirs) for (const ext of ['.cmd', '.exe', '.ps1', '']) {
    const f = path.join(d, bin + ext);
    if (fs.existsSync(f)) return f;
  }
  return null;
}
function find(bin) {
  if (WIN) return winFind(bin);
  return spawnSync('sh', ['-c', `command -v ${bin}`], { stdio: 'ignore' }).status === 0 ? bin : null;
}
function has(bin) { return !!find(bin); }
function run(bin, args, cwd) {
  // Windows agents install as .cmd shims, which need a shell; quote every argument.
  if (WIN) return spawnSync([bin, ...args].map(a => `"${String(a).replace(/"/g, '\\"')}"`).join(' '), { stdio: 'inherit', cwd, shell: true });
  return spawnSync(bin, args, { stdio: 'inherit', cwd });
}

function quickFix(name, args) {
  const opt = k => { const i = args.indexOf(k); return i >= 0 ? (args[i + 1] || '') : null; };
  const src = path.join(RECIPES, name + '.juxt');
  if (args.includes('--print')) { process.stdout.write(fs.readFileSync(src, 'utf8')); return 0; }
  let agent = opt('--agent');
  if (agent !== null && !AGENTS[agent]) { console.error(`juxt: unknown agent "${agent}". Use: ${Object.keys(AGENTS).join(', ')}`); return 2; }
  const root = gitRoot();
  const dst = path.join(root, 'juxt', name + '.juxt');
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log(`${c('32', 'ready')} juxt/${name}.juxt`);
  if (!agent) agent = Object.keys(AGENTS).find(a => has(AGENTS[a].bin)) || null;
  if (agent) {
    const h = HOSTS[AGENTS[agent].host], hd = path.join(root, h);
    if (!fs.existsSync(hd)) { copyDir(SKILL, hd); console.log(`${c('32', 'added')} ${h}`); }
  }
  const prompt = `Run the Juxt program in juxt/${name}.juxt. Show me what you find and the exact commands, and wait for my approval before changing anything.`;
  const launch = !args.includes('--no-launch') && (args.includes('--launch') || (process.stdout.isTTY && process.stdin.isTTY));
  const forced = opt('--agent') !== null;
  const exe = agent ? (find(AGENTS[agent].bin) || (forced ? AGENTS[agent].bin : null)) : null;
  if (agent && launch && exe) {
    console.log(`${c('32', 'start')} ${AGENTS[agent].bin} · it will ask before changing anything\n`);
    const r = run(exe, AGENTS[agent].args(prompt), root);
    if (r.error || (r.status !== 0 && r.status !== null && !find(AGENTS[agent].bin))) {
      console.log(`\nCould not start ${AGENTS[agent].bin}. Paste this into your AI agent instead:\n  ${c('1', prompt)}`);
    }
    return r.status ?? 0;
  }
  console.log(`\nNext, tell your AI agent:\n  ${c('1', prompt)}`);
  if (!agent) {
    console.log('\nNo agent command-line tool found (claude, codex, gemini, cursor-agent).');
    console.log('  Paste the line above into the Claude, ChatGPT or Cursor app with this folder open,');
    console.log(`  or install one and run again, e.g.  npm install -g @anthropic-ai/claude-code`);
    console.log(`  Already installed? Force it:  npx juxt-lang php2shell --agent claude`);
  }
  return 0;
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && !['node_modules', '.git'].includes(e.name)) walk(p, out);
    else if (e.name.endsWith('.juxt')) out.push(p);
  }
  return out;
}

function lintCmd(files) {
  if (!files.length) files = walk(path.join(gitRoot(), 'juxt'));
  if (!files.length) { console.log('juxt: no .juxt files found (looked in juxt/). Run "npx juxt-lang init" first.'); return 0; }
  let errors = 0, warnings = 0;
  for (const f of files) {
    let src; try { src = fs.readFileSync(f, 'utf8'); } catch { console.error(`${f}: cannot read`); errors++; continue; }
    const { diags } = lint(src);
    const rel = path.relative(process.cwd(), f) || f;
    if (!diags.length) { console.log(`${c('32', 'ok')}    ${rel}`); continue; }
    for (const d of diags) {
      if (d.level === 'error') errors++; else warnings++;
      console.log(`${rel}:${d.line}  ${d.level === 'error' ? c('31', 'error') : c('33', 'warn ')}  ${d.msg}`);
    }
  }
  console.log(`\n${files.length} file(s), ${errors} error(s), ${warnings} warning(s)`);
  return errors ? 1 : 0;
}

function readFiles(files) {
  if (!files.length) files = walk(path.join(gitRoot(), 'juxt'));
  return files;
}

function validateCmd(args) {
  const SCHEMA = path.join(__dirname, '..', 'schema', 'juxt-ir.schema.json');
  const { validate } = require('../lib/validate');
  const schema = JSON.parse(fs.readFileSync(SCHEMA, 'utf8'));
  const files = readFiles(args.filter(a => !a.startsWith('--')));
  if (!files.length) { console.log('juxt: no .juxt files found (looked in juxt/).'); return 0; }
  let bad = 0;
  for (const f of files) {
    const rel = path.relative(process.cwd(), f) || f;
    let ir; try { ir = toTypedIR(lint(fs.readFileSync(f, 'utf8')).prog); } catch (e) { console.log(`${rel}: parse error ${e.message}`); bad++; continue; }
    const errs = validate(ir, schema);
    if (args.includes('--json')) { console.log(JSON.stringify({ file: rel, valid: !errs.length, errors: errs }, null, 2)); if (errs.length) bad++; continue; }
    if (!errs.length) console.log(`${c('32', 'valid')} ${rel}`);
    else { bad++; console.log(`${c('31', 'invalid')} ${rel}`); for (const e of errs) console.log(`  ${e}`); }
  }
  return bad ? 1 : 0;
}

function checkCmd(args) {
  const { indexRepo, checkProgram } = require('../lib/check');
  const root = gitRoot();
  const files = readFiles(args.filter(a => !a.startsWith('--')));
  if (!files.length) { console.log('juxt: no .juxt files found (looked in juxt/). Run "npx juxt-lang init" first.'); return 0; }
  const idx = indexRepo(root);
  let drift = 0, warn = 0;
  const json = args.includes('--json');
  const report = [];
  for (const f of files) {
    const rel = path.relative(root, f) || f;
    const findings = checkProgram(fs.readFileSync(f, 'utf8'), root, idx, rel);
    report.push({ file: rel, findings });
    if (json) continue;
    const d = findings.filter(x => x.sev === 'drift'), w = findings.filter(x => x.sev === 'warn');
    drift += d.length; warn += w.length;
    if (!findings.length) { console.log(`${c('32', 'ok')}    ${rel}  (in sync with the repo)`); continue; }
    console.log(`${d.length ? c('31', 'drift') : c('33', 'warn ')} ${rel}`);
    for (const x of findings) console.log(`  ${x.sev === 'drift' ? c('31', '✗') : c('33', '!')} ${x.msg}${x.line ? c('90', '  (line ' + x.line + ')') : ''}`);
  }
  if (json) { console.log(JSON.stringify({ indexed: { files: idx.fileCount, types: idx.types.size, testFiles: idx.testFileCount }, report }, null, 2)); return report.some(r => r.findings.some(f => f.sev === 'drift')) ? 1 : 0; }
  console.log(`\nindexed ${idx.fileCount} files · ${idx.types.size} types · ${idx.testFileCount} test files`);
  console.log(`${files.length} program(s), ${c(drift ? '31' : '32', drift + ' drift')}, ${warn} warning(s)`);
  return drift ? 1 : 0;
}

function schemaCmd(args) {
  const SCHEMA = path.join(__dirname, '..', 'schema', 'juxt-ir.schema.json');
  if (args.includes('--path')) { console.log(SCHEMA); return 0; }
  process.stdout.write(fs.readFileSync(SCHEMA, 'utf8'));
  return 0;
}

function modelOpts(args) {
  const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const o = {};
  if (opt('--url')) o.url = opt('--url');
  if (opt('--model')) o.model = opt('--model');
  return o;
}

async function modelsCmd(args) {
  const { health } = require('../lib/model');
  const h = await health(modelOpts(args));
  if (h.ok) console.log(`${c('32', 'ok')}    ${h.url}  model ${c('1', h.model)}  (reachable)`);
  else console.log(`${c('31', 'down')}  ${h.url}  model ${h.model}\n      ${h.error || 'status ' + h.status}\n      Start a local model, e.g.:  ollama run ${h.model}\n      or point elsewhere:  JUXT_MODEL_URL=http://host:port JUXT_MODEL=<name>`);
  return h.ok ? 0 : 1;
}

async function askCmd(args) {
  const { route } = require('../lib/router');
  const { indexRepo } = require('../lib/check');
  const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const file = opt('--file') || opt('-f');
  const q = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--file', '-f', '--url', '--model'].includes(args[i - 1]))).join(' ').trim();
  if (!q) { console.error('usage: juxt ask "a question" [--file juxt/x.juxt] [--no-model] [--url U] [--model M]'); return 2; }
  const root = gitRoot();
  let progFile = file;
  if (!progFile) { const fs2 = walk(path.join(root, 'juxt')); progFile = fs2[0]; }
  if (!progFile || !fs.existsSync(progFile)) { console.error('juxt: no program found. Pass --file juxt/<name>.juxt'); return 2; }
  const program = fs.readFileSync(progFile, 'utf8');
  const idx = indexRepo(root);
  const o = { root, repoIndex: idx, model: modelOpts(args) };
  if (args.includes('--no-model')) o.model = false;
  const r = await route(program, q, o);
  const TN = { 0: 'recall · cache', 1: 'compiled · no model', 2: 'small local model', 3: 'frontier' };
  if (r.escalate) {
    console.log(`${c('33', 'escalate')} no local model answered (tier 3).${r.error ? '  ' + r.error : ''}`);
    console.log(`\nBriefing ready (~${r.compiledTokens} tok, est).`);
    console.log(`Start a local model (ollama run <model>) or paste the compiled prompt into a frontier model. Use --show to print it.`);
    if (args.includes('--show')) console.log('\n--- compiled prompt ---\n' + r.prompt);
    return 3;
  }
  console.log(c('90', `[tier ${r.tier} · ${TN[r.tier]}${r.cached ? ' · cached' : ''}${r.model ? ' · ' + r.model : ''}${r.tokensIn ? ' · ' + r.tokensIn + '+' + r.tokensOut + ' tok' : ' · 0 tok'}]`));
  console.log(r.answer);
  return 0;
}

function contextCmd(args) {
  const { compileContext } = require('../lib/context');
  const { indexRepo } = require('../lib/check');
  const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const file = opt('--file') || opt('-f');
  const q = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--file', '-f'].includes(args[i - 1]))).join(' ').trim() || 'build this';
  const root = gitRoot();
  const progFile = file || walk(path.join(root, 'juxt'))[0];
  if (!progFile || !fs.existsSync(progFile)) { console.error('juxt: no program found. Pass --file juxt/<name>.juxt'); return 2; }
  const program = fs.readFileSync(progFile, 'utf8');
  const idx = indexRepo(root);
  const ctx = compileContext(program, toTypedIR(lint(program).prog), q, idx);
  if (args.includes('--prompt')) { process.stdout.write(ctx.prompt); return 0; }
  console.log(`briefing:        ${c('1', ctx.tokensEst + ' tokens')} (est, chars/4)`);
  console.log(`types included:  ${ctx.typesIncluded.join(', ') || '(none needed)'}`);
  console.log(`\nSee the prompt with --prompt. Token counts are chars/4 estimates.`);
  return 0;
}

function receiptsCmd(args) {
  const receipts = require('../lib/receipts');
  const root = gitRoot();
  const s = receipts.summarise(root);
  if (args.includes('--json')) { console.log(JSON.stringify(s, null, 2)); return 0; }
  if (!s.requests) { console.log('No routed requests yet. Try:  juxt ask "what are the rules?" --file juxt/<name>.juxt'); return 0; }
  console.log(`${c('1', 'Juxt receipts')}  ·  ${s.requests} request(s)`);
  for (const t of [0, 1, 2, 3]) if (s.byTier[t]) console.log(`  tier ${t} ${receipts.TIER_NAME[t].padEnd(20)} ${s.byTier[t]}`);
  console.log(`\n  model calls:     ${s.modelCalls}`);
  console.log(`  cache hit rate:  ${Math.round(s.cacheHitRate * 100)}%`);
  console.log(`  model tokens:    ${s.tokensIn} in · ${s.tokensOut} out${s.est ? ' (some est)' : ''}`);
  const avoided = (s.byTier[0] || 0) + (s.byTier[1] || 0);
  if (avoided) console.log(`  model calls avoided: ${avoided} (answered from cache or the program itself)`);
  console.log(`\n  receipts: ${path.relative(process.cwd(), receipts.file(root))}`);
  return 0;
}

function main(argv) {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case undefined: case 'help': case '-h': case '--help': help(); return 0;
    case '-v': case '--version': case 'version': console.log(pkg.version); return 0;
    case 'init': return init(rest);
    case 'lint': return lintCmd(rest);
    case 'ir': case 'render': {
      const f = rest.find(a => !a.startsWith('--'));
      if (!f) { console.error('usage: juxt ir <file.juxt> [--typed]'); return 2; }
      const { prog, diags } = lint(fs.readFileSync(f, 'utf8'));
      const body = rest.includes('--typed') ? toTypedIR(prog) : toIR(prog);
      console.log(JSON.stringify({ ...body, diagnostics: diags }, null, 2));
      return diags.some(d => d.level === 'error') ? 1 : 0;
    }
    case 'validate': return validateCmd(rest);
    case 'check': return checkCmd(rest);
    case 'schema': return schemaCmd(rest);
    case 'ask': case 'route': return askCmd(rest);
    case 'context': return contextCmd(rest);
    case 'receipts': return receiptsCmd(rest);
    case 'models': case 'model': return modelsCmd(rest);
    case 'eval': return require('../lib/eval').evalCmd(rest, { gitRoot, walk, c });
    case 'fix': case 'recipe': return fixCmd(rest);
    case 'php2shell': return quickFix('php2shell', rest);
    case 'digest': return runScript('digest.sh', rest);
    case 'facts': return runScript('facts.sh', rest);
    case 'hosts': return runScript('hosts.sh', rest);
    default: console.error(`juxt: unknown command "${cmd}"\n`); help(); return 2;
  }
}
Promise.resolve(main(process.argv.slice(2))).then(code => { process.exitCode = code; });
