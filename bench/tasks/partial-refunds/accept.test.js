const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/app');
const body = { items: [{ sku: 'SKU-1', qty: 1 }], card: 'card_123', amount: 2500 };
const refunds = app => app.ctx.payments.calls.filter(c => c.type === 'refund');
async function order(app) { return (await app.handle({ method: 'POST', path: '/orders', body })).body; }
const refund = (app, id, amount, headers) => app.handle({ method: 'POST', path: `/orders/${id}/refunds`, headers, body: { amount } });

test('partial refunds go to the original card and add up (rule 3)', async () => {
  const app = createApp(); const o = await order(app);
  assert.ok((await refund(app, o.id, 1000)).status < 300);
  assert.ok((await refund(app, o.id, 1500)).status < 300);
  assert.deepStrictEqual(refunds(app).map(c => [c.card, c.amount]), [['card_123', 1000], ['card_123', 1500]]);
});
test('never refund more than was paid (rule 3)', async () => {
  const app = createApp(); const o = await order(app);
  await refund(app, o.id, 2000);
  const r = await refund(app, o.id, 501);
  assert.ok(r.status >= 400 && r.status < 500, 'status ' + r.status);
  assert.strictEqual(refunds(app).length, 1);
});
test('amounts are positive integer cents: 400 invalid_amount (rule 1)', async () => {
  const app = createApp(); const o = await order(app);
  for (const bad of [10.5, 0, -100, '100', undefined]) {
    const r = await refund(app, o.id, bad);
    assert.strictEqual(r.status, 400, 'amount ' + bad);
    assert.strictEqual(r.body.error, 'invalid_amount');
  }
  assert.strictEqual(refunds(app).length, 0);
});
test('a retried refund with the same Idempotency-Key refunds once and replays the response (rule 2)', async () => {
  const app = createApp(); const o = await order(app);
  const a = await refund(app, o.id, 500, { 'Idempotency-Key': 'r1' });
  const b = await refund(app, o.id, 500, { 'Idempotency-Key': 'r1' });
  assert.strictEqual(refunds(app).length, 1);
  assert.deepStrictEqual(b, a);
});
test('unknown order is 404 not_found', async () => {
  const app = createApp(); const o = await order(app);
  assert.notStrictEqual((await refund(app, o.id, 100)).status, 404, 'the refunds route must exist');
  const r = await refund(app, 'nope', 100);
  assert.strictEqual(r.status, 404);
});
