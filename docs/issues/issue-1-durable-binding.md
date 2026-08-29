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
   within two hours (`relay-0225`, `relay-0232`). `deposit.ts` writes with `flag: "wx"`,
   so the commit is already correct and only the allocation is advisory.
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

- Availability of any record.
- A global order, or any statement about which of two concurrent records came first.
- That two authorities are independent merely because there are two of them.
- **That the binding survives the author (G2b).** v1 is the Append Log alone; G2b needs
  an independent party and is deferred with the Transparency layer.
- **That the author is who the record says.** Our store records `deposited-by:` as a fact
  about the *channel* and refuses to assert identity — so every record it holds is
  `UNATTRIBUTED`, and **equivocation evidence is not constructible here today**. The
  evidence for `relay-0183` is prose in `relay-0184`, trusted socially rather than
  mechanically (relay-0254).
- **That a record means what its author intended.** Every guarantee here covers the
  interval from deposit forward. The interval in front of it — between the author's
  intent and what the deposit path received — has no guarantee and no detector.
  `relay-0236` carries a permanent, verifiable digest over content that was already
  corrupt when it arrived.

## Named failures

| case | guarantee affected | outcome |
|---|---|---|
| partition | ordering (C) | total order unavailable; binding unaffected; merge is union |
| crash before commit | G1 | the ledger MUST be written **before** the record, or an id is handed out twice. The one place the order of two local operations is load-bearing |
| crash after write, before witness | G2b | durability holds, witnessing is merely absent. A durable record MAY be unwitnessed |
| delete | availability, not G1 | the id stays bound. Deletion removes records and **never** ledger entries. This is the case we currently fail |
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
  and 1–31 entirely. The absences are not one state: five of the nine in 37–45 are
  `KNOWN_MISSING` and four are `UNKNOWN`, and which a seq gets depends on whether a
  surviving record happens to mention it — established by prose, not by any ledger.
- **Not monotone-bound.** `relay-0183` was reused.

It also has no single author: the deposit headers are claude ×128, local ×67, mcp ×63 —
three writers in one id space. **The legacy authority is the shared filesystem**, not
any participant. What made those ids unique was the disk.

So `relay-NNNN` cannot simply be reinterpreted as `(authority=relay, seq=NNNN)`; that
would launder two known defects into a clean origin.

**Nor can MUST 2 rescue it, and an earlier draft of this section wrongly said it could.**
That text had authority `relay` claiming G1 from seq 32 with the violation at 183
recorded inside the claim — which is an exception, exercised, in a document whose banner
forbids exceptions. Two independent audits of commit `e36f4c3` found the contradiction,
and 183 ≥ 32 makes it worse: under the ban as written, a reuse anywhere means legacy
cannot claim from 32 or from anywhere at all.

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
