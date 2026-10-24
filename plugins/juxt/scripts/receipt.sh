#!/usr/bin/env bash
# juxt receipts: record and summarise what Juxt did instead of a full model call.
#   receipt.sh add <kind> <tier> <bytes_not_sent> [key=value ...]
#   receipt.sh show [days]
# Receipts are local (.juxt/receipts.jsonl). Token figures are estimates
# (bytes / 4) of the raw material an agent would otherwise have read.
set -u
root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
dir="$root/.juxt"; file="$dir/receipts.jsonl"
mkdir -p "$dir"

cmd="${1:-show}"; shift || true

esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

if [ "$cmd" = "add" ]; then
  kind="${1:-unknown}"; tier="${2:--}"; bytes="${3:-0}"; shift 3 2>/dev/null || shift $#
  case "$bytes" in ''|*[!0-9]*) bytes=0;; esac
  est=$(( bytes / 4 ))
  extra=""
  for kv in "$@"; do
    k="${kv%%=*}"; v="${kv#*=}"
    extra="$extra,\"$(esc "$k")\":\"$(esc "$v")\""
  done
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  printf '{"ts":"%s","kind":"%s","tier":"%s","est_tokens_avoided":%s%s}\n' "$ts" "$(esc "$kind")" "$(esc "$tier")" "$est" "$extra" >> "$file"
  echo "receipt: $kind · $tier · ≈$est tokens not sent to a model (estimate)"
  exit 0
fi

if [ "$cmd" = "show" ]; then
  if [ ! -s "$file" ]; then
    echo "No receipts yet. They appear after /juxt:digest, /juxt:status or /juxt:use runs."
    exit 0
  fi
  days="${1:-30}"
  since=$(date -u -d "-$days days" +%Y-%m-%d 2>/dev/null || date -u -v-"$days"d +%Y-%m-%d 2>/dev/null || echo 0000-00-00)
  awk -v since="$since" -v days="$days" '
    function field(name,   m) { if (match($0, "\"" name "\":\"[^\"]*\"")) { m=substr($0,RSTART,RLENGTH); sub("\"" name "\":\"","",m); sub("\"$","",m); return m } return "" }
    function num(name,   m) { if (match($0, "\"" name "\":[0-9]+")) { m=substr($0,RSTART,RLENGTH); sub("\"" name "\":","",m); return m+0 } return 0 }
    { ts=field("ts"); if (substr(ts,1,10) < since) next
      k=field("kind"); t=field("tier"); n[k]++; tok[k]+=num("est_tokens_avoided"); tiers[t]++; total+=num("est_tokens_avoided"); runs++
      if (k=="use") { open+=field("open")+0; checks+=field("checks")+0; reused+= (field("reused")=="yes") } }
    END {
      printf "Juxt receipts · last %s days · %d runs\n\n", days, runs
      printf "%-10s %6s %18s\n", "kind", "runs", "≈tokens not sent"
      for (k in n) printf "%-10s %6d %18d\n", k, n[k], tok[k]
      printf "\nTotal ≈%d tokens not sent to a model (estimate: bytes/4 of raw material).\n", total
      printf "Tiers: "; for (t in tiers) printf "%s×%d  ", t, tiers[t]; printf "\n"
      if (n["use"]>0) printf "Juxt mode: %d open questions asked before coding, %d checks attached, %d programs reused.\n", open, checks, reused
    }' "$file"
  exit 0
fi

echo "usage: receipt.sh add <kind> <tier> <bytes> [k=v...] | receipt.sh show [days]"
