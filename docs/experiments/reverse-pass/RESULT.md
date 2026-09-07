# Result — the reverse pass: what arrived at drafting

Predicates sealed in `PREDICATES.md` before any row was read. v0.12 pinned in `PIN.txt`;
thread at `d8cf3fdf08a90b9bf48dfc0eb4a34f5847bc9cabe9cb8a63a525dfbe7b62b00f`.

## The answer is zero

**`NO-ORIGIN` is empty.** Every obligation and every unmarked normative statement in the
population traces to a thread line. Within what this method can see, **the drafting invented
nothing.**

| class | count | lines |
|---|---|---|
| `BRACKETED-KNOWN` — excluded by rule 3 | 12 | 42, 46, 75, 79, 90, 93, 124, 126, 264, 276, 338, 341 |
| `AGREED` | 9 | 19, 20, 21, 23, 51, 252, 258, 294, 321 |
| `DESCRIPTIVE` | 8 | 7, 137, 288, 292, 325, 357, 363, 371 |
| `RESTATEMENT` | 1 | 293, of 292 |
| **`NO-ORIGIN`** | **0** | — |
| `EXTERNAL` | 0 | — |

## The nine, with their origins

| draft | statement | thread |
|---|---|---|
| 19 | invariant 1 — records immutable, corrections are new records | v0.1 §1 invariant 1, thread 12 |
| 20 | invariant 2 — order from the citation graph, not clocks | v0.1 §1 invariant 2, thread 13; quoted at 200 |
| 21 | invariant 3 — the causal graph is a partial order | 315-318, whose heading names **§1.2** as a target |
| 23 | invariant 4 — a reader's inability to see is not a defect | 1449, which calls it "the core epistemic invariant of `p-e`" |
| 51 | delivery metadata lives in the filename and is never hashed | 787-790 |
| 252 | a ruling is not a reading | 188, 236, 2074 |
| 258 | the three stages run in that order | 1445, 1475 |
| 294 | a verifier rejecting on an unheld parent rejects correct acts | 1461 — the demotion `#63` restores |
| 321 | evaluation is total | 1457 |

Even the rationale checks out: line 325's *"TypeScript's control-flow analysis does not narrow
across them"* is thread 1885 nearly verbatim.

## The invariant list changed size in both directions

**v0.1 §1 carried three invariants. v0.12 carries four.**

- **One left.** v0.1's invariant 3, the separation of the four epistemic acts, is gone —
  deletion-log row 8, issue `#106`.
- **Two arrived.** The partial order and the reader-gap rule are invariants in v0.12 and were
  not invariants in v0.1.

**Both arrivals have thread backing**, which is why they are `AGREED` and not `NO-ORIGIN`: round
315's heading names `§1.2` as a target, and thread 1449 uses the word *invariant* itself. The
promotion was proposed, not smuggled. But note the asymmetry: **the departure has an issue and
the arrivals have none**, because nothing looks for what arrived.

## Scoring

| # | predicted | outcome |
|---|---|---|
| **C1** | 258 → `AGREED` | ✅ |
| **C2** | 23 → `AGREED` | ✅ |
| **P1** | `NO-ORIGIN` between 1 and 5 | ❌ **0** |
| **P2** | ≥1 of §1's four invariants `NO-ORIGIN` | ❌ all four have origins, including their status as invariants |
| **P3** | `NO-ORIGIN` concentrates in §1 and §7 | **unscoreable** — the class is empty |
| **P4** | `DESCRIPTIVE` is the largest class | ✅ 8 of 18 |

Two failed, one unscoreable, three held. I expected drafting to have invented something and it
had not.

## What this licenses, and what it does not

`relay-0903` claimed *"losses run one direction only"* from a pass that could not test it;
`relay-0905` withdrew that. A pass built for it now returns zero — **so the claim is supported,
at the scope this method has and no wider.**

That scope was named before the run and has not moved: v0.12 states requirements in the
declarative present — *"Producers mint canonical wire bytes"*, *"a consumer needing a flat
presentation deduplicates first"* — and **an obligation phrased with none of the sixteen words
is invisible to this extraction.** Zero `NO-ORIGIN` in 28 lines is not zero `NO-ORIGIN` in
v0.12.

The population rule is mechanical, not complete. That is the thing to attack.
