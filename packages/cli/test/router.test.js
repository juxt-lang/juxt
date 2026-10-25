const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path'), os = require('os'), http = require('http');
const { route } = require('../lib/router');
const { deterministic } = require('../lib/router');
const { lint } = require('../lib/lint');
const { toTypedIR } = require('../lib/ir');
const { indexRepo, checkProgram } = require('../lib/check');
const { compileContext } = require('../lib/context');
const { heuristicScore, rankPlans } = require('../lib/predictor');

const PROG = `@juxt 3.4
objective: cancel an order and refund the card
constraints:
  MUST idempotent writes
  OPEN partial refunds?
contract:
  in: req: CancelRequest
  out: refund: Refund
verify:
  test "cancel twice -> one refund"
topology: orchestrator(planner)
  planner => builder { Refund }
`;

function tmpRepo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'juxt-'));
  fs.mkdirSync(path.join(d, 'src')); fs.mkdirSync(path.join(d, 'test')); fs.mkdirSync(path.join(d, 'juxt'));
  fs.writeFileSync(path.join(d, 'src', 'types.ts'), 'export interface CancelRequest {\n  id: string;\n}\nexport interface Refund {\n  amt: number;\n}\n');
  fs.writeFileSync(path.join(d, 'test', 'c.test.js'), 'test("cancel twice -> one refund",()=>{})');
  fs.writeFileSync(path.join(d, 'juxt', 'cancel.juxt'), PROG);
  return d;
}

test('deterministic tier answers structural questions with no model', () => {
  const ir = toTypedIR(lint(PROG).prog);
  assert.match(deterministic(ir, 'what are the MUST rules?'), /idempotent writes/);
  assert.match(deterministic(ir, 'open questions?'), /partial refunds/);
  assert.match(deterministic(ir, 'verify checks?'), /cancel twice/);
  assert.strictEqual(deterministic(ir, 'write the actual code for me'), null);
});

test('route tier 1 is deterministic and free; repeat is tier 0 cache', async () => {
  const root = tmpRepo();
  const idx = indexRepo(root);
  const r1 = await route(PROG, 'what are the rules?', { root, repoIndex: idx, model: false });
  assert.strictEqual(r1.tier, 1);
  assert.strictEqual(r1.tokensIn, 0);
  const r2 = await route(PROG, 'what are the rules?', { root, repoIndex: idx, model: false });
  assert.strictEqual(r2.tier, 0);
  assert.strictEqual(r2.cached, true);
});

test('route escalates to tier 3 when no model is reachable', async () => {
  const root = tmpRepo();
  const r = await route(PROG, 'write the idempotency code', { root, repoIndex: indexRepo(root), model: { url: 'http://127.0.0.1:9', timeoutMs: 500 } });
  assert.strictEqual(r.tier, 3);
  assert.ok(r.escalate);
  assert.ok(r.prompt.includes('CancelRequest') || r.compiledTokens > 0);
});

test('route uses a mock OpenAI-compatible model at tier 2', async () => {
  const root = tmpRepo();
  const srv = http.createServer((req, res) => {
    let b = ''; req.on('data', d => b += d); req.on('end', () => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ choices: [{ message: { content: 'use the order id as the idempotency key' } }], usage: { prompt_tokens: 50, completion_tokens: 10 } }));
    });
  });
  await new Promise(r => srv.listen(0, r));
  const port = srv.address().port;
  const r = await route(PROG, 'how do I make the write idempotent in code?', { root, repoIndex: indexRepo(root), model: { url: `http://127.0.0.1:${port}/v1`, model: 'mock' } });
  srv.close();
  assert.strictEqual(r.tier, 2);
  assert.match(r.answer, /idempotency key/);
  assert.strictEqual(r.tokensIn, 50);
});

test('compiled context carries only the touched types and is smaller on a real repo', () => {
  const root = tmpRepo();
  for (let i = 0; i < 6; i++) fs.writeFileSync(path.join(root, 'src', 'm' + i + '.ts'), '// filler\n'.repeat(400));
  const idx = indexRepo(root);
  const ctx = compileContext(PROG, toTypedIR(lint(PROG).prog), 'build it', idx);
  assert.deepStrictEqual(ctx.typesIncluded.sort(), ['CancelRequest', 'Refund']);
  assert.ok(ctx.baselineTokensEst > ctx.tokensEst, 'whole repo should cost more than compiled context');
});

test('check finds unresolved OPEN as drift and unknown types as warnings', () => {
  const root = tmpRepo();
  const findings = checkProgram(PROG.replace('{ Refund }', '{ Ghost }'), root, indexRepo(root), 'juxt/cancel.juxt');
  assert.ok(findings.some(f => f.sev === 'drift' && /OPEN/.test(f.msg)));
  assert.ok(findings.some(f => f.sev === 'warn' && /Ghost/.test(f.msg)));
});

test('predictor ranks the plan that covers more MUSTs/checks higher', async () => {
  const ir = toTypedIR(lint(PROG).prog);
  const good = heuristicScore('make writes idempotent so a retried cancel never refunds twice; test cancel twice', ir);
  const bad = heuristicScore('just delete the order row', ir);
  assert.ok(good.score > bad.score);
  const ranked = await rankPlans(['just delete the order row', 'idempotent writes; cancel twice -> one refund'], ir);
  assert.match(ranked[0].plan, /idempotent/);
});
