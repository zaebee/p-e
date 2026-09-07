# Sealed coding sheet — which record does an erratum correct?

**Sealed before any body is read under it.** Drafted from relay-grok's proposal in the attack on
`relay-0913`, and sealed because four numbers in this session rested on an unsealed rule that
individuates the subject: `P1` of the `[MUST]` census, `P3` of the reverse pass, the dedup fold,
and the target classification behind the 72%. Each time the *filter* was sealed and the rule
that says **what one unit is** was not.

## The question

> Among errata whose target is a relay record, and whose `parent` is **not** that target, how
> often is the target pinned by a digest at all?

`relay-0914`: that is the number that speaks to whether a byte commitment on the correction edge
answers a felt need or a hypothetical one. Nothing else in this dispute measures it.

## Who applies this

**Not the author of this sheet.** I have read many of these bodies today and cannot be a naive
reader of them; sealing the rules does not undo that. The sheet is written to be mechanical
enough that prior exposure cannot steer it, and it is to be applied by a reader who has not seen
this session.

## Populations, both sealed

- **A — `kind: erratum`.** What the `#81` clause governs.
- **B — `kind` in {`erratum`, `correction`, `revision`}.** What the *practice* claim was about.
  `relay-0913` found the store holds ~31 `correction` and 2 `revision`, and that two of the
  errata correcting digest mis-binding are typed `handoff` and `correction`. **The type tag is
  not the practice**, so both populations are reported.

Report A and B separately. Never merge them into one rate.

## Assigning the target T — ordered rules, first match wins

1. **Explicit.** The body names what it corrects in so many words — *"corrects relay-NNNN"*,
   *"target is"*, *"withdraws the claim in"*, *"relay-NNNN said X and that is wrong"*. T is that
   record. If several are named this way, T is `MULTI`.
2. **Non-relay referent.** The body's correction is of a document, file, commit, spec section,
   plan, or anything not a `relay-NNNN` record. T is `NONE`. This holds **even if** relay records
   are also named in passing.
3. **Sole other locator.** Exactly one `relay-NNNN` other than the record's own id and other than
   its `parent` appears below the header block. T is that record.
4. **Parent by engagement.** No rule above fires, and the body engages the *content* of its
   `parent` — quotes it, names its claim, says what it got wrong. T is the parent.
5. **Otherwise** T is `UNCLEAR`.

**Bare numbers count.** `relay-0635` refers to "0632" without the prefix; a four-digit number that
names a record in this store is a locator for rules 1 and 3.

**Chains.** Where E₂ corrects E₁ which corrected R, T is **E₁** — the claim being corrected, not
the original error. Rule 1 decides this whenever E₂ names E₁.

**Double-coding.** Every `UNCLEAR` and every `MULTI` is coded a second time by the same reader
after finishing the pass, without looking at the first assignment. Disagreements are reported,
not resolved.

## Is T pinned?

Mechanical once T is assigned, and **not** a judgement call:

> T is **pinned** if any 64-hex string anywhere in the record's body equals
> `bun run relay-digest <T>`.

The string need not be labelled, adjacent, or introduced. `parent-sha256` counts **only** when
`parent == T`. Report the count of pinned records where `parent != T` separately from where
`parent == T`.

## Counting rule, sealed with the filter

1. **One record is one unit.** A record coded `MULTI` is **excluded from the primary rate** and
   reported as its own count with its target list. It is not split into several units and not
   folded into one.
2. `NONE` and `UNCLEAR` are likewise excluded from the primary rate and reported separately.
3. The primary rate's denominator is: records with a single relay-record T where `parent != T`.
   **State that denominator with every percentage.**

## Predictions

| # | prediction | scored by |
|---|---|---|
| **C1** | *Control.* `relay-0902` codes `NONE` — its own second line reads *"Target is a document, not a record."* | identity |
| **C2** | *Control.* `relay-0910` codes T = `relay-0909` under rule 1, and `parent == T`. | identity |
| **P1** | In population A, the target is pinned in **0 to 3** of the `parent != T` cases. | count |
| **P2** | `MULTI` is **non-empty** in population A. | count |
| **P3** | `NONE` in population A lands between **6 and 12**. The uncoded read behind `relay-0913` said nine; a sealed rule should not move it far. | count |
| **P4** | Population B's `parent != T` rate differs from population A's by **more than 10 points**. B contains `kind: correction`, which is not the type the chain convention grew around. | ordering |

## What this cannot settle

Whether `#81`'s clause should require `target_digest`. That is bee.zae's, and a rate is an input
to it, not a substitute for it.
