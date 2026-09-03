<!-- NOT A RUN -->
# The blind reader's candidates, run against the review thread

**NOT A RUN.** Not a `docs/reports/*-conformance-NN.md`, changes no catalogue.

`RESULT.md` established that a systematic comparison surfaces far more A-only items than the term
sweep in `relay-0758`, and said the count *"must not be quoted as a loss count"* because the
reader's task was "absent from B", not "removed without a record". This separates them.

**Method.** For each candidate, search all 2113 lines of the sixteen review rounds — the thread
minus A's body — and read the hits rather than count them. This is the same term-grep that proved
non-exhaustive, but the direction is reversed: here the item is known and the question is whether
it was discussed. Grep establishes presence well. Every claimed zero was re-checked with a looser
pattern, because a zero produced by my own regex has happened in this work before.

The comparison of two documents produces candidates. **Only the thread separates them** — and
doing so surfaced two categories that no document comparison can reach, because both A and B are
silent about why they differ.

---

## 1. Recorded decision, correctly applied

Not losses. The rounds argued these and the draft reflects the argument.

| item | evidence in the rounds |
|---|---|
| `rename` → `link` on publish | 7 mentions, opening with *"`rename` is not claim-or-fail on publish — measured"* |
| `hlc {wall_time, logical_seq}` → `{l, c, node_id}` | 20 mentions, with the backward-jump problem and the emission rule |
| `ruled_by: "consensus-v1"` | explicit: *"**Correction:** We remove the automated `ruled_by: "consensus-v1"` procedural ruling."* |

## 2. Recorded decision, and the draft did the opposite

This category did not exist before this run. Both items were **decided in a round, accepted, and
inverted in the document**, and no later round records a reversal.

### `errata/` — eliminated by decision, and it is the directory that survived

The round proposed, under "Structural Cleanups":

> **Unify Errata into History:** Eliminate the separate `.relay/errata/` directory. An `erratum`
> is an ordinary, first-class immutable record deposited into `.relay/history/`

Accepted in the reply — *"Unifying errata into history, the filename/envelope `id` cross-check,
and scoping the mutation ban per directory — all three match what this store does"* — and
consistent with the last mention in the thread, *"additive errata in primary history log"*.

What v0.12 contains:

```
A:  in/   active/   out/   errata/   history/YYYY-MM
B:  tmp/  in/                errata/
```

`errata/` **survived**, repurposed from *"зафиксированные ошибки, споры и рекламации"* — recorded
errors, disputes and claims — to `expired records`, a TTL graveyard. And `history/`, the
directory the decision said errata should move *into*, **occurs zero times in v0.12**.

The draft implemented the inverse of the decision: it kept the directory that was to be
eliminated and eliminated the directory that was to receive its contents. The name is the same
and the function is not.

### The deletion prohibition — flagged as too narrow, and it disappeared

The review comment was about scope, not existence:

> **§6 forbids delete/update only in `history/`.** The TTL sweep moves files out of `in/`, which
> is fine, but the prohibition should say which directories it covers rather than leaving the
> others implicit.

A had three layers:

| | A | B |
|---|---|---|
| invariant | A:13 — history is strictly additive | **B:19 — "A record, once published, is immutable. Corrections are new records, never edits."** |
| prohibition | A:125 — no agent may overwrite files in `.relay/history/` | absent |
| conformance | A:147 — `[MUST NOT]` delete historical records to conceal failures | absent |

v0.12 carries exactly three `**[MUST NOT]**` clauses — on re-ticking the HLC, on presenting a
linear projection as the causal history, and on parsing before hashing. **None concerns deleting
or overwriting a stored record.**

So the *statement* of immutability survives as invariant 1, and both clauses that made it
enforceable are gone along with the directory they were scoped to. A reviewer asking that a rule
name its directories was answered by the rule not being there.

## 3. Discussed, affirmed, then absent

Weaker than category 2 — no decision to keep them was recorded, but neither was a decision to
drop them, and the rounds treat them as present and working.

| item | what the rounds say |
|---|---|
| `.relay/active/` | *"Explicitly specify that `.relay/in/` and `.relay/active/` are ephemeral queues"* — a proposal to **specify** it, accepted |
| Claim-or-Fail capture | *"§4.2's claim step is fine — there the source is unique, so the loser gets `ENOENT` and skips. **Claim-or-fail works**; publish-or-fail does not."* |

Both are absent from v0.12.

## 4. Silent — zero mentions across 2113 lines of review

Each of these appears in A's body and never again. Every zero re-checked with a looser pattern.

| item | in A | in rounds |
|---|---|---|
| `.relay/out/` directory | 1 | 0 |
| `target_id`, `target_digest`, `superseded_by` — the erratum record structure | 1 | 0 |
| Materialized State across an errata chain | 1 | 0 |
| the `CRITERION-CHECK` step of the four-act chain | 2 | 0 |
| `claim` payload (`proposal`) | 1 | 0 |
| `challenge` payload (`counter_evidence`, `UNDECIDABLE`) | 1 | 0 |
| `[MAY]` translate filesystem events to WebSocket/SSE | 2 | 0 |
| `[SHOULD]` workers check `ttl` before expensive processing | 1 | 0 |
| `RelayEnvelope` as a name | 1 | 0 |
| `ttl [OPTIONAL]`, default `3600` — **K1** | 1 | 0 |
| `created_time(uuidv7) + ttl < now()` — **K2** | 1 | 0 |
| `signature?: string` — **K3** | 1 | 0 |

A caution on the `[MAY]` row: a first pass reported **32** mentions of it in the rounds. That was
my pattern matching `sse` inside words like *passes* and *assessed*. The tightened count is zero.
Recorded because the same class of error produced four false zeros earlier in this work, and the
correction ran in both directions this time.

---

## What this changes

`relay-0758` framed the problem as *review catches what is wrong on the page and nobody reads for
what left it*. `relay-0762` sharpened it to *the loss is disguised as an improvement*. Neither
anticipated category 2.

**A decision can be recorded, accepted, and then not applied — and the record of the decision does
not help, because nothing checks the document against it.** The errata decision is in the thread
in plain words, twice, and v0.12 does the opposite. Any of the three review practices proposed so
far — a normative-statement ledger, a "changes since" appendix, spec-as-code — detects content
that *left*. None detects content that left in the wrong direction relative to a decision that
was made about it.

And category 2's second item is the most serious defect found in this document to date. Not
because a clause went missing, but because **the clause that went missing was the one enforcing
the invariant the document opens with.** v0.12 states that records are immutable and contains
nothing that forbids deleting one.

Filed as issues rather than fixed here.
