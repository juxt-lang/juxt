<p align="center">
  <a href="https://juxt-lang.github.io/"><img src="assets/banner.png" alt="Juxt-lang: many minds, one intent. The language for directing AI agents." width="100%"></a>
</p>

<p align="center">
  <a href="https://github.com/juxt-lang/juxt/actions/workflows/validate.yml"><img alt="Validate" src="https://github.com/juxt-lang/juxt/actions/workflows/validate.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="License: Apache-2.0" src="https://img.shields.io/badge/license-Apache--2.0-F7DF1E"></a>
  <img alt="Version 0.1.0" src="https://img.shields.io/badge/version-0.1.0-111111">
  <img alt="Claude Code plugin" src="https://img.shields.io/badge/Claude%20Code-plugin-D97757">
  <img alt="Agent Skills" src="https://img.shields.io/badge/Agent%20Skills-SKILL.md-5FD3A4">
</p>

<p align="center"><a href="https://juxt-lang.github.io/#/contact"><b>Created by Amit N</b></a> · <a href="https://juxt-lang.github.io/#/contact">Contact</a></p>

<p align="center">
  <a href="https://juxt-lang.github.io/"><b>Website</b></a> ·
  <a href="#quick-start"><b>Quick start</b></a> ·
  <a href="spec/LANGUAGE.md"><b>Language</b></a> ·
  <a href="examples/"><b>Examples</b></a> ·
  <a href="#roadmap"><b>Roadmap</b></a> ·
  <a href="https://github.com/juxt-lang/juxt/discussions"><b>Discussions</b></a>
</p>

---

**Juxt-lang is a language for directing AI agents.** You put many models side by side, give them one intent, and get the full strength of each, without the guessing.

You never have to learn it. Add two words to a normal request and your coding agent compiles it into a short, reviewable program before it writes any code. The program holds the objective, the rules, the questions it would otherwise guess, and the checks that prove the work is done.

```text
you › use juxt: add a cancel-order endpoint, refunds go back to the card

Understood as
  objective   POST /orders/{id}/cancel, refund to the original card
  MUST        idempotent writes (a retried cancel never refunds twice)
  verify      cancel twice -> 1 refund · shipped order -> 409
  OPEN        cancel after shipping?  partial refunds?
```

## Security update: fix PHP2Shell with Juxt

PHP2Shell (CVE-2026-109618, CVE-2026-109619) lets attackers run code on PHP web servers without logging in, and it is being exploited now. Updating PHP is the only fix. This Juxt program has your AI agent find every PHP that serves your site, ask before changing anything, update, restart and prove the fix:

**Paste it into your AI.** The fix is a Juxt program that carries its own instructions, so it runs in Claude Code, Codex, Cursor, Gemini CLI or any agent that can run commands, with nothing to install. Copy [php2shell.juxt](https://github.com/juxt-lang/juxt/blob/main/examples/php2shell.juxt) and paste it in. It runs four agents in a pipeline:

```text
topology: pipeline(scout -> planner -> approval -> patcher -> verifier)
  scout    => planner   { surfaces[], cli_version, web_sapi_version, exposure }
  planner  => you       { plan[], commands[], risk, downtime }
  you      => patcher   { approved_commands[] }
  patcher  => verifier  { changed[], restarted[] }
policy: read-only until the plan is approved
```

**Or run it from a terminal** (Node 18+):

| Agent | Commands |
|---|---|
| Claude Code | `npx -y juxt-lang init --host claude && npx -y juxt-lang fix php2shell && claude "use juxt: run juxt/php2shell.juxt"` |
| Codex | `npx -y juxt-lang init && npx -y juxt-lang fix php2shell && codex "use juxt: run juxt/php2shell.juxt"` |
| Gemini CLI | `npx -y juxt-lang init --host gemini && npx -y juxt-lang fix php2shell && gemini -i "use juxt: run juxt/php2shell.juxt"` |
| Cursor | `npx -y juxt-lang init --host cursor && npx -y juxt-lang fix php2shell`, then in the agent chat: `use juxt: run juxt/php2shell.juxt` |
| No Node on the server | `curl -fsSLo php2shell.juxt https://raw.githubusercontent.com/juxt-lang/juxt/main/examples/php2shell.juxt`, then paste it into your agent |

Run these from your project folder, or on the server itself. The agent always shows what it found and asks before changing anything. Details and fixed versions: [juxt-lang.github.io/#/php2shell](https://juxt-lang.github.io/#/php2shell).

**Patching many servers, or no in-house team?** The creator of Juxt can help roll the fix out across fleets, CI images and Kubernetes: [email Amit](mailto:amit.nilajkar@gmail.com?subject=PHP2Shell%3A%20help%20patching%20our%20servers) or see the [contact page](https://juxt-lang.github.io/#/contact). If this helped, [star the repo](https://github.com/juxt-lang/juxt).

## Why Juxt


| The problem with agents today | What Juxt does |
|---|---|
| Agents guess at unclear requirements and you find out in review | Unclear points become `OPEN` questions, asked **before** any code is written |
| House rules live in people's heads or in long prompts | Rules are `MUST` / `MUST NOT` lines that outrank the objective and are checked by a fresh reviewer |
| "Done" means "it compiled" | Every program carries `verify` checks that must pass |
| Each tool (Claude Code, Codex, CI) needs its own prompting | One program, compiled to each harness's native skills, commands and subagents |
| The same status questions are re-asked of a model every day | Digests and status updates come from git, with citations; repeat asks are served from cache |
| Nobody can audit why an agent did what it did | Programs are plain-text `.juxt` files in your repo, versioned and reviewable like code |

## How it works

```mermaid
flowchart LR
  A["Plain request<br/>'use juxt: …'"] --> B["Compile<br/>objective · rules · contract"]
  B --> C{"OPEN<br/>questions?"}
  C -- yes --> D["Ask you"] --> B
  C -- no --> E["Build<br/>native skills and subagents"]
  E --> F["Verify<br/>tests + fresh reviewer vs every MUST"]
  F --> G["juxt/*.juxt<br/>saved in git"]
```

A compiled program is short and readable ([examples/cancel-order.juxt](examples/cancel-order.juxt)):

```text
@juxt 3.4
objective:   POST /orders/{id}/cancel cancels the order and refunds the original card
constraints:
  MUST     idempotent writes (payments domain rule)
  MUST NOT change the public order schema
  SHOULD   reuse payments.refund()
pattern:     saga: cancel -> refund, compensate on failure
verify:
  test "cancel twice -> one refund"
  test "shipped order -> 409"
  review against every MUST
```

## Quick start

### Claude Code

```text
/plugin marketplace add juxt-lang/juxt
/plugin install juxt@juxt-lang
```

Then, in any repo:

```text
/juxt:init
use juxt: <a small feature>
```

To try it for one session from a clone, run `claude --plugin-dir ./plugins/juxt`.

### Codex, Cursor, Gemini CLI and other Agent Skills tools

```sh
npx juxt-lang init              # installs the skill in .agents/skills/juxt and writes juxt/context.juxt
npx juxt-lang init --host all   # also .claude, .cursor and .gemini skill folders
```

Then say "use juxt" as usual. The skill follows the open Agent Skills (`SKILL.md`) format, so you can also copy `agent-skills/juxt/` by hand.

### CLI

```sh
npx juxt-lang lint              # check juxt/*.juxt programs (non-zero exit on errors, CI-friendly)
npx juxt-lang ir <file.juxt>    # intermediate representation as JSON
npx juxt-lang digest 1d         # what changed, by area, from git only
```

See [packages/cli](packages/cli) for every command.

## Commands

| Command | What it does | Model use |
|---|---|---|
| "use juxt: …" or `/juxt:use` | Compile, ask OPEN questions, build, verify with a fresh reviewer, save `juxt/*.juxt` | Full, only where it matters |
| `/juxt:digest [1d]` | Repo changes by area, with risks flagged | None for the digest; cached per commit |
| `/juxt:status [7d] [team\|director\|exec\|all]` | Status drafts where every sentence cites a numbered fact; never sends | Small: writing only |
| `/juxt:hosts` | Map Juxt steps to the skills, commands, subagents and MCP servers you already have | Small |
| `/juxt:init` | Create `juxt/context.juxt` from the repo | None for detection |
| `/juxt:receipts [30]` | What was answered without a model call | None |

## Built for teams that ship

- **Governance in plain text.** Rules, contracts and checks are code-reviewed files, not hidden prompts. Policy is enforced by the harness, not only the prompt.
- **Independent verification.** A separate reviewer subagent checks the result against every `MUST` before work is called done.
- **No lock-in.** The same program runs in Claude Code, Codex and any Agent Skills host, and prefers each host's native tools.
- **Low footprint.** Scripts are bash and git only, with no runtime service and no data leaving your machine beyond your agent's normal model calls.
- **Honest numbers.** Receipts are labelled as estimates (bytes ÷ 4 of material not sent to a model), not billed savings. For measured results, run the eval suite, which compares every case with and without the plugin:

  ```text
  cd plugins/juxt && claude plugin eval .
  ```

  Evals call the model on your account and count toward your usage.

## Repository layout

```text
.claude-plugin/       Marketplace file
plugins/juxt/         Claude Code plugin: skills, reviewer subagent, scripts, evals
agent-skills/juxt/    Portable Agent Skills version for Codex and others
examples/             Example .juxt programs
spec/LANGUAGE.md      Language summary (the full specification is The Juxt Book)
packages/cli/          The juxt-lang npm CLI
docs/                 Redirect to the website (source: juxt-lang/juxt-lang.github.io)
assets/               Logo, banner and brand files
```

## Roadmap

| Status | Item |
|---|---|
| ✅ 0.1 | Juxt mode, digest, cited status, host discovery, init, receipts, reviewer subagent, evals |
| ✅ 0.1 | `juxt-lang` CLI on npm: `init`, `lint`, `ir`, `digest`, `facts`, `hosts` |
| 🔜 | Gateway for answer tiers (recall → compiled → small model → frontier) |
| 🧭 | Team blocks: typed handoffs, `remote agent` over A2A, `tools` over MCP |
| 🧭 | Enterprise blocks: triggers, fleets and rollouts, architecture fitness checks |

Ideas and RFCs are welcome in [Discussions](https://github.com/juxt-lang/juxt/discussions).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Language changes go through a short RFC. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md), and report security issues privately as described in [SECURITY.md](SECURITY.md).

## Contact

Created by **Amit N** (Amit Nilajkar).

| For | Write to |
|---|---|
| Partnerships, enterprise pilots, investment, licensing, press, the book | [amit.nilajkar@gmail.com](mailto:amit.nilajkar@gmail.com?subject=Juxt-lang%3A%20Partnership&body=Hi%20Amit%2C%0A%0AI%27m%20%5Bname%5D%2C%20%5Brole%5D%20at%20%5Bcompany%5D.%20We%27d%20like%20to%20talk%20about%20Juxt-lang.%0A%0AThanks%2C%0A) |
| Bugs, support questions and automated mail | [martian.coders.x@gmail.com](mailto:martian.coders.x@gmail.com?subject=Juxt-lang%3A%20Support%20question&body=Hi%2C%0A%0AWhat%20I%20ran%3A%0AWhat%20I%20expected%3A%0AWhat%20happened%3A%0Ajuxt-lang%20version%3A%0A%0AThanks%2C%0A) · or [open an issue](https://github.com/juxt-lang/juxt/issues) |
| Security issues | [Report privately on GitHub](https://github.com/juxt-lang/juxt/security/advisories/new) |

Or use the [contact page](https://juxt-lang.github.io/#/contact), which prefills the subject and message for you.

## License

The **code** is licensed under the [Apache License 2.0](LICENSE). Redistributions must keep the [NOTICE](NOTICE) file and its attribution: *Juxt-lang, created by Amit N (Amit Nilajkar)*.

The **Juxt name, jˣ logo and brand** are trademarks and are not licensed for reuse; forks must use their own name and logo ([TRADEMARKS.md](TRADEMARKS.md)). The **website, brand assets and The Juxt Book** are © Amit Nilajkar, all rights reserved ([LICENSE-CONTENT.md](LICENSE-CONTENT.md)).

<p align="center"><img src="assets/logo-mark.svg" alt="jˣ" width="40"><br><sub>Many minds. One intent. · Created by Amit N</sub></p>
