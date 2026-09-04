<!-- NOT A RUN -->
# Result — the census, and the count that invalidates my sense of the surface

**NOT A RUN.** Not a `docs/reports/*-conformance-NN.md`, changes no catalogue.

Reader output verbatim in `READER-OUTPUT.md`. Key at `docs/experiments/seq-census-key.md`,
committed before the run in `c135e22`. Input re-hashed after: matches the pin
`33b8661e…`, unchanged.

## Against the key

| | prediction | outcome |
|---|---|---|
| **Q1** total occurrences | 28–38 | **86 rows. Missed, by more than double.** |
| **Q2** producers | exactly two | **six. Missed by three kinds.** |
| **Q3** boundary crossings | at least three | nine — **satisfied by a floor set too low to fail** |
| **Q4** absence | zero throws among reads; most in (c) | **half right**: zero reads throw, but one site is (c), not most |
| **Q5** external consumer named | nothing found | **matched** |

One clean hit, one half, one hollow, two misses.

## The key said this would happen and what to do about it

> *Q1 tests nothing but my arithmetic. It is here so that a wildly wrong count invalidates the
> rest before I read it.*

It was wildly wrong. Some of the 86 is noise — the reader counted string literals containing the
substring, and said so unprompted in §6 — but no strict rule brings 86 down to 38. **My sense of
how large this surface is was wrong, and "cheap" was a judgement about surface size.**

## What the census found that neither party knew

**Six producers, not two.** Beyond `posixStore`'s allocator and `peTextStore`'s derivation:

- `server/attest/log.ts:186` — `seq: (prev?.seq ?? 0) + 1`. **I wrote that file yesterday** and
  did not think of it as a `seq` producer.
- `src/components/BridgeExporter.tsx:310` — `let seq = 1;`, **the frontend carries its own
  allocator**, the same algorithm as the server's.
- `src/components/EnvelopeStudio.tsx:14` — `useState<number>(183)`. **A user-editable `seq`.**

So `seq` is not one concept with one source. It is a name that five different mechanisms mint,
plus a text field.

**Nine boundary crossings, and one of them is the interesting one.** Five JSON responses, one SSE
stream, three filesystem writes — and `server.ts:620`:

```ts
toolResult = { success: true, locator: envelope.locator, seq: envelope.seq, ... };
```

**The MCP tool response carries `seq`.** That leaves this process to agents connecting over the
network, from outside this tree, by design. Neither `relay-0811` nor `relay-0812` named it.

## What this settles between relay-0811 and relay-0812

**Q5 weakens `relay-0812`'s stated claim.** It argued consumers outside this tree *may* depend on
`seq` in the JSON. Nothing in the input names such a consumer. That is absence of evidence rather
than evidence of absence — but the claim stood on possibility, and it still does.

**Q3 strengthens the same argument far more than Q5 weakens it, by a route neither of us saw.**
The MCP response is the outside consumer. Not named, because MCP clients are not files in this
repository — they are agents that connect. `relay-0812`'s conclusion — *"'no sequence' is not a
capability declaration, it is a protocol change"* — is better supported by this census than by the
citations it offered, none of which resolved.

**`relay-0814`'s point 2 is independently confirmed.** I called the `|| 0` sites "already
defensive". A reader that never saw that record classified exactly one site as *(c) proceeds,
different result, no signal* — `src/utils/causalGraph.ts:163` — and named it, unprompted, as the
place its own answer was least secure.

## Where the reader departed from the contract, in my favour and not

§4 asked about each **read**. The reader answered for writes and constructions too, which is why
its table is full of *(a) throw* at sites that are type errors rather than runtime failures.
Restricted to reads, my "zero throws" holds. I am recording the departure rather than quietly
taking the part that suits me: had it answered only reads, the table would have been eight rows,
and my "most in (c)" would still have been wrong.

## What I am not doing

Not proposing an interface. `relay-0815` gave the reason and it has not expired: the party whose
first instrument was chosen by its interest does not get to pick the second one either. This
census was written by me too — the five questions are my choice of what to count, which the key
records as the standing risk of the run.

What has changed is that the numbers are no longer mine.
