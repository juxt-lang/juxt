'use strict';
// Model adapters. Zero deps: uses Node 18+ global fetch.
// Supports OpenAI-compatible servers (Ollama /v1, vLLM, LM Studio, llama.cpp,
// Together, OpenAI) and Ollama's native /api/chat. Config via env or args:
//   JUXT_MODEL_URL   base URL (default http://localhost:11434 — Ollama)
//   JUXT_MODEL       model name (default qwen2.5-coder:7b)
//   JUXT_API_KEY     bearer token for hosted OpenAI-compatible endpoints
const DEFAULT_URL = process.env.JUXT_MODEL_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.JUXT_MODEL || 'qwen2.5-coder:7b';

function cfg(opts = {}) {
  return {
    url: (opts.url || DEFAULT_URL).replace(/\/$/, ''),
    model: opts.model || DEFAULT_MODEL,
    apiKey: opts.apiKey || process.env.JUXT_API_KEY || null,
  };
}
const estTokens = s => Math.ceil((s || '').length / 4);  // labelled estimate, not a billed count

async function withTimeout(p, ms, onAbort) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { return await p(ctl.signal); } finally { clearTimeout(t); }
}

// Returns {ok, text, usage:{in,out}, ms, model, endpoint} or {ok:false, error}
async function chat(messages, opts = {}) {
  const c = cfg(opts);
  const openai = /\/v1$|openai|together|groq|127\.0\.0\.1:1234|:1234/.test(c.url) || c.apiKey;
  const t0 = Date.now();
  try {
    if (openai) {
      const base = /\/v1$/.test(c.url) ? c.url : c.url + '/v1';
      const r = await withTimeout(sig => fetch(base + '/chat/completions', {
        method: 'POST', signal: sig,
        headers: { 'content-type': 'application/json', ...(c.apiKey ? { authorization: 'Bearer ' + c.apiKey } : {}) },
        body: JSON.stringify({ model: c.model, messages, temperature: opts.temperature ?? 0.1, stream: false }),
      }), opts.timeoutMs || 60000);
      if (!r.ok) return { ok: false, error: `HTTP ${r.status} ${await r.text().catch(() => '')}`.slice(0, 200) };
      const j = await r.json();
      const text = j.choices?.[0]?.message?.content ?? '';
      const u = j.usage || {};
      return { ok: true, text, ms: Date.now() - t0, model: c.model, endpoint: 'openai',
        usage: { in: u.prompt_tokens ?? estTokens(JSON.stringify(messages)), out: u.completion_tokens ?? estTokens(text) } };
    }
    // Ollama native
    const r = await withTimeout(sig => fetch(c.url + '/api/chat', {
      method: 'POST', signal: sig,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: c.model, messages, stream: false, options: { temperature: opts.temperature ?? 0.1 } }),
    }), opts.timeoutMs || 60000);
    if (!r.ok) return { ok: false, error: `HTTP ${r.status} ${await r.text().catch(() => '')}`.slice(0, 200) };
    const j = await r.json();
    const text = j.message?.content ?? '';
    return { ok: true, text, ms: Date.now() - t0, model: c.model, endpoint: 'ollama',
      usage: { in: j.prompt_eval_count ?? estTokens(JSON.stringify(messages)), out: j.eval_count ?? estTokens(text) } };
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'timeout' : String(e.message || e) };
  }
}

async function health(opts = {}) {
  const c = cfg(opts);
  try {
    const r = await withTimeout(sig => fetch(c.url + '/api/tags', { signal: sig }), 2500).catch(() => null)
      || await withTimeout(sig => fetch((/\/v1$/.test(c.url) ? c.url : c.url + '/v1') + '/models', {
        signal: sig, headers: c.apiKey ? { authorization: 'Bearer ' + c.apiKey } : {},
      }), 2500);
    return { ok: !!(r && r.ok), url: c.url, model: c.model, status: r ? r.status : 0 };
  } catch (e) { return { ok: false, url: c.url, model: c.model, error: String(e.message || e) }; }
}

module.exports = { chat, health, cfg, estTokens, DEFAULT_URL, DEFAULT_MODEL };
