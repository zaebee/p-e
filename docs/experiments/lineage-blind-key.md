<!-- NOT A RUN -->
# Pre-registered answer key for `lineage-blind/`

**NOT A RUN.** Not a `docs/reports/*-conformance-NN.md`, changes no catalogue.

Written and committed **before** the blind reader runs, so it cannot be adjusted after seeing
what comes back. Deliberately **not** placed inside `lineage-blind/`, which is the sealed input.

## What the run tests

Whether the sweep recorded in `relay-0758` was exhaustive or lucky. It searched for terms already
known to be worth searching for, because the open questions were already known. That method
cannot enumerate its own blind spots. See item 1 of `relay-0760`.

## The key, present in A and absent from B

Three items, found by the original sweep:

| # | item | where in A | evidence |
|---|---|---|---|
| K1 | `ttl` default `3600`, and `ttl` marked OPTIONAL | §2.2 field list, A:44 | string `3600` occurs twice in the whole 2262-line review thread, both in A; zero times in B |
| K2 | expiry origin `created_time(uuidv7) + ttl < now()` | §4, GC, A:101 | same: `created_time` twice, both in A, zero in B |
| K3 | `signature?: string` — author signature, optional | §3 envelope, A:78 | `signature` appears zero times in B; once elsewhere in the thread, about a different codebase |

Issues: K1 and K2 are #37 (closed, restored via #48 and #49). K3 is #51.

## This key is incomplete by construction

It lists what one non-exhaustive method found. **It is not the set of correct answers**, and the
run must not be scored against it as though it were. An item the reader finds that is not here
is a finding about the sweep, not an error by the reader.

## Known changes that are NOT removals

Recorded so they are not miscounted in either direction. These were discussed in the review
rounds and changed deliberately:

- `to` widened from `string` to `readonly string[]`
- `hlc` restructured from `{wall_time, logical_seq, parent_digest}` to `{l, c, node_id}`
- `parent_digest` lifted out of `hlc` to the top level, and `parent_id` added beside it

§4 of the contract asks for these separately. A reader reporting them as removals has applied a
rule that does not distinguish moving from leaving, which is itself worth recording.

## How the outcomes read

- **Items outside the key** — the sweep was not exhaustive. The outcome this run exists to make
  possible.
- **Exactly the key** — weak evidence of exhaustiveness, and no more than weak. Two searches can
  share a blind spot, especially when both look for the same kind of thing.
- **Fewer than the key** — a fact about the reader or the contract, not about the documents.
  Must not be used to promote the key.

No prediction is recorded about which of the three the reader will find, because I have no basis
for one and a guess would only be something to be right about afterwards.
