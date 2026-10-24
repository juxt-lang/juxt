<p align="center"><img src="https://raw.githubusercontent.com/juxt-lang/juxt/main/assets/banner.png" alt="Juxt-lang: many minds, one intent" width="100%"></p>

# juxt-lang

The command-line tool for **Juxt-lang**, the language for directing AI agents. It adds Juxt mode to any coding agent, lints `.juxt` programs, and answers "what changed?" from git without a model call.

```sh
npx juxt-lang init              # add Juxt mode to this repo (Codex and other Agent Skills tools)
npx juxt-lang init --host all   # also Claude Code, Cursor and Gemini CLI skill folders
```

Then tell your agent: **"use juxt: add a cancel-order endpoint, refunds go back to the card"**. It compiles the request into a short program with rules, open questions and checks before writing any code.

## Commands

| Command | What it does |
|---|---|
| `juxt init [--host agents\|claude\|cursor\|gemini\|all] [--force]` | Install the Juxt Agent Skill and write `juxt/context.juxt` |
| `juxt lint [files...]` | Check `.juxt` programs (header, blocks, constraints, verify checks, unresolved OPEN questions) |
| `juxt ir <file>` | Print the program's intermediate representation as JSON |
| `juxt digest [1d]` | Repo changes by area, risks flagged (git only) |
| `juxt facts [7d]` | Numbered, citable facts for status updates (git only) |
| `juxt hosts` | Skills, commands, subagents and MCP servers the repo already has |

Install globally with `npm i -g juxt-lang` to use the short `juxt` command. `digest`, `facts`, `hosts` and `init` need `bash` and `git`. Node 18 or newer.

`juxt lint` exits non-zero on errors, so it can run in CI:

```yaml
- run: npx -y juxt-lang lint
```

## Claude Code

Claude Code users can install the full plugin (with the reviewer subagent and slash commands) instead:

```text
/plugin marketplace add juxt-lang/juxt
/plugin install juxt@juxt-lang
```

## Links

[Website](https://juxt-lang.github.io/juxt/) · [Repository](https://github.com/juxt-lang/juxt) · [Language summary](https://github.com/juxt-lang/juxt/blob/main/spec/LANGUAGE.md) · Apache-2.0
