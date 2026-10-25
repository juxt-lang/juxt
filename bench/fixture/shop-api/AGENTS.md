# Notes for coding agents

- House rules live in docs/RULES.md. They are mandatory.
- Use the helpers that already exist (`ctx.once` for idempotency, `ctx.clock` for time,
  `ctx.payments` for money) instead of writing new ones.
- Run `npm test` before you finish.
