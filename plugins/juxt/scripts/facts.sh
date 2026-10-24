#!/usr/bin/env bash
# juxt facts: numbered, citable facts for status updates, built from git only.
#   facts.sh [since]   since: 7d (default), 1d, 2w, or any git date
set -u
here="$(cd "$(dirname "$0")" && pwd)"
raw="${1:-7d}"
case "$raw" in
  *[0-9]d) n="${raw%d}"; since="$n day$([ "$n" = 1 ] || echo s) ago";; *[0-9]h) n="${raw%h}"; since="$n hour$([ "$n" = 1 ] || echo s) ago";; *[0-9]w) n="${raw%w}"; since="$n week$([ "$n" = 1 ] || echo s) ago";; week) since="7 days ago";; *) since="$raw";;
esac
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "juxt facts: not a git repository."; exit 0; }
cd "$(git rev-parse --show-toplevel)" || exit 0

{
  git log --since="$since" --merges --pretty='merged: %s (%h, %ad)' --date=short | head -12
  tags=$(git log --since="$since" --simplify-by-decoration --decorate=short --pretty='%d' | grep -o 'tag: [^,)]*' | sed 's/tag: //' | head -5 | tr '\n' ' ')
  [ -n "$tags" ] && echo "releases tagged: $tags"
  commits=$(git log --since="$since" --no-merges --oneline | wc -l | tr -d ' ')
  authors=$(git log --since="$since" --no-merges --pretty='%an' | sort -u | wc -l | tr -d ' ')
  [ "$commits" = 1 ] && cw=commit || cw=commits; [ "$authors" = 1 ] && pw=person || pw=people; echo "$commits $cw by $authors $pw"
  areas=$(git log --since="$since" --name-only --pretty=format: | sed '/^$/d' | sort -u | bash "$here/areas.sh" | awk -F'\t' '{c[$1]++} END {for (a in c) print c[a] " " a}' | sort -rn | head -5 | awk '{printf "%s (%s files); ", $2, $1}' | sed 's/; $//')
  [ -n "$areas" ] && echo "most changed areas: $areas"
  git log --since="$since" --no-merges --pretty='%s (%h)' | grep -iE '^(feat|feature|add)' | head -5 | sed -E 's/^(feat|feature)(\([^)]*\))?:[[:space:]]*//I; s/^/feature: /'
  fixes=$(git log --since="$since" --no-merges --pretty='%s' | grep -ciE '^(fix|bug|hotfix)' || true)
  [ "${fixes:-0}" != "0" ] && echo "$fixes fix commits"
  reverts=$(git log --since="$since" --pretty='%s' | grep -ciE '^revert' || true)
  [ "${reverts:-0}" != "0" ] && echo "$reverts revert commits"
  if ls juxt/*.juxt >/dev/null 2>&1; then
    grep -hE '^[[:space:]]*(OPEN|\?)[[:space:]]' juxt/*.juxt 2>/dev/null | sed 's/^[[:space:]]*//; s/^/open question: /' | head -5
  fi
} | awk -v since="$since" 'BEGIN { print "Facts since " since " (source: git)" } NF { n++; printf "F%d  %s\n", n, $0 }'

bytes=$(git log --since="$since" -p 2>/dev/null | wc -c | tr -d ' ')
bash "$here/receipt.sh" add status T1 "$bytes" >/dev/null 2>&1 || true
echo "(Ticket, deploy and incident facts need a tracker or CI connection.)"
