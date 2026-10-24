# Juxt quick reference (3.4)

Plain text, one block per line, content indented. Any agent can read it without a parser.

| Block | Meaning |
|---|---|
| `context` | Stack, layout, conventions, test command |
| `objective` | Outcome plus acceptance criterion |
| `constraints` | `MUST`, `MUST NOT`, `SHOULD`, `OPEN` (shorthand `!`, `!!`, `~`, `?`) |
| `contract` | `in`, `out`, `invariant`, `on_error` |
| `pattern` | saga, idempotent, outbox, expand-contract, resilience, strangler-fig, ... |
| `agent` / `remote agent` | Role, model, tools (`mcp://`), scope; remote over `a2a://` (signed) |
| `topology` | orchestrator, pipeline, fanout, hierarchy, swarm, mesh; handoffs `a => b { fields }` |
| `host` | `prefer native` (default): compile steps to the host's own skills, commands and subagents |
| `harness` / `policy` / `limits` | Where it runs; quarantine and approvals; token, iteration and cost caps |
| `verify` / `eval` | Checks that run; golden tasks in CI |
| `chat` | Answer tiers: T0 recall, T1 compiled program, T2 small model, T3 frontier |
| `ledger` / `view` | Facts recorded once; Jira, standup, leadership, dashboard views from them |
| `receipts` | Record what was answered without a model, with estimates labelled |
| `returns` / `persist` | Diff, decisions, risks; ADRs and rules carried forward |

Rules: every program has an `objective` and at least one `verify`; constraints outrank the objective; every handoff names its payload; policy is enforced by the harness, not only by the prompt.

Full specification: The Juxt Book.
