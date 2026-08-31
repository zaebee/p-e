# Implementation Notes

## What was built

A single-authority crash-durable binding store implementing the specification from SPEC.md and AMENDMENT.md, as required by CONTRACT.md.

**Implementation:** Python 3 module (`store.py`) with CLI interface and comprehensive test suite (`test_store.py`).

**Language chosen:** Python 3 - selected for its cross-platform support, built-in UTF-8 handling, and ease of testing. Nothing in the specification depends on the language choice.

## What runs

### Working functionality (all MUST requirements from SPEC.md and AMENDMENT.md):

- **MUST 1:** Unique, monotonic seq allocation via O_EXCL marker files in `history/` directory. Seq numbers are never reused. Allocation uses atomic exclusive commit, not max+1.

- **MUST 2:** Authority declares G1 floor via `authority.json` file containing `authority_id` and `g1_floor`.

- **MUST 3:** Record content identified by sha256(bound-content). Content identity is distinct from record identity.

- **MUST 4:** Non-rewindable ledger implemented as append-only CSV file (`ledger.csv`). Each entry: `seq,digest,extent,timestamp`. Once written, entries are never modified.

- **MUST 5:** Parent scoping to same authority - N/A for single-authority implementation per CONTRACT §2.

- **MUST 6:** Visibility states honestly exposed:
  - `PRESENT`: Record content exists and verifies against stored digest
  - `KNOWN_MISSING`: Ledger entry exists but content file missing (deletion case)
  - `UNKNOWN`: No ledger entry for this seq

- **MUST 7:** Witnessing not implemented (MAY, not MUST). Absence of witness not applicable.

- **MUST 8:** Crash-atomic AND create-or-fail binding writes:
  - Content written to temp file, fsync'd, renamed to final location
  - Directory entry fsync'd after rename
  - Marker file created with O_EXCL (atomic create-or-fail)
  - Ledger appended with fsync
  - All writes are crash-atomic: either complete or no effect

- **MUST 9 (AMENDMENT):** Digest domain:
  - 9.1: Bound-content is candidate octets in full; extent recorded at binding, never derived from content
  - 9.2: Admission requires `@p-e/x0` prefix and valid UTF-8 (strict, no overlong forms, no encoded surrogates, no truncated sequences per Unicode 15.0 Table 3-7)
  - 9.3: Bound-content stored octet-for-octet as delivered (fidelity)
  - 9.4: Content identity computed over octets, never decoded string

- **MUST 10 (AMENDMENT):** Recorded at binding:
  - 10.1: Content identity recorded at binding; verified against bound-content on every read
  - 10.2: Verification establishes consistency, not correctness
  - 10.3: OPEN - digest mismatch returns VerificationError (not returning unverified content)
  - 10.4: Admission tested before verification on every read
  - 10.5: All records bound with recorded content identity

### Guarantees delivered:

- **G1:** An id, once bound, never names other bytes. Implemented via persistent allocation markers that are never removed, even on deletion.
- **G2a:** Binding survives a crash. Implemented via crash-atomic write sequence (temp file → fsync → rename → fsync directory → O_EXCL marker → ledger append with fsync).
- **G2b:** NOT IMPLEMENTED - requires independent party, explicitly deferred in SPEC.md.

### CLI Commands:

```bash
# Initialize store
python store.py init --dir STORE_DIR --authority AUTH_ID --g1-floor N

# Bind a record from file
python store.py bind --dir STORE_DIR FILE

# Read a record by seq
python store.py read --dir STORE_DIR SEQ

# Delete a record (content only, marker retained)
python store.py delete --dir STORE_DIR SEQ

# Check visibility state
python store.py visibility --dir STORE_DIR SEQ

# List all bindings
python store.py list --dir STORE_DIR
```

## What does not run / Limitations

### Not implemented (explicitly out of scope per CONTRACT §2):

- Multi-authority support (deferred to separate issue)
- Cross-authority history, partition, merge
- Key rotation
- Migration of existing corpus
- Crash recovery (beyond crash-atomic writes)
- Witnessing (MAY, not MUST - but would be needed for G2b)

### Cannot test reliably in this environment:

- **True crash atomicity:** Cannot reliably kill process mid-bind to verify crash recovery. The mechanisms are in place (temp file + rename + fsync + O_EXCL), but actual crash testing requires external process management.

- **Concurrent allocation:** The O_EXCL mechanism should handle concurrent allocators (capsule 04 measured 16 racing writers → 16 distinct ids, 0 duplicates), but cannot easily test concurrent writes in a single process.

- **Disk durability:** Cannot verify that fsync truly flushes to persistent storage on this filesystem.

### Known gaps:

- **Parent field:** Not fully implemented as there's no chain structure in single-authority context with no parent requirements.
- **Witnessing:** Not implemented; MUST 7 is satisfied vacuously (no witnessing = no false "no evidence" reports).
- **Deterministic reading order:** Not implemented (MAY, and requires multiple authorities).

## Digest Check

- SPEC.md SHA-256: `847b8971d36390cd8843da7ebe59bc3499cd8050473425eb91a4a09f30b9901c` - **MATCHED**
- AMENDMENT.md SHA-256: `abe840dcd5bb00f5ecbfb7fc6e55b8cd4aaa8e049f2c4be0f53e572c4a5d644b` - **MATCHED**

## Test Results

33 tests pass, covering:
- UTF-8 validation (strict, all edge cases)
- Store basics (init, bind, read, delete)
- All MUST requirements from both documents
- Visibility states
- Content identity and record identity separation
- Crash atomicity mechanisms
- Edge cases (empty content, large content, Unicode)
- Admission before verification ordering
- Non-rewindable ledger
- Citation creation and verification

## Files produced

- `store.py` - Store implementation (26,842 bytes)
- `test_store.py` - Comprehensive test suite (21,013 bytes)
- `DECISIONS.md` - Decision journal (11,820 bytes)
- `NOTES.md` - This file

## Decisions and Blockers

- **Decisions recorded:** 18 (see DECISIONS.md)
- **Blockers:** 0

All specification requirements were satisfiable within the single-authority scope. No clauses blocked implementation.
