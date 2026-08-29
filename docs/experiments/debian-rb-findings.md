<!-- NOT A RUN -->
# Debian reproducible-builds — second-agent experiment

**NOT A RUN.** This document is not `docs/reports/*-conformance-NN.md`; it does
not enter the conformance series, is not pinned by
`tests/reports-immutable.test.ts`, and changes no catalogue. It is the deliverable
of relay-0124 (human chose option a), written by `relay-hy3` against a previously
published hypothesis (relay-0119), **not blind** (relay-0126 caution) and not
fully independent - the proof bytes were pinned by claude, but per hy3's verbatim rule
(relay-0130 §4), so the v0 selection is no longer claude's curation alone. The initial
b.json/v0.rs/v1build.rs trio (relay-0129) was claude's; see Effect section for the split.

## Source

- builds: `/home/zaebee/projects/p-e/docs/experiments/debian-rb-bytes/b.json` (frozen; API total 4710, fetched 1000)
- v0 Status variants: ["Good","Bad","Unknown"]
- v1 BuildStatus variants: ["Good","Bad","Fail","Unknown"]
- OBSERVED status values in sample: ["BAD","FAIL","GOOD"]
- OBSERVED status values in v0/pkgs/list stride sample: ["BAD","GOOD","UNKWN"]
- v0 package records carry retrievable input trace (build_id+artifact_url+attestation/diffoscope): true
- v0 BAD records lacking has_diffoscope (proves booleans are independent, not derived): 6
- v0 UNKWN records lacking build_id: 15
- v0 records carry an explicit boundary/limit field: false
- DASHBOARD (stored derived state) rebuilds: good=16921 bad=827 fail=1 unknown=0
- RECOMPUTED from source-all: all GOOD=17439/BAD=900/FAIL=10; synced-true GOOD=16921/BAD=827/FAIL=1; disagreements=0
  (dashboard + source-all pinned per relay-0146: v1-trixie-arm64-dashboard.json d2afd547..., v1-trixie-arm64-source-all.json.gz gz dde55b6...)
- retries>0 by status: {"BAD":{"count":268,"withRetries":268},"FAIL":{"count":102,"withRetries":102},"GOOD":{"count":630,"withRetries":86}}

- v0 bytes now PINNED per relay-0130 §4 (claude, executed verbatim from hy3's rule):
  v0-arm64-stride1000.json (every 1000th of 489,668 records), v0-arm64-unkwn-all.json.gz (all 107,144 UNKWN).

## Findings

### I-1 / debian-rb: CONFORMS (OBSERVED)

status UNKWN is exercised in the pinned v0/pkgs/list corpus and is distinct from GOOD/BAD, so the absent-judgement state is both named and emitted. The histogram over all 489,668 records is GOOD 363,708, BAD 18,816, UNKWN 107,144 (debian-rb-retrieval.md); the stride sample pinned in this repo carries UNKWN too. The mechanical I-1 criterion - a third state named in source and appearing as a value distinct from the two it judges - holds for r-b. Whether UNKWN is assigned by the debian r-b *aggregator* rather than reported by a *rebuilder* is NOT settled by these bytes (relay-0119 refuter #1); that is a semantic question about who emits the value, and it does not block the mechanical criterion

- the exercising bytes are now PINNED: v0-arm64-unkwn-all.json.gz (all 107,144 UNKWN records, gz 9e68e1..) and v0-arm64-stride1000.json (every 1000th record, including UNKWN), extracted by claude per relay-0130 §4 verbatim from hy3's rule - so the third state is inspectable by anyone with the repo, not asserted from bytes only claude held
- UNKWN is a named variant in v0 (Status::Unkwn) and v1 (BuildStatus::Unkwn), serialised from Unknown. The aggregator-vs-rebuilder open question remains; if UNKWN were purely an aggregator bucket it would still be a distinct published value, but it would not be a rebuilder's absent-judgement - that nuances, but does not void, the CONFORMS above
- status GOOD/BAD are present and distinct; FAIL exists only in v1 (v0 maps FAIL->BAD). The third state under test is UNKWN, not FAIL

### I-3 / debian-rb: CONFORMS (OBSERVED)

STANDARD APPLIED: (b) - a conclusion is CONFORMS when its input is retrievable from what the producer publishes, not requiring it to sit in our pinned corpus. The pinned v0/pkgs/list records (v0-arm64-stride1000.json) carry build_id + artifact_url (the .deb subject) + has_diffoscope/has_attestation booleans; for a BAD record that is the handle, and the producer publishes the observation at /arm64/api/v0/builds/{build_id}/diffoscope. claude confirmed against a real stride-sample record (filtlong 0.2.1-4+b1, build_id 132177): GET -> 200, 2,573,853 bytes of actual diffoscope output, so the observation is retrievable from build_id alone. Under reading (a) (input must be in the pinned corpus) this would be UNDECIDABLE, because the observation is NOT in the frozen bytes - only declared by a boolean; I take (b) because (a) measures the curator (whatever we chose to pin), and applying it to a fetched producer reproduces the I-1 trap that the repair was to pin more bytes, not to accept the verdict. (b) also changes no existing verdict: hivemark's inputs are published nowhere, so it still fails I-3. COST OF (b), stated: build_id is an integer, not a digest; the live fetch is unbound - nothing ties the 2.5MB received today to the diff the conclusion was drawn from. So the retrieval half is INFERRED, not OBSERVED; debian-rb is retrievable-but-unbound where hivemark is pinned-but-unpublished, and neither dominates

- the ambiguity is real and load-bearing: (a) 'input in corpus' vs (b) 'conclusion recomputable from what is published'. hivemark and apex satisfy both or neither, so the catalogue never had to choose; r-b is the first producer where they come apart (relay-0140). Same shape as OBS-049: a word unambiguous across two producers becomes two on the third
- correction to relay-0119, noted here: '14,825 of 18,816 BAD carry a diffoscope diff' is wrong - those records DECLARE has_diffoscope:true (a boolean), they do not carry the diff. This adapter read the bytes (has_diffoscope:true), not the prose, so it inherited the corrected reading; the live fetch above is the actual observation
- this is exactly the axis relay-0119 refuter #2 named - a third source could conform I-3. It does, under (b); but admits() needs a second distinct producer, and no current producer conforms I-3 (apex flipped to UNDECIDABLE in run 06, per relay-0133), so this CONFORM alone does not admit the invariant. If the catalogue later adopts (a) instead of (b), this flips to UNDECIDABLE-on-pinned-corpus and the reason must say so
- the choice of (b) over (a) is recorded as the applied standard; if a future reader prefers (a), the verdict is UNDECIDABLE and the finding should be rewritten, not merely re-read
- per relay-0174 bee.zae ruled I-3/hivemark = VIOLATES (settled): the frozen falsifier fired directly and a second independent blind pass returned the same verdict on a byte-identical clause (relay-0160 condition met). admits() short-circuits on any VIOLATES, so I-3 is sunk outright. This debian-rb I-3 CONFORMS therefore SURVIVES AS A FINDING AND STOPS COUNTING TOWARD ADMISSION - it no longer supports admitting I-3, which is now falsified at catalogue level. My deliverable is NOT A RUN and never mutated the count; this projection records the settled consequence only, and the gap between settled and docs/reports is left open on purpose per the ruling

### I-5 / debian-rb: NOT_APPLICABLE (OBSERVED)

r-b names no periods. 'release' is a distribution tag (trixie/forky/unstable/experimental), not a time window; 'started_at'/'built_at' are instants. There is no period axis for a record to republish a verdict about — the producer simply has no period construct (relay-0119 refuter #4)

- a build record is about a moment (built_at), not a period; release is categorical. I-5 cannot be exercised by this producer as the invariant is stated

### I-9 / debian-rb: UNDECIDABLE (OBSERVED)

v1/builds records a single aggregate `retries` integer per build. In the sample, 370/370 non-GOOD builds have retries>0 and 86/630 GOOD builds also have retries>0. The artifact does NOT record, per attempt, whether that attempt reached a verdict — only one counter. So the producer cannot distinguish "not attempted" from "attempted and failed" at the attempt level; counting retries as gate-failures (relay-0119 refuter #3) would misread an aggregate as attempt-level conclusions that are not published

- retries is a scheduler/aggregate counter; the bytes expose no per-attempt conclusion. This is exactly the illusion-of-liveness gap I-9 guards: a third source carrying only an aggregate retries count would not demonstrate attempt-level observation, and adding it could not make a single-observation miss look like liveness

### I-4 / debian-rb: CONFORMS (OBSERVED)

r-b STORES derived state, and the stored value agrees with recomputing it from the published set - so I-4's falsifier ("a stored value disagrees with recomputing it from the published set") is exercised and does NOT fire -> CONFORMS. The derived state is the dashboard: v1-trixie-arm64-dashboard.json reports rebuilds {good:16921, bad:827, fail:1, unknown:0}. Recomputed from the pinned source-all walk (v1-trixie-arm64-source-all.json.gz, 18349 records, walked via the after cursor) the synced-true subset is GOOD 16921 / BAD 827 / FAIL 1 - exact match to the dashboard, 0 disagreement(s). This is CONFORMS BY RECOMPUTATION, the shape hivemark's I-4 has and the shape relay-0144 asked for. My relay-0145 reason ("no derived artifact to recompute") was wrong and is withdrawn: the dashboard is exactly the derived artifact, and claude pinned it (relay-0146) after I missed it - third time a verdict turned on what was chosen to keep. TITLE VS FALSIFIER, load-bearing: I-4's title is "derived state is never stored"; its falsifier is "a stored value disagrees with recomputing it from the published set". These are two rules and r-b is the first producer where they separate - r-b stores derived state (the dashboard) so by the TITLE it VIOLATES; the stored value agrees with recomputation so by the FALSIFIER it CONFORMS. Both original producers (hivemark, apex) store no derived state at all, so the readings coincided and nobody noticed they were two. Stakes asymmetric: by the falsifier, hivemark + r-b = 2 distinct -> I-4 ADMITTED (first this catalogue); by the title, r-b VIOLATES -> one VIOLATES sinks I-4 outright, below zero permanently (a VIOLATES cannot be recovered by later evidence), which is not conservative. I apply the FALSIFIER as the operative rule (relay-0146: §1 makes the falsifier the thing a reader runs; the title is a name), so CONFORMS; the catalogue must rule the divergence. STANDARD (a)/(b): both reach CONFORMS under the falsifier reading.

- the recomputation is OBSERVED from pinned bytes, not a live fetch: source-all gz dde55b6..., dashboard d2afd547...; anyone can re-walk and confirm 0 disagreement. claude's live walk (relay-0146) matched exactly (synced-true GOOD 16921 / BAD 827 / FAIL 1)
- the gcc-bpf duplicate claude saw in the binary-package walk is NOT in source-all: source-all has 18349 distinct ids, 0 dupes. The duplicate is an artifact of claude's cursor walk, not a producer defect, and it does not touch this recomputation
- artifact_url remains a locator, excluded from 'derived state'; the dashboard counts are the derived state that matters, and they agree
- if the catalogue rules by the TITLE instead of the falsifier, this flips to VIOLATION and I-4 is falsified - state which rule you applied; this finding does not decide, it reports both
- the 6 BAD records lacking has_diffoscope remain evidence that the per-record booleans are independent observations, not the derived state in question; the dashboard is

### I-8 / debian-rb: UNDECIDABLE (OBSERVED)

r-b build records assert a status (GOOD = reproducible) but carry no field stating the limit of that claim - no per-record "what this does not establish" equivalent to apex's required attested field, and no boundary statement anywhere in the frozen corpus. The architecture/suite fields identify the subject, they do not state the boundary of the testimony. So from the frozen artifacts alone, r-b neither conforms (no boundary stated) nor clearly violates (the producer may state limits in endpoints outside the frozen corpus, e.g. the reproducible-builds human report). This matches the I-8 expect line: a half from a fetched producer is likely UNDECIDABLE from artifacts, leaving I-8 single-source (apex). STANDARD: (a)/(b) agree - no boundary artifact is published, so UNDECIDABLE under either.

- apex CONFORMS I-8 because every /log entry names what it does not establish and the schema requires it; r-b has no equivalent field. Absence of such a field in the frozen corpus is not proof of absence everywhere, so UNDECIDABLE rather than VIOLATION
- if the reproducible-builds project publishes a boundary statement (the scope of a GOOD verdict) outside the frozen corpus, that would move this to CONFORMS or EXCLUDED_WITH_REASON; the frozen bytes cannot decide
- this keeps I-8 single-source under test, exactly as the spec predicted (expect: H's half likely UNDECIDABLE). A CONFORMS here would have required a boundary artifact r-b does not publish in the frozen set

## Effect on the catalogue (why this is not an admission)

debian-rb now yields 3 CONFORMS (I-1, I-3, I-4) across six invariants
(I-1/I-3/I-4/I-5/I-8/I-9), from bytes pinned in this repo (v0/pkgs/list stride + UNKWN-full,
extracted per relay-0130 §4). This is NOT a run; no catalogue is mutated by it. admits() requires
>=2 DISTINCT producers CONFORMING on the same invariant. Per run 06:
- I-1: r-b CONFORMS; hivemark and apex UNDECIDABLE on I-1 -> 1 distinct -> unadmitted.
- I-3: r-b CONFORMS (v0/pkgs/list, standard (b)); apex UNDECIDABLE on I-3 in run 06,
  hivemark VIOLATES on I-3 (SETTLED, relay-0174) -> I-3 sunk outright per admits() short-circuit.
  This r-b I-3 CONFORMS survives as a finding and stops counting toward admission; I-3 is now falsified at catalogue level.
- I-4: r-b CONFORMS BY RECOMPUTATION (relay-0146 corrected my relay-0145 reason) AND hivemark
  CONFORMS in run 06 -> TWO distinct CONFORMS. The stored dashboard counts reproduce exactly from
  the pinned source-all walk (0 disagreement), so I-4's falsifier is exercised and does not fire.
  If both stand, admits() returns ADMITTED - the first ADMITTED invariant this catalogue has had.
  BUT I-4's TITLE ('derived state is never stored') and its FALSIFIER ('stored value disagrees with
  recomputation') are two rules that diverge on r-b: r-b stores derived state (dashboard) so by the
  TITLE it VIOLATES. By the falsifier it CONFORMS. The catalogue must rule which sentence is the rule;
  ruling by the title is not conservative (a VIOLATES sinks I-4 below zero permanently). This is the
  live question, and it is now a rule-ambiguity question, not an evidence question - the bytes agree.
- I-8: r-b UNDECIDABLE (frozen artifacts carry no boundary statement); apex CONFORMS in run 06 ->
  1 distinct -> unadmitted. Matches the I-8 expect line (single-source under test).
- I-5: NOT_APPLICABLE. I-9: UNDECIDABLE.

THE RELAY-0133 DISSENT, resolved by reading. My relay-0130 reason 'a single new source cannot admit
anything alone' was corrected in relay-0133; r-b has now been read against I-4 and I-8 (relay-0144),
so the 'I-4 + I-8 untested by r-b' clause is settled: I-4 CONFORMS (2nd distinct, admission candidate),
I-8 UNDECIDABLE (stays single-source). A third source CAN admit I-4 - and this reading does, on the
native half. Whether it actually admits is claude's catalogue call, not this experiment's; the finding
only reports the two CONFORMS. The choice of invariants is no longer the four-at-zero set: the human
picked I-4/I-8 deliberately, and the reading shows why those two were the live ones (per claude's run-06 map).

Independence note: the v0 bytes were pinned by claude per hy3's verbatim rule (relay-0130 §4), so the
selection is no longer claude's curation alone. I-4/I-8 were read BLIND (claude held no view before
reporting, relay-0144), so this is the first r-b reading not reasoning against a published hypothesis.
I-5/I-9 remain as before. All of it is experiments evidence, outside the series and outside
manifest.json. The catalogue decision is claude's; this document is the input to it, not the verdict.
