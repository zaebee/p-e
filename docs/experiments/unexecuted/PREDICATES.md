# Sealed predicates — the `UNEXECUTED` sweep

**Sealed before any item was classified.** At sealing time I knew the population's
size — 48 — and the first and last few headings, nothing more. Thread pinned in
`PIN.txt`; v0.12 at `sha256:5f8974a21fa03f0cc488eb9d7999e1fa2d232717d2e0916aa400f4785495c073`.

## Why this run exists

`relay-0922` added a fourth shape to the deletion log. The first three — `ABSENT`,
`DEMOTED`, `REDEFINED` — all measure v0.12 against **v0.1**. `UNEXECUTED` measures
it against **the review's own resolutions**, and that axis had never been swept:

> Row 26 is one instance found sideways, and one instance is not a census.

It was found by the code-block pass asking a different question. Nobody has asked
this one.

## Population

`extract.py`, committed with this file: every `### <n>. <text>` heading falling
after thread line 149, which is where the v0.1 specification body ends. The cut
is stated rather than inferred — v0.1's own `### 2.1.` and `### 2.2.` match the
same shape without being anything a round resolved.

**48 items.**

## Counting rule, sealed with the filter

Four count predicates have died in this session because the filter was sealed and
the rule that individuates the subject was not — `relay-0903`, `relay-0908`,
`relay-0910`, `relay-0914`. So:

1. **One heading is one unit.** Its resolution is whatever the block under it
   commits to, up to the next heading.
2. **A heading committing to several independent things is `MULTI`** — excluded
   from the primary count and reported with its list. This is the escape the four
   dead predicates lacked.
3. **Every row cites a thread line and a v0.12 line, or the word `nothing`.**
4. Every rate states its denominator.

## Classification

| state | meaning |
|---|---|
| `EXECUTED` | v0.12 reflects what the round resolved |
| `UNEXECUTED` | the round resolved it and v0.12 does not reflect it |
| `SUPERSEDED` | a later round replaced it, and that round is cited |
| `NOT-A-RESOLUTION` | the heading commits to nothing — a retrospective, an acknowledgement, a summary |
| `MULTI` | several independent commitments under one heading |

**`UNEXECUTED` requires that nothing later withdrew it.** A resolution a later
round reversed with a record is `SUPERSEDED`, and the distinction is the whole
finding: row 26 exists because round 1's elimination of `errata/` was **never**
revisited in the 1,957 lines after its endorsement.

## Predictions

| # | prediction | scored by |
|---|---|---|
| **C1** | *Control.* The round-1 item resolving to eliminate `.relay/errata/` (thread 250) codes `UNEXECUTED`. It is deletion-log row 26 and was found independently. | identity |
| **C2** | *Control.* `### 2. Envelope ID Cross-Check` (thread 251) codes `EXECUTED` — v0.12 line 46 carries it, and `#67` records it as the one cleanup that landed. | identity |
| **P1** | `UNEXECUTED` lands between **2 and 8**. One is known; a whole axis nobody swept should hold more, and 48 items over sixteen rounds bounds it above. | count |
| **P2** | At least one `UNEXECUTED` is **not** already a deletion-log row. The log has 26 rows built on a different axis, so an item it never had a shape for should exist. | count |
| **P3** | `NOT-A-RESOLUTION` is smaller than `EXECUTED`. Most headings in a response round commit to something. | ordering |
| **P4** | The last two rounds — thread 2208 onward — contribute **zero** `UNEXECUTED`, because they are retrospective rather than resolving. | identity |

**`P1` is a real prediction and my count predicates have a record.** Six sealed
runs, ten controls held, and 6 of 23 substantive predictions correct. A fourth
consecutive miss on a count would be a finding about the predictor.

## What this pass cannot reach

A resolution stated in prose without a `### <n>.` heading. The rounds are
structured, but a commitment made in a paragraph between headings has no row
here. Named before the run and not claimed as covered.
