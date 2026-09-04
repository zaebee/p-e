# Sealed criteria for defect 1

**Sealed 2026-09-04, before application.** Written after R5 was chosen and before any
resolution was scored. No resolution has been run against these at the time of sealing, and the
order is recorded because it is the only thing that makes them worth anything.

## Why they exist

Every round of this argument has been case-by-case: an option, an objection, a reply. `relay-0821`,
`relay-0828`, `relay-0841` and `relay-0844` each found the construction in the *frame* rather than
in the facts — the composition of a list, the paragraph appointing a decisive axis, the attack, the
axis it reclassified on. **Each time a form was closed it relocated, because there was no fixed
metric to relocate away from.**

A criterion applied mechanically to every candidate removes the place the construction lives.

## The occasion

R5 — carry the overflow into `l` — was chosen, and while writing its addendum it failed:

```
peer asserts   l = 2^53 − 1,  c = 2^53 − 1     both conforming under §3.1
ingest         l' = 2^53 − 1,  c' = 2^53       carry fires
result         l = 9007199254740992            outside §3.1's domain
```

`l` is constrained by §3.1 exactly as `c` is. Decision D declined to bound what a peer may assert
*relative to physical time*; it did not remove the domain bound. **`relay-0846`'s first point was
right and `relay-0848` dismissed it on a confusion between those two things.** Erratum in
`relay-0851`.

That failure was found by running the rule, one step before it would have been written into the
specification. A criterion would have found it in the round.

## The criteria

Each is taken from a sentence already in the specification. None is invented for this comparison,
and the source is given so that can be checked rather than trusted.

### K1 — Closure

> For every input a conforming peer may send, and every state reachable from conforming inputs,
> the values the node computes lie inside §3.1's integer domain.

**Source:** §3.1 — *"integers within `[-(2^53 - 1), 2^53 - 1]`"*.

Note that the quantifier ranges over **states reachable from conforming inputs**, not over states
an implementation happens to start in. R5 satisfies K1 from a fresh clock and fails it from a
state a single conforming message can produce.

### K2 — Uniqueness

> No node emits two acts carrying the same `(l, c)`.

**Source:** §3.3 and the resolution it records — *"strictly monotonic per node, regardless of
physical clock regressions"*.

### K3 — Causality

> `e hb f` implies the timestamp of `e` orders before the timestamp of `f`.

**Source:** requirement 1 of the HLC construction §3.3 cites.

## The constraint, which is not a criterion

**No new bound on what a peer may assert.** That is decision D, taken in
`relay-lite-v0.12-addendum-clock.md`. A resolution that requires such a bound does not fail a
criterion — it reopens a decision, which is a different and larger thing, and must be reported as
that rather than scored as a failure.

## What is deliberately absent

**Cost is not a criterion.** Wire-format change, migration, refusal of conforming acts,
underspecification — all real, all argued at length in `relay-0827` through `relay-0850`, and none
of them here. A resolution that passes K1–K3 and is expensive is a resolution that passes; the
expense is then a decision rather than a disqualification.

That separation is the point. Every previous round mixed correctness with cost and the mixing is
where the axis-choosing happened.

## Predictions, sealed with the criteria

Recorded so that applying them is scoreable rather than merely done.

| resolution | K1 | K2 | K3 |
|---|---|---|---|
| **i** wait | fail | pass | pass |
| **ii / R3** saturate | pass | **fail** | pass |
| **iii / R5** carry into `l` | **fail** | pass | pass |
| **iv** reject at stage 2 | pass | pass | pass |
| **v / R8** decimal string | pass | pass | pass |
| **R1** widen to `2^N` | **fail** | pass | pass |
| **R2** arbitrary precision | pass | pass | pass |
| **R4** modular | pass | pass | **fail** |
| **R6** freeze | pass | **fail** | pass |
| **R7** stateful guard | pass | pass | pass |
| **R9** pair, integer epoch | **fail** | pass | pass |
| **R9′** pair, string epoch | pass | pass | pass |

If the table is right, **six survive** and the choice among them is entirely about cost — which is
a decision, not an analysis, and not mine.

I have not verified a single cell. They are predictions, and the point of sealing them is that a
cell I got wrong is a finding about me rather than about the resolution.

## The standing risk

I wrote these criteria after holding a preference and after that preference failed. Three
criteria drawn from three sentences is a choice of three sentences; the specification contains
more. **The right attack is on the criteria, before they are applied to anything.**

That is why they are sealed and dispatched rather than run.
