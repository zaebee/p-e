# relay-lite — Working Draft v0.12

**Status:** Working draft. Not verified. Not adopted by this project.

**Origin:** Proposed in [issue #5](https://github.com/zaebee/p-e/issues/5) and revised across
sixteen review rounds between one proposer and one reviewer (`bee.claude`). Contest language
across all fifteen replies: zero. A single-reviewer trajectory is not a verified one; see
**Provenance and standing** below before treating any part of this as established.

relay-lite is a message transport for multiple agents exchanging records over a shared
filesystem. It is **a different protocol from the one this repository runs** — that store uses
`relay-NNNN` ids, allocation markers, text records split on `\n---\n`, digests over literal file
bytes, and a comma-separated `to:` list. Nothing here describes `src/relay/`.

---

## 1. Invariants

1. A record, once published, is immutable. Corrections are new records, never edits.
2. Order comes from the citation graph, not from absolute system clocks.
3. The causal graph is a **partial order**. Concurrent replies fork; there is no single true
   linearisation.
4. A reader's inability to see a record is not a defect in that record.

## 2. Filesystem layout and CNS names

```
.relay/tmp/     ephemeral temp files, randomized names
.relay/in/      published delivery files
.relay/errata/  expired records
```

### 2.1 Delivery filename

```
to=<agent>;from=<agent>;thread=<thread_id>;ttl=<seconds>;id=<uuidv7>.json
```

`to=<agent>` names **one** delivery leg. A message addressed to N agents produces N delivery
files carrying identical bytes.

**[MUST]** `CNS.to` is an element of the act's `to[]`, or `to[] == ["all"]`. A delivery leg
naming a recipient outside the attested audience is non-conformant and is rejected by the
receiver.

**[MUST]** `CNS.id == act.id`.

## 3. The canonical act

The hashed body carries only what is true regardless of who receives it. Per-recipient delivery
metadata lives in the filename and is never hashed.

```typescript
export interface HLC {
  readonly l: number;         // Physical/wall timestamp in milliseconds UTC
  readonly c: number;         // Monotonic logical counter per node
  readonly node_id: string;   // Unique node/process identifier
}

export interface RelayAct<T = any> {
  readonly id: string;                    // UUIDv7 locator
  readonly thread_id: string;             // Context / task grouping
  readonly parent_id: string | null;      // Predecessor locator (null for roots)
  readonly parent_digest: string | null;  // SHA-256 of parent's wire octets
  readonly type: "message" | "claim" | "challenge" | "ruling" | "erratum";
  readonly from: string;                  // Author identity
  readonly to: readonly string[];         // Invariant attested audience list
  readonly hlc: HLC;                      // Explicit immutable HLC tuple
  readonly payload: T;                    // I-JSON (RFC 7493) compliant payload
}
```

### 3.1 Canonical serialization

**[MUST]** Producers mint canonical wire bytes per **RFC 8785 (JCS)** encoded as raw UTF-8.
JCS fixes key order (UTF-16 code units), number formatting (ECMAScript), and string escaping
(non-ASCII emitted as literal UTF-8).

**[MUST]** Acts conform to **I-JSON (RFC 7493)**: no duplicate keys; integers within
`[-(2^53 - 1), 2^53 - 1]`, larger values encoded as strings; strings valid UTF-8 without
overlong sequences or unpaired surrogates.

*Why the domain constraint:* an integer past 2^53 is altered by the parse that precedes
canonicalization, so the digest covers a value nobody sent. Duplicate keys resolve differently
across parsers — a duplicated `from` gives two implementations different authors *and*
different digests.

### 3.2 Sealing

**[MUST]** An act is sealed at creation: `id` minted, `hlc` stamped once, bytes canonicalized
once.

**[MUST NOT]** Publishers re-tick the HLC or re-mint timestamps when retrying an existing `id`.
Retries and fan-out transmit the identical sealed byte buffer.

Without this, a crash-recovery retry rebuilds the act with a later HLC, the digest changes, and
the publisher's own retry is reported as a foreign collision.

### 3.3 The Hybrid Logical Clock

Emission, on creating a message:

```
l' = max(physical_now_ms, last_l)
c' = last_c + 1   if l' == last_l
     0            if l' >  last_l
```

Ingest, on processing a received message `M`:

```
l' = max(physical_now_ms, last_l, M.hlc.l)
c' = max(last_c, M.hlc.c) + 1   if l' == last_l == M.hlc.l
     last_c + 1                 if l' == last_l
     M.hlc.c + 1                if l' == M.hlc.l
     0                          otherwise
```

`max` folds a regressing physical clock into the equal case, so the tuple stays monotonic per
node across NTP steps, VM restore, and suspend.

## 4. Ordering

**[MUST]** The protocol and storage model treat the graph as a DAG — a partial order.

**[MUST NOT]** A consumer presents any linear projection as *the* causal history, or makes
protocol assertions from a linearized sequence.

A consumer needing a flat presentation deduplicates first, then sorts:

```
ProjectThread(E) = Sort(DeduplicateByID(E), Comparator)

Comparator:  TopologicalDepth  →  HLC (l, c, node_id)  →  id
```

Deduplication is not an optimisation. Fan-out delivers N copies of one act, and the comparator
would otherwise be asked to order records that are copies rather than siblings. Terminating on
`id` is sound only after dedup, because `id` is what dedup keys on.

### 4.1 Publishing

```typescript
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

export type PublishResult =
  | { status: "PUBLISHED" }
  | { status: "ALREADY_PUBLISHED" }
  | { status: "COLLISION_REFUSED" }
  | { status: "RETRY_EXHAUSTED" };

export async function publishMessage(
  payloadBytes: Buffer,
  targetName: string,
  relayRoot: string,
  maxRetries = 3
): Promise<PublishResult> {
  const inDir = join(relayRoot, "in");
  const tmpDir = join(relayRoot, "tmp");
  const targetPath = join(inDir, targetName);

  await fs.mkdir(tmpDir, { recursive: true });
  await fs.mkdir(inDir, { recursive: true });

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const tmpPath = join(
      tmpDir,
      `.dep-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );

    let tmpCreated = false;
    let tmpHandle: fs.FileHandle | null = null;
    let dirHandle: fs.FileHandle | null = null;

    try {
      tmpHandle = await fs.open(tmpPath, "wx");
      tmpCreated = true;
      await tmpHandle.writeFile(payloadBytes);
      await tmpHandle.sync();
      await tmpHandle.close();
      tmpHandle = null;

      try {
        await fs.link(tmpPath, targetPath);
      } catch (linkErr: any) {
        if (linkErr.code === "EEXIST") {
          let existingBytes: Buffer;
          try {
            existingBytes = await fs.readFile(targetPath);
          } catch (readErr: any) {
            if (readErr.code === "ENOENT") continue;   // target vanished; the name is free
            throw readErr;
          }

          const existingDigest = createHash("sha256").update(existingBytes).digest("hex");
          const payloadDigest = createHash("sha256").update(payloadBytes).digest("hex");

          if (existingDigest === payloadDigest) {
            dirHandle = await fs.open(inDir, "r");
            await dirHandle.sync();
            return { status: "ALREADY_PUBLISHED" };
          }
          return { status: "COLLISION_REFUSED" };
        }
        throw linkErr;
      }

      dirHandle = await fs.open(inDir, "r");
      await dirHandle.sync();
      return { status: "PUBLISHED" };
    } finally {
      if (tmpHandle) await tmpHandle.close().catch(() => {});
      if (dirHandle) await dirHandle.close().catch(() => {});
      if (tmpCreated) await fs.unlink(tmpPath).catch(() => {});
    }
  }

  return { status: "RETRY_EXHAUSTED" };
}
```

Each element earns its place:

- **`link`, not `rename`** — `rename` overwrites an existing name silently; `link` fails with
  `EEXIST`, which is what a create-or-fail publish needs.
- **Randomized temp name** — a crash leaves no `finally` to run. A deterministic
  `<id>.tmp` would survive as an uncollectable file that blocks republication of exactly the
  message that was interrupted. A random name leaves inert garbage instead.
- **Directory `fsync`** — durable bytes do not make a durable name. Without it a crash can
  leave a complete record that no directory entry points at.
- **`EEXIST` scoped to `link`** — the temp `open` uses `O_EXCL` and produces `EEXIST` too.
  Catching it at the outer level reports a temp-name collision as a publish collision and, via
  the `finally`, deletes another writer's in-flight temp.
- **`ENOENT` scoped to `readFile`** — the directory `fsync` also produces `ENOENT`, and the two
  are indistinguishable by code.
- **Digest comparison on `EEXIST`** — `EEXIST` alone does not say *whose* name it is. A publish
  whose `link` succeeded and whose `fsync` then failed is retried and would otherwise be
  reported as another writer's collision.
- **`RETRY_EXHAUSTED`** — loop exhaustion is reachable only via the vanished-target path, which
  means every attempt found the name free. Reporting that as a collision is the same error one
  level out.

**GC:** a sweeper reaps `.relay/tmp/` entries older than 10 minutes and moves `.relay/in/`
entries past their TTL to `.relay/errata/`.

## 5. Attribution

`ruled_by` records **attribution of epistemic responsibility**, not a delegated mandate. It does
not assert that anyone conferred authority; it names who made the judgment call, so a later
reader knows whom to distrust. A ruling is not a reading.

## 7. Verification

### 7.1 Pipeline

Three stages, in order. The ordering is normative: stage 1 must not parse, and stage 2's
conformance checks require parsing.

**Stage 1 — wire-octet hashing.** `act_digest = SHA-256(raw_received_bytes)`. No parsing, no
normalization.

**[MUST NOT]** A verifier parses, normalizes, or re-serializes bytes when computing a digest or
verifying `parent_digest`. Re-serializing makes a non-canonical producer verify against a body
nobody transmitted, and makes verification depend on the verifier's JSON library.

**Stage 2 — structural and I-JSON conformance.** Parse; reject on duplicate keys, on numbers
outside the safe range, on `CNS.id != act.id`, on `CNS.to ∉ act.to[]`, and on an unanchored
citation (`parent_id == null && parent_digest != null`).

**Stage 3 — causal link evaluation.** Total and pure; see below.

### 7.2 Citations

**[MUST]** A citation carries both handles — the locator and the digest:

| `parent_id` | `parent_digest` | state | meaning |
| :-- | :-- | :-- | :-- |
| null | null | `NO_PARENT` | root act |
| null | set | `UNANCHORED` | bytes claimed for nobody — malformed |
| set | null | `LABEL_ONLY` | predecessor named, no byte commitment — **not a defect** |
| set | set | `MATCHES` | parent held, digest agrees |
| set | set | `DIVERGES` | parent held, digest differs — **author defect** |
| set | set | `UNCHECKABLE` | parent not held — **reader gap, not a defect** |

A digest alone is a content address, and a content-address lookup returns found or not-found.
Without the locator, "the parent is not held" and "the parent is held and disagrees" are the
same miss — so `DIVERGES` is unreachable and author defects launder into honest gaps.

`UNCHECKABLE` is a consequence of this protocol's own transport, not an import: under §2.1's
single-leg delivery an act addressed to one agent is never written into another's inbox, so a
node holding a child that cites it *cannot* hold the parent. Partial visibility is the normal
case, and a verifier that rejects on an unheld parent rejects correct acts routinely.

```typescript
export type CausalStatus =
  | "NO_PARENT" | "UNANCHORED" | "LABEL_ONLY"
  | "MATCHES"   | "DIVERGES"   | "UNCHECKABLE";

export function evaluateCausalLink(
  child: RelayAct,
  localStore: Map<string, StoredRecord>
): CausalStatus {
  const { parent_id, parent_digest } = child;

  if (parent_id === null) {
    if (parent_digest === null) return "NO_PARENT";
    return "UNANCHORED";
  }
  if (parent_digest === null) return "LABEL_ONLY";

  const parentRecord = localStore.get(parent_id);
  if (parentRecord !== undefined) {
    return parentRecord.digest === parent_digest ? "MATCHES" : "DIVERGES";
  }
  return "UNCHECKABLE";
}
```

Evaluation is **total** — every input returns a state, none throws. Stage 2 rejects `UNANCHORED`
at ingest, where rejection belongs; stage 3 still classifies it, so an auditor sweeping records
written under older rules gets a report instead of an aborted sweep.

Branching on `parent_id` alone first is not stylistic. Three conjunctive guards exhaust the null
cases logically, but TypeScript's control-flow analysis does not narrow across them, and the
version that reads as exhaustive fails `tsc --strict` at `localStore.get(parent_id)`.

### 7.3 Store integrity

```typescript
export interface StoredRecord {
  readonly octets: Buffer;
  readonly digest: string;   // INVARIANT: digest === SHA-256(octets)
}
```

**[MUST]** A store guarantees the invariant, by deriving the digest at load or by verifying it
before committing the record.

**[MUST]** A detected discrepancy raises `STORE_CORRUPTION`. It **MUST NOT** surface as
`DIVERGES` against a child record — the tri-state stops a reader's *visibility* gap from
becoming an author's defect, and this stops the reader's *staleness* from doing the same.

---

## Provenance and standing

### What is imported

The six-state partition in §7.2 came from this repository's `src/relay/continuity.ts`. It
entered the thread in the reviewer's first comment at 07:41 and was adopted by name — "Adopt
`continuity.ts` semantics" — four minutes later. Every later refinement traces to blocks pasted
from that file, comment text included.

It is recorded here as a **formal hypothesis derived from `continuity.ts`, subject to
falsification** — not as an independently discovered invariant. The reviewer initially described
the agreement between the two systems as evidence and later retracted that: one system was
copied into a specification and then observed arriving there.

Falsifying it needs a reader that has not seen `continuity.ts` or issue #5. **Fuzzing will not
do it:** a fuzzer emitting well-formed acts sees every state returned correctly and records a
pass. The open question is whether the partition is *complete*, and completeness is not
observable from inside the partition.

### What was withdrawn during review

Four reviewer findings did not survive:

1. "Move `to` out of the hashed body" — too broad. Only the per-delivery singular breaks
   fan-out; the invariant list belongs inside, which is why §3 carries `to: readonly string[]`.
2. That hashing over literal file bytes makes the encoding question unaskable — the same
   sentence conceded this project's Q1 axes are open on which octets count.
3. That absence-collapsed-into-fault is a recurring general pattern — four instances found by
   one reader in one artefact.
4. The convergence claim, above.

Items 2 and 3 fell to an outside reader who had written none of the findings
(`relay-0709`–`relay-0712`); items 1 and 4 the reviewer caught alone.

### What this project has not decided

Whether to adopt relay-lite at all. The store this repository runs solves a different problem
and has open questions relay-lite does not touch.
