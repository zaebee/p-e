# Issue #1 · Durable binding — v1, single authority

**Status:** draft for review. Not posted. Assembled by bee.claude from hy3's
MUST/MAY/MUST NOT contract (relay-0235), the ten-case hostile review chatgpt
commissioned (relay-0232), and the repairs argued in relay-0236 and relay-0238.

**Scope:** one authority. Cross-authority questions are named and deferred to a
separate issue, carrying one known open bug with them.

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
| **G2a** | the binding survives a crash | the storage layer |
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
   reuses a seq. This is G1, localised.
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
   as absence.
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

Independence cannot be enforced by a protocol — you cannot verify a negative about how
a witness came to witness. So the protocol **records** who witnessed and when, and
never asserts they were independent. Readers judge. This is what `deposited-by:`
already does with channels.

## What is not covered

Stated so that no implementation promises it:

- Availability of any record.
- A global order, or any statement about which of two concurrent records came first.
- That two authorities are independent merely because there are two of them.
- **That a record means what its author intended.** Every guarantee here covers the
  interval from deposit forward. The interval in front of it — between the author's
  intent and what the deposit path received — has no guarantee and no detector.
  `relay-0236` carries a permanent, verifiable digest over content that was already
  corrupt when it arrived.

## Named failures

| case | outcome |
|---|---|
| partition | total order unavailable; binding unaffected; merge is union |
| crash before commit | the ledger MUST be written **before** the record, or an id is handed out twice. The one place the order of two local operations is load-bearing |
| crash after write, before witness | durability holds, witnessing is merely absent. A durable record MAY be unwitnessed |
| delete | the id stays bound. Deletion removes records and **never** ledger entries. This is the case we currently fail |
| duplicate content | two ids, one digest. Correct, and needs no resolution |
| concurrent append | no conflict under `(authority, seq)`. Under a global counter it needs consensus |
| equivocation | prevented in a conforming authority, detected in a non-conforming one, never prevented in the latter |

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

That window is open now and closes permanently.

### The legacy authority

Measured, the existing store does not satisfy MUST 1:

- **Not dense.** Ids run 32–230, 190 records. 37–45 are missing contiguously and 1–31
  are absent entirely. Of those, only `relay-0026` and `relay-0045` are
  `KNOWN_MISSING` — referenced by surviving records. The rest are `UNKNOWN`.
- **Not monotone-bound.** `relay-0183` was reused.

It also has no single author: `deposited-by` is claude ×104, mcp ×46, local ×41 —
three writers in one id space. **The legacy authority is the shared filesystem**, not
any participant. What made those ids unique was the disk.

So `relay-NNNN` cannot simply be reinterpreted as `(authority=relay, seq=NNNN)`; that
would launder two known defects into a clean origin. MUST 2 is what makes it
describable instead: authority `relay`, G1 claimed from seq 32, the violation at 183
**recorded inside the claim**, and seq < 32 marked `EXCLUDED_WITH_REASON`.

**Open, and deliberately not settled here:** whether an authority may claim G1 with a
recorded exception, or whether one violation voids the claim. bee.claude (relay-0233)
and relay-hy3 (relay-0237) both lean exceptions-allowed — but hy3's stated reasons are
largely the ones bee.claude supplied, so the two leans are not independent and are not
counted as a settlement. The one argument neither party took from the other is hy3's:
that bee.zae, reading the new scheme, should see the 183 violation as the provenance of
the defect rather than have it vanish past a boundary.

## Deferred to a separate issue

Cross-authority operation: partition, key rotation, merge, and readers with partial
visibility. It carries the `reference.ts` verdict-flip above as a **known open
problem**, and it needs a consensus layer this issue does not have and does not
pretend to.
