# Contract — what reaches into §3.3?

You are given a draft protocol specification in `input/`.

## §1 Read nothing else

Work only from `input/`. Do not fetch anything, do not look for the project, do not use
knowledge you may have of it. If you recognise it, set that aside.

## §2 The question

Consider an implementation that follows **everything else in the draft** and **does not follow
§3.3's two rules** — it produces `l` and `c` values by some other method of its own.

**Which parts of the draft does that break, and how?**

For each part you find:

1. **Quote it**, with its line number.
2. **Say what breaks** — what the clause promises, and what an implementation ignoring §3.3
   would fail to deliver.
3. **Say whether the break is detectable** — could another party observe it from the act's bytes,
   from a sequence of acts, or not at all?

Work outward from §3.3 rather than reading front to back: find what *refers* to it, what *uses
the values it produces*, and what *assumes something about their behaviour*.

## §3 The sourcing rule, which binds every statement you make

**Every claim about what the specification requires quotes a line and gives its number.**

If the ground for a claim is not a normative `[MUST]` or `[MUST NOT]` clause — if it is
explanatory prose, a code comment, a type declaration, a cited external work, or your own
inference — **the claim must say so in itself**:

> "sourced in prose at line 119, not normative"
> "sourced in the type declaration at line 54"
> "inferred; the draft does not state this"

A claim that can do neither is an opinion. Mark it as one and keep it separate.

## §4 The other direction

**Does anything in the draft state, as an obligation, a property that §3.3's rules exist to
produce?** Quote what you find, or say you found nothing. Nothing is a finding.

## §5 State your rule before you apply it

Before the list, say what you counted as "depends on §3.3". A clause that mentions the HLC by
name is one kind of dependence; a clause whose promise silently needs the rules to hold is
another. Say where you drew the line.

## §6 What you are not told

You are not told what status §3.3 has, what anyone thinks it should have, what decision this
question serves, or what has already been settled about this protocol.

**Do not recommend a status for §3.3. Do not say whether it should be normative.** If you find
yourself concluding that the draft ought to be changed, stop — that is outside this contract.

## §7 Confidence

One line per finding: how sure you are, and of what.

## §8 One shot

Produce the whole answer once, in a single document. Do not ask questions first.
