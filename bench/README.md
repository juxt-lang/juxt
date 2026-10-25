# Juxt benchmark

Does Juxt make a coding agent **follow a repo's rules more often**, and at what **token cost**? This benchmark answers that with the agent's own reported usage. Nothing is estimated.

## Run it

You need Node 18+, git, and [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) signed in.

```sh
git clone https://github.com/juxt-lang/juxt && cd juxt
node bench/selftest.mjs                 # proves the tasks are valid (no model, ~2s)
node bench/run.mjs                      # 4 tasks x (baseline, juxt) x 1 run
node bench/run.mjs --runs 3 --model sonnet
```

Results go to `bench/results/<time>-claude.jsonl` (every run, raw) and a `.md` summary. A full run is 8 agent sessions per repetition and is billed to your account.

## What is measured

| Metric | Source |
|---|---|
| **solved** | every hidden acceptance check passes **and** the repo's own tests stay green |
| **hidden checks passed** | count across all tasks |
| **tokens** | Claude Code's reported usage: input + output + cache read + cache write |
| **cost, turns** | `total_cost_usd` and `num_turns` from `claude -p --output-format json` |

## The tasks

`fixture/shop-api` is a small orders and payments API. Like real repos, its constraints live in the docs ([docs/RULES.md](fixture/shop-api/docs/RULES.md)): money is integer cents, writes are idempotent, refunds go to the original card, shipped orders cannot be cancelled, multi-item writes are all-or-nothing, never throttle `/billing/`, time comes from the injected clock.

Each task is a short request, the way people actually ask:

| Task | Prompt |
|---|---|
| `cancel-order` | Add an endpoint to cancel an order: POST /orders/:id/cancel. Cancelling should refund the customer. |
| `rate-limit` | Rate-limit the public API to 100 requests per minute per API key (the x-api-key header). |
| `partial-refunds` | Add partial refunds: POST /orders/:id/refunds with { amount }. |
| `reserve-stock` | When an order is created, reserve stock for each item in it. |

The hidden tests check the feature **and** the house rules a careful engineer would apply, for example "cancelling twice never refunds twice" or "one short item means no stock moved and no charge."

## Fairness rules

1. **Same agent, model, repo, permissions and prompt.** The juxt arm differs only by the installed Juxt skill (`juxt init --host claude`) and the two words `use juxt:` in front of the prompt. Reading the skill costs tokens, and those tokens are counted against Juxt.
2. **Hidden tests.** Acceptance tests are copied in after the agent finishes. Neither arm can see them.
3. **No vacuous passes.** `selftest.mjs` proves every task scores **0** on the untouched repo and **100%** with the reference solution. It runs in CI.
4. **Report everything.** Every run is written to the `.jsonl`, including failures and runs where Juxt loses. Run several repetitions (`--runs 3` or more); agents are not deterministic.

## Known limitations

- **One small reference app, four tasks.** Third-party repos are next. Treat early results as a signal, not a verdict.
- **Non-interactive mode understates Juxt.** Its main feature is asking `OPEN` questions before coding; here nobody can answer, so both arms are told to read the docs and pick the safest option.
- **The tasks reward reading the docs.** That is the claim under test, but a different task mix (pure algorithms, say) would show less difference.
- **Claude Code only, for now.** The runner is small; adding Codex or Gemini CLI is a pull request away.

## Results

No results are published yet. They will appear here unedited, with the raw `.jsonl`, whatever they show.
