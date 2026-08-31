# Q1 — procedure derived from the value function

**The criterion, stated by bee.zae 2026-08-31:** *independence of measurement outranks cost for
the protocol core; cost governs derived artifacts.* Q1 is core — it heads the chain Q1 → F2 → 10.1.

This document derives a procedure from that criterion. It does not choose a digest domain, and no
part of it may be read as choosing one.

---

## 0 · What the criterion decides before anything is run

bee.zae's earlier fork was: does the core need *insensitivity* — a measurement whose result does
not depend on who takes it — or is *declaration* of bias enough?

The criterion answers it. Declaration is a way of making bias visible at low cost; it does not
reduce the bias. Ranking independence above cost for the core therefore selects insensitivity for
the core and leaves declaration sufficient for derived artifacts. **So the core does require a
party outside this thread, and the three decisions held for want of one stay held.** That is a
consequence of the value function, not a separate judgement.

The same criterion says what may be spent freely: participants, runs, rehashes, migrations. None
of those are reasons to weaken the procedure.

---

## 1 · Independence is a property of the path, not of the participant

Between the frozen bytes and an answer there is a path, and every choice on it authored by a party
with an interest is a contamination point. Ours are: what is in the bundle, what question is asked,
what candidate answers are supplied, which output counts as the result, which statistic summarises
it, and when the run stops.

We have measured that we cannot detect our own selection while we want a result (relay-0596:
a malformed comparison and a meaningful one were indistinguishable to their author). So protection
cannot be care. **It has to be structural: every choice on the path is fixed before the run, or
removed from the path.**

---

## 2 · Stage 1 is finished, and the criterion forbids repeating it

The elicitation stage has already run under conditions we cannot improve on:
`docs/experiments/q1-attack/`. A participant with no history of this thread, given `SPEC.md` pinned
by digest `847b8971…` and verified before reading, five implementation files, a names-only
manifest, no candidates, no relay, no observations, and a contract that explicitly refused to hand
over the axes — *"Do not assume the axes are the ones a first reading suggests; part of the task is
establishing how many there are."*

It returned five axes where we had three. A′ and C are its own. Two of its claims were re-run here
against the real `src/` rather than accepted, one decisive test it named came back negative, and
its line-number catch was traced to a commit before ours.

**Consequence of the criterion: this is the most independent measurement of Q1 we have attempted,
and every later run is strictly more contaminated than it.** The first version of this document said
*"that will ever exist"*. That was overstated and is corrected here: its non-exposure rests on a bare
claim and always will, because the repository is public. What is established about it is its
dispatch discipline — see 5.4 — not its participant's history. Nobody now living in this
thread can be given that contract, because the five axes cannot be unseen. Stage 1 is not to be
re-run for reassurance. It is to be protected as evidence.

---

## 3 · What is actually open

| | open question | why it needs a party outside |
|---|---|---|
| **a** | the stage-1 proposal has never been attacked by a non-author | rule 14. It was written by the party that found the problem, and it is persuasive, which is exactly when the rule binds |
| **b** | is the enumeration complete? | the participant's own words: *"low confidence that it found every axis… evidence that the enumeration is incomplete rather than that it is finished"* — and nobody who has read the five can test for a sixth |
| **c** | is the answer affordable? | not an independence question at all. Axis C invalidates every published `parent-sha256:` computed under the text domain |

(c) is the round's decision and (a), (b) are not. **The criterion requires them sequenced, never
merged:** settle the domain on independence grounds, then price migration. If price is allowed to
reach the domain choice, our four converged implementations re-enter through it — the whole reason
whole-file-and-text feels obvious here is that we already built it four times.

---

## 4 · Pre-registration, and the one output Q1 has that no metric can bend

Fresh from relay-0591/0596: pre-specifying the *set* of admissible outputs does not determine the
*statistic of comparison*, and an unfixed statistic reversed a conclusion on real data.

Q1 escapes that trap in a way the earlier experiments could not. **Its natural output is not a
count.** Ask participants for the digests they compute over a small fixed set of adversarial
payloads — a raw invalid octet, a trailing-newline variant, a leading-whitespace variant, a record
whose depositor value carries `\n---\n`, a record whose own `id:` differs. The comparison is then
byte equality of 32-byte values. There is no baseline to choose, no unit to reconcile, no spread to
summarise. Two answers either collide or they do not.

Fix before any run: the payload set, the output (the digest table), the comparison (equality), and
what result would count as Q1 being *not* underdetermined.

**And declare the asymmetry in advance.** If independent participants produce identical digests,
that is corroboration and not resolution — our own four implementations converged on a domain the
spec does not state, so convergence is evidence about implementers, not about the document
(chatgpt, relay-0417). Only divergence measures. Recording this after seeing the outcome would be
the same move this project keeps catching.

---

## 5 · Minimal properties of the outside party

**Revised after chatgpt's rule-14 attack, relay-0610.** The first version listed E1-E7 as seven
properties of the participant. Two of them are not properties of the participant at all, and one of
those is not attainable. What follows separates what is observable from what is declared, and says
which is which in the record.

### 5.1 · Four of the seven are properties of *our* conduct, and those are the observable ones

| | asserts | whose conduct | observable | evidence |
|---|---|---|---|---|
| **E2** | the bundle digest was verified | participant's act | partly | strengthened below |
| **E3** | no candidates or axis list supplied | **ours** | yes | the transmitted bytes |
| **E4** | the attacker did not write what it attacks | **ours** | yes | the dispatch record |
| **E5** | one shot, no clarification channel | **ours** | yes | the transmission record |
| **E6** | output verifiable from its bytes alone | artifact shape | yes | the digest table |
| **E1** | participant unexposed to this thread | participant's history | **no** | our bare claim |
| **E7** | selection by a non-author | **the appointment mechanism** | **not as written** | — |

That the observable ones are exactly the ones describing our own conduct is not a coincidence. We
can record what we do; we cannot record what someone else has read.

**E2 is cheaply strengthened.** The contract must carry the expected digest, so a reported match
proves nothing — it can be copied from the contract. Add one file whose digest is *not* given and
ask for it. A correct value is then evidence of computation rather than of transcription.

### 5.2 · E1, replaced — and it does collapse into a declaration, for a measured reason

The reformulation "had no access to the branch history before receiving the pinned bundle" is
stronger than "has not read it" and is still unattainable here. **The repository is public:**
`github.com/zaebee/p-e`, `isPrivate: false`. The relay store, the ADRs, this document and every
experiment bundle are world-readable. There is no access control to point at, so no observation can
establish non-exposure, and none will become available by trying harder.

What survives, in three parts, each labelled by what it is:

- **E1a · Transmitted material is recorded before the run.** The bundle's bytes and digest are
  deposited as a record before dispatch. Observable, ours.
- **E1b · Run isolation is recorded when we control the invocation.** Whether the participant had
  network or filesystem reach beyond the bundle is a fact about how it was run. When we run it, it
  is recordable. When we do not, the record says *unavailable* rather than assuming.
- **E1c · Prior exposure is a declaration and is written down as one.** The participant states what
  it had read; the record carries that as a **bare claim** in the four-category sense — not
  store-derived, not channel-observed, not verifiable — and never as an established property.

**And the design consequence, which is the substantive answer rather than a concession.** If
non-exposure is unattainable, independence must be bought somewhere other than the participant's
history. Exposure lets a participant anticipate the answer we would prefer; that corrupts a
*judgement* and does much less to a *computation*. So the weight of Q1 goes on **E6**: a digest
table over fixed adversarial payloads is checkable against bytes whatever the participant has read.
The output shape is doing the work that E1 cannot.

### 5.3 · E7, replaced — it is a property of the appointment, and its threat model splits in two

chatgpt is right that E7 as written is not a participant property. Decomposed by what it guards
against:

- **(a) approaching a party likely to agree with us.** Not eliminable, and boundable.
- **(b) discarding a result after seeing it.** This is the one that destroys evidence, and it is
  mechanically preventable with no outside party at all.

(b) is Rule 11 read in the other direction — *the fact of a question is the presence of a record*:

- **E7a · Every dispatch is deposited as a record before its result exists**, carrying the
  participant identifier, the bundle digest, and the time. A suppressed answer then leaves a
  dispatch with no result, which is visible to anyone reading the store.
- **E7b · The eligibility predicate is published before the parties are known.**
- **E7c · Every eligible party is dispatched, not a chosen subset**, with the set and order recorded
  first, so *which one* is not a degree of freedom.

**Irreducible remainder, stated rather than hidden:** whom we think to approach is ours. E7a-c do
not make the choosing independent. They make it auditable, which is weaker than the first version
claimed and stronger than a declaration.

### 5.4 · Measured: stage 1 already satisfies the half that matters

E7a is not a mechanism to invent. It is a description of what was already done, verified in git:

    1eb82c7  17:53:34  CONTRACT.md, PIN.txt, relay-0433..0435   (no ANSWER.md)
    228acb8  18:05:37  ANSWER.md, RESULT.md, relay-0436

relay-0435 says *"Q1 ATTACK IS RUNNING"*. The contract, the digest pin and the announcement were
committed twelve minutes before the answer existed. The dispatch is recorded ahead of its result.

What stage 1 does **not** have is E7b or E7c — no eligibility predicate was published and one party
was approached, so threat (a) is unbounded for it.

## 6 · What the criterion forbids

- Re-running stage 1 with anyone who has seen the five axes.
- Supplying candidate answers, our axis list, or our reading of the proposal.
- Answering a participant mid-run.
- Letting migration cost reach the domain decision.
- Adopting the stage-1 conclusion unattacked because it is good. It is good. That is when rule 14
  binds, not when it is weak.
- Choosing the output or the comparison after seeing results.
- Reading convergence as resolution.

---

## 7 · This document is under rule 14

It was derived by the party whose selection failures are catalogued in relay-0589, 0591 and 0596,
about a question that party has an interest in. It is a proposal, and by its own rule 6 it is not
adoptable until attacked by someone who did not write it.
