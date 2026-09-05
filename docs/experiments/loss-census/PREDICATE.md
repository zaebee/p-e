# Predicate, fixed before looking

Written before any comparison was run, so that what counts as a loss cannot be tuned to what
the comparison happens to find. Six instances of this class are already known — #37, #51, #60,
#61, #63, #81 — and every one was found by accident or by a targeted search for something else.
#51 prescribes the method that finds them without knowing what to look for, and nobody has run
it.

## What is compared

- **Source:** `docs/sources/issue-5-thread.txt`, the frozen v0.1 proposal and its sixteen review
  rounds, 2262 lines.
- **Target:** `docs/specs/relay-lite-v0.12-draft.md`, 384 lines.

## The unit

One **commitment**: anything the source either states as part of the protocol or agrees during a
round. Three strata, because the six known instances span all three and an envelope-only sweep
would have missed four of them:

1. **Envelope members** — fields of the act, with their types and optionality.
2. **Normative clauses** — anything phrased as MUST, MUST NOT, SHOULD, or agreed in a round as a
   requirement.
3. **Structural units** — numbered sections and the mechanisms they carry.

## The classification, decided now

Each commitment lands in exactly one:

| verdict | meaning |
|---|---|
| `PRESENT` | reached v0.12, recognisably, with its force intact |
| `CHANGED-WITH-RECORD` | reached v0.12 altered, and a round records the alteration |
| `CHANGED-NO-RECORD` | reached v0.12 altered, and no round records it |
| `DEMOTED` | reached v0.12 with its normative force removed — a MUST or MUST NOT surviving as prose |
| `ABSENT-WITH-RECORD` | did not reach v0.12, and a round records the removal |
| `ABSENT-NO-RECORD` | did not reach v0.12, and no round records the removal |

**The class under census is `ABSENT-NO-RECORD` and `DEMOTED` and `CHANGED-NO-RECORD`.** The other
three are the healthy outcomes and are counted so the denominator exists.

## What counts as "a round records it"

A line in the thread that proposes, argues for, agrees to, or notes the removal or alteration.
**A mention of the same word about something else does not count** — #51 turned on exactly that
distinction: `signature` occurs twice in the thread, and the second occurrence is about
`settled.ts` in this repository, not the envelope field.

## What this method cannot find, stated before it is run

- A commitment made **outside** the frozen thread — in a channel this file does not have.
- A commitment that reached v0.12 **weakened in wording** rather than removed or demoted, where
  the weakening is a matter of reading rather than of marking.
- Anything the source itself failed to state that should have been stated. This census measures
  loss between two documents; it does not measure what neither contains.

## Who ran it

bee.claude, who is also the editor of v0.13 under #53 and therefore has an interest in the
answer. The predicate above is fixed in this file, committed before the results, so the
classification cannot be moved to fit them.
