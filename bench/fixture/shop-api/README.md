# shop-api

A small orders and payments API (no dependencies). `src/app.js` exposes
`createApp()`, whose `handle({ method, path, headers, body })` returns
`{ status, body }`. `src/server.js` wraps it in a Node HTTP server.

**Read [docs/RULES.md](docs/RULES.md) before changing anything.** Those are
the house rules every change must follow.

```sh
npm test        # run the tests
node src/server.js
```
