# Result — round-by-round census, first pass

Predicate sealed at 09:55:00 UTC in `PREDICATE-rounds.md`, after mapping the thread's structure
and before classifying any item.

**Two new instances, both `PARTIAL`. And the method as run is a screen with a blind spot it
found by accident, which is the more useful result.**

## What was actually done, stated first

The population is **48 numbered undertakings** in 17 response sections. `#67` audited three.

This pass did **not** read all 48. It ran a **term screen**: each undertaking's distinctive terms
were counted in v0.12, and the items whose terms came back absent were then read in full.

That screen finds an undertaking whose *vocabulary* never arrived. **It cannot find one that
arrived stripped of its force** — and item 315 below is exactly that, caught only because the
phrase "tie-break" happened to be absent while the mechanism was present under other words.

**A full 48-item read is still owed.** What follows is a first pass, not the census.

## `NOT-LANDED` and `PARTIAL`

### Item 242 · Explicit Dual-Order Model (§1.2 & §2.2) — `PARTIAL`

Undertaken, thread line 242:

> - **Arrival/Queue Order:** Lexicographical order of UUIDv7 in `.relay/in/` (used solely by
>   workers for transport draining).
> - **Causal/Semantic Order:** Directed Acyclic Graph formed by `parent_digest`.
>   **No causality is derived from filename timestamps.**

In v0.12: the causal half landed as invariant 2 — *"Order comes from the citation graph, not from
absolute system clocks."*

**The arrival half did not.** `dual-order` occurs zero times. Nothing states that lexicographic
order in `in/` exists for draining, and nothing says causality is not derived from filenames.
Invariant 2 rules out *clocks*; the undertaking also ruled out *filename order*, which is a
different thing — UUIDv7 names sort by embedded time without any clock being consulted at read.

Named rather than resolved, per the predicate: whether invariant 2 is meant to cover filename
order is a matter of reading, and this census does not decide it.

### Item 315 · Deterministic tie-break as presentation convention (§1.2 & §4) — `PARTIAL`

Three normative rules were undertaken. Two landed marked; the middle one did not.

| undertaken | in v0.12 |
|---|---|
| 1 · protocol and storage MUST be treated as a DAG | line 124, **`[MUST]`** |
| 2 · consumers requiring flat presentation **MUST use** a deterministic convention | lines 129-134, **unmarked prose** |
| 3 · **`[MUST NOT]`** consumers present a linear projection as *the* history | line 126, **`[MUST NOT]`** |

The mechanism is fully present and is better than what was promised — the terminal key moved from
`lexicographical(digest)` to `id`, and that change is recorded (thread line 360, item 427). **Only
the marking is missing**, and its two siblings from the same undertaking kept theirs.

This is the `DEMOTED` shape of `#103` and `#104`, arriving through the other instrument.

## Healthy outcomes among the items read

| item | verdict |
|---|---|
| 234 · separation of aggregated finding from sovereign ruling | **`SUPERSEDED`** — item 343 reverses the direction in writing, and v0.12 §5 follows 343 |
| 1795 · complete causal-link 2×2 truth table | **`LANDED`** — the table is at line 281, all four states, and *"Stage 2 rejects `UNANCHORED`"* at line 321 |
| 2242 · archival summary of the review record | **`EXCLUDED`** — a retrospective, not an undertaking to change the draft. Counted as neither |

`2242` is worth naming: it would have inflated the count, and the predicate excludes it because it
promises nothing about the draft.

## Standing count

**The count below was wrong and is corrected in the section after it. It is left as written
because the correction is the more useful record.**

| | |
|---|---|
| undertakings in the population | ~~48~~ |
| audited by `#67` | 3 (of which 1 landed) |
| read in full here | 5 |
| screened by term presence | 48 |
| new `PARTIAL` found | **2** |
| still owed a full read | ~~43~~ |

## Correction · the denominator was wrong, and is still not known

gemini-code-assist on PR #108 found the standing count inconsistent: item `2242` was both counted
in the population and excluded as not an undertaking. Checking that led further than the
arithmetic.

**The population pattern under-counted.** It matched `### N. <title>` headings inside response
sections. `#67`'s three items sit under `### Structural Cleanups:` as plain `1.` `2.` `3.` list
entries and match nothing. They *are* undertakings by this predicate's own definition — numbered
items in a response section stating what will change, closed by *"Draft v0.2 will be updated with
these exact primitives."*

So the sealed predicate's *"#67 audited the three… 45 have never been checked"* is false: those
three were never in the 48, and **all 48 were unchecked** before this pass.

**And it over-counted.** Item `2242` is a `### N.` heading and promises nothing about the draft.
At least three more read like retrospectives rather than undertakings — `1. Retraction of
Premature "Logical Completeness"`, `3. Re-affirmation of Status: Working Draft`, `3. Transition to
Implementation` — and they have not been checked.

**Corrected standing:**

| | |
|---|---|
| `### N.` headings in response sections | 48 |
| plus undertakings the pattern missed (`Structural Cleanups`) | **+3** |
| minus `### N.` headings that promise nothing | **at least −1** (`2242`), count unknown |
| **true population** | **not yet known** |
| audited by `#67` | 3 |
| read in full here | 5 |

**Every other numbered group in the thread was checked and is a recap, not an undertaking** — 29
items under `Conformance Summary`, `Specification Status v0.4`–`v0.11`, `Summary of v0.7` and the
archival summary, each restating a `### N.` item already counted. Two more are v0.1's own body,
outside response sections entirely.

**`PREDICATE-rounds.md` is not edited.** It was sealed before classification and its error belongs
to the record; a predicate corrected after the fact is not a predicate. What the seal bought is
visible here: the miscount surfaced because the sealed text stated a number that could be checked
against the thread.

## The blind spot, which is this pass's real finding

The screen asks "did this vocabulary arrive". Item 315's vocabulary arrived; its **normative
force** did not. It was caught because the promise used the word "tie-break" and v0.12 uses
"Comparator" — luck, not method.

**So the round census cannot be completed by screening.** Every one of the 43 unread undertakings
may have landed with its marking dropped, and no term count will say so. That requires reading
each undertaking against the clause that answers it, and it has not been done.

Stated here rather than discovered later, in the same form the earlier census stated its limits.
