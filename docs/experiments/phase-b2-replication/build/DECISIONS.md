DECISION 1
  clause:        MUST 8: "Every write that establishes a binding MUST be crash-atomic AND create-or-fail." and MUST 1: "Allocation MUST be settled by an atomic exclusive commit"
  chosen:        Use SQLite database with atomic transactions and unique constraints for allocation
  rejected:      Filesystem-based approach with separate marker files (history/), record files (records/), and ledger files
  why:           SQLite provides native atomic transactions, crash recovery via journaling, and unique constraints that satisfy create-or-fail semantics. A filesystem approach would require manual implementation of atomicity across multiple files and directories, with complex crash recovery logic.
  consequence:   External behavior is identical (atomic binding establishment). Internal storage differs: SQLite uses a single database file instead of multiple filesystem objects. No .tmp files are visible externally during binding.

DECISION 2
  clause:        MUST 2: "An authority MUST declare the seq from which it claims G1, and MUST NOT claim G1 below it."
  chosen:        The store's G1 floor is stored in a configuration file (g1_floor.json) and defaults to 0 for a new authority
  rejected:      Hardcode the floor to 0, or derive it from the highest existing seq
  why:           The clause requires the authority to declare its floor. A configurable floor allows the store to be initialized with a specific starting point. Deriving from highest seq would violate MUST 1's requirement that allocation never uses max+1.
  consequence:   A new authority starts at seq 0 by default. An authority with history can be configured to start at a higher floor. The floor is checked on allocation: attempting to allocate below the floor fails.

DECISION 3
  clause:        MUST 3 (amended): "record identity MUST NOT derive from content identity"
  chosen:        Record identity is (authority_id, seq) allocated sequentially via database autoincrement within authority namespace
  rejected:      Deriving record identity from hash of content, or from timestamp
  why:           The amendment explicitly prohibits deriving record identity from content identity. Sequential allocation via unique database keys satisfies the requirement that identity is allocated, not computed.
  consequence:   Record identities are predictable sequential numbers within an authority, not cryptographic hashes. This matches the spec's examples (relay-NNNN).

DECISION 4
  clause:        MUST 9.2: "A candidate MUST begin with the octets @p-e/x0"
  chosen:        Validate that the candidate's first 6 bytes are exactly b'@p-e/x0'
  rejected:      Case-insensitive matching, or allowing whitespace before the prefix
  why:           The clause specifies exact octets. Octet comparison is exact and case-sensitive. @p-e/x0 is 6 specific ASCII characters.
  consequence:   Candidates not starting with exactly these 6 bytes are refused. No normalization or case conversion is applied.

DECISION 5
  clause:        MUST 9.2: "A candidate that is not valid UTF-8 ... is refused"
  chosen:        Use strict UTF-8 validation per Unicode 15.0 Table 3-7, rejecting overlong forms, encoded surrogates, and truncated sequences
  rejected:      Accept any byte sequence, or use lenient UTF-8 decoding
  why:           The clause explicitly requires Unicode 15.0 Table 3-7 well-formedness with no overlong forms, no encoded surrogates, and no truncated sequences.
  consequence:   Invalid UTF-8 candidates are refused at admission. Valid UTF-8 candidates are stored exactly as received.

DECISION 6
  clause:        MUST 9.3: "A store MUST store bound-content octet for octet as it arrived. It MUST NOT trim, pad, append to, re-encode, or otherwise normalise it."
  chosen:        Store candidate bytes exactly as received in a SQLite BLOB column
  rejected:      Store as text after decoding, or normalize line endings
  why:           The clause prohibits any modification of the octet sequence. BLOB storage preserves exact bytes without interpretation.
  consequence:   Bound-content is stored without any transformation. Reading returns the exact same bytes that were admitted.

DECISION 7
  clause:        MUST 10.1: "A store MUST record the content identity at the moment of binding, and MUST verify it against bound-content on every read"
  chosen:        Store SHA-256 digest as a hex string in the ledger table, verify by recomputing SHA-256 on read and comparing to stored digest
  rejected:      Recompute digest on every read without storing it, or store in a separate file
  why:           MUST 10.1 requires recording the digest at binding time. Storing in the database alongside the ledger entry ensures it's recorded atomically with the binding.
  consequence:   Each read performs a SHA-256 computation. The stored digest is never trusted without verification against current content.

DECISION 8
  clause:        MUST 10.3: "OPEN. The verdict when the recorded and recomputed content identities disagree is not defined by this document."
  chosen:        When verification fails, raise a VerificationError with both digests, and report visibility as PRESENT but integrity as FAILED
  rejected:      Silently return the content anyway, or delete the record, or mark it as KNOWN_MISSING
  why:           The clause explicitly leaves this verdict undefined. However, MUST 10.2 says verification establishes consistency, and MUST 6 requires honest reporting. Returning content with a clear error satisfies honesty without inventing behavior.
  consequence:   Clients receive a VerificationError when digests disagree. The record remains in PRESENT state (bytes are retrievable) but verification fails. This distinguishes visibility from integrity per MUST 10.2-10.3.

DECISION 9
  clause:        MUST 10.4: "On a read, admission (9.2) is tested before verification (10.1)."
  chosen:        Read operations first validate the candidate format (prefix and UTF-8), then verify the content identity
  rejected:      Verify content identity first, or do both in parallel
  why:           The clause explicitly orders admission before verification. If admission fails, we report that without attempting verification.
  consequence:   A record with corrupt content that also fails admission is reported as admission failure, not verification failure.

DECISION 10
  clause:        MUST 10.5: "A store MUST distinguish records bound with a recorded content identity from records bound without one, and MUST NOT report the latter as verified."
  chosen:        All records bound under this implementation have recorded content identities (stored in ledger.digest). Legacy records without recorded identities would be stored with digest=None and reported as unverified.
  rejected:      Always compute and store digest, making all records verified
  why:           The clause requires distinguishing. While this implementation always records digests, the mechanism supports records without recorded digests (digest=NULL in database).
  consequence:   All records created by this store are verified. If a legacy import mechanism were added, it could set digest=None and would be reported as unverified.

DECISION 11
  clause:        MUST 6: "Visibility state is exposed honestly: PRESENT / KNOWN_MISSING / UNKNOWN"
  chosen:        Read operations return a Result object with status in {PRESENT, KNOWN_MISSING, UNKNOWN} and content. KNOWN_MISSING is returned when the ledger entry exists but content is missing. UNKNOWN when neither ledger nor marker exists.
  rejected:      Only return content or raise exceptions, or use different state names
  why:           The clause requires these exact states and honest reporting. The distinction between missing content (KNOWN_MISSING) and unknown binding (UNKNOWN) is explicit in the spec.
  consequence:   Clients can distinguish between a record that is known to be missing vs one that may or may not exist.

DECISION 12
  clause:        MUST 4: "A conforming authority's ledger is non-rewindable: a bound (authority, seq) never changes its digest."
  chosen:        The ledger table has (authority_id, seq) as primary key. Once a ledger entry is committed, it cannot be updated or deleted (database constraints prevent modification).
  rejected:      Allow ledger updates, or use append-only log without uniqueness constraint
  why:           Non-rewindable means once bound, the digest cannot change. Database primary key constraints prevent updates to existing (authority_id, seq) entries.
  consequence:   Attempting to rebind an existing (authority_id, seq) fails with an error. The original binding is preserved.

DECISION 13
  clause:        MUST 5: "parent, when present, is scoped to the same authority. Cross-authority references MUST be labelled as observations."
  chosen:        The store only implements single authority (per CONTRACT.md §2). Parent field, if present in content, is validated to reference the same authority. Cross-authority references are not supported (out of scope).
  rejected:      Implement cross-authority parent references with observation labeling
  why:           CONTRACT.md §2 explicitly states: "Build a store for one authority. Out of scope ... more than one authority, and cross-authority history." Cross-authority is deferred per SPEC.md §407.
  consequence:   The store does not support multiple authorities. Parent references to other authorities are not accepted. All parent references are assumed to be same-authority.

DECISION 14
  clause:        CONTRACT.md §2: "Out of scope ... deletion, migration of an existing corpus, crash recovery"
  chosen:        The store does not implement deletion. Once a record is bound, it cannot be deleted. Migration is out of scope. Crash recovery is handled by SQLite's journaling.
  rejected:      Implement a delete operation
  why:           CONTRACT.md §2 explicitly excludes deletion from scope. MUST 6's Deletion case describes behavior for a store that has deletion, but this store does not.
  consequence:   Records can only be added, never removed. The store always grows. No delete API is provided.

DECISION 15
  clause:        MUST 7: "The absence of a witness is reported as absence, never as 'no evidence found'."
  chosen:        The store does not implement witnessing (it is MAY, not MUST). Absence of witness functionality means witness queries return an error or NotImplemented. When witnessing is added, absence would be reported as absence.
  rejected:      Implement full witnessing with absence reporting
  why:           Witnessing is listed under MAY in SPEC.md §206. It is not required for a conforming store. The clause about reporting absence only applies if witnessing is implemented.
  consequence:   The store does not support witness queries. Attempting to query witnesses returns an error indicating the feature is not implemented.

DECISION 16
  clause:        Amendment MUST 9.4: "Content identity is computed over octets, never over a decoded string."
  chosen:        Compute SHA-256 over the raw byte sequence of the candidate, never over a decoded Unicode string
  rejected:      Decode to string first, then compute digest over the string representation
  why:           The clause explicitly requires octet-level digestion. Decoding to string would be a normalization step that could change the effective content (e.g., replacing invalid sequences).
  consequence:   Two candidates with the same decoded string but different byte representations (e.g., different UTF-8 encodings of the same character) have different content identities.

DECISION 17
  clause:        Multiple MUSTs require persistent storage that survives crashes
  chosen:        Use SQLite with PRAGMA synchronous = FULL and PRAGMA journal_mode = WAL for crash durability
  rejected:      Use in-memory database, or filesystem without fsync
  why:           MUST 8 requires crash-atomic writes. SQLite with FULL synchronous mode fsyncs the database file on every commit, ensuring durability.
  consequence:   Performance may be slower due to fsync on every commit, but durability is guaranteed.

DECISION 18
  clause:        CONTRACT.md §2: "Choose your own language and runtime."
  chosen:        Implement in Python 3 using only the standard library (sqlite3, hashlib, etc.)
  rejected:      Use Rust, Go, or other language; use external dependencies
  why:           Python is widely available, and the standard library contains all necessary components (SQLite, SHA-256, filesystem operations).
  consequence:   The implementation requires Python 3.7+ (for sqlite3 features and typing). No external packages needed.
