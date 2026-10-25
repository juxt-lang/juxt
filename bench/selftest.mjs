// Proves every task is valid: the hidden tests FAIL on the base repo and PASS
// with the reference solution, and the reference keeps the repo's own tests green.
// No model, no network. Runs in CI.
import fs from 'node:fs';
import { loadTasks, prepWorkdir, runAcceptance, runRepoTests, applyReference } from './lib.mjs';

let bad = 0;
for (const task of loadTasks()) {
  const base = prepWorkdir(task, 'base');
  const b = runAcceptance(base, task);
  const ref = prepWorkdir(task, 'ref');
  applyReference(ref, task);
  const repo = runRepoTests(ref);
  const r = runAcceptance(ref, task);
  const ok = b.fail > 0 && r.fail === 0 && r.pass > 0 && repo.ok;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${task.id.padEnd(16)} base: ${b.pass} pass / ${b.fail} fail   reference: ${r.pass} pass / ${r.fail} fail   repo tests: ${repo.ok ? 'green' : 'RED'}`);
  for (const d of [base, ref]) fs.rmSync(d, { recursive: true, force: true });
}
console.log(bad ? `\n${bad} task(s) invalid` : '\nall tasks valid');
process.exitCode = bad ? 1 : 0;
