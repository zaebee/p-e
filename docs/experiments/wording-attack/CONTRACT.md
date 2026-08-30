# Contract — wording attack

`DRAFT.md` contains proposed normative sentences for a protocol. They are a draft.
Your job is to find where they can be read in more than one way.

## §1 Read nothing else

Only `DRAFT.md` and this file. Do not search the filesystem, do not use the network.
You have no access to the protocol they belong to, and you do not need it.

## §2 What you are looking for

**Multiple internally coherent readings of the same sentence.**

You are not asked whether the sentences are good, whether you agree with them, or what
they should say instead. You are asked whether a competent implementer, reading in good
faith, could arrive at two different implementations — and, crucially, whether those two
would then behave differently in a way an observer could detect.

A reading counts only if it is **internally coherent**: it must be consistent with the
rest of the draft, not merely possible in isolation. A reading that contradicts a
neighbouring sentence is a reading the draft already excludes, and saying so is useful —
say which sentence excludes it.

## §3 For each ambiguity you find

- the sentence, quoted verbatim;
- reading 1 and reading 2, each stated as an implementer would state a rule;
- **the observable difference**: concrete input, and the differing output, state, or
  acceptance decision. If two readings cannot be told apart by any observation, they are
  not an ambiguity for this purpose — say so and move on;
- which reading, if either, the rest of the draft settles, and by which sentence.

## §4 Also look for

- **Terms used in more than one sense** across the draft, or a term introduced in one
  sentence and reused in another where it could mean something narrower or wider.
- **Undefined terms doing load-bearing work** — a word the rules turn on that the draft
  never fixes.
- **Sentences that state a rule without stating what a violation produces.**
- **Requirements that cannot be satisfied together**, if any.

## §5 What not to do

Do not propose replacement wording. Do not rank the sentences by quality. Do not
speculate about the authors' intent — if intent is unclear, that is itself the finding,
and the finding is the ambiguity, not your guess at what was meant.

If a sentence is unambiguous, say nothing about it. A short report of real ambiguities is
worth more than a long one padded with near-misses. If you find none, say so plainly;
that is a permitted and useful result.

## §6 Report

Write `READINGS.md` in this directory. Plain markdown.
