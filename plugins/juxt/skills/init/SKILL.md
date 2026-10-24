---
name: init
description: Set up Juxt in this repo by creating juxt/context.juxt from the project's own files (stack, layout, test command) and offering to point CLAUDE.md and AGENTS.md at it.
allowed-tools: Bash(bash *)
disable-model-invocation: true
---

!`bash "${CLAUDE_PLUGIN_ROOT}/scripts/init.sh" 2>&1 || true`

1. Show the user what was created, and ask them to fix anything wrong in it, especially lines marked OPEN.
2. Ask, with the AskUserQuestion tool if available, whether to add this one line to CLAUDE.md and AGENTS.md (create AGENTS.md only if the user agrees):
   `Shared project context and rules are in juxt/context.juxt. When the user says "use juxt", compile the request into a Juxt program before coding.`
3. Ask whether to add `.juxt/` to .gitignore (it holds the local cache and receipts).
4. Finish with three things to try: `/juxt:digest`, `/juxt:status`, and "use juxt: <a small feature>".
