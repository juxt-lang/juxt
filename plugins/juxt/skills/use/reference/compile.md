# Compiling a request into Juxt

Goal: a program short enough to read in ten seconds that removes every guess.

## Objective
One sentence: the outcome plus an acceptance criterion. "Add rate limiting" is not an objective; "requests over 100/min per API key get 429 with Retry-After" is.

## Constraints
- **MUST**: hard requirements. Include rules inherited from `juxt/context.juxt` and domain files that apply to the touched area (for example, idempotent writes in payments).
- **MUST NOT**: off-limits files, APIs, dependencies, behaviours.
- **SHOULD**: preferences you may trade off; any deviation goes in the decision log.
Only include rules that matter for this task.

## Contract
For endpoints, functions, jobs or reports: `in`, `out`, `invariant`, `on_error`. Write the failure behaviour explicitly; it is where most bugs hide.

## Pattern
Name one only when it clearly applies:
- money or multi-step state changes: `saga` with compensation, `idempotent` writes;
- schema changes: `expand-contract`;
- publishing events with a DB write: `outbox`;
- calls to flaky dependencies: `resilience` (timeout, breaker);
- replacing legacy code: `strangler-fig`.

## Verify
Checks that can actually run in this repo: test commands with the cases named, a benchmark, a lint, a type check, and review. Name edge cases as tests: "cancel twice -> one refund", "shipped order -> 409".

## OPEN
List each decision the request did not make and the code depends on. Good OPEN items change behaviour: "Can orders be cancelled after shipping?", "Full or partial refunds?". Bad OPEN items are trivia the codebase already answers; look before asking.

## Example

Request: "add a cancel-order endpoint, refunds go back to the card"

```
@juxt 0.7
objective:   POST /orders/{id}/cancel cancels the order and refunds the original card
constraints:
  MUST     idempotent writes (payments domain rule)
  MUST NOT change the public order schema
  SHOULD   reuse payments.refund()
contract:
  in: order id, auth user
  out: 200 with cancelled order, or 409 if not cancellable
  on_error: refund fails -> order stays active, error logged, 502
pattern:     saga: cancel -> refund, compensate on failure
verify:
  test "cancel twice -> one refund"
  test "shipped order -> 409"
  test "refund failure -> order still active"
  review against every MUST
OPEN:
  cancel after shipping?
  partial refunds?
```
