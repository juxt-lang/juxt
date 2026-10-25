const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const { lint } = require('../lib/lint');
const { toTypedIR } = require('../lib/ir');
const { validate } = require('../lib/validate');
const ex = path.join(__dirname, '..', '..', '..', 'examples');
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'schema', 'juxt-ir.schema.json'), 'utf8'));

test('typed IR validates against the schema for every example', () => {
  for (const f of fs.readdirSync(ex).filter(f => f.endsWith('.juxt'))) {
    const ir = toTypedIR(lint(fs.readFileSync(path.join(ex, f), 'utf8')).prog);
    assert.deepStrictEqual(validate(ir, schema), [], f);
  }
});

test('agents, remote agents, handoffs and limits are typed', () => {
  const ir = toTypedIR(lint(fs.readFileSync(path.join(ex, 'ratelimit-team.juxt'), 'utf8')).prog);
  assert.strictEqual(ir.agents.length, 4);
  const billing = ir.agents.find(a => a.name === 'billing');
  assert.strictEqual(billing.kind, 'remote');
  assert.strictEqual(billing.signed, true);
  assert.match(billing.address, /^a2a:\/\//);
  const builder = ir.agents.find(a => a.name === 'builder');
  assert.deepStrictEqual(builder.tools, ['mcp://github', 'mcp://redis(read)']);
  const edge = ir.topology.edges.find(e => e.from === 'planner');
  assert.strictEqual(edge.kind, 'handoff');
  assert.deepStrictEqual(edge.fields, ['plan', 'contract']);
  assert.strictEqual(ir.limits.tokens, 200000);
  assert.strictEqual(ir.limits.cost_usd, 3);
});

test('open questions are separated from constraints', () => {
  const ir = toTypedIR(lint('@juxt 0.7\nobjective: x\nconstraints:\n  MUST a\n  OPEN b?\nverify:\n  test "t"\n').prog);
  assert.strictEqual(ir.constraints.length, 1);
  assert.strictEqual(ir.open.length, 1);
  assert.strictEqual(ir.open[0].question, 'b?');
});

test('schema rejects a malformed IR', () => {
  const bad = { juxt: '3.4', kind: 'nope', constraints: [], open: [], contract: { in: [], out: [], invariant: [], on_error: [] }, agents: [], topology: { orchestrator: null, edges: [] }, verify: [] };
  assert.ok(validate(bad, schema).some(e => /kind/.test(e)));
});
