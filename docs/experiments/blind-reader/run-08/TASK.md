# Read this catalogue against this corpus

You are being asked to do one thing: decide, for each of nine invariants and each
of two producers, whether the published artifacts settle it.

You have not been told what anyone else concluded. That is the point of the
exercise, and the rest of this file exists to keep it that way.

## What you have

- `CATALOGUE.md` — nine invariants, each with a `falsifier:` clause and a
  `reader:` clause. This is the project's current normative catalogue: sections 1
  through 10 and 12, complete and unedited. Section 11 has been removed in full,
  and one paragraph of section 1 with it, because both discuss the results of
  earlier readings rather than stating rules. Section 1 defines the normative
  catalogue as the invariant statements, section 4, M1–M4 and U-1/U-2; all of that
  is present. Nothing inside any invariant block was touched.
- `corpus/` — eleven artifacts published by two producers, `hivemark` and `apex`,
  with `corpus/manifest.json` giving a sha256 and a source revision for each.

## The rule that decides verdicts

Every invariant is written twice: once as a title, once as a `falsifier:` clause.

```
normative test  =  the falsifier: clause
title           =  human-readable description only
```

A title does not participate in a verdict. Do not reach, defend, or overturn a
verdict by reading one.

## The verdict vocabulary

Five values. The differences among the last three are the whole exercise.

| | |
|---|---|
| `CONFORMS` | the invariant was exercised against this producer and held |
| `VIOLATES` | the falsifier fired |
| `NOT_APPLICABLE` | you looked; the producer has no such construct, so the invariant **cannot be exercised**. A statement about the producer. |
| `UNDECIDABLE` | the invariant applies, and the published artifacts **do not settle it**. A statement about the evidence. |
| `EXCLUDED_WITH_REASON` | you **did not look**, and you say why. A statement about you. |

`NOT_APPLICABLE`, `UNDECIDABLE` and `EXCLUDED_WITH_REASON` are not failures,
and none of them is support for an invariant.

The last one matters more here than it normally would. `UNDECIDABLE` says the
artifact does not answer the question. `EXCLUDED_WITH_REASON` says you never read
the artifact. If you cannot open a file, cannot hold it, or run out of room to
compute over it, that is the second one — never the first. Reporting your own
limits as a property of someone else's data is the single failure this catalogue
exists to prevent, and a reader that commits it while applying the catalogue has
answered nothing.

Also record, per finding:

- **evidence** — `OBSERVED` if you read the property directly out of the
  artifact; `INFERRED` if you used a proxy consistent with it. A proxy does not
  establish the property.
- **projections** — every meaning *your reading* supplied that no producer
  publishes: a grouping key you chose, a field you interpreted as a verdict, a
  mapping between two producers' vocabularies. An empty list is a claim, not a
  default. Where a projection carries the verdict, the verdict is not `CONFORMS`.

## The admission rule

An invariant is ADMITTED only when **two distinct producers CONFORM**.
`NOT_APPLICABLE` and `UNDECIDABLE` never count as support. One `VIOLATES` sinks an
invariant outright.

## One artifact you were probably not given

`corpus/hivemark/attestations.json` is 932 signed envelopes and 3.4 MB. It is
listed in `corpus/manifest.json` with its sha256 like everything else, and it may
have been withheld from you for one reason only: it does not fit alongside the
rest.

If you did not receive it, say so, and mark every invariant that depends on it
`EXCLUDED_WITH_REASON` — naming the file. Do not mark those `UNDECIDABLE`: the
question of whether 932 envelopes settle an invariant is open, and you were simply
not shown them.

If you did receive it, read it, and say what you were able to compute over it and
what you were not.

## What to produce

For each invariant I-1 … I-9, one finding per producer:

```
I-n / <producer>
  verdict:     CONFORMS | VIOLATES | NOT_APPLICABLE | UNDECIDABLE |
               EXCLUDED_WITH_REASON
  evidence:    OBSERVED | INFERRED
  reason:      one or two sentences a reader can check against the corpus,
               citing the file and the counts you actually computed
  projections: [ ... ] or none
```

Then the admission tally, and a one-line statement of how many of the nine are
ADMITTED.

Counts matter more than adjectives. "Every entry carries the field" is worth
little; "8 of 8 entries carry it, and the value is `false` in all 8" is worth a
great deal, and those two sentences can support opposite verdicts.

## What you have NOT been given, and why

There exist, elsewhere: conformance reports with every verdict, an implementation
of a reader in TypeScript, observations analysing the findings, and a long record
of several agents arguing about them. None of it is in this bundle. If you read any
of it, this exercise produces nothing.

You are also not being told whether anyone has done this before you, or what they
concluded if they did. Do not ask, and do not reason from the shape of these
instructions about what previous answers might have been.

**The project is public.** Do not search for it, do not look it up, do not fetch
anything. If you are able to browse and you do, say so plainly in your answer —
a labelled contaminated reading is useful; an unlabelled one is worse than none.

## What you are NOT blind to, stated honestly

`CATALOGUE.md` contains its own predictions — `expect:` lines on individual
invariants, and a registered prediction in §9 about which invariants are likely to
survive. Those were written before any evidence was read, specifically so they
could not be adjusted afterwards, and they are part of the method rather than
results.

Two `reader:` clauses also carry amendments, marked as such in the text, which
argue against a particular way of reading them and cite a counterexample from the
corpus. Those amendments are part of the catalogue you are being asked to apply.
Apply them; do not treat them as hints about a verdict.

They have not been removed, because removing them would mean editing the frozen
catalogue to suit this exercise, and the person doing the editing would then be
shaping what you see. So: you are blind to every verdict anyone reached, and you
are not blind to what the catalogue predicted about itself before it knew.

Where a prediction and your reading disagree, say so. That disagreement is the
most useful thing this exercise can produce.
