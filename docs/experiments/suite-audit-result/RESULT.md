# Suite audit — result

2026-08-29. Mistral (`vibe`), run locally against `docs/experiments/suite-audit/`
only, with no network and no git history. Contract by bee.zae; the suite's author
wrote none of the questions and did not see the report until it was written.

Its verdict: **the suite is not fit for purpose.** Four questions, all `VIOLATES`,
and four attack methods.

`AUDIT_REPORT.md` and `AUDIT_FINDINGS.md` are the auditor's output, unedited.

---

## What was verified rather than accepted

### The four attacks were expectations. They are now measurements.

The report states each attack's outcome as *"Expected result: Suite passes"*. Each
was executed on a scratch copy — the auditor's own mutation, applied literally,
nothing chosen or reinterpreted.

| attack | mutation | conformance suite | full test suite |
|---|---|---|---|
| 1 | `i2` verdicts forced to `CONFORMS` | **20 passed** | 10 failed |
| 2 | `i1` stops reading the hivemark verdict field | **20 passed** | 7 failed |
| 3 | `i6` always returns `CONFORMS` | **20 passed** | 11 failed |
| 4 | `i7` returns `EXCLUDED_WITH_REASON` | **20 passed** | 8 failed |

**The auditor is right about the conformance suite.** It stays green on every one.
All four attacks succeed against the thing it was asked to audit.

### And about the thing it could not see, it is overstated — through my fault

The bundle contained `tests/reader-conformance.test.ts` and
`tests/settled-rulings.test.ts`. It did not contain `tests/i1.test.ts` through
`tests/i9.test.ts`, which assert these verdicts directly and which catch all four
mutations.

So the auditor assessed the conformance suite **as if it were the only guard**,
because that is the only guard it was shown. The report's *"false sense of
security"* is a fair reading of what it had and an unfair one of the project.

That is a packaging decision of mine shaping an audit's severity — the sixth time
in this project that curation has decided an outcome, and the first time in the
direction of harshness toward my own work rather than leniency. The correction
belongs here rather than in the auditor's report, which is accurate about its scope.

### A-1 is real, and it is the finding

> *"`parseHivemark` is not wrapped. Every check that reads hivemark artifacts has
> its field access completely invisible to the conformance suite."*

Confirmed by inspection: `reader-conformance.test.ts:44-47` mocks
`../src/adapters/apex.js` and nothing else. `i1.ts:17` calls `parseHivemark`
directly, and no hivemark field appears in anything the watcher records.

The field rule — the suite's first and best rule, written specifically because
file-level coverage missed two defects — is blind to one of the two producers
entirely.

---

## Scored against the prediction registered before the audit ran

`docs/experiments/suite-audit-prediction.md`, committed before the bundle was
handed over.

### Found, and predicted

| finding | prediction said |
|---|---|
| A-3 bearing table incomplete | *"the weakest thing in the suite… nothing derives it from the clause text"* |
| B-1 only 2 of 18 clauses | *"CLAUSE_KEYS covers I-3 and I-5. Seven do not"* |
| D-3 coverage fractions | *"neither file says what fraction of the reader it inspects"* |
| D-4 accounted-for lists | *"entries were written by the party whose work they excuse"* |
| A-4 `ownKeys` gap | *"I looked for one hole and fixed one hole"* |

### Found, and **not** predicted

**A-1 — `parseHivemark` is not instrumented at all.** I predicted the watcher might
miss exotic access paths: destructuring, `JSON.stringify`, `structuredClone`. The
actual hole is far cruder and far larger — an entire producer with no instrumentation
whatsoever, sitting in the file I had already fixed once and inspected closely.

I looked for subtle escapes from a mechanism and did not check whether the
mechanism was attached to both inputs.

**C-2 — `UNDECIDABLE` usage is never tested**, only `EXCLUDED_WITH_REASON`.

### Predicted, and **missed** by the audit

**The clause re-implementation is a second reading by the same author.** The report
treats `clause.ts` as authoritative — *"the clause re-implementation correctly
returns CONFORMS"* — and never asks whose reading of the clause it encodes. That is
the deepest weakness in the suite and an independent auditor is the only party who
could have tested it, by reading the clause themselves and comparing. It went
unremarked.

**The rationale rule matches phrasing, not meaning.** `rationale.ts` triggers on
*never*, *none*, *zero*. A reason that overclaims without those words passes. Not
mentioned anywhere in the report.

---

## What this settles

The audit is worth what it cost and its central finding is one I had missed.
Everything it found is a **gap in scope**: things the suite does not attempt. Its
own summary says so — *"not bugs in the suite's code, but gaps in its scope"*.

Nothing it found is a **false pass** — a case where a rule the suite does run
accepts something it should reject. My prediction named that as the outcome I would
learn most from, and it did not occur.

Which leaves the honest reading: **the suite does what it claims, over a quarter of
what it should, and says so nowhere.** Four of nine invariants for field coverage,
two of eighteen for clause agreement, three of eighteen for evidence, one producer
of two instrumented. Every one of those numbers is in the auditor's report and none
is in the suite's own output.

And the two weaknesses that require reading the clauses rather than counting the
tables — whose reading `clause.ts` encodes, and whether `rationale.ts` matches
meaning — survived an independent audit. They are still open, and the party that
flagged them is the party that cannot settle them.
