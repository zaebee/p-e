# Decision Journal

## Digest Verification

SPEC.md SHA-256: `847b8971d36390cd8843da7ebe59bc3499cd8050473425eb91a4a09f30b9901c` - **MATCHED**
AMENDMENT.md SHA-256: `abe840dcd5bb00f5ecbfb7fc6e55b8cd4aaa8e049f2c4be0f53e572c4a5d644b` - **MATCHED**

---

## DECISION 1

  clause:        MUST 1: "Allocation MUST be settled by an atomic exclusive commit, never by reading the current maximum"
  chosen:        Allocate seq numbers by attempting to create marker files `history/<seq>` with O_EXCL flag in a dedicated allocation directory
  rejected:      - Track max seq in a separate file and increment
  rejected:      - Use a database auto-increment field
  why:           Reading current maximum (max+1) cannot be made safe by care; an exclusive create already is atomic and succeeds for exactly one writer
  consequence:   An observer sees empty marker files in the history/ directory for each allocated seq; no central counter exists

## DECISION 2

  clause:        MUST 1: "each id owns a persistent allocation marker — an empty file `history/relay-NNNN` created with `wx`/`O_EXCL`"
  chosen:        Use flat seq numbers (0000, 0001, ...) for marker filenames in `history/` directory, with authority_id tracked separately in ledger
  rejected:      - Include authority_id in marker filename (e.g., `relay-0001`)
  why:           CONTRACT §2 restricts scope to one authority; including authority_id in marker names is unnecessary for single-authority implementation and would complicate the naming scheme
  consequence:   Marker files are named simply by seq (e.g., `history/0001`), authority is implicit in the store instance

## DECISION 3

  clause:        MUST 2: "An authority MUST declare the seq from which it claims G1"
  chosen:        Store G1 floor in a file `authority.json` containing `{"authority_id": "...", "g1_floor": N}`
  rejected:      - Hardcode G1 floor in the implementation
  rejected:      - Derive G1 floor from first marker file
  why:           Authority must explicitly declare; hardcoding prevents changing, deriving from markers doesn't satisfy the MUST to declare
  consequence:   Observer sees explicit G1 floor declaration separate from allocation markers

## DECISION 4

  clause:        MUST 8: "Every write that establishes a binding MUST be crash-atomic AND create-or-fail"
  chosen:        Write record content to temp file, fsync, then rename to final location (content file), then create marker file with O_EXCL, then fsync ledger entry
  rejected:      - Write directly to final location
  rejected:      - Use database transaction
  why:           Direct write isn't crash-atomic (partial writes possible); rename after fsync ensures content is durable before binding appears; O_EXCL on marker prevents duplicate allocation
  consequence:   Binding creation involves: temp content → fsync → rename → O_EXCL marker creation → ledger update with fsync

## DECISION 5

  clause:        MUST 8: "create-or-fail: a write to an id already held FAILS rather than replacing what is there"
  chosen:        O_EXCL on marker file creation fails if file exists; also check ledger before any write
  rejected:      - Overwrite existing record
  rejected:      - Return error after partial write
  why:           O_EXCL provides atomic create-or-fail at filesystem level; checking ledger first catches logical duplicates before any filesystem operation
  consequence:   Duplicate binding attempt fails cleanly with no side effects

## DECISION 6

  clause:        MUST 3 (as amended by AMENDMENT): "Record identity and content identity are different things, and the derivation between them runs one way only: record identity MUST NOT derive from content identity"
  chosen:        Record identity = `(authority_id, seq)` allocated sequentially; content identity = sha256(bound-content); these are stored separately and never computed from each other
  rejected:      - Use content hash as record identity
  rejected:      - Derive seq from content
  why:           Record identity must be allocated, never computed from bound-content; content MAY contain a declared id but record identity is separate
  consequence:   Records with identical content have different record identities and same content identity; lookups by record identity return the specific binding

## DECISION 7

  clause:        MUST 9.2: "A candidate MUST begin with the octets `@p-e/x0`"
  chosen:        Reject any candidate not starting with exact bytes `@p-e/x0` (UTF-8: 0x40 0x70 0x2D 0x65 0x2F 0x78 0x30)
  rejected:      - Accept any candidate
  rejected:      - Check for prefix after normalization
  why:           Admission is tested on candidate as delivered, before any framing; normalization would violate MUST 9.3 (fidelity)
  consequence:   Candidates without `@p-e/x0` prefix are refused at admission

## DECISION 8

  clause:        MUST 9.2: "A candidate that is not valid UTF-8 ... is refused"
  chosen:        Validate UTF-8 using strict decoder (no overlong forms, no encoded surrogates, no truncated sequences per Unicode 15.0 Table 3-7)
  rejected:      - Accept invalid UTF-8
  rejected:      - Use lenient decoder that replaces invalid sequences
  why:           MUST 9.2 explicitly requires refusal; lenient decoding would violate MUST 9.3 (fidelity) and MUST 9.4 (no substitution)
  consequence:   Candidates with invalid UTF-8 are refused at admission

## DECISION 9

  clause:        MUST 10.1: "A store MUST record the content identity at the moment of binding, and MUST verify it against bound-content on every read"
  chosen:        Store digest in ledger entry alongside (authority_id, seq, extent); on read, recompute sha256 and compare
  rejected:      - Recompute digest on every read without storing
  rejected:      - Trust stored content without verification
  why:           Recorded digest is required for verification; recomputing without recording provides no evidence; trusting without verification violates MUST 10.1
  consequence:   Ledger contains content identity; every read includes verification step

## DECISION 10

  clause:        MUST 10.4: "On a read, admission (9.2) is tested before verification (10.1)"
  chosen:        On read: check content starts with `@p-e/x0` and is valid UTF-8 first; only if admission passes, verify digest
  rejected:      - Verify digest first, then check admission
  rejected:      - Check admission only at write time
  why:           MUST 10.4 explicitly orders admission before verification; checking only at write would violate "on every read"
  consequence:   If admission fails on read, verification is not performed and admission failure is reported

## DECISION 11

  clause:        MUST 10.3: "The verdict when the recorded and recomputed content identities disagree is not defined by this document" (OPEN)
  chosen:        On digest mismatch, return error indicating verification failure (VERIFICATION_FAILED) rather than returning content
  rejected:      - Return content anyway with warning
  rejected:      - Silently log and return content
  why:           Must not return inconsistent data; silent logging hides failures; OPEN status means implementation can choose, but returning unverified content violates the spirit of MUST 10.1
  consequence:   Observer sees explicit verification failure rather than potentially corrupted content

## DECISION 12

  clause:        MUST 6: "Visibility state is exposed honestly: PRESENT / KNOWN_MISSING / UNKNOWN"
  chosen:        - PRESENT: record content exists and verifies
  chosen:        - KNOWN_MISSING: ledger entry exists but content file missing (deletion case)
  chosen:        - UNKNOWN: no ledger entry for this (authority_id, seq)
  rejected:      - Map deletion to UNKNOWN
  rejected:      - Return error for missing content
  why:           MUST 6 explicitly distinguishes quiet window (UNKNOWN) from known missing (KNOWN_MISSING); error would conflate failure with absence
  consequence:   Observer can distinguish between "never existed", "existed but deleted", and "exists and is verifiable"

## DECISION 13

  clause:        MUST 4: "A conforming authority's ledger is non-rewindable: a bound (authority, seq) never changes its digest"
  chosen:        Ledger is append-only file with entries: `seq,digest,extent,timestamp`; once written, never modified
  rejected:      - Overwrite ledger entries
  rejected:      - Use versioned ledger entries
  why:           Non-rewindable means once bound, never changes; versioning would allow "changing" via new version; overwriting violates the guarantee
  consequence:   Ledger file grows monotonically; each (authority, seq) appears exactly once

## DECISION 14

  clause:        AMENDMENT MUST 9.1: "Bound-content is the candidate's octets in full. A store MUST NOT derive extent from the content of a candidate, and MUST record the extent at binding"
  chosen:        Store extent (byte length) in ledger; extent is the length of the candidate as delivered, not derived from content
  rejected:      - Compute extent from content at read time
  rejected:      - Store only content, derive extent when needed
  why:           Extent is property of the offer, never derived from octets; must record at binding
  consequence:   Ledger contains extent; observer can see original byte length independent of content interpretation

## DECISION 15

  clause:        MUST 1 and AMENDMENT definitions: record identity allocated by store
  chosen:        Authority_id is a configuration parameter set at store initialization; seq numbers start from 0 (or g1_floor) and increment by 1
  rejected:      - Extract authority_id from candidate content
  rejected:      - Use timestamp as part of identity
  why:           Record identity is allocated by store, not derived from content; timestamp-based identity would violate "never reuse a seq" requirement
  consequence:   Record identity is predictable and sequential within authority

## DECISION 16

  clause:        MUST 8: "flushing the record and the directory entry that names it"
  chosen:        After writing content file, call fsync on both the file and its parent directory to ensure directory entry is durable
  rejected:      - Only fsync the content file
  rejected:      - Rely on OS to flush directory eventually
  why:           MUST 8 explicitly requires flushing "the directory entry that names it"; only fsyncing file doesn't guarantee directory entry durability
  consequence:   Binding creation includes explicit fsync on directory after rename

## DECISION 17

  clause:        MUST 7: "The absence of a witness is reported as absence, never as 'no evidence found'"
  chosen:        Witnessing is MAY, not MUST; for this single-authority implementation without witnessing, absence of witness is not applicable - we report visibility state based on ledger/content presence
  rejected:      - Implement witnessing and report witness absence
  rejected:      - Return "no evidence" for missing records
  why:           Witnessing is in MAY section (optional); MUST 7 only applies when witnessing is implemented; "no evidence" is prohibited wording
  consequence:   Implementation does not include witnessing; visibility states are based on ledger and content file presence only

## DECISION 18

  clause:        CONTRACT §2: "Build a store for one authority"
  chosen:        Hardcode single authority_id in store configuration; all operations are for this one authority
  rejected:      - Support multiple authorities in one store instance
  rejected:      - Make authority_id a per-record parameter
  why:           Multi-authority is explicitly out of scope; per-record authority would require cross-authority handling which is deferred
  consequence:   Store operates on single authority namespace; authority_id is fixed at initialization

