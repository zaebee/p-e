# Run 08 — the amended catalogue

2026-08-29. Same corpus, same withheld artifact, same instructions, the catalogue
carrying the relay-0056 amendments, and a reader told nothing about run 07 or
about the first blind reading.

| | agree |
|---|---|
| blind #1 vs blind #2 | **14 of 18** |
| all three readers | 4 of 18 |

Two independent readers agree with each other far more than either agrees with
ours. That makes our reader the outlier as a measurement rather than a suspicion.

## The amendments worked, and only where they were applied

| | blind #1 | blind #2 | run 07 |
|---|---|---|---|
| I-2 / apex | CONFORMS | **UNDECIDABLE** | UNDECIDABLE |
| I-9 / apex | CONFORMS | **UNDECIDABLE** | UNDECIDABLE |

Both flipped to agree with run 07, and both cite `relay-0056` in their reasons.
Those are the only two clauses the amendment touched, and no unamended clause
flipped for that reason.

The caveat stays attached: an amendment works by naming the misreading and handing
over the counterexample. I-9's clause contains `[0,0,0,0,0,0,0,0]` in its own text,
and blind #2 quotes it back. This is the treatment under test, not a free
reproduction.

## I-3 / hivemark VIOLATES is reproduced, on a clause nobody amended

Second reader, different catalogue, same verdict, same arithmetic — five input
files, 1,156,196 bytes, zero published. The I-3 clause is byte-identical between
the two bundles, so this is an independent second pass on the same text.

relay-0160 held the finding pending a second independent pass. That pass has
happened and agrees.

## I-5 / apex CONFORMS is reproduced

On a clause never amended in any version. Our reader stricter than its own clause,
confirmed twice.

## The finding nobody predicted

Both blind readers return **I-1 / apex CONFORMS**. Run 08 gives the reason:

```
health.json  entries[*].code  ->  200 ×2   502 ×2   null ×4
```

Three values. `null` is a host that returned no status at all; `502` is a status
that was returned and was an error. A property of the observation beside a property
of the subject — and **exercised four times out of eight**.

`src/checks/i1.ts` never opens that field. It reads history's per-host `status`,
the `gaps` counts, and the top-level `health.ok`, which is `true`, and concludes:

> the mechanism exists but is never exercised… A reader could distinguish
> not-observed from cold if it occurred; in this corpus it does not

That is a claim about the corpus, made without opening the field that exercises it.
Checked against the bytes rather than taken from the reader.

So this is a third kind of deviation, after I-3's laxer and I-5's stricter: an
**incomplete** reading, which reported the limit of where it looked as a limit of
the evidence.

On I-1 — the invariant whose entire content is that a property of our access must
not be published as a property of the subject. The reader committed it while
checking for it, in a sentence that reads perfectly until you open the file.

## Where the two blind readers differ from each other

Four findings, two of them the treatment. The other two:

| | blind #1 | blind #2 |
|---|---|---|
| I-8 / hivemark | UNDECIDABLE | EXCLUDED_WITH_REASON |
| I-9 / hivemark | UNDECIDABLE | EXCLUDED_WITH_REASON |

Blind #1 is right and blind #2 over-applied. Both clauses state that the value is
computed at runtime and never reaches an artifact, so the withheld
`attestations.json` would not have settled either. A reader can also be too
generous with *"I did not look"*.

## Both blind readers report 1 of 9 ADMITTED

Both reach it through `I-7`, and at hivemark both argue from `judge` appearing
nowhere — conformance from absence, which the catalogue places at
`NOT_APPLICABLE` and which is never support. The count is unchanged by this run.
