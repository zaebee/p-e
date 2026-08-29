# Suite audit — what the auditor received

> **Not part of the bundle, and kept outside its directory.** It was first written
> inside `suite-audit/`, which is OBS-059 exactly — the file documenting the
> blinding sitting where the blinded party can read it. Caught by scanning the
> bundle for our own conclusions rather than by anyone asking.

Contract set by bee.zae (`CONTRACT.md`, verbatim). The suite's author prepared the
runnable bundle and wrote none of the questions.

Corpus: the repository's own `corpus/`, referenced rather than copied — identical
bytes, digests in `corpus/manifest.json`.

## Files

| file | bytes | sha256 |
|---|---|---|
| `CATALOGUE.md` | 40,488 | `c85c8afb0590d354a027c11e6672673b062759bdc0b3badd3b658af0e020d1c9` |
| `CONTRACT.md` | 3,872 | `50ea445730cee2dda247a4bbbd4b935dfe28661b643d15b6d61554841f0eddad` |
| `RUNNING.md` | 2,430 | `a959d378bf5e3083ab98ba39e39d46bb3a0501b094bc4ecffd6c74d423effa2b` |
| `suite/coverage.ts` | 4,415 | `69f42a89fa87eed8c5e42e29b091375c4e7bc212a8297677f6e95c259e32d7b1` |
| `suite/envelope.ts` | 782 | `a50c69b7200fcb3869f23488eb5b9dce826d540116ffbe35c4d3e5e42b4e4d00` |
| `suite/manifest.ts` | 2,168 | `a3ec38543ee9ccc0cea2233184849ed1ce31c6982aa01d033ed8d25e44c3cb71` |
| `suite/report.ts` | 23,056 | `e826c72eb51b0e251a2393e263f29c4076a4fe7514b188b3e7c22b248de4c977` |
| `suite/verdict.ts` | 3,512 | `add29aff0db262cce243400b54ba246a7e8872d658725d5af482ffab0a73320e` |
| `suite/conformance/bearing.ts` | 3,274 | `397e916e3a58638f43dad6ee2f47381fbf4eec2f14bebe46c154cd8c229c3f27` |
| `suite/conformance/clause.ts` | 4,407 | `1dee4a97d58bfc87ed4571127a8c3bd10af0a50cfe0b574fdc11806e8c736079` |
| `suite/conformance/evidence.ts` | 4,344 | `ec04e1608bfd2d9f1099e7ff2bbde67050fcea15696ee8569fd40c28f751fef3` |
| `suite/conformance/fields.ts` | 3,872 | `32e458c050d84b56725f8bee3ba990135af23e6dc88ee641ba0938da69c5e9b5` |
| `suite/conformance/rationale.ts` | 3,460 | `80a001d57ddf89cf31c718edd23f5acd92e02d5853e2e0541ae95eb36035f258` |
| `suite/conformance/settled.ts` | 2,923 | `1bc6335e87419eaf517e6625138e1e69d7efe7a0ea7811ea0392d4c9f6421144` |
| `suite/adapters/apex.ts` | 5,729 | `239be11a294665d05efdde496c11ab9e8ce51c8fe2c6a0b04d6a5dbb45851f6b` |
| `suite/adapters/debian-rb.ts` | 8,273 | `187f39003ea736d708a9068180be376684122562e984acc1197dfd9cb4c84259` |
| `suite/adapters/hivemark.ts` | 2,657 | `58e605e083f488bb74ba113f3cb595ea4d4b940963002a40be526131cd9e35d8` |
| `suite/tests/reader-conformance.test.ts` | 10,285 | `cca732119ac8cac975c9f2533651f738e0a26a2b4757215361681bffdadd4c1f` |
| `suite/tests/settled-rulings.test.ts` | 2,640 | `bf89dc118c377f10720e9d7c08b86e4ec8c756b3b35b62511ab1c097128bd2ef` |
| `suite/checks/claim-schema.ts` | 1,442 | `2ff5442bb676a39c006fc348236bb6bad2975564f680aff7a18411b186d94517` |
| `suite/checks/i1.ts` | 3,659 | `2622b2323236ac9effbafe13eb737a37b1a0d2bdcff1ff3cebeb34b26585cc92` |
| `suite/checks/i2.ts` | 4,097 | `e54f6c36bbf31f9d1462bf90b5176dc58317b2f346ffbd8cd899fb845309b7dc` |
| `suite/checks/i3.ts` | 4,238 | `87d85d794096b6c5aea7400cda30b6a3379844cecb2c1f7fc30d79ea66862bc3` |
| `suite/checks/i4.ts` | 3,533 | `8e764a7eab9dc7307fbe5bb29fa40abbe320e55985f25c2a0ef5b95492c0d265` |
| `suite/checks/i5.ts` | 2,941 | `8da4b63ec8060113369778f54559bccc8cc152eb128b2535c675d72e985820fd` |
| `suite/checks/i6.ts` | 3,109 | `404962a71b32f7be94801ac144ec2fcaa44a7eca0439bffd00f0db4cd1a6ebe0` |
| `suite/checks/i7.ts` | 2,872 | `207d502d654317e7a60812e9198e3a76ee1686920f6d7bf66cb7b291eb672f13` |
| `suite/checks/i8.ts` | 1,638 | `4a3698c94fcc5535c94cd1120758a2cba30c2bdb8059a4991987f909a5c831a5` |
| `suite/checks/i9.ts` | 2,309 | `db4ff88348551cc813e71bdb9388b563f5d7f10007be5f829526fadad1c2ac6d` |

## Deliberately included

The suite's source comments narrate its own history, name two construction defects
already found in it, and cite records the auditor does not have. Left in place: the
alternative is the author choosing what an auditor sees of the author's own work,
which is the failure under audit. `CONTRACT.md` tells the auditor this and asks it
to distinguish reading the code from reading the code's account of itself.

## Deliberately excluded

`docs/notes/observations.md`, `relay/`, `docs/reports/`, `docs/CLOSING-REPORT.md`,
`docs/REPORT-ERRATA.md`, and every other experiment's RESULT.
