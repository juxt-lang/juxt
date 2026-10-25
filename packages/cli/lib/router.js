'use strict';
// Tiered router: answer a question about a program with the cheapest tier that
// can. T0 recall (cache) -> T1 compiled (deterministic, no model) -> T2 small
// local model -> T3 frontier (escalate; only if an endpoint is configured).
// Every call writes a measured receipt.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parse } = require('./lint');
const { toTypedIR } = require('./ir');
const { compileContext } = require('./context');
const { chat, estTokens } = require('./model');
const receipts = require('./receipts');

const cacheFile = root => path.join(root, '.juxt', 'cache.json');
function loadCache(root) { try { return JSON.parse(fs.readFileSync(cacheFile(root), 'utf8')); } catch { return {}; } }
function saveCache(root, c) { try { fs.mkdirSync(path.join(root, '.juxt'), { recursive: true }); fs.writeFileSync(cacheFile(root), JSON.stringify(c, null, 0)); } catch {} }
const keyOf = (program, q) => crypto.createHash('sha256').update(program + '\0' + q.trim().toLowerCase()).digest('hex').slice(0, 16);

// T1 deterministic resolvers: structural questions answered from the IR, no model.
function deterministic(ir, q) {
  const s = q.toLowerCase();
  const bullet = a => a.length ? a.map(x => '  - ' + x).join('\n') : '  (none)';
  if (/\b(musts?|rules?|constraints?|not allowed|forbidden)\b/.test(s))
    return 'Rules (MUST / MUST NOT / SHOULD):\n' + bullet(ir.constraints.map(c => `${c.level}: ${c.rule}`));
  if (/\bopen\b|unresolved|questions?|unclear|undecided/.test(s))
    return ir.open.length ? 'Open questions to answer before building:\n' + bullet(ir.open.map(o => o.question))
                          : 'No open questions — nothing is left to guess.';
  if (/\bverify|checks?|tests?|prove|done\b/.test(s))
    return 'Verify checks that must pass:\n' + bullet(ir.verify.map(v => `${v.kind}: ${v.text}`));
  if (/\bagents?|who|roles?\b/.test(s))
    return 'Agents:\n' + bullet(ir.agents.map(a => `${a.name} (${a.kind}${a.model ? ', ' + a.model : ''})${a.role ? ' — ' + a.role : ''}`));
  if (/\bhandoffs?|topology|flow|pipeline|hand over\b/.test(s))
    return 'Handoffs:\n' + bullet(ir.topology.edges.map(e => `${e.from} ${e.kind === 'loop' ? '->' : e.kind === 'event' ? '~>' : '=>'} ${e.to}${e.fields.length ? ' { ' + e.fields.join(', ') + ' }' : ''}`));
  if (/\bcontract|input|output|interface|api\b/.test(s)) {
    const f = g => g.map(e => e.type ? `${e.name}: ${e.type}` : e.name);
    return `Contract:\n  in:  ${f(ir.contract.in).join(', ') || '(none)'}\n  out: ${f(ir.contract.out).join(', ') || '(none)'}`;
  }
  if (/\bobjective|goal|what does|purpose\b/.test(s))
    return ir.objective ? 'Objective: ' + ir.objective : 'This program has no objective block.';
  if (/\blimit|budget|cost|token/.test(s) && ir.limits && Object.values(ir.limits).some(v => v != null))
    return `Limits: ${Object.entries(ir.limits).filter(([, v]) => v != null).map(([k, v]) => `${k}=${v}`).join(', ')}`;
  return null;
}

async function route(program, question, opts = {}) {
  const root = opts.root || process.cwd();
  const { prog } = parse(program);
  const ir = toTypedIR(prog);
  const k = keyOf(program, question);
  const baselineTokens = opts.repoIndex && opts.repoIndex.fileBytes ? Math.ceil(opts.repoIndex.fileBytes / 4) : 0;

  // T0 recall
  if (!opts.noCache) {
    const cache = loadCache(root);
    if (cache[k]) {
      const rec = { tier: 0, cached: true, tokensIn: 0, tokensOut: 0, question, wouldHaveTokens: cache[k].tokensEst || 0, baselineTokens };
      if (!opts.dryRun) receipts.record(root, rec);
      return { tier: 0, answer: cache[k].answer, cached: true, tokensIn: 0, tokensOut: 0 };
    }
  }

  // T1 compiled (deterministic)
  const det = deterministic(ir, question);
  const compiled = compileContext(program, ir, question, opts.repoIndex);
  if (det != null) {
    const rec = { tier: 1, cached: false, tokensIn: 0, tokensOut: 0, question, wouldHaveTokens: compiled.tokensEst, baselineTokens, compiledTokens: compiled.tokensEst };
    if (!opts.dryRun) { receipts.record(root, rec); const c = loadCache(root); c[k] = { answer: det, tier: 1, tokensEst: compiled.tokensEst }; saveCache(root, c); }
    return { tier: 1, answer: det, cached: false, tokensIn: 0, tokensOut: 0, compiledTokens: compiled.tokensEst, baselineTokens };
  }

  // T2 small local model
  if (opts.model !== false) {
    const res = await chat([
      { role: 'system', content: 'You are a precise engineering assistant. Answer only from the given Juxt program and types. Keep answers short.' },
      { role: 'user', content: compiled.prompt },
    ], opts.model || {});
    if (res.ok) {
      const rec = { tier: 2, cached: false, tokensIn: res.usage.in, tokensOut: res.usage.out, model: res.model, question, compiledTokens: compiled.tokensEst, baselineTokens, est: res.endpoint !== 'openai' };
      if (!opts.dryRun) { receipts.record(root, rec); const c = loadCache(root); c[k] = { answer: res.text, tier: 2, tokensEst: compiled.tokensEst }; saveCache(root, c); }
      return { tier: 2, answer: res.text, cached: false, tokensIn: res.usage.in, tokensOut: res.usage.out, model: res.model, ms: res.ms, compiledTokens: compiled.tokensEst, baselineTokens };
    }
    // T3 escalate: no local model reachable
    const rec = { tier: 3, cached: false, tokensIn: 0, tokensOut: 0, question, escalate: true, error: res.error, compiledTokens: compiled.tokensEst, baselineTokens };
    if (!opts.dryRun) receipts.record(root, rec);
    return { tier: 3, escalate: true, error: res.error, prompt: compiled.prompt, compiledTokens: compiled.tokensEst, baselineTokens };
  }
  return { tier: 3, escalate: true, prompt: compiled.prompt, compiledTokens: compiled.tokensEst, baselineTokens };
}

module.exports = { route, deterministic, keyOf, loadCache, saveCache };
