#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { lint, toIR } = require('../lib/lint');
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
  npx juxt-lang fix <recipe>         Write a ready-made fix program, e.g. fix php2shell
  npx juxt-lang lint [files...]      Check .juxt programs (default: juxt/**/*.juxt)
  npx juxt-lang ir <file>            Print a program's intermediate representation as JSON
  npx juxt-lang digest [1d]          What changed in the repo, grouped by area (git only, no model)
  npx juxt-lang facts [7d]           Numbered, citable facts for status updates (git only)
  npx juxt-lang hosts                Skills, commands, subagents and MCP servers this repo already has

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

function main(argv) {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case undefined: case 'help': case '-h': case '--help': help(); return 0;
    case '-v': case '--version': case 'version': console.log(pkg.version); return 0;
    case 'init': return init(rest);
    case 'lint': return lintCmd(rest);
    case 'ir': case 'render': {
      const f = rest.find(a => !a.startsWith('--'));
      if (!f) { console.error('usage: juxt ir <file.juxt>'); return 2; }
      const { prog, diags } = lint(fs.readFileSync(f, 'utf8'));
      console.log(JSON.stringify({ ...toIR(prog), diagnostics: diags }, null, 2));
      return diags.some(d => d.level === 'error') ? 1 : 0;
    }
    case 'fix': case 'recipe': return fixCmd(rest);
    case 'digest': return runScript('digest.sh', rest);
    case 'facts': return runScript('facts.sh', rest);
    case 'hosts': return runScript('hosts.sh', rest);
    default: console.error(`juxt: unknown command "${cmd}"\n`); help(); return 2;
  }
}
process.exitCode = main(process.argv.slice(2));
