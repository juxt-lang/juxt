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

## Commands

| Command | What it does | Needs |
|---|---|---|
| `juxt init [--host <h>] [--force]` | Install the Juxt skill and write `juxt/context.juxt` from your repo | bash, git |
| `juxt lint [files...]` | Check `.juxt` programs: header, blocks, constraints, verify checks, unresolved `OPEN` questions | Node |
| `juxt ir <file>` | Print a program's intermediate representation as JSON, for tooling | Node |
| `juxt digest [1d]` | What changed in the repo, by area, with risks flagged | bash, git |
| `juxt facts [7d]` | Numbered, citable facts for status updates | bash, git |
| `juxt hosts` | The skills, commands, subagents and MCP servers the repo already has | bash |

`--host` takes `agents` (default), `claude`, `cursor`, `gemini`, a comma-separated list, or `all`.

| Host | Skill folder |
|---|---|
| Codex and other Agent Skills tools | `.agents/skills/juxt` |
| Claude Code | `.claude/skills/juxt` |
| Cursor | `.cursor/skills/juxt` |
| Gemini CLI | `.gemini/skills/juxt` |

Prefer a short command? `npm i -g juxt-lang` installs `juxt`.

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

## License

Code: [Apache-2.0](https://github.com/juxt-lang/juxt/blob/main/LICENSE). Keep the bundled `NOTICE` file and its attribution when you redistribute. The Juxt name and jˣ logo are trademarks of Amit Nilajkar and are not licensed for reuse ([trademark policy](https://github.com/juxt-lang/juxt/blob/main/TRADEMARKS.md)).

<p align="center"><sub>jˣ · Many minds. One intent. · Created by Amit N</sub></p>
