'use strict';
// juxt eval: a routing check. Shows which questions are answered locally (tier 0/1)
// and the size of the briefing Juxt sends. It is NOT a savings benchmark; real
// end-to-end comparisons live in bench/ and use the agent's reported usage.
// Deterministic and runnable with no model. If a local model is configured it
// also times tier-2 answers. Honest: token counts are chars/4 estimates unless
// the model reports real counts.
const fs = require('fs');
const path = require('path');
const { route } = require('./router');
const { indexRepo } = require('./check');

const DEFAULT_QS = [
  'What are the MUST rules?',
  'What open questions are unresolved?',
  'What verify checks must pass?',
  'What is the objective?',
  'Which agents are involved and what are their roles?',
  'What are the handoffs between agents?',
  'What is the contract (inputs and outputs)?',
  'What are the limits (tokens, cost, time)?',
];

async function evalCmd(args, env) {
  const root = env.gitRoot();
  const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
  const file = opt('--file') || opt('-f');
  const files = file ? [file] : env.walk(path.join(root, 'juxt'));
  if (!files.length) { console.log('juxt: no .juxt programs found (looked in juxt/). Run "npx juxt-lang init".'); return 0; }
  const qs = opt('--questions') ? JSON.parse(fs.readFileSync(opt('--questions'), 'utf8')) : DEFAULT_QS;
  const useModel = args.includes('--model') || args.includes('--with-model');
  const idx = indexRepo(root);
  const json = args.includes('--json');

  let noModel = 0, total = 0, compiledSum = 0, baseline = idx.fileBytes ? Math.ceil(idx.fileBytes / 4) : 0;
  const rows = [];
  for (const f of files) {
    const program = fs.readFileSync(f, 'utf8');
    for (const q of qs) {
      total++;
      const r = await route(program, q, { root, repoIndex: idx, model: useModel ? {} : false, dryRun: true });
      const tokens = r.tier <= 1 ? 0 : (r.tokensIn || 0) + (r.tokensOut || 0);
      if (r.tier <= 1) noModel++;
      compiledSum += r.compiledTokens || 0;
      rows.push({ file: path.relative(root, f), q, tier: r.tier, tokens, compiled: r.compiledTokens || 0, escalate: !!r.escalate });
    }
  }
  const pctNoModel = total ? Math.round(noModel / total * 100) : 0;
  const avgCompiled = rows.length ? Math.round(compiledSum / rows.length) : 0;
  // Deliberately no "% less than the whole repo" figure: no real agent attaches the
  // whole repo, so that comparison is a strawman. End-to-end savings are measured
  // by the benchmark in bench/ (real API usage, with and without Juxt).
  const summary = { programs: files.length, questions: qs.length, total, lookupsAnsweredLocally: noModel, pctLookupsLocal: pctNoModel, avgBriefingTokensEst: avgCompiled, indexedFiles: idx.fileCount, modelUsed: useModel };

  if (json) { console.log(JSON.stringify({ summary, rows }, null, 2)); return 0; }
  console.log(`${env.c('1', 'Juxt routing check')}  ·  ${files.length} program(s) × ${qs.length} question(s)\n`);
  console.log(`  structural lookups answered locally: ${env.c('32', noModel + '/' + total)}  (tier 0/1, no model call)`);
  console.log(`  briefing size (avg, est):            ${avgCompiled} tok  (program + the types it touches)`);
  if (useModel) {
    const mc = rows.filter(r => r.tier === 2);
    const esc = rows.filter(r => r.escalate).length;
    console.log(`  tier-2 model answers:                ${mc.length}${esc ? `  (${esc} escalated, no local model)` : ''}`);
    if (mc.length) console.log(`  tier-2 tokens (total):               ${mc.reduce((k, r) => k + r.tokens, 0)}`);
  }
  console.log(`\n  What this shows: routing works and lookups about the program itself cost nothing.`);
  console.log(`  What it does NOT show: savings on real coding tasks. For that, run the benchmark:`);
  console.log(`    https://github.com/juxt-lang/juxt/tree/main/bench  (real API usage, with vs without Juxt)`);
  console.log(`  Token counts here are chars/4 estimates.`);
  return 0;
}

module.exports = { evalCmd, DEFAULT_QS };
