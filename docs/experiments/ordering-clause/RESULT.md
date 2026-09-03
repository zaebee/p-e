<!-- NOT A RUN -->
# Result — attack 4 lands, and §4 constrains less than any of my three positions

**NOT A RUN.** Not a `docs/reports/*-conformance-NN.md`, changes no catalogue.

Reader output verbatim in `READER-OUTPUT.md`. Key in `docs/experiments/ordering-clause-key.md`,
committed before the run. The reader had the specification, the interface, quotations from the
running service, and a PIN — no repository, no records, no issues, and no knowledge that a key
existed. It reported the PIN as matching, and the inputs verify unchanged after the run.

## A note on how `READER-OUTPUT.md` reads

It contains literal `\u00a7` where a `§` belongs, and similar escapes for dashes and curly
quotes — nine of them. **These are in the reader's file as delivered**: the original holds zero
real `§` characters and nine escape sequences, so they were not introduced by copying it here.

They are a property of the reader's harness, which writes JSON-escaped strings into a `.md` file,
rather than anything the reader chose. Worth recording for anyone repeating this with the same
harness.

The file is kept byte-exact anyway. Substituting nine characters would make it no longer what the
reader produced, and a later comparison against the original would find a discrepancy with
nothing explaining it. Raised in review of this PR as a rendering problem, which it is; the
rendering is the cost of the artifact being the artifact.

## Against the key

| | outcome |
|---|---|
| **P1** — "consumer" undefined, twice, both inside §4 | **reached, and improved** |
| **P2** — emitting `seq` is not "presenting" | **reached** |
| **P3** — the exposure sits in the presentation layer | **partly, and my version is weakened by the reader's own argument** |
| **P4** — §4 does not block the integration | **reached** |

## What the reader found that I did not

**The document's mechanism for defining roles.** I recorded that "consumer" is undefined. The
reader went further and found *how* this document defines roles at all:

> Other role terms such as "producer", "publisher", "reader", "verifier", and "store" are also
> used without formal definition, but "store" is addressed by its own clause […] This indicates
> that roles are defined by their associated MUST/MUST NOT clauses. Since "consumer" appears only
> in one MUST NOT clause and has no defining clause of its own, **the term's scope is undefined**.

So "consumer" is not merely undefined by omission. It is undefined *by the document's own
pattern*: every other role is constituted by an obligation, and this one has only a prohibition.
A role that is never given something to do is never brought into existence to be prohibited.

**§4 permits flat presentations three lines after forbidding them.** The strongest textual point
in the answer, and neither I nor anyone else in this corpus had noticed it:

> A consumer needing a flat presentation deduplicates first, then sorts

That sentence makes the strict reading — no linear projections in relation to causal history —
self-contradictory. §4 tells you how to build one.

**The decisive word is the definite article.** The prohibition is on presenting a projection as
***the*** causal history. It targets the claim of singularity, not the projection.

**`allocateSequence()` exists at `B-store-interface.ts:149`.** I argued P3 from
`totalSequencesAllocated`, a status field. The reader found the actual method — the interface
does not merely carry a sequence, it allocates one. That is better evidence for the point I was
making, and I had read that file and missed it.

**Nine mismatches between `B` and `A`, against my three.** `seq`, `store_id`, `status`,
`header_block`, `parent_locator`, `allocateSequence`, the inbox pair, `deletePayload`, and
`inboxes`. All nine citations were checked against the files and all nine hold.

## Where my key and the reader disagree

The key's **P3** says calling a partial order a "monotonic sequence log" and a "Relay Monotonic
Ledger" *is* the prohibited act, committed by the presentation layer. The reader saw the same
line, quoted it, located presentation "at higher layers" — and answered part 3 with **"By
nobody."**

Its own Reading 1 is why, and it undercuts me: if the decisive words are "as ***the***", then the
prohibition is on *claiming singular causal authority*, and naming a store a sequence log is a
description of storage rather than a claim about history. My P3 reads a naming convention as an
assertion. On the reader's analysis — which is better argued than mine — it is not one.

I am recording this as a disagreement rather than resolving it, because I have now held four
positions on this clause and the fourth is not more trustworthy than the third for being newer.

## What this settles for the design

**Attack 4 of `relay-0769` lands.** My original claim — that a store emitting `seq` would violate
§4 — was wrong, and the correction I proposed in `relay-0768` pointed the right way.

And §4 constrains **less** than any of my three positions. It does not prohibit linear
presentation; it prescribes how to build one and prohibits one specific claim about it. So the
`RelayLiteStore` integration is not blocked at all: build the flat view with §4's own comparator,
and do not call the result the causal history.

What remains, and it is not a §4 problem: the nine mismatches in §5 of the reader's answer are
real, `allocateSequence()` is the sharpest of them, and `deletePayload` collides with invariant 1
rather than with §4. Those belong to the integration design and to `#67`.

## What this does not establish

One reader, given the three documents I chose, reading a clause I framed the question about. A
second reader can share a blind spot with the first. The key names this outcome as "does not
confirm it" in advance, and that stands.
