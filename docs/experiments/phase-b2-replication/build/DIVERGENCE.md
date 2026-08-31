# DIVERGENCE Report

This document lists places where another implementation could satisfy SPEC.md and AMENDMENT.md and behave observably differently from ours, as required by CONTRACT.md \xa781-88.

Format for each entry:
- The input
- Our behaviour
- The other behaviour
- The clause that permits both

---

## 1. Storage Backend

**Input:** Any deposit operation

**Our behaviour:** Store data in SQLite database with WAL mode and FULL synchronous

**Other behaviour:** Store data in filesystem with separate marker files (history/), record files (records/), and ledger files

**Clause:** MUST 1 (allocation by atomic exclusive commit), MUST 8 (crash-atomic writes). Both filesystem-based and database-based approaches can satisfy these requirements. The spec describes a filesystem mechanism but does not mandate it.

**Evidence:** SPEC.md lines 158-169 describe filesystem-based mechanism; our DECISIONS.md DECISION 1 chooses SQLite instead.

---

## 2. Record Identity Format

**Input:** N/A (structural decision)

**Our behaviour:** Record identity is formatted as `{authority_id}-{seq:04d}` (e.g., `relay-0001`)

**Other behaviour:** Record identity could be formatted differently, e.g., `{authority_id}/{seq}`, `{seq}@{authority_id}`, or any other string representation

**Clause:** MUST 3 (amended): "record identity MUST NOT derive from content identity". The format of the identity string is not specified, only that it's allocated not computed.

**Evidence:** AMENDMENT.md lines 68-74, DECISIONS.md DECISION 3

---

## 3. Content-Addressed Storage

**Input:** Two identical candidates (same bytes) deposited to the store

**Our behaviour:** Content is stored once in the content table and referenced by digest from multiple ledger entries (deduplication)

**Other behaviour:** Store each record's content separately even if identical, without deduplication

**Clause:** MAY "Content deduplication across ids" (SPEC.md line 205). Deduplication is permitted but not required.

**Evidence:** SPEC.md \xA7205, store.py line 255 uses INSERT OR IGNORE for deduplication

---

## 4. G1 Floor Default

**Input:** Initialize a new store without specifying G1 floor

**Our behaviour:** Default G1 floor is 0

**Other behaviour:** Default G1 floor could be 1, or the first seq allocated, or any other value

**Clause:** MUST 2: "An authority MUST declare the seq from which it claims G1". The declaration mechanism is not specified - it could default to 0, 1, or require explicit declaration.

**Evidence:** DECISIONS.md DECISION 2

---

## 5. UTF-8 Validation Strictness

**Input:** Candidate with overlong UTF-8 forms (e.g., NUL encoded as C0 80 instead of 00)

**Our behaviour:** Reject the candidate (our is_valid_utf8 uses Python's strict decoder which rejects overlong forms)

**Other behaviour:** Accept the candidate if it decodes successfully (some UTF-8 validators are lenient)

**Clause:** MUST 9.2: "A candidate that is not valid UTF-8 — well-formed in the sense of Unicode 15.0 Table 3-7, admitting no overlong forms...". The spec explicitly requires rejecting overlong forms, so this is NOT a valid divergence. However, different implementations might have different interpretations of "well-formed".

**Evidence:** This is actually NOT a valid divergence since the spec explicitly requires rejecting overlong forms.

---

## 6. Visibility State for Corrupted Content

**Input:** Read a record where the content has been corrupted (no longer matches the recorded digest)

**Our behaviour:** Return Visibility=PRESENT, Integrity=FAILED, with both digests

**Other behaviour:** Return Visibility=KNOWN_MISSING (treating corruption as missing content), or raise an exception, or silently return the content

**Clause:** MUST 10.3: "OPEN. The verdict when the recorded and recomputed content identities disagree is not defined by this document." The spec explicitly leaves this verdict undefined, permitting different behaviors.

**Evidence:** AMENDMENT.md lines 120-122, DECISIONS.md DECISION 8

---

## 7. Handling of Legacy Records (bound without recorded digest)

**Input:** A record bound before MUST 10.1 was in effect (no recorded content identity)

**Our behaviour:** Such records would have digest=NULL in ledger table and be reported as Integrity=UNVERIFIED. However, our deposit() always records a digest, so we don't create such records.

**Other behaviour:** Always compute and store digest for all records, making all records verified. Or, reject such legacy records entirely.

**Clause:** MUST 10.5: "A store MUST distinguish records bound with a recorded content identity from records bound without one, and MUST NOT report the latter as verified." This requires distinguishing but doesn't specify how to handle legacy records.

**Evidence:** AMENDMENT.md lines 139-143, DECISIONS.md DECISION 10

---

## 8. Envelope ID Validation

**Input:** A candidate with a declared `id:` field in the header block

**Our behaviour:** The declared id is checked against the store-assigned identity when parsing the envelope (validate_envelope_id function), but this check is not enforced during deposit or read

**Other behaviour:** Reject the candidate at admission if declared id doesn't match, or ignore the declared id entirely

**Clause:** SPEC.md \xA7317: "The envelope id: inside the digested bytes is the only identity a chain can pin; it is OPTIONAL but, when present, MUST be checked against the store-assigned id (optional-and-checked)." The check is optional and the enforcement mechanism is not specified.

**Evidence:** SPEC.md lines 314-327, store.py:validate_envelope_id() function

---

## 9. Parent Field Handling

**Input:** A candidate with a `parent:` field referencing another record

**Our behaviour:** Parent field is parsed but not validated or used. It's treated as ordinary header content.

**Other behaviour:** Validate that parent references an existing record in the same authority, or reject if it references a non-existent record, or enforce chain continuity

**Clause:** MUST 5: "parent, when present, is scoped to the same authority. Cross-authority references MUST be labelled as observations." This only requires that same-authority parent implies same chain membership, not that parent must exist or be validated.

**Evidence:** SPEC.md lines 178-180, DECISIONS.md DECISION 13

---

## 10. Sequencing After Crash

**Input:** Store crashes after allocating a seq (creating marker) but before completing the binding (storing content and ledger entry)

**Our behaviour:** On restart, the seq is allocated but has no ledger entry or content. Reading returns KNOWN_MISSING (allocated but content missing). The seq cannot be reused.

**Other behaviour:** On restart, detect incomplete bindings and either complete them or roll them back (freeing the seq for reuse). Or, treat them as UNKNOWN.

**Clause:** MUST 1: "Each authority binds (authority_id, seq) uniquely, monotonically, and never reuses a seq." The marker file persists beyond deletion (line 163), so the seq cannot be reused. The visibility state for this situation is KNOWN_MISSING per MUST 6.

**Evidence:** SPEC.md lines 162-163, MUST 6 lines 187-189, DECISIONS.md DECISION 1 (SQLite approach handles this via transaction atomicity)

---

## Summary

We predict **9 valid divergences** where another conforming implementation could behave observably differently:

1. Storage backend (filesystem vs database)
2. Record identity format
3. Content deduplication (yes vs no)
4. G1 floor default value
5. Visibility state for corrupted content
6. Handling of legacy records
7. Envelope ID validation enforcement
8. Parent field handling
9. Sequencing after crash

Divergence #5 in the numbered sections (UTF-8 Validation Strictness) is NOT valid because the spec explicitly requires rejecting overlong forms.

The most interesting divergences are #1 (storage backend), #3 (deduplication), and #5 (corrupted content handling), as these represent fundamentally different design choices that the documents permit.
