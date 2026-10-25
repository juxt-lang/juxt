<p align="center">
  <a href="https://juxt-lang.github.io/"><img src="https://raw.githubusercontent.com/juxt-lang/juxt/main/assets/banner.png" alt="Juxt-lang: many minds, one intent. The language for directing AI agents." width="100%"></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/juxt-lang"><img alt="npm version" src="https://img.shields.io/npm/v/juxt-lang?color=F7DF1E&label=npm"></a>
  <a href="https://www.npmjs.com/package/juxt-lang"><img alt="npm downloads" src="https://img.shields.io/npm/dm/juxt-lang?color=111111"></a>
  <a href="https://github.com/juxt-lang/juxt/actions/workflows/validate.yml"><img alt="CI" src="https://github.com/juxt-lang/juxt/actions/workflows/validate.yml/badge.svg"></a>
  <img alt="Node 18+" src="https://img.shields.io/node/v/juxt-lang?color=5FD3A4">
  <img alt="Zero dependencies" src="https://img.shields.io/badge/dependencies-0-5FD3A4">
  <a href="https://github.com/juxt-lang/juxt/blob/main/LICENSE"><img alt="License: Apache-2.0" src="https://img.shields.io/badge/license-Apache--2.0-F7DF1E"></a>
</p>

<p align="center"><a href="https://juxt-lang.github.io/#/contact"><b>Created by Amit N</b></a> · <a href="https://juxt-lang.github.io/#/contact">Contact</a></p>

<p align="center">
  <a href="https://juxt-lang.github.io/"><b>Website</b></a> ·
  <a href="https://github.com/juxt-lang/juxt"><b>GitHub</b></a> ·
  <a href="https://github.com/juxt-lang/juxt/blob/main/spec/LANGUAGE.md"><b>Language</b></a> ·
  <a href="https://github.com/juxt-lang/juxt/tree/main/examples"><b>Examples</b></a> ·
  <a href="https://github.com/juxt-lang/juxt/discussions"><b>Discussions</b></a>
</p>

---

**Juxt-lang is the language for directing AI agents.** This package is its command-line tool. In one command it gives any coding agent *Juxt mode*: say `use juxt` and your request is compiled into a short, reviewable program with rules, open questions and the checks that prove the work is done, **before any code is written**.

<p align="center">
  <a href="https://juxt-lang.github.io/#/visuals"><img src="https://raw.githubusercontent.com/juxt-lang/juxt/main/assets/juxt-highlight.gif" alt="Launch film: six agents in tangled harnesses, then one 'use juxt' brings them into order." width="100%"></a>
</p>
<p align="center"><a href="https://juxt-lang.github.io/#/visuals"><b>▶ Watch the films</b></a> · a narrated guide and the hand-drawn launch film</p>

## Quick start


```sh
npx juxt-lang init
```

Then, in your agent (Codex, Claude Code, Cursor, Gemini CLI or any Agent Skills host):

```text
use juxt: add a cancel-order endpoint, refunds go back to the card
```

<p align="center"><img src="https://raw.githubusercontent.com/juxt-lang/juxt/main/assets/terminal.png" alt="Terminal: npx juxt-lang init, lint and digest" width="820"></p>
<p align="center"><sub>Illustrative session on a sample repository.</sub></p>

## What your agent does in Juxt mode

```text
Understood as
  objective   POST /orders/{id}/cancel, refund to the original card
  MUST        idempotent writes (a retried cancel never refunds twice)
  verify      cancel twice -> 1 refund · shipped order -> 409
  OPEN        cancel after shipping?  partial refunds?
```

1. **Compile.** The request becomes an objective, `MUST` / `MUST NOT` rules, a contract and runnable `verify` checks.
2. **Ask.** Anything the request did not decide becomes an `OPEN` question, asked before building, never guessed.
3. **Build and verify.** The agent uses the skills and tools your repo already has, then proves each check.
4. **Keep.** The program is saved as a plain-text `juxt/*.juxt` file, versioned and reviewable like code.

## Recipe: fix PHP2Shell in one command

PHP2Shell (CVE-2026-109618, CVE-2026-109619) lets attackers run code on PHP web servers without logging in. Working exploits are public and exploitation attempts have been reported ([PHP advisory](https://www.php.net/archive/2026.php#2026-10-21-5)). Updating PHP is the only fix. In your project folder or on the server, run:

```sh
npx juxt-lang php2shell
```

It finds your AI agent (Claude Code, Codex, Gemini CLI or Cursor), sets up Juxt and starts the fix. The agent shows what it found and asks before changing anything.

| Option | Use it to |
|---|---|
| `--agent codex` | Pick the agent: `claude`, `codex`, `gemini` or `cursor` |
| `--print` | Print the Juxt program to paste into any AI chat |
| `--no-launch` | Only write `juxt/php2shell.juxt` |

In an AI chat instead? Type: `Run npx juxt-lang php2shell --print and follow it`

What runs is [a Juxt program](https://github.com/juxt-lang/juxt/blob/main/examples/php2shell.juxt) with four agents in a pipeline, `scout -> planner -> approval -> patcher -> verifier`: read-only until you approve, then patch, restart and prove. Fixed versions and details: [juxt-lang.github.io/#/php2shell](https://juxt-lang.github.io/#/php2shell).

**Tested on a real project.** We ran it on a clone of the public [Snipe-IT](https://github.com/snipe/snipe-it) repository. The agent found three PHP images (Ubuntu 24.04 with `libapache2-mod-php8.3` from apt, Alpine 3.24 with `php84-apache2`, and a floating `php:8.3-fpm-alpine3.21`), plus compose and CI. After approval it made three small edits: `apt-get upgrade` in the Ubuntu build, `apk add --upgrade` in the Alpine build, and `PHP_VERSION=8.3.36` for the FPM image. With no Docker in the sandbox, it marked every image **unverified** rather than claiming a fix. The test also improved the program: version 0.4.3 inspects PHP installed from distro packages and every build file, and prints the receipt only when every check passes. Changes stayed in our sandbox; Juxt-lang is not affiliated with Snipe-IT.

## Commands

| Command | What it does | Needs |
|---|---|---|
| `juxt init [--host <h>] [--force]` | Install the Juxt skill and write `juxt/context.juxt` from your repo | bash, git |
| `juxt php2shell` | Fix PHP2Shell: sets up and starts your AI agent (`--agent`, `--print`, `--no-launch`) | Node |
| `juxt fix <recipe>` | Write a ready-made fix program into `juxt/`, e.g. `juxt fix php2shell` | Node |
| `juxt lint [files...]` | Check `.juxt` programs: header, blocks, constraints, verify checks, unresolved `OPEN` questions | Node |
| `juxt validate [files...]` | Validate the typed IR against the JSON Schema | Node |
| `juxt check [files...]` | Drift vs the repo: missing tests, unresolved types, dead paths | Node |
| `juxt ir <file> [--typed]` | Print a program's intermediate representation as JSON | Node |
| `juxt ask "<q>" [--file f]` | Answer from the program: cache → compiled → local model → frontier | Node |
| `juxt context "<q>"` | Show the compiled context and how much less it is than the whole repo | Node |
| `juxt receipts` · `juxt eval` | Measured token receipts; no-model answer rate and context reduction | Node |
| `juxt digest [1d]` | What changed in the repo, by area, with risks flagged | bash, git |
| `juxt facts [7d]` | Numbered, citable facts for status updates | bash, git |
| `juxt hosts` | The skills, commands, subagents and MCP servers the repo already has | bash |

`--host` takes `agents` (default), `claude`, `cursor`, `gemini`, a comma-separated list, or `all`.

## Keep AI-written code under control

Agents now write code faster than anyone can review it, so the intent — not the code — is the thing to keep. Juxt makes the program the source of truth and checks the code against it.

- **Typed IR + schema.** `juxt ir <file> --typed` emits a strict IR (typed contract, agents, typed handoffs, limits). `juxt validate` checks it against [`schema/juxt-ir.schema.json`](schema/juxt-ir.schema.json). Agents can pass typed data to each other instead of prose.
- **Drift check.** `juxt check` fails CI when a program and the repo disagree: an unresolved `OPEN` question, a `verify` test with no matching test, a contract type with no `interface`/`class`/schema, or a referenced path that doesn't exist.

```sh
npx juxt-lang check          # exits non-zero on drift — drop it in CI
```

## Fewer tokens per answer

Not every question needs a frontier model with the whole repo attached. `juxt ask` routes to the cheapest tier that can answer, and sends only the part of the repo a question touches:

```sh
npx juxt-lang ask "what are the MUST rules?"        # tier 1: answered from the IR, 0 tokens
npx juxt-lang context "build the endpoint"          # the briefing Juxt sends: program + touched types
npx juxt-lang eval                                  # routing check: which questions need no model
npx juxt-lang receipts                              # tiers, cache-hit rate, tokens saved
```

Whether this saves tokens on **real coding tasks** is measured separately, by an end-to-end benchmark with the agent's own reported usage: [bench/](https://github.com/juxt-lang/juxt/tree/main/bench). No results are claimed until it has been run.

Point it at a local open model (zero marginal cost) for the small stuff, and escalate only the hard parts:

```sh
ollama run qwen2.5-coder:7b
JUXT_MODEL_URL=http://localhost:11434 JUXT_MODEL=qwen2.5-coder:7b npx juxt-lang ask "how do I make this write idempotent?"
```

OpenAI-compatible endpoints (vLLM, LM Studio, llama.cpp, Together, OpenAI) work too via `JUXT_MODEL_URL` / `JUXT_API_KEY`. Token counts are `chars/4` estimates unless the model reports real ones. A predictor endpoint (`JUXT_PREDICTOR_URL`) can rank candidate plans before building — the slot a JEPA-style code model plugs into.

### In CI with the Action

```yaml
# .github/workflows/juxt.yml
on: [pull_request]
jobs:
  juxt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: juxt-lang/juxt@v1   # lint + validate + drift check
```

| Host | Skill folder |
|---|---|
| Codex and other Agent Skills tools | `.agents/skills/juxt` |
| Claude Code | `.claude/skills/juxt` |
| Cursor | `.cursor/skills/juxt` |
| Gemini CLI | `.gemini/skills/juxt` |

Prefer a short command? `npm i -g juxt-lang` installs `juxt`.

## Use it from code

```js
// JavaScript: npm i juxt-lang
const { lint, toIR } = require('juxt-lang');
const { prog, diags } = lint(require('fs').readFileSync('juxt/ratelimit.juxt', 'utf8'));
const ir = toIR(prog);   // { juxt, kind, blocks: { constraints: [{ level, rule }], ... } }
```

```python
# Python: call the CLI's JSON output
import json, subprocess
ir = json.loads(subprocess.run(["npx", "-y", "juxt-lang", "ir", "juxt/ratelimit.juxt"],
                               capture_output=True, text=True).stdout)
```

Rust and other languages work the same way through `npx juxt-lang ir`. Native Python and Rust packages are on the roadmap. Full language reference, compiler internals and diagrams: [juxt-lang.github.io/#/language](https://juxt-lang.github.io/#/language).

## In CI

`juxt lint` exits non-zero on errors, so a pull request with a malformed program, or a task with no verify check, fails the build:

```yaml
# .github/workflows/juxt.yml
on: [pull_request]
jobs:
  juxt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npx -y juxt-lang lint
```

## Claude Code plugin

For slash commands and an independent reviewer subagent, Claude Code users can install the full plugin:

```text
/plugin marketplace add juxt-lang/juxt
/plugin install juxt@juxt-lang
```

## Trust and privacy

- **Zero dependencies.** Plain Node plus bundled bash scripts you can read.
- **No network calls.** `digest`, `facts` and `hosts` read git and your files locally. Nothing is sent anywhere; model calls happen only in your agent, under its own settings.
- **Signed builds.** Releases are published from GitHub Actions with npm provenance, so you can verify each version was built from this repository.

## Contact

Created by **Amit N** (Amit Nilajkar).

| For | Write to |
|---|---|
| Partnerships, enterprise pilots, investment, licensing, press, the book | [amit.nilajkar@gmail.com](mailto:amit.nilajkar@gmail.com?subject=Juxt-lang%3A%20Partnership&body=Hi%20Amit%2C%0A%0AI%27m%20%5Bname%5D%2C%20%5Brole%5D%20at%20%5Bcompany%5D.%20We%27d%20like%20to%20talk%20about%20Juxt-lang.%0A%0AThanks%2C%0A) |
| Bugs, support questions and automated mail | [martian.coders.x@gmail.com](mailto:martian.coders.x@gmail.com?subject=Juxt-lang%3A%20Support%20question&body=Hi%2C%0A%0AWhat%20I%20ran%3A%0AWhat%20I%20expected%3A%0AWhat%20happened%3A%0Ajuxt-lang%20version%3A%0A%0AThanks%2C%0A) · or [open an issue](https://github.com/juxt-lang/juxt/issues) |
| Security issues | [Report privately on GitHub](https://github.com/juxt-lang/juxt/security/advisories/new) |

Or use the [contact page](https://juxt-lang.github.io/#/contact), which prefills the subject and message for you.

## License

Code: [Apache-2.0](https://github.com/juxt-lang/juxt/blob/main/LICENSE). Keep the bundled `NOTICE` file and its attribution when you redistribute. The Juxt name and jˣ logo are trademarks of Amit Nilajkar and are not licensed for reuse ([trademark policy](https://github.com/juxt-lang/juxt/blob/main/TRADEMARKS.md)).

<p align="center"><sub>jˣ · Many minds. One intent. · Created by Amit N</sub></p>
