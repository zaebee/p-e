# Contract — build a store (v2)

Build a working implementation of the store these documents describe, record every
decision they did not make for you, and report what you covered.

## What you were given

- `SPEC.md` — the specification.
  sha-256 `847b8971d36390cd8843da7ebe59bc3499cd8050473425eb91a4a09f30b9901c`
- `AMENDMENT.md` — adopted amendments. **Where the two disagree, the amendment governs.**
  sha-256 `efcf6df9b3a25ad37d8db628e5d0cd497e1ad9b701c2294aae2738d453dbb2a6`

Verify both digests before reading, and say in your report whether they matched.

## §1 Read nothing else

Only this directory. Do not search the filesystem, do not use the network, and do not
look for an existing implementation of this specification. Ones exist; you do not have
them and must not go looking. Everything you need is in the two documents.

## §2 Scope

Build a store for **one authority**. Out of scope, and you are not asked to implement or
design for them: deletion, migration of an existing corpus, crash recovery, more than one
authority, and cross-authority history. If a clause only makes sense under one of those,
say so in the coverage report and move on.

In scope: accepting a record, allocating identity, binding, persisting, reading back, and
whatever the documents require of those.

Choose your own language and runtime. Nothing depends on which.

## §3 Build it, and make it run

Write the code and run it. A store you have not executed is not an answer to this
contract. Include whatever tests convince you it does what the documents say, and say
plainly which parts you could not test and why.

## §4 The decision journal

Every time the documents leave you a choice, record it in `DECISIONS.md` as it happens
rather than reconstructed afterwards:

```
DECISION <n>
  clause:        the sentence or MUST that left the choice, quoted verbatim
  chosen:        the interpretation you implemented, stated as a rule
  rejected:      the other interpretation(s) you considered, each stated as a rule
  why:           why the rejected reading was insufficient
  consequence:   what an observer could see that differs between your choice and the
                 rejected one. If nothing, say so.
```

A choice belongs here when **you had to decide in order to write code** — not when you
noticed the text could be read two ways and it made no difference to you. The distinction
matters more than completeness: I want the choices the documents forced, not every reading
they admit.

If you resolved a choice by reading further and finding it settled elsewhere, that is not
a decision — but it is worth one line naming the sentence that settled it.

## §5 The coverage report — new in v2, and required

In `COVERAGE.md`, take **every MUST in both documents** in turn and report:

```
<clause>   IMPLEMENTED | NOT IMPLEMENTED | NOT APPLICABLE
  reason:    why, in one or two sentences
  evidence:  the file and line, or the test, that backs the claim
```

`NOT IMPLEMENTED` is a permitted and honest answer. A MUST you chose not to implement,
said so, and gave a reason for is a fine result. **A MUST you did not notice is what this
report exists to prevent** — a previous build passed its whole test suite green while
implementing none of one MUST at all, and nothing in its output revealed that.

`NOT APPLICABLE` requires a reason naming the scope exclusion in §2 that covers it.

## §6 Where two conforming stores could differ

In `DIVERGENCE.md`, list the places where you believe **another implementation could
satisfy these same documents and behave observably differently from yours.** For each:
the input, your behaviour, the other behaviour, and the clause that permits both.

This is not a list of your decisions restated. A decision is a choice you made; this is a
prediction about what the documents allow someone else to do. Where you are confident the
documents force your behaviour and no other, say nothing — the short list is the
interesting one.

## §7 Where you cannot proceed

If a clause blocks you outright — you cannot write any code that satisfies it, or two
clauses require incompatible things — stop, record it in `DECISIONS.md` as a blocker with
the same fields, and continue with the rest if the rest is independent. Do not invent a
resolution and proceed silently.

Note that one document already says of itself that a requirement in the other is
unimplementable. Finding others is a legitimate and useful result.

## §8 What this is not

You are not auditing the documents and not being graded on finding faults in them. If they
are clear, the journal is short and that is a good outcome. Do not pad.

You are not being graded on completeness of the store either. A partial store with an
honest journal and an honest coverage report is worth more than a complete one whose
decisions and gaps were not recorded.

## §9 Report

`DECISIONS.md`, `COVERAGE.md`, `DIVERGENCE.md`, `NOTES.md` (one page: what you built, what
runs, what does not, and the digest check), and the code.
