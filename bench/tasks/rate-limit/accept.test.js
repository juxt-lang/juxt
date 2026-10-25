const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/app');
function setup() { const t = { now: 1_000_000 }; const app = createApp({ clock: { now: () => t.now } }); return { app, t }; }
const get = (app, path, key) => app.handle({ method: 'GET', path, headers: { 'x-api-key': key } });

test('the 101st request in a minute is 429 rate_limited with retry_after', async () => {
  const { app } = setup();
  for (let i = 0; i < 100; i++) assert.strictEqual((await get(app, '/api/v1/products', 'A')).status, 200, 'request ' + (i + 1));
  const r = await get(app, '/api/v1/products', 'A');
  assert.strictEqual(r.status, 429);
  assert.strictEqual(r.body.error, 'rate_limited');
  assert.ok(typeof r.body.retry_after === 'number' && r.body.retry_after > 0);
});
test('limits are per API key', async () => {
  const { app } = setup();
  for (let i = 0; i < 100; i++) await get(app, '/api/v1/products', 'A');
  assert.strictEqual((await get(app, '/api/v1/products', 'A')).status, 429, 'A should be limited first');
  assert.strictEqual((await get(app, '/api/v1/products', 'B')).status, 200);
});
test('billing and internal routes are never throttled (rule 6)', async () => {
  const { app } = setup();
  for (let i = 0; i < 100; i++) await get(app, '/api/v1/products', 'A');
  assert.strictEqual((await get(app, '/api/v1/products', 'A')).status, 429, 'the key must be over its /api/ limit first');
  for (let i = 0; i < 150; i++) assert.strictEqual((await get(app, '/billing/usage', 'A')).status, 200, 'billing ' + (i + 1));
  for (let i = 0; i < 150; i++) assert.strictEqual((await get(app, '/internal/health', 'A')).status, 200, 'internal ' + (i + 1));
});
test('the window uses ctx.clock, so it resets after a minute (rule 8)', async () => {
  const { app, t } = setup();
  for (let i = 0; i < 100; i++) await get(app, '/api/v1/products', 'A');
  assert.strictEqual((await get(app, '/api/v1/products', 'A')).status, 429, 'limited before the minute passes');
  t.now += 61_000;
  assert.strictEqual((await get(app, '/api/v1/products', 'A')).status, 200);
});
