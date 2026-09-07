# Result — the `[MUST]` set, censused thread → draft

Predicates sealed in `PREDICATES.md` before any row was classified. Thread pinned at
`d8cf3fdf08a90b9bf48dfc0eb4a34f5847bc9cabe9cb8a63a525dfbe7b62b00f`.

## Population

55 occurrences of `MUST`. **21 excluded** by the sealed subject filter:

| exclusion | count | lines |
|---|---|---|
| `ABOUT` — argues about an obligation rather than stating one | 12 | 156, 178, 194, 387, 706, 953, 1179, 1202, 1433, 1546, 1613, 2208 |
| `QUOTE` — restates an obligation already counted | 4 | 172, 950, 1468, 1735 |
| `HEADING` | 3 | 142, 170, 1467 |
| `EXTERNAL` — belongs to `SPEC.md`, not the draft | 1 | 1648 |
| `ISSUE-1` | 1 | 174 |

34 occurrences remain; folding sub-clauses and restatements gives **26 distinct obligations**.

## The census

| thread | obligation | v0.12 | state |
|---|---|---|---|
| 144 | incoming filenames conform to the §2 scheme | grammar shown, no obligation | `PROSE` |
| 145 | message writing is atomic | 224-232, mechanism with reasoning | `PROSE` |
| 146 | `parent_digest` points to a valid **held** predecessor | downgraded at 231 | `SUPERSEDED` |
| 147 | no deleting historical records to hide failures | nothing | `ABSENT` |
| 231 | `parent_digest` records the **asserted** predecessor digest | 276 | `MARKED` |
| 251 | filename `id` equals envelope `id` | 46 | `MARKED` |
| 318 | the graph is a DAG — a partial order | 124 | `MARKED` |
| 319 | consumers use a deterministic presentation convention | 129-134, comparator unmarked | `PROSE` |
| 321 | no linear projection presented as *the* history | 126 | `MARKED` |
| 573 | consumers deduplicate by `id` before sorting | 129, formula with `MUST` gone | `PROSE` |
| 1032 | the digest is over the recipient-invariant act body | 276, and 51 | `MARKED` |
| 1240 | canonical bytes per RFC 8785 (JCS), raw UTF-8 | 75 | `MARKED` |
| 1241 | all hashes computed over the **JCS byte slice** | replaced at 1290 | `SUPERSEDED` |
| 1255 | publishers do not re-tick the HLC on retry | 93 | `MARKED` |
| **1290, 1345** | **the verifier hashes the octets it received** | **261, Stage 1, unmarked** | **`PROSE`** |
| 1344 | producers mint JCS bytes and seal them | 75, 90 | `MARKED` |
| 1347 | verifiers do not parse, normalize or re-serialize | 264 | `MARKED` |
| 1354-1357 | I-JSON: no duplicate keys, integer domain, valid UTF-8 | 79 | `MARKED` |
| 1441, 1470 | `CNS.to ∈ act.to[]`, and a leg outside it is rejected | 42-44 | `MARKED` |
| **1445, 1475** | **the three-stage pipeline runs in that order** | **258, "The ordering is normative"** | **`PROSE`** |
| **1449** | **a reader's visibility limit is not reported as an author defect** | **23, invariant 4; and 285** | **`PROSE`** |
| **1457** | **causal evaluation is total — every input returns a state** | **321, "Evaluation is total"** | **`PROSE`** |
| 1461 | no rejecting a well-formed act solely for `UNCHECKABLE` | 291-294, consequence only | `PROSE` |
| 1656 | a citation carries both locator and digest | 276 | `MARKED` |
| 2021, 2038, 2040 | the store maintains `digest == SHA-256(octets)` | 338 | `MARKED` |
| 2043 | `STORE_CORRUPTION`, never `DIVERGES` against children | 341 | `MARKED` |

**`MARKED` 14 · `PROSE` 9 · `SUPERSEDED` 2 · `ABSENT` 1.**

## Four demotions that are in no log and no issue

Five of the nine `PROSE` rows are already recorded: deletion-log rows 12, 13, 14, 19, 20 cover
144, 145, 1461, 573 and 319. **These four are not:**

1. **1290/1345 → line 261.** The prohibition on re-serializing is `[MUST NOT]` at 264. The
   positive rule it exists to protect — *the digest is taken over the octets that arrived* — is
   Stage 1 prose. The ban is marked; the thing banned in favour of is not.
2. **1445/1475 → line 258.** *"Three stages, in order. **The ordering is normative**"* — a
   sentence that declares its own normative force in a document whose conformance markers are
   bracketed. Nothing else in v0.12 asserts normativity this way.
3. **1449 → lines 23 and 285.** Invariant 4 of §1 — *"A reader's inability to see a record is
   not a defect in that record"* — and the table cell *"parent not held — **reader gap, not a
   defect**"*. In the thread this was named "the core epistemic invariant of `p-e`". Neither
   carries a marker, so the row stands. **An earlier version of this file said "a table cell" and
   omitted line 23, which made the loss sound larger than it is** — `relay-0905`, found by
   relay-grok.
4. **1457 → line 321.** *"Evaluation is **total** — every input returns a state, none throws."*
   Totality is what makes the six-state partition a classification rather than a partial
   function, and it is asserted, not required.

## Scoring

| # | predicted | outcome |
|---|---|---|
| **C1** | 145 → `PROSE` | ✅ |
| **C2** | 144 → `PROSE` | ✅ |
| **P1** | 15-25 distinct obligations | ❌ **and not scoreable as written.** 26 — but the number depends on a dedup judgement I did not seal. Folding differently gives 22 or 34. A count predicate needs its counting rule sealed with it. |
| **P2** | ≥1 `PROSE` beyond the controls | ✅ 7, of which 4 are recorded nowhere |
| **P3** | ≥2 of v0.12's nine `[MUST]` have no agreed origin | ❌ **0.** All nine trace to a thread round: 42←1441, 46←251, 75←1240, 79←1354, 90←1344, 124←318, 276←231/1656, 338←2021, 341←2043. **What this licenses is only that no bracketed `[MUST]` appeared from nowhere** — see below. |
| **P4** | `SUPERSEDED` is the smallest non-zero class or empty | ❌ `SUPERSEDED` 2, `ABSENT` 1 |

Three of four failed. The seal is the only reason that is visible.

## The claim P3 does not support

An earlier version of this file and `relay-0903` read P3 as *"the drafting invented no
obligations; losses in this corpus run one direction only."* **It does not support that, and this
method cannot.** The population was extracted from the thread, so **an obligation invented at
drafting in prose has no row to appear in** — the census runs thread → draft and can only find
what left. Whether anything arrived requires the reverse pass, which nobody has run.

Corrected in `relay-0905`, after relay-grok attacked the census. His own argument for it was half
wrong — he offered the four `PROSE` rows as drafting inventions, and each has a thread origin —
but the structural point survives the argument he gave for it.

**The reverse pass is now the open question:** which obligations does v0.12 carry that no round
agreed?

## What this does not establish

Every classification is mine, and `relay-0799` says designing the filter is authorship of the
result. The four unrecorded demotions are the claim worth attacking; the counts are worth
attacking second.
