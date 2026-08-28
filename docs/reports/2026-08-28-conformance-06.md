# p-e conformance report 06

A run of the falsifier over the frozen corpus.

## What changed since the previous run

Three falsifier corrections, decided at relay-0056. **Two verdicts
change.**

The ruling that made them possible: **"frozen" covers the normative catalogue —
the invariant statements, §4, M1-M4, U-1/U-2 — and not the falsification
apparatus.** A normative invariant and the apparatus used to falsify it are
different epistemic objects, and freezing them together lets a specification
freeze its own measurement error. It had done so twice.

**I-3/apex: CONFORMS → UNDECIDABLE.** Tested that two keys existed —
`"finalUrl" in e && "offSite" in e` — while `offSite === true` occurs zero
times and `finalUrl` is null in all eight entries. Here the code had gone
*beyond* its clause, which is conditional on the conclusion occurring, so this
one needed no amendment: correcting it brought the code back into line.

**I-9/apex: CONFORMS → UNDECIDABLE.** Confirmed that failures are counted over
`gaps = [0,0,0,0,0,0,0,0]`. Eight zeroes show that `uncounted` was empty, not
that anything is counted — an absence of detected failures read as evidence of
correct accounting. The same report called this field unexercised twice, in I-1
and I-5, which apply the standard this check now applies.

**I-2/apex: CONFORMS → UNDECIDABLE.** Confirmed occurrence semantics from two
distinct instants: all eight `since` identical, `checkedAt == updatedAt ==
lastOkAt`. Ordering is not occurrence. This is the step the hivemark branch
thirty lines above was demoted for at relay-0012, taken on thinner data.

I-9 and I-2 were **prescribed by their `reader:` clauses**, which are amended in
§3 and recorded in §11.

**Not done, deliberately.** Eight further defects a review demonstrated by
mutating the corpus are latent — key-presence tests in I-8/H and I-9/H, vacuity
in I-3/H and I-4/H, NaN and unimplemented clauses in I-5. relay-0056 ruled they
are candidates, not a reason for a large unrelated diff, until independently
reproduced. They are recorded in OBS-028 and unfixed.

**What this run is evidence of.** Zero of the ten came from 75 tests. The tests
enforced the interpretation the falsifier had encoded upstream of them, which is
not a failure of the suite: a test cannot catch an error it inherited.

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

Verdict tally across 18 findings: 2 CONFORMS ·
0 VIOLATES · 15 UNDECIDABLE ·
1 NOT_APPLICABLE.

| invariant | | verdicts | result |
|---|---|---|---|
| I-1 | absence is a named state | hivemark UNDECIDABLE · apex UNDECIDABLE | **DEMOTED** |
| I-2 | the recorded time is the occurrence | hivemark UNDECIDABLE · apex UNDECIDABLE | **DEMOTED** |
| I-3 | the observation is kept beside the conclusion | hivemark UNDECIDABLE · apex UNDECIDABLE | **DEMOTED** |
| I-4 | derived state is never stored | hivemark CONFORMS · apex UNDECIDABLE | **DEMOTED** |
| I-5 | named periods, gaps never backfilled | hivemark UNDECIDABLE · apex UNDECIDABLE | **DEMOTED** |
| I-6 | the attester is not the subject | hivemark UNDECIDABLE · apex NOT_APPLICABLE | **DEMOTED** |
| I-7 | field ownership is enforced | apex UNDECIDABLE · hivemark UNDECIDABLE | **DEMOTED** |
| I-8 | a record states the limit of its own testimony | apex CONFORMS · hivemark UNDECIDABLE | **DEMOTED** |
| I-9 | data read back is validated, failures counted | apex UNDECIDABLE · hivemark UNDECIDABLE | **DEMOTED** |

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
| I-2 the recorded time is the occurrence | yes (per spec §3) | no |
| I-3 the observation is kept beside the conclusion | yes (per spec §3) | no |
| I-4 derived state is never stored | yes (per spec §3) | hivemark only |
| I-5 named periods, gaps never backfilled | yes (per spec §3) | no |
| I-6 the attester is not the subject | yes (per spec §3) | no |
| I-7 field ownership is enforced | yes (per spec §3) | no |
| I-8 a record states the limit of its own testimony | yes (per spec §3) | apex only |
| I-9 data read back is validated, failures counted | yes (per spec §3) | no |

9 rules are enforced, demonstrably, in source — a claim taken
from the spec, not from this run. Of those, **0 can be witnessed
from the artifacts of both producers**, which is what admission requires, and
**2 from the artifacts of one producer alone**. The second number
is not a weaker version of the first: a rule one system can be seen keeping is a
rule about that system, not a rule two independent systems share.

Which is this run's actual finding, and it is about p-e rather than about either
producer: **a protocol extracted only from what producers publish will be very
much smaller than the discipline that produced them.** Where that leaves the
core is a decision, not a result, and this report does not make it.

## Reader self-audit

The four criteria of relay-0025, each enforced by a test in
`tests/self-audit.test.ts` rather than asserted here.

| | criterion | how it is enforced |
|---|---|---|
| 1 | every corpus class examined or excluded with a reason | the coverage matrix below, measured; an excluded class with no reason fails the suite |
| 2 | every verdict traceable to artifact evidence | every reason must cite a count or a named published field; three findings failed this and were rewritten to carry denominators |
| 3 | every semantic projection explicitly marked | `projections` is a required field on every finding, listed under each below, and a run declaring none anywhere fails as decorative |
| 4 | no adapter-derived meaning counted as producer evidence | a CONFORMS may name a projection only while stating that its conforming half is native; enforced on every conforming finding |

**Two dispositions that are not variants of each other.** `NOT_APPLICABLE` means
the reader looked and the producer has no such construct — a statement about the
producer. `EXCLUDED_WITH_REASON` means the reader did not look, and says why — a
statement about the reader. Collapsing them would let unexamined ground read as
cleared ground, which is the defect OBS-010 records.

## Corpus coverage

Every artifact class in the manifest, with an explicit disposition. Required at
relay-0023: **omission from this matrix is not a valid disposition.** Which check
opened which artifact is measured, not declared — each check runs against a
recording view of the corpus.

| class | files | disposition |
|---|:-:|---|
| `apex/health.json` | 1 | examined by I-1, I-2, I-3, I-4, I-6, I-7 |
| `apex/history.json` | 1 | examined by I-1, I-2, I-5, I-6, I-7, I-9 |
| `apex/log/*.md` | 4 | examined by I-6, I-8 |
| `hivemark/anchors.json` | 1 | examined by I-5 |
| `hivemark/attestations.json` | 1 | examined by I-1, I-2, I-4, I-6, I-7, I-8, I-9 |
| `hivemark/births.json` | 1 | **EXCLUDED_WITH_REASON** |
| `hivemark/corpus.json` | 1 | **EXCLUDED_WITH_REASON** |
| `hivemark/provenance.json` | 1 | examined by I-3 |

- **`hivemark/births.json`** — three onchain birth announcements carrying identity_id, entity, first_seen, tx_hash and attestation_uid. No check reads it. It bears on I-1 (is first_seen an occurrence or an announcement time?) and on M1 (identity_id is content-derived here), and neither has been written. Excluded because unexamined, not because inapplicable
- **`hivemark/corpus.json`** — a 1.6KB manifest naming which .jsonl files make up hivemark's input corpus. It is an input to a derivation whose inputs are not published (see I-3), so it can be read but nothing in it can be checked against anything present. Excluded with reason rather than examined

## Findings

### I-1 · absence is a named state — DEMOTED

- **hivemark — UNDECIDABLE** *(OBSERVED)*. 932 attestations carry verdicts {confirmed, refuted, uncertain}; the third state is not exercised in this corpus, so the separation cannot be observed
  - *projection:* verdict code 0 means `unresolved`. The producer publishes a uint8; that 0 is the absent-judgement code is read off hivemark's source, which this reader does not read
- **apex — UNDECIDABLE** *(OBSERVED)*. the mechanism exists but is never exercised: observed states {alive, cold} with no unknown, all 8 hosts at gaps:0, snapshot ok:true. A reader could distinguish not-observed from cold if it occurred; in this corpus it does not
  - *projection:* `unknown` is a possible state. The artifact shows alive and cold; that a third state exists in apex's vocabulary is not visible in it. The gaps counter and the snapshot ok flag, which carry the rest of this finding, are native

### I-2 · the recorded time is the occurrence — DEMOTED

- **hivemark — UNDECIDABLE** *(OBSERVED)*. 932 occurrence times spread over 11.6h, 0 of them after extraction — compatible with occurrence rather than publication, and no arrangement of timestamps read alone can establish which of the two a field means
  - *projections: none. This finding rests on published bytes alone.*
- **apex — UNDECIDABLE** *(OBSERVED)*. 2 distinct instants in the whole evidence base; ordering holds (0 exceptions) and ordering is not occurrence — no arrangement of timestamps read alone says which of the two a field means
  - *projections: none. This finding rests on published bytes alone.*

### I-3 · the observation is kept beside the conclusion — DEMOTED

- **hivemark — UNDECIDABLE** *(OBSERVED)*. provenance.json pins 5 derivation inputs by digest; 0 of them are in the published corpus, so the conclusion cannot be recomputed from what is published — the observation is pinned but not presented
  - *projections: none. This finding rests on published bytes alone.*
- **apex — UNDECIDABLE** *(OBSERVED)*. all 8 entries carry both the offSite conclusion and the finalUrl field, but 0 conclusions are positive and finalUrl is null in 8 of 8: the pairing is never exercised, so keeping evidence beside a conclusion cannot be observed here. Two keys existing over empty values is not the invariant
  - *projections: none. This finding rests on published bytes alone.*

### I-4 · derived state is never stored — DEMOTED

- **hivemark — CONFORMS** *(OBSERVED)*. 428 superseded attestations recomputed across 80 review groups (25 repeated) from the 932 published envelopes alone, with 0 undecodable; no envelope stores the answer
  - *projection:* the grouping key. Treating identityId+repo+pr+commitSha as one review, and the newest time as the survivor, is this reader's rule; a different rule gives a different count. The conforming half — that no published envelope stores the answer — is native and does not depend on it
- **apex — UNDECIDABLE** *(OBSERVED)*. none of the 8 entries carries a status field, checked key by key; but the rendered page is not in the corpus, so whether a derivation and a publication agree cannot be observed from what is here
  - *projections: none. This finding rests on published bytes alone.*

### I-5 · named periods, gaps never backfilled — DEMOTED

- **hivemark — UNDECIDABLE** *(OBSERVED)*. 1 anchor(s) — 2026-W33 — named as valid ISO weeks with uid counts matching (0 malformed, 0 miscounted); with one period a gap cannot be exhibited, so the no-backfill half is unobservable here
  - *projections: none. This finding rests on published bytes alone.*
- **apex — UNDECIDABLE** *(OBSERVED)*. 8 host records each carry a gaps count and a since no later than the fold, but every count is zero, so no hole exists for the record to have preserved
  - *projections: none. This finding rests on published bytes alone.*

### I-6 · the attester is not the subject — DEMOTED

- **hivemark — UNDECIDABLE** *(OBSERVED)*. natively published: signer and message.recipient never coincide across 932 envelopes (1 signer, 3 recipients, 0 collisions). That is corpus-native and not a projection. But identifying recipient as the subject is §5's mapping, not the producer's, and no producer publishes a field named subject — so two distinct participant fields differing does not establish that an attester differs from a subject
  - *projection:* none in the reported fact. Identifying recipient as the subject would be one, and is the reason this finding is UNDECIDABLE rather than CONFORMS
- **apex — NOT_APPLICABLE** *(OBSERVED)*. none of 20 records names an attester, so the separation cannot be exercised here; absence is evidence, not permission
  - *projections: none. This finding rests on published bytes alone.*

### I-7 · field ownership is enforced — DEMOTED

- **apex — UNDECIDABLE** *(OBSERVED)*. 72 values across the two machine-written files, 0 of which a whitespace heuristic would call prose — but that heuristic is wrong in both directions and is the reader's own invention, so the corpus cannot show whether ownership was enforced, only that its result looks consistent
  - *projection:* prose is a string containing whitespace. Entirely the reader's definition, wrong in both directions, and the reason this finding is UNDECIDABLE
- **hivemark — UNDECIDABLE** *(OBSERVED)*. no published attestation carries a genome or a judge field, so the derived-not-stored separation has nothing in this corpus to be observed against
  - *projections: none. This finding rests on published bytes alone.*

### I-8 · a record states the limit of its own testimony — DEMOTED

- **apex — CONFORMS** *(OBSERVED)*. 4 log entries, each naming what it does not establish (0 without); the field is required by the collection schema, so an entry that could not fill it would not build
  - *projections: none. This finding rests on published bytes alone.*
- **hivemark — UNDECIDABLE** *(OBSERVED)*. none of the 932 published envelopes carries an unverifiable or limits key, checked one by one. The producer's README says a signature does not assert a finding is correct; that sentence is not in the corpus, and this reader does not read source, so a holder of the artifacts alone is not told the limit
  - *projections: none. This finding rests on published bytes alone.*

### I-9 · data read back is validated, failures counted — DEMOTED

- **apex — UNDECIDABLE** *(OBSERVED)*. all 8 host records publish a gaps count and every one is zero: the mechanism exists and has never recorded a failure, so whether failures would be counted cannot be observed here
  - *projections: none. This finding rests on published bytes alone.*
- **hivemark — UNDECIDABLE** *(OBSERVED)*. none of the 932 published envelopes carries an undecodable count, checked one by one. Whether unreadable input was counted or silently dropped is therefore not decidable from the artifacts; that it is counted somewhere is a claim about source this reader does not read
  - *projections: none. This finding rests on published bytes alone.*
