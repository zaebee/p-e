# Blind reader — exactly what was handed over

2026-08-29. The experiment proposed in relay-0153: **can an independent agent take
the frozen catalogue and the raw evidence and reach the same verdicts without being
told the result first?**

This file exists so the answer is checkable rather than reported. Every byte the
reader received is named by digest below. Nothing here is a summary of what it saw.

> **This file is not part of the bundle. Never give it to the reader.** It quotes
> a verdict from run 01 verbatim, in the section explaining why the current
> specification was unusable — so the document describing the blinding is itself
> disqualifying to read. The bundle is `TASK.md`, `CATALOGUE.md`, and the corpus
> files listed below. Nothing else.

## The instructions

`TASK.md` — given as the system prompt.

  sha256 `7ca129ad0d37c8c696d4c87eb7252afd8421ec3beca53ed05c3ce6750497d93b`

## What the reader received

| file | bytes | sha256 |
|---|---|---|
| `docs/experiments/blind-reader/CATALOGUE.md` | 40,488 | `c85c8afb0590d354a027c11e6672673b062759bdc0b3badd3b658af0e020d1c9` |
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

`CATALOGUE.md` is the specification **at the commit that froze it**, `580c01d`,
which is the last revision before the first conformance run existed. It is
byte-identical to `git show 580c01d:docs/superpowers/specs/2026-08-28-p-e-core-design.md`.

The current specification was **not** used, and the reason is a leak rather than a
preference: it now names the five invariants whose title and falsifier diverge, and
§11 quotes a verdict from run 01 verbatim — *"the enforcement itself is a test
inside the producer and is not observable from artifacts — only its result is"*.
Both additions are from 2026-08-29 and would have handed the reader an answer.

The corpus files are the repository's own `corpus/`, unchanged. `diff -rq` against
the bundle reports no difference, so they are referenced here rather than copied.

## What was withheld, and why

| file | bytes | sha256 |
|---|---|---|
| `corpus/hivemark/attestations.json` | 3,556,935 | `74cf4ebc787232eb54f58027f2b085513893665b81cd4136e41c99a4152bc736` |

932 signed envelopes at 3.4 MB — roughly 988,000 tokens on its own, against about
60,000 for everything else combined. It does not fit alongside the rest in a chat
context, and supplying it would have left no room to compute over it.

`TASK.md` instructs the reader to mark anything depending on it
`EXCLUDED_WITH_REASON` — *the reader did not look, and says why* — and explicitly
**not** `UNDECIDABLE`, which would report our packaging decision as a property of
hivemark's data. Withholding it silently would have let curation decide verdicts,
which is the failure this project has now recorded three times.

## What the reader was not blind to

`CATALOGUE.md` carries its own predictions: `expect:` lines on individual
invariants, and the registered prediction in §9. Those were written before any
evidence was read, precisely so they could not be adjusted afterwards. They were
not removed, because removing them would mean editing the frozen catalogue to suit
the exercise — and then the shape of what the reader saw would be ours.

So the result is blind to every verdict anyone reached, and not blind to what the
catalogue predicted about itself before it knew. Any report from this experiment
carries that label.

## Not supplied under any circumstances

The seven conformance reports, the reader implementation in `src/`, the 55
observations, the 114 relay records, and `docs/CLOSING-REPORT.md`. All of these
state or derive the verdicts.

**The repository is public**, so a reader with web access can find them. `TASK.md`
asks the reader not to search and to declare it if it did, and that declaration is
unverifiable — an agent with no network is the only version of this experiment
whose blindness is a property of its access rather than of its word.
