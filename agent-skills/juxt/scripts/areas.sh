#!/usr/bin/env bash
# Map file paths (stdin, one per line) to areas.
# Uses juxt/architecture.juxt lines like:  context orders paths: src/orders, src/api/orders
# Falls back to the top-level folder (or the first two segments under src/, app/, lib/, packages/, services/).
set -u
root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
arch="$root/juxt/architecture.juxt"
map=""
if [ -f "$arch" ]; then
  map=$(awk '/^[[:space:]]*context[[:space:]]+[A-Za-z0-9_-]+[[:space:]]+paths:/ {
      name=$2; line=$0; sub(/.*paths:[[:space:]]*/, "", line); n=split(line, p, /[[:space:]]*,[[:space:]]*/)
      for (i=1;i<=n;i++) if (p[i]!="") print p[i] "\t" name }' "$arch")
fi
awk -v map="$map" '
  BEGIN { n=split(map, rows, "\n"); for (i=1;i<=n;i++) { split(rows[i], kv, "\t"); if (kv[1]!="") { pre[++m]=kv[1]; area[m]=kv[2] } } }
  NF==0 { next }
  { f=$0; best=""; bl=0
    for (i=1;i<=m;i++) { p=pre[i]; sub(/\/$/,"",p); if (index(f, p)==1 && length(p)>bl) { best=area[i]; bl=length(p) } }
    if (best=="") { k=split(f, s, "/"); if (k==1) best="(root)"; else if (s[1] ~ /^(src|app|lib|packages|services|apps|modules)$/ && k>2) best=s[1] "/" s[2]; else best=s[1] }
    print best "\t" f }'
