# Notes — what was built, what runs, what does not

## Digest check

Verified before reading, with `sha256sum`:

| file | expected (CONTRACT.md) | computed | |
|---|---|---|---|
| `SPEC.md` | `847b8971d36390cd8843da7ebe59bc3499cd8050473425eb91a4a09f30b9901c` | identical | **matched** |
| `AMENDMENT.md` | `abe840dcd5bb00f5ecbfb7fc6e55b8cd4aaa8e049f2c4be0f53e572c4a5d644b` | identical | **matched** |

Both matched. Nothing outside this directory was read; no network was used.

## What was built

Python 3, standard library only, no dependencies.

| file | |
|---|---|
| `store.py` | the store: admission, allocation, binding, persistence, read-back |
| `test_store.py` | 63 assertions, each naming the clause it is evidence for |
| `demo.py` | one store on disk doing the whole job once |
| `DECISIONS.md` | the journal — **12 decisions, 0 blockers** |

Run: `python3 test_store.py` → `63 passed, 0 failed`. `python3 demo.py` → transcript
showing bindings, the four refusal paths, `history/` on disk, the three visibility
states, and the `relay-0183` case.

## Shape on disk

```
<root>/authority.json          store identity, authority_id, g1_floor (MUST 2)
<root>/history/<loc>           allocation marker — empty, O_EXCL, never removed (MUST 1)
<root>/history/<loc>.bind      ledger entry — (authority, seq, digest, extent), create-or-fail
<root>/objects/<loc>.rec       bound-content, octet for octet, nothing added (A 9.3)
```

Deposit order: candidate-only checks → allocate marker → ledger → object. The ledger is
written before the record (S *Named failures*); within each of those two writes the
bytes are fsynced before the directory entry naming them appears (MUST 8), and the entry
appears by `link`, not `rename`, so a name already taken fails instead of being replaced.

## What runs, with the clause it answers

- Round-trip fidelity; the stored file is byte-identical to the offer and its size is the
  recorded extent (A 9.1, 9.3, 9.4).
- Allocation from the declared G1 floor, dense and monotone; 16 racing processes take 16
  distinct ids with 0 duplicates, matching capsule 04's measurement (MUST 1).
- A record removed does not free its id: the marker survives and the allocator never
  returns it (MUST 1, the `relay-0183` fix).
- Create-or-fail on both binding writes; a second write at a held id raises instead of
  replacing, and a ledger entry cannot be rewritten (MUST 4, MUST 8).
- Admission: non-`@p-e/x0` and ill-formed UTF-8 (overlong, encoded surrogate, truncated)
  refused, consuming no seq (A 9.2).
- Extent taken from the offer, disagreement refused, extent recorded at binding (A 9.1).
- Envelope `id:` optional and checked; mismatch refused and the id abandoned (S).
- `parent:` scoped lexically to this authority; dangling parents accepted, foreign ones
  refused, presence never tested (MUST 5 and its MUST NOT).
- Three visibility states, and only three (MUST 6), including the crash-between-ledger-
  and-payload state answered as KNOWN_MISSING with its digest.
- Verification on every read, admission ordered before it (A 10.1, 10.4), and the open
  10.3 verdict resolved as a read failure that returns no bytes.
- Witness absence reported as absence (MUST 7).

## What does not run, or was not tested, and why

- **Real crash atomicity.** I tested the *ordering* of the two writes and the
  create-or-fail arm, but I could not power-cut the machine or intercept at the block
  layer. `fsync` is called on file and directory; whether it reaches platter on a disk
  that lies about its cache is outside anything I can observe here. G2a is implemented
  and argued, not demonstrated.
- **G1 as a claim.** S says it plainly: "I have never reused a seq" is self-asserted and
  not checkable by a reader who was not present for every allocation. I can show the
  mechanism cannot reuse a seq within a store's life; I cannot show it for a store whose
  history I did not watch.
- **A 10.5's legacy records.** No record bound without a recorded content identity can be
  produced by this store, so that branch is exercised by hand-editing a ledger entry —
  which shows the store distinguishes and refuses to report such a record as verified,
  but is not the same as a genuine pre-10.1 record. Producing one would be migration
  (out of scope, CONTRACT §2).
- **A 9.1's refusal branch** — "a store that cannot recover a record's extent from its own
  stored form MUST refuse" — is unreachable here by construction: the object's size and
  the ledger both carry the extent, and admission guarantees at least the seven octets of
  `@p-e/x0`, so no candidate can put the store in that condition. There is no per-candidate
  test to write, and I wrote none rather than write one that always passes.
- **ENVELOPE_MISMATCH on read** is likewise unreachable after a passing digest check,
  since deposit already rejected the mismatch and 9.3 keeps the octets fixed. It is
  implemented because S says the check is required, not scoped to deposit.
- **K5, evaluator determinism**: not applicable — one runtime, no second implementation to
  compare against, and S calls it unestablished rather than broken in its own case.
- **Out of scope by CONTRACT §2 and not implemented**: deletion (the read path answers the
  post-deletion state, but there is no delete operation), migration, crash recovery, more
  than one authority, cross-authority history. `read()` refuses a foreign locator rather
  than answering for a namespace it is not.
- **MAY, and not implemented**: content deduplication, witnessing and inclusion evidence,
  key rotation, replication. Two ids holding one digest is accepted and needs no
  resolution, as S says; A's rule that dedup MUST NOT be switched off for records with a
  declared id is vacuous here because there is no dedup to switch off.
- **No exceptions mechanism exists and none can be declared.** v1 forbids them; the
  authority declaration records the floor and states that no exception is declarable.
- **Legacy `relay` is not modelled.** It makes no G1 claim, so there is nothing for a
  conforming store to implement on its behalf.

## Two small things worth saying

- Allocation walks from the floor on every deposit, which is linear in the number of ids
  taken. It is faithful to MUST 1's wording ("walks ids and claims the first marker that
  does not yet exist") and I did not optimise it, because every cheaper variant I could
  think of is a cached maximum in disguise and MUST 1 is explicit that `max+1` "cannot be
  made safe by care".
- *Store identity* is configured, per S — "the configured authority/store identifier (not
  a filesystem path)" — and appears in every citation this store emits, so a citation is
  resolvable after it leaves the store.
