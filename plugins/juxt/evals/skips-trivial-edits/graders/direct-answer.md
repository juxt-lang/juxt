---
type: llm
---

PASS if the reply directly gives the snippet with `cnt` renamed to `count` in all three places, without an "Understood as" block, a Juxt program, or clarifying questions.
FAIL if the reply asks questions, produces a Juxt program or plan, or misses any occurrence of the rename.
