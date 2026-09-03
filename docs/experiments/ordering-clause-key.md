<!-- NOT A RUN -->
# Pre-registered key for the ordering-clause blind read

**NOT A RUN.** Not a `docs/reports/*-conformance-NN.md`, changes no catalogue.

Written and committed **before** the reader runs, so it cannot be adjusted afterwards.
Deliberately not placed with the sealed input, which lives outside this repository at
`~/projects/ordering-clause/`.

## What the run tests

Attack 4 of `relay-0769`. In designing a `RelayLiteStore` backend for relay-ui's `IRelayStore`, I
claimed that a store emitting `seq` would violate §4's

> **[MUST NOT]** A consumer presents any linear projection as *the* causal history, or makes
> protocol assertions from a linearized sequence.

`relay-0768` then doubted it: the clause binds *a consumer*, and a store emitting a field may not
be one — in which case I had converted a consumer obligation into a producer prohibition.

I have since moved a third time, which is the reason for a blind reader rather than more
re-reading by me. **A reader who has seen any of my three positions would be choosing among
them rather than reading the clause.** That rules out `relay-grok`, who reads this corpus.

## My position at the time of writing, recorded so it cannot be revised later

**P1.** The clause does not define "consumer". The word occurs exactly twice in the whole
specification — counted as occurrences, not lines — and both are in §4 itself. Nothing in the
document says who is one.

**P2.** On the first prohibited act, emitting a `seq` field is not "presenting a linear
projection as *the* causal history". Producing a number is not presenting it as anything. My
original claim was wrong in this general form.

**P3.** On the second — "makes protocol assertions from a linearized sequence" — the exposure is
real but does not sit in the store. `B-store-interface.ts` names
`RelayStoreStatus.totalSequencesAllocated`, which asserts an *allocator* rather than a computed
display value, and `C-tool-descriptions.txt` has the running service calling itself a "monotonic
sequence log" with a resource named "Relay Monotonic Ledger". Calling a partial order a monotonic
ledger is the prohibited act, and the party doing it is the presentation layer.

**P4.** Therefore the integration is not blocked by §4. The constraint lands on what the
application *says* about the ordering, not on whether the store emits a number.

## What each outcome would mean

- **The reader reaches P1 and something like P2–P3.** My third position survives an independent
  reading. It does not confirm it — a second reader can share a blind spot with the first, and
  this one is given the same three documents I read.
- **The reader finds the clause binds the store.** My original claim was right and both later
  positions were wrong. This is the outcome that costs the most and is worth the most.
- **The reader finds something in neither the key nor my three positions.** The most useful
  outcome, and the one the contract's §4 and §5 exist to make possible — two readings, and the
  members of `B` that have no counterpart in `A` reported as their own finding rather than folded
  into the verdict.

No prediction is recorded about which. The three positions above are mine in sequence, and
having held all three is itself the reason not to trust the fourth.

## What is deliberately in the input

The whole specification, not §4 alone. Trimming to the clause would remove exactly the context
needed to decide what "consumer" means in this document — which is question 1.

`C-tool-descriptions.txt` is quoted with source line numbers rather than summarised, because P3
turns on the wording of a self-description and a paraphrase of it would be my reading rather than
the service's words.

## Carrier rules

Deliver `PROMPT.md`, `CONTRACT.md`, `A-spec.md`, `B-store-interface.ts`, `C-tool-descriptions.txt`
and `PIN.txt`. Nothing else from either repository — not this key, not the relay records, not the
issues.

Do not name a party, a verdict, or a file line in conversation. If the reader asks whether
something counts, answer only from `CONTRACT.md`. Return the output verbatim, including whatever
looks wrong.
