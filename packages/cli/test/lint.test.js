const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const { lint, toIR } = require('../lib/lint');
const ex = path.join(__dirname, '..', '..', '..', 'examples');

test('all examples lint without errors', () => {
  for (const f of fs.readdirSync(ex).filter(f => f.endsWith('.juxt'))) {
    const { diags } = lint(fs.readFileSync(path.join(ex, f), 'utf8'));
    assert.deepStrictEqual(diags.filter(d => d.level === 'error'), [], f);
  }
});
test('objective without verify is an error', () => {
  const { diags } = lint('@juxt 3.4\nobjective: ship it\n');
  assert.ok(diags.some(d => /verify/.test(d.msg)));
});
test('missing header is an error', () => {
  assert.ok(lint('objective: x\nverify:\n  test "a"\n').diags.some(d => /@juxt/.test(d.msg)));
});
test('bad constraint keyword and OPEN warning', () => {
  const { diags } = lint('@juxt 3.4\nobjective: x\nconstraints:\n  MAYBE do it\n  OPEN partial refunds?\nverify:\n  test "a"\n');
  assert.ok(diags.some(d => d.level === 'error' && /constraint/.test(d.msg)));
  assert.ok(diags.some(d => d.level === 'warning' && /OPEN/.test(d.msg)));
});
test('IR has typed constraints', () => {
  const ir = toIR(lint(fs.readFileSync(path.join(ex, 'cancel-order.juxt'), 'utf8')).prog);
  assert.strictEqual(ir.kind, 'task');
  assert.deepStrictEqual(ir.blocks.constraints[1], { level: 'MUST NOT', rule: 'change the public order schema' });
});

test('fix recipes lint without errors', () => {
  const rd = path.join(__dirname, '..', 'recipes');
  for (const f of fs.readdirSync(rd).filter(f => f.endsWith('.juxt'))) {
    const { diags } = lint(fs.readFileSync(path.join(rd, f), 'utf8'));
    assert.deepStrictEqual(diags.filter(d => d.level === 'error'), [], f);
  }
});

test('two-word keyword with a name: remote agent billing', () => {
  const { prog, diags } = lint('@juxt 3.4\nremote agent billing:  a2a://billing.acme.dev, signed\n');
  assert.deepStrictEqual(diags, []);
  assert.strictEqual(prog.blocks[0].name, 'remote agent');
  assert.strictEqual(prog.blocks[0].label, 'billing');
});
