# ADR-1 — the declared id, allocation, and what Q8b costs

Status: **open**. Recorded 2026-08-31, after SF-2 was drafted and retracted.

## What is measured

The Phase C audit measured, against a conforming implementation: binding one record that
declares `id: alpha-0004` into a fresh store **took eight deposits and consumed eight
seqs, seven of them abandoned**.

That is not an implementation defect. Both the allocation mechanism and the check are
implemented as the documents require. **It is the price of conformance**, and it is the
first number anyone has put on Q8b.

## Why the obvious repair is illegal

SF-2 proposed making a declared id an allocation request, so that the assigned identity
always equals the declared one. It was retracted (relay-0468) for four reasons, of which
the fourth is decisive:

1. **The retry path breaks unrecoverably.** A candidate whose requested id is held or
   below the floor is refused forever, and resubmitting without the declared id is not the
   same record — the declared id is inside bound-content. Measured: `6e022773…` with,
   `af0ae656…` without.
2. **Bindings stop being monotone in time** against MUST 1's *"binds … monotonically"*,
   whose object that clause does not fix.
3. **It adds a second allocation mode** not entailed by MUST 1's single mechanism.
4. **It empties the clause it claims to serve.** Line 317 requires the envelope `id:` to
   be *"checked against the store-assigned id"*. You do not check X against Y if Y was
   chosen to equal X. A MUST requiring a check cannot be satisfied by removing the
   possibility of its failure.

The Phase B builder's argument against accept-with-observation — *"a check whose only
outcome is a note is not a check"* — applies one step further to SF-2: a check whose only
outcome is success.

## What removing the cost would require

Not a wording repair. One of three semantics must change, and each is a protocol decision:

1. **What the envelope `id:` is for.** Today it is *"the only identity a chain can pin"*
   and, measured, cannot in practice be pinned. Either the claim goes or the mechanism does.
2. **MUST 1's allocation mechanism.** First-free-marker is what makes a declared id
   satisfiable only by coincidence.
3. **The relation between declared id and record identity.** The amendment fixes the
   direction — identity is allocated, never computed from bound-content — and says nothing
   about whether a candidate may name the identity it wants.

## What is settled, and what is not

Settled: the cost is real and measured; SF-2 is not a legal repair; Q8b — what a store does
when the declared and assigned ids disagree — remains open, and the Phase B builder's
answer (refuse, id abandoned) is one coherent reading rather than the required one.

Not settled: everything else here. This record exists so the next round starts from the
measurement and the retraction rather than from the attractive repair.
