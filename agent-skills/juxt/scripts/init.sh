#!/usr/bin/env bash
# juxt init: create juxt/context.juxt from what the repo already says about itself.
# Never overwrites an existing file. Prints what it wrote.
set -u
root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$root" || exit 1
mkdir -p juxt
out="juxt/context.juxt"
if [ -f "$out" ]; then echo "juxt/context.juxt already exists; leaving it unchanged."; cat "$out"; exit 0; fi

name=$(basename "$root")
stack=""; test=""
if [ -f package.json ]; then
  stack="$stack node"
  deps=$(python3 -c 'import json;d=json.load(open("package.json"));x={**d.get("dependencies",{}),**d.get("devDependencies",{})};print(", ".join(f"{k} {v}" for k,v in list(x.items())[:8]))' 2>/dev/null)
  [ -n "$deps" ] && stack="$stack ($deps)"
  grep -q '"test"' package.json && test="npm test"
fi
[ -f pyproject.toml ] || [ -f requirements.txt ] && { stack="$stack python"; [ -z "$test" ] && test="pytest"; }
[ -f go.mod ] && { stack="$stack go $(awk '/^go /{print $2}' go.mod)"; [ -z "$test" ] && test="go test ./..."; }
[ -f pom.xml ] && { stack="$stack java/maven"; [ -z "$test" ] && test="mvn test"; }
{ [ -f build.gradle ] || [ -f build.gradle.kts ]; } && { stack="$stack java/gradle"; [ -z "$test" ] && test="./gradlew test"; }
[ -f Cargo.toml ] && { stack="$stack rust"; [ -z "$test" ] && test="cargo test"; }
[ -z "$stack" ] && stack=" unknown"
dirs=$(ls -d */ 2>/dev/null | grep -vE '^(node_modules|dist|build|target|vendor|\.)' | tr -d '/' | head -10 | tr '\n' ',' | sed 's/,$//; s/,/, /g')

cat > "$out" <<EOF
@juxt 3.4
# Shared context for every agent session in this repo. Edit freely.

context:
  project: $name
  stack:$stack
  layout: ${dirs:-(flat)}
  test: ${test:-OPEN how are tests run?}

constraints:
  MUST     keep existing tests passing
  MUST NOT add new dependencies without asking
  SHOULD   follow the patterns already used in the touched folder
  OPEN     who reviews changes to shared code? -> ask
EOF
echo "Created $out:"
cat "$out"
grep -qs '^\.juxt/' .gitignore || echo "Tip: add '.juxt/' to .gitignore (local cache and receipts)."
