---
name: hosts
description: Show the built-in capabilities available to agents in this repo (skills, slash commands, subagents, MCP servers, instruction files) and how Juxt steps map onto them, so work uses the host's native expertise instead of generic prompts. Use for "what can the agent use here?" or before planning a large task.
allowed-tools: Bash(bash *)
effort: low
---

Discovered from files in this repo and the user's folders:

!`bash "${CLAUDE_PLUGIN_ROOT}/scripts/hosts.sh" 2>&1 || true`

Add the built-in commands, plugin skills and subagents that you can see in your own available list but that are not files above. Then show one table:

| Juxt step | Native capability to use | Why |
|---|---|---|

Cover these steps: plan, implement, test, review, security check, commit or PR, docs, status. Mark a step "generic" only when no native capability fits. Keep it under 15 rows. Do not invent capabilities you cannot see.
