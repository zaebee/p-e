**Method:** Two situations need separate outcomes if the verifiability or correctness of a record’s predecessor reference differs such that a reader would draw a different conclusion about whether the predecessor can be located, whether its content can be confirmed, or which part of the reference (identifier or digest) is at fault.


## Outcomes

### 1. NoPredecessor
- **Situation:** Both the identifier and the SHA-256 digest fields are absent.
- **Entitled to conclude:** The record explicitly has no predecessor.
- **Does not say:** Whether the author intended to add a predecessor later or made an intentional choice to omit one.
- **Error:** No error. This is a valid state.

### 2. PredecessorNotHeld
- **Situation:** At least one reference field (identifier or digest) is present, but no held record matches the provided identifier (if any) and no held record matches the provided digest (if any).
- **Entitled to conclude:** The predecessor cannot be verified because the reader does not hold any record satisfying the reference.
- **Does not say:** Whether the predecessor exists elsewhere in the distributed log or never existed at all.
- **Error:** No error by the author. The reader’s subset simply lacks the predecessor.

### 3. IdentifierOnlyMatched
- **Situation:** Only the identifier field is present (digest absent), and a held record has that identifier.
- **Entitled to conclude:** The predecessor is identified by name and exists in the reader’s subset; its identity is known.
- **Does not say:** Whether the predecessor’s content matches what the author of the record intended (no digest to verify).
- **Error:** No error. The reference is complete as far as the provided fields allow.

### 4. DigestOnlyMatched
- **Situation:** Only the digest field is present (identifier absent), and at least one held record has that SHA-256.
- **Entitled to conclude:** The predecessor’s content is identified and exists in the reader’s subset; its integrity is confirmed.
- **Does not say:** Which specific record is the predecessor (multiple records could share the same content), or its identifier.
- **Error:** No error. The reference is complete as far as the provided fields allow.

### 5. FullyVerified
- **Situation:** Both identifier and digest fields are present, and a single held record’s identifier matches the identifier field and its SHA-256 matches the digest field.
- **Entitled to conclude:** The reference unambiguously and verifiably identifies the predecessor; both identity and content are confirmed.
- **Does not say:** Anything about the predecessor’s own references or the correctness of its content beyond the hash.
- **Error:** No error. The reference is fully consistent with the held predecessor.

### 6. Inconsistent
- **Situation:** Both identifier and digest fields are present, and the identifier matches one held record P while the digest matches a different held record Q.
- **Entitled to conclude:** The reference contains mutually contradictory information: the identifier and digest point to different records.
- **Does not say:** Which field (if either) is correct, or what the intended predecessor was.
- **Error:** Error by the author. The author provided two fields that cannot both be true of the same record.

### 7. DigestMismatch
- **Situation:** Both identifier and digest fields are present, the identifier matches a held record P, but no held record (including P) has the provided digest.
- **Entitled to conclude:** The digest field is incorrect for the identified predecessor P.
- **Does not say:** What the correct digest of P is, or whether the digest matches a predecessor held by another reader.
- **Error:** Error by the author. The author provided an incorrect digest for the named predecessor.

### 8. IdentifierMismatch
- **Situation:** Both identifier and digest fields are present, the digest matches a held record Q, but no held record (including Q) has the provided identifier.
- **Entitled to conclude:** The identifier field is incorrect for the content hash (i.e., the record with the provided digest has a different identifier).
- **Does not say:** What the correct identifier of Q is, or whether the identifier matches a predecessor held by another reader.
- **Error:** Error by the author. The author provided an incorrect identifier for the provided content digest.


## Boundary Justifications

- **IdentifierOnlyMatched vs DigestOnlyMatched:** Merging these loses whether the reader knows the predecessor’s identity or its content. A program counting identifier-based vs digest-based references would be misled; a person debugging would not know whether to locate the predecessor by name or by hash.
- **Inconsistent vs DigestMismatch vs IdentifierMismatch:** Merging loses the specific error type. In Inconsistent, both fields are valid but contradict; in DigestMismatch, the digest is definitively wrong; in IdentifierMismatch, the identifier is definitively wrong. A person trying to correct the record would not know which field to fix.
- **PredecessorNotHeld vs {DigestMismatch, IdentifierMismatch, Inconsistent}:** Merging loses whether the issue is absence (PredecessorNotHeld) or presence of incorrect/misaligned data. In PredecessorNotHeld, the predecessor may exist elsewhere; in the others, the reference itself is flawed regardless of other readers’ subsets.
- **FullyVerified vs {IdentifierOnlyMatched, DigestOnlyMatched}:** Merging loses the degree of verification. FullyVerified confirms both identity and content; the partial outcomes confirm only one. A program counting fully-verified chains would be misled.

**Rejected distinctions:**
- Splitting PredecessorNotHeld by which field is missing or unmatched: the actionable conclusion is the same (cannot verify), so no additional outcome is needed.


## Completeness

The set is complete. Every possible combination of field presence and match status against held records is covered: both fields absent (NoPredecessor); at least one field present with no matches (PredecessorNotHeld); only identifier present and matched (IdentifierOnlyMatched); only digest present and matched (DigestOnlyMatched); both fields present with matching the same record (FullyVerified), matching different records (Inconsistent), identifier matching but digest not (DigestMismatch), or digest matching but identifier not (IdentifierMismatch). The two boolean choices (identifier provided or not, digest provided or not) combined with the match outcomes for each field against the held set enumerate all cases, and each case maps to exactly one outcome above.