<!-- NOT A RUN -->
# Result — #88 claimed too much, and a blind reader found the two clauses I said were absent

**NOT A RUN.** Reader output verbatim in `READER-OUTPUT.md`, escape artefacts included — the
reader's tooling emits `§` for `§`, as it did in `docs/experiments/increment-close/`. Key at
`docs/experiments/rule-reach-key.md`, committed before the run in `a1d1a71`. Input re-hashed
after: matches `afd46fa4…`.

## Against the key

| | prediction | outcome |
|---|---|---|
| **P1** | finds line 90, *"hlc stamped once"* | hit |
| **P2** | finds line 93, *"MUST NOT re-tick"* | hit |
| **P3** | finds line 134, §4's comparator | hit |
| **P4** | 4–7 dependent sites | hit — **six** |
| **P5** | §4 comes back **nothing found** | **missed. It found two.** |
| **P6** | at least one break **not detectable from the bytes** | **missed. Five of six: detectable.** |

Four hits, two misses, and both misses go against the position I have been holding.

## P5 is the one that matters, and it corrects [#88](https://github.com/zaebee/p-e/issues/88)

I asked: does anything in the draft state, as an obligation, a property §3.3's rules exist to
produce? I predicted **no**. The reader found **two**:

> **Line 90** — **[MUST]** An act is sealed at creation: `id` minted, `hlc` **stamped once** …
>
> This requires `hlc` to be *stamped* — produced by a deterministic, repeatable method. §3.3's
> rules are the only method in the draft that defines how to stamp `l` and `c` deterministically.

> **Line 93** — **[MUST NOT]** Publishers **re-tick** the HLC … when retrying an existing `id`.
>
> Without §3.3, the property of deterministic, non-re-tickable HLC is not produced by any other
> stated mechanism.

**A prohibition on re-ticking is meaningless unless there is a tick.** §3.3's rules carry no
`[MUST]` of their own, and two normative clauses are nevertheless unsatisfiable without them.

So §3.3 is **not free-floating description**. It is load-bearing for normative clauses that
reference its mechanism without restating it.

#88 says *"the draft does not oblige what §3.3's rules produce"*. **That is too strong.** It
obliges at least two of those properties — deterministic stamping, and stability across retries —
by clauses that name the mechanism and leave its definition to §3.3. The issue needs correcting,
and the correction comes from a reader who never saw it.

## P6, and an observation that is mine rather than the reader's

I predicted a departure from §3.3 would be undetectable from an act's bytes. The reader answers
**detectable** for five of six sites.

Reading its reasons, three of the five rest on information a verifier does not hold:

> *"the `hlc` values fail to match what §3.3 would have produced **given the node's prior state**"*
> *"From a sequence of retry attempts …"*
> *"The detectability of why it's wrong requires observing the node's prior HLC state."*

A verifier receiving one act has neither the emitter's prior state nor its retry history. The
reader's own last quotation concedes this for line 93.

**Recording this as my observation and not as a correction of its verdict.** It answered the
question as asked, on a standard of detectability it stated; I am noting that the standard needs
more than an act carries. Whether that changes the answer is not mine to decide one message after
losing the prediction.

## What this does to v0.13

The clock sections were blocked on #88, and #88's premise has moved. The question is no longer
*"are §3.3's rules normative or merely descriptive"* — a draft that obliges an operation in two
places and defines it in a third has already made the rules load-bearing.

The question v0.13 actually faces is narrower and answerable: **does §3.3 get the `[MUST]` its
dependents already assume?** And if it does, defect 1 becomes a live conflict that must be
resolved before the section can be written, exactly as the key predicted — but for a better
reason than the one I gave.
