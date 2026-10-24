---
name: juxt
description: Juxt mode for any agent that supports Agent Skills (Codex, Cursor, Gemini CLI, Claude Code and others). Use when the user says "use juxt" or asks for a feature, fix or migration done carefully; also for "what changed in the repo" and "write my status update". Compiles the request into a short program with rules, open questions and checks, asks before guessing, and uses git-computed digests and facts instead of reading diffs.
license: Apache-2.0
compatibility: Needs bash and git. python3 is optional.
metadata:
  version: "0.1.0"
  homepage: "https://github.com/juxt-lang/juxt"
---

# Juxt

Three jobs. Pick the one that matches the request.

## 1. "use juxt: <request>" — Juxt mode

Skip this and just do the task when it is a one-line edit, a rename or a quick question.

1. Read `juxt/context.juxt` if it exists, list `juxt/*.juxt`, and run `bash scripts/hosts.sh --brief` (paths are relative to this skill's folder) to see which skills, commands, subagents and MCP servers the host already provides. Also consider the built-in commands and skills you can see in your own tool list.
2. Compile the request into: objective, constraints (MUST, MUST NOT, SHOULD, including inherited rules), contract, pattern (only if one clearly applies), verify (runnable checks), OPEN (decisions the request did not make). See `reference/compile.md`.
3. Show an "Understood as" block of at most 8 lines, then ask the OPEN questions (at most 3). Do not write code before the user answers.
4. Save the program to `juxt/<short-name>.juxt`, starting with `@juxt 3.4`.
5. For each step (plan, implement, test, review, commit), prefer the host's native capability; write `native:` or `generic:` before each step.
6. Build within the rules, run the verify checks for real, then have a reviewer that has not seen your reasoning check the change against every MUST. Fix and re-verify, at most 3 loops.
7. Reply with: changes, checks and results, a decision log of at most 5 lines, risks, and the program path. Then run `bash scripts/receipt.sh add use T3 0 open=<n> checks=<n> reused=<yes|no>`.

## 2. "what changed?" — digest

Run `bash scripts/digest.sh <since>` (since: 1d, 12h, 2w, yesterday or a date). Show the output as it is, then at most two sentences: the most important flag and one follow-up. Do not read diffs unless asked. Repeat questions are served from cache.

## 3. "status update" — cited status

Run `bash scripts/facts.sh <since>` (default 7d). Write the update for the requested audience (developer, team, director or exec). Every sentence ends with the fact numbers it uses, like [F2]. Leave out anything no fact supports, and list what is missing instead. Set Red, Amber or Green from the facts and say which fact triggered it. End with "Draft only. Review before sending."

## Receipts

`bash scripts/receipt.sh show` summarises what was answered without a model. Token figures are estimates (bytes / 4) of raw material not sent, not billed savings.
