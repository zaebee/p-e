# Blind reader — result

2026-08-29. Gemini via AI Studio, `TASK.md` as the system prompt, twelve corpus
files attached, search grounding off, `CATALOGUE.md` at the freeze commit
`580c01d`. It reported no external lookup. Its cited paths — `data/history.json`,
`dist/provenance.json`, `src/content/log/` — occur only inside `CATALOGUE.md`'s
own prose, consistent with it having read the bundle and nothing else.

**6 of 18 findings agree with run 07.**

| | run 07 | blind reader | |
|---|---|---|---|
| I-1 / hivemark | UNDECIDABLE | EXCLUDED_WITH_REASON | withheld |
| I-1 / apex | UNDECIDABLE | CONFORMS | |
| I-2 / hivemark | UNDECIDABLE | EXCLUDED_WITH_REASON | withheld |
| I-2 / apex | UNDECIDABLE | CONFORMS | |
| I-3 / hivemark | UNDECIDABLE | **VIOLATES** | |
| I-3 / apex | UNDECIDABLE | CONFORMS | |
| I-4 / hivemark | CONFORMS | EXCLUDED_WITH_REASON | withheld |
| I-4 / apex | UNDECIDABLE | UNDECIDABLE | agree |
| I-5 / hivemark | UNDECIDABLE | UNDECIDABLE | agree |
| I-5 / apex | UNDECIDABLE | CONFORMS | |
| I-6 / hivemark | UNDECIDABLE | EXCLUDED_WITH_REASON | withheld |
| I-6 / apex | NOT_APPLICABLE | NOT_APPLICABLE | agree |
| I-7 / hivemark | UNDECIDABLE | CONFORMS | |
| I-7 / apex | UNDECIDABLE | CONFORMS | |
| I-8 / hivemark | UNDECIDABLE | UNDECIDABLE | agree |
| I-8 / apex | CONFORMS | CONFORMS | agree |
| I-9 / hivemark | UNDECIDABLE | UNDECIDABLE | agree |
| I-9 / apex | UNDECIDABLE | CONFORMS | |

It reports **1 of 9 ADMITTED (I-7)**. We report 0 of 9.

## It fired a falsifier we never fired

`I-3 / hivemark` — **VIOLATES**, on the ground that `provenance.json` declares
five input files and none of the five is published.

Run 07 states the same facts and returns UNDECIDABLE: *"provenance.json pins 5
derivation inputs by digest; 0 of them are in the published corpus."*

The frozen falsifier reads *a producer publishes a conclusion whose input is not
in the corpus*. Both readers established that condition from the same bytes. One
fired it.

The catalogue anticipated the case in I-3's own `watch:` line:

> dist/provenance.json pins corpus.json by digest, but corpus.json may not itself
> be published. **if so H fails its own I-3 at the artifact level, and that is a
> finding, not a bug in the reader**

Our reader softened it in every run from 01 to 07. Under the relay-0153 ruling the
falsifier governs and the title is a description, so the vaguer word "beside"
offers no route back.

One `VIOLATES` sinks an invariant outright and permanently. Whether this reading
enters the catalogue is a decision for the group and the human, not for the party
whose reader it convicts.

## It reproduced two defects the catalogue had already amended

| | blind reader | reason it gave |
|---|---|---|
| I-2 / apex | CONFORMS | `since <= checkedAt` across 8 of 8 |
| I-9 / apex | CONFORMS | the `gaps` field present in 8 of 8 |
| I-5 / apex | CONFORMS | the `gaps` field present in 8 of 8 |

Those are the two verdicts relay-0056 corrected, for the reasons recorded then:
ordering is not occurrence, and eight zeroes show that `uncounted` was empty rather
than that failures are counted.

The frozen catalogue carries the **unamended** clauses:

```
I-2 reader:  assert A's since <= checkedAt
I-9 reader:  A — history carries gaps per host
```

No *"NEITHER PRODUCER CAN CONFORM ON ORDERING ALONE"*. No *"presence **and** at
least one non-zero"*. Both sentences were added after the defects were found.

So this is a controlled comparison, and it is the strongest thing the experiment
produced: **an independent reader, given the clauses as originally written, walked
into the same two defects our reader did.** They were not carelessness in the
implementation. The clause text prescribed them. relay-0056 called them "errors in
the apparatus, not in the catalogue"; on this evidence that split was too kind to
the catalogue.

## Where it was less careful

`I-7 / hivemark` — CONFORMS because `judge` appears in none of the published
files. That is conformance from absence, which the catalogue's own vocabulary
places at NOT_APPLICABLE, and NOT_APPLICABLE is never support. Its single ADMITTED
rests on this finding; without it the count is zero, the same as ours.

`I-1 / apex` — CONFORMS because {cold, alive} are distinct. The invariant is about
the third state, which never occurs in this corpus. It followed the clause's
literal instruction — *assert no value maps onto another* — and the clause never
mentions the difference between a state being representable and a state being
exercised.

## Where our packaging decided the answer

Four findings, all hivemark, all `EXCLUDED_WITH_REASON`, all because
`attestations.json` was withheld: 3.4 MB, roughly 988,000 tokens against about
60,000 for everything else.

The reader labelled each one correctly, named the file, and did not report our
packaging as a property of hivemark's data. That distinction had never before been
applied by anyone outside this project.

It cost the strongest finding in the corpus. `I-4 / hivemark` is the only hivemark
CONFORMS in run 07, and it came from recomputing 428 superseded attestations across
932 envelopes. Withholding the file disabled it. Curation decided a verdict for the
fourth time in three days — this time knowingly, with no alternative that fit.

## What it settles

The experiment asked whether an independent agent, given the frozen catalogue and
the raw evidence, reaches the same verdicts without being told the result.

It does not. Six of eighteen. And every one of the twelve divergences is legible:
one place where it read the falsifier more faithfully than we did, three where the
clause text led it into defects we had already found and fixed, two where it was
less careful than us, four where we had removed the evidence.

None of the twelve is noise.
