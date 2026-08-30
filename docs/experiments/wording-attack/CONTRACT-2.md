# Contract — wording attack

`DRAFT.md` contains proposed normative sentences for a protocol. They are a draft.
Your job is to find where they can be read in more than one way.

## §1 Read nothing else

Only `DRAFT.md` and this file. Do not search the filesystem, do not use the network.
You have no access to the protocol they belong to, and you do not need it.

## §2 What you are looking for

**Multiple internally coherent readings of the same rule.**

You are not asked whether the sentences are good, whether you agree with them, or what
they should say instead. You are asked whether a competent implementer, reading in good
faith, could arrive at two different implementations — and whether those two would then
behave differently in a way an observer could detect.

A reading counts only if it is **internally coherent**: consistent with the rest of the
draft, not merely possible in isolation. A reading that contradicts a neighbouring
sentence is one the draft already excludes — say so, and name the excluding sentence.

**Attack single sentences and compositions both.** A wording can be locally unambiguous
and still underspecify the composed protocol: each clause clean on its own, and an
implementer forced to combine them into one write path and one read path arrives
somewhere the draft never fixed. Give the compositions at least as much attention as the
individual sentences, and say which kind each finding is.

## §3 The draft defines its terms. Attack the definitions too.

- **Circularity**: a definition that uses, directly or through a chain, the thing it
  defines.
- **A term used outside its definition**: defined one way, then relied on in a sentence
  where that definition does not fit, or does not settle the question the sentence turns
  on.
- **A term left undefined**: a word the rules turn on that the definitions never fix.
  Check every load-bearing noun in the rules against the definition list, including words
  that look ordinary.
- **A definition that admits cases its rules do not handle**, or excludes cases the rules
  assume.

## §4 For each finding

- the sentence or the set of composed sentences, quoted verbatim;
- reading 1 and reading 2, each stated as an implementer would state a rule;
- **the observable difference**: concrete input, and the differing output, state, or
  acceptance decision. If two readings cannot be told apart by any observation, they are
  not a finding for this purpose — say so and move on;
- which reading, if either, the rest of the draft settles, and by which sentence.

## §5 Deliberate gaps

Where the draft marks something as not defined, the gap itself is not a finding — it is
declared. But whether other clauses interact with it *is*: if a gap widens or narrows
what a neighbouring rule permits, or if two clauses disagree about what happens in it,
that is a finding and should be reported as one.

## §6 What not to do

Do not propose replacement wording. Do not rank the sentences by quality. Do not
speculate about the authors' intent — if intent is unclear, that is the finding.

If a sentence is unambiguous, say nothing about it. A short report of real findings is
worth more than a long one padded with near-misses. If you find none, say so plainly;
that is a permitted and useful result.

## §7 Report

Write `READINGS.md` in this directory. Plain markdown.
