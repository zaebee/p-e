<!-- NOT A RUN -->
# Result — the census could not have found what it was run to find

**NOT A RUN.** Not a `docs/reports/*-conformance-NN.md`, changes no catalogue.

Reader output verbatim in `READER-OUTPUT.md`. Key at `docs/experiments/norm-census-key.md`,
committed before the run in `6fcd521`. Input re-hashed after: matches `fa5a9491…`.

## Against the key

| | prediction | outcome |
|---|---|---|
| **P1** | 4–8 clauses come back **Could** | **three. Missed, below the range.** |
| **P2** | line 79, I-JSON domain → Could | hit |
| **P3** | line 75, JCS bytes → Could | hit |
| **P4** | line 264, no re-serialize → Cannot or Depends | hit — **Cannot** |
| **P5** | §4 answers **yes**; uniqueness and happens-before named | **missed. It answers *No*.** |
| **P6** | at least one property named as stated **nowhere** — liveness | **missed. None named.** |

Three hits, three misses.

## What it found that I did not predict

**Clause 11, line 338 — Could.** *"A store guarantees the invariant, by deriving the digest at
load or by verifying it before committing the record."*

> A resolution that adopts a non-JSON serialization format lacking a deterministic canonical
> representation would prevent stores from guaranteeing the invariant `digest === SHA-256(octets)`.

Real, and I had not considered a resolution that leaves JSON entirely. My own list never went
outside it.

## The finding that matters, and it is against my instrument

The reader's §4 says **No** — nothing outside the twelve is at risk — and gives this reason in
passing:

> **The HLC computation rules in §3.3 are also non-normative prose.**

That is the core of [#88](https://github.com/zaebee/p-e/issues/88), reached independently by a
reader who never saw it. And it is reached as an *aside*, in support of the opposite conclusion:
since §3.3's rules are non-normative, **nothing there can be violated**, so nothing there is at
risk.

The reasoning is sound. **A non-obligation cannot be broken.**

Which means the census could not have found the gap. I asked *"what could a fix violate?"* — a
question that structurally excludes *"what is relied on but not required"*, because the second
category is exactly the set of things that cannot be violated.

**The reader answered correctly inside the frame, and the frame was mine.** `relay-0859` said the
construction would move into whatever I authored next; it moved into the form of the question.

## What this does and does not establish

**Establishes:** an independent reader, with the whole draft and a sourcing rule, states that
§3.3's computation rules are non-normative prose. #88's factual claim now rests on two readings,
one of which had no access to the other.

**Does not establish:** that the gap is unimportant, or that liveness is or is not stated
somewhere. Neither was asked. P6's miss is not evidence about liveness — it is evidence that a
census of violations cannot see a missing obligation, which is the same finding as above.

## Where the sourcing rule held

Every claim in the reader's output carries a line number, and the two places it steps outside the
normative clauses — the six-state partition at 276–294, and §3.3's rules — are **labelled as
non-normative in the sentence that uses them**. The rule that K2 and K3 failed was met here on
first application by someone who had not seen them fail.

That is the one part of this run that worked as designed.
