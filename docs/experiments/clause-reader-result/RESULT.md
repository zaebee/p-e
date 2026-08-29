# Independent clause reading — result

2026-08-29. Mistral, fresh session, run locally by bee.zae against
`docs/experiments/clause-reader/` only: frozen catalogue, corpus, contract. No
implementation of ours, no verdict of ours, no network, no session memory of the
earlier suite audit.

It wrote `reader.py` — 51 KB of executable predicates — and ran them. Contract §3
asked for an executable predicate rather than a description, and it complied
literally.

Its headline: **all nine invariants UNDECIDABLE.**

---

## The comparison the contract permits

Contract §5: compare against `clause.ts` only where both sides implemented the same
thing. That is two pairs, and no more were manufactured.

| | our `clause.ts` | our check | independent reader |
|---|---|---|---|
| I-3 / hivemark | VIOLATES | VIOLATES | UNDECIDABLE |
| I-5 / apex | **CONFORMS** | UNDECIDABLE | **UNDECIDABLE** |

### I-5 / apex — our clause implementation is the outlier, and the pin is backwards

The frozen I-5 block ends with a line I did not implement:

```
expect:  one anchor exists. a gap cannot be observed in a single period, so
         the no-backfill half is UNDECIDABLE and must not be reported as CONFORMS
```

`src/conformance/clause.ts` contains no reference to `expect:` at all — zero
occurrences in the file. I implemented the `reader:` line and stopped, and the
comment I wrote there argues at length that the clause "does not ask that a gap have
occurred", which is true of the `reader:` line and beside the point given the
sentence directly beneath it.

The independent reader took the other half. Its evidence for I-5/A reads *"since
field present, gaps counted; no-backfill UNDECIDABLE per CATALOGUE"* — it found the
`expect:` line, applied it, and returned UNDECIDABLE. So did our check, which has
said UNDECIDABLE since run 01.

**So the suite's `ACCOUNTED_CLAUSES` pin has it backwards.** It reads:

> `I-5/apex`: requires a non-zero gap before CONFORMS, which is the amended I-9
> standard; the I-5 clause never asked for it and was never amended — OBS-060

The check was never the defective party on this pair. `clause.ts` was, and the pin
recorded the disagreement while naming the wrong side of it.

That also takes one leg off OBS-060's symmetry. I-3 (clause stronger than the
reader) survives untouched — it was settled at relay-0174 on two independent blind
readings. I-5 (clause weaker than the reader) does not: the clause is not weaker,
my implementation of it was.

One genuine ambiguity remains and should not be resolved silently. The `expect:`
line opens with *"one anchor exists"*, which is about H's anchors; whether it binds
A's half as well is not stated. Our check and the independent reader both applied it
to A. That is agreement, not proof, and the sentence admits the narrower reading.

### I-3 / hivemark — the disagreement is ours, not the reader's

The independent reader returned UNDECIDABLE, and its own key findings say:

> `hivemark/dist/provenance.json` pins input files but does NOT pin `corpus.json`
> itself. Per CATALOGUE §I-3 watch note, this is an artifact-level finding: **H
> fails its own I-3 at the artifact level.**

It reached the same finding we did and declined to let it settle the verdict,
because its predicate also required tracing `claim_hash` through the derived
records — which needs `attestations.json`, which we withheld.

So this pair does not measure a difference in reading. It measures our packaging.
Seventh time in this project that curation has touched a verdict, and the second
time it has hit an experiment designed to be independent of us.

---

## The other seven, as observations only

Contract §6: for I-1, I-2, I-4, I-6, I-7, I-8, I-9 the independent reading is a
first reading, and comparison with our reader is an observation rather than
evidence that either side is right.

Its per-producer verdicts differ from ours in one systematic way: it returns
`CONFORMS` for apex on I-1, I-2, I-3, I-4, I-7 and I-9 where our reader returns
`UNDECIDABLE`. That is the same direction the two earlier blind readers took, for
the same reason — reading a `reader:` clause as satisfied by a field being present
and well-formed, where our checks require the mechanism to have been exercised.

Whether that standard belongs in the clauses or is something our checks added is
the open question underneath all three blind readings, and none of them settles it.

---

## What the all-UNDECIDABLE headline is, and is not

Eight of nine hivemark verdicts are `UNDECIDABLE` because `attestations.json` was
withheld. The reader says so in almost every entry, and marks the file `EXCLUDED`
rather than reporting our packaging as a property of hivemark's data — the third
outside reader to get that distinction right.

So the headline is largely a measurement of the bundle, as it was in the suite
audit. The bundle was small on purpose and the consequence is the same both times.

One thing to discount rather than credit. The report opens with:

> The CATALOGUE (§9) predicted that several invariants proven in code will come back
> UNDECIDABLE at the artifact level… **Result: all 9 invariants returned
> UNDECIDABLE. This confirms the prediction.**

It had the prediction in front of it — §9 is in the frozen catalogue it was given.
A reader agreeing with a text it has read is not independent confirmation of that
text. The same caveat applied to the relay-0056 amendments in run 08 of the blind
series, and it applies here.

---

## What this experiment settled

It found a real defect in the party that commissioned it, in the one file written
specifically to be independent of that party, and it found it on the first of the
two pairs available to compare.

That is what the experiment was for. It did not establish that anything is correct —
per contract §7 the reader is not an authority, and per §9 agreement is not success.
What it produced is one classified disagreement:

| pair | cause |
|---|---|
| I-5 / apex | **implementation** — a line of the clause was not implemented, by me |
| I-3 / hivemark | **evidence semantics** — our withholding blocked half its predicate |

And one ambiguity, stated rather than resolved: whether I-5's `expect:` line binds
apex's half of the invariant or only hivemark's.
