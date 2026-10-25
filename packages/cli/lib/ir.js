'use strict';
// Typed IR for Juxt (spec/GRAMMAR.md): turns a parsed program into a strict, machine-checkable
// shape (contracts, typed handoffs, agents, topology, limits) plus a JSON Schema.
// Built on lib/lint.js parse(); kept separate so the old toIR() stays stable.
const { parse } = require('./lint');

const CONSTRAINT = /^(MUST NOT|MUST|SHOULD NOT|SHOULD|OPEN)\b\s*(.*)$/;

// "a: b, c: d" or inline "model: frontier, role: plan and contract" -> {a:b, c:d}
// commas split pairs only when the next token looks like "key:"; values may contain commas otherwise.
function kvPairs(s) {
  const out = {};
  if (!s) return out;
  const parts = [];
  let buf = '';
  const toks = s.split(/,\s*/);
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    // a new pair starts at "key:" — but not a URL scheme like mcp:// or a2a://
    if (/^[a-z_][\w-]*\s*:(?!\/\/)/i.test(t) || i === 0) { if (buf) parts.push(buf); buf = t; }
    else buf += ', ' + t;
  }
  if (buf) parts.push(buf);
  for (const p of parts) {
    const m = p.match(/^\s*([a-z_][\w-]*)\s*:\s*(.*)$/i);
    if (m) out[m[1].toLowerCase()] = m[2].trim();
  }
  return out;
}
const list = s => (s == null ? [] : String(s).split(/\s*,\s*/).map(x => x.trim()).filter(Boolean));
function num(s) {
  if (s == null) return null;
  const m = String(s).match(/([\d.]+)\s*([kmb%]?)/i);
  if (!m) return null;
  let v = parseFloat(m[1]);
  const u = (m[2] || '').toLowerCase();
  if (u === 'k') v *= 1e3; else if (u === 'm') v *= 1e6; else if (u === 'b') v *= 1e9;
  return v;
}

// Split on a separator only at the top level (not inside {}, (), [] or quotes).
function splitTop(s, sep = ',') {
  const out = []; let depth = 0, q = null, buf = '';
  for (const ch of String(s)) {
    if (q) { buf += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; buf += ch; continue; }
    if ('{(['.includes(ch)) depth++;
    else if ('})]'.includes(ch)) depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) { out.push(buf); buf = ''; continue; }
    buf += ch;
  }
  out.push(buf);
  return out.map(x => x.trim()).filter(Boolean);
}
// "{ retry_after: duration, code }" -> [{name:'retry_after', type:'duration'}, {name:'code', type:null}]
function recordFields(body) {
  return splitTop(body).map(f => {
    const i = topColon(f);
    return i < 0 ? { name: f.trim(), type: null } : { name: f.slice(0, i).trim(), type: f.slice(i + 1).trim() || null };
  });
}
function topColon(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if ('{(['.includes(ch)) depth++; else if ('})]'.includes(ch)) depth--;
    else if (ch === ':' && depth === 0 && s.slice(i, i + 3) !== '://') return i;
  }
  return -1;
}

// Contract entry grammar (spec/GRAMMAR.md):
//   entry  = name [":" type] | name "(" type ")" | text record text
//   record = "{" field {"," field} "}"     field = name [":" type]
// Examples: "req: CancelRequest", "api_key", "user (User)",
//           "429 { retry_after: duration } when over limit"
function typedEntry(raw) {
  const t = raw.trim();
  const rec = t.match(/^(.*?)\{([^{}]*)\}(.*)$/);
  if (rec) {
    const name = (rec[1] + ' ' + rec[3]).replace(/\s+/g, ' ').trim() || 'value';
    return { name, type: '{ ' + rec[2].trim() + ' }', fields: recordFields(rec[2]) };
  }
  const i = topColon(t);
  if (i > 0) return { name: t.slice(0, i).trim(), type: t.slice(i + 1).trim() || null };
  const m = t.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (m) return { name: m[1].trim(), type: m[2].trim() };
  return { name: t, type: null };
}

function agentFrom(b) {
  const kv = { ...kvPairs(b.inline), ...Object.assign({}, ...b.items.map(it => kvPairs(it.text))) };
  const remote = b.name === 'remote agent';
  const a = {
    name: b.label || kv.name || 'agent',
    kind: remote ? 'remote' : 'local',
    model: kv.model || null,
    role: kv.role || null,
    tools: list(kv.tools),
    context: kv.context || null,
    line: b.line,
  };
  if (remote) {
    // address can be a bare a2a:// token in the inline text
    const addr = (b.inline || '').match(/a2a:\/\/[^\s,]+/);
    a.address = (kv.address && kv.address.match(/a2a:\/\/\S+/) ? kv.address : (addr ? addr[0] : null));
    a.signed = /\bsigned\b/.test(b.inline || '') || kv.signed === 'true';
    a.scope = kv.scope || null;
  }
  return a;
}

// topology edges: "a => b { x, y }", "a -> b until verify", "a ~> b on event { fields }"
const EDGE = /^(\S+)\s*(=>|->|~>)\s*([^\s{]+)(?:\s+(?:on|until)\s+([^\{]+?))?\s*(?:\{([^}]*)\})?\s*$/;
function edgeFrom(text) {
  const m = text.match(EDGE);
  if (!m) return { raw: text };
  const kindMap = { '=>': 'handoff', '->': 'loop', '~>': 'event' };
  return {
    from: m[1], to: m[3], kind: kindMap[m[2]],
    when: m[4] ? m[4].trim() : null,
    fields: list(m[5]),
  };
}

function verifyItem(text) {
  let m = text.match(/^test\s+"(.+)"$/i); if (m) return { kind: 'test', text: m[1] };
  m = text.match(/^bench\s+(.+)$/i); if (m) return { kind: 'bench', text: m[1].trim() };
  m = text.match(/^review\s+(.+)$/i); if (m) return { kind: 'review', text: m[1].trim() };
  return { kind: 'check', text: text.trim() };
}

function toTypedIR(prog) {
  const by = name => prog.blocks.filter(b => b.name === name);
  const first = name => by(name)[0];
  const itemsText = b => (b ? [b.inline, ...b.items.map(i => i.text)].filter(Boolean) : []);

  const ir = {
    juxt: prog.version || null,
    kind: prog.blocks.some(b => b.name === 'objective') ? 'task' : 'config',
    objective: null,
    context: {},
    constraints: [],
    open: [],
    contract: { in: [], out: [], invariant: [], on_error: [] },
    pattern: [],
    agents: [],
    topology: { orchestrator: null, edges: [] },
    policy: [],
    limits: {},
    verify: [],
    tiers: [],
    returns: [],
    receipts: false,
    extends: null,
  };

  const obj = first('objective');
  if (obj) ir.objective = itemsText(obj).join(' ') || null;

  for (const b of by('context')) for (const it of b.items) Object.assign(ir.context, kvPairs(it.text));
  if (first('context') && first('context').inline) Object.assign(ir.context, kvPairs(first('context').inline));

  for (const b of by('constraints')) for (const it of b.items) {
    const m = it.text.match(CONSTRAINT);
    if (!m) { ir.constraints.push({ level: null, rule: it.text, line: it.line }); continue; }
    if (m[1] === 'OPEN') ir.open.push({ question: (m[2] || '').replace(/\s*->\s*ask\s*$/, '').trim(), line: it.line });
    else ir.constraints.push({ level: m[1], rule: (m[2] || '').trim(), line: it.line });
  }

  for (const b of by('contract')) for (const it of b.items) {
    const m = it.text.match(/^(in|out|invariant|on_error)\s*:\s*(.*)$/i);
    if (!m) { ir.contract.invariant.push({ name: it.text.trim(), type: null }); continue; }
    const key = m[1].toLowerCase();
    for (const part of (key === 'on_error' ? [m[2]] : splitTop(m[2]))) {
      if (part) ir.contract[key].push(typedEntry(part));
    }
  }

  for (const b of by('pattern')) ir.pattern.push(...itemsText(b));
  for (const b of [...by('agent'), ...by('remote agent')]) ir.agents.push(agentFrom(b));

  const topo = first('topology');
  if (topo) {
    const mo = (topo.inline || '').match(/\w+\(([^)]+)\)/);
    ir.topology.orchestrator = mo ? mo[1].trim() : (topo.inline || '').trim() || null;
    for (const it of topo.items) ir.topology.edges.push({ ...edgeFrom(it.text), line: it.line });
  }

  for (const b of by('policy')) for (const it of b.items) ir.policy.push(it.text.trim());

  const lim = first('limits');
  if (lim) {
    const s = itemsText(lim).join(', ');
    const g = (re) => { const m = s.match(re); return m ? m[1] : null; };
    ir.limits = {
      tokens: num(g(/tokens?\s+([\d.kmb]+)/i)),
      iterations: num(g(/iterations?\s+([\d.]+)/i)),
      cost_usd: num(g(/cost\s+\$?([\d.]+)/i)),
      time: g(/time\s+(\S+)/i),
    };
  }

  for (const b of by('verify')) for (const t of itemsText(b)) ir.verify.push(verifyItem(t));

  const chat = first('chat');
  if (chat) {
    const s = itemsText(chat).join(' ');
    for (const m of s.matchAll(/T(\d)\s+([a-z-]+)/gi)) ir.tiers.push({ tier: +m[1], name: m[2].toLowerCase() });
  }

  for (const b of by('returns')) ir.returns.push(...itemsText(b).flatMap(list));
  const rec = first('receipts');
  if (rec) ir.receipts = /\bon\b|\btrue\b/i.test(itemsText(rec).join(' '));
  const ext = first('extends');
  if (ext) ir.extends = itemsText(ext).join(' ').trim() || null;

  return ir;
}

module.exports = { toTypedIR, typedEntry, splitTop };
