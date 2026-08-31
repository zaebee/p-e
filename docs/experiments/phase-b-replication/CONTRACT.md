# Contract — build a store

Build a working implementation of the store this specification describes, and keep a
record of every decision the specification did not make for you.

## What you were given

- `SPEC.md` — the specification.
  sha-256 `847b8971d36390cd8843da7ebe59bc3499cd8050473425eb91a4a09f30b9901c`
- `AMENDMENT.md` — adopted amendments to it, governing record identity, the digest
  domain, and recording at binding. Where the two disagree, the amendment governs.
  sha-256 `abe840dcd5bb00f5ecbfb7fc6e55b8cd4aaa8e049f2c4be0f53e572c4a5d644b`

Verify both digests before reading, and say in your report whether they matched.

## §1 Read nothing else

Only this directory. Do not search the filesystem, do not use the network. There is an
implementation of this specification in existence; you do not have it and must not look
for it. Everything you need is in the two documents.

## §2 Scope

Build a store for **one authority**. Out of scope, and you are not asked to implement or
design for them: deletion, migration of an existing corpus, crash recovery, more than one
authority, and cross-authority history. If a clause only makes sense under one of those,
note it and move on.

In scope: accepting a record, allocating identity, binding, persisting, reading back, and
whatever the specification requires of those.

Choose your own language and runtime. Nothing depends on which.

## §3 Build it, and make it run

Write the code and run it. A store you have not executed is not an answer to this
contract. Include whatever tests convince you it does what the specification says, and
say plainly which parts you could not test and why.

## §4 The decision journal — this is the deliverable

Every time the specification leaves you a choice, record it, in `DECISIONS.md`, as it
happens rather than reconstructed afterwards:

```
DECISION <n>
  clause:        the sentence or MUST that left the choice, quoted verbatim
  chosen:        the interpretation you implemented, stated as a rule
  rejected:      the other interpretation(s) you considered, each stated as a rule
  why:           why the rejected reading was insufficient — what it failed to satisfy,
                 or what it would have made impossible
  consequence:   what an observer could see that differs between your choice and the
                 rejected one. If nothing, say so.
```

A choice belongs in the journal when **you had to decide in order to write code** — not
when you noticed the text could be read two ways and it made no difference to you. The
distinction matters more than completeness: I want the choices the specification forced,
not every reading it admits.

If you resolved a choice by reading further and finding it settled elsewhere, that is not
a decision — but it is worth one line saying which sentence settled it.

## §5 Where you cannot proceed

If a clause blocks you outright — you cannot write any code that satisfies it, or two
clauses require incompatible things — stop at that point, record it in `DECISIONS.md` as
a blocker with the same fields, and continue with the rest of the build if the rest is
independent. Do not invent a resolution and proceed silently.

## §6 What this is not

You are not auditing the specification and not being graded on finding faults in it. If
it is clear, the journal is short and that is a good outcome. Do not pad it.

You are also not being graded on completeness of the store. A partial store with an
honest journal is worth more here than a complete one whose decisions were not recorded.

## §7 Report

- `DECISIONS.md` — the journal.
- `NOTES.md` — one page: what you built, what runs, what does not, and the digest check
  from above.
- the code itself, in this directory.
