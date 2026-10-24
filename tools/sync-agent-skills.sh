#!/usr/bin/env bash
# Keep the portable Agent Skills copy in sync with the Claude Code plugin.
set -eu
root="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$root/agent-skills/juxt/scripts" "$root/agent-skills/juxt/reference"
cp "$root"/plugins/juxt/scripts/*.sh "$root/agent-skills/juxt/scripts/"
cp "$root"/plugins/juxt/skills/use/reference/*.md "$root/agent-skills/juxt/reference/"
chmod +x "$root"/agent-skills/juxt/scripts/*.sh "$root"/plugins/juxt/scripts/*.sh
echo "synced agent-skills/juxt from plugins/juxt"
