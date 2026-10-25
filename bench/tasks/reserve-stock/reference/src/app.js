'use strict';
const { createOrders } = require('./orders');
const { createPayments } = require('./payments');
const { createInventory } = require('./inventory');
const { createOnce } = require('./idempotency');

const err = (status, error, message) => ({ status, body: { error, message: message || error } });
const isCents = v => Number.isInteger(v) && v > 0;

function createApp(opts = {}) {
  const ctx = {
    clock: opts.clock || { now: () => Date.now() },
    payments: opts.payments || createPayments(),
    inventory: opts.inventory || createInventory(),
    orders: opts.orders || createOrders(),
    once: createOnce(),
  };
  const routes = [];
  const route = (method, pattern, fn) =>
    routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn });

  // Create an order and charge the card.
  route('POST', '/orders', (req) => ctx.once(req, 'create-order', () => {
    const { items, card, amount } = req.body || {};
    if (!Array.isArray(items) || !items.length) return err(400, 'invalid_items');
    if (typeof card !== 'string' || !card) return err(400, 'invalid_card');
    if (!isCents(amount)) return err(400, 'invalid_amount');
    const need = new Map();
    for (const it of items) {
      if (!it || typeof it.sku !== 'string' || !Number.isInteger(it.qty) || it.qty <= 0) return err(400, 'invalid_items');
      need.set(it.sku, (need.get(it.sku) || 0) + it.qty);
    }
    for (const [sku, qty] of need) {
      const have = ctx.inventory.get(sku);
      if (have === null) return err(400, 'unknown_sku');
      if (have < qty) return err(409, 'insufficient_stock');
    }
    for (const [sku, qty] of need) ctx.inventory.set(sku, ctx.inventory.get(sku) - qty);
    ctx.payments.charge(card, amount);
    const order = ctx.orders.create({ items, card, amount, createdAt: ctx.clock.now() });
    return { status: 201, body: order };
  }));

  route('GET', '/orders/:id', (req) => {
    const order = ctx.orders.get(req.params.id);
    return order ? { status: 200, body: order } : err(404, 'not_found');
  });

  route('POST', '/orders/:id/ship', (req) => {
    const order = ctx.orders.get(req.params.id);
    if (!order) return err(404, 'not_found');
    if (order.status === 'paid') { order.status = 'shipped'; ctx.orders.save(order); }
    return { status: 200, body: order };
  });

  route('GET', '/api/v1/products', () => ({ status: 200, body: ctx.inventory.list() }));
  route('GET', '/billing/usage', () => ({ status: 200, body: { orders: ctx.orders.all().length } }));
  route('GET', '/internal/health', () => ({ status: 200, body: { ok: true } }));

  async function handle(req) {
    const headers = {};
    for (const [k, v] of Object.entries(req.headers || {})) headers[k.toLowerCase()] = v;
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = req.path.match(r.re);
      if (m) return r.fn({ ...req, headers, params: m.groups || {} }, ctx);
    }
    return err(404, 'not_found');
  }
  return { handle, ctx };
}
module.exports = { createApp };
