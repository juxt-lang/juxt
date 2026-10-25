const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/app');

const newOrder = { items: [{ sku: 'SKU-1', qty: 1 }], card: 'card_123', amount: 2500 };

test('creates and reads an order', async () => {
  const app = createApp();
  const c = await app.handle({ method: 'POST', path: '/orders', body: newOrder });
  assert.strictEqual(c.status, 201);
  const g = await app.handle({ method: 'GET', path: '/orders/' + c.body.id });
  assert.strictEqual(g.body.amount, 2500);
});

test('rejects a non-integer amount', async () => {
  const app = createApp();
  const r = await app.handle({ method: 'POST', path: '/orders', body: { ...newOrder, amount: 25.5 } });
  assert.strictEqual(r.status, 400);
});

test('create is idempotent with an Idempotency-Key', async () => {
  const app = createApp();
  const req = { method: 'POST', path: '/orders', headers: { 'Idempotency-Key': 'k1' }, body: newOrder };
  await app.handle(req); await app.handle(req);
  assert.strictEqual(app.ctx.payments.calls.filter(c => c.type === 'charge').length, 1);
});

test('ships an order', async () => {
  const app = createApp();
  const c = await app.handle({ method: 'POST', path: '/orders', body: newOrder });
  const s = await app.handle({ method: 'POST', path: `/orders/${c.body.id}/ship` });
  assert.strictEqual(s.body.status, 'shipped');
});
