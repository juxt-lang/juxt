'use strict';
// In-memory order store.
function createOrders() {
  const byId = new Map();
  let seq = 0;
  return {
    create(fields) {
      const order = { id: 'o' + (++seq), status: 'paid', refunded: 0, ...fields };
      byId.set(order.id, order);
      return order;
    },
    get(id) { return byId.get(id) || null; },
    save(order) { byId.set(order.id, order); return order; },
    all() { return [...byId.values()]; },
  };
}
module.exports = { createOrders };
