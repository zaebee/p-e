# Questions before implementation — Issue #1 v1

SPEC.md sha-256 verified as `656d7ecf1fac85435ae7a6bfb1d55930eacddb94eaccb2209ebad386ebe4528d`. It matched.

**Ordering criterion.** Tier 1: I cannot write the code at all — the spec makes the
undetermined thing load-bearing and supports two incompatible readings, and every line I
would write depends on which. Tier 2: I can write code by guessing, and the guess survives
until a specific later event (a second authority, a crash, a deletion, a reader from another
store) makes it observably wrong. Tier 3: real underdetermination whose cost is confined to
one surface — a field name, an output token, a limit.

---

## Tier 1 — blocking

### Q1. Which bytes does `sha256(bytes)` run over — the record as the store holds it, including the deposit header the store itself wrote, or the authored payload with that header split off?

> **K1** | artifact boundary | what counts as *one artifact*. The receiving store writes the deposit header (`deposit.ts:102`) and `loadStore` splits it off again (`store.ts:127-133`), so the boundary is ours and is not in the bytes. Irreducible — byte extraction is a function and needs its domain first. **Our only 100%-failure-rate decision.**

and, in MUST 3:

> Record content is identified by `sha256(bytes)`, stable across ids.

and, in *Citing a record*:

> - **digest** — `sha256(bytes)` of the cited record.

The kernel section that names this decision also disclaims it: "**This section and the one
above it constrain no requirement below** (audit finding F10, pin `6dfcce1`). Of K1–K6 only K3
reappears, in MUST 3". So K3 (SHA-256) binds MUST 3 and K1/K2 do not, leaving the domain of the
hash function unfixed by any normative clause.

**Two implementations.** (a) Digest over the stored file bytes: the digest changes if the store
ever rewrites or reformats its own header, and two stores that add different `deposited-by:`
lines to identical authored content produce different digests for it. (b) Digest over the
payload below the deposit header: the same authored content deposited into two stores digests
identically, and MAY-level "Content deduplication across ids." actually finds duplicates across
channels. Under (a) the `duplicate content` row ("two ids, one digest") almost never fires for
records deposited through different channels; under (b) it fires routinely.

**Blocking.** Everything downstream — the citation pair, MUST 4's non-rewindability, the ledger
entry, dedup — is keyed on this value.

### Q2. Where does the digest live so that it survives deletion, given that the allocation marker is specified as an empty file?

> **Allocation mechanism (v1):** each id owns a persistent allocation marker — an
> empty file `history/relay-NNNN` created with `wx`/`O_EXCL`.

> Measured cost: one empty file per id, retained for the authority's life

against MUST 6:

> - **Deletion.** The ledger keeps `(authority, seq, digest)` and answers with it; the
>   payload reads `KNOWN_MISSING`. A client must never confuse *content removed* with
>   *no binding*.

and the *Named failures* row for `delete`:

> the id stays bound. Deletion removes the record but **never** the allocation marker (v1 / future authority); the marker is the ledger entry that persists

The last clause identifies the marker as the ledger entry; the marker is empty; the ledger must
answer with a digest after the record is gone.

**Two implementations.** (a) The marker stays empty and is purely a claim token: after deletion
the store can answer "this id is bound" but cannot answer with a digest, so a client can never
verify that recovered bytes are the ones that were deleted, and a `(locator, digest)` citation to
a deleted record cannot be checked against anything. (b) The marker carries
`(authority, seq, digest)` as content — it is not empty, its creation cannot precede knowledge of
the digest, and "one empty file per id" understates its cost. These stores answer a
post-deletion query differently in an observable field.

**Blocking.** I cannot create the marker without knowing whether it has content.

### Q3. What does the store report for an id whose marker exists but for which no digest was ever recorded and no bytes were ever written?

> - **Crash between ledger and payload.** Ledger committed, bytes never written: the
>   id is bound and the content unreachable. That state is `KNOWN_MISSING` — the
>   digest and the binding are known — not `UNKNOWN` and not an error.

This is stated for the case where the digest *is* known. If allocation is a claim made before
the content exists — "To allocate, the authority walks ids and claims the first marker that does
not yet exist" — then a crash immediately after the claim leaves a bound id whose digest was
never known. I searched SPEC.md for a fourth visibility value and for any word for
bound-without-digest ("UNKNOWN", "KNOWN_MISSING", "PRESENT", "abandon", "reserved", "pending")
and found only the three values and one incidental use of "abandoned" about the envelope
discussion; the state is not named.

**Two implementations.** (a) Report `KNOWN_MISSING` with a null digest, and a client asking
"what were the bytes?" receives a binding with no way to check any candidate answer. (b) Report
`UNKNOWN`, which MUST 6 forbids for the digest-known case and which here means a client is told
there is no binding while the marker that forbids reallocation exists on disk. The two differ in
what a reader concludes about whether the id may ever be used.

**Blocking.** The three-value enum is the store's public answer and I must return one of them
for a state the enum was not defined over.

### Q4. Does "monotonically" in MUST 1 permit the specified allocator, which fills the lowest free gap rather than extending the tail?

> 1. Each authority binds `(authority_id, seq)` uniquely, monotonically, and never
>    reuses a seq.

> To allocate, the authority walks ids and claims the first marker that does not yet exist

A first-free walk is monotone only over a marker set with no holes. The spec supplies a
concrete hole-producing mechanism — "deposit.ts records ids being abandoned once taken" — and
separately measures the legacy store as "**Not dense.** Ids run 32–298, 258 records, 9 missing."

**Two implementations.** (a) First-free: after any abandoned claim or any store whose marker set
has holes, allocation returns to the hole and issues seq 37 after seq 298 has been issued;
sequence numbers do not increase with time and `authority_id` + `seq` reading order does not
match deposit order. (b) Tail-extending (`highest marker + 1`, claimed with `wx` and retried):
seq strictly increases, holes are permanent, and the marker walk described in the spec is not the
algorithm. The id handed to the next deposit differs between the two on any store with a hole.

**Blocking.** This is the allocator; there is no version of it that defers the choice.

### Q5. What prevents a *write* of new content to an id whose record was deleted, given that the marker guards allocation and the record's own `wx` guard was removed with the record?

> The binding write keeps its own `wx`; the marker guards allocation, the record `wx` guards content.

> **The marker persists beyond deletion of the record**, so a deleted id is not freed and cannot be rebound — this is the fix for `relay-0183`'s class of failure, which the record's own `wx` (on its bytes) did not prevent, because deleting the record removed that guard.

The marker prevents the deleted id from being *allocated* again. It does not by itself prevent a
writer that already names `relay-0183` from creating that file, because the `wx` on the record
path succeeds once the record is deleted — which is precisely the failure described. The spec
does not say the content write consults the marker or the recorded digest. I searched for
"before writing", "guard", "check the marker", "digest matches" and found no clause imposing a
pre-write check on the content path.

**Two implementations.** (a) Content writes are gated on the ledger: a write to a seq whose
recorded digest differs from the incoming digest is refused, so `relay-0183` is unrebindable by
any path. (b) Only allocation consults markers: a deposit that is handed an id by the allocator
writes with `wx`, and any writer naming a deleted id directly still rebinds it — the incident
reproduces through a path the fix does not cover. These differ on the exact scenario the document
exists for.

**Blocking.** MUST 4's "never changes its digest" is either enforced here or nowhere.

### Q6. What durability is required for the marker and the record before an authority may report the binding as made — which class of crash is G2a about?

> | **G2a** | the binding survives a crash | the storage layer |  ← **all v1 promises**

I searched SPEC.md for `fsync`, `fdatasync`, `flush`, `sync`, `power`, `tmp`, and for `rename`
(one hit, "Renamed rather than argued away", unrelated). There is no text on flushing, on
directory-entry durability, or on which crash class is in scope. The only atomicity requirement
given is exclusivity: "**Allocation MUST be settled by an atomic exclusive commit, never by
reading the current maximum**", and `O_EXCL` is a mutual-exclusion property, not a durability one.

**Two implementations.** (a) The authority fsyncs the marker (and the containing directory) and
the record before acknowledging: allocation costs a disk barrier per id, throughput drops by
orders of magnitude, and the binding survives power loss. (b) The authority relies on the page
cache: allocation is fast, the binding survives a process crash, and a power loss can lose the
marker — after which the id is free again and rebindable, which is the G1 violation the marker
exists to prevent. Under (b) v1's title claim is true only for the process-crash class.

**Blocking.** It is the difference between the guarantee holding and not, and it must be decided
at every write site.

### Q7. Is the marker path parameterised by authority, and can one store hold more than one authority's sequence space?

> each id owns a persistent allocation marker — an empty file `history/relay-NNNN` created with `wx`/`O_EXCL`

The literal path contains `relay`, which the document elsewhere identifies as the legacy
authority and as "a **namespace label and not an identity**", while every guarantee is "indexed by
`(authority_id, seq)`". The locator is defined as "the record's store-scoped id, `relay-NNNN`
within one authority." I searched for a directory convention for a second authority ("history/",
"per-authority", "namespace directory", "path") and found no statement of how a second
`authority_id` lays out on disk.

**Two implementations.** (a) One authority per store, `history/relay-NNNN` literal: admitting a
second authority requires a second store, and the deferred cross-authority issue is also a
cross-store issue. (b) Markers under `history/<authority_id>-NNNN` or
`history/<authority_id>/NNNN`: two authorities share a store, seq spaces are independent, and a
bare `relay-0183` resolves to two different records in one directory tree unless the store
identity is carried. The set of ids a `wx` claim can collide on differs between them.

**Blocking.** It is the on-disk layout; nothing can be written before it is chosen.

### Q8. When an envelope `id:` is present and does not match the store-assigned id, what does the store do?

> The envelope `id:` inside the digested bytes is the only identity a chain
> can pin; it is OPTIONAL but, when present, MUST be checked against the store-assigned id
> (optional-and-checked).

The clause requires a check and does not state the consequence of the check failing. The
neighbouring sentence — "a header-like line quoted in a record body is not a field and must not
be adopted or rejected as one" — governs which lines are checked, not what happens on mismatch.
I searched for "mismatch", "reject the deposit", "error", "fail" and found "not an error" only in
MUST 6's crash case.

**Two implementations.** (a) Mismatch refuses the deposit: the claimed id is abandoned (leaving a
marker with no record, feeding Q3 and Q4), and an author who mis-types an id cannot deposit at
all. (b) Mismatch is recorded and the deposit proceeds under the store-assigned id: records exist
whose digested bytes assert an id that is not theirs, and any later reader that pins the chain by
envelope `id:` follows a false pointer. A single mistyped deposit ends in a different observable
state.

**Blocking.** The deposit path has to branch somewhere and I would be inventing the branch.

---

## Tier 2 — guessable now, wrong later

### Q9. How and where does an authority declare its G1 floor, and what does the store do with a query about a seq below it?

> 2. **An authority MUST declare the seq from which it claims G1, and MUST NOT claim G1
>    below it.**

The declaration is required; its location, its format, and its effect on responses are not given.
I searched for "declaration", "config", "manifest field", "floor" — the one "config" hit is
"the configured authority/store identifier" in the citation section, about store identity.

**Two implementations.** (a) The floor is a machine-readable field the store carries and stamps
into every answer, so a reader querying seq below the floor gets a response explicitly marked as
outside the claim. (b) The floor is prose in the authority's README, so every response looks
identical whether or not the seq is covered, and MUST 2's "MUST NOT claim G1 below it" is
enforced by nobody. A reader can distinguish these by asking about a below-floor seq.

**Blocking:** not for the write path; blocking for anything that answers a reader.

### Q10. For a conforming authority, what makes an absent id `KNOWN_MISSING` rather than `UNKNOWN` — the existence of its marker, or an inbound header reference?

> The absences are not one state: measured with the store's own
> predicate, `relay-0045` is `KNOWN_MISSING` and `relay-0037`–`relay-0044` are `UNKNOWN`,
> so one contiguous gap holds two states. What separates them is whether a surviving
> record names the id in a `parent:` or `ref:` **header** — a prose mention in a record's
> body establishes nothing, which is the `PROSE_ONLY` distinction `reference.ts` keeps.

This is stated of the legacy store, which "has no marker". MUST 6 gives the other rule for a
store that does have markers — deletion and the ledger — without saying whether the
reference-based rule is superseded or retained.

**Two implementations.** (a) Marker existence decides: an id allocated and never referenced by
anyone reads `KNOWN_MISSING`, and an id never allocated reads `UNKNOWN`. (b) Inbound header
reference decides: an allocated-but-unreferenced id reads `UNKNOWN` even though the store holds
its marker, and an id with no marker reads `KNOWN_MISSING` if some record's `parent:` names it.
These disagree on the same id in the same store.

**Blocking:** no, but a wrong guess is invisible until the two rules diverge on a real id.

### Q11. May an id that is bound with a recorded digest but holds no bytes later receive bytes matching that digest?

> 4. A **conforming** authority's ledger is non-rewindable: a bound `(authority, seq)`
>    never changes its digest.

The clause constrains the digest, not the payload. MUST 6 establishes that
bound-with-no-payload is a reachable, legitimate state after a crash. The spec does not say
whether that state is terminal. I searched for "repair", "retry", "idempotent", "re-deposit",
"recover" — "recovers" appears once, about `held` reverting, and "repairs" once, in the
preamble's provenance.

**Two implementations.** (a) A write whose digest equals the recorded digest is permitted and
completes the record: a crashed deposit can be re-run and the id becomes `PRESENT`, and the
ledger digest is unchanged so MUST 4 is untouched. (b) Bound is final for the payload: every
crash between ledger and record permanently burns an id into `KNOWN_MISSING` with no route back,
and a retrying client must accept a new id for the same content. A client that crashes and
retries observes different ids and different final states.

**Blocking:** no, but it decides whether crash recovery exists at all.

### Q12. What exactly delimits the header block, and what syntax makes a line a field?

> The check is scoped to the header block - the bytes above the first blank line - and a header-like line quoted in a record body is not a field and must not be adopted or rejected as one.

"Blank line" and "header-like" are not defined. I searched for "whitespace", "encoding", "utf",
"newline", "CRLF" and found no text on any of them.

**Two implementations.** (a) Blank means byte-exactly `\n\n`, and a field is
`^[A-Za-z][A-Za-z0-9-]*: `: a record whose header block is separated by a line containing a
single space has no header block, so its `id:` is never checked and Q8 never fires for it.
(b) Blank means a line matching `^\s*$`, and a field is any line containing a colon: a first body
line reading `note: see relay-0060` inside a header-adjacent block is adopted as a field. The
same record bytes are validated differently.

**Blocking:** no, but it is the boundary the quotation-safety property in `relay-0060` /
`store.ts:87` rests on.

### Q13. What must a deposit do with a `parent:` that names something outside this authority — refuse it, or accept it and label it an observation, and who applies the label?

> 5. `parent`, when present, is scoped to the same authority. Cross-authority references
>    are **observations** and MUST be labelled as such — `parent` implies membership in
>    the same chain.

against:

> - MUST NOT make deposit depend on the parent being present and readable. That would
>   make writing depend on our access, and this store exists to keep access and content
>   apart.

Whether a `parent:` is same-authority is answerable without reading it only if the value carries
an authority, which it does not while a locator is a bare `relay-NNNN` in one store (Q7, Q14).

**Two implementations.** (a) The store refuses a `parent:` it can determine is foreign and
accepts every bare locator unread: a bare locator that in fact refers to another authority is
silently admitted as a chain parent. (b) The store rewrites or annotates foreign references into
a labelled observation field: the digested bytes differ from what the author submitted, so the
author's own digest of their payload does not match the stored record's. A cross-authority parent
ends up in the chain in one and out of it in the other.

**Blocking:** no, while exactly one authority exists — which is also why a wrong guess here is
undetectable until the deferred issue lands.

### Q14. How is a cross-store citation serialised, and is *store identity* the same thing as `authority_id`?

> **Cross-store citation is normative (chatgpt relay-0354):** within one identified store the
> pair `(locator, digest)` is sufficient; crossing an authority or store boundary the citation
> MUST be `(store identity, locator, content digest)`, where *store identity* is the configured
> authority/store identifier (not a filesystem path).

"authority/store identifier" names them with one slash and the document elsewhere keeps them
apart — guarantees are indexed by `authority_id`, while "**The legacy authority is the shared
filesystem**, not any participant." No serialisation is given; I searched for a citation grammar,
a separator, and a prefix convention and found none.

**Two implementations.** (a) Store identity is `authority_id` and a citation is a triple
`(authority_id, seq, digest)`: one store per authority, and Q7(b) is unavailable. (b) Store
identity is an identifier of the store, which may hold several authorities: a resolvable citation
needs four elements, or a locator that already encodes its authority. A citation emitted by one
implementation does not resolve in the other.

**Blocking:** no, until the first citation crosses a boundary — after which every citation
already emitted is in the wrong shape.

### Q15. Does MUST 1 require a conforming authority's sequence to be dense?

> - **Not dense.** Ids run 32–298, 258 records, 9 missing. 37–45 are absent contiguously
>   and 1–31 entirely.

is given as the first of the ways in which "Measured, the existing store does not satisfy MUST 1",
but MUST 1 itself requires only "uniquely, monotonically, and never reuses a seq" and the
envelope discussion treats holes as normal: "deposit.ts records ids being abandoned once taken."

**Two implementations.** (a) Density is required: an abandoned claim must be repaired or the
authority is non-conforming, so the store needs a reclamation path — which is a seq being reused,
against MUST 1. (b) Density is not required: markers with no records accumulate permanently and a
conforming store looks, on the density measure, exactly like the legacy store the document
declares non-conforming for that reason. A conformance check over a store with one abandoned
claim returns opposite verdicts.

**Blocking:** no, but it determines whether a conformance checker can ever pass a real store.

### Q16. What are the authority-aware semantics that replace `successors = ids.length - 1 - i` and `check-continuity`'s six chain-defined states?

> - `src/relay/reference.ts:94` — `successors = ids.length - 1 - i`, and `:105`, where
>   `successors === 0` decides `NO_SUCCESSORS`. Merging an unrelated authority's stream
>   flips a record from excused to a finding **with the subject unchanged.**
> - `nextFree()` — `max(present) + 1`.
> - `check-continuity`'s six states, defined over a chain rather than a DAG.

> **These must be made authority-aware while exactly one authority exists.**

The requirement is stated; the replacement semantics are not. The verification standard offered —
"every verdict on the existing corpus must come back byte-identical" — is satisfied by any
rewrite that is correct on a single authority, so it does not discriminate between candidate
semantics.

**Two implementations.** (a) Partition by `authority_id` and run the existing chain logic per
partition: a record whose only successor is in another authority reads `NO_SUCCESSORS`.
(b) Genuine DAG semantics with cross-authority edges present but marked as observations: the same
record has a successor and is excused. Both pass the null-result test today and diverge the day a
second authority appears — which is also the day the window the spec describes has closed.

**Blocking:** no. It is the clearest case of a guess that cannot be discovered in time.

---

## Tier 3 — bounded surfaces

### Q17. Is a witness attestation deposited as an ordinary record consuming a seq in the same authority, and where is its (a)/(b)/(c) type recorded?

> - **`witnessed` — monotone.** The attestation is itself a record. It can be lost; it
>   never becomes false.

> A witness attests one of three different things and the model must name which:

"the model must name which" requires a field; no field name, no vocabulary, and no location are
given.

**Two implementations.** (a) Attestations are ordinary records: they occupy seqs, appear in
continuity checks, and a store's id range includes its own witnessing traffic. (b) Attestations
live in a side store keyed by `(authority, seq)`: the id space stays records-only and the
attestation is not itself protected by the marker mechanism it attests to. The id of the next
deposited record differs after any witnessing activity.

**Blocking:** no. Witnessing is MAY.

### Q18. What does "reported as absence" require in the output, as distinct from "no evidence found"?

> 7. The absence of a witness is reported **as absence**, never as "no evidence found".

MUST 6 supplies an explicit three-token vocabulary for visibility; MUST 7 states a distinction and
supplies none.

**Two implementations.** (a) An empty witness list, which a consumer may render either way.
(b) A distinct token carried in the response asserting that this authority holds no attestation
for this record. A consumer that formats responses mechanically produces the forbidden wording in
the first and cannot in the second.

**Blocking:** no.

### Q19. How does an implementation determine whether an authority is conforming?

> 4. A **conforming** authority's ledger is non-rewindable

> | equivocation | G1 | prevented in a conforming authority, detected in a non-conforming one, never prevented in the latter |

Conformance switches the guarantee between prevented and detected, and the document supplies no
test, flag, or declaration for it. I searched for "conforming" (four hits, all uses, no
definition) and for "declares conformance".

**Two implementations.** (a) Self-declared alongside the MUST 2 floor: an authority asserting
conformance is treated as equivocation-proof, and the assertion is exactly as checkable as the G1
claim the document calls self-asserted. (b) Derived from observable structure, e.g. the presence
of a complete marker set: an authority is conforming only from the seq where markers begin, and
the store computes the answer. A reader asking "is this authority conforming?" gets its answer
from different evidence.

**Blocking:** no, but the detected-equivocation path is unimplementable without it — the document
states elsewhere that "**equivocation evidence is not constructible here today**".

### Q20. When does a wait for a record end, and what does a bounded wait return?

> 6. Visibility state is exposed honestly: `PRESENT` / `KNOWN_MISSING` / `UNKNOWN`. A
>    quiet window MUST NOT be reported as a failure, and a failure MUST NOT be reported
>    as absence.

"Quiet window" is used without a duration, a bound, or a statement of what the reader is told
while it lasts. I searched for "timeout", "deadline", "poll", "wait" and found none in SPEC.md.

**Two implementations.** (a) Unbounded wait: a caller blocks indefinitely on a record that never
arrives, and no incorrect state is ever reported. (b) Bounded wait returning `UNKNOWN` on
expiry: the caller gets an answer, and a slow-but-successful deposit is reported as `UNKNOWN` to
a reader who asked a second too early — which is a quiet window rendered as a state.

**Blocking:** no.

### Q21. Is the locator's four-digit form normative, and what is the locator at seq ≥ 10000?

> - **locator** — the record's store-scoped id, `relay-NNNN` within one authority.

Every use in the document is four digits (`relay-0183`, `history/relay-NNNN`). I searched for
"padding", "digits", "width", "10000", "format" and found no statement of the numbering's range or
of whether the padding is part of the identity.

**Two implementations.** (a) Fixed four-digit zero-padded: seq is capped at 9999 for the life of
an authority, and the marker walk enumerates a finite space. (b) Minimum-four padding that grows:
`relay-10000` exists, and lexical ordering of marker filenames stops matching numeric seq order,
which changes the result of any allocator or reader that sorts filenames. The two differ on the
10000th deposit and on sort order well before that.

**Blocking:** no.

---

## Discarded, and they were close

- Whether the marker walk must bound its retries or may spin — two allocators that both
  eventually succeed produce the same observable binding, so it fails §3 on behaviour.
- Whether MAY-level deduplication shares bytes on disk or copies them — the guarantee surface is
  identical either way, and the spec correctly leaves it to the storage layer.
- Whether the MAY reading order `authority_id` then `seq` sorts seq numerically or lexically — a
  genuine divergence, but the spec marks it "A **convention**, never a guarantee", so no clause
  rests on the answer. It is only a question if Q21 is answered the growing way.
- Whether `deposited-by:` values are drawn from a fixed set — the document refuses to attest
  identity at all, so both readings deliver the same (absent) guarantee.
- Whether the kernel's `p-e/core 0.1` version string and K4's manifest serialisation must be
  emitted by an implementation — the kernel section states that "An implementer can build from the
  MUST/MAY/MUST NOT sections alone and lose nothing", which answers it; it returns only for an
  implementation that also emits portable verdicts, which v1 does not require.
