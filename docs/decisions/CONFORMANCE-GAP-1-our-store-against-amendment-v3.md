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
