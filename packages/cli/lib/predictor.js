'use strict';
// Predictor slot: given candidate plans and a program's IR, rank them by how
// well they satisfy the MUSTs and verify checks BEFORE spending tokens to build.
// If a predictor endpoint is configured (JUXT_PREDICTOR_URL) it is asked to
// score; otherwise a deterministic lexical heuristic is used. This is the seam
// a JEPA-style world model for code would plug into later.
const { estTokens } = require('./model');

function heuristicScore(planText, ir) {
  const low = (planText || '').toLowerCase();
  const musts = ir.constraints.filter(c => c.level === 'MUST' || c.level === 'MUST NOT');
  const checks = ir.verify;
  const covered = x => {
    const words = String(x).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3);
    if (!words.length) return 0;
    const got = words.filter(w => low.includes(w)).length;
    return got / words.length;
  };
  const mustScore = musts.length ? musts.reduce((k, c) => k + covered(c.rule), 0) / musts.length : 1;
  const checkScore = checks.length ? checks.reduce((k, v) => k + covered(v.text), 0) / checks.length : 1;
  const risk = ir.open.length ? Math.max(0, 1 - ir.open.length * 0.1) : 1;   // unresolved questions = risk
  const score = 0.5 * mustScore + 0.35 * checkScore + 0.15 * risk;
  return { score: +score.toFixed(4), mustCoverage: +mustScore.toFixed(3), checkCoverage: +checkScore.toFixed(3) };
}

async function rankPlans(plans, ir, opts = {}) {
  const url = opts.url || process.env.JUXT_PREDICTOR_URL || null;
  if (url) {
    try {
      const r = await fetch(url.replace(/\/$/, '') + '/predict', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ir, plans }),
      });
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j.scores)) {
          return plans.map((p, i) => ({ plan: p, score: j.scores[i], source: 'predictor' }))
            .sort((a, b) => b.score - a.score);
        }
      }
    } catch { /* fall through to heuristic */ }
  }
  return plans.map(p => ({ plan: p, ...heuristicScore(p, ir), source: 'heuristic', tokensEst: estTokens(p) }))
    .sort((a, b) => b.score - a.score);
}

module.exports = { rankPlans, heuristicScore };
