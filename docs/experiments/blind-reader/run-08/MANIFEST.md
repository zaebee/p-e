# Run 08 — the same corpus, the amended catalogue

> **Not part of the bundle. Never give this file to the reader.** It says which
> clauses were amended, which is the treatment under test.

The second blind reading. It changes exactly one variable against the first: the
catalogue carries the relay-0056 amendments. Same corpus, same withheld artifact,
same instructions, a reader told nothing about any previous reading.

  reader #1  →  catalogue at `580c01d`   →  does the clause text prescribe the defects?
  reader #2  →  catalogue amended        →  did the amendments change that?

## The single variable

`CATALOGUE.md` here differs from the first bundle's inside the invariant blocks in
two places and nowhere else, verified by diffing section 3 of both:

- **I-2 `reader:`** gains *"NEITHER PRODUCER CAN CONFORM ON ORDERING ALONE.
  Ordering is not occurrence… VIOLATES stays reachable; CONFORMS does not."*
- **I-9 `reader:`** gains *"a gaps count is present AND at least one is non-zero.
  Presence alone confirms nothing: [0,0,0,0,0,0,0,0]…"*

Both amendment texts argue against a specific misreading and cite a corpus fact.
That is deliberate — the amendment *is* the treatment — but it means a reading of
I-9/apex under this catalogue is not independent of the counterexample it is
handed. Any comparison must say so rather than score it as a free result.

`I-5`'s clause is byte-identical in both. It was never amended.

## What was removed, and why

The current specification cannot be handed over whole: section 11 records this
document's own corrected errors, naming which `reader:` clauses were defective and
quoting a verdict from run 01 verbatim, and a paragraph added to section 1 on
2026-08-29 names the five invariants whose title and falsifier diverge.

| removed | bytes | sha256 |
|---|---|---|
| §1 ruling paragraph | 1,229 | `3ed31eac99f892a918c3984ed6df1106…` |
| §11 in full | 3,587 | `3c213f989ba8c1fb68738ec1870b843b…` |

Section 1 defines the normative catalogue as the invariant statements, §4, M1–M4
and U-1/U-2 — all present and untouched. §11 is not normative and discusses
results. The governance ruling that the falsifier is the normative test is stated
in `TASK.md` instead, without the list of which invariants diverge.

This is an editorial decision by the party whose reader is under test, and it is
recorded here with digests so it can be checked rather than trusted. No text
inside any invariant block was altered.

## What the reader received

| file | bytes | sha256 |
|---|---|---|
| `docs/experiments/blind-reader/run-08/CATALOGUE.md` | 44,090 | `299a7debcad8bb450d6c1f8c68d0ad122b3d659d236c5efb98e35048f759757f` |
| `corpus/manifest.json` | 3,477 | `a945c380c78eb07918fe368d09b52c173523acd7e8254e56a808d17ded09d67e` |
| `corpus/apex/health.json` | 1,301 | `777aa3a816d3b7e2f46d14e53eaa6d17c7ca99436d836e2c0100d5c7bb10e9ae` |
| `corpus/apex/history.json` | 1,126 | `51b37bcfc73a1896a3a86fc72fe855181d76ce206f1e0f41a72afe2c9e0b4eb4` |
| `corpus/apex/log/asking-for-citations-produced-citations.md` | 5,793 | `93c56fe13f0c2a598b6de2556889cfd95f74b8e6b032810bb6edafd1b07afd46` |
| `corpus/apex/log/correcting-a-claim-added-two.md` | 2,782 | `995ed6e1a441ceee377bf6edb70a84b35a403439e7526a555bf94264870cd5d1` |
| `corpus/apex/log/the-defects-were-in-the-lines-they-praised.md` | 7,155 | `7f124744925fe8085808e98d39260285692c458333bc3cfce34ad3478fd7ebf9` |
| `corpus/apex/log/witnesses-who-had-not-looked.md` | 2,998 | `460115bf11d16dbf0ffe6e6283e01b2e70adfb1e436d91d1f01653e492c1338d` |
| `corpus/hivemark/anchors.json` | 142,047 | `5a73249ce2a191aa6ba599c65b0e79ccaa22b1220bea3f8bf39714fc42629dc8` |
| `corpus/hivemark/births.json` | 1,242 | `1bd0262fec66105cf845b17d6ead4f12e2415bc0db0f9e8788eae332211224fd` |
| `corpus/hivemark/corpus.json` | 1,603 | `edfbd2cf413a8f6e5376a736bac1a0c525dfe94f03164f74d7034fc9431bb22a` |
| `corpus/hivemark/provenance.json` | 1,140 | `1953eae4a78371ace59dfa9aebad5221499f8cab68bd5c4f5cdcb964adb90b04` |

`corpus/hivemark/attestations.json` is withheld again, on the same grounds, and
`TASK.md` again instructs `EXCLUDED_WITH_REASON` rather than `UNDECIDABLE` for
anything depending on it. Keeping the withholding identical is what makes the two
runs comparable; it also means run 08 cannot settle the four hivemark findings
that run 07's reading could not reach either.

## What this run cannot settle

It is one reader on one catalogue. A difference between the two runs is evidence
that the amendments changed a reading; it is not evidence that they changed it
correctly, and a reader may differ from run 07 for reasons that have nothing to do
with the amendments.
