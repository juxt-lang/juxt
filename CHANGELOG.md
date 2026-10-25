# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.7.0] - 2026-10-25

### Added
- **Formal grammar** ([spec/GRAMMAR.md](spec/GRAMMAR.md)) matching the reference parser, and an 18-case **conformance suite** ([spec/conformance](spec/conformance/)) any implementation can run.
- **Open benchmark** ([bench/](bench/)): Claude Code on four tasks with and without Juxt, scored by hidden acceptance tests, using the agent's reported tokens and cost. `bench/selftest.mjs` proves every task scores 0 on the base repo and 100% with the reference, and runs in CI.

### Changed
- **Language version follows the toolchain.** Programs start with `@juxt 0.7`. The old `@juxt 3.4` header is still accepted, read as 0.6, with a lint suggestion.
- **Record types parse correctly**: `out: 429 { retry_after: duration }` becomes a typed entry with fields. Commas and colons inside `{}`, `()` and `[]` no longer split. The IR schema gains `fields`.
- **Vendor blocks** such as `x-yourco-review:` are a warning, as documented, instead of an error.
- **No more strawman numbers.** `juxt eval` is now a routing check and no longer reports a "% less than the whole repo" figure; `juxt context` and `juxt receipts` drop that comparison too. Savings claims come only from the benchmark.
- PHP2Shell copy matches the official advisories (public exploits, exploitation attempts reported) and links them.

## [0.6.0] - 2026-10-25

### Added
- **Typed IR + JSON Schema.** `juxt ir --typed` emits a strict, machine-checkable IR (typed contract, agents, typed handoffs, topology, limits). `schema/juxt-ir.schema.json` describes it; `juxt validate` checks programs against it with a dependency-free validator. New `juxt schema` prints the schema.
- **Drift check.** `juxt check` binds a program to the repo it governs: flags unresolved `OPEN` questions as drift, `verify` tests with no matching test, PascalCase contract/handoff types that don't resolve to a TS/Pydantic/OpenAPI definition, and referenced paths that don't exist. CI-friendly exit codes; `--json` output.
- **Tiered router with measured receipts.** `juxt ask` answers from the cheapest tier that can: T0 recall (cache), T1 compiled (deterministic answers from the IR, no model), T2 a small local model, T3 escalate. `juxt receipts` summarises tiers, cache-hit rate and tokens saved. `juxt context` shows the compiled context and how much smaller it is than attaching the whole repo. `juxt eval` measures the no-model answer rate and context reduction on your repo.
- **Local-model adapters.** OpenAI-compatible endpoints (Ollama `/v1`, vLLM, LM Studio, llama.cpp, Together, OpenAI) and Ollama native, via `JUXT_MODEL_URL` / `JUXT_MODEL` / `JUXT_API_KEY`. `juxt models` checks the endpoint.
- **Predictor slot.** `lib/predictor.js` ranks candidate plans by MUST/verify coverage before building, via `JUXT_PREDICTOR_URL` or a deterministic heuristic — the seam a JEPA-style code world-model would plug into.
- **GitHub Action.** `juxt-lang/juxt@v1` (composite `action.yml`) runs lint + validate + check in CI.
- JS API subpath exports: `juxt-lang/ir`, `/validate`, `/check`, `/router`, `/context`, `/model`, `/predictor`, `/schema`.

### Notes
- Token counts are `chars/4` estimates unless a model reports real counts; the CLI labels them as estimates.

## [0.5.0] - 2026-10-25

### Added
- JavaScript API: `require('juxt-lang')` exports `lint`, `toIR` and `parse`.
- `examples/ratelimit-team.juxt`: a full team program (agents, typed handoffs, A2A, policy, limits, tiers, eval).

### Fixed
- Linter: two-word keywords followed by a name, such as `remote agent billing:`, are recognised.

## [0.4.4] - 2026-10-25

### Changed
- README: results of the real-project test (Snipe-IT clone).

## [0.4.3] - 2026-10-25

### Changed
- `php2shell` program, after a live test on a real open-source project: the scout now inspects every Dockerfile, compose file, Helm chart, k8s manifest, CI workflow and the host; PHP installed from distro packages (apt, apk, dnf) counts, with backported fixes checked against the distro's security tracker; the receipt is printed only when every verify check passes, otherwise the agent lists what is left.

## [0.4.2] - 2026-10-25

### Fixed
- Windows: finds agent CLIs in npm's global folder and native install folders, not only on PATH.
- `--agent <name>` always tries to start that agent, and falls back to a paste-in line if it can't.
- Clearer next steps when no agent command-line tool is installed.

## [0.4.1] - 2026-10-25

### Fixed
- `npx juxt-lang php2shell` now finds and starts the AI agent on Windows (uses `where` and launches `.cmd` agent shims through the shell).

## [0.4.0] - 2026-10-25

### Added
- `npx juxt-lang php2shell`: one command that writes the fix program, sets up Juxt for your agent and starts it (Claude Code, Codex, Gemini CLI or Cursor). Options: `--agent`, `--print`, `--no-launch`.

## [0.3.0] - 2026-10-25

### Changed
- `php2shell` recipe is now a full Juxt program: four agents (scout, planner, patcher, verifier) in a pipeline with typed handoffs, an approval gate, policy, limits, observability and a receipt. It runs when pasted into any AI agent, with no install.

### Added
- Help for teams patching many servers; GitHub Sponsor button and npm `funding` link to the contact page.

## [0.2.1] - 2026-10-24

### Changed
- README: exact commands to run the PHP2Shell fix from your AI or a terminal (Claude Code, Codex, Gemini CLI, Cursor, no-Node servers).

## [0.2.0] - 2026-10-24

### Added
- `juxt fix <recipe>`: ready-made fix programs. First recipe: `npx juxt-lang fix php2shell` for CVE-2026-109618 and CVE-2026-109619. The agent finds every web-serving PHP, asks before changing anything, updates, restarts and verifies.
- `examples/php2shell.juxt`.

## [0.1.2] - 2026-10-24

### Added
- Contact details in the package metadata and README: business enquiries to Amit, support to the project inbox.

## [0.1.1] - 2026-10-24

### Added
- `NOTICE` file with attribution (created by Amit N), bundled in the npm package.
- Trademark policy (`TRADEMARKS.md`) and content licence (`LICENSE-CONTENT.md`) for the name, logo, site and book.

### Changed
- Website moved to https://juxt-lang.github.io/.

## [0.1.0] - 2026-10-24

First public preview.

### Added

- **Juxt mode**: say "use juxt" (or run `/juxt:use`) and a request is compiled into a `.juxt` program with objective, rules, contract, OPEN questions and verify checks before any code is written.
- **Reviewer subagent** that checks results against every `MUST`.
- `/juxt:digest`: repo changes by area from git, cached per commit.
- `/juxt:status`: cited status drafts for team, director and exec audiences.
- `/juxt:hosts`: discovery of the host's native skills, commands, subagents and MCP servers.
- `/juxt:init` and `/juxt:receipts`.
- Portable Agent Skills copy for Codex and other `SKILL.md` hosts.
- `juxt-lang` npm CLI (`npx juxt-lang init | lint | ir | digest | facts | hosts`).
- Language summary (3.4), example programs, eval suite and website.

[0.5.0]: https://github.com/juxt-lang/juxt/releases/tag/v0.5.0
[0.4.4]: https://github.com/juxt-lang/juxt/releases/tag/v0.4.4
[0.4.3]: https://github.com/juxt-lang/juxt/releases/tag/v0.4.3
[0.4.2]: https://github.com/juxt-lang/juxt/releases/tag/v0.4.2
[0.4.1]: https://github.com/juxt-lang/juxt/releases/tag/v0.4.1
[0.4.0]: https://github.com/juxt-lang/juxt/releases/tag/v0.4.0
[0.3.0]: https://github.com/juxt-lang/juxt/releases/tag/v0.3.0
[0.2.1]: https://github.com/juxt-lang/juxt/releases/tag/v0.2.1
[0.2.0]: https://github.com/juxt-lang/juxt/releases/tag/v0.2.0
[0.1.2]: https://github.com/juxt-lang/juxt/releases/tag/v0.1.2
[0.1.1]: https://github.com/juxt-lang/juxt/releases/tag/v0.1.1
[0.1.0]: https://github.com/juxt-lang/juxt/releases/tag/v0.1.0
