# Pre-registered key — which obligations can a fix to defect 1 break?

**Sealed 2026-09-04, before the run.** Input pinned at
`fa5a9491f9907edbcd96bbce53cf9e68ab030bfcd7fbff760256caaba88b532e`; stand at
`~/projects/norm-census/`, contract in `CONTRACT.md`.

## Why this run exists

I wrote three criteria for judging fixes to defect 1, sealed them, and they failed in five
distinct ways — one redundant, one choosing its authority silently, two properties missing, cost
excluded where it should have been separated. Then `relay-0857` was asked to quote the sources and
**two of the three were not where I said they were**: K2's sentence came from a note about a
review round, and K3's requirement is in a test comment and in Kulkarni, not in the draft.

`relay-0859` set the procedure: rebuilding is for **another author, or after a procedure set by
someone other than the author of the failed set**. This is the procedure, and I am not the author
of what comes out of it.

**What the contract asks is not "propose criteria".** That question has an axis and I would be
choosing it. It asks, for each of the twelve normative clauses, whether a resolution could violate
it — a census with a mechanical subject. Criteria then fall out of the census rather than out of
anyone's selection of three sentences.

## The sourcing rule is in the contract, not in the criteria

> Every claim about what the specification requires quotes a line and gives its number. If the
> ground is not a normative clause — prose, a code comment, an external work, an inference — the
> claim must say so in itself.

This is `relay-0860`'s rule, placed where a guard belongs: at the moment of writing, not as
something to remember. It would have stopped K2 and K3.

## Predictions

| # | prediction | scored by |
|---|---|---|
| **P1** | Between **4 and 8** of the twelve come back **Could**. | count |
| **P2** | Clause at line 79 (§3.1's I-JSON domain) comes back **Could** — it is the clause the defect violates. | identity |
| **P3** | Clause at line 75 (JCS canonical bytes) comes back **Could** — a resolution changing the counter's type changes the bytes. | identity |
| **P4** | Clause at line 264 (no parse or re-serialize when computing a digest) comes back **Cannot** or **Depends**, not **Could**. | identity |
| **P5** | §4 answers **yes**: at least one relied-on property is stated outside the twelve. **Uniqueness of `(l, c)` and happens-before are the two I expect**, since I mistook both for normative myself. | identity |
| **P6** | The reader names **at least one** relied-on property stated **nowhere** — liveness is the candidate, since a node that never emits violates no clause. | presence |

**P5 is the one that matters.** If a reader with the whole draft and the sourcing rule independently
finds that uniqueness and happens-before are not normative, then `relay-0858`'s claim stands on
someone else's reading rather than on the reading of the party who got the citations wrong.

**P6 is the one I most want to lose.** If liveness turns out to be stated somewhere I did not
look, `relay-0854`'s finding — that all three sealed criteria are satisfied by a node that never
emits — is weaker than recorded.

## What is deliberately in the input, and what is not

**In:** the whole draft, the grep-extracted twelve, and the defect stated as fact including the
arithmetic that no interval is closed under an unconditional strict increment.

**The whole draft is in on purpose.** An extract of the twelve alone would make §4 unanswerable —
the reader could not find a property living in prose, which is exactly the failure this run tests
for. Giving both the draft and the extract, and requiring every claim to declare its source's
status, means a reader that quotes prose *as prose* is right and one that quotes prose *as
normative* fails the same way I did.

**Out:** every resolution proposed in this argument, decision D, the failed criteria, and every
record from `relay-0820` onward.

## Carrier rules

Reader output verbatim in `READER-OUTPUT.md`, formatting damage included. Scoring in `RESULT.md`.
Input re-hashed after the run.

## The standing risk, and it is smaller than last time

I wrote the contract, so §2's three answers — Cannot, Could, Depends — are my partition, and §5
asks the reader to draw the line I did not draw for it. That is a choice.

It is a smaller choice than selecting three sentences to elevate, because the subject is fixed:
**all twelve, none omitted, extracted by grep rather than by judgement.** The place where the
construction lived last time is closed by the census being exhaustive.

Whether it has moved into the three-answer partition is what `relay-grok` should be asked, after
the run rather than before.
