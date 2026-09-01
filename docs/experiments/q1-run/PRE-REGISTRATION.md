# Q1 — pre-registration

**Deposited before any participant is approached.** Nothing below may be revised after a result
arrives; a revision would be a new record saying so, and the original stays.

This satisfies items 1–9 of `docs/methodology/q1-procedure-contract.md` §1. It does not choose a
digest domain and does not apply the §5 predicate to any candidate.

---

## 0 · Why this run exists, and the objection it was authorised over

Recorded first, because a procedure that hides the argument against itself is not
pre-registered in any useful sense.

**The elimination has already run.** `docs/experiments/q1-rerun/RESULT.md` applied the binding-text
criterion to all five axes and returned, for the two axes still open:

> | **B** fidelity | the bytes the sender emitted; the bytes the store stored | more than 1 |
> | **C** type | octets; decoded UTF-8 text | more than 1 |
>
> A′, B and C are unchanged under either reading.

That is the third outcome of the contract's §5.4, where it is stated to mean *"the specification
is genuinely silent, and **no measurement can break the tie**"*.

**The constructive demonstration has also been produced**, in-house, on 2026-09-01:

- axis B — four distinct emitted byte sequences reduce to one stored digest under the current
  deposit path (`deposit.ts:325` `trimStart`, `:327` trailing newline);
- axis C — three files differing in one invalid octet produce one digest under the current read
  path (`store.ts:330` reads `utf8`, `:303` hashes a string slice), and three distinct digests
  over octets.

Both are checkable by recomputation, which §4 of the contract identifies as exactly the half that
does not require an outside party: *"Spending an outside party on it spends independence where
independence is not required."*

**So bee.claude's assessment, entered before the run and not withdrawn:** the marginal yield of
this run on axes B and C is small, and the contract's own §6 prices it that way — *"real but
smaller than the effort suggests"*, and *"It cannot resolve Q1-as-decision."*

**bee.zae directed that the full run proceed.** Ordering is bee.zae's under §6, so this is a
decision, not an oversight, and it is recorded as one. What the run can still yield: an
independent constructive demonstration rather than ours, on a payload set built to separate all
five axes rather than the two we measured — and, if any table diverges from ours, an axis we did
not find.

---

## 1 · The bundle, by digest

The dispatched directory contains `SPEC.md`, `CONTRACT.md`, `PIN.txt`, and `payloads/`.
`PIN.txt` carries:

    847b8971d36390cd8843da7ebe59bc3499cd8050473425eb91a4a09f30b9901c  SPEC.md
    7eb871a8c68ed0b66b7506116466d0ce75bb0cce61903745f7520d396cf92e12  CONTRACT.md

`SPEC.md` is byte-identical to the copy pinned for every earlier Q1 run, so results are comparable
across them.

## 2 · The payload set, by digest

    aefd7c135bc8ae1a80f5f0d6a16e6df0d38120546aacd469446fe7983b2794c3  payloads/p1.txt
    d7a03032abda92bfc487019698d5736e7621f5e41a6ba729ddd482f58080b299  payloads/p2.txt
    8d51c11ffdb667e6b9d29c2b5ffaed43f42540fc06e96b64859b4b377282dbb8  payloads/p3.txt
    f34bb98c2eff93b349beac032acb517e13510f422f47f83d28295ac98d7ba52e  payloads/p4.txt
    8858665bd5e463c9dea98a630773e988262f10779175e85413ecf1733a75396f  payloads/p5.txt
    03209e171cd71126044008b25c871463eae420acc52cf2c04383cb2a17689c1a  payloads/p6.txt
    50e12b213e374b178922777e6f84510cc9deeb639630369c7ff41096024a9dff  payloads/p3.wire
    02fa9d58cf1c9c5c4de289a6b805a1ddb11d7ce1e7a21ab8974f6a361edbbace  payloads/p4.wire

**The set is fixed here and may not be extended.** The failure this guards against is measured in
this project three times (relay-0589, 0591, 0596): payloads added until one separates the answers.

**Separation, verified before pinning.** Each payload was checked to produce different values under
different readings; a set that cannot separate would make the run unable to measure anything.
Which payload separates which axis is recorded in `SEPARATION.md` and is **not** in the bundle,
because §6 forbids sending candidates or an axis list.

`payloads/control.bin` is deliberately absent from `PIN.txt`. Its digest is known to us and
withheld from participants; §5 of the dispatched contract asks for it. A correct answer is
evidence that a computation happened rather than a transcription (contract §3).

## 3 · The output form

A table of `pN → 64 lowercase hex characters`, one row per payload, in order, nothing between
rows. Plus the control digest, in the same form.

**Not a count, not a score, not a range.** No spread statistic exists over this output, so none
can be chosen after seeing it.

Where a participant cannot produce a value, the form is `pN  NO VALUE` with the reason outside
the table. A refusal is data and is recorded as data.

## 4 · The comparison

**Byte equality of hex strings.** Two returned tables agree on a payload when the 64 characters
are identical, and otherwise they do not. There is no threshold, no distance, and no partial
agreement.

Every returned value is recomputed by us before it is used.

## 5 · The decision rule

Per contract §5, and it is **rejection, not selection**: a predicate drawn from constraints that
predate the question, applied to each candidate in turn. Three outcomes, and the third is not a
failure:

| outcome | meaning |
|---|---|
| exactly one candidate survives on an axis | the contract already entailed it; nobody chose |
| none survives | the contract is self-contradictory there — a result |
| more than one survives | the specification is genuinely silent, and adopting one is **a convention to be labelled a convention** |

**This run does not apply that predicate.** The predicate was already applied in `q1-rerun`, whose
verdict for B and C is quoted in §0 above and stands unless this run's tables contradict the facts
it reasoned from. A measurement cannot overturn an elimination against text; it can only show the
elimination reasoned from a false premise about the material.

**No result of this run authorises adopting a digest domain.** That is Q1-as-decision, which §4 of
the contract establishes cannot be made insensitive by any participant.

## 6 · The asymmetry

**Convergence corroborates. Only divergence measures.**

If every participant returns the same table, that is corroboration and is recorded as
corroboration — never as proof that the domain is determined. This project's own four
implementations converged on a domain the specification never states, so agreement among readers
is a fact about readers.

Divergence between any two tables on any payload names an axis constructively, and is the
measurement.

## 7 · The dispatch record

For each participant, before its answer is read, a relay record carrying: the participant, the
bundle digest as dispatched, the wall time of dispatch, and the delivery channel.

**A dispatch with no returned result leaves the dispatch record standing.** A suppressed answer
must leave a visible hole (E7a); an unanswered dispatch is reported as unanswered.

## 8 · The eligibility predicate

Fixed before the parties are known, so that *which one* is not a degree of freedom (E7b, E7c). A
party is eligible when all hold:

1. it did not author `SPEC.md`, `CONTRACT.md`, or any payload in this set;
2. it can be given the bundle and nothing else, in one shot, with no clarification channel;
3. it can run code it writes itself against the bundle, since the task requires computation;
4. its answer can be recomputed by us in full.

**Non-exposure is not in this list and cannot be.** The repository is public; §4 of the contract
establishes that no participant's prior exposure is checkable by us, by any procedure. Exposure is
recorded as an unverifiable bare claim wherever a participant states one, and is never treated as
established.

**Every party satisfying 1–4 is dispatched to.** Parties are not selected after eligibility.

## 9 · What would count as Q1 not being underdetermined

Declared before it can be tempting.

**Agreement among participants would not count.** Item 6 says why: convergence is a fact about
readers, and this project has already produced convergence on a domain the specification never
states.

On an axis, Q1 is shown **not** underdetermined only if **both** hold:

1. every returned table agrees on every payload that separates that axis; **and**
2. every participant, independently, cites binding text in `SPEC.md` that *entails* the value —
   quoted, by line number — rather than a preference, a purpose, or an implementation habit.

Condition 2 is the one that does the work, and it is the condition `q1-rerun` already found
unsatisfiable for axes B and C: no binding clause contradicts either candidate, so no binding
clause entails either.

**If the tables agree and condition 2 fails, the result is recorded as: participants converged, the
specification remains silent.** That outcome is expected and is not a failed run.

---

## Status under rule 14

This document is written by bee.claude, who also built the payload set, wrote the dispatched
contract, and entered the objection in §0. **It has not been attacked by a non-author.** §2's
separation claims and §9's condition 2 are the load-bearing parts and are where an attack should
start.
