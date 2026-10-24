#!/usr/bin/env bash
# juxt digest: what changed in the repo, computed by git (no model), cached per HEAD.
#   digest.sh [since]   since: 1d (default), 12h, 2w, yesterday, or any git date ("2026-10-01")
set -u
here="$(cd "$(dirname "$0")" && pwd)"
raw="${1:-1d}"
case "$raw" in
  ""|yesterday) since="1 day ago";;
  *[0-9]d) n="${raw%d}"; since="$n day$([ "$n" = 1 ] || echo s) ago";;
  *[0-9]h) n="${raw%h}"; since="$n hour$([ "$n" = 1 ] || echo s) ago";;
  *[0-9]w) n="${raw%w}"; since="$n week$([ "$n" = 1 ] || echo s) ago";;
  *) since="$raw";;
esac

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "juxt digest: this folder is not a git repository."; exit 0
fi
root=$(git rev-parse --show-toplevel)
cd "$root" || exit 0
head=$(git rev-parse --short HEAD 2>/dev/null || echo none)
mkdir -p .juxt/cache
key=$(printf '%s|%s' "$head" "$since" | cksum | awk '{print $1}')
cache=".juxt/cache/digest-$key.md"

if [ -f "$cache" ]; then
  echo "◆ T0 · cache hit · HEAD $head unchanged · computed earlier, 0 model tokens"
  cat "$cache"
  bash "$here/receipt.sh" add digest T0 "$(git log --since="$since" -p 2>/dev/null | wc -c)" >/dev/null 2>&1 || true
  exit 0
fi

commits=$(git log --since="$since" --no-merges --oneline | wc -l | tr -d ' ')
merges=$(git log --since="$since" --merges --oneline | wc -l | tr -d ' ')
files=$(git log --since="$since" --name-only --pretty=format: | sed '/^$/d' | sort -u)
nfiles=$(printf '%s\n' "$files" | sed '/^$/d' | wc -l | tr -d ' ')
prs=$(git log --since="$since" --pretty='%s' | grep -oE '#[0-9]+' | sort -u | tr '\n' ' ')
raw_bytes=$(git log --since="$since" -p 2>/dev/null | wc -c | tr -d ' ')

{
  echo "Since $since · $commits commits · $merges merges · $nfiles files${prs:+ · PRs $prs}"
  if [ "$commits" = "0" ] && [ "$merges" = "0" ]; then
    echo "No changes in this range."
  else
    echo
    echo "By area"
    printf '%s\n' "$files" | sed '/^$/d' | bash "$here/areas.sh" | awk -F'\t' '{c[$1]++} END {for (a in c) print c[a] "\t" a}' | sort -rn | head -8 | while IFS=$'\t' read -r count area; do
      paths=$(printf '%s\n' "$files" | sed '/^$/d' | bash "$here/areas.sh" | awk -F'\t' -v a="$area" '$1==a {print $2}' | head -40)
      subj=$(git log --since="$since" --no-merges --pretty='%s' -- $paths 2>/dev/null | head -2 | sed 's/^/      /')
      printf '  %-22s %s files\n' "$area" "$count"
      [ -n "$subj" ] && printf '%s\n' "$subj"
    done
    echo
    flags=""
    dep=$(printf '%s\n' "$files" | grep -E '(^|/)(package\.json|pnpm-lock\.yaml|yarn\.lock|package-lock\.json|requirements[^/]*\.txt|pyproject\.toml|poetry\.lock|go\.mod|go\.sum|pom\.xml|build\.gradle(\.kts)?|Cargo\.toml|Cargo\.lock|Gemfile(\.lock)?|composer\.json)$' | head -5 | tr '\n' ' ')
    [ -n "$dep" ] && flags="$flags\n  ! dependency manifests changed: $dep"
    adr=$(printf '%s\n' "$files" | grep -iE '(^|/)(adr|adrs|decisions)/|adr-[0-9]+' | head -5 | tr '\n' ' ')
    [ -n "$adr" ] && flags="$flags\n  ◆ decision records added or changed: $adr"
    mig=$(printf '%s\n' "$files" | grep -iE 'migrat' | head -5 | tr '\n' ' ')
    [ -n "$mig" ] && flags="$flags\n  ! migrations changed: $mig"
    wr=$(printf '%s\n' "$files" | grep -E '\.juxt$' | head -5 | tr '\n' ' ')
    [ -n "$wr" ] && flags="$flags\n  ◆ juxt programs changed: $wr"
    rv=$(git log --since="$since" --pretty='%s' | grep -ciE '^revert' || true)
    [ "${rv:-0}" != "0" ] && flags="$flags\n  ! $rv revert commit(s)"
    srcn=$(printf '%s\n' "$files" | grep -vE '(test|spec|__tests__)' | grep -E '\.(ts|tsx|js|jsx|py|go|java|kt|rs|rb|cs|php|swift)$' | wc -l | tr -d ' ')
    tstn=$(printf '%s\n' "$files" | grep -E '(test|spec|__tests__)' | wc -l | tr -d ' ')
    [ "$srcn" -gt 0 ] && [ "$tstn" = "0" ] && flags="$flags\n  ! $srcn source files changed with no test files changed"
    if ls juxt/*.juxt >/dev/null 2>&1; then
      open=$(grep -hE '^[[:space:]]*(OPEN|\?)[[:space:]]' juxt/*.juxt 2>/dev/null | sed 's/^[[:space:]]*//' | head -5)
      [ -n "$open" ] && flags="$flags\n  ? unanswered OPEN items:\n$(printf '%s\n' "$open" | sed 's/^/      /')"
    fi
    if [ -n "$flags" ]; then echo "Flags"; printf "$flags\n" | sed '/^$/d'; fi
  fi
} > "$cache"

echo "◆ T1 · computed by git in this run · 0 model tokens · HEAD $head"
cat "$cache"
bash "$here/receipt.sh" add digest T1 "$raw_bytes" >/dev/null 2>&1 || true
