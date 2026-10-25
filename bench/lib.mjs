// Shared helpers for the Juxt benchmark (no dependencies, Node 18+).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const BENCH = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(BENCH, '..');
export const WIN = process.platform === 'win32';

export function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

export function loadTasks(filter = 'all') {
  const dir = path.join(BENCH, 'tasks');
  const ids = fs.readdirSync(dir).filter(d => fs.existsSync(path.join(dir, d, 'task.json'))).sort();
  const want = filter === 'all' ? ids : filter.split(',');
  return want.map(id => {
    const t = JSON.parse(fs.readFileSync(path.join(dir, id, 'task.json'), 'utf8'));
    return { ...t, dir: path.join(dir, id) };
  });
}

function git(cwd, ...args) {
  return spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'bench', GIT_AUTHOR_EMAIL: 'bench@local', GIT_COMMITTER_NAME: 'bench', GIT_COMMITTER_EMAIL: 'bench@local' } });
}

// Fresh copy of the task's repo in a temp dir, committed, ready for an agent.
export function prepWorkdir(task, label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `juxt-bench-${task.id}-${label}-`));
  copyDir(path.join(BENCH, task.repo), dir);
  git(dir, 'init', '-q'); git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'base');
  return dir;
}
export function commitAll(dir, msg) { git(dir, 'add', '-A'); git(dir, 'commit', '-qm', msg); }
export function diffStat(dir) {
  const r = git(dir, 'diff', '--shortstat', 'HEAD');
  return (r.stdout || '').trim();
}

function tap(out) {
  const n = k => { const m = out.match(new RegExp('^# ' + k + ' (\\d+)', 'm')); return m ? +m[1] : 0; };
  return { pass: n('pass'), fail: n('fail') + n('cancelled') };
}
// The repo's own tests (regressions). Run BEFORE the hidden tests are copied in.
export function runRepoTests(dir) {
  const r = spawnSync(process.execPath, ['--test'], { cwd: dir, encoding: 'utf8', timeout: 120000 });
  const t = tap((r.stdout || '') + (r.stderr || ''));
  return { ok: r.status === 0, ...t };
}
// Hidden acceptance tests: copied in after the agent finishes, never shown to it.
export function runAcceptance(dir, task) {
  const hid = path.join(dir, '__accept__');
  fs.mkdirSync(hid, { recursive: true });
  fs.copyFileSync(path.join(task.dir, 'accept.test.js'), path.join(hid, 'accept.test.js'));
  const r = spawnSync(process.execPath, ['--test', path.join('__accept__', 'accept.test.js')], { cwd: dir, encoding: 'utf8', timeout: 120000 });
  return tap((r.stdout || '') + (r.stderr || ''));
}
export function applyReference(dir, task) { copyDir(path.join(task.dir, 'reference'), dir); }
