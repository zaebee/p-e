# p-e conformance report 03

A run of the falsifier over the frozen corpus.

## What changed since the previous run

A wording correction, at relay-0018. **No verdict changed** — run the
diff against run 02 and it says so.

**Run 02 overstated its own result.** It closed with "None of them can be
witnessed by a stranger holding only the published artifacts of both producers",
which reads as *none can be witnessed at all*. Six findings CONFORM, each from
one producer. The true statement is narrower: no invariant is witnessable from
the artifacts of **both** producers. That is what admission requires and what
this corpus does not supply.

**The corpus count is now explicit.** Run 02 said "11 artifacts" while the
directory holds twelve files. Eleven are pinned; the twelfth is the manifest,
which is not among its own entries.

Run 02 is preserved unchanged.

Corpus extracted at `2026-08-28T14:18:43.751Z`. **11 pinned
artifacts**, digests in `corpus/manifest.json`. The directory holds
12 files: the 11 above and the manifest itself,
which is not among its own entries — a manifest that pinned itself would be a
file whose digest is a hash of a file containing that digest.

The extraction time is not an occurrence time and is recorded apart from every
timestamp inside the artifacts.

**ADMITTED: 0 of 9.**

An invariant is ADMITTED only when two distinct producers CONFORM. NOT_APPLICABLE
and UNDECIDABLE are not support, and one VIOLATES sinks an invariant outright.

Verdict tally across 18 findings: 6 CONFORMS ·
0 VIOLATES · 11 UNDECIDABLE ·
1 NOT_APPLICABLE.

| invariant | | verdicts | result |
|---|---|---|---|
| I-1 | absence is a named state | hivemark UNDECIDABLE · apex UNDECIDABLE | **DEMOTED** |
| I-2 | the recorded time is the occurrence | hivemark UNDECIDABLE · apex CONFORMS | **DEMOTED** |
| I-3 | the observation is kept beside the conclusion | hivemark UNDECIDABLE · apex CONFORMS | **DEMOTED** |
| I-4 | derived state is never stored | hivemark CONFORMS · apex UNDECIDABLE | **DEMOTED** |
| I-5 | named periods, gaps never backfilled | hivemark UNDECIDABLE · apex UNDECIDABLE | **DEMOTED** |
| I-6 | the attester is not the subject | hivemark CONFORMS · apex NOT_APPLICABLE | **DEMOTED** |
| I-7 | field ownership is enforced | apex UNDECIDABLE · hivemark UNDECIDABLE | **DEMOTED** |
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

**Where it was wrong.** It expected three casualties and this run demotes
9. It also missed the one that matters most: **I-1, which
the spec called the catalogue's strongest invariant, is demoted with zero
confirmations.**

The prediction assumed one failure mode — that the discipline runs inside the
producer and does not survive into what it publishes. That accounts for I-7, I-8
and I-9 and nothing else. Further modes appeared that nobody had named:

| mode | what happens | where |
|---|---|---|
| **not exercised** | the state is defined and representable, and never occurs in the window the corpus covers | I-1 both producers, I-5 apex |
| **evidence elsewhere** | the input is pinned by digest and lives in another repository | I-3 hivemark |
| **a single point** | the invariant is about change over time and the corpus holds one snapshot or one period | I-5 hivemark, I-4 apex |
| **not expressible in the data** | no arrangement of the published values could settle the question, however many there were | I-2 hivemark, I-7 apex |

That last mode was added in run 02 and is the sharpest of the four. The other
three would be answered by a larger or longer corpus. This one would not: a
timestamp cannot say whether it means occurrence or publication, and a string
cannot say whether a human or a machine wrote it. More data does not help.

**The result that is not in the table.** Zero VIOLATES across 18
findings. Nothing in either producer contradicts the catalogue. Every demotion is
a failure of evidence, not a falsification of a rule — the discipline is real in
the code and mostly invisible in the record.

## First-run observation: source-enforced is not artifact-witnessable

Recorded as a finding of this experiment and **not** proposed as a core
invariant.

| | enforced in source | witnessable from artifacts |
|---|:-:|:-:|
| I-1 absence is a named state | yes (per spec §3) | no |
| I-2 the recorded time is the occurrence | yes (per spec §3) | apex only |
| I-3 the observation is kept beside the conclusion | yes (per spec §3) | apex only |
| I-4 derived state is never stored | yes (per spec §3) | hivemark only |
| I-5 named periods, gaps never backfilled | yes (per spec §3) | no |
| I-6 the attester is not the subject | yes (per spec §3) | hivemark only |
| I-7 field ownership is enforced | yes (per spec §3) | no |
| I-8 a record states the limit of its own testimony | yes (per spec §3) | apex only |
| I-9 data read back is validated, failures counted | yes (per spec §3) | apex only |

9 rules are enforced, demonstrably, in source — a claim taken
from the spec, not from this run. Of those, **0 can be witnessed
from the artifacts of both producers**, which is what admission requires, and
**6 from the artifacts of one producer alone**. The second number
is not a weaker version of the first: a rule one system can be seen keeping is a
rule about that system, not a rule two independent systems share.

Which is this run's actual finding, and it is about p-e rather than about either
producer: **a protocol extracted only from what producers publish will be very
much smaller than the discipline that produced them.** Where that leaves the
core is a decision, not a result, and this report does not make it.

## Findings

### I-1 · absence is a named state — DEMOTED

- **hivemark — UNDECIDABLE** *(OBSERVED)*. 932 attestations carry verdicts {confirmed, refuted, uncertain}; the third state is not exercised in this corpus, so the separation cannot be observed
- **apex — UNDECIDABLE** *(OBSERVED)*. the mechanism exists but is never exercised: observed states {alive, cold} with no unknown, all 8 hosts at gaps:0, snapshot ok:true. A reader could distinguish not-observed from cold if it occurred; in this corpus it does not

### I-2 · the recorded time is the occurrence — DEMOTED

- **hivemark — UNDECIDABLE** *(OBSERVED)*. 932 occurrence times spread over 11.6h, 0 of them after extraction — compatible with occurrence rather than publication, and no arrangement of timestamps read alone can establish which of the two a field means
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

- **apex — UNDECIDABLE** *(OBSERVED)*. 72 values across the two machine-written files, 0 of which a whitespace heuristic would call prose — but that heuristic is wrong in both directions and is the reader's own invention, so the corpus cannot show whether ownership was enforced, only that its result looks consistent
- **hivemark — UNDECIDABLE** *(OBSERVED)*. no published attestation carries a genome or a judge field, so the derived-not-stored separation has nothing in this corpus to be observed against

### I-8 · a record states the limit of its own testimony — DEMOTED

- **apex — CONFORMS** *(OBSERVED)*. 4 log entries, each naming what it does not establish (0 without); the field is required by the collection schema, so an entry that could not fill it would not build
- **hivemark — UNDECIDABLE** *(OBSERVED)*. no published envelope carries the unverifiable list; verifyEnvelope produces it at read time and it does not survive into the artifact, so a holder of the corpus alone is not told the limit

### I-9 · data read back is validated, failures counted — DEMOTED

- **apex — CONFORMS** *(OBSERVED)*. all 8 host records publish a gaps count, so runs that could not observe are visible in the artifact rather than folded into the checks total
- **hivemark — UNDECIDABLE** *(OBSERVED)*. supersede computes an undecodable count and reports it to its caller; no published artifact carries it, so the corpus cannot show whether unreadable input was counted or dropped
