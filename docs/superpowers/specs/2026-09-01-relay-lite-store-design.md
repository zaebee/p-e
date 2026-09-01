# relay-lite store — design

**Spec implemented:** [`docs/specs/relay-lite-v0.12-draft.md`](../../specs/relay-lite-v0.12-draft.md)

**Goal:** a store that implements relay-lite faithfully, so the specification has
an executable form and its open questions become testable rather than arguable.

**Status:** design, approved in conversation on 2026-09-01. No code written.

---

## Why this rather than a third approximation

relay-ui already carries two `IRelayStore` backends and neither implements this
specification: its POSIX store is p-e's own model expressed in JSON, and
`PeTextRelayStore` is a read-only view of p-e. Adding a third approximation
would produce another thing to maintain and would test nothing.

Three issues in this repository are blocked on the same missing thing — no live
relay-lite data exists:

- **#19** — three defects in the spec, one of which is an argument resting on
  behaviour the implementation has since removed;
- **#21** — `DIVERGES` attributes a defect to the author and two blind readers
  disagreed that it can;
- **#22** — the six continuity states are incomplete; two blind readers returned
  nine and eight.

An implementation creates the data those questions need. An approximation does
not, because its divergences from the spec would be indistinguishable from the
spec's own defects.

## Scope

The specification carries twelve normative claims. Ten belong to a store; two
are obligations on a *consumer* and cannot be discharged by one.

| section | claims | in step 1 |
|---|---|---|
| §2 filesystem layout and CNS names | 2 | yes |
| §3 the canonical act | 4 | yes |
| §4 ordering | 2 | **no** — consumer obligations |
| §7 verification | 4 | yes |

§4's two claims are *"treat the graph as a DAG"* and *"MUST NOT present any
linear projection as the causal history"*. Both address whoever reads and
displays; a store cannot satisfy them on a consumer's behalf. They arrive with
the projection function, which is step 2 and belongs with whatever displays the
data.

**Step 1 is complete on its own:** two agents mint sealed acts, publish them
through the POSIX sequence, and verify each other's citations.

## Units

The boundary follows the specification's own structure rather than a technical
layering, so a reader holding a clause lands in one file.

```
src/relay-lite/
  cns.ts         delivery filename: parse and format          §2    2 claims
  canonical.ts   JCS over I-JSON, domain validation           §3.1  2 claims
  hlc.ts         emission and ingest rules                    §3.3
  act.ts         the act type, minting, sealing               §3.2  2 claims
  publish.ts     the POSIX sequence                           §4.1
  verify.ts      three-stage pipeline, six states             §7    4 claims
  index.ts       assembly: publish / read / verify
```

This also makes citations from the specification durable. #19 records that the
spec cites implementation by line number and every such citation has drifted —
`deposit.ts:102` now lands in a comment about deposit re-probing. A file per
section can be cited by name.

### Two dependencies, written rather than taken

**JCS (RFC 8785)** — around forty lines, and the traps are ECMAScript number
formatting (`1e21`, `-0`, precision) and key ordering by UTF-16 code units
rather than code points. Written here and run against the RFC's **official test
vectors**, because relay-ui's `canonicalJson` sorts keys and calls
`JSON.stringify` — which is not JCS, since it normalises no numbers — and taking
a dependency without checking would inherit that class of error rather than
avoid it.

**UUIDv7** — not in the standard library; `crypto.randomUUID` produces v4.
Around fifteen lines, and checkable: the time component is monotonic, and
version and variant sit in the required bits.

Both are small, both are load-bearing, and both are places where another
implementation may differ silently in exactly what matters here.

## Data flow

### Minting — §3.2

```
caller supplies   from, to[], type, payload, parent (id + digest) | null
    ↓
id = uuidv7()   hlc = emit(node state)   thread_id
    ↓
payload validated as I-JSON                    §3.1 — refused if it is not
    ↓
canonicalised to bytes per JCS                 §3.1
    ↓
SealedAct { act, bytes, digest }               §3.2 — the bytes are the act
```

**`mint()` returns bytes, and only bytes travel downstream.** There is no
re-canonicalisation path in the API, so §3.2's *"MUST NOT re-tick the HLC or
re-mint timestamps when retrying an existing `id`"* holds by construction rather
than by discipline: what cannot be rebuilt cannot be rebuilt differently.

### Publishing — §4.1, once per recipient

```
CNS name from act and recipient        §2 — CNS.id == act.id, CNS.to ∈ act.to[]
    ↓
temp, randomised name, O_CREAT|O_EXCL
write → fsync(file) → close
    ↓
link(temp, target)                     atomic; EEXIST is a refusal, not an error
    ├─ EEXIST → readFile(target), compare digests
    │            equal    → ALREADY_PUBLISHED, and fsync the directory
    │            differ   → COLLISION_REFUSED
    │            ENOENT   → the name is free; retry
    ↓
fsync(directory)                       durable bytes are not a durable name
    ↓
finally: unlink(temp), only if this process created it
```

**Fan-out is a loop outside `publish`, not inside it.** `publish` takes one
sealed act and one recipient. Three recipients produce three results, so a
partial fan-out is *visible* — two published, one refused — rather than hidden
behind a single verdict.

The reason is not tidiness. The specification is silent on partial fan-out,
there is no atomicity across delivery legs and none available, and collapsing
three outcomes into one would assert a guarantee the mechanism does not provide.

### Verification — §7

Three functions called in order, not one function with three phases:

```
1. digest = sha256(received bytes)                    no parsing
2. parse; I-JSON; CNS.id; CNS.to; UNANCHORED rejected
3. causal link → one of six states
```

§7.1's ordering is normative. A single function with internal phases cannot
demonstrate that the order was respected; three functions can, and a test can
call them out of order and observe the difference.

## Refusals

Every place this code says *no*, and what each refusal is entitled to claim.

| refusal | asserts | entitled |
|---|---|---|
| I-JSON violation at mint | the caller supplied something unrepresentable, naming the rule | yes |
| `COLLISION_REFUSED` | the name holds **different** bytes | yes — *after* the digest comparison |
| `ALREADY_PUBLISHED` | this same act is already there | yes, and must complete the directory fsync |
| `RETRY_EXHAUSTED` | every attempt found the name free | **nothing** about another writer |
| `UNANCHORED` | bytes attributed to nobody | yes; malformed |
| `DIVERGES` | the parent is held and disagrees | yes — but see #21, attribution is open |
| `UNCHECKABLE` · `LABEL_ONLY` · `NO_PARENT` | **not defects** | nothing about anyone |
| `STORE_CORRUPTION` | a discrepancy inside this store | §7.3: **must not** surface as `DIVERGES` |

**The rule: name the party a refusal implicates, and refuse to name one where
the evidence does not.**

Refusals are return values; exceptions are for *this code is broken*. The six
states are already values and the publisher's outcomes are already values, and
mixing the two would make a caller catch in two places. `STORE_CORRUPTION` is
the exception, because it is about the store rather than about a record and must
be noticeable rather than swallowed.

## Verification: ten claims, twelve checks

The arithmetic is worth stating, because two twelves appear in this document and
they are not the same twelve. The specification carries **twelve normative
claims**, of which **ten** are in scope here. Those ten get one check each, and
**two further checks** cover the publisher — which §4.1 describes at length
without using a single RFC-2119 keyword, so nothing in it is a normative claim
and all of it is load-bearing.

Each check cites the clause it tests, so the suite reads as a conformance report
against the specification rather than as unit tests of an implementation.

**§2 — delivery names**
1. a delivery leg naming a recipient outside `to[]` is refused
2. a name disagreeing with the sealed body is refused

**§3 — the canonical act**
3. JCS against the **official RFC 8785 test vectors**, not against itself
4. I-JSON: duplicate key, integer past 2^53, invalid UTF-8 — each refused, each
   naming the rule
5. sealing: the same act republished produces the **same bytes**
6. retrying an existing `id` changes neither `hlc` nor digest

**§7 — verification**
7. a verifier given non-canonical bytes **refuses** rather than silently
   repairing them
8. the citation matrix: `parent_id` without `parent_digest` is `LABEL_ONLY`, the
   reverse is `UNANCHORED`, and all six corners are distinct
9. the store invariant `digest == sha256(octets)` holds or is declared broken
10. a discrepancy planted inside the store raises `STORE_CORRUPTION` and is not
    charged to a child record

**§4.1 — the publisher: two checks beyond the ten claims**
11. `fsync` is **called on the directory** — verified by intercepting
    `FileHandle.sync` and asserting the directory appears among its targets
12. `EEXIST` with equal bytes gives `ALREADY_PUBLISHED`, with differing bytes
    `COLLISION_REFUSED`, a vanished target retries, and exhaustion gives
    `RETRY_EXHAUSTED`

Checks 3 and 7 are the ones this exercise exists for. Check 3 catches an error
relay-ui has already made — key sorting plus `JSON.stringify`, called JCS.
Check 7 tests a normative claim added during review in round 8 of issue #5 that
nothing has ever executed.

### Outside CI

**Directory-entry durability under crash.** `kill -9` does not test it: the host
kernel keeps the page cache, so a directory entry survives whether or not
`fsync` was called. Neither does stopping a container, for the same reason.

`dm-log-writes` on a loop device does test it — it journals every block
operation and allows the device to be replayed to any point, so a missing
directory fsync shows as a file with no entry pointing at it. Both `dm-flakey`
and `dm-log-writes` are present in this machine's kernel.

It needs root and `/dev/mapper`, does not automate into a hosted CI, and is
documented as a standing bench run rather than a gate.

**The distinction is the point:** *"the implementation calls fsync on the
directory"* is our claim and is checked every run. *"A directory entry survives a
crash when fsync was called"* is a property of the kernel and the filesystem,
not of this code.

## What implementation is expected to find

Stated in advance so that finding it is a result rather than a surprise.

**The HLC has no persistence rule, and §3.3 does not mention one.** The emission
and ingest rules are given, and `last_l` and `last_c` are per-node mutable state.
Where that state lives between process restarts is specified nowhere. A node
that restarts after its clock stepped backwards begins its counter at zero and
can emit a tuple it has already emitted — so the per-node monotonicity §3.3
insists on rests on state the specification does not require anyone to keep.

This belongs in #19 as a fourth item, alongside the argument resting on removed
behaviour, the citation-by-line-number defect, and the line numbers themselves.

## What this does not do

- **Adjudication.** `relay_request_adjudication` exists in relay-ui and in no
  part of this specification. Nothing here implements a court.
- **The consumer obligations.** §4's DAG and projection rules arrive with
  whatever displays the data.
- **A relay-ui backend.** That is a thin adapter over this, later, and its
  translation losses will be named the way `PeTextRelayStore` names its own.
- **Answer #21 or #22.** It produces the data those questions need. Whether the
  six states are complete, and whether `DIVERGES` may name an author, remain
  open and are decided by evidence this does not itself supply.
