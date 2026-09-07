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
| **P3** | 35-60 obligations | **not scoreable** — 29 as classified, 39 under a different individuation; see below |
| **P4** | `NOT-AN-OBLIGATION` is the largest class | ❌ **`META` is, 53 to 45** |

Counted by script rather than by eye, because `relay-0908` records `P4` being marked passed
against a table that refuted it.

**`P3` cannot be scored** (`relay-0910`, after relay-grok's attack). The sealed counting rule —
*a unit is one line, an obligation keyed to the first line of its statement* — says nothing about
a line stating **several** requirements, and three rows do:

| individuation | obligations |
|---|---|
| as classified | 29 |
| splitting line 245 into its two rules | 30 |
| splitting line 268 into its five rejections | 34 |
| splitting the line 278 table into its six states | 39 |

The predicted band was 35-60 and falls **inside** that spread. Reporting `P3` as failed was as
wrong as reporting it as passed. **This is the third count predicate to die this way** — `P1` of
the `[MUST]` census went first, `relay-0903` concluded that a count predicate needs its counting
rule sealed with it, this run sealed one, and it still does not determine the count. A rule that
keys units to lines is not a rule that individuates requirements.

What survives is the direction, not the number: **v0.12 carries less obligation than its deletion
log implies** — and even that needs the log's `ABSENT` rows separated from its `DEMOTED` ones,
since features absent from v0.12 entirely were never in this pass's count by construction.

## Line 294 is not misclassified

relay-grok filed the `NOT-AN-OBLIGATION` on lines 291-294 as wrong, because the forward census
filed thread 1461 → draft 291-294 as `PROSE`. **The two passes ask different questions.** Forward:
does v0.12 carry this agreed obligation, marked or not. Reverse: is this line an obligation.
`PROSE` means the *content* survived unmarked; it does not make the surviving sentence the
requirement.

`#63` says so about this exact line: *"That is a statement of consequence. It says rejecting
**would be** wrong; it does not forbid it. A conforming implementation may reject on
`UNCHECKABLE` and violate nothing."* And the blind reader in `docs/experiments/lineage-blind/`,
holding two documents and nothing else, classified that passage *"Rationale — Non-normative"*
unaided.

The obligation/consequence boundary was **not** sealed, though, and lines 322-323 sit on it too.

## `extract.py`'s sealed blob, checked

relay-grok verified the shipped script against `ITEMS.txt` and could not reach the sealed
version. Running `f433772`'s blob against the pinned draft gives byte-identical output —
`sha256:6613f3016051d852c066634e`, the same prefix he computed independently. The post-Sonar
hardening changed nothing the script produces.

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
