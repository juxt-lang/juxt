'use strict';
// In-memory stock levels, keyed by SKU.
function createInventory(initial = { 'SKU-1': 10, 'SKU-2': 5, 'SKU-3': 0 }) {
  const stock = new Map(Object.entries(initial));
  return {
    get(sku) { return stock.has(sku) ? stock.get(sku) : null; },
    set(sku, qty) { stock.set(sku, qty); },
    list() { return [...stock.entries()].map(([sku, qty]) => ({ sku, qty })); },
  };
}
module.exports = { createInventory };
