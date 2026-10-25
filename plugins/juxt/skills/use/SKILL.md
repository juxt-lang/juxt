---
name: use
description: Juxt mode. Use when the user says "use juxt", "with juxt" or "/juxt", or asks for a feature, fix, migration or report and wants it done carefully. Compiles the request into a short Juxt program (objective, rules, open questions, checks), asks the open questions before writing code, builds with the host's native tools, verifies with a fresh reviewer, and saves the program for reuse.
when_to_use: "use juxt: add a cancel-order endpoint", "with juxt, migrate the users table", "juxt this: weekly churn report". Not for one-line edits, renames or quick questions.
argument-hint: "[what you want built]"
allowed-tools: Bash(bash *) Bash(git *) Bash(ls *) Bash(cat *)
---

# Juxt mode

You compile the user's request into a Juxt program, resolve its gaps with the user, then execute it. The program is the contract for the whole task.

Request: $ARGUMENTS

## Project context (loaded before you start)

Shared context:
!`cat juxt/context.juxt 2>/dev/null || echo "(no juxt/context.juxt yet; suggest /juxt:init after this task)"`

Existing Juxt programs:
!`ls juxt/*.juxt 2>/dev/null || echo "(none)"`

Host capabilities discovered in this repo and user folders:
!`bash "${CLAUDE_PLUGIN_ROOT}/scripts/hosts.sh" --brief 2>/dev/null || true`

## Step 0 · Decide whether Juxt mode is worth it

Skip Juxt mode and just do the task, without mentioning Juxt, when the request is a one-line edit, a rename, a formatting change, or a question you can answer directly. Juxt mode costs a few thousand tokens; spend them only where a wrong guess would cost more.

## Step 1 · Compile the request

Read the request and the context above. Write the program in this shape, keeping each value to one line (see [reference/language.md](reference/language.md) for all keywords and [reference/compile.md](reference/compile.md) for how to fill each field):

```
objective:    the outcome and how we will know it is done
constraints:  MUST / MUST NOT / SHOULD, including rules inherited from context.juxt
contract:     in / out / invariant / on_error, when there is an interface
pattern:      only if one clearly applies (saga, idempotent, expand-contract, ...)
verify:       concrete checks that can run: tests, commands, review
OPEN:         every decision the request did not make and you would otherwise guess
```

If an existing program in `juxt/` covers similar work, start from it and say so.

## Step 2 · Show it and ask the OPEN questions

Show the user an "Understood as" block of at most 8 lines, then ask the OPEN questions (at most 3, the ones that change the code). Use the AskUserQuestion tool when it is available, with concrete options. Do not write or edit code before the user answers. If there are no OPEN questions, say "No open questions" and continue.

## Step 3 · Save the program

Write the final program to `juxt/<short-name>.juxt`, starting with `@juxt 0.7`, with the answered questions folded into constraints. Keep it under 40 lines.

## Step 4 · Map steps to the host's native capabilities

Before building, list in one line each how you will run the steps, preferring what the host already provides over generic work:
- planning, review, testing, security or commit steps: use a matching skill, slash command or subagent from the capabilities list above, or from your own built-in list, when one exists;
- review: use the `juxt:reviewer` subagent when no better native reviewer exists;
- tools: prefer connected MCP servers for tickets, docs or data.
Write `native:` or `generic:` before each step so the user can see the choice.

## Step 5 · Build within the rules

Implement only what the objective needs. Respect every MUST and MUST NOT. Do not widen scope; if something outside scope is needed, stop and ask. Run the checks in `verify` with real commands and fix failures.

## Step 6 · Independent review

Hand the reviewer the program file path and the list of changed files (from `git status --short` and `git diff --stat`). The reviewer must not have seen your reasoning. Fix every finding that breaks a MUST, then re-run verify. Stop after 3 review loops and report what is left.

## Step 7 · Return

Reply with:
1. What changed (files and a one-line summary each).
2. Checks run and results.
3. Decision log, at most 5 lines, including any SHOULD you did not follow and why.
4. Risks or follow-ups.
5. The saved program path.

Then record a receipt:
```
bash "${CLAUDE_PLUGIN_ROOT}/scripts/receipt.sh" add use T3 0 open=<number of OPEN questions asked> checks=<number of verify checks> reused=<yes|no> program=<path>
```

## Rules that always apply

- Never guess past an OPEN item. Ask.
- Never claim a check passed unless you ran it and saw it pass.
- Keep the "Understood as" block short. If it reads like paperwork, it is too long.
