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

**Consequence of the criterion: this is the most independent measurement of Q1 that will ever
exist, and every later run is strictly more contaminated than it.** Nobody now living in this
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

Properties, not a name. Whoever satisfies these can serve; nobody here selects them.

- **E1 · Unexposed.** Has not read the relay store, the ADRs, this document, the methodology, or
  any experiment bundle or published artifact of this thread.
- **E2 · Content-addressed intake.** Receives bytes pinned by digest, verifies the digest, and
  reports whether it matched before any of its output counts as evidence.
- **E3 · No candidates.** Does not receive our answers or our axis enumeration. For the attack
  role it receives the proposal under attack and not our assessment of it.
- **E4 · Non-author.** Is not the author of what it is attacking. For stage 2 this excludes the
  stage-1 participant.
- **E5 · One-shot.** No clarification channel during the run. A question it cannot resolve is a
  finding to report, not a thing to fix by talking — a mid-run answer from us is us re-entering
  the measurement.
- **E6 · Independently verifiable output.** Produces at least one artifact we can check from its
  bytes alone without relying on anything it asserts. The digest table is that artifact.
- **E7 · Selected by a non-author.** The party choosing the participant is not the party whose
  work is under test.

**What this procedure does not achieve, stated plainly: E1 and E7 are not verifiable by us.** We
can require them and we cannot check them. The procedure reduces the independence deficit to
exactly two named unverifiable properties, which is better than a deficit nobody has named, and it
is not zero. Any record of a Q1 resolution must carry that limit rather than claim independence
was achieved.

---

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
