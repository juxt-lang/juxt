---
name: digest
description: Answer "what changed in the repo" (since yesterday, this week, a date) from git, grouped by area, with risks flagged, without reading diffs. Cached per commit so repeat questions cost nothing. Use for questions like "what changed since yesterday?", "what did we ship this week?", "catch me up on the repo".
argument-hint: "[since: 1d | 12h | 2w | yesterday | 2026-10-01]"
allowed-tools: Bash(bash *) Bash(git *)
effort: low
---

The digest below was computed by git before this turn. It used no model tokens.

!`bash "${CLAUDE_PLUGIN_ROOT}/scripts/digest.sh" "$ARGUMENTS" 2>&1 || true`

Present the digest to the user as it is, in a code block, then add at most two sentences: the most important flag, if any, and one suggested follow-up. Do not open diffs or read files unless the user asks a follow-up question.

For a follow-up such as "why did billing change?", read only the commits and files for that area (`git log --since=... -- <paths>` and the relevant diff), not the whole range.
