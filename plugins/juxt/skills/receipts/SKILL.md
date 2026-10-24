---
name: receipts
description: Show Juxt savings receipts for this repo, meaning answers produced by git, cache or compiled programs instead of a model call, plus Juxt mode questions and checks. Use for "how much has juxt saved?" or "show receipts".
argument-hint: "[days, default 30]"
allowed-tools: Bash(bash *)
effort: low
disable-model-invocation: true
---

!`bash "${CLAUDE_PLUGIN_ROOT}/scripts/receipt.sh" show "$ARGUMENTS" 2>&1 || true`

Show the receipt above in a code block. Then say in one sentence what the numbers mean: token figures are estimates of raw material (git logs and diffs) that was not sent to a model, not billed savings. For measured savings, point to `claude plugin eval`, which runs each case with and without the plugin.
