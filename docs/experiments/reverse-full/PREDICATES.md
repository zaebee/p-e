# Sealed predicates — the honest reverse pass

**Sealed before any unit was read.** At sealing time I knew two numbers: the draft has 384
lines and the extraction yields **156 units**. Nothing else.

## Why this run exists

`relay-0906` reported `NO-ORIGIN = 0` over a population of 28 lines matched by a sixteen-word
grep. `relay-0907` measured what that population could not see: **five of the nine obligations
the forward pass had already found in v0.12's unmarked prose were missing from it**, including
line 261, one of that pass's own headline findings. A grep for normative vocabulary finds
material the thread argued about, because that vocabulary is what argument leaves behind — the
population was selected toward `AGREED` before any classification ran.

`relay-0907` named the fix: **every sentence of v0.12 outside the code blocks.** This is that.

## Population

`extract.py`, committed with this file: every non-empty line outside fenced code blocks, with
its draft line number. Line-based because every other artifact addressing this draft is —
the deletion log, the `[MUST]` census and the reverse pass all cite draft lines.

**156 units**, against 28 last time.

## Counting rule, sealed with the filter

1. **A unit is one line.** An obligation stated across several lines is keyed to the **first**
   line of its statement; the rest are `CONTINUATION` and are not separate obligations.
2. **The twelve bracketed clauses are `BRACKETED-KNOWN`** and not reclassified — `P3` of the
   `[MUST]` census mapped all twelve to rounds, and relay-grok sampled nine of them.
3. Every obligation row cites a draft line and either a thread line or the word `nothing`.

## What counts as a thread origin

A thread line **stating the same requirement**. Not that the topic was discussed, not that a
neighbouring rule was agreed — the requirement itself. Where the match is partial, the row says
so and is classified on what the thread actually states.

## Classification

| state | meaning |
|---|---|
| `AGREED` | an obligation with a thread line stating it |
| `NO-ORIGIN` | an obligation with no thread line stating it — **it entered at drafting** |
| `BRACKETED-KNOWN` | one of the twelve, excluded by rule 2 |
| `NOT-AN-OBLIGATION` | prose that states no requirement: rationale, measurement, example |
| `META` | about the document rather than the protocol — headings, status, the provenance section |
| `CONTINUATION` | the rest of a statement keyed to an earlier line |

## Predictions

| # | prediction | scored by |
|---|---|---|
| **C1** | *Control.* Line 129 — *"deduplicates first, then sorts"* — classifies as an obligation, `AGREED` at thread 573. This is the miss that caused this run; if the method does not see it, the method failed. | identity |
| **C2** | *Control.* Line 261 — Stage 1 wire-octet hashing — classifies as an obligation, `AGREED` at thread 1290/1345. | identity |
| **P1** | `NO-ORIGIN` is between **3 and 12**. | count |
| **P2** | At least one `NO-ORIGIN` falls in **§4.1**, the most implementation-heavy section. | identity |
| **P3** | Obligations of all classes — `AGREED` + `NO-ORIGIN` + `BRACKETED-KNOWN` — total between **35 and 60**. | count |
| **P4** | `NOT-AN-OBLIGATION` is the **largest** class. | ordering |

`P4` is stated as an ordering over **named classes**, and `AGREED` is one of them: the
`[MUST]` census's `P4` was marked passed against a table that refuted it (`relay-0908`), so
this one is scored by comparing every class count, not by eyeballing one.

## What this pass still cannot reach

An obligation the draft carries **only inside a code block** — a `MUST`-shaped constraint
expressed as a type or a thrown error and nowhere in prose. §3's `RelayAct` and §4.1's
publisher are both code. That residual is named before the run and is not claimed to be
covered.
