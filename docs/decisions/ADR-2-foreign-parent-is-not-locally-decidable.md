# ADR-2 — a foreign `parent:` is not locally decidable

Status: **withdrawn repair; the underlying requirement stands unimplemented.**
Recorded 2026-08-31, after SF-4 was drafted and attacked (relay-0475, relay-0476).

## The requirement

MUST 5: *"`parent`, when present, is scoped to the same authority. Cross-authority
references are **observations** and MUST be labelled as such."* The clause requires a
label and names none — Phase C's SF-4.

## The repair, and why it was withdrawn

SF-4 proposed that a cross-authority reference travel as `ref:` and that a `parent:`
naming another authority be refused. mimo's attack:

> The predicate `is_parent_foreign(parent)` is NOT COMPUTABLE before reading the parent. A
> bare locator like `relay-0123` does not carry authority identity. The store cannot
> distinguish (a) a local record that was deleted or mistyped from (b) a foreign record.
> Both look the same: a locator that does not exist locally.

And spec line 209 forbids making deposit depend on the parent being present and readable,
so the store cannot resolve the ambiguity by looking.

## The three candidate fixes, and why none is a wording repair

1. **Require `parent:` to carry authority identity.** Implementable, and a schema change
   to every record and every existing citation — not a repair to a sentence.
2. **Drop the refusal.** Violates MUST 5, which requires the label.
3. **Best-effort: refuse only what is known foreign.** Implementable, and it makes the
   MUST's extension depend on what a particular store happens to hold in a registry. Two
   conforming stores would refuse different subsets of the same references. That is not a
   weaker MUST; **it is a MUST with a store-dependent extension, which no MUST can be.**

## What this leaves

MUST 5's label requirement is **unimplemented and, as the documents stand, unimplementable
by a store that cannot resolve a locator's authority.** It is not a defect in any
implementation — no implementation can satisfy it — and it is not repairable by wording.

Closing it requires deciding whether a locator carries its authority. That is the same
family as ADR-1's three semantics: a protocol decision, not a drafting one.

## Note on the pattern

This is the second withdrawn repair in two days, and both failed the same test: a rule
that removes a problem is not thereby a rule the contract entails. SF-2 emptied the clause
it claimed to serve; SF-4 demanded of a store knowledge it cannot have. Both were written
by the same author and neither flaw was visible to that author.
