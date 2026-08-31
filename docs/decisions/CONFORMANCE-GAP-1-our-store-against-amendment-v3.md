# Conformance gap 1 — our store against AMENDMENT-v3

Status: **measured, unrepaired.** Recorded 2026-08-31.

Not an open question and not a proposal. A statement of where the implementation in
`src/relay/` diverges from the amendment this project wrote, so that nothing measured
against this store is mistaken for a property of the protocol.

## What was measured

| clause | requires | our store | evidence |
|---|---|---|---|
| **9.1** | extent recorded at binding | **no** | no `extent` anywhere in `deposit.ts` |
| **9.2** | a non-UTF-8 candidate refused, on read as well as write | **no** | no validity check in `store.ts` |
| **9.3** | store the record octet for octet, no trim or pad | **no** | `trimStart` twice in `deposit.ts`, plus an appended newline |
| **9.4** | digest over octets, never a decoded string | **no** | `readFile(…, "utf8")` then hash the string, `store.ts` |
| **10.1** | content identity recorded at binding, verified on read | **no** | `store.ts:161` recomputes on every `loadStore`; nothing is stored |

Five clauses of the amendment, none implemented.

## Why this exists as a record

Both Phase B2 builders implemented 10.1 — reader A at `store.py:415-424` with a named
test, the cross-family build likewise. **Ours is the only one of three stores that does
not implement the amendment this project wrote**, because our implementation predates it
and nobody went back.

The immediate consequence, found by mimo in relay-0546 and traced in relay-0547: a state
reconstruction over the store's structured metadata cannot resolve the two
duplicate-content pairs, because the digest is not in the header block. That reads as a
limitation of derived reconstruction and is not one — it is 10.1 unimplemented here.

So any experiment run against this store measures **this implementation**, not the
protocol, until the gap is closed or the experiment's scope excludes these clauses.

## What this record does not do

It proposes nothing. Closing the gap changes the deposit header format for every future
record while every existing record lacks the fields, and 10.4 imposes a transition
obligation on any store adopting 10.1 — it is corpus-wide work belonging with the
blockers, not a repair.

It also does not claim the gap is a defect. The amendment is a draft that has never been
adopted into `issue-1`, and a store that predates a draft is not violating anything. What
would be wrong is measuring against this store and reporting the result as a fact about
the specification.

## Addendum — the same measurement against the ADOPTED spec

Recorded after chatgpt's stop-signal: do not run derived experiments against this store
until we know which relevant MUSTs it implements. That check existed only for the draft.
Against `issue-1` itself:

| clause | requires | our store |
|---|---|---|
| **MUST 1** | a persistent allocation marker per id, `history/relay-NNNN` | **yes** — applied 2026-08-31; created `wx`, kept beyond deletion |
| **MUST 1** | allocation settled by atomic exclusive commit, **never by reading the current maximum** | **yes** — applied 2026-08-31; the `wx` claim is the atomic step. The maximum is still read, for **monotonicity** — a separate half of the same clause — and never to choose the id |
| **MUST 2** | an authority MUST declare the seq from which it claims G1 | **yes, vacuously, and now stated** — applied 2026-08-31. This row was mis-framed. The clause binds an authority *that claims G1*; `issue-1`'s *The legacy authority* settles that this one cannot — `relay-0183` was rebound and 183 sits above any floor legacy could declare, so under v1's ban on exceptions it "cannot claim from 32 or from anywhere at all". The gap was never a missing floor. It was that nothing in `src/relay/` said the authority makes no claim; `authority.ts` now does, with the grounds |
| **MUST 6** | visibility exposed as `PRESENT` / `KNOWN_MISSING` / `UNKNOWN` | **yes** |
| **MUST 8** | crash-atomic and create-or-fail | **yes** — `link()` plus `fsync`, applied 2026-08-30 |

So the store implements two of five checked clauses of the **adopted** specification, and
one of those two was implemented this week as the F1 repair.

This is a different and more serious statement than the amendment table above. AMENDMENT-v3
is a draft nobody adopted, so failing it violates nothing. `issue-1` is the specification,
and MUST 1's `max+1` prohibition is not a silence the store filled — **it is the exact
mechanism the clause forbids by name.**

Nothing here is proposed or repaired. It is recorded so that the stop-signal has the
measurement it presupposes.
