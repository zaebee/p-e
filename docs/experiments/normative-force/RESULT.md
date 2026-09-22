<!-- NOT A RUN -->
# Result — the score matched the trivial baseline and the errors did not

**NOT A RUN.** Not a `docs/reports/*-conformance-NN.md`, not in the conformance series, changes
no catalogue.

Run 2026-09-22 against `jev-1.13.0`, contract and key in this directory, key committed in
`5495798` before the run. Two requests, 11,718 input tokens, about $0.0005 at the published
$0.042/M. Cost is not a constraint on this method and will not be one.

## Condition A — the document as written

| # | item | key | jev | confidence |
|---|---|---|---|---|
| 1 | hlc re-tick | binding | binding | 0.99 |
| 2 | linear projection | binding | binding | 0.94 |
| 3 | parse before digest | binding | binding | 0.95 |
| 4 | DAG | binding | binding | 0.89 |
| 5 | citation handles | binding | binding | 0.98 |
| 6 | partial visibility | descriptive | descriptive | 0.93 |
| 7 | flat presentation | descriptive | descriptive | 0.30 |
| 8 | dedup rationale | descriptive | descriptive | 0.67 |
| 9 | **stage ordering** | **binding** | **binding** | **0.72** |
| 10 | stage-1 hashing | descriptive | **binding** | 0.70 |

**9/10 — the same number the marker-reader scores, on a different item.** This is the whole
result of condition A, and the pre-registration is what makes it readable: the key recorded
before the run that the baseline scores 9/10 and fails **item 9 and nothing else**.

Jev got item 9 right. The marker-reader cannot: §7.1's force is asserted in lowercase prose
outside the marking convention, and there is no marker to read. So the two instruments agree on
a number and disagree on which passage they are blind to.

**The vendor's predicted failure did not occur.** `jev-1.13`'s published jaggedness list names
being steered by *"text that argues for its own classification"*, and item 9 is a sentence
asserting its own normativity. It was called correctly in both conditions, and in condition B
its confidence rose to 0.89. Named before the run as the sharpest item; it was not the one that
broke.

## Item 10 is where the key is weaker than the model

Recorded rather than corrected, because a key adjusted after seeing the answer is a different
key.

`CANDIDATES.md` §5 checked and cleared the Stage-1 passage: *"the requirement to compute digests
over raw received octets appears unmarked at Stage 1, but the `**[MUST NOT]**` beside it forbids
the alternative, so the substance is carried."* The key transcribed that as `descriptive`, and
the contract pre-registered that calling it binding is over-flagging.

Jev called it binding, 0.70 in A and 0.81 in B. Read the passage on its own terms — *"Stage 1 —
wire-octet hashing. `act_digest = SHA-256(raw_received_bytes)`. No parsing, no normalization."* —
and that is an imperative. The key's answer depends on a judgement the question never asked
about: that the force lives one line down, at 264. **The question "does this passage bind" is
not well posed when the norm is adjacent**, and both answers are defensible. Counted as a miss
because that is what the key says; the key is the thing to fix, in a later design, not here.

## Condition B — markers stripped, and the pre-registered prediction held

| # | item | key | jev | confidence | vs A |
|---|---|---|---|---|---|
| 1 | hlc re-tick | binding | **descriptive** | 0.17 | flipped |
| 2 | linear projection | binding | **descriptive** | 0.79 | flipped |
| 3 | parse before digest | binding | **descriptive** | 0.43 | flipped |
| 4 | DAG | binding | **descriptive** | 0.39 | flipped |
| 5 | citation handles | binding | binding | 0.45 | held, weakly |
| 6 | partial visibility | descriptive | descriptive | 0.95 | held |
| 7 | flat presentation | descriptive | descriptive | 0.33 | held |
| 8 | dedup rationale | descriptive | descriptive | 0.53 | held |
| 9 | stage ordering | binding | binding | 0.89 | held, stronger |
| 10 | stage-1 hashing | descriptive | binding | 0.81 | held |

**5/10. Four of the five marked passages flipped to `descriptive` when their marker was removed.**

The contract said before the run: *"If the five marked passages flip to `descriptive` in
condition B, that is evidence that v0.12's force lives in its labels and not in its language."*
Four of five did.

**This is a result about the specification, not about the model.** v0.12 writes its normative
sentences as bare noun phrases under a label — *"A consumer presents any linear projection as
`the` causal history"*, *"Publishers re-tick the HLC when retrying an existing `id`"*. Without
the label those are statements of what happens, and the second one asserts, in the indicative,
the very thing it exists to forbid. A reader who lost the marker would not recover the rule, and
neither did the model.

**Confidence tracks the marker, not the meaning.** The five marked passages scored 0.89–0.99 in
A and 0.17–0.79 in B. The model is not quietly guessing; it reports that it has lost its
evidence. The one item whose force is carried by its own words — item 9 — went the other way,
0.72 to 0.89.

## What this means for building anything

**A normative-force checker reading the draft alone is not viable for v0.12.** Not because the
model is weak, but because for four of five clauses there is nothing in the sentence to read.
Condition B measures that directly. Any instrument of this shape would be reading the markers,
which is `relay-0765`'s ledger with a language model attached and a worse cost profile.

**The viable shape compares two texts**, the round's agreed rule against the draft's rendering
of it — which is what `CANDIDATES.md` did by hand, over 2113 lines, once. That is the expensive
part and the part worth automating, and this run says nothing about whether Jev can do it. It is
a different question and needs its own key.

**Item 9's shape is where the model beat the ledger outright**, and it is the shape nothing else
reaches: force asserted in prose, outside the convention. `CANDIDATES.md` found one instance by
hand while checking something else. A cheap sweep for that shape across the draft is now a
thing that could be run, and it has a pre-registered success on one instance rather than none.

## What this run does not establish

n = 10, one model, one document, one wording of the question, two requests. No rate, no
verdict. The questions are mine, so under `relay-0799` the output is candidates. Nobody who did
not write this has attacked it, so under rule 14 nothing here is adopted — including the reading
of item 10, where the key and the model disagree and the key is the weaker of the two.
