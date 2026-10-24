<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-mark-dark.svg">
    <img src="assets/logo-mark.svg" alt="juxt-lang logo: j to the power of x" width="96">
  </picture>
</p>

# Juxt-lang

**Say "use juxt" to your coding agent. It asks before it guesses.**

Juxt is a language for directing AI agents: many models side by side, one intent. You never have to learn it: add two words to a normal request and the agent compiles it into a short program (the objective, the rules, the questions it would otherwise guess, and the checks that prove it is done) before writing any code.

```
you › use juxt: add a cancel-order endpoint, refunds go back to the card

Understood as
  objective   POST /orders/{id}/cancel, refund to the original card
  MUST        idempotent writes (a retried cancel never refunds twice)
  verify      cancel twice -> 1 refund · shipped order -> 409
  OPEN        cancel after shipping?  partial refunds?
```

It also answers the questions every team repeats, from git instead of from a model:

- `/juxt:digest` — what changed since yesterday, grouped by area, risks flagged. Repeat asks are served from cache.
- `/juxt:status` — standup, director or exec updates where every sentence cites a numbered fact.
- `/juxt:hosts` — the skills, commands, subagents and MCP servers your agent already has, so Juxt uses them instead of generic prompts.
- `/juxt:receipts` — what was answered without a model call.

## Install

### Claude Code

```
/plugin marketplace add juxt-lang/juxt
/plugin install juxt@juxt-lang
```

Or try it for one session from a clone: `claude --plugin-dir ./plugins/juxt`

Then, in any repo: `/juxt:init`, `/juxt:digest`, and `use juxt: <a small feature>`.

### Codex, Cursor, Gemini CLI and other Agent Skills tools

Copy `agent-skills/juxt/` into your repo's skills folder, for example `.agents/skills/juxt/` for Codex, and say "use juxt" as usual. It follows the open Agent Skills (`SKILL.md`) format.

## Commands

| Command | What it does | Model use |
|---|---|---|
| "use juxt: …" or `/juxt:use` | Compile, ask OPEN questions, build, verify with a fresh reviewer, save `juxt/*.juxt` | Full, only where it matters |
| `/juxt:digest [1d]` | Repo changes by area with flags | None for the digest; cached per commit |
| `/juxt:status [7d] [team\|director\|exec\|all]` | Cited status drafts; never sends | Small: writing only |
| `/juxt:hosts` | Map Juxt steps to native skills, commands and subagents | Small |
| `/juxt:init` | Create `juxt/context.juxt` from the repo | None for detection |
| `/juxt:receipts [30]` | Savings receipts | None |

## Honest numbers

Receipts record what Juxt answered from git, cache or compiled programs, with token figures **estimated** as bytes ÷ 4 of the raw material not sent to a model. They are not billed savings.

For measured results, run the eval suite, which runs every case with and without the plugin and reports the difference:

```
cd plugins/juxt
claude plugin eval .
```

Evals call the model on your account and count toward your usage.

## Layout

```
assets/                      Logo (jˣ) and favicon
plugins/juxt/                Claude Code plugin (skills, reviewer subagent, scripts, evals)
agent-skills/juxt/           Portable Agent Skills version for Codex and others
examples/                    Example .juxt programs
spec/LANGUAGE.md             Language summary; the full spec is The Juxt Book
docs/                        The website, published with GitHub Pages
.claude-plugin/              Marketplace file
```

## Website

The site lives in `docs/` and is served by GitHub Pages at https://juxt-lang.github.io/juxt/ (Settings → Pages → Deploy from a branch → `main`, folder `/docs`).

## Status

Early preview, version 0.1.0. Juxt mode, digest, status, hosts, init and receipts work today. The CLI (`juxt lint`, `juxt render --ir`), the gateway for answer tiers, and fleet features are on the roadmap.

## License

Apache-2.0 (add the license file when publishing). Contributions use the Developer Certificate of Origin; see CONTRIBUTING.md.
