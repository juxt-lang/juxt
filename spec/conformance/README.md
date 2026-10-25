# Juxt conformance suite

One small program per rule in [GRAMMAR.md](../GRAMMAR.md). Each file declares what a
conforming implementation must report, in comment lines before the header:

```text
# expect: ok                      no errors and no warnings
# expect: error <text>            an error whose message contains <text>
# expect: warning <text>          a warning whose message contains <text>
# ir: <path> = <json>             the typed IR at <path> (dot-separated) equals <json>
```

The reference runner is [`packages/cli/test/conformance.test.js`](../../packages/cli/test/conformance.test.js).
Another implementation conforms if it produces the same outcomes; message wording for
diagnostics may differ, the severity and the IR values may not.
