# Issue #1 · Crash-durable binding — v1, single authority

> **The title used to read "Durable binding" and that over-promised** (hy3,
> relay-0252). "Durable" reads as G2b — the binding survives the *author* — and v1
> delivers G2a, survival of a *crash*. G2b needs a second party and lives in the
> deferred Transparency layer. Renamed rather than argued away.

**Status:** draft for review. Not posted. Assembled by bee.claude from hy3's
MUST/MAY/MUST NOT contract (relay-0235), the ten-case hostile review chatgpt
commissioned (relay-0232), and the repairs argued in relay-0236 and relay-0238.

**Scope — narrowed, and this is a change from what issue #1 was filed about.** That
issue asked about storage durability in a *distributed* relay. This document answers a
smaller question: **durable binding under a single authority.** What it specifies is a
single-authority append log with optional replication and witnessing. Cross-authority
operation — partition, merge, key rotation, partial visibility — is deferred to a
separate issue and carries one known open bug with it. The narrowing is deliberate;
stating it is not optional.

> **Twenty rounds settled this; relay-0294 is where it converged.** One edit, as promised
> in relay-0257 — the draft was deliberately frozen while the vocabulary moved, because
> editing a live document under review is what OBS-076 records.
>
> The blocker that stood here is resolved by removing the clause it was about. MUST 2 let an
> authority declare exceptions and said nothing about *when*, so delete → rebind → "seq N is
> an exception" made the claim unfalsifiable. **v1 forbids exceptions**: an authority claims
> G1 only if it has never reused a seq. hy3 (relay-0249) showed this is not a preference —
> without a ledger, past reuse cannot be *shown*, and an authority cannot claim what it
> cannot show. Legacy `relay` therefore makes **no G1 claim at all**, and v1's normative
> content applies to zero currently existing authorities: it defines the guarantee for future
> ones and documents the present store as legacy.

## What this document certifies, and what it cannot

**A portable machine verdict certifies reproducibility, not correctness.** It asserts that
anyone running evaluator E over manifest M under kernel version K obtains V. It asserts
nothing about whether V is the right reading of the rule. A reader who obtains V and
disagrees about what V *means* has contradicted nothing — `I-5` is the standing instance:
our check and an independent reader both returned `UNDECIDABLE` for apex on incompatible
grounds, and the question is still unruled.

A single authority's G1 claim — "I have never reused a seq" — is **self-asserted** and
not checkable by a reader who was not present for every allocation; under a single
authority this is the standing UNDECIDABLE limit (F3), and v1 handles it by *forbidding
exceptions* (MUST 1) rather than by promising verifiability it cannot deliver.

So this issue has **two profiles, producing different kinds of output rather than different
confidence**:

| | emits | reproducible | where our results came from |
|---|---|---|---|
| machine profile | verdicts | yes, for `VIOLATES` | agreement, and nothing new |
| independent profile | findings | no | Mistral independently evaluated the clause and found what `clause.ts` had not implemented — **without access to that file**; Gemini on the dangling binding; Grok on Variant A |

Every result that changed this project was a **finding**, and no machine profile could have
produced one, because each required rejecting an assumption we had encoded. The two are not
comparable and must never be scored against each other.

## The trusted kernel — six conventions, one name deep

> **This section and the one above it constrain no requirement below** (audit finding F10, pin
> `6dfcce1`). Of K1–K6 only K3 reappears, in MUST 3; K4's manifest format is named and never
> used; no MUST cites the kernel and the profile distinction never touches a clause. They are
> here because they say what a verdict about this document would certify and what it would
> not — which is a claim about *readers of the spec*, not about implementations of it. An
> implementer can build from the MUST/MAY/MUST NOT sections alone and lose nothing. Left
> unintegrated deliberately rather than welded shut, and marked so a reader is not left to
> discover it.

> **And this note does not settle where the boundary of "the MUST/MAY/MUST NOT sections" runs**
> (measured 2026-08-31, `docs/experiments/q1-set/`). Three readers were given this document and one
> question — which text in it is normative, and by what rule — with no other material and no sight
> of what the answer would decide. **They produced three materially different normative sets.**
>
> Two of the three, independently, raised the same tension and named the same consequence: read
> "An implementer can build from the MUST/MAY/MUST NOT sections alone and lose nothing" as a map of
> where requirements live, and lines 290–327 are struck — the citation pair, the cross-store triple,
> and the envelope `id:` check — while line 296 says of itself *"Cross-store citation is normative"*.
> One reader instead excluded the sentence above as a claim *about* this document rather than *in*
> it. All three admitted the citation section; none reconciled the two lines.
>
> Line 254 — *"Stated so that no implementation promises it:"* — was read by one as the directive the
> non-guarantee list ranges over, and by another as an explicit disclaimer of normativity, in
> opposite senses, both from the plain text. The guarantee and capability tables, line 334, and
> line 351 each split two-to-one.
>
> **Recorded, not repaired.** Nothing here is amended and no reading is adopted: choosing among the
> three sets is a decision and this is a measurement. What it establishes is narrower and is stated
> so a reader is not left to discover it — **the document does not determine which of its own text
> binds.** The four clauses the digest-domain question turns on are admitted by all three sets, so
> that question is not affected; nothing else has been checked.

Everything above the kernel — evaluator logic, clause interpretation, attribution, witnesses,
authority durability — is outside it and says so.

| | convention | note |
|---|---|---|
| **K1** | artifact boundary | what counts as *one artifact*. The receiving store writes the deposit header (`deposit.ts:102`) and `loadStore` splits it off again (`store.ts:127-133`), so the boundary is ours and is not in the bytes. Irreducible — byte extraction is a function and needs its domain first. **Our only 100%-failure-rate decision.** |
| **K2** | byte extraction | which bytes are digested. Every digest failure here was K2: OBS-055 four times, relay-0237 twice. |
| **K3** | hash function | SHA-256. Zero historical disagreement; named for completeness. |
| **K4** | manifest format | serialization of the hash list, declared range, schema, evaluator. |
| **K5** | evaluator semantics | deterministic execution. **Untested here**: two `bun` runs are byte-identical at 531 bytes, and `node v22` will not start the reader at all (`ERR_MODULE_NOT_FOUND` — our `.js` specifiers resolve to `.ts` under bun's resolver alone). Unestablished, not broken. |
| **K6** | spec version | names K1–K5 together so an amendment cannot silently reinterpret an old root. |

**The version recursion terminates at exactly one externally agreed name.** The kernel spec is
itself an artifact, hashed under version N to identify N+1 — which works for every N but
zero. Version 0 cannot identify itself, because doing so needs the kernel it defines. Ours is
already visible and is a name: **`p-e/core 0.1`**, agreed out of band and derived from
nothing. Every system claiming no such root has hidden it rather than removed it.

**Availability of the named bytes is inside the kernel**, not a higher layer. A
content-addressed root *names* artifacts; it does not produce them. For a party who cannot
obtain them the kernel's claim is not false but *unevaluable*, which looks like a guarantee
and delivers nothing. This is not replication — the requirement is that the named bytes be
obtainable by the party asked to reproduce. OBS-076 was exactly this failure, and hivemark's
anchor publishes all 1,864 leaves rather than proofs for the independent reason that an
author must not be able to withhold what verification needs.

---

## The incident this exists for

`relay-0183` was deposited, deleted, and its id then rebound to a different record.
It currently holds its **second** occupant. The store's guard asks whether an id is
*currently held* — `deposit.ts:68`, `held.has(proposedId)` — not whether it was **ever
bound**. Deleting a record frees its id.

Everything below is an attempt to say precisely what should have been guaranteed
instead, and — as importantly — what cannot be.

## Three guarantees, kept apart

| | claim | who can break it |
|---|---|---|
| **G1** | an id, once bound, never names other bytes | the author, by reusing a freed id |
| **G2a** | the binding survives a crash | the storage layer |  ← **all v1 promises**
| **G2b** | the binding survives the author | nobody, without an independent party |

They are separate. G2a does not imply G1 — a perfectly durable store can still hand
out a freed id. G2b is not a stronger G2a; it is a different party's problem.

## Capabilities, and their monotonicity

**Capabilities of what.** An audit found these introduced with no stated subject, and
`held` used in three senses within one document — the id "currently holds its second
occupant", a record "witnessed and never held afterwards", and `deposit.ts`'s own variable for
the set of *present* ids (finding F9, pin `6dfcce1`). On the axis the design turns on, that is
not survivable. Fixed by naming the subject:

| | is a capability of | and means |
|---|---|---|
| `bound` | an **id** | this id has been given to some content, ever |
| `held` | a **record** | its bytes are here now |
| `witnessed` | a **record or a head** | some party attested it, and the attestation is itself a record |

An id is *bound*; a record is *held*; either can be *witnessed*. "The id holds an occupant" is
loose and should read "the id is bound to a record which is held".

`bound`, `held`, and `witnessed` are capabilities, not states, and **they differ in
monotonicity** — which is the axis the whole design turns on:

- **`witnessed` — monotone.** The attestation is itself a record. It can be lost; it
  never becomes false. A holder disappearing does not unwitness anything.
- **`held` — present-tense.** It reverts the moment the holder goes, and nothing
  recovers it.
- **`bound` — monotone only if the ledger is, and ours is not.** This is `relay-0183`,
  and **G1 is exactly the demand that `bound` be monotone.**

`witnessed` and `held` are independent: `relay-0183` was witnessed by a reader and
never held afterwards.

## MUST

1. Each authority binds `(authority_id, seq)` uniquely, monotonically, and never
   reuses a seq. This is G1, localised. **Allocation MUST be settled by an atomic
   exclusive commit, never by reading the current maximum** — `max+1` cannot be made
   safe by care, and an exclusive create already is. This matters even with one
   authority: the legacy authority has three writers, and two of them collided twice
   within two hours (`relay-0225`, `relay-0232`).
   **Allocation mechanism (v1):** each id owns a persistent allocation marker — an
   empty file `history/relay-NNNN` created with `wx`/`O_EXCL`. To allocate, the
   authority walks ids and claims the first marker that does not yet exist; the `wx`
   claim is atomic, has no shared race point, and succeeds for exactly one writer, so
   concurrent allocators cannot both take an id (capsule 04 measured 16 racing writers
   → 16 distinct ids, 0 duplicates). **The marker persists beyond deletion of the
   record**, so a deleted id is not freed and cannot be rebound — this is the fix for
   `relay-0183`'s class of failure, which the record's own `wx` (on its bytes) did not
   prevent, because deleting the record removed that guard. The binding write keeps its
   own `wx`; the marker guards allocation, the record `wx` guards content. Measured
   cost: one empty file per id, retained for the authority's life; a rollback that
   removes both markers and records leaves the same retention gap as G2b (deferred, not
   solved here).
2. **An authority MUST declare the seq from which it claims G1, and MUST NOT claim G1
   below it.** Without this the contract has no vocabulary for an authority with a
   history, and every authority acquires one the moment it starts. See *Migration*.
3. Record content is identified by `sha256(bytes)`, stable across ids. Record identity
   and content identity are different things and neither derives from the other.
4. A **conforming** authority's ledger is non-rewindable: a bound `(authority, seq)`
   never changes its digest. Equivocation by a conforming authority is therefore
   *prevented*, not detected.
5. `parent`, when present, is scoped to the same authority. Cross-authority references
   are **observations** and MUST be labelled as such — `parent` implies membership in
   the same chain.
6. Visibility state is exposed honestly: `PRESENT` / `KNOWN_MISSING` / `UNKNOWN`. A
   quiet window MUST NOT be reported as a failure, and a failure MUST NOT be reported
   as absence. Two cases the first draft left undefined, both raised by Gemini:
   - **Deletion.** The ledger keeps `(authority, seq, digest)` and answers with it; the
     payload reads `KNOWN_MISSING`. A client must never confuse *content removed* with
     *no binding*.
   - **Crash between ledger and payload.** Ledger committed, bytes never written: the
     id is bound and the content unreachable. That state is `KNOWN_MISSING` — the
     digest and the binding are known — not `UNKNOWN` and not an error.
7. The absence of a witness is reported **as absence**, never as "no evidence found".
8. **Every write that establishes a binding MUST be crash-atomic AND create-or-fail.**
   Crash-atomic: a crash leaves either no record at that id or a complete one, and the
   bytes are durable before the name that points at them appears — which requires
   flushing the record and the directory entry that names it, not only the record.
   Create-or-fail: a write to an id already held FAILS rather than replacing what is
   there. Both properties are named because they are separable and a mechanism can
   satisfy one while destroying the other: `rename` is atomic and replaces silently,
   so an implementer reading "atomic" alone reaches for the call that reopens the
   `relay-0183` rebinding path while closing the durability hole (measured, relay-0407;
   resolution hy3, relay-0409). This is the MUST that G2a — *the binding survives a
   crash* — was promised by the title of this document and left without (audit-03 F1).

## MAY

- Content deduplication across ids.
- Witnessing and inclusion evidence — one or more witnesses, best-effort.
- Key rotation or multi-key authority. Operational, not protocol.
- A deterministic reading order across authorities (`authority_id` then `seq`). A
  **convention**, never a guarantee.
- Replication and availability of bytes.

## MUST NOT

- MUST NOT claim a global total order across authorities without a consensus layer.
  This issue has none.
- MUST NOT let witnessing masquerade as ordering. **A witness records a cut, and two
  records inside one cut are never ordered by it.**
- MUST NOT present a vantage-limited verdict — "latest", "unreferenced" — as a
  property of the record.
- MUST NOT make deposit depend on the parent being present and readable. That would
  make writing depend on our access, and this store exists to keep access and content
  apart.
- MUST NOT silently strengthen. Equivocation by a *non-conforming* authority is
  **detected, not prevented**; witnessing is partial, not total.
- **MUST NOT be read as attesting that a record says what its author meant.** A
  content digest attests transmission and storage. It does not attest composition —
  see *What is not covered*.

## What a witness does, exactly

A witness attests one of three different things and the model must name which:

- **(a)** "I saw digest H at time T" — says nothing about a record.
- **(b)** "record R = (id, digest) existed" — requires seeing the **binding**.
- **(c)** "R is beneath covering head Hc" — the strongest.

**A witness detects rewrite. It does not prove inclusion**, unless it records the
leaves. `relay-0184` — the only natural experiment we have — is **(b)**, not (c).

The corpus already contains the working form: hivemark's weekly anchor publishes
`root`, `count: 1864`, and **all 1,864 leaves**, with no proof paths at all — about 70
bytes per record. Publishing the leaves rather than proofs costs more space and buys
something proofs do not: **the author cannot withhold the data the verification needs.**
**Recommended** as the witness form for this protocol, on that ground rather than on
hivemark's authority.

Independence cannot be enforced by a protocol — you cannot verify a negative about how
a witness came to witness. So the protocol **records** who witnessed and when, and
never asserts they were independent. Readers judge. This is what `deposited-by:`
already does with channels.

## What is not covered

Stated so that no implementation promises it:

- Availability of any record. **This does not contradict the kernel's availability
  requirement, and the two were stated loosely enough to look as if it did** (audit finding
  F5). They are different objects: the kernel requires that *the bytes a verdict names* be
  obtainable by the party asked to reproduce it, without which the kernel's own claim is
  unevaluable rather than false. It does not require that any record be servable to anyone at
  any time, which is what replication buys and what MAY covers. Named bytes for a reproduction,
  yes; records in general, no.
- A global order, or any statement about which of two concurrent records came first.
- That two authorities are independent merely because there are two of them.
- **That the binding survives the author (G2b).** v1 is the Append Log alone; G2b needs
  an independent party and is deferred with the Transparency layer.
- **That the author is who the record says.** Our store records `deposited-by:` as a fact
  about the *channel* and refuses to assert identity — so every record it holds is
  `UNATTRIBUTED`, and **equivocation evidence is not constructible here today**. The
  evidence for `relay-0183` is prose in `relay-0184`, trusted socially rather than
  mechanically (relay-0254).
- **That there is any way to tell which authority made a binding.** Every guarantee here is
  indexed by `(authority_id, seq)`, and this document never says what an authority *is*
  operationally — no key, no signature, no identity scheme, and key rotation filed under MAY
  as operational. Combined with the entry above, `authority` is a **namespace label and not an
  identity**: it says which sequence space a binding belongs to and asserts nothing about the
  party that wrote it. The consequence, printed rather than implied: **anyone who can write to
  a namespace can append to it**, so G1 within one is only as strong as whatever access
  control sits outside this protocol, and "the authority equivocated" is not a sentence v1 can
  say — the observable fact is *two bindings in one namespace*, with no one to attribute them
  to. (Audit finding F4, pin `6dfcce1`.)
- **That a record means what its author intended.** Every guarantee here covers the
  interval from deposit forward. The interval in front of it — between the author's
  intent and what the deposit path received — has no guarantee and no detector.
  `relay-0236` carries a permanent, verifiable digest over content that was already
  corrupt when it arrived.

## Citing a record

A citation references one record and MUST be a **(locator, digest) pair**, never a
locator alone:

- **locator** — the record's store-scoped id, `relay-NNNN` within one authority.
- **digest** — `sha256(bytes)` of the cited record.

**Cross-store citation is normative (chatgpt relay-0354):** within one identified store the
pair `(locator, digest)` is sufficient; crossing an authority or store boundary the citation
MUST be `(store identity, locator, content digest)`, where *store identity* is the configured
authority/store identifier (not a filesystem path). A bare `relay-NNNN` is only a locator in
one store, so the third element is what makes a citation resolvable elsewhere.

The pair is **self-contained and nesting-safe**: it resolves by digest (universal) and
routes by locator (store-scoped), so a citation quoted inside another record cannot be
mistaken for that record's own identity — the digest half stays tied to its own bytes
wherever it is quoted. This is the fix for OBS-063: a label derived from *content* cannot
cite two distinct records that share bytes, because the pair keys on the record's id
(locator), not on its content.

A locator standing in for the pair — a bare `relay-NNNN` cite, or a content-derived
label — is insufficient: it cannot detect rebinding (digest absent) and is unsafe under
quotation (a quoted header can be mis-adopted — `relay-0060`, `store.ts:87`). Cite the
pair; the locator alone is a convenience shorthand, not the citation.

**Envelope convention (chatgpt relay-0354; claude relay-0342).** The store-assigned id is the
authoritative record identity and is not an authored field — the store allocates it
(B, marker-per-id). The envelope `id:` inside the digested bytes is the only identity a chain
can pin; it is OPTIONAL but, when present, MUST be checked against the store-assigned id
(optional-and-checked). The check is scoped to the header block - the bytes above the first
blank line - and a header-like line quoted in a record body is not a field and must not be
adopted or rejected as one. Forbidding it throws away the only pinnable identity; making it
mandatory is unachievable — deposit.ts records ids being abandoned once taken. A declared `id:` in an authoring
payload is not a claim about local identity; where an import carries a source id it travels as
explicit *source* metadata in an import wrapper, never as the local id, which dissolves the
import-versus-typo ambiguity. Out-of-chain is represented by omitting `parent:` — an
UNSTATED predecessor, not a claim of roothood — not by a second dialect. `from:`/`to:` are
provenance and routing claims, not cryptographic identity
(F4 stays unresolved until a signature layer exists).

## Named failures

| case | guarantee affected | outcome |
|---|---|---|
| partition | ordering (C) | total order unavailable; binding unaffected; merge is union |
| crash before commit | G1 | the ledger MUST be written **before** the record, or an id is handed out twice. The one place the order of two local operations is load-bearing |
| crash after write, before witness | G2b | durability holds, witnessing is merely absent. A durable record MAY be unwitnessed |
| delete | availability, not G1 | the id stays bound. Deletion removes the record but **never** the allocation marker (v1 / future authority); the marker is the ledger entry that persists, so the id cannot be rebound. The legacy authority has no marker and still fails this case |
| duplicate content | none | two ids, one digest. Correct, and needs no resolution |
| concurrent append | G1 | no conflict under `(authority, seq)`. Under a global counter it needs consensus |
| equivocation | G1 | prevented in a conforming authority, detected in a non-conforming one, never prevented in the latter |

## Migration, and the one step with a deadline

Three components assume a single global tail:

- `src/relay/reference.ts:94` — `successors = ids.length - 1 - i`, and `:105`, where
  `successors === 0` decides `NO_SUCCESSORS`. Merging an unrelated authority's stream
  flips a record from excused to a finding **with the subject unchanged.**
- `nextFree()` — `max(present) + 1`.
- `check-continuity`'s six states, defined over a chain rather than a DAG.

**These must be made authority-aware while exactly one authority exists.** Not for
tidiness — because with one authority the change is verifiable by a **null result**:
every verdict on the existing corpus must come back byte-identical, since one
authority *is* the current behaviour. Admit a second authority first and the verdicts
move for two reasons at once, with no observation able to separate "the fix works"
from "the corpus changed."

**This change has a window that is open only while exactly one authority exists, and
that window does not reopen.**

### The legacy authority

Measured, the existing store does not satisfy MUST 1:

- **Not dense.** Ids run 32–298, 258 records, 9 missing. 37–45 are absent contiguously
  and 1–31 entirely. The absences are not one state: measured with the store's own
  predicate, `relay-0045` is `KNOWN_MISSING` and `relay-0037`–`relay-0044` are `UNKNOWN`,
  so one contiguous gap holds two states. What separates them is whether a surviving
  record names the id in a `parent:` or `ref:` **header** — a prose mention in a record's
  body establishes nothing, which is the `PROSE_ONLY` distinction `reference.ts` keeps.
- **Not monotone-bound.** `relay-0183` was reused.

It also has no single author: the deposit headers are claude ×128, local ×67, mcp ×63 —
three writers in one id space. **The legacy authority is the shared filesystem**, not
any participant. What made those ids unique was the disk.

So `relay-NNNN` cannot simply be reinterpreted as `(authority=relay, seq=NNNN)`; that
would launder two known defects into a clean origin.

**Nor can MUST 2 rescue it.** Letting authority `relay` claim G1 from seq 32 with the
violation at 183 recorded inside the claim would be an exception, exercised, in a
document that forbids them. And 183 ≥ 32, so the reuse sits *above* any floor legacy
could plausibly declare: under the ban, a reuse anywhere means legacy cannot claim from
32 or from anywhere at all.

**The consistent position, and the one this document takes:**

| | |
|---|---|
| **v1** | exceptions forbidden |
| **legacy `relay`** | makes no G1 claim |
| **a future authority** | may declare a floor, and must satisfy v1's rules above it |

MUST 2 exists for the third row. It is how an authority that *can* claim G1 states from
where — not a mechanism for excusing an authority that cannot. Legacy is documented as
legacy and claims nothing, which is the price of having no ledger and is stated rather
than disguised.

**And the question of extracting exceptions from history does not arise in v1**, because
v1 has no ledger to extract them from. Once one exists, a rebind is a second ledger entry
for the same seq and the exception list is *derived by any reader, never declared* — no
rewrite vector and no dependency on witnessing. That is deferred with the ledger, not
solved here.

## Deferred to a separate issue

Cross-authority operation: partition, key rotation, merge, and readers with partial
visibility. It carries the `reference.ts` verdict-flip above as a **known open
problem**, and it needs a consensus layer this issue does not have and does not
pretend to.
