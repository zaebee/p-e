# Sealed predictions — recoding six records under CODING-SHEET-v2

Written before reading any prose. Evidence available to me at seal time: the coding sheet
v2 (`docs/experiments/target-coding/CODING-SHEET-v2.md` on `main`) and the header block of
each of the six records (`from`, `to`, `parent`, `parent-sha256`, `kind`, `date`). I have
deliberately *not* read the parents' headers either, nor `relay-0916`/`relay-0917`, nor any
v1 output. Nothing below the blank line of any of the six has been read.

## What I know at seal time

| record | from | parent | kind |
|---|---|---|---|
| relay-0489 | bee.claude | relay-0488 | erratum |
| relay-0522 | relay-mimo | relay-0520 | correction |
| relay-0532 | relay-mimo | relay-0531 | correction |
| relay-0546 | relay-mimo | relay-0543 | correction |
| relay-0587 | relay-mimo | relay-0586 | erratum |
| relay-0613 | relay-mimo | relay-0591 | erratum |

All six carry a `parent-sha256`. Five of six are deposited by `relay-mimo`; one by
`bee.claude`. Every parent is a lower-numbered record, and in five of six cases the
immediately preceding record; `relay-0613`'s parent (`relay-0591`) is 22 back.

The sheet tells me this subset is the "acknowledgement genre" defect 1 describes: X corrects
Y, Y deposits an acknowledgement whose `parent` is X but whose real subject is Y's *own*
earlier record. It does not tell me which of the six actually fit that shape, and I treat the
sheet's framing as a hypothesis about the set, not as data about any row.

## Predictions

**P1 — step A codes.** `SELF` on **5** of 6; `NONE-CORRECTED` on **1**; `OTHER` on 0;
`ARTIFACT`, `CLASS`, `MIXED` on 0.
*Wrong if:* any record's body corrects a claim made by a party other than its own depositor
(→ `OTHER`); or if the "acknowledgement" label is literal for more than one of them and they
correct nothing (→ more `NONE-CORRECTED`); or if any turns out to correct a spec/commit rather
than a record (→ `ARTIFACT`). I am least confident about `relay-0489`: it is the one record
with a different author and the only one whose `to:` list omits a `bee.`-prefixed self, so it
may not belong to the same genre as the five mimo rows.

**P2 — `parent == T`.** **1** of 6.
*Wrong if:* the genre hypothesis is false for these particular rows and the bodies really do
correct their parents (→ up to 6); or if step B rule 2 ("addressed", target normally the
parent) fires more widely than I expect because the bodies phrase self-correction as a reply
to the corrector rather than as a statement about their own earlier record (→ 3 or more).
I expect rule 1 (explicit id) to be the dominant firing rule, precisely because a record
correcting a record other than its parent has to name it.

**P3 — target pinned.** **1** of 6.
*Wrong if:* the mimo-deposited records habitually quote the digest of the record they correct
(→ 4 or more). The sheet's pin test only lets `parent-sha256` count when `parent == T`, so by
P2 at most one row can be pinned via the header; every other pin must come from a 64-hex
string in the prose. My expectation is that self-errata cite an id, not a digest.

**P4 — step B rule distribution, over the rows that reach step B (5 by P1):**
rule 1 (explicit) 4, rule 2 (addressed) 1, rule 3 (sole distinct locator) 0, `UNCLEAR` 0,
`MULTI` 0.
*Wrong if:* any body names two or more records as wrong/withdrawn/superseded under the sealed
`MULTI` bar — `relay-0546`'s parent is `relay-0543`, which the sheet itself cites as a
record correcting both a record and a document, so `relay-0546` is where I would expect a
`MULTI` to appear if one does.

**P5 — `PIN-AMBIGUOUS`.** **0** of 6.
*Wrong if:* any target is one of `relay-0497`/`relay-0521`, `relay-0537`/`relay-0539`, or
`relay-0738`/`relay-0739`/`relay-0740`. `relay-0522`'s neighbourhood makes `relay-0521` a
live possibility and `relay-0532`'s makes `relay-0537`/`relay-0539` one, so this is the
prediction I hold most loosely.

**P6 — direction, the thing v2 exists to record.** In **5** of 6 rows the correction runs
*backwards to the depositor's own earlier record*, not to the parent. This is P1 and P2
restated as the substantive claim; if P1 and P2 both hold but for different rows than I
expect, I count P6 as failed.

## What I am not predicting

Not a rate. The sheet forbids a v2 headline (§1 of its opening), and six rows would not
support one anyway. These predictions exist to be scored against my own coding, and the
result worth reporting is the pattern of disagreement, not a number.
