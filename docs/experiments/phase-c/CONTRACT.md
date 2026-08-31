# Contract — implementation audit

An implementation of a specification is in `impl/`. Determine whether it satisfies the
specification, and produce counterexamples where it does not.

## What you were given

- `SPEC.md` — the specification.
  sha-256 `847b8971d36390cd8843da7ebe59bc3499cd8050473425eb91a4a09f30b9901c`
- `AMENDMENT.md` — adopted amendments governing record identity, the digest domain, and
  recording at binding. **Where the two disagree, the amendment governs.**
  sha-256 `abe840dcd5bb00f5ecbfb7fc6e55b8cd4aaa8e049f2c4be0f53e572c4a5d644b`
- `BUILD-CONTRACT.md` — what the implementer was asked to build, including the scope it
  was told to exclude. Anything excluded there is not a defect here.
- `impl/` — the implementation and its own tests.

Verify both digests before you start, and say whether they matched.

## §1 Read nothing else

Only this directory. Do not search the filesystem, do not use the network. You may run,
modify and instrument copies of the code freely inside this directory.

## §2 What counts as a defect

The implementation violates a MUST, or fails to provide something a MUST requires, **under
every coherent reading of the clause**.

That qualifier is the whole of this contract. The specification is underdetermined in
places, and the implementer had to choose. **A choice you would have made differently is
not a defect.** If the implementation satisfies the clause under some reading a competent
implementer could hold in good faith, it conforms, and you should say so rather than
report it.

Where you find a clause the implementation reads one way and you read another, and you
cannot show its reading is incoherent — that is a finding about the *specification*, not
about the code. Report it in a separate section under that heading. It is valuable and it
is not a defect.

## §3 Counterexamples, not opinions

Every defect must come with an executable counterexample: input, the observed behaviour,
the clause it violates quoted verbatim, and why no coherent reading of that clause admits
what you observed. **Run it.** A defect you have argued but not executed is not yet a
defect — say so if you could not run it, and say why.

Do not repair the code. If you modify a copy to instrument it, say so.

## §3.1 Its own tests

`impl/` contains tests the implementer wrote. Run them. Then treat them as evidence about
the implementer's understanding, not about correctness: a passing suite written by the
same party proves that the code does what its author thought the specification said.
Where a test asserts something the specification does not require, or asserts the negation
of what it requires, that is worth more than the pass rate.

## §4 Finding nothing is a permitted result

You are not asked to produce a defect. If the implementation conforms, say so plainly and
show what you tried — the attempts that failed to break it are the evidence, and a report
of six serious attempts that all failed is worth more than one manufactured finding.

Do not pad. Do not rank by severity unless you have defects to rank.

## §5 Report

`AUDIT.md` in this directory: the digest check, defects with their counterexamples,
specification findings under their own heading, what you tried that did not break it, and
what you could not test and why.
