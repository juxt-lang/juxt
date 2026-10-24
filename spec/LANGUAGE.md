# Juxt language summary (3.4)

The full specification is The Juxt Book. This page is the working subset the plugin uses today.

- A program is plain text: `@juxt <version>`, then blocks written as `name:` with indented content.
- Core blocks: `context`, `objective`, `constraints` (`MUST`, `MUST NOT`, `SHOULD`, `OPEN`), `contract` (`in`, `out`, `invariant`, `on_error`), `pattern`, `verify`, `returns`.
- Team blocks (spec, partly roadmap): `agent`, `remote agent` (`a2a://`, signed), `tools` (`mcp://`), `topology`, typed handoffs `a => b { fields }`, `harness`, `policy`, `limits`, `observe`, `eval`.
- Enterprise blocks (roadmap): `on:` triggers, `recipe`, `stack` and `freshness`, `fleet` and `rollout`, `architecture` and `fitness`, `extends`.
- 3.1 answer tiers: `chat` with T0 recall, T1 compiled programs, T2 small model, T3 frontier.
- 3.2 Altitude: `ledger` of facts and `view`s per audience, every sentence cited.
- 3.3 Juxt mode: "use juxt" compiles a request into a program and asks OPEN questions first.
- 3.4 Host adapters and receipts: `host: prefer native` compiles steps to the host's own skills, commands and subagents; `receipts` record what was answered without a model.

Rules: every program has an objective and at least one verify check; constraints outrank the objective; OPEN items are asked, never guessed; policy is enforced by the harness, not only the prompt.
