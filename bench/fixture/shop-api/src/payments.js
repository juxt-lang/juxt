'use strict';
// Fake payment provider. Every call is recorded so tests can assert on it.
function createPayments() {
  const calls = [];
  return {
    calls,
    charge(card, amount) { calls.push({ type: 'charge', card, amount }); return { id: 'ch_' + calls.length }; },
    refund(card, amount) { calls.push({ type: 'refund', card, amount }); return { id: 're_' + calls.length }; },
  };
}
module.exports = { createPayments };
