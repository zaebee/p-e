# For whoever carries this to the reader

## What this is

A blind replication. One party has already performed this comparison and holds a partial answer
key — a known-incomplete list of items present in A and absent from B. The reader is not told
this, must not be told this, and must not be told the size of that list.

## Why it is being run

The party who produced the answer key searched for terms they already knew to search for,
because they already knew which questions were open. That method finds a rule whose absence is
already suspected, or one lying beside such a rule. It cannot enumerate its own blind spots.

This run tests exhaustiveness, and it can come out three ways:

- **The reader finds items outside the key.** The original sweep was not exhaustive. This is the
  outcome the run exists to make possible, and the most useful one.
- **The reader finds the key and nothing more.** Weak evidence of exhaustiveness, and no more
  than weak — two searches can share a blind spot, particularly if both are searches for the
  same kind of thing.
- **The reader misses items in the key.** Says something about the reader or the contract, not
  about the documents. Report it as such and do not use it to promote the key.

## Rules for the carrier

1. Deliver `CONTRACT.md`, `A-v0.1.md`, `B-v0.12.md` and `PIN.txt`. Nothing else from this
   repository — not the specification addendum, not the research brief, not the relay records,
   not the issues.
2. Do not name any field, default, or formula in the conversation. Not as an example, not as a
   clarification, not in answer to a question. If the reader asks whether something specific
   counts, answer only from `CONTRACT.md`.
3. Do not say how many items are expected, or that any are expected.
4. The reader may push back on the contract. Record that verbatim rather than resolving it — a
   contract that cannot be applied is a finding about the contract.
5. Return the reader's output verbatim, including anything that looks wrong. Do not correct,
   trim, or reorder it.

## What the input is

Both documents are verbatim. `A-v0.1.md` is the body of the issue in which the specification was
first proposed; `B-v0.12.md` is the committed draft. Neither has been edited for this run,
including B's header, which references its own origin. Doctoring the input to remove such
references would have been the larger error.

The documents are in different languages — A is largely Russian, B is English. That is a real
property of the lineage and a real difficulty for the task. It is not a trick, and the contract
says so in §5.
