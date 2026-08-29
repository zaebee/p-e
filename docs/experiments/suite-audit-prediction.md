# Registered before the audit ran

Written 2026-08-29, before any auditor saw `docs/experiments/suite-audit/`, and
kept **outside** that directory so it is not in the bundle.

The catalogue registered a prediction in §9 *"stated now so it cannot be adjusted
afterwards"*, and it turned out to be both right and far too mild — it named three
casualties and got eight. This is the same device turned on the suite, by its
author, for the same reason: after an audit it is very easy to say *I knew that*,
and the only defence is having said it first where the date is not mine to set.

I am not telling the auditor any of this. Withholding it is the point; recording it
is what makes the withholding honest rather than convenient.

## What I expect to be found

**The bearing table is the weakest thing in the suite.** `bearing.ts` declares which
fields bear on which invariant, and I wrote it, for a reader I wrote, after knowing
which two checks were defective. Nothing derives it from the clause text. A hostile
reading is that it was fitted to the defects already known, and I cannot refute that
from inside. I expect this to be the first finding, and it should be.

**The clause re-implementation is a second reading by the same author.**
`clause.ts` implements I-3 and I-5 from the clause text — but I have read those
clauses perhaps forty times, and my reading of them is exactly what the suite is
supposed to be independent of. If the auditor's own reading of either clause differs
from mine, the suite is measuring my consistency rather than the reader's fidelity.

**The rationale rule matches phrasing, not meaning, and will miss the obvious case.**
`rationale.ts` triggers on words — *never*, *none*, *zero*. A reason that overclaims
without those words passes. I would expect a mutation to demonstrate this in one
line, and the header already concedes it, which means finding it is reading a
comment rather than the code.

**Only two invariants have clauses implemented.** `CLAUSE_KEYS` covers I-3 and I-5.
Seven do not, and the suite reports nothing about them at all — silence that a
reader could mistake for coverage. The bearing table covers four of eighteen
findings. Neither file says what fraction of the reader it inspects.

**`fields.ts` may still miss access paths.** The `getOwnPropertyDescriptor` trap was
added after `Object.values` was found to bypass `get`. I did not enumerate the other
ways to reach a property — destructuring, `JSON.stringify`, `structuredClone`,
`Reflect.ownKeys` with `getOwnPropertyDescriptors`, spread into a new object. I
looked for one hole and fixed one hole.

**The accounted-for lists are the same shape as the defect they track.** Every rule
carries a table of known divergences so it is not permanently red. Each entry is a
place where the suite reports nothing, and the entries were written by the party
whose work they excuse.

## What I do not expect, and would learn most from

That any of the four rules is wrong in the *direction of severity* — that something
it passes should fail on the corpus as it stands. My expectation is that the suite
is too narrow rather than too permissive, and if the auditor finds a false pass
rather than a gap, my model of my own work is wrong in a way none of the above
anticipates.

## How this gets scored

After the audit, compare its findings against this file. Anything here that the
audit missed is a defect the suite's author knew about and no independent reader
caught — which is a fact about the audit's power, not a credit to the author.
Anything the audit found that is not here is the thing worth having.
