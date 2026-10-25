'use strict';
// Measured receipts: append one line per routed request, summarise honestly.
// Stored at <root>/.juxt/receipts.jsonl. Token counts are the model's own when
// it reports them, otherwise a chars/4 estimate (marked est in the summary).
const fs = require('fs');
const path = require('path');

const dir = root => path.join(root, '.juxt');
const file = root => path.join(dir(root), 'receipts.jsonl');

function record(root, entry) {
  try {
    fs.mkdirSync(dir(root), { recursive: true });
    fs.appendFileSync(file(root), JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n');
  } catch { /* receipts are best-effort; never fail the command */ }
}

function load(root) {
  try {
    return fs.readFileSync(file(root), 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

const TIER_NAME = { 0: 'recall (cache)', 1: 'compiled (no model)', 2: 'small local model', 3: 'frontier' };

function summarise(root) {
  const rows = load(root);
  const s = { requests: rows.length, byTier: {}, tokensIn: 0, tokensOut: 0, cached: 0, modelCalls: 0, costUsd: 0, baselineTokens: 0, compiledTokens: 0, est: false };
  for (const r of rows) {
    const t = r.tier ?? 3;
    s.byTier[t] = (s.byTier[t] || 0) + 1;
    s.tokensIn += r.tokensIn || 0;
    s.tokensOut += r.tokensOut || 0;
    if (r.cached) s.cached++;
    if (t >= 2) s.modelCalls++;
    if (r.costUsd) s.costUsd += r.costUsd;
    if (r.baselineTokens) s.baselineTokens += r.baselineTokens;
    if (r.compiledTokens) s.compiledTokens += r.compiledTokens;
    if (r.est) s.est = true;
  }
  s.cacheHitRate = rows.length ? s.cached / rows.length : 0;
  // deterministic + cached requests used no model tokens at all
  s.tokensSavedByTiers = rows.filter(r => (r.tier ?? 3) <= 1).reduce((k, r) => k + (r.wouldHaveTokens || 0), 0);
  return s;
}

module.exports = { record, load, summarise, TIER_NAME, file };
