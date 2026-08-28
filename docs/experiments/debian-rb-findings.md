<!-- NOT A RUN -->
# Debian reproducible-builds — second-agent experiment

**NOT A RUN.** This document is not `docs/reports/*-conformance-NN.md`; it does
not enter the conformance series, is not pinned by
`tests/reports-immutable.test.ts`, and changes no catalogue. It is the deliverable
of relay-0124 (human chose option a), written by `relay-hy3` against a previously
published hypothesis (relay-0119), **not blind** (relay-0126 caution).

## Source

- builds: `/home/zaebee/projects/p-e/docs/experiments/debian-rb-bytes/b.json` (frozen; API total 4710, fetched 1000)
- v0 Status variants: ["Good","Bad","Unknown"]
- v1 BuildStatus variants: ["Good","Bad","Fail","Unknown"]
- OBSERVED status values in sample: ["BAD","FAIL","GOOD"]
- retries>0 by status: {"BAD":{"count":268,"withRetries":268},"FAIL":{"count":102,"withRetries":102},"GOOD":{"count":630,"withRetries":86}}

## Findings

### I-1 / debian-rb: UNDECIDABLE (OBSERVED)

the frozen builds artifact carries only {BAD, FAIL, GOOD}; it does not exercise UNKWN. UNKWN is named in source (v1 BuildStatus=["Good","Bad","Fail","Unknown"], v0 Status=["Good","Bad","Unknown"]), but the project holds a producer to the standard that the third state must be *exercised*, not merely representable (relay-0023 / I-1/hivemark). The 1000-record sample is truncated from total 4710, so whether UNKWN occurs in the full set is not in the frozen corpus

- UNKWN is a named status in v1/builds source (BuildStatus::Unkwn) and in v0 (Status::Unkwn). That UNKWN is assigned by the debian r-b *aggregator* rather than the *rebuilder* is not settled by these bytes (relay-0119 refuter #1); an aggregator-assigned third value would not be a rebuilder's absent-judgement state, so I-1 would not transfer as hypothesised
- status GOOD/BAD/FAIL are present and distinct in the sample; FAIL exists only in v1 (v0 maps FAIL→BAD). The third state under test is UNKWN, not FAIL

### I-3 / debian-rb: UNDECIDABLE (OBSERVED)

the frozen v1/builds records carry only {id, name, version, distribution, release, architecture, backend, retries, started_at, built_at, status} — status with no build_id, url, diffoscope_log_id, or attestation_log_id. From these bytes a status conclusion is not traceable to a retrievable input. The endpoint that carries the trace (v1/packages/binary: url + diffoscope_log_id for BAD, attestation_log_id for GOOD) is KNOWN_MISSING from this repo (debian-rb-retrieval.md), so the verdict cannot be settled from frozen evidence

- v1/packages/binary (not in the frozen corpus) carries url + diffoscope_log_id (BAD) + attestation_log_id (GOOD). If those bytes were added, I-3 could CONFORM — r-b would then be *stronger* than apex on this axis, because both polarities (GOOD attestation, BAD diffoscope) are retrievable. That is exactly why relay-0119 refuter #2 named I-3 as the place a third source might admit the catalogue
- until packages/binary is frozen here, I-3 rests on KNOWN_MISSING bytes and must read UNDECIDABLE, not CONFORMS

### I-5 / debian-rb: NOT_APPLICABLE (OBSERVED)

r-b names no periods. `release` is a distribution tag (trixie/forky/unstable/experimental), not a time window; `started_at`/`built_at` are instants. There is no period axis for a record to republish a verdict about — the producer simply has no period construct (relay-0119 refuter #4)

- a build record is about a moment (built_at), not a period; release is categorical. I-5 cannot be exercised by this producer as the invariant is stated

### I-9 / debian-rb: UNDECIDABLE (OBSERVED)

v1/builds records a single aggregate `retries` integer per build. In the sample, 370/370 non-GOOD builds have retries>0 and 86/630 GOOD builds also have retries>0. The artifact does NOT record, per attempt, whether that attempt reached a verdict — only one counter. So the producer cannot distinguish "not attempted" from "attempted and failed" at the attempt level; counting retries as gate-failures (relay-0119 refuter #3) would misread an aggregate as attempt-level conclusions that are not published

- retries is a scheduler/aggregate counter; the bytes expose no per-attempt conclusion. This is exactly the illusion-of-liveness gap I-9 guards: a third source carrying only an aggregate retries count would not demonstrate attempt-level observation, and adding it could not make a single-observation miss look like liveness

## Effect on the catalogue (why this is not an admission)

debian-rb yields 0 CONFORMS across I-1/I-3/I-5/I-9. `admits()`
requires >=2 distinct CONFORMS for a verdict to enter; a single source contributing
zero CONFORMS changes nothing. Read independently and non-blind, the third source
FAILS to CONFORM on every invariant it can test (I-1 UNDECIDABLE — third state
named in source but not exercised in the frozen sample; I-3 UNDECIDABLE — builds
artifact carries no input trace; I-5 NOT_APPLICABLE — no period axis; I-9
UNDECIDABLE — only an aggregate retries counter). It therefore cannot create the
feared illusion of liveness. Admitting it remains a group + human decision
(relay-0124); this document is the evidence for that decision, not the decision.
