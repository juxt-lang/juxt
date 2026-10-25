'use strict';
const http = require('http');
const { createApp } = require('./app');

const app = createApp();
http.createServer((req, res) => {
  let raw = '';
  req.on('data', d => { raw += d; });
  req.on('end', async () => {
    let body; try { body = raw ? JSON.parse(raw) : undefined; } catch { body = undefined; }
    const out = await app.handle({ method: req.method, path: req.url.split('?')[0], headers: req.headers, body });
    res.writeHead(out.status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(out.body));
  });
}).listen(process.env.PORT || 3000, () => console.log('shop-api on :' + (process.env.PORT || 3000)));
