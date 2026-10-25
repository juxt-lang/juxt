const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/app');
const body = { items: [{ sku: 'SKU-1', qty: 1 }], card: 'card_123', amount: 2500 };
const refunds = app => app.ctx.payments.calls.filter(c => c.type === 'refund');
async function order(app) { return (await app.handle({ method: 'POST', path: '/orders', body })).body; }

test('cancel refunds the full amount to the original card', async () => {
  const app = createApp(); const o = await order(app);
  const r = await app.handle({ method: 'POST', path: `/orders/${o.id}/cancel` });
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await app.handle({ method: 'GET', path: '/orders/' + o.id })).body.status, 'cancelled');
  assert.deepStrictEqual(refunds(app).map(c => [c.card, c.amount]), [['card_123', 2500]]);
});
test('cancelling twice never refunds twice (rule 2)', async () => {
  const app = createApp(); const o = await order(app);
  await app.handle({ method: 'POST', path: `/orders/${o.id}/cancel` });
  const again = await app.handle({ method: 'POST', path: `/orders/${o.id}/cancel` });
  assert.ok(again.status < 500);
  assert.strictEqual(refunds(app).length, 1);
});
test('a shipped order cannot be cancelled: 409 order_shipped, no refund (rule 4)', async () => {
  const app = createApp(); const o = await order(app);
  await app.handle({ method: 'POST', path: `/orders/${o.id}/ship` });
  const r = await app.handle({ method: 'POST', path: `/orders/${o.id}/cancel` });
  assert.strictEqual(r.status, 409);
  assert.strictEqual(r.body.error, 'order_shipped');
  assert.strictEqual(refunds(app).length, 0);
});
test('unknown order is 404 not_found (rule 7)', async () => {
  const app = createApp(); const o = await order(app);
  assert.notStrictEqual((await app.handle({ method: 'POST', path: `/orders/${o.id}/cancel` })).status, 404, 'the cancel route must exist');
  const r = await app.handle({ method: 'POST', path: '/orders/nope/cancel' });
  assert.strictEqual(r.status, 404);
  assert.strictEqual(r.body.error, 'not_found');
});
