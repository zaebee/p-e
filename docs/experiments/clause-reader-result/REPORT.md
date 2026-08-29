# Independent Conformance Report for p-e/core 0.1

Generated: 2026-08-29T10:27:37.244817+00:00
Corpus extraction: 2026-08-28T14:18:43.751Z

---

## Summary

Total invariants: 9
  UNDECIDABLE: 9

---

## Key Findings

This independent reading was performed against the frozen corpus artifacts listed in
`corpus/manifest.json`, extracted at 2026-08-28T14:18:43.751Z.

### Prediction Confirmation

The CATALOGUE (\u00a79) predicted that *several invariants that are PROVEN in code will
come back UNDECIDABLE at the artifact level*, specifically naming I-6, I-8 and I-9
as the most likely.

**Result: All 9 invariants returned UNDECIDABLE.**

This confirms the prediction. The primary reason is that `hivemark/attestations.json`
(932 signed envelopes, 3.4 MB) was explicitly excluded from the corpus per PROMPT.md,
which prevents verification of most H-side predicates. Additionally, several H-side
artifacts are runtime-generated (verifyEnvelope's unverifiable list, supersede's
undecodable count) and are not published in the corpus.

### Independence Note

Per CONTRACT.md \u00a74 (Independence rule): This reader was implemented without
access to any existing clause.ts, OBS findings, prior verdicts, or relay
commentary. All predicates were derived directly from the clause text in
CATALOGUE.md and executed against the corpus artifacts only.

### Artifact-Level Findings

- **I-3 (H)**: `hivemark/dist/provenance.json` pins input files (martian-*.jsonl)
  but does NOT pin `corpus.json` itself. Per CATALOGUE \u00a7I-3 watch note, this is
  an artifact-level finding: H fails its own I-3 at the artifact level.

---

## I-1 \u00b7 Absence is a named state

**Clause:** I-1: Absence is a named state, never folded into a negative

**Falsifier:** the reader can hold both producers' judgement values only by collapsing not-observed into false

**Predicate:** Verify that both H and A have distinct named states for absence/not-observed separate from negative/false states

**Verdict:** UNDECIDABLE

**Producer Verdicts:**
  H: UNDECIDABLE
  A: CONFORMS

**Evidence:**
  H: Verdict enum values cannot be verified from corpus (attestations.json excluded)
  A: Status distinguishes ok=true/false, code=null vs error codes, state=alive vs cold
  summary: H is UNDECIDABLE due to missing attestations.json; A CONFORMS with distinct states

**Required Evidence:**
  - hivemark/attestations.json (Verdict enum)
  - apex/health.json (Status values)
  - apex/history.json (state values)

**Missing Evidence Treatment:**
  hivemark/attestations.json: EXCLUDED (per PROMPT.md: too large, not included)
  derived_fields: UNDECIDABLE (cannot verify from available artifacts)

---

## I-2 \u00b7 Recorded time is the occurrence

**Clause:** I-2: Where a producer records an event time, that time is the occurrence

**Falsifier:** a producer's time field is interpretable only as write time

**Predicate:** Assert every occurrence time precedes extraction timestamp; A's since <= checkedAt; H's times not clustered

**Verdict:** UNDECIDABLE

**Producer Verdicts:**
  H: UNDECIDABLE
  A: CONFORMS

**Evidence:**
  H: message.time values cannot be verified (attestations.json excluded)
  A: checkedAt and since are valid ISO dates, all before extraction timestamp, since <= checkedAt
  summary: H is UNDECIDABLE; A CONFORMS for available time fields

**Required Evidence:**
  - hivemark/attestations.json (message.time)
  - apex/health.json (checkedAt)
  - apex/history.json (since)
  - manifest.json (extracted_at)

**Missing Evidence Treatment:**
  hivemark/attestations.json: EXCLUDED (per PROMPT.md)
  message.time field: UNDECIDABLE (cannot verify from available artifacts)

**Ambiguity:** Cannot verify H's message.time clustering without attestations.json

---

## I-3 \u00b7 Observation kept beside conclusion

**Clause:** I-3: The observation is kept beside the conclusion

**Falsifier:** a producer publishes a conclusion whose input is not in the corpus

**Predicate:** A: for every offSite, finalUrl must exist; H: for every derived record, claims must be in corpus

**Verdict:** UNDECIDABLE

**Producer Verdicts:**
  H: UNDECIDABLE
  A: CONFORMS

**Evidence:**
  H: Main predicate (claim_hash in derived track records) cannot be verified without attestations.json; provenance.json pins input files but NOT corpus.json (artifact-level finding per CATALOGUE watch)
  A: Log files maintain claimed/observed/attested separation; health.json has no offSite=true cases
  summary: H UNDECIDABLE (attestations.json excluded); A CONFORMS for log structure; overall UNDECIDABLE

**Required Evidence:**
  - apex/health.json (offSite, finalUrl)
  - apex/log/*.md (claimed, observed, attested)
  - hivemark/dist/provenance.json (file digests)
  - hivemark/attestations.json (claim_hash)

**Missing Evidence Treatment:**
  hivemark/attestations.json: EXCLUDED (per PROMPT.md)
  claim_hash verification: UNDECIDABLE

**Ambiguity:** Cannot verify claim_hash survival without attestations.json

---

## I-4 \u00b7 Derived state is never stored

**Clause:** I-4: Derived state is never stored

**Falsifier:** a stored value disagrees with recomputing it from the published set

**Predicate:** H: superseded recomputed from attestations.json; Judge absent as input; A: status derived from health.json

**Verdict:** UNDECIDABLE

**Producer Verdicts:**
  H: UNDECIDABLE
  A: CONFORMS

**Evidence:**
  H: Cannot verify derived state recomputation without attestations.json
  A: No derived state fields found in health.json (only observation fields: ok, code, finalUrl, offSite)
  summary: H UNDECIDABLE; A CONFORMS (no stored derived state detected); overall UNDECIDABLE

**Required Evidence:**
  - hivemark/attestations.json (to recompute superseded and Judge)
  - apex/health.json (observation data)
  - apex/history.json (observation history)

**Missing Evidence Treatment:**
  hivemark/attestations.json: EXCLUDED (per PROMPT.md)
  superseded/Judge recomputation: UNDECIDABLE

---

## I-5 \u00b7 Named periods, gaps never backfilled

**Clause:** I-5: Coverage is stated over named absolute periods, and a gap is visible

**Falsifier:** a period covers days outside its own name, or a gap is absorbed into an adjacent period

**Predicate:** H: valid ISO weeks, no overlap, gaps visible; A: since >= first observation, gaps counted

**Verdict:** UNDECIDABLE

**Producer Verdicts:**
  H: CONFORMS
  A: UNDECIDABLE

**Evidence:**
  H: 1 valid ISO week periods, 0 missing weeks (gaps visible)
  A: since field present, gaps counted; no-backfill UNDECIDABLE per CATALOGUE
  summary: H CONFORMS; A UNDECIDABLE (no-backfill half); overall UNDECIDABLE

**Required Evidence:**
  - hivemark/anchors.json (period field)
  - apex/history.json (since, gaps)

**Missing Evidence Treatment:**
  A no-backfill verification: UNDECIDABLE (cannot observe gap in single period)

---

## I-6 \u00b7 Attester is not the subject

**Clause:** I-6: The attester is not the subject, and an attestation asserts observation, not truth

**Falsifier:** a producer signs as the subject of its own record

**Predicate:** H: signer != recipient for all envelopes; A: structural separation (no attester field)

**Verdict:** UNDECIDABLE

**Producer Verdicts:**
  H: UNDECIDABLE
  A: NOT_APPLICABLE

**Evidence:**
  H: signer != recipient cannot be verified (attestations.json excluded)
  A: NOT_APPLICABLE (no attester field in artifacts)
  summary: H UNDECIDABLE; A NOT_APPLICABLE; invariant is single-source under test per CATALOGUE \u00a79

**Required Evidence:**
  - hivemark/attestations.json (signer, recipient)
  - apex artifacts (check for attester field)

**Missing Evidence Treatment:**
  hivemark/attestations.json: EXCLUDED (per PROMPT.md)
  signer/recipient verification: UNDECIDABLE

---

## I-7 \u00b7 Field ownership is enforced

**Clause:** I-7: Field ownership is enforced, not conventional

**Falsifier:** an artifact carries a value from the wrong producer class

**Predicate:** A: machine-written files have no prose fields; H: Judge absent from published genomes

**Verdict:** UNDECIDABLE

**Producer Verdicts:**
  H: UNDECIDABLE
  A: CONFORMS

**Evidence:**
  H: Judge field absence cannot be verified (genome files not in corpus)
  A: Machine-written files (health.json, history.json) contain no prose fields (what, why, learned)
  summary: H UNDECIDABLE; A CONFORMS; overall UNDECIDABLE

**Required Evidence:**
  - apex/health.json (machine-written)
  - apex/history.json (machine-written)
  - hivemark genome files (published)

**Missing Evidence Treatment:**
  hivemark genome files: EXCLUDED (input files referenced by digest only)
  Judge field verification: UNDECIDABLE

---

## I-8 \u00b7 Record states the limit of its own testimony

**Clause:** I-8: A record states the limit of its own testimony

**Falsifier:** an artifact makes a claim with no boundary and its producer offers no equivalent anywhere in the corpus

**Predicate:** A: every /log entry has non-empty attested field; H: unverifiable list exists

**Verdict:** UNDECIDABLE

**Producer Verdicts:**
  H: UNDECIDABLE
  A: CONFORMS

**Evidence:**
  H: unverifiable list cannot be verified (attestations.json excluded)
  A: All 4 log files have non-empty attested field in frontmatter
  summary: H UNDECIDABLE; A CONFORMS; overall UNDECIDABLE

**Required Evidence:**
  - apex/log/*.md (attested frontmatter field)
  - hivemark/attestations.json (unverifiable list from verifyEnvelope)

**Missing Evidence Treatment:**
  hivemark/attestations.json: EXCLUDED (per PROMPT.md)
  unverifiable list: UNDECIDABLE (runtime-generated, not in artifacts)

---

## I-9 \u00b7 Data read back is validated, failures counted

**Clause:** I-9: Data read back is validated, not trusted \u2014 and what fails validation is counted

**Falsifier:** unreadable input is dropped with no count anywhere in the record

**Predicate:** A: gaps field present and counts validation failures; H: undecodable count computed

**Verdict:** UNDECIDABLE

**Producer Verdicts:**
  H: UNDECIDABLE
  A: CONFORMS

**Evidence:**
  H: undecodable count cannot be verified (not published in artifacts)
  A: All 8 hosts have gaps field; total gaps: 0
  summary: H UNDECIDABLE; A CONFORMS; overall UNDECIDABLE

**Required Evidence:**
  - apex/history.json (gaps field per host)
  - hivemark supersede output (undecodable count)

**Missing Evidence Treatment:**
  H undecodable count: UNDECIDABLE (runtime-generated, not published in artifacts)

---

## Implementation Notes

The independent reader (`reader.py`) implements executable predicates for all 9 invariants:

- Loads corpus artifacts via `corpus/manifest.json`
- Verifies SHA256 digests where possible
- Parses ISO dates and week identifiers
- Checks structural constraints in JSON and Markdown files
- Reports EXCLUDED for `hivemark/attestations.json` (per PROMPT.md)
- Reports UNDECIDABLE where artifacts don't settle the invariant

All checks were performed without network access, using only the frozen corpus artifacts.
