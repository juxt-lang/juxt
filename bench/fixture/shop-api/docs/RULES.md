# House rules

1. **Money is integer cents.** Reject a missing, non-integer or non-positive amount
   with `400 { error: "invalid_amount" }`.
2. **Writes are idempotent.** Retrying a request must never repeat a side effect
   (a charge, a refund, a stock change). Clients may send an `Idempotency-Key`
   header; the same key must return the same response. Use `ctx.once`.
3. **Refunds go back to the original card,** only through
   `ctx.payments.refund(card, amount)`. Never refund more than was paid.
4. **Shipped orders cannot be cancelled:** `409 { error: "order_shipped" }`.
5. **Multi-item writes are all-or-nothing.** If any item fails, nothing changes:
   no stock is moved and no card is charged.
6. **Rate limits apply only to `/api/` routes.** Never throttle `/billing/`;
   billing must always answer. Over the limit, respond
   `429 { error: "rate_limited", retry_after: <seconds> }`.
7. **Errors are JSON** `{ error, message }`. Unknown orders are `404 { error: "not_found" }`.
8. **Time comes from `ctx.clock.now()`** (milliseconds). Tests inject a clock, so
   never call `Date.now()` in handlers.
