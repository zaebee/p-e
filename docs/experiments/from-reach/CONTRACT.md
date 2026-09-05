# Contract — what reaches into `from:`?

You are given a working record store in `input/`: its code, its written rules, its
methodology documents, and 819 of its records.

## §1 Read nothing else

Work only from `input/`. Do not fetch anything, do not look for the project online, do not
use knowledge you may have of it. If you recognise it, set that aside.

## §2 The question

Every record in this store carries a `from:` header naming who it is from.

**Consider the same store with one change: every record's `from:` value is replaced by a
random string, different for every record, matching nothing else anywhere.**

**What breaks?**

For each thing you find:

1. **Quote it**, with its file and line number.
2. **Say what breaks** — what it does today with `from`, and what it would fail to do.
3. **Say whether the break is detectable** — would anyone notice, from the bytes, from a
   sequence of records, from running the code, or not at all?

Work outward from the field rather than reading front to back: find what *reads* it, what
*decides* on it, and what *assumes* it is true.

## §3 The sourcing rule, which binds every statement you make

**Every claim quotes a line and gives its number.**

If the ground for a claim is not code that runs — if it is a comment, a document, a record's
prose, or your own inference — **the claim must say so in itself**:

> "sourced in a comment at code/store.ts:301, not in a branch"
> "sourced in a record's prose, relay-0499, not in code"
> "inferred; nothing here states this"

A claim that can do neither is an opinion. Mark it as one and keep it separate.

## §4 The other direction

**Does anything here establish who deposited a record, by some means other than the record
saying so?** Quote what you find, or say you found nothing. **Nothing is a finding.**

## §5 A rule this store states about its own reviews

`input/rules/AGENTS.md` contains a rule numbered 14. **Say what, if anything, would have to
be true about a record for that rule to be checkable** — and whether this store can check it
today. Quote your grounds.

## §6 State your rule before you apply it

Before your list, say what you counted as "breaks". Code taking a different branch is one
kind; a human being misled is another; a rule becoming uncheckable is a third. Say where you
drew the line and why.

## §7 What you are not told

You are not told what this question serves, what anyone believes the answer to be, what has
already been decided, or whether the store is thought to have a problem.

**Do not recommend a change. Do not propose a design, a field, or a mechanism.** If you find
yourself concluding that the store ought to be different, stop — that is outside this
contract.

## §8 Confidence

One line per finding: how sure you are, and of what.

## §9 One shot

Produce the whole answer once, in a single document, written to `answer.md` in the directory
above `input/`. Do not ask questions first.
