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

**The status ladder.** Nothing in this document is admitted by being written
here. Every core item carries a status, and the only transition that admits it is
running the reader:

```
PREDICTED  →  READER IMPLEMENTED  →  CONFORMS  →  ADMITTED
```

If the reader can only be made to conform by taking producer-specific exceptions
that change semantics, the invariant is **removed**, not patched around. A reader
with a special case per producer has proved that the invariant was not shared.

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

**Independence has two axes, and only one of them holds.** "Two of three
independent sources" is too strong a phrase to use unqualified, so it is
decomposed:

```
implementation_independence: true
    no shared domain, data model, runtime or code;
    neither reads the other; neither written with this document in view

authorship_independence: false
    H and A share an author and a house style
```

Every "2 of 3" below means the first line and not the second. A rule can
therefore be an artefact of one person's taste rather than a property of the
problem, and this method cannot tell the two apart. Closing that gap needs a
source neither of us wrote, and none is in the corpus.

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

```
I-1  absence is a named state
status:     PREDICTED
sources:    H yes · A yes · P no
falsifier:  the reader can hold both producers' judgement values only by
            collapsing not-observed into false
reader:     load H Verdict {confirmed,refuted,uncertain,unresolved} and
            A Status {alive,cold,offline,private,unknown} into one
            representation; assert no value maps onto another
note:       this invariant constrains the reader's own output — which is why
            the verdict vocabulary in §9 has four values and not two
```

### I-2 · Where a producer records an event time, that time is the occurrence

Narrowed deliberately. The three sources do **not** share temporal semantics —
they differ in granularity, in whether a time is ever revised, and in what an
absent time means. What they share is the narrow rule: when a time is given, it
refers to when the thing happened, not to when the record was written. Any
bucketing, ordering or ageing reads that time and never the clock at write
time.

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

```
I-2  recorded time is the occurrence
status:     PREDICTED
sources:    H yes · A yes · P yes (declared)
falsifier:  a producer's time field is interpretable only as write time
reader:     assert every occurrence time precedes the corpus extraction
            timestamp; assert A's since <= checkedAt; assert H's message.time
            values are not clustered into one publication window
limit:      distinguishing occurrence from write time from artifacts alone is
            weak evidence. the strong evidence is in the source, which the
            reader does not read
```

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

```
I-3  observation kept beside conclusion
status:     PREDICTED
sources:    H yes · A yes · P no
falsifier:  a producer publishes a conclusion whose input is not in the corpus
reader:     A — for every offSite, require the finalUrl it was drawn from
            H — for every derived track record, require the claims behind it
watch:      dist/provenance.json pins corpus.json by digest, but corpus.json
            may not itself be published. if so H fails its own I-3 at the
            artifact level, and that is a finding, not a bug in the reader
```

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

**Consequence for this project — four things that must not be conflated.**

| | what it is | mutability |
|---|---|---|
| **record** | that an event was emitted, by whom, when | immutable |
| **claim** | what the record asserts about the world | immutable; it was asserted |
| **judgement** | what some evaluator said about a claim, and when | immutable; it was said |
| **derived state** | what the whole set now implies | recomputed, never stored |

An epistemic status — `unresolved`, `confirmed`, `superseded` — belongs to the
fourth row and must not sit in the first as a mutable field. Where `verdict`
appears inside a signed record in H it is **not** the fourth row: it is the
third, frozen into the second. "This identity claimed X **and** our skeptic said
Y at that time" is a compound historical fact, and it stays true forever no
matter what a later skeptic says. Superseded-ness, by contrast, is genuinely the
fourth row, and H accordingly computes it and stores it nowhere.

```
I-4  derived state is never stored
status:     PREDICTED
sources:    H yes · A yes · P no
falsifier:  a stored value disagrees with recomputing it from the published set
reader:     H — recompute superseded from attestations.json alone and compare
            H — recompute Judge from each genome; assert it is absent as input
            A — recompute status from health.json; nothing to compare against,
                since the rendered page is not in the corpus
expect:     A's half may return UNDECIDABLE
```

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

```
I-5  named periods, gaps never backfilled
status:     PREDICTED
sources:    H yes · A yes · P no
falsifier:  a period covers days outside its own name, or a gap is absorbed
            into an adjacent period
reader:     H — every anchors.json period is a valid ISO week; periods do not
            overlap; every week between first and last is present or absent,
            never merged
            A — since never precedes first observation; gaps counted
expect:     one anchor exists. a gap cannot be observed in a single period, so
            the no-backfill half is UNDECIDABLE and must not be reported as
            CONFORMS
```

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

```
I-6  the attester is not the subject
status:     PREDICTED — and the most likely to be rejected
sources:    H yes · A structural only · P no
falsifier:  a producer signs as the subject of its own record
reader:     H — assert signer != recipient across all 932 envelopes
            A — no attester field exists: NOT_APPLICABLE
expect:     if A can never exercise this, the invariant is under test a
            single source, and honesty requires demoting it to §4 rather than
            counting a NOT_APPLICABLE as support
```

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

```
I-7  field ownership is enforced, not conventional
status:     PREDICTED
sources:    A yes · H yes · P no
falsifier:  an artifact carries a value from the wrong producer class
reader:     A — machine-written files carry no prose fields
            H — Judge does not appear in any published genome
limit:      the enforcement is a test inside each producer, and the reader
            cannot see it. artifacts can only show the enforcement's result,
            never that it is enforced
```

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

```
I-8  a record states the limit of its own testimony
status:     PREDICTED
sources:    A yes · H yes (at runtime) · P no
falsifier:  an artifact makes a claim with no boundary and its producer offers
            no equivalent anywhere in the corpus
reader:     A — every /log entry carries a non-empty attested field
            H — the unverifiable list is produced by verifyEnvelope at runtime
                and does not appear in attestations.json
expect:     H's half is likely UNDECIDABLE from artifacts, which would leave
            I-8 single-source under test
```

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

```
I-9  data read back is validated, failures counted
status:     PREDICTED
sources:    A yes · H yes (at runtime) · P no
falsifier:  unreadable input is dropped with no count anywhere in the record
reader:     A — history carries gaps per host
            H — supersede's undecodable count is computed but not published
expect:     likely UNDECIDABLE for H, same reason as I-8
```

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
| `subject` | ✓ `identity_id` | ✓ host key | ✓ `aggregate_id` | **REQUIRED as a token, syntactic convergence only.** See the note below and **M2** |
| `occurred_at` | ✓ | ✓ | ✓ | **REQUIRED.** The occurrence, per I-2 |
| `payload` | ✓ | ✓ | ✓ | **REQUIRED, and core requires opacity rather than semantics** — see the note below |
| `type` | ✓ schema UID | ✗ | ✓ `event_type` | **OPTIONAL.** An in-band identifier of the payload's shape. H's is a digest, P's is a past-tense name; core does not choose — see the note below |
| `version` | ✓ `envelope_version` | ✗ | ✓ `event_version` | **OPTIONAL** |
| `id` | ✓ `uid` | ✗ | ✓ `event_id` | **OPTIONAL**, and its semantics are unresolved — see **M1** |
| `attester` | ✓ `signer` | ✗ (enforced outside the record) | ✗ | **OPTIONAL.** I-6 constrains its use wherever it is present |
| `parents` | ✗ (`refUID` is zeroed) | ✗ | ✗ | **EXCLUDED.** No evidence — see **M4** |
| `content_hash` | ✓ | ✗ | ✗ | **EXCLUDED from core.** Profile material |
| `signature` | ✓ | ✗ | ✗ | **EXCLUDED from core.** Profile material |

**On `subject`, which is worse than a shared field with three ontologies.**
The review asked whether `subject` is a common invariant or only a
common-shaped field. Checked against the code, it is the second, and the
divergence is not in what the three mean by the thing — it is in **which role
occupies the slot**:

| source | the slot holds | verified at |
|---|---|---|
| **H** | the **claimant**. `recipient: ownerAddress(claim.identity_id)` is the reviewer that made the finding. What the finding is *about* — repo, commit, file, line — sits in the payload | `attest/attest.ts:140`, `types.ts:43-55` |
| **A** | the **observed**. `entries` is keyed by host: the district the probe was pointed at. The observer, a workflow, appears nowhere in the record | `status.ts:29`, `status.ts:104` |
| **P** | the **producer**. "The unique identifier of the Aggregate that produced the event" | `pollen_protocol.proto:27` |

Claimant, observed, producer. Three different roles wearing one field name. What
is actually proven is far weaker than "all three have a subject":

> Three systems each need **some** token binding a record to something outside
> itself. They do not agree on what.

Core therefore carries `subject` as an **opaque relation token** and promises
nothing about the relation. A conformance reader may not assume it denotes the
thing observed, and specifically may not join records from two producers on it.
**M2** is widened accordingly: it is not only the ontology of the subject that is
unresolved, it is the role.

**On `payload`.** The same test, the same answer. All three carry a container;
none agrees on what goes in it. Core requires that the field exist and that it be
**opaque to core** — no schema, no interpretation, no validation — and nothing
more. A future profile may say what its payload means. Core may not.

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

**Absence from core is not an anti-crypto decision.** It is a statement about
where the evidence currently sits, and nothing else. The expected first profile
is `p-e/attested/hivemark`, which defines canonical bytes (N-2), hash domain
separation (N-3), the signing domain, and what a signature does and does not
assert (I-6). A second producer adopting any of it moves those rules from a
profile into core by the ordinary admission rule, with no argument needed.

## 6. Status of every item

Two axes, because "we found this in the code" and "we think this belongs in the
protocol" are different claims and this document has been careless about the
difference until now.

- **evidence** — `PROVEN` means read in a source's code at the pinned revision in
  §2. `NONE` means no source carries it.
- **admission** — `PREDICTED` means expected to be core and unconfirmed;
  `REJECTED` means deliberately out of core 0.1; `UNRESOLVED` means the question
  is open. `ADMITTED` requires the reader to have run.

| item | evidence | admission |
|---|---|---|
| I-1 absence is a named state | PROVEN H+A | PREDICTED |
| I-2 recorded time is the occurrence | PROVEN H+A+P | PREDICTED |
| I-3 observation kept beside conclusion | PROVEN H+A | PREDICTED |
| I-4 derived state is never stored | PROVEN H+A | PREDICTED |
| I-5 named periods, gaps never backfilled | PROVEN H+A | PREDICTED |
| I-6 attester is not the subject | PROVEN H, weak A | PREDICTED |
| I-7 field ownership enforced by test | PROVEN A+H | PREDICTED |
| I-8 a record states its own limit | PROVEN A+H | PREDICTED |
| I-9 data read back is validated and failures counted | PROVEN A+H | PREDICTED |
| N-1 identity is the hash of the thing | PROVEN H | REJECTED — single source |
| N-2 canonical encoding before hashing | PROVEN H | REJECTED — profile |
| N-3 domain separation on hashes | PROVEN H | REJECTED — profile |
| N-4 event id is f(content) | PROVEN H, contradicted by P | REJECTED — see M1 |
| N-5 freshness follows provenance kind | PROVEN A | REJECTED — single source |
| N-6 a derivation pins its inputs by digest | PROVEN H | REJECTED — single source |
| envelope `subject` | PROVEN, **syntactic only** | PREDICTED, semantics UNRESOLVED |
| envelope `occurred_at` | PROVEN H+A+P | PREDICTED |
| envelope `payload` | PROVEN, **container only** | PREDICTED, semantics out of scope |
| envelope `type` | PROVEN H+P | PREDICTED, optional |
| envelope `version` | PROVEN H+P | PREDICTED, optional |
| envelope `id` | PROVEN H+P, absent in A | PREDICTED optional, semantics UNRESOLVED |
| envelope `attester` | PROVEN H only | PREDICTED optional |
| envelope `parents` | NONE | REJECTED — see M4 |
| envelope `content_hash` | PROVEN H | REJECTED — profile |
| envelope `signature` | PROVEN H | REJECTED — profile |
| M1 identity semantics | conflict H↔P | UNRESOLVED |
| M2 subject role and ontology | conflict H↔A↔P | UNRESOLVED |
| M3 cryptographic family | PROVEN H; intent elsewhere | UNRESOLVED, and not yet a real conflict |
| M4 causal linkage | NONE, and never considered | UNRESOLVED |

**Nothing in this document is `ADMITTED`.** No reader exists, so the falsifier in
§9 has never been run, and every `PREDICTED` above is exactly that.

## 7. Deliberately unresolved

Four gaps. Each is a real disagreement between sources, and each is recorded with
its provenance so that whoever closes it knows what evidence they are overruling.

### M1 · Identity semantics

```
H:  id = f(content)          uid derived from claim_hash, so re-emission is a no-op
P:  id = generated UUID      "a unique identifier for this specific event instance"
A:  no id                    records keyed by subject, rewritten in place
```

Producers **MUST NOT** assume `id` is content-addressed unless a profile says so.
A candidate resolution exists and is explicitly **not** adopted in 0.1: that
three distinct concepts are currently being forced through one word.

```
record_id      this record, as emitted       generated, may be arbitrary
content_id     what the record says          derived, f(canonical bytes)
transport_id   this copy, in this store      assigned by the store
```

Named here for one purpose only — so a later discussion cannot quietly settle on
one meaning and lose the other two. **None of the three enters core in 0.1.**
`id` stays a single optional opaque string whose semantics the spec declines to
fix.

### M2 · Subject ontology

```
H:  content-derived identity   the hash of a configuration
A:  human-named entity         a slug in districts.toml, written by hand
P:  opaque aggregate_id
```

Widened after review. The divergence is not only ontological — what kind of
thing the subject is — but **role**: H's slot holds the claimant, A's holds the
observed, P's holds the producer (see §5). Core carries `subject` as an opaque
relation token, defines nothing about it, and does not promise it denotes an
identity, an aggregate, a host, a document, or the thing the record is about.
Readers must not join across producers on it.

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

No evidence in any source — but "no evidence" has kinds, and the review is right
that the distinction may decide M4 later. Recorded precisely:

| kind | meaning | who |
|---|---|---|
| **absent** | the format has no such field | A, P |
| **present, null-valued, inherited** | the field exists because an adopted format requires it, and is filled with the null value | H — `refUID: 0x00…00` at `attest/attest.ts:144`, and `ZERO_UID` again in `birth/submit.ts:69` and `anchor/submit.ts:43` |
| **explicitly suppressed** | a source considered linkage and rejected it | **nobody** |

That last row is the finding. No source has decided against causal linkage; in
all three it simply never arose, and H's zeroes are an inherited EAS requirement
rather than a judgement — no comment in that codebase defends the choice, which
in that codebase is itself a signal.

So M4 is an absence of consideration, not an absence of need. Causality in H is
recovered by grouping over fields rather than pointers (`supersede.ts`), which is
evidence that pointers were not needed *there*. Adding `parents` to core would be
authorship, not extraction, and it stays refused until a reader demonstrably
cannot do its job without it.

## 7a. Open questions no source in the corpus addresses (U)

`M` numbers mark places where the sources **disagree**. These mark places where
none of them has anything to say, and the question arises anyway. They are kept
separate so that "we checked and they conflict" is never confused with "nobody
looked."

### A fourth kind of evidence, and why it does not vote

In August 2026 METR published an investigation of agents that coordinated
through an Artifactory cache namespace, using directory names as the medium via
WebDAV `MKCOL`. Under that constraint the agents invented a message convention
nobody specified:

```
zzR_JANFE78_TO_FEBFE78B_OS2308__saw_your_tripleSSRF_local8046_router_rawdata
││ │        │  │         │       └ body, opening with a reference to a prior message
││ │        │  │         └ sequence
││ │        │  └ recipient
││ │        └ to
││ └ sender
│└ kind (R = reply)
└ prefix marking the message as intentional
```

Also observed: `HOLD`, `VETO`, `owner` and `STOP` for shared infrastructure;
base64 file chunking (`zzFILE_DAVJAN22_CPDEV5/002486_…`); and six message
categories the researchers recovered by regex, covering 93% of entries —
automated log, coordination, file, information-sharing, question or request,
result.

**This is the same shape as `p-e/x0` — kind, from, to, and an in-band reference —
arrived at independently under channel pressure, with no protocol document.**
That is a real observation and it is worth recording. What it is missing is
equally informative: no status, no canonical form, no identity that survives the
namespace, and no provenance. The optimisation pressure was tokens down. This
project's is ambiguity down. Those produce different languages, and the swarm's
is better at exactly the thing p-e is worst at.

It is admitted as **prior art, not as a source**. Three reasons, and the third is
the binding one:

1. It is an account *of* the artifacts, not the artifacts. This project read
   METR's report; it did not read the Artifactory namespace.
2. The conventions were re-invented and re-broken during the incident, so they
   testify to pressure rather than to a rule that held.
3. It is not in the conformance corpus, so no reader can exercise it. **It
   therefore never counts toward the two-of-three admission rule**, and nothing
   below may enter core on its strength.

Verified against the published report on 2026-08-28; the quoted fragments above
appear there. The report itself is secondary evidence about a system neither of
its authors nor this document's author can inspect.

### U-1 · Wire efficiency

> Can a canonical p-e event be encoded in a compact, agent-native representation
> without changing its semantics or losing its provenance?

**Status:** unresolved. **Evidence:** emergent swarm protocols (above); none in
H, A or P, all three of which write for storage rather than for a channel.

The candidate shape — one event, three representations rather than three
protocols — is recorded and **not adopted**:

```
canonical      the bytes that are hashed and signed          (profile material)
compact        agent-to-agent relay under channel pressure   (unevidenced)
human          markdown or YAML projection                   (this document)
```

Nothing here may be designed before the reader has run. A compact grammar
invented now would fix the wire shape before the evidence fixes the semantics,
which is the failure mode §12's build order exists to prevent.

### U-2 · Whether every message must become history

> Is there a class of message that participates in the protocol without entering
> the durable record?

**Status:** unresolved. **Evidence:** partial, and the sources differ in kind
rather than disagreeing.

| source | ephemeral tier | durable tier |
|---|---|---|
| **A** | `health.json` — one snapshot, overwritten every run | `history.json` — the fold, which accumulates |
| **H** | none. every run is signed, superseded ones included | everything |
| **P** | not addressed | not addressed |
| swarm | most traffic was coordination noise | a few results and files |

So one producer has the distinction, one deliberately refuses it, and one is
silent. That is not enough to admit a two-tier model, and it is too much to
dismiss one.

Note what this makes of the `p-e/x0` blocks this project's own participants
exchange: they are the ephemeral tier. They were declared transport of the
experiment rather than protocol from the first one, which now looks less like a
disclaimer and more like the unadmitted distinction showing up in practice.

## 8. Out of scope for core

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

## 9. The conformance corpus

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

### The reader's verdict vocabulary

Four values, not two. This follows from I-1 applied to the reader itself: a
tool that can only say pass or fail collapses "not observed" into "false", which
is the exact defect the catalogue's strongest invariant exists to prevent.

| verdict | meaning |
|---|---|
| `CONFORMS` | the invariant was exercised against this producer and held |
| `VIOLATES` | it was exercised and failed |
| `NOT_APPLICABLE` | this producer has no such construct — the invariant cannot apply |
| `UNDECIDABLE` | it applies, but the published artifacts do not settle it |

`apex` carries no signatures. The reader must report `NOT_APPLICABLE`, never
`VIOLATES — no signature`. And **a producer's absence is evidence, not
permission**: a `NOT_APPLICABLE` never counts as support. An invariant supported
by one `CONFORMS` and one `NOT_APPLICABLE` is single-source under test, and is
demoted to §4 regardless of what the code inspection found.

### The corpus manifest, frozen before implementation

The reader must be written against a corpus that cannot move under it.

- every artifact pinned by `sha256`, byte count and source revision
- the **extraction timestamp** recorded separately from any occurrence
  timestamp inside the artifacts, and never confused with one (I-2 applied to
  this project's own record)
- no invented fixtures. A fixture may exercise the reader; only a real artifact
  may support a verdict

### What is predicted to happen, recorded before it runs

The catalogue was read off **source code**. The reader consumes **published
artifacts**. Those are different evidence bases, and much of the discipline in H
and A lives in the producer rather than in what it publishes — `verifyEnvelope`'s
`unverifiable` list, `supersede`'s `undecodable` count and `takeRecord`'s
validation all run and then vanish.

The prediction, stated now so it cannot be adjusted afterwards: **several
invariants that are PROVEN in code will come back UNDECIDABLE at the artifact
level.** I-6, I-8 and I-9 are the most likely, and I-6 is the likeliest to be
demoted outright. A conformance report in which all nine conform would be
evidence that the reader is too permissive, not that the catalogue is right.

## 10. Non-goals

p-e is not a version control system, and does not compete with Git, Pijul,
Radicle or `mur`. Git answers how an artefact changed. p-e answers what was
observed, by whom, and what the record does not establish. `mur` is adjacent and
orthogonal: change history against epistemic history.

p-e does not replace CloudEvents, in-toto/SLSA or AT Protocol, all of which are
prior art this document should be compared against before 0.1 is called done —
that comparison is not yet written.

p-e/core does not know what a file is.

## 11. What this document does not establish

Per I-8, stated as a field rather than left for a reader to work out.

- **Not** that these nine rules are the right rules. Only that two independently
  written systems arrived at each of them, and that those two systems share an
  author.
- **Not** that the catalogue is complete. It was read off two codebases by one
  pass, and a rule enforced quietly — by a type, a test name, or the absence of a
  field — could have been missed.
- **Not** that the envelope in §5 works. No reader has been written, so the
  falsifier in §9 has never been run. Every "REQUIRED" here is a prediction.
- **Not** that P is evidence of practice. It is a schema with no producer and no
  consumer, and it is cited only for intent.
- **Not** that the incidents are complete accounts. They are what the source
  comments record about themselves, and a comment is written by the person who
  made the mistake.
- **Not** that `subject` and `payload` denote anything shared. §5 establishes
  only that three systems each need *some* token binding a record to something
  outside itself, and that they disagree on what — including on which role the
  token names.
- **Not** that H and A agreeing is strong evidence. They are independent as
  implementations and dependent in authorship (§2), and this method cannot
  separate a property of the problem from a property of one person's taste.

**Revision history of this document's own errors**, per I-8, since a catalogue
of other systems' mistakes that hides its own would be the joke telling itself:

| corrected | was | now |
|---|---|---|
| `type` evidence | reported single-source | 2 of 3 — H carries it in-band as the EAS schema UID (`message.schema`) |
| `subject` | "opaque string, ontology unresolved" | syntactic convergence only; the *role* diverges — claimant / observed / producer |
| M3 | stated as an H↔P conflict | P specifies no signature at all; the Ed25519 expectation comes from `aura`, which is not a source in §2 |
| corpus size | "12 hosts" | 8 hosts; 12 districts, four of which have no host to probe |
| independence | "2 of 3 independent" | decomposed into implementation and authorship axes; only the first holds |

## 12. Planned repository layout

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

**Build order, and why it is not negotiable.**

```
1. conformance reader     external to both producers; runs the falsifier
2. minimal codec          only for what the reader admitted
3. first profile          p-e/attested/hivemark
```

The reference library must not be written before the reader has run. An
implementation written first becomes a second source of protocol semantics — the
spec then describes the library instead of the corpus, and the archaeology is
over without anyone having decided to end it.

Git is the development and review layer. IPFS, if adopted, is an immutable
publication layer for released artefacts. Neither is part of p-e/core.
