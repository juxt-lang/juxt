---
name: status
description: Draft status updates for different audiences (developer, team standup, director, exec) from numbered git facts, where every sentence cites a fact. Use for "write my weekly status", "standup update", "status for leadership". Drafts only; never sends anything.
argument-hint: "[since: 7d | 1d | 2w] [audience: team | director | exec | all]"
allowed-tools: Bash(bash *) Bash(git *) Bash(cat *)
effort: low
---

Facts computed from git before this turn (no model tokens):

!`bash "${CLAUDE_PLUGIN_ROOT}/scripts/facts.sh" "$0" 2>&1 || true`

Status rules from the project, if any:

!`cat juxt/status.juxt 2>/dev/null || echo "(no juxt/status.juxt; default: Green unless a fact shows a revert, an open question older than 2 days, or a missing test)"`

Write the update for the audience in `$1` (default: team). Rules:

1. Every sentence that states something must end with the fact numbers it relies on, like [F2, F4]. If no fact supports a sentence, leave the sentence out.
2. Never invent numbers, dates, names or outcomes. If something the audience needs is missing (tickets, deploys, incidents), add a line "Missing: ..." instead of guessing.
3. Set Red, Amber or Green using the rules above and say which fact triggered it.
4. Length by audience: developer, a precise list; team, 3 to 5 bullets; director, 4 sentences with risks and owners; exec, 3 sentences: status colour, outcome, decision needed.
5. If the audience is `all`, write all four, shortest last.
6. End with: "Draft only. Review before sending."

Ticket, deploy and incident facts appear only when the project connects a tracker or CI (for example through an MCP server). If one is connected, you may add facts from it, numbered after the git facts, and cite them the same way.
