'use strict';
// juxt check: drift between a .juxt program and the repo it governs.
// Dependency-free. Heuristic but honest: every finding says what it looked for.
const fs = require('fs');
const path = require('path');
const { parse } = require('./lint');
const { toTypedIR } = require('./ir');

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'vendor', '.venv', 'venv', '__pycache__']);
function walk(dir, out = [], depth = 0) {
  if (depth > 8 || !fs.existsSync(dir)) return out;
  let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    if (e.name.startsWith('.') && e.name !== '.') { if (!/\.(ts|tsx|py|ya?ml|json)$/.test(e.name)) continue; }
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p, out, depth + 1); }
    else out.push(p);
  }
  return out;
}
const read = f => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } };

// Build an index of type names and test text from the repo.
function indexRepo(root) {
  const files = walk(root);
  const types = new Map();   // TypeName -> file where defined
  const tests = [];          // {file, text}
  let testFileCount = 0, fileBytes = 0;
  for (const f of files) {
    const ext = path.extname(f);
    const rel = path.relative(root, f);
    if (rel.startsWith('juxt' + path.sep)) continue;              // don't match the program itself
    const src = read(f);
    if (/\.(ts|tsx|js|jsx|py|go|rs|java|rb|sql|ya?ml|json)$/.test(f)) fileBytes += src.length;
    if (/\.(ts|tsx)$/.test(f)) {
      for (const m of src.matchAll(/\b(?:interface|type|class|enum)\s+([A-Z]\w+)/g)) types.set(m[1], rel);
    } else if (ext === '.py') {
      for (const m of src.matchAll(/\bclass\s+([A-Z]\w+)/g)) types.set(m[1], rel);
    } else if (/\.(ya?ml|json)$/.test(f) && /openapi|swagger|components/i.test(src)) {
      for (const m of src.matchAll(/^\s{2,}([A-Z]\w+)\s*:/gm)) types.set(m[1], rel);
    }
    if (/(\.|_|-)(test|spec)\.|(^|\/)(test|tests|spec|__tests__)\//i.test(rel) || /\btest_\w+\.py$/.test(rel)) {
      testFileCount++;
      tests.push({ file: rel, text: src });
    }
  }
  return { root, types, tests, testFileCount, fileCount: files.length, fileBytes };
}

// PascalCase type tokens worth resolving (skip prose/lowercase/primitives).
const PRIM = new Set(['String', 'Number', 'Boolean', 'Date', 'Array', 'Object', 'Promise', 'Buffer', 'Record', 'Map', 'Set', 'Any', 'Void', 'Null', 'Int', 'Float']);
function typeTokens(type) {
  if (!type) return [];
  return [...String(type).matchAll(/\b([A-Z][A-Za-z0-9]+)\b/g)].map(m => m[1]).filter(t => !PRIM.has(t));
}

function checkProgram(src, root, idx, rel) {
  const { prog } = parse(src);
  const ir = toTypedIR(prog);
  const findings = [];
  const add = (sev, msg, line) => findings.push({ sev, msg, line: line || null });

  // 1. unresolved OPEN questions = you'd be guessing
  for (const o of ir.open) add('drift', `unresolved OPEN question: "${o.question}" (answer it, don't ship a guess)`, o.line);

  // 2. verify tests should exist somewhere in the repo
  const testChecks = ir.verify.filter(v => v.kind === 'test');
  if (testChecks.length && idx.testFileCount === 0)
    add('drift', `${testChecks.length} verify test(s) declared but no test files found in the repo`);
  else for (const v of testChecks) {
    const key = v.text.toLowerCase();
    const words = key.split(/[^a-z0-9]+/).filter(w => w.length > 3);
    const hit = idx.tests.some(t => {
      const low = t.text.toLowerCase();
      if (low.includes(key)) return true;
      const got = words.filter(w => low.includes(w)).length;
      return words.length >= 2 && got >= Math.ceil(words.length * 0.6);
    });
    if (!hit) add('warn', `verify test has no matching test in the repo: "${v.text}"`);
  }

  // 3. contract + handoff types should resolve to a definition
  const typed = [...ir.contract.in, ...ir.contract.out, ...ir.contract.invariant];
  const seen = new Set();
  for (const e of typed) for (const tok of typeTokens(e.type)) {
    if (seen.has(tok)) continue; seen.add(tok);
    if (!idx.types.has(tok)) add('warn', `contract type "${tok}" (on ${e.name}) not found as a TS/Pydantic/OpenAPI definition`);
  }
  for (const edge of ir.topology.edges) for (const f of edge.fields) for (const tok of typeTokens(f)) {
    if (seen.has(tok)) continue; seen.add(tok);
    if (!idx.types.has(tok)) add('warn', `handoff field type "${tok}" (${edge.from}→${edge.to}) not found as a definition`);
  }

  // 4. referenced file paths that look like repo paths should exist
  const text = src;
  const paths = new Set();
  for (const m of text.matchAll(/\b([\w./-]+\.(?:ts|tsx|js|jsx|py|go|rs|java|rb|sql|ya?ml|json|md))\b/g)) {
    const p = m[1];
    if (p.includes('/') || /^[\w-]+\.\w+$/.test(p)) paths.add(p);
  }
  for (const p of paths) {
    if (/^https?:|:\/\//.test(p)) continue;
    if (!fs.existsSync(path.join(root, p)) && !fs.existsSync(path.join(path.dirname(path.join(root, rel)), p)))
      add('warn', `referenced path not found in repo: ${p}`);
  }

  // 5. extends target exists
  if (ir.extends && !/:\/\//.test(ir.extends)) {
    const cand = [path.join(root, ir.extends), path.join(path.dirname(path.join(root, rel)), ir.extends)];
    if (!cand.some(fs.existsSync)) add('warn', `extends target not found: ${ir.extends}`);
  }

  return findings;
}

module.exports = { indexRepo, checkProgram, walk };
