# p-e/core 0.1 — Archaeological Draft

**Status:** provisional. Nothing here is stable, and four questions are open on purpose.

p-e is not designed first. p-e is extracted first.

Two systems already in production, written independently of each other and of
this document, enforce a set of rules about how a record may speak about the
world. This specification is an attempt to read those rules off the code rather
than to invent better ones. A rule that only one of them enforces is recorded
here as evidence, and kept out of the core.

## 1. Method

**The admission rule.** A rule enters `p-e/core` only if at least two of the
three sources below already enforce it, in code, without reference to this
document. Everything else is catalogued as single-source evidence and left out.

**The falsifier.** One reader must be able to read every source in the
conformance corpus without any producer being modified. An invariant the reader
cannot honour without changing a producer is not an invariant — it is this
document's opinion, and it is removed.

**The size constraint.** `p-e/core 0.1` must stay smaller than the union of what
the three sources carry. A core the size of the union has extracted nothing.

**What this method cannot do.** It cannot find a rule that is right and that
nobody has implemented yet. It is biased toward what has already survived
contact with a running system, which is the bias this project wants, and it is
silent about everything else. Where the sources are all wrong together, this
document will be wrong with them.

## 2. Sources of evidence

Pinned to revisions, because a catalogue that cites a moving target cannot be
checked later.

| key | repository | revision | dated | what it is |
|---|---|---|---|---|
| **H** | `hivemark` | `bfa75d7` | 2026-08-17 | cumulative track records for code-review agents; 932 signed offchain attestations and one onchain weekly Merkle anchor over 1,864 UIDs, published |
| **A** | `apex` / zae.life | `afb3a3c` | 2026-08-14 | a personal site that probes its own districts and publishes what came back, including that most of them are not answering |
| **P** | `agents` | `11fda22` | 2026-08-08 | `dna-core/pollen_protocol.proto` — the Pollen envelope, v1. A declaration, with no producer and no consumer in the corpus |

**How independent these are, stated plainly.** H and A share an author and a
house style, so they are not two unrelated teams. They share no domain, no data
model, no runtime, and no code; neither reads the other; and neither was written
with this document in view. That is the independence claimed by every "2 of 3"
below, and it is weaker than it would be between strangers. It bounds every
conclusion here.

P is weaker still. It is a schema nobody has run, so it testifies to what its
author intended, not to what survived. It is admitted as evidence of intent and
never as evidence of practice, and it is never the second source that carries a
rule into core on its own.

## 3. The invariant catalogue

Nine rules meet the admission rule. Each is stated, then evidenced, then — where
the code says so — given the incident that produced it. The incidents are the
part that could not have been derived by reasoning.

### I-1 · Absence is a named state, never folded into a negative

For every judgement there are at least three states: yes, no, and not-observed.
The third is never a variant of the second.

**H** — `types.ts`. `Verdict.unresolved` is hivemark's own state, not the
upstream tool's: "Guardian leaves `verdict` null when the skeptic did not run.
That absence must never be read as confirmation." `Judge.nobody` is a third
state beside `self` and `independent`, because "collapsing the two would report
an unjudged corpus as a self-judged one." `TrackRecord` splits `reviews`,
`unparseable` and `errored` — "one produced text nobody could read, the other
produced none. Both are excluded from `reviews` for the same reason — neither is
a review." `SeverityBand` keeps `resolved` apart from `claims`, because a rate
over `claims` counts unresolved findings as failures.

**A** — `status.ts`. Five states where two would lie. `cold` is a fact about a
district; `unknown` is a fact about the observation. `offline` is a third thing
again: never a web service, so there is nothing to probe. `HealthSnapshot.ok` is
false when the check itself failed, and then "the snapshot carries no testimony."

**Incident (A).** A corrupted `health.json` once rendered every district alive,
because the string `"false"` is truthy. The consequence is a coding rule that
follows from this invariant rather than standing beside it: gates compare by
value, never by truthiness, since "anything that is not exactly `true` or exactly
`false` was not observed."

### I-2 · The time on a record is the time of the occurrence

Not the time of writing. Any bucketing, ordering or ageing reads the occurrence
time and never the clock at write time.

**H** — `attest/attest.ts::reviewTimeOf`. `time` is when the review happened, a
deliberate departure from how EAS reads that field.

**A** — `health.json.checkedAt` is when the probe ran; `HostRecord.since` is the
first check that observed the current state.

**P** — `PollenEnvelope.timestamp`: "When the event occurred, in UTC."

**Incident (H), and the only rule here found by running rather than reasoning.**
Two dry runs over identical data produced two different Merkle roots. The wall
clock was minting a fresh UID on every pass for claims that had not changed.
Worse: the weekly anchor buckets by this field, so with a signing timestamp an
anchor labelled "the week of 12 August" would really have covered whichever week
the pipeline last ran — re-running in October would have anchored August's
reviews as October's, asserting something untrue about when they existed.

The cost is paid openly: easscan displays this time as the attestation's creation
date, which it is not, and the README says so.

### I-3 · The observation is kept beside the conclusion

A record that stores a derived judgement also stores what the judgement was made
from, so a reader can check one against the other.

**A** — `status.ts`. `HealthEntry.finalUrl` is "where the probe landed, recorded
whenever it differs from what was requested," and `offSite` is the conclusion
drawn from it. They are separate on purpose: "one is what was seen, the other is
what was concluded from it," and the record is kept "which they cannot do if
only the cases the code already decided are kept." `replyFor` will not print
`timeout` over a 502, because that "names a failure mode nobody saw."

**H** — `claim_hash` is a commitment to the whole finding, including prose the
`Claim` does not carry, and it survives into every derived track record.
`dist/provenance.json` pins each input file of a published derivation by
`sha256`, byte count and line count.

### I-4 · Derived state is never stored

Anything that could change as the record grows is a pure function of the
append-only set, recomputable by a third party holding only that set. It is not
a field.

**H** — `supersede.ts`. Which attestations a later run superseded is "computed
from published attestations alone — no corpus, no ledger, no access to whoever
generated them." Every run is signed, superseded ones included: "an attestation
says this identity made this claim at this time, which is true of a superseded
run — it happened." Signing only the newest "would bake one scoring policy into a
permanent record and make re-scoring under another impossible." `Judge` is
likewise derived from the genome and never stored as input, because "a field
that could disagree with the genome would be a field that could lie about it."

**A** — `resolveStatus` derives status from the snapshot at render time. Status
is not a field of anything.

**Consequence for this project.** An epistemic status — `unresolved`,
`confirmed`, `superseded` — must not sit inside an immutable event as mutable
state. Where it appears inside a signed record in H, it is not mutable state: it
is half of a compound observation ("this identity claimed X **and** our skeptic
said Y at that time"), which is a historical fact and stays true forever.

### I-5 · Coverage is stated over named absolute periods, and a gap is visible

Missing coverage is representable, and it is never repaired retroactively.

**H** — `anchor/period.ts`. ISO 8601 weeks, not rolling windows: "a week nobody
anchored is a period with no record — visible as an absence. A window running
from 'whenever we last anchored' would absorb the skipped days into the next root
and leave nothing to notice." `periodId` validates by round trip, so `2025-W53`
is refused rather than silently denoting a different week. The README states the
rule the code protects: a skipped week stays a gap and is never backfilled,
"because an anchor published late would assert that its contents existed by a
date that has now passed."

**A** — `history.ts`. `HostRecord.since` is "never earlier — the site began
observing on the day it went live, and a district that had been silent for a year
before that was silent unobserved. Saying otherwise would testify to something
nobody watched." `HostRecord.gaps` counts runs that could not observe: "a streak
with holes in it is a different claim from an unbroken one, and hiding the holes
would make the count say more than it should."

### I-6 · The attester is not the subject, and an attestation asserts observation, not truth

**H** — `attest/attest.ts`. `recipient` is the reviewer's own address; the signer
is the publisher. "The two are deliberately different: reviewers hold no keys, so
nothing they are said to have claimed is signed by them." The README states the
scope of the resulting signature, and `verifyEnvelope` returns an `unverifiable`
list saying the same thing in the data.

**A** — weaker, and the weakest link in this catalogue. The separation is
structural rather than a field: a `/log` entry's subjects are the witnesses it
describes, the attester is the author, and the required `attested` field is the
author's boundary on testimony about someone else's behaviour (see I-8). Nothing
in A names an attester in a record. A reader who wanted to reject I-6 from core
would attack it here first, and they would have a case.

**Consequence.** Three roles must be distinguishable wherever they are recorded:
the **subject** the record is about, the **observer** that saw it, and the
**signer** that vouches for the record's transmission. Collapsing any two is how
a record starts asserting more than anyone checked.

### I-7 · Field ownership is enforced, not conventional

Each field has exactly one authorised class of producer, and the boundary is
tested rather than documented.

**A** — machine-written files (`health.json`, `history.json`, `stats.json`) are
never touched by hand; the `what`, `why` and `learned` prose is written by hand
and never generated. "The separation is enforced at the merge, with a test that
feeds a statistics file carrying prose and asserts none of it reaches the page."
Several fields therefore read `‹ not written yet ›` rather than something
plausible.

**H** — `Judge` is derived from the genome and refused as input for the same
reason (see I-4).

### I-8 · A record states the limit of its own testimony

**A** — the `/log` collection schema requires a third field beside `claimed` and
`observed`: `attested`, which names what the entry does **not** establish. "An
entry that cannot fill it honestly is not ready, and the build should say so
rather than publish a claim with no boundary." `src/lib/provenance.ts` opens by
stating its own blind spot — it checks quotations, so "it is strongest against a
witness that supplies evidence and weakest against one that supplies none, which
is the opposite of where the risk sits."

**H** — `verifyEnvelope` returns an `unverifiable` list; the README says in as
many words that a signature does not assert a finding is correct.

### I-9 · Data read back is validated, not trusted — and what fails validation is counted

**A** — `history.ts::takeRecord` re-validates every field of a record read off
disk, including that `since` round-trips as an ISO string and is not in the
future, and that counts are safe non-negative integers, because "JSON carries
1e999 as `Infinity`, which would render 'in Infinity checks'." Anything malformed
is discarded, restarting that host's record at this observation "instead of
carrying a number nobody can account for."

**H** — `supersede.ts` counts `undecodable` envelopes rather than skipping them:
"dropping them quietly would make `superseded` understate the very difference it
exists to explain, and the caller would have no way to tell an accurate small
number from a large one with most of its input discarded."

## 4. Evidence catalogued but kept out of core

These are single-source. They are recorded because they are almost certainly
right, and excluded because this method has no way to know that yet.

| ref | rule | source | why it stays out |
|---|---|---|---|
| N-1 | Identity is the hash of the thing, not an issued name | H `identity.ts` | A names its subjects by hand; P treats `aggregate_id` as opaque. See **M2** |
| N-2 | Canonical encoding before hashing: sorted keys, no whitespace, `undefined` dropped, ordering by code unit and never `localeCompare` | H `canonical.ts` | a precondition of hashing, and core 0.1 does not hash. Enters core with the first profile that does |
| N-3 | Domain separation on every hash, versioned | H `anchor/leaf.ts`, `attest/domain.ts` | same |
| N-4 | The event id is a stable function of content, so re-emitting an unchanged event is a no-op | H (`salt = claim_hash`) | **P contradicts it outright.** See **M1** |
| N-5 | Freshness vocabulary follows the kind of provenance — probes erode and say `checked`, git counts do not and say `read`, authored prose gets none | A `freshness.ts`, README | H has no independent equivalent |
| N-6 | A published derivation pins its inputs by digest | H `dist/provenance.json` | A pins nothing by digest |

**N-1's incident is worth keeping even though the rule stays out.** H's identity
preimage was once `guardian_sha`, which moved on any commit — a README edit
minted a new entity with an empty track record, and eight identities existed
where three configurations had been run. It was replaced by a digest over the
code that actually decides a review. The transferable lesson is not "hash the
thing"; it is **the preimage must cover exactly what changes behaviour, and
nothing else**. That lesson is offered to whoever resolves M2.

## 5. The minimum common envelope

Fields, with the count of sources that carry them **as a field**. A rule enforced
outside the record does not count here, however strong the rule.

| field | H | A | P | ruling |
|---|:-:|:-:|:-:|---|
| `subject` | ✓ `identity_id` | ✓ host key | ✓ `aggregate_id` | **REQUIRED.** Opaque string. Core defines no ontology for it — see **M2** |
| `occurred_at` | ✓ | ✓ | ✓ | **REQUIRED.** The occurrence, per I-2 |
| `payload` | ✓ | ✓ | ✓ | **REQUIRED.** Opaque to core |
| `type` | ✓ schema UID | ✗ | ✓ `event_type` | **OPTIONAL.** An in-band identifier of the payload's shape. H's is a digest, P's is a past-tense name; core does not choose — see the note below |
| `version` | ✓ `envelope_version` | ✗ | ✓ `event_version` | **OPTIONAL** |
| `id` | ✓ `uid` | ✗ | ✓ `event_id` | **OPTIONAL**, and its semantics are unresolved — see **M1** |
| `attester` | ✓ `signer` | ✗ (enforced outside the record) | ✗ | **OPTIONAL.** I-6 constrains its use wherever it is present |
| `parents` | ✗ (`refUID` is zeroed) | ✗ | ✗ | **EXCLUDED.** No evidence — see **M4** |
| `content_hash` | ✓ | ✗ | ✗ | **EXCLUDED from core.** Profile material |
| `signature` | ✓ | ✗ | ✗ | **EXCLUDED from core.** Profile material |

**On `type`.** Both in-band forms identify the shape of the payload, which is why
they count as one field. They are not interchangeable: a schema digest is
checkable and unreadable, a past-tense name is readable and unenforced. Core
carries the field and declines to say which.

**On `id`.** A carries no per-observation identifier at all — its records are
keyed by host and rewritten in place. That absence is evidence, not an oversight
to be corrected, and it is why `id` is optional rather than required.

**The result, stated because it is the point.** Applying the admission rule
strictly leaves **`p-e/core 0.1` with no cryptography whatsoever**. Hashing and
signing are evidenced by H alone; A hashes nothing and signs nothing, and P
neither. They therefore belong to a profile, not to core. This was not the
intended outcome and it is not being worked around: it is what the method
returned, and reversing it would mean the method was decoration.

## 6. Deliberately unresolved

Four gaps. Each is a real disagreement between sources, and each is recorded with
its provenance so that whoever closes it knows what evidence they are overruling.

### M1 · Identity semantics

```
H:  id = f(content)          uid derived from claim_hash, so re-emission is a no-op
P:  id = generated UUID      "a unique identifier for this specific event instance"
A:  no id                    records keyed by subject, rewritten in place
```

Producers **MUST NOT** assume `id` is content-addressed unless a profile says so.
A candidate resolution exists and is explicitly **not** adopted in 0.1:
separating event identity from transport identity, so a generated id and a
derived one are different fields rather than two readings of one.

### M2 · Subject ontology

```
H:  content-derived identity   the hash of a configuration
A:  human-named entity         a slug in districts.toml, written by hand
P:  opaque aggregate_id
```

Core carries `subject` as an opaque string and defines nothing about it. It does
not promise the subject is an identity, an aggregate, a host, or a document.

### M3 · Cryptographic family

```
H:  keccak256 · secp256k1 · EIP-712 · Base mainnet domain
P:  Ed25519          — but not from P itself
```

`pollen_protocol.proto` specifies no signature at all. The Ed25519 reading comes
from `aura/packages/aura-core/src/aura_core/determinism.py`, which names the
Pollen envelope and Ed25519 signing in one breath while exempting both from its
entropy ban. **`aura` is not in the source table in §2** and is cited here only
to record where the expectation came from. On the evidence proper, this is not
yet a disagreement between two sources — it is one source (H) and one intention
held elsewhere.

The divergence is not only the curve: the content hash differs too. Core 0.1
does not hash, so the question does not arise yet, and it will arise the moment
the first profile is written.

### M4 · Causal linkage

No evidence in any source. H zeroes `refUID`; A has no links; P has none.
Causality in H is recovered by grouping over fields, not by pointers
(`supersede.ts`). Adding `parents` to core would be authorship, not extraction,
and it is refused on that ground until a reader demonstrably cannot do its job
without it.

## 7. Out of scope for core

- **Profiles** — `p-e/hivemark-attested`, `p-e/apex-epistemic`. Where hashing,
  signing, anchoring and freshness rules live. Single-source is legitimate here;
  a profile says "this producer does it this way," not "everyone must."
- **Vocabulary** — `observed` / `recorded` / `derived` / `authored`, and
  `confirmed` / `refuted` / `uncertain` / `unresolved`. These are the semantics
  of a claim's provenance and of a judgement, and **not** wire-level event kinds.
  Naming `derived` as an event `type` would be the specific mistake this split
  exists to prevent.
- **Transport and storage** — Git, IPFS, HTTP, a file. `p-e://` names a thing;
  `https://` and `ipfs://` say where a copy is. None of them is part of core.
- **ATCG, Genesis Event, the Sacred Codons** — application-level semantics above
  core, not wire level.
- **bee.zae** — a participant in the protocol, not the protocol. The relationship
  is HTTP to a browser.

## 8. The conformance corpus

Real published output, not fixtures written for this document.

| source | artifact | size |
|---|---|---|
| H | `dist/attestations.json` | 932 signed envelopes |
| H | `anchors.json` | 1 weekly root over 1,864 UIDs |
| H | `births.json` | 3 identities, onchain, with tx hashes |
| H | `dist/provenance.json` | input manifest, digests |
| A | `data/health.json` | one snapshot, 8 hosts (of 12 districts; four have no host) |
| A | `data/history.json` | folded record, per host |
| A | `src/content/log/*.md` | 4 attestations, `claimed` / `observed` / `attested` |

**The test.** One reader over all of it, with neither producer modified.

**The falsifier.** Any invariant the reader cannot honour without changing a
producer is removed from this document.

## 9. Non-goals

p-e is not a version control system, and does not compete with Git, Pijul,
Radicle or `mur`. Git answers how an artefact changed. p-e answers what was
observed, by whom, and what the record does not establish. `mur` is adjacent and
orthogonal: change history against epistemic history.

p-e does not replace CloudEvents, in-toto/SLSA or AT Protocol, all of which are
prior art this document should be compared against before 0.1 is called done —
that comparison is not yet written.

p-e/core does not know what a file is.

## 10. What this document does not establish

Per I-8, stated as a field rather than left for a reader to work out.

- **Not** that these nine rules are the right rules. Only that two independently
  written systems arrived at each of them, and that those two systems share an
  author.
- **Not** that the catalogue is complete. It was read off two codebases by one
  pass, and a rule enforced quietly — by a type, a test name, or the absence of a
  field — could have been missed.
- **Not** that the envelope in §5 works. No reader has been written, so the
  falsifier in §8 has never been run. Every "REQUIRED" here is a prediction.
- **Not** that P is evidence of practice. It is a schema with no producer and no
  consumer, and it is cited only for intent.
- **Not** that the incidents are complete accounts. They are what the source
  comments record about themselves, and a comment is written by the person who
  made the mistake.

## 11. Planned repository layout

Written down so the shape is agreed before anything fills it. No code exists yet,
and none should until this catalogue is reviewed.

```
p-e/
├── spec/
│   ├── core-0.1.md
│   └── invariants.md
├── schemas/core-0.1.json
├── reference/ts/
├── conformance/{hivemark,apex}/
├── fixtures/{hivemark,apex}/
├── vectors/
├── profiles/hivemark-attested.md
└── README.md
```

Git is the development and review layer. IPFS, if adopted, is an immutable
publication layer for released artefacts. Neither is part of p-e/core.
