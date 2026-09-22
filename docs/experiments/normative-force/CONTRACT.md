<!-- NOT A RUN -->
# Contract — can a model read normative force rather than normative marking?

**NOT A RUN.** Not a `docs/reports/*-conformance-NN.md`, not in the conformance series, changes
no catalogue.

## Why this exists

`docs/experiments/lineage-blind/CANDIDATES.md` §5 found a class of defect no proposed instrument
reaches. A clause agreed in a review round arrives in the draft with its sentence intact and its
`**[MUST]**` marker gone. In its own words:

> A ledger counting `[MUST]` markers is satisfied in both cases; a diff of prose finds the
> sentence present in both documents; spec-as-code never sees it, because it is not a field. The
> only check that catches it compares **normative force**, and nothing proposed so far does.

The blind reader of `lineage-blind/` classified the demoted `UNCHECKABLE` passage as
*"Rationale — Non-normative"* without knowing the rounds existed, so a language model can do this
at least once. This asks whether one does it reliably enough to be worth building on.

## What is being tested

`jev-1.13` (TypeSafe), a "System One" model returning a structured choice with probabilities and
a confidence, is given `docs/specs/relay-lite-v0.12-draft.md` as state and asked, once per
passage, whether that passage **binds an implementation** or **describes**.

## The rule this test applies, stated before the run

A passage is **binding** if an implementation that did the opposite would be non-conforming.
A passage is **descriptive** if it states what is the case, what follows, or why a rule exists,
such that no implementation can violate it.

Stated first because §2 of `lineage-blind/CONTRACT.md` requires it, and for the same reason: a
rule adjusted after seeing which results it produces is a different rule, and the adjustment is
itself a finding.

## Two conditions

**Condition A — the document as written.** Markers present. This is what any real checker faces.

**Condition B — markers stripped.** Every `**[MUST]**` and `**[MUST NOT]**` removed from the
state, the sentences otherwise untouched. Condition A can be passed by reading labels; condition
B cannot.

## What each outcome would mean, written before the run

- **A marker-reader scores 9 of 10 in condition A.** Only item 9 (`§7.1`, force asserted in
  lowercase prose outside the marking convention) separates label-reading from force-reading
  there. This is pre-registered as the pilot's main weakness: **in condition A there is exactly
  one discriminating item**, and a good score there is close to no evidence.
- **Condition B is the real probe**, and its most likely outcome is a finding about the document
  rather than about the model. v0.12's normative sentences are written as bare noun phrases
  under a label — *"A consumer presents any linear projection as the causal history"*. Strip the
  label and several read as descriptions, or as assertions of the thing they forbid. **If the
  five marked passages flip to `descriptive` in condition B, that is evidence that v0.12's force
  lives in its labels and not in its language** — which would explain why a demotion is
  invisible, and would be a result about the specification, not a failure by the model.
- **A model that flags the substantively-covered Stage-1 passage (item 10) as binding** is
  over-flagging: the norm there lives in the adjacent `**[MUST NOT]**`, and `CANDIDATES.md`
  checked and cleared it.

## Known threats to this test, named before the run

1. **n = 10.** A pilot, sized to find out whether the instrument is in the right regime at all.
   Nothing here supports a rate.
2. **The questions are mine.** `relay-0799`: designing a checker's stopping conditions is
   authorship of its result. Whoever writes the question has written part of the answer, so this
   produces **candidates**, never verdicts, and goes under rule 14 like anything else.
3. **The key is not independent of the finder.** It is transcribed from `CANDIDATES.md`, which
   was written by hand before this experiment was conceived and without knowledge of it — the
   best available separation, and not a blind one.
4. **The documented failure mode lands on the target.** `jev-1.13`'s published jaggedness list
   includes being steered by *"text that argues for its own classification"*. Item 9 is a
   sentence asserting its own normativity. This is the sharpest item and the one the vendor
   predicts it will fail.
