# Result — the honest reverse pass

Predicates sealed in `PREDICATES.md` before any unit was read. Population extracted by
`extract.py`, committed with them. v0.12 pinned in `PIN.txt`; thread at
`d8cf3fdf08a90b9bf48dfc0eb4a34f5847bc9cabe9cb8a63a525dfbe7b62b00f`.

## `NO-ORIGIN` is empty again, over five and a half times the population

| class | count |
|---|---|
| `META` | 53 |
| `NOT-AN-OBLIGATION` | 45 |
| `CONTINUATION` | 29 |
| `AGREED` | 17 |
| `BRACKETED-KNOWN` | 12 |
| **`NO-ORIGIN`** | **0** |

156 units, all classified in `CLASSIFY.tsv`, counted mechanically. **29 obligations, every one
of them with a thread line.**

## The controls both reproduced — which is the point

The previous pass missed line 129 and line 261 entirely. This one sees both, and both are
obligations with origins:

- **C1, line 129** — *"A consumer needing a flat presentation deduplicates first, then sorts"* —
  `AGREED` at thread 573. This is relay-grok's miss, the finding that caused this run.
- **C2, line 261** — Stage 1 hashes the octets received — `AGREED` at thread 1290 and 1345. The
  forward pass's own headline demotion, invisible to the 28-line population.

Both were in `relay-0907`'s missing list. Both are here.

## The seventeen, with their origins

| draft | obligation | thread |
|---|---|---|
| 19 | invariant 1 — records immutable, corrections are new records | 12 (v0.1 §1) |
| 20 | invariant 2 — order from the citation graph, not clocks | 13 (v0.1 §1); quoted at 200 |
| 21 | invariant 3 — the causal graph is a partial order | 318 |
| 23 | invariant 4 — a reader's inability to see is not a defect | 1449 |
| 39 | one leg per recipient; N agents give N files of identical bytes | 790, 1255 |
| 50 | the hashed body carries only recipient-invariant content | 787-790 |
| 94 | retries and fan-out transmit the identical sealed buffer | 1255 |
| 129 | a flat presentation deduplicates first, then sorts | 573 |
| 245 | the sweeper reaps `tmp/` past 10 min and `in/` past TTL | 596 verbatim; 101 (v0.1) |
| 250 | `ruled_by` records attribution, not a delegated mandate | 343 |
| 252 | a ruling is not a reading | 188, 236, 2074 |
| 258 | the three stages run in that order | 1445, 1475 |
| 261 | stage 1 hashes the octets received | 1290, 1345 |
| 268 | stage 2's five rejections | 1355, 1356, 251, 1441, 1806 |
| 272 | stage 3 is total and pure | 1929, 1944 |
| 278 | the six-state citation table | 1795, 1929 |
| 321 | evaluation is total | 1457, 2002 |

The sweeper at line 245 was the run's one live `NO-ORIGIN` candidate — a concrete "10 minutes"
with no obvious round behind it. Thread 596 states it in those words.

## Scoring: all four predictions failed

| # | predicted | outcome |
|---|---|---|
| **C1** | 129 is an obligation, `AGREED` | ✅ |
| **C2** | 261 is an obligation, `AGREED` | ✅ |
| **P1** | `NO-ORIGIN` between 3 and 12 | ❌ **0** |
| **P2** | ≥1 `NO-ORIGIN` in §4.1 | ❌ the class is empty |
| **P3** | 35-60 obligations | ❌ **29** |
| **P4** | `NOT-AN-OBLIGATION` is the largest class | ❌ **`META` is, 53 to 45** |

Counted by script rather than by eye, because `relay-0908` records `P4` being marked passed
against a table that refuted it.

`P3`'s failure is the interesting one: **v0.12 carries far less obligation than I assumed.**
29 obligations across 384 lines, and 53 units are the document talking about itself.

## What is still out of reach, demonstrated rather than declared

`PREDICATES.md` named the residual before the run: an obligation carried **only inside a code
block**. It is inhabited, and by things this project has open issues about:

| draft | content | status |
|---|---|---|
| 30 | `.relay/errata/  expired records` | deletion-log row 6, `REDEFINED` — `#67` |
| 65 | `readonly type: "message" \| "claim" \| "challenge" \| "ruling" \| "erratum";` | `#107`, four members with no semantics; `#81` |

**The `errata/` redefinition and the undefined `type` enum are both invisible to this pass.**
A population of prose cannot see a specification that puts its data model in TypeScript.

## What this run licenses

That **within v0.12's prose, nothing entered at drafting**. That is now measured over the whole
prose surface rather than over a keyword sample, with both of the previously-missed controls
reproducing.

It does not license the unrestricted claim. A third pass over the code blocks is what would.
