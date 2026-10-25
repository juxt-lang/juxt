'use strict';
// ctx.once(req, scope, fn): run fn once per Idempotency-Key and replay its response.
// Without a key the request runs normally.
function createOnce() {
  const seen = new Map();
  return async function once(req, scope, fn) {
    const key = req.headers['idempotency-key'];
    if (!key) return fn();
    const k = scope + ':' + key;
    if (seen.has(k)) return seen.get(k);
    const res = await fn();
    seen.set(k, res);
    return res;
  };
}
module.exports = { createOnce };
