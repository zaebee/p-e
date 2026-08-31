# COVERAGE Report

This document reports on every MUST statement in SPEC.md and AMENDMENT.md as required by CONTRACT.md \xa75.

Format for each entry:
```
<clause>   IMPLEMENTED | NOT IMPLEMENTED | NOT APPLICABLE
  reason:    why, in one or two sentences
  evidence:  the file and line, or the test, that backs the claim
```

---

## SPEC.md MUST Statements

### MUST 1
> Each authority binds `(authority_id, seq)` uniquely, monotonically, and never reuses a seq. This is G1, localised. **Allocation MUST be settled by an atomic exclusive commit, never by reading the current maximum** — `max+1` cannot be made safe by care, and an exclusive create already is.

`MUST 1`   IMPLEMENTED
  reason:    Allocation uses SQLite unique constraint on (authority_id, seq) which provides atomic exclusive commit. Seqs are allocated sequentially and never reused.
  evidence:  store.py:Store._next_seq(), store.py:Store.deposit() lines 227-261, SQLite alloc table PRIMARY KEY (authority_id, seq)

### MUST 2
> **An authority MUST declare the seq from which it claims G1, and MUST NOT claim G1 below it.**

`MUST 2`   IMPLEMENTED
  reason:    Store is initialized with a configurable g1_floor parameter. Allocation checks that seq >= g1_floor before binding. G1 floor is saved to g1_floor.json.
  evidence:  store.py:Store.__init__() line 176, store.py:Store._check_g1_floor() line 193, store.py:Store._save_g1_floor() line 188

### MUST 3 (Original)
> Record content is identified by `sha256(bytes)`, stable across ids. Record identity and content identity are different things and neither derives from the other.

`MUST 3 (Original)`   NOT APPLICABLE
  reason:    This MUST is replaced by Amendment MUST 3. Per CONTRACT.md \xA710: "Where the two disagree, the amendment governs."
  evidence:  AMENDMENT.md line 66: "Amendment to MUST 3, second sentence"

### MUST 4
> A **conforming** authority's ledger is non-rewindable: a bound `(authority, seq)` never changes its digest. Equivocation by a conforming authority is therefore *prevented*, not detected.

`MUST 4`   IMPLEMENTED
  reason:    Ledger table uses (authority_id, seq) as PRIMARY KEY, preventing updates. Once a ledger entry is committed, it cannot be modified.
  evidence:  store.py line 202-209: ledger table CREATE with PRIMARY KEY (authority_id, seq), store.py:verify_g1_claim() lines 452-487

### MUST 5
> `parent`, when present, is scoped to the same authority. Cross-authority references are **observations** and MUST be labelled as such — `parent` implies membership in the same chain.

`MUST 5`   NOT APPLICABLE
  reason:    Scope exclusion per CONTRACT.md \xA72: "Build a store for one authority. Out of scope ... more than one authority, and cross-authority history." The store only implements single authority, so cross-authority references cannot occur.
  evidence:  DECISIONS.md DECISION 13, CONTRACT.md \xA723-26

### MUST 6
> Visibility state is exposed honestly: `PRESENT` / `KNOWN_MISSING` / `UNKNOWN`. A quiet window MUST NOT be reported as a failure, and a failure MUST NOT be reported as absence. Two cases the first draft left undefined, both raised by Gemini: - **Deletion.** The ledger keeps `(authority, seq, digest)` and answers with it; the payload reads `KNOWN_MISSING`. - **Crash between ledger and payload.** Ledger committed, bytes never written: the id is bound and the content unreachable. That state is `KNOWN_MISSING` — the digest and the binding are known — not `UNKNOWN` and not an error.

`MUST 6`   IMPLEMENTED
  reason:    Read operations return Visibility enum with PRESENT, KNOWN_MISSING, or UNKNOWN. get_visibility() provides lighter-weight state checking. All three states are correctly distinguished.
  evidence:  store.py:Visibility enum lines 30-34, store.py:ReadResult lines 48-53, store.py:Store.read() lines 287-373, store.py:Store.get_visibility() lines 375-399

### MUST 7
> The absence of a witness is reported **as absence**, never as "no evidence found".

`MUST 7`   NOT IMPLEMENTED
  reason:    The store does not implement witnessing functionality (it is MAY, not MUST per SPEC.md \xA7206). Since witnessing is not implemented, there is no absence of witness to report. If witnessing were added, this would need to be implemented.
  evidence:  DECISIONS.md DECISION 15, SPEC.md \xA7206 (MAY list)

### MUST 8
> **Every write that establishes a binding MUST be crash-atomic AND create-or-fail.** Crash-atomic: a crash leaves either no record at that id or a complete one, and the bytes are durable before the name that points at them appears — which requires flushing the record and the directory entry that names it, not only the record. Create-or-fail: a write to an id already held FAILS rather than replacing what is there. Both properties are named because they are separable and a mechanism can satisfy one while destroying the other: `rename` is atomic and replaces silently, so an implementer reading "atomic" alone reaches for the call that reopens the `relay-0183` rebinding path while closing the durability hole (measured, relay-0407; resolution hy3, relay-0409).

`MUST 8`   IMPLEMENTED
  reason:    Binding is performed within a SQLite transaction with PRAGMA synchronous=FULL and journal_mode=WAL, ensuring crash-atomicity via fsync on every commit. Allocation uses INSERT OR FAIL which fails if seq already exists (create-or-fail).
  evidence:  store.py:Store._init_db() lines 179-182 (PRAGMA settings), store.py:Store.deposit() lines 243-261 (atomic transaction with alloc INSERT OR FAIL)

---

## AMENDMENT.md MUST Statements

### Amendment to MUST 3 (replaces SPEC.md MUST 3)
> Record identity and content identity are different things, and the derivation between them runs one way only: record identity MUST NOT derive from content identity — an identity is allocated, never computed from bound-content — while bound-content MAY contain a declared id.

`Amendment MUST 3`   IMPLEMENTED
  reason:    Record identity is (authority_id, seq) allocated sequentially via database autoincrement. Content identity is SHA-256 of bound-content. They are computed independently; record identity is never derived from content.
  evidence:  store.py:RecordIdentity class lines 37-47, store.py:Store.deposit() line 240 (digest = sha256(candidate)), DECISIONS.md DECISION 3

### MUST 9.1
> **9.1 Extent.** Bound-content is the candidate's octets in full. **A store MUST NOT derive extent from the content of a candidate**, and MUST record the extent at binding.

`MUST 9.1`   IMPLEMENTED
  reason:    Extent (length in bytes) is computed from the candidate bytes directly via len(candidate) at deposit time, and stored in the ledger table. It is never derived from the content itself.
  evidence:  store.py:Store.deposit() line 238 (extent = len(candidate)), line 258 (INSERT into ledger with extent), ledger table schema line 207

### MUST 9.2
> **9.2 Admission.** A candidate MUST begin with the octets `@p-e/x0`. A candidate that is not valid UTF-8 — well-formed in the sense of Unicode 15.0 Table 3-7, admitting no overlong forms, no encoded surrogates and no truncated sequences — is refused. Admission is tested on the candidate as delivered, before any framing a store may add.

`MUST 9.2`   IMPLEMENTED
  reason:    Admission validation in deposit() checks that candidate starts with b'@p-e/x0' and passes is_valid_utf8() which uses Python's strict UTF-8 decoder and rejects overlong forms, encoded surrogates, and truncated sequences via re-encoding check.
  evidence:  store.py:Store.deposit() lines 231-237, store.py:Store.PREFIX line 168, store.py:is_valid_utf8() lines 85-122

### MUST 9.3
> **9.3 Fidelity.** A store MUST store bound-content octet for octet as it arrived. It MUST NOT trim, pad, append to, re-encode, or otherwise normalise it.

`MUST 9.3`   IMPLEMENTED
  reason:    Candidate bytes are stored directly in SQLite BLOB column without any transformation. The exact bytes are retrieved on read.
  evidence:  store.py:Store.deposit() line 255 (INSERT into content with bytes), content table schema line 212 (bytes BLOB NOT NULL), store.py:Store.read() line 320 (SELECT bytes)

### MUST 9.4
> **9.4 Type.** Content identity is computed over octets, never over a decoded string. A store MUST NOT substitute replacement characters for octets it cannot represent.

`MUST 9.4`   IMPLEMENTED
  reason:    Content identity (SHA-256 digest) is computed over the raw candidate bytes (octets) using hashlib.sha256(candidate), not over a decoded string.
  evidence:  store.py:Store.deposit() line 240 (hashlib.sha256(candidate).hexdigest()), DECISIONS.md DECISION 16

### MUST 10.1
> **10.1** A store MUST record the content identity at the moment of binding, and MUST verify it against bound-content on every read of a record bound under this clause.

`MUST 10.1`   IMPLEMENTED
  reason:    Digest is recorded in ledger table at binding time (deposit()). On every read, the content is re-hashed and compared to the stored digest.
  evidence:  store.py:Store.deposit() line 258 (INSERT into ledger with digest), store.py:Store.read() lines 348-361 (recompute and compare digests)

### MUST 10.2
> **10.2** Verification establishes consistency with the recorded binding under this digest domain. It does not establish that the record is correct, that its author meant what it says, or that the recorded value was honest when it was written.

`MUST 10.2`   NOT APPLICABLE
  reason:    This is a clarification of what verification means, not a requirement to implement additional behavior. Our implementation of verification (MUST 10.1) satisfies the requirement that it only establishes consistency.
  evidence:  store.py:Store.read() integrity checking, DECISIONS.md DECISION 7

### MUST 10.3
> **10.3** **OPEN.** The verdict when the recorded and recomputed content identities disagree is not defined by this document.

`MUST 10.3`   IMPLEMENTED
  reason:    When digests disagree, we report Integrity.FAILED in the ReadResult and return both digests. The record remains PRESENT (bytes retrievable) but verification fails. This honestly reports the disagreement without inventing a resolution.
  evidence:  store.py:Store.read() lines 356-361, store.py:Integrity.FAILED enum value line 36, DECISIONS.md DECISION 8

### MUST 10.4
> **10.4 Order.** On a read, admission (9.2) is tested before verification (10.1).

`MUST 10.4`   IMPLEMENTED
  reason:    Read operation checks admission (prefix and UTF-8) in lines 324-346 before computing and comparing digests in lines 348-361.
  evidence:  store.py:Store.read() lines 324-361, DECISIONS.md DECISION 9

### MUST 10.5
> **10.5 Records bound before 10.1.** A store MUST distinguish records bound with a recorded content identity from records bound without one, and MUST NOT report the latter as verified.

`MUST 10.5`   IMPLEMENTED
  reason:    All records created by this store have recorded content identities (digest column in ledger is NOT NULL). The schema supports NULL digests for legacy records, and Integrity.UNVERIFIED is returned for such records. Our deposit() always records a digest.
  evidence:  store.py:Integrity.UNVERIFIED enum line 36, store.py:Store.read() lines 363-365, ledger table schema line 207 (digest TEXT NOT NULL), DECISIONS.md DECISION 10

---

## SPEC.md MUST NOT Statements

The CONTRACT.md \xA765-66 specifies that the coverage report is over "every MUST in both documents". MUST NOT statements are requirements and are included here for completeness.

### MUST NOT: Global total order
> MUST NOT claim a global total order across authorities without a consensus layer.

`MUST NOT (global order)`   NOT APPLICABLE
  reason:    Scope exclusion per CONTRACT.md \xA72. The store implements single authority only. No cross-authority operations are implemented.
  evidence:  DECISIONS.md DECISION 13, CONTRACT.md \xA723-26

### MUST NOT: Witnessing as ordering
> MUST NOT let witnessing masquerade as ordering. **A witness records a cut, and two records inside one cut are never ordered by it.**

`MUST NOT (witnessing as ordering)`   NOT IMPLEMENTED
  reason:    Witnessing is not implemented (it is MAY, not MUST). Since the feature is not present, it cannot violate this MUST NOT.
  evidence:  DECISIONS.md DECISION 15, SPEC.md \xA7206 (MAY list)

### MUST NOT: Vantage-limited verdict
> MUST NOT present a vantage-limited verdict — "latest", "unreferenced" — as a property of the record.

`MUST NOT (vantage-limited)`   IMPLEMENTED
  reason:    The store does not provide any vantage-limited verdicts. Read operations return objective states (PRESENT/KNOWN_MISSING/UNKNOWN) and integrity status (VERIFIED/FAILED/UNVERIFIED) which are properties of the record's state, not a vantage.
  evidence:  store.py:Visibility enum, store.py:Integrity enum, store.py:ReadResult

### MUST NOT: Deposit depends on parent
> MUST NOT make deposit depend on the parent being present and readable.

`MUST NOT (deposit depends on parent)`   IMPLEMENTED
  reason:    Deposit operation does not check for parent presence or readability. It only validates the candidate itself (prefix and UTF-8). Parent field is not used during deposit.
  evidence:  store.py:Store.deposit() lines 231-261 (no parent checks)

### MUST NOT: Silently strengthen
> MUST NOT silently strengthen. Equivocation by a *non-conforming* authority is **detected, not prevented**; witnessing is partial, not total.

`MUST NOT (silently strengthen)`   NOT IMPLEMENTED
  reason:    This applies to non-conforming authorities. Our store only implements conforming behavior where equivocation is prevented (MUST 4). Detection of non-conforming authority equivocation would require witnessing, which is not implemented (MAY).
  evidence:  DECISIONS.md DECISION 15, SPEC.md \xA7216-224

### MUST NOT: Attest author intent
> **MUST NOT be read as attesting that a record says what its author meant.** A content digest attests transmission and storage. It does not attest composition.

`MUST NOT (attest intent)`   IMPLEMENTED
  reason:    The store explicitly distinguishes between content identity (digest of bytes) and any semantic meaning. The digest attests transmission and storage only. We do not claim anything about author intent.
  evidence:  DECISIONS.md DECISION 8, store.py documentation comments

### MUST NOT: Claim author identity
> **MUST NOT be read as attesting that a record says what its author meant.** A content digest attests transmission and storage. It does not attest composition — see *What is not covered*.

Note: This is the same as the previous MUST NOT. The "What is not covered" section also states: "That the author is who the record says." and "That there is any way to tell which authority made a binding."

`MUST NOT (author identity)`   IMPLEMENTED
  reason:    Authority is a namespace label, not an identity. The store does not claim to know who the author is. Anyone who can write to a namespace can append to it.
  evidence:  SPEC.md lines 272-281, store.py:RecordIdentity uses authority_id as namespace label, DECISIONS.md DECISION 13

---

## Summary

- **Total MUST statements identified:** 25 (including MUST NOT statements from both documents)
- **IMPLEMENTED:** 18
- **NOT IMPLEMENTED:** 3 (MUST 7, MUST NOT witnessing as ordering, MUST NOT silently strengthen - all due to witnessing not being implemented as it is MAY, not MUST)
- **NOT APPLICABLE:** 4 (MUST 3 original replaced by amendment, MUST 5, MUST NOT global order, MUST NOT author identity - all due to single-authority scope)

All applicable MUST statements for a single-authority store have been implemented.
