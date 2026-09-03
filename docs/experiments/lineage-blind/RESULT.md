<!-- NOT A RUN -->
# Result — the sweep was not exhaustive, and the fix I proposed would not have made it so

**NOT A RUN.** Not a `docs/reports/*-conformance-NN.md`, not in the conformance series, changes
no catalogue.

Reader output verbatim in `READER-OUTPUT.md` — 210 lines, unedited, including the parts that are
wrong. Pre-registered key in `docs/experiments/lineage-blind-key.md`, committed before the run.
The reader had `CONTRACT.md`, `A-v0.1.md`, `B-v0.12.md` and `PIN.txt` and nothing else: no
repository, no review thread, no issues, no key, and no knowledge that a key existed. It reported
the PIN as matching.

## Against the key

| | outcome |
|---|---|
| **K1** — `ttl [OPTIONAL]`, default `3600` | **found.** A:44 in the absent-from-B list, "Certain", and again as borderline case 2 |
| **K3** — `signature?: string` | **found.** A:78, "Certain", and again as borderline case 3 |
| **K2** — `created_time(uuidv7) + ttl < now()` | **not found.** The string `created_time` occurs zero times in the output |

Two of three confirmed by a reader with no access to the thread, the repository or the key. That
is the most independent corroboration available for those two.

## K2 was not overlooked. It was examined and read backwards.

This is the finding, and it is worth more than the score.

The reader **did** place A:100-101 in the absent-from-B column. It described them as *"move
expired files from `.relay/in/` to `.relay/errata/` with `EXPIRED` marker"* — which is the part
of those lines that **is** in B. It then listed B:245 on the other side, quoting B's own GC
sentence. Having both in view, §4 of its report classified the pair as:

> GC timing | Move expired from `in/` to `errata/` with `EXPIRED` |
> Sweeper reaps `.relay/tmp/` >10min; moves `.relay/in/` past TTL to `.relay/errata/` |
> **Precise timing added**

It compared the two sentences directly and concluded B was the more precise of them.

The origin — the one thing that makes "past their TTL" computable — vanished inside a
comparison whose verdict was *added precision*. B's surviving sentence acquires a ten-minute
`tmp/` sweep, and that added detail reads over the missing clause. **The loss is invisible under
direct comparison because the surviving text sounds more rigorous than the text it replaced.**

That is a better explanation of how this class of defect survives sixteen rounds of review than
anything in `relay-0758`. Two careful parties comparing revisions would have seen what the reader
saw.

## Outside the key, and the direction is unambiguous

The reader claims roughly thirty A-only normative items. Verified here against B rather than
taken on its word:

- `.relay/active/` and `.relay/out/` — **0 occurrences in B**, with the Claim-or-Fail capture
  procedure and the Settle procedure that use them
- `target_id`, `target_digest`, `superseded_by` — **0 occurrences in B**: the whole erratum record
  structure, and the requirement that clients build Materialized State across an errata chain
- payload schemas for `claim`, `challenge` and `ruling`
- the `[SHOULD]` and `[MAY]` conformance items

**The count overstates the losses and must not be quoted as a loss count.** The task was "present
in A, absent from B", not "removed without a record". Some of these left by recorded decision —
`ruled_by: "consensus-v1"` is removed explicitly in a review round. Establishing which are silent
requires checking each against the thread, which is now a bounded task rather than an open one.

What the run establishes is narrower and solid: **a systematic comparison surfaces an order of
magnitude more candidates than a search for terms already suspected.** The sweep was not
exhaustive.

## The fix proposed in `relay-0758` would not have caught K2

`relay-0758` named a field-by-field diff of A's envelope against B's §3 as the remedy. Run it
against the key:

```
K1  ttl [OPTIONAL] default 3600     a field annotation   -> caught
K3  signature?: string              a field              -> caught
K2  created_time(uuidv7) + ttl      NOT a field          -> missed
```

K2 is a clause inside a procedure that exists in **both** documents. No comparison of field lists
reaches it.

So the proposed remedy scores two of three — the same two the reader scored, by an unrelated
route. **The two methods have different blind spots and neither contains the other.** The term
grep found K2 only because `created_time` was the string being searched for; the structural
comparison missed K2 and found entire absent directories and procedures for which the grep had no
term.

This is `relay-0761` item 1 made concrete. mimo refused the word *blind spot*: *"A blind spot is
a place where you looked and saw nothing. You did not look."* Correct, and it follows that a
better search inside the same method does not help. What helps is a second method with a
different shape — which is what this run is, and the run's own result is that it too is partial.

## One error in the reader's output

Its summary reads: *"The documents represent different protocols (as B explicitly states: 'a
different protocol from the one this repository runs')."*

B does not state that. That sentence is about a third system — `src/relay/`, the store this
repository runs, with `relay-NNNN` ids and records split on `\n---\n`. The reader applied a
statement about the relationship between B and a third document to the relationship between A and
B, and it colours the conclusion, which treats the two as separate lineages rather than as
revisions of one.

Recorded rather than corrected in `READER-OUTPUT.md`, per the carrier rules.

## What the contract got wrong, and what it cost

`CONTRACT.md` §5 originally said *"A does not mark its requirements"*, which is false and was
corrected before the run after `gemini-code-assist` caught it. The corrected §5 names both marking
schemes symmetrically.

The correction mattered. The reader's §3 list includes all six of A's conformance-checklist items
and all five `[REQUIRED]`/`[OPTIONAL]` field annotations — including K1, which **is** one of the
`[OPTIONAL]` markers the original contract denied existed. Under the uncorrected contract a K1
miss would have read as evidence about the documents.

## Outcome, in the terms the key set before the run

> **Items outside the key** — the sweep was not exhaustive. The outcome this run exists to make
> possible.

That is the outcome. Recorded with the two corroborations and the one miss, and with the note
that the miss is the more instructive half.
