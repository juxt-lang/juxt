const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/app');
const charges = app => app.ctx.payments.calls.filter(c => c.type === 'charge');
const create = (app, items, headers) => app.handle({ method: 'POST', path: '/orders', headers, body: { items, card: 'card_123', amount: 2500 } });

test('creating an order reserves its stock', async () => {
  const app = createApp();
  assert.strictEqual((await create(app, [{ sku: 'SKU-1', qty: 3 }])).status, 201);
  assert.strictEqual(app.ctx.inventory.get('SKU-1'), 7);
});
test('all-or-nothing: one short item means no stock moved, no charge, no order (rule 5)', async () => {
  const app = createApp();
  const r = await create(app, [{ sku: 'SKU-1', qty: 2 }, { sku: 'SKU-3', qty: 1 }]);
  assert.ok(r.status >= 400 && r.status < 500, 'status ' + r.status);
  assert.strictEqual(app.ctx.inventory.get('SKU-1'), 10);
  assert.strictEqual(charges(app).length, 0);
  assert.strictEqual(app.ctx.orders.all().length, 0);
});
test('repeated lines for one SKU are checked together, stock never goes negative (rule 5)', async () => {
  const app = createApp();
  const r = await create(app, [{ sku: 'SKU-2', qty: 3 }, { sku: 'SKU-2', qty: 3 }]);
  assert.ok(r.status >= 400 && r.status < 500, 'status ' + r.status);
  assert.strictEqual(app.ctx.inventory.get('SKU-2'), 5);
  assert.strictEqual(charges(app).length, 0);
});
test('a retried create with the same Idempotency-Key reserves and charges once (rule 2)', async () => {
  const app = createApp();
  await create(app, [{ sku: 'SKU-2', qty: 2 }], { 'Idempotency-Key': 'c1' });
  await create(app, [{ sku: 'SKU-2', qty: 2 }], { 'Idempotency-Key': 'c1' });
  assert.strictEqual(app.ctx.inventory.get('SKU-2'), 3);
  assert.strictEqual(charges(app).length, 1);
});
