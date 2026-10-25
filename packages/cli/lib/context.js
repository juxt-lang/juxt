'use strict';
// Context compiler: build the smallest prompt that answers a question about a
// program — the program plus only the contract/handoff types it touches and the
// repo definitions of those types. (baselineTokensEst is kept for API compatibility
// only; the CLI no longer reports it as a saving, see bench/ for real comparisons.)
const fs = require('fs');
const path = require('path');
const { estTokens } = require('./model');

const PRIM = new Set(['String', 'Number', 'Boolean', 'Date', 'Array', 'Object', 'Promise', 'Buffer', 'Record', 'Map', 'Set']);
function typeTokens(type) {
  if (!type) return [];
  return [...String(type).matchAll(/\b([A-Z][A-Za-z0-9]+)\b/g)].map(m => m[1]).filter(t => !PRIM.has(t));
}

// Pull the definition block of a type name out of a source file (best-effort).
function sliceDef(src, name) {
  // TS/JS: match to the closing brace, a semicolon, or the next top-level line.
  const re = new RegExp(`(?:export\\s+)?(?:interface|type|class|enum)\\s+${name}\\b[\\s\\S]*?(?:\\}|;|\\n(?=\\S)|$)`, 'm');
  const m = src.match(re);
  if (m) return m[0].trim().slice(0, 800);
  const py = new RegExp(`class\\s+${name}\\b[\\s\\S]*?(?=\\nclass |\\n[A-Za-z@]|$)`, 'm');
  const p = src.match(py);
  return p ? p[0].trim().slice(0, 800) : null;
}

// repoIndex: { types: Map<name, relPath>, root }
function compileContext(program, ir, question, repoIndex) {
  const wantTypes = new Set();
  for (const e of [...ir.contract.in, ...ir.contract.out, ...ir.contract.invariant])
    typeTokens(e.type).forEach(t => wantTypes.add(t));
  for (const edge of ir.topology.edges) for (const f of edge.fields) typeTokens(f).forEach(t => wantTypes.add(t));

  const defs = [];
  if (repoIndex && repoIndex.types) {
    for (const t of wantTypes) {
      const rel = repoIndex.types.get(t);
      if (!rel) continue;
      const src = (() => { try { return fs.readFileSync(path.join(repoIndex.root, rel), 'utf8'); } catch { return ''; } })();
      const d = sliceDef(src, t);
      if (d) defs.push({ type: t, file: rel, code: d });
    }
  }

  const parts = [
    'You direct AI agents with a Juxt program. Answer using only the program and the type definitions below. Obey every MUST / MUST NOT. If something is unspecified, say so instead of guessing.',
    '--- program ---', program.trim(),
  ];
  if (defs.length) {
    parts.push('--- types it touches ---');
    for (const d of defs) parts.push(`// ${d.file}\n${d.code}`);
  }
  parts.push('--- question ---', question.trim());
  const prompt = parts.join('\n\n');

  // Fair baseline: the SAME program + instructions + question, but with the
  // whole repo attached instead of just the touched type defs. The saving is
  // therefore (whole repo) − (touched type defs), the context Juxt doesn't send.
  const tokensEst = estTokens(prompt);
  const typeDefsTokens = defs.reduce((k, d) => k + estTokens(d.code) + estTokens(d.file) + 2, 0);
  const overhead = tokensEst - typeDefsTokens;              // program + instructions + question
  const repoTokens = repoIndex && repoIndex.fileBytes ? Math.ceil(repoIndex.fileBytes / 4) : null;
  return {
    prompt,
    typesIncluded: defs.map(d => d.type),
    tokensEst,
    baselineTokensEst: repoTokens != null ? overhead + repoTokens : null,
  };
}

module.exports = { compileContext, typeTokens };
