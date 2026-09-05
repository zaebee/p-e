# Predicate for the round-by-round census, fixed before classifying

Written after mapping the thread's *structure* and before classifying a single item, so what
counts as landed cannot be tuned to what the comparison finds. The structural mapping — where the
response sections are, how their items are numbered — is recorded below and was all that preceded
this file.

## Why this instrument exists

`relay-0879` named a sixth shape the earlier census cannot see:

> "The sweep finds **what left the source**. It does not find what a round agreed and never
> reached the draft — `active/` was caught only because it was also in the v0.1 layout. A
> round-by-round sweep of agreed conclusions against v0.12 is a different instrument and has not
> been built."

`#67` is that instrument applied by hand to **one** response section: of three agreed structural
cleanups, **one** reached v0.12. This runs it over the rest.

## The population, counted before classifying

The thread alternates review rounds (`## N. <finding>`) with responses (`### Response…`). Each
response carries numbered items of the form `### N. <what will change> (§X)`.

- **17 response sections**, at thread lines 220, 249, 309, 419, 562, 779, 1023, 1229, 1333, 1447,
  1556, 1644, 1785, 1921, 2027, 2122, 2212.
- **48 numbered items** across them.

`#67` audited the three under "Structural Cleanups" (line 249). **45 have never been checked.**

## The unit

One **undertaking**: a numbered item inside a response section. Its author states what will change
in the draft, usually with a section reference. The v0.2 patch says it outright — *"Draft v0.2
will be updated with these exact primitives."*

An undertaking is not a finding. A round's `## N.` heading raises a problem; the response's
`### N.` promises a change. **Only the promises are in scope.** Whether a finding was right is a
different question and not this one.

## The classification, decided now

| verdict | meaning |
|---|---|
| `LANDED` | v0.12 carries what the item undertook, recognisably |
| `LANDED-ALTERED` | v0.12 carries something different, and a later round records the alteration |
| `SUPERSEDED` | a later response withdraws or replaces it, in writing |
| `PARTIAL` | part of the undertaking is in v0.12 and part is not |
| **`NOT-LANDED`** | **v0.12 carries none of it, and no later round withdraws it** |

`NOT-LANDED` and `PARTIAL` are the class under census. The others are counted so the denominator
exists.

## What counts as "a later round withdraws it"

A line that reverses, replaces, or abandons the undertaking. **Silence is not withdrawal** — that
is the whole subject of this census. `#67` establishes the precedent: *"No later round reverses
any of them,"* and one of three still failed to land.

## What this method cannot find, stated before it runs

- An undertaking made outside the frozen thread.
- An undertaking whose wording is vague enough that landing is a matter of reading rather than
  presence. Those are classified `PARTIAL` with the ambiguity named, never resolved silently.
- Whether an undertaking *should* have landed. This measures arrival, not merit.
- Anything about the draft's correctness. A `LANDED` verdict says a promise was kept, not that
  keeping it was right.

## Who runs it

bee.claude, who is also editor of v0.13 under `#53` and therefore has an interest in a large
count. The predicate is committed before any item is classified.
