'use strict';
// juxt lint and juxt ir: the reference parser for the Juxt grammar (spec/GRAMMAR.md).
const KNOWN = new Set(['context', 'objective', 'constraints', 'contract', 'pattern', 'verify', 'returns', 'resolved',
  'agent', 'remote agent', 'tools', 'topology', 'harness', 'policy', 'limits', 'observe', 'eval',
  'on', 'recipe', 'stack', 'freshness', 'fleet', 'rollout', 'architecture', 'fitness', 'extends',
  'chat', 'ledger', 'view', 'status', 'host', 'receipts']);
const CONSTRAINT = /^(MUST NOT|MUST|SHOULD NOT|SHOULD|OPEN)\b\s*(.*)$/;

function parse(src) {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const prog = { version: null, blocks: [] };
  const diags = [];
  let cur = null;
  lines.forEach((raw, i) => {
    const n = i + 1;
    const line = raw.replace(/\s+#.*$/, '').replace(/^#.*$/, '');
    if (!line.trim()) return;
    if (prog.version === null) {
      const m = line.match(/^@juxt\s+(\d+(?:\.\d+)*)\s*$/);
      if (m) {
        prog.version = m[1];
        if (/^3\./.test(m[1])) { prog.legacyVersion = m[1]; prog.version = '0.6'; diags.push({ line: n, level: 'warning', msg: `"@juxt ${m[1]}" is the pre-0.7 header; it is read as 0.6. Write "@juxt 0.7" (spec/GRAMMAR.md, section 5)` }); }
        return;
      }
      diags.push({ line: n, level: 'error', msg: 'program must start with "@juxt <version>"' });
      prog.version = '';
    }
    if (/^\S/.test(line)) {
      const m = line.match(/^([a-z_][a-z_ -]*?)(?:\s+([^:]+?))?:\s*(.*)$/);
      if (!m) { diags.push({ line: n, level: 'error', msg: `expected "block:" at column 1, got "${line.trim()}"` }); cur = null; return; }
      let name = m[1].trim(); let label = m[2] ? m[2].trim() : null;
      if (!KNOWN.has(name) && label && KNOWN.has(name + ' ' + label.split(/\s+/)[0])) {
        const parts = label.split(/\s+/); name = name + ' ' + parts.shift(); label = parts.join(' ') || null;
      }
      if (!KNOWN.has(name)) {
        const two = name.split(' ');
        if (KNOWN.has(two[0])) { label = [two.slice(1).join(' '), label].filter(Boolean).join(' ') || null; name = two[0]; }
        else diags.push({ line: n, level: 'warning', msg: `unknown block "${name}" (not in spec/GRAMMAR.md; unknown blocks are allowed)` });
      }
      cur = { name, label, line: n, inline: m[3] || null, items: [] };
      prog.blocks.push(cur);
      return;
    }
    if (!cur) { diags.push({ line: n, level: 'error', msg: 'indented line outside a block' }); return; }
    cur.items.push({ line: n, text: line.trim() });
  });
  if (prog.version === null) diags.push({ line: 1, level: 'error', msg: 'empty program: expected "@juxt <version>"' });
  return { prog, diags };
}

function check(prog, diags) {
  const by = name => prog.blocks.filter(b => b.name === name);
  for (const b of by('constraints')) {
    for (const it of b.items) {
      const m = it.text.match(CONSTRAINT);
      if (!m) diags.push({ line: it.line, level: 'error', msg: `constraint must start with MUST, MUST NOT, SHOULD or OPEN: "${it.text}"` });
      else if (m[1] === 'OPEN') diags.push({ line: it.line, level: 'warning', msg: `unresolved OPEN question: ${(m[2] || '(empty)').replace(/\s*->\s*ask\s*$/, '')} (ask, never guess)` });
      else if (!m[2]) diags.push({ line: it.line, level: 'error', msg: `${m[1]} has no rule text` });
    }
  }
  const objectives = by('objective');
  if (objectives.length > 1) diags.push({ line: objectives[1].line, level: 'error', msg: 'a program has one objective' });
  if (objectives.length) {
    const o = objectives[0];
    if (!o.inline && !o.items.length) diags.push({ line: o.line, level: 'error', msg: 'objective is empty' });
    const v = by('verify');
    const checks = v.reduce((k, b) => k + b.items.length + (b.inline ? 1 : 0), 0);
    if (!checks) diags.push({ line: o.line, level: 'error', msg: 'a program with an objective needs at least one verify check' });
  } else if (!prog.blocks.length) {
    diags.push({ line: 1, level: 'error', msg: 'program has no blocks' });
  }
  return diags;
}

function lint(src) { const { prog, diags } = parse(src); return { prog, diags: check(prog, diags).sort((a, b) => a.line - b.line) }; }

function toIR(prog) {
  const ir = { juxt: prog.version, kind: prog.blocks.some(b => b.name === 'objective') ? 'task' : 'config', blocks: {} };
  for (const b of prog.blocks) {
    const key = b.label ? `${b.name} ${b.label}` : b.name;
    let val;
    if (b.name === 'constraints') {
      val = b.items.map(it => { const m = it.text.match(CONSTRAINT) || []; return { level: m[1] || null, rule: m[2] || it.text }; });
    } else {
      val = b.items.length ? [b.inline, ...b.items.map(i => i.text)].filter(Boolean) : b.inline;
    }
    if (ir.blocks[key] !== undefined) ir.blocks[key] = [].concat(ir.blocks[key], val); else ir.blocks[key] = val;
  }
  return ir;
}
let _typed;
function toTypedIR(prog) { return (_typed || (_typed = require('./ir').toTypedIR))(prog); }
module.exports = { lint, toIR, toTypedIR, parse };
