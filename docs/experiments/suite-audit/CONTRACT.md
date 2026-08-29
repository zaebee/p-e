# Audit contract

Set by **bee.zae**, who is not the author of the suite. Reproduced verbatim below.

The suite's author prepared the runnable bundle and did not write these questions,
because a validator written by the party being validated is the failure this whole
exercise exists to avoid.

---

## What you are auditing

`suite/conformance/` is a **reader-conformance suite**: it checks whether a
conformance reader (`suite/checks/`) correctly applies the normative clauses in
`CATALOGUE.md` to the corpus in `corpus/`.

The question is not whether the reader is correct. It is:

> **is the suite itself just another reader with the same blind spots?**

## The four questions

**A. Coverage.** For each rule the suite implements, does it actually observe all
the data the verdict depends on? Consider `Object.values`, proxy `get` traps,
implicit reads, derived fields, nested access.

**B. Fidelity.** Does the suite execute the `falsifier:` from the frozen clause, or
an interpretation the author believed equivalent? Distinguish:

```
clause → "I understood what it means" → implementation
```

from:

```
clause → explicit executable projection
```

**C. Evidence semantics.** Check the handling of `EXCLUDED_WITH_REASON`,
`UNDECIDABLE`, `VIOLATES`, `CONFORMS`, and in particular: does the suite anywhere
turn an absence of observation into evidence of absence?

**D. Harness integrity.** Establish independently which functions actually run,
which files are actually read, and which assertions can actually fail. Do not trust
`test passed`; look at the real execution path.

## The killer test

Try to **break the suite**. Not stylistic issues — build minimal synthetic corpora:

```
corpus₁ → should be VIOLATES
corpus₂ → should be CONFORMS
corpus₃ → should be UNDECIDABLE
corpus₄ → should be EXCLUDED
```

and check that the suite distinguishes them *where the clause distinguishes them*.

Then mutate: take a valid corpus, change **one field**, and expect the verdict to
change. If a mutation passes unnoticed, that is a real blind spot.

---

## What you have, and one thing you should know about it

- `CATALOGUE.md` — the normative catalogue at the commit that froze it, before any
  reader existed.
- `corpus/` — the eleven published artifacts the reader is run against, with
  `corpus/manifest.json` giving a sha256 for each. Note that
  `hivemark/attestations.json` is 3.4 MB; if it was not supplied to you, say so and
  treat anything depending on it accordingly.
- `suite/` — the conformance suite, the reader it checks, the adapters, and the
  tests, as they stand.

**The source comments narrate the suite's own history.** They name defects already
found in it and cite records you do not have. That was left in place rather than
stripped, because stripping it would mean the author choosing what an auditor sees
of the author's own work — which is the failure mode under audit.

The consequence is yours to manage: a finding that restates a comment is not a
finding. When you are reading the code, say so; when you are reading the code's
account of itself, say that instead.

## What you do not have, and must not seek

Our observation log, the relay history, the conformance reports, and every
conclusion we have drawn about where this suite is weak. The project is public. Do
not look it up. If you do, say so plainly — a labelled contaminated audit is
useful; an unlabelled one is worse than none.

## What to produce

Findings against A, B, C, D and the killer test, each naming the file and the line
or the synthetic corpus that demonstrates it. Where you cannot establish something,
say which of the two it is: the suite does not do it, or you could not tell.

That distinction is the subject of the catalogue you are holding, and this audit is
the first time it is being applied to the thing that checks it.
