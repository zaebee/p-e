# p-e conformance report 01

The first run of the falsifier the spec had never run.

Corpus extracted at `2026-08-28T14:18:43.751Z`, 11 artifacts, digests in
`corpus/manifest.json`. The extraction time is not an occurrence time and is
recorded apart from every timestamp inside the artifacts.

**ADMITTED: 1 of 9 — I-2.**

An invariant is ADMITTED only when two distinct producers CONFORM. NOT_APPLICABLE
and UNDECIDABLE are not support, and one VIOLATES sinks an invariant outright.

Verdict tally across 18 findings: 8 CONFORMS ·
0 VIOLATES · 9 UNDECIDABLE ·
1 NOT_APPLICABLE.

| invariant | | verdicts | result |
|---|---|---|---|
| I-1 | absence is a named state | hivemark UNDECIDABLE · apex UNDECIDABLE | **DEMOTED** |
| I-2 | the recorded time is the occurrence | hivemark CONFORMS · apex CONFORMS | **ADMITTED** |
| I-3 | the observation is kept beside the conclusion | hivemark UNDECIDABLE · apex CONFORMS | **DEMOTED** |
| I-4 | derived state is never stored | hivemark CONFORMS · apex UNDECIDABLE | **DEMOTED** |
| I-5 | named periods, gaps never backfilled | hivemark UNDECIDABLE · apex UNDECIDABLE | **DEMOTED** |
| I-6 | the attester is not the subject | hivemark CONFORMS · apex NOT_APPLICABLE | **DEMOTED** |
| I-7 | field ownership is enforced | apex CONFORMS · hivemark UNDECIDABLE | **DEMOTED** |
| I-8 | a record states the limit of its own testimony | apex CONFORMS · hivemark UNDECIDABLE | **DEMOTED** |
| I-9 | data read back is validated, failures counted | apex CONFORMS · hivemark UNDECIDABLE | **DEMOTED** |

## Against the prediction

The spec registered a prediction in §9 before this reader existed: that I-6, I-8
and I-9 would come back UNDECIDABLE, that I-6 would be demoted outright, and that
nine conformances would be evidence of a permissive reader rather than a correct
catalogue.

**Where the prediction held.** All three named invariants came back exactly as
predicted, and I-6 was demoted through the door the spec named — apex has no
attester to compare, so the finding is NOT_APPLICABLE and does not count as
support.

**Where the prediction was wrong, and it was wrong badly.** It expected three
casualties. Eight of nine were demoted. It also missed the one that matters most:
**I-1, which the spec called the catalogue's strongest invariant, is demoted with
zero confirmations.**

The prediction assumed one failure mode — that the discipline runs inside the
producer and does not survive into what it publishes. That accounts for I-7, I-8
and I-9 and nothing else. Three further modes appeared that nobody had named:

| mode | what happens | where |
|---|---|---|
| **not exercised** | the state is defined and representable, and never occurs in the window the corpus covers | I-1 both producers, I-5 apex |
| **evidence elsewhere** | the input is pinned by digest and lives in another repository | I-3 hivemark |
| **a single point** | the invariant is about change over time and the corpus holds one snapshot or one period | I-5 hivemark, I-4 apex |

**The result that is not in the table.** Zero VIOLATES across eighteen findings.
Nothing in either producer contradicts the catalogue. Every demotion is a failure
of evidence, not a falsification of a rule — the discipline is real in the code
and mostly invisible in the record.

Which is the report's actual finding, and it is about p-e rather than about
either producer: **a protocol extracted only from what producers publish will be
very much smaller than the discipline that produced them.** Eight of these nine
rules are enforced, demonstrably, in source. One of them can be witnessed by
somebody holding the artifacts alone.

## Findings

### I-1 · absence is a named state — DEMOTED

- **hivemark — UNDECIDABLE** *(OBSERVED)*. 932 attestations carry verdicts {confirmed, refuted, uncertain}; the third state is not exercised in this corpus, so the separation cannot be observed
- **apex — UNDECIDABLE** *(OBSERVED)*. the mechanism exists but is never exercised: observed states {alive, cold} with no unknown, all 8 hosts at gaps:0, snapshot ok:true. A reader could distinguish not-observed from cold if it occurred; in this corpus it does not

### I-2 · the recorded time is the occurrence — ADMITTED

- **hivemark — CONFORMS** *(INFERRED)*. 932 occurrence times spread over 11.6h, 0 of them after extraction; a spread wider than one pipeline run is consistent with occurrence rather than publication, and does not prove it
- **apex — CONFORMS** *(OBSERVED)*. the snapshot's occurrence 2026-08-14T10:51:39.082Z precedes extraction, and every host's since precedes that snapshot (0 exceptions); updatedAt is a write time and is not used as one

### I-3 · the observation is kept beside the conclusion — DEMOTED

- **hivemark — UNDECIDABLE** *(OBSERVED)*. provenance.json pins 5 derivation inputs by digest; 0 of them are in the published corpus, so the conclusion cannot be recomputed from what is published — the observation is pinned but not presented
- **apex — CONFORMS** *(OBSERVED)*. all 8 entries pair the offSite conclusion with the finalUrl it was drawn from, and the pairing is exercised 8 times — but every conclusion in this corpus is negative (0 positive, 0 of those without evidence), so the case where the evidence would matter most is not among them

### I-4 · derived state is never stored — DEMOTED

- **hivemark — CONFORMS** *(OBSERVED)*. 428 superseded attestations recomputed across 80 review groups (25 repeated) from the 932 published envelopes alone, with 0 undecodable; no envelope stores the answer
- **apex — UNDECIDABLE** *(OBSERVED)*. no entry stores a derived status, but the rendered page is not in the corpus, so agreement between the derivation and what is published cannot be observed

### I-5 · named periods, gaps never backfilled — DEMOTED

- **hivemark — UNDECIDABLE** *(OBSERVED)*. 1 anchor(s) — 2026-W33 — named as valid ISO weeks with uid counts matching (0 malformed, 0 miscounted); with one period a gap cannot be exhibited, so the no-backfill half is unobservable here
- **apex — UNDECIDABLE** *(OBSERVED)*. 8 host records each carry a gaps count and a since no later than the fold, but every count is zero, so no hole exists for the record to have preserved

### I-6 · the attester is not the subject — DEMOTED

- **hivemark — CONFORMS** *(OBSERVED)*. across 932 envelopes, 1 signer(s) and 3 subject(s), the signer is never the recipient (0 collisions); the publisher signs and the reviewer is signed about
- **apex — NOT_APPLICABLE** *(OBSERVED)*. none of 20 records names an attester, so the separation cannot be exercised here; absence is evidence, not permission

### I-7 · field ownership is enforced — DEMOTED

- **apex — CONFORMS** *(OBSERVED)*. 72 values across the two machine-written files, none of them prose (0 exceptions); the enforcement itself is a test inside the producer and is not observable from artifacts — only its result is
- **hivemark — UNDECIDABLE** *(OBSERVED)*. no published attestation carries a genome or a judge field, so the derived-not-stored separation has nothing in this corpus to be observed against

### I-8 · a record states the limit of its own testimony — DEMOTED

- **apex — CONFORMS** *(OBSERVED)*. 4 log entries, each naming what it does not establish (0 without); the field is required by the collection schema, so an entry that could not fill it would not build
- **hivemark — UNDECIDABLE** *(OBSERVED)*. no published envelope carries the unverifiable list; verifyEnvelope produces it at read time and it does not survive into the artifact, so a holder of the corpus alone is not told the limit

### I-9 · data read back is validated, failures counted — DEMOTED

- **apex — CONFORMS** *(OBSERVED)*. all 8 host records publish a gaps count, so runs that could not observe are visible in the artifact rather than folded into the checks total
- **hivemark — UNDECIDABLE** *(OBSERVED)*. supersede computes an undecodable count and reports it to its caller; no published artifact carries it, so the corpus cannot show whether unreadable input was counted or dropped
