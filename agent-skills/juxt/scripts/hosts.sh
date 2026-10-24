#!/usr/bin/env bash
# juxt hosts: discover the built-in capabilities this repo and user expose to agents,
# so Juxt can compile steps to native commands, skills and subagents instead of generic prompts.
#   hosts.sh [--brief]
# Note: built-in commands and plugin-provided skills are not files in the repo; the agent
# also sees those in its own skill and command list and should include them.
set -u
brief=0; [ "${1:-}" = "--brief" ] && brief=1
root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
lim=50; [ $brief = 1 ] && lim=12

desc_of() { awk 'BEGIN{f=0} /^---[[:space:]]*$/{f++; next} f==1 && /^description:/ {sub(/^description:[[:space:]]*/,""); gsub(/^"|"$/,""); print substr($0,1,110); exit}' "$1" 2>/dev/null; }

list_skills() { # dir label
  local d="$1" label="$2" c=0
  [ -d "$d" ] || return 0
  for f in "$d"/*/SKILL.md; do [ -f "$f" ] || continue; c=$((c+1)); [ $c -gt $lim ] && break
    printf '  %-10s /%s — %s\n' "$label" "$(basename "$(dirname "$f")")" "$(desc_of "$f")"; done
}
list_cmds() {
  local d="$1" label="$2" c=0
  [ -d "$d" ] || return 0
  find "$d" -name '*.md' 2>/dev/null | head -$lim | while read -r f; do rel="${f#$d/}"; rel="${rel%.md}"; printf '  %-10s /%s — %s\n' "$label" "$(echo "$rel" | tr '/' ':')" "$(desc_of "$f")"; done
}
list_agents() {
  local d="$1" label="$2"
  [ -d "$d" ] || return 0
  find "$d" -name '*.md' 2>/dev/null | head -$lim | while read -r f; do printf '  %-10s @%s — %s\n' "$label" "$(basename "${f%.md}")" "$(desc_of "$f")"; done
}

echo "Host capabilities (files discovered by juxt; plus whatever built-ins your agent lists)"
echo "Skills and commands"
list_skills "$root/.claude/skills" project
list_cmds   "$root/.claude/commands" project
list_skills "$root/.agents/skills" agents
list_skills "$HOME/.claude/skills" user
list_cmds   "$HOME/.claude/commands" user
list_skills "$HOME/.agents/skills" user-agt
echo "Subagents"
list_agents "$root/.claude/agents" project
list_agents "$HOME/.claude/agents" user
echo "MCP servers"
for m in "$root/.mcp.json"; do
  [ -f "$m" ] || continue
  python3 - "$m" <<'PY' 2>/dev/null || grep -oE '"[A-Za-z0-9_.-]+"[[:space:]]*:[[:space:]]*\{' "$m" | sed 's/"//g; s/[[:space:]]*:.*//' | grep -v mcpServers | sed 's/^/  project    /'
import json,sys
d=json.load(open(sys.argv[1])).get("mcpServers",{})
for k,v in d.items(): print("  project    %s — %s" % (k, v.get("command") or v.get("url") or v.get("type","")))
PY
done
echo "Instruction files"
for f in CLAUDE.md AGENTS.md .github/copilot-instructions.md GEMINI.md .cursorrules; do
  [ -f "$root/$f" ] && printf '  %-10s %s (%s lines)\n' found "$f" "$(wc -l < "$root/$f" | tr -d ' ')"
done
echo "Juxt programs"
if ls "$root"/juxt/*.juxt >/dev/null 2>&1; then ls "$root"/juxt/*.juxt | head -$lim | sed "s#^$root/#  #"; else echo "  none yet (run /juxt:init)"; fi
mkdir -p "$root/.juxt" 2>/dev/null && date -u +%Y-%m-%dT%H:%M:%SZ > "$root/.juxt/hosts.updated" 2>/dev/null || true
