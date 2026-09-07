# Sealed predicates — the code blocks

**Sealed before any unit was read.** At sealing time I knew three numbers: 120 units inside the
fences, 156 outside, and that together they account for every non-empty non-fence line of the
draft. Nothing else. v0.12 pinned in `PIN.txt`; thread at
`d8cf3fdf08a90b9bf48dfc0eb4a34f5847bc9cabe9cb8a63a525dfbe7b62b00f`.

## Why this run exists

Both reverse passes named the same residual and neither could reach it. `relay-0909`:

> an obligation carried **only inside a code block** — a `MUST`-shaped constraint expressed as a
> type or a thrown error and nowhere in prose. §3's `RelayAct` and §4.1's publisher are both code.

It is inhabited by things with open issues: line 30's `.relay/errata/` redefinition (deletion-log
row 6, `#67`) and line 65's `type` enum (`#107`, `#81`).

`relay-0918` names why the residual exists at all, and it is not a property of my method. seL4
separates an abstract specification from an executable one and proves the second refines the
first. **v0.12 collapses them**: §4.1 is a TypeScript listing that *is* the specification. A
document with no separation between *what must hold* and *how it is done* puts obligations where
a population of prose cannot see them.

## The partition, checked before sealing

| | lines |
|---|---|
| inside fences | 120 |
| outside fences (`reverse-full`) | 156 |
| **sum** | **276** |
| draft non-empty lines, less the 18 fence markers | **276** |

The two populations **partition the draft's non-empty non-fence lines exactly.** This run is the
complement of the last one, not another look at the same thing. Fence markers belong to neither:
they open and close a region and state nothing.

## Counting rule, and the escape that was missing four times

1. **A unit is one line.** An obligation spanning lines is keyed to the **first** line of its
   construct; the rest are `CONTINUATION`.
2. **Where one line carries several independent constraints, it is `MULTI`** — excluded from the
   primary count and reported separately with its list. Four numbers this session died because a
   line stating several requirements was silently folded into one unit or silently split into
   many. `MULTI` is the explicit escape those runs lacked.
3. Every obligation row cites a draft line and either a thread line or the word `nothing`.

## Classification

| state | meaning |
|---|---|
| `AGREED` | a constraint with a thread line stating it |
| `NO-ORIGIN` | a constraint with no thread line — **it entered at drafting** |
| `NOT-AN-OBLIGATION` | states no constraint: a comment, a label, example data, punctuation |
| `MULTI` | several independent constraints on one line |
| `CONTINUATION` | the rest of a construct keyed to an earlier line |

A **constraint** is anything a conforming implementation could violate: a field's presence, its
type, a union's membership, a guard, a thrown error, a directory's contents. A comment describing
one is not a second instance of it.

## Predictions

| # | prediction | scored by |
|---|---|---|
| **C1** | *Control.* Line 65, the `type` union, is a constraint and codes `AGREED`. | identity |
| **C2** | *Control.* Line 30, `.relay/errata/  expired records`, is a constraint — it says what a directory holds. | identity |
| **P1** | `NO-ORIGIN` is between **2 and 10**. | count |
| **P2** | At least one `NO-ORIGIN` falls in §4.1's publisher, lines 142-223 — the largest block and the place a drafter works details out. | identity |
| **P3** | Constraints of all classes total between **25 and 60**. | count |
| **P4** | `NOT-AN-OBLIGATION` is the **largest** class, compared against every other class count by script. | ordering |

**`P1` is a real prediction and I have been wrong twice.** Both reverse passes returned zero
`NO-ORIGIN`, and I predicted otherwise both times. I predict it again here because code is where
a drafter settles details nobody argued, and if that is wrong a third time it is a finding about
this corpus rather than about my expectations.

## What this pass cannot reach

Nothing in the draft, now: with the previous pass it covers every non-empty non-fence line. What
it cannot reach is **whether a constraint is the right one** — only whether someone agreed to it.
