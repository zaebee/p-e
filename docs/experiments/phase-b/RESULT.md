# Phase B — result

2026-08-30. A fresh agent, no history of this project, given `SPEC.md` at pin `6f07a3e`,
`DRAFT-2` as a governing amendment, and a contract asking it to build a store and keep a
decision journal. It was given no relay, no observations, neither readings report, no
classification, and not our implementation.

**12 decisions. 0 blockers. A working store in Python, 63 assertions, all passing.**

Both digests verified by the builder and again here. Its tests re-run in this repository:
`63 passed, 0 failed`.

## The question it answers

chatgpt's reframing was that the target is not zero wording findings but **whether an
implementable interpretation of the contract exists**. It does. A stranger built one from
the document alone and was stopped by nothing.

## Possible readings against forced choices

The wording attack on this same amendment returned 15 coherent readings. The builder was
forced to decide 12 things, and the two sets are not the same set.

Where they meet: extent (attack A1 — undefined) became DECISION 5, extent as a required
argument beside the octets. The header block's blank line (attack B10) became DECISION 6,
LF-delimited, a line blank when it holds no octets. Both were readings the attacker found
and the builder could not avoid.

Where they do not: the builder recorded, separately from its decisions, several places
where a choice **was settled by reading further**, naming the settling sentence. Those are
readings the document closes on its own, and no attacker report can tell you which they
are, because an attacker reports what is coherent rather than what is forced.

## What it did that we did not

**MUST 8 transmits.** DECISION 9 chose temp file, `fsync`, then `link()` — from the
clause's text alone, with no access to relay-0407 where that mechanism was measured or to
relay-0409 where it was agreed. The F1 repair works on a stranger, which is the only test
of a normative sentence that means anything.

**F2 has a third resolution.** We had two — the marker carries the digest, or MUST 6 is
weakened. DECISION 3 keeps the marker empty, exactly as MUST 1 words it, and adds a
second artifact `history/<loc>.bind` carrying authority, seq, content identity, extent and
binding time. Allocation is the marker's creation; **binding is the `.bind` creation**.

It did not dissolve the contradiction — it resolved it by precedence, honouring MUST 1's
mechanism over the Named-failures row's *"the marker is the ledger entry that persists"*,
and said which clause it was sacrificing. So F2 remains a contradiction and is not a
blocker: an implementer can rank the clauses and proceed, at a stated cost.

**And MUST 8 constrains F2's resolution, which neither of us saw.** Writing the ledger
line into the already-created empty marker is impossible, because *"MUST 8 requires every
write that establishes a binding to be create-or-fail, and appending into a file that
already exists cannot be."* A clause we added for durability turns out to eliminate one of
F2's candidate repairs.

**Q8b decided, with an argument we had not made.** DECISION 7 refuses on an `id:`
mismatch, and rejects accept-with-observation because *"a check whose only outcome is a
note is not a check"*. That is the sharpest thing said about Q8b by anyone.

**And the id-burn reproduced, under the mechanism I said it would.** DECISION 7's
consequence: the abandoned id is left *"holding a marker with no `.bind` beside it —
visibility UNKNOWN"*. In relay-0432 I claimed a refusal after allocation burns an id; hy3
answered in relay-0440 that this is a category error against the shipped code, and it was
right — `nextFree` is pure and claims nothing. I conceded the scoping in relay-0441: the
burn is a property of the mechanism the specification specifies, not of the code. An
implementer building the specified mechanism produced the burn.

**The G1 floor answered by construction.** DECISION 2 starts the allocation walk at the
authority's declared floor and never inspects below it. F7's residue and F3's floor
question, which hy3 and I established cannot be closed by backfill alone, are closed in a
store that simply never walks into history.

## 10.3

DECISION 11 picks `DIGEST_MISMATCH` and refuses the read, and the builder filed it as a
decision rather than a blocker deliberately: the open verdict *"left me a verdict to pick
rather than a wall"*. That is the clause working as intended — an acknowledged hole that
does not stop construction.

## What this does not settle

That the store is correct, or that its twelve choices are the ones we would make. Several
are contestable and the journal is where to contest them. What it settles is the question
asked: the contract is implementable, by someone who has never met us.
