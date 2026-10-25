# Juxt grammar

This is the normative grammar of the Juxt working subset, as implemented by the reference
parser in [`packages/cli/lib/lint.js`](../packages/cli/lib/lint.js) and
[`lib/ir.js`](../packages/cli/lib/ir.js). Where prose elsewhere disagrees with this file,
this file wins. Every rule here is exercised by the [conformance suite](conformance/), which
any other implementation can run against itself.

Notation is ISO-style EBNF: `{ x }` is zero or more, `[ x ]` is optional, `|` is choice,
quoted text is literal. `NL` is a line break (`\n` or `\r\n`), `WS` is spaces or tabs.

## 1. Lines

Juxt is line-oriented. A program is read one physical line at a time.

```ebnf
program     = { blank | comment } header { line } ;
header      = "@juxt" WS version [ WS ] NL ;
version     = digits { "." digits } ;
line        = blank | comment | block | item ;
blank       = [ WS ] NL ;
comment     = [ WS ] "#" { any } NL ;
block       = block-head ":" [ WS ] [ inline ] NL ;      (* starts in column 1 *)
item        = WS text NL ;                              (* indented, belongs to the last block *)
```

- **Comments.** A `#` at the start of a line, or a `#` preceded by whitespace, starts a comment
  that runs to the end of the line. A `#` inside a word (`a#b`) is not a comment.
- **Header.** The first non-blank, non-comment line must be the header. Missing it is an error.
- **Indentation** only distinguishes items from blocks; its depth is not significant.
- An item before any block is an error.

## 2. Blocks

```ebnf
block-head  = keyword [ WS label ] ;
keyword     = word | "remote agent" ;
word        = lower { lower | "_" | "-" } ;            (* lower = a-z or "_" *)
label       = text-without-colon ;
inline      = text ;
```

The keyword must be one of the known blocks below. An unknown keyword is a **warning**, never
an error, so new blocks and vendor extensions (`x-yourco-review:`) do not break old tools.

| Group | Keywords |
|---|---|
| Program | `objective`, `context`, `extends`, `returns`, `resolved` |
| Rules and interface | `constraints`, `contract`, `pattern`, `verify`, `eval` |
| Team | `agent`, `remote agent`, `tools`, `topology`, `host`, `harness` |
| Safety and cost | `policy`, `limits`, `observe`, `receipts`, `chat` |
| Enterprise | `on`, `recipe`, `stack`, `freshness`, `fleet`, `rollout`, `architecture`, `fitness`, `ledger`, `view`, `status` |

A block line may carry a **label** (the name of an agent, for example) and **inline** content
after the colon. Its items are the indented lines that follow it.

```juxt
agent planner:   model: frontier, role: plan and contract
remote agent billing:  a2a://billing.acme.dev, signed
```

## 3. Items by block

### constraints

```ebnf
constraint  = level WS rule ;
level       = "MUST NOT" | "MUST" | "SHOULD NOT" | "SHOULD" | "OPEN" ;
rule        = text ;
```

Any other first word is an **error**. `OPEN` items are questions; each one is a **warning**
until it is resolved (moved to `resolved:` or answered), because an agent must ask rather than
guess. The longer keyword wins (`MUST NOT` before `MUST`).

### contract

```ebnf
contract-item = role ":" entries ;
role          = "in" | "out" | "invariant" | "on_error" ;
entries       = entry { "," entry } ;                    (* split only at top level *)
entry         = name [ ":" type ]
              | name "(" type ")"
              | [ text ] record [ text ] ;
record        = "{" field { "," field } "}" ;
field         = name [ ":" type ] ;
```

Commas and colons inside `{}`, `()` and `[]` do not split. `on_error` takes the whole rest of
the line as a single entry. Examples and their IR:

| Source | IR entry |
|---|---|
| `in: req: CancelRequest` | `{ name: "req", type: "CancelRequest" }` |
| `in: user (User)` | `{ name: "user", type: "User" }` |
| `in: api_key` | `{ name: "api_key", type: null }` |
| `out: 429 { retry_after: duration } when over limit` | `{ name: "429 when over limit", type: "{ retry_after: duration }", fields: [{ name: "retry_after", type: "duration" }] }` |

Types are names, not checked expressions. `juxt check` resolves PascalCase type names against
TypeScript, Pydantic and OpenAPI definitions in the repo.

### verify

```ebnf
check       = "test" WS string | "bench" WS text | "review" WS text | text ;
string      = '"' { any-but-quote } '"' ;
```

A program with an `objective` must have **at least one** verify check; otherwise it is an error.

### agent and remote agent

```ebnf
agent-inline = pair { "," pair } ;
pair         = key ":" value ;                 (* "mcp://" and "a2a://" are values, not keys *)
```

A `remote agent` may carry a bare `a2a://` address and the flag `signed` in its inline text.

### topology

```ebnf
topology-inline = shape "(" name ")" ;             (* e.g. orchestrator(planner) *)
edge            = name WS op WS name [ WS ( "on" | "until" ) WS text ] [ WS "{" fields "}" ] ;
op              = "=>" | "->" | "~>" ;
```

| Operator | Meaning |
|---|---|
| `=>` | typed handoff: the named fields, and only those, pass to the next agent |
| `->` | loop back (`until` a condition, typically `verify`) |
| `~>` | event: fire on a named event (`on limits_changed`) |

### limits

```ebnf
limits      = limit { "," limit } ;
limit       = "tokens" WS number | "iterations" WS number | "cost" WS "$" number | "time" WS duration ;
number      = digits [ "." digits ] [ "k" | "m" | "b" ] ;
```

All other blocks take free text in their inline content and items.

## 4. Static checks

| Check | Severity |
|---|---|
| missing or malformed `@juxt <version>` header | error |
| block line that does not match `block-head ":"` | error |
| indented item before any block | error |
| constraint not starting with a level keyword | error |
| a level keyword with no rule text | error |
| more than one `objective` | error |
| empty `objective` | error |
| `objective` without any `verify` check | error |
| unresolved `OPEN` question | warning |
| unknown block keyword | warning |

Programs with errors must not run. Warnings are reported and do not block.

## 5. Versioning

The header names the language version a program was written for. Language versions follow the
reference toolchain (`@juxt 0.7` is understood by `juxt-lang` 0.7 and later). Before 0.7 the
header read `@juxt 3.4`; that spelling is still accepted as an alias of 0.6 so existing
programs keep working, and `juxt lint` suggests the new header.
