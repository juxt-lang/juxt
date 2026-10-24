---
type: llm
weight: 2
---

PASS if, before presenting any implementation code, the reply asks the user at least one question about a decision the request left open that changes behaviour, such as whether orders can be cancelled after shipping, whether partial refunds are allowed, or what happens when the refund fails.
FAIL if the reply presents implementation code for the endpoint without first asking any such question, or if it silently assumes answers to them.
