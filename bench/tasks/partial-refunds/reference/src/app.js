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

  route('POST', '/orders/:id/refunds', (req) => ctx.once(req, 'refund:' + req.params.id, () => {
    const order = ctx.orders.get(req.params.id);
    if (!order) return err(404, 'not_found');
    const amount = (req.body || {}).amount;
    if (!isCents(amount)) return err(400, 'invalid_amount');
    if (order.refunded + amount > order.amount) return err(422, 'refund_exceeds_payment');
    ctx.payments.refund(order.card, amount);
    order.refunded += amount;
    if (order.refunded === order.amount) order.status = 'refunded';
    ctx.orders.save(order);
    return { status: 201, body: { orderId: order.id, amount, refunded: order.refunded } };
  }));

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
