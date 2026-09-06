# Sealed predicates — the `[MUST]` set that #63 says nobody checked

**Sealed before any classification.** Thread pinned at
`d8cf3fdf08a90b9bf48dfc0eb4a34f5847bc9cabe9cb8a63a525dfbe7b62b00f`
(`docs/sources/issue-5-thread.txt`, 2262 lines). Population extracted mechanically
into `ITEMS.txt`: **all 55 occurrences of the word `MUST`**, by `grep -n '\bMUST\b'`.

## The question

`#63` closed half. Its second half:

> the same pass should ask which other agreed requirements are sitting in v0.12 as
> unmarked prose. Only the `[MUST NOT]` set has been checked. **The `[MUST]` set has not.**

Direction is thread → draft. `norm-census` ran draft → fix and censused v0.12's own
twelve clauses; it does not answer this.

## Subject filter, applied first

An occurrence enters the census only as **an obligation proposed for this
specification**. Excluded, with the exclusion recorded per row:

- **HEADING** — the word appears in a section title.
- **QUOTE** — a restatement of an obligation already counted at an earlier line.
- **ABOUT** — the sentence argues *about* an obligation rather than stating one.
- **EXTERNAL** — the obligation belongs to another work (RFC 8785, RFC 7493, Kulkarni).
- **ISSUE-1** — the obligation is `issue-1`'s, not the draft's.

## Classification, applied to what survives

| state | meaning |
|---|---|
| `MARKED` | v0.12 carries it as a bracketed `[MUST]` or `[MUST NOT]` |
| `PROSE` | v0.12 carries the content with no marker — the `#63` shape |
| `ABSENT` | v0.12 does not carry it |
| `SUPERSEDED` | withdrawn or replaced, with a record in the thread saying so |

Every row cites a thread line and a v0.12 line, or the word `nothing`.

## Predictions

| # | prediction | scored by |
|---|---|---|
| **C1** | *Control.* Thread line 145 — atomic publication — classifies `PROSE`. Known independently via `#103`. If the method misses it, the method is broken. | identity |
| **C2** | *Control.* Thread line 144 — filename conformance — classifies `PROSE`. Known independently via `#104`. | identity |
| **P1** | After the subject filter and dedup, **15 to 25** distinct obligations remain. | count |
| **P2** | At least **one** `PROSE` case beyond C1 and C2 — that is, the `[MUST]` set contains at least one demotion nobody has named. | count |
| **P3** | At least **two** of v0.12's nine `[MUST]` clauses have **no agreed origin** in the thread: they entered at drafting, not at review. | count |
| **P4** | `SUPERSEDED` is the **smallest** non-zero class, or empty. Withdrawals in this thread were rarely recorded — that is `#53`'s whole subject. | ordering |

## What this run cannot do

I designed the filter, wrote the predicates and will run the classification.
`relay-0799`: designing a checker's stopping conditions is authorship of its
result. The mitigation is the seal above plus dispatch for attack afterwards —
not a claim of independence.
