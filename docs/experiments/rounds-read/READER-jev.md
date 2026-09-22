<!-- NOT A RUN -->
# Reader 3 — `jev-1.13`, and it scored below the trivial baseline

**NOT A RUN.** Changes no catalogue.

Stand and key: `JEV-STAND.md`, committed in `f6b712b` before this ran. One request, 48,262 input
tokens, about $0.002.

## The number

| | |
|---|---:|
| of the six the key calls incomplete, found | **4** — items 3, 5, 6, 46 |
| missed | **2** — items 11 and 28 |
| flagged where the key says arrived | **6** — items 7, 8, 10, 16, 31, 44 |
| correct over the 45 scored items | **37/45** |
| **trivial baseline, answering `arrived` to everything** | **39/45** |

**Answering `arrived` to all 46 undertakings would have scored better than the model did.** That
was registered as the baseline before the run for exactly this reason, and it is the first thing
the result has to be read against.

## Item 11, at confidence 1.00

This is the finding, and it is worth more than the score.

Item 11 is the undertaking *"Consumers **MUST** deduplicate the candidate record set by `id` prior
to executing the sorting comparator"*. `RESULT.md` singles it out as the exemplar the sealed
contract's §4 warning exists for:

> every noun of the undertaking survives — `ProjectThread`, `DeduplicateByID`, `Comparator`,
> `id`, plus three sentences arguing why dedup matters — and only `MUST` is missing.
> **Term-presence scores it a perfect match.**

`jev-1.13` answered `arrived` at **1.00** — the highest confidence it returned on any of the 46,
and the only 1.00 in the run. It scored the exemplar of the blind spot exactly as term-presence
does, and was more certain about it than about anything else it saw.

## This corrects what the earlier run claimed about confidence

`docs/experiments/normative-force/RESULT.md` says, of the same model:

> **Confidence tracks the marker, not the meaning.** … The model is not quietly guessing; it
> reports that it has lost its evidence.

**That does not hold in general, and this run is the counter-example.** It held where the missing
evidence was a marker absent from a short passage the model was shown directly. It fails where
the text is full of the undertaking's own vocabulary and only the force is gone: there the model
is not merely wrong, it is maximally confident. The property that made the first result look
promising is the property that fails on the case that matters.

The correction is recorded here rather than by editing that file.

## The rest of the confidences say the four finds are thinner than four

| found | confidence |
|---|---|
| item 5 | 0.97 |
| item 46 | 0.75 |
| item 3 | 0.53 |
| item 6 | 0.15 |

Two of the four are at or near a coin flip, and item 6 — one of the two entries the stand marked
as adjudicated rather than agreed — is at 0.15. Counting it as a find flatters the run.

The six false positives cluster low (0.04, 0.04, 0.15, 0.29, 0.30, 0.50), so a confidence floor
would clean them up. **Observed, not adopted.** Choosing a threshold after seeing which one
separates the results is the rule-adjusted-after-the-outcome move the contract of the first
experiment forbids, and naming it here does not make it legitimate. Any threshold has to be
registered before a run that has not happened yet.

## Item 30, which was the reason to reopen the run

Contested between the two readers, unscored here, answer recorded: **`arrived` at 0.52.**

That is a coin flip and it settles nothing. `RESULT.md` said *"no third reader will settle it"*
and a third reader has now not settled it.

Worth stating plainly because the stand registered the opposite expectation: `jev` had read that
same passage as item 9 of `normative-force` and called it `binding` at 0.72 and 0.89, which was
the single best thing in that run. Reframed from *does this passage bind* to *did this
undertaking arrive*, the signal disappeared. **A result that does not survive a change in the
question's framing was not a result about the passage.**

## Item 28

`arrived` at 0.52 — also a coin flip, so this is not the dissent on an adjudicated entry that the
stand allowed for. It is no reading at all.

## What two runs now establish

The stand registered, before this ran, that **this task is easier for this model than the task it
would be used for**, because six of the seven key items turn on a missing marker and markers are
what it reads. It scored below the baseline on the easier task.

- `normative-force`: a force-checker reading the draft alone is not viable — for four of five
  clauses there is nothing in the sentence to read.
- this stand: the comparison of undertaking against draft is not viable either, and fails hardest
  on the exact shape the whole investigation was built to catch.

Two applications proposed, two measured, two negative. What remains is one unreplicated positive
— item 9 of `normative-force` — which this run put the same question to in different words and
got 0.52 for.

## What this does not establish

One model, one wording, one document, 46 items, two requests across both experiments. Another
wording might do better, and nothing here bounds that. The questions are mine, so under
`relay-0799` this is a reading and not a verdict, and under rule 14 nothing in it is adopted
until a party that did not write it has attacked it — starting with the two key entries the
stand itself marked weaker.
