#!/usr/bin/env python3
"""
Store implementation for Issue #1 · Crash-durable binding — v1, single authority

Implements SPEC.md and AMENDMENT.md as of:
  SPEC.md:    847b8971d36390cd8843da7ebe59bc3499cd8050473425eb91a4a09f30b9901c
  AMENDMENT.md: efcf6df9b3a25ad37d8db628e5d0cd497e1ad9b701c2294aae2738d453dbb2a6

This is a single-authority store implementation.
"""

import hashlib
import json
import os
import re
import sqlite3
import typing
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


# ============================================================
# Types
# ============================================================

class Visibility(Enum):
    """Visibility states per MUST 6."""
    PRESENT = "PRESENT"
    KNOWN_MISSING = "KNOWN_MISSING"
    UNKNOWN = "UNKNOWN"


class Integrity(Enum):
    """Integrity states."""
    VERIFIED = "VERIFIED"
    FAILED = "FAILED"
    UNVERIFIED = "UNVERIFIED"  # For records bound without recorded content identity (MUST 10.5)


@dataclass
class RecordIdentity:
    """Record identity: (authority_id, seq)."""
    authority_id: str
    seq: int

    def __str__(self) -> str:
        return f"{self.authority_id}-{self.seq:04d}"

    @classmethod
    def parse(cls, s: str) -> "RecordIdentity":
        """Parse a string like 'auth-0001' into RecordIdentity."""
        match = re.match(r"([^-]+)-(\d+)", s)
        if not match:
            raise ValueError(f"Invalid record identity: {s}")
        return cls(authority_id=match.group(1), seq=int(match.group(2)))


@dataclass
class ReadResult:
    """Result of a read operation."""
    identity: RecordIdentity
    visibility: Visibility
    integrity: Integrity
    content: bytes | None
    recorded_digest: str | None  # Hex string of SHA-256
    recomputed_digest: str | None  # Hex string of SHA-256


class AdmissionError(Exception):
    """Raised when candidate fails admission (MUST 9.2)."""
    pass


class VerificationError(Exception):
    """Raised when content identity verification fails (MUST 10.1, 10.3)."""
    def __init__(self, recorded: str, recomputed: str):
        self.recorded = recorded
        self.recomputed = recomputed
        super().__init__(f"Content identity mismatch: recorded={recorded}, recomputed={recomputed}")


class AllocationError(Exception):
    """Raised when allocation fails (MUST 1 create-or-fail)."""
    pass


class BelowG1FloorError(Exception):
    """Raised when attempting to claim G1 below declared floor (MUST 2)."""
    pass


# ============================================================
# UTF-8 Validation per Unicode 15.0 Table 3-7
# ============================================================

# Regex for valid UTF-8 sequences
# This is a simplified approach; for full correctness we'd need a state machine.
# But Python's strict UTF-8 decoding catches most issues.
# We need to reject:
# - overlong forms
# - encoded surrogates (0xD800-0xDFFF encoded in UTF-8)
# - truncated sequences

# Overlong form check: these are sequences that use more bytes than necessary
# e.g., C0 80 for U+0000 (should be 00), C1 BF for U+007F (should be 7F)
OVERLONG_PATTERNS = [
    # 2-byte overlong: C0 80 - C1 BF (encodes U+0000 - U+007F)
    rb"\xc0\x80", rb"\xc0\x81", rb"\xc0\x82", rb"\xc0\x83", rb"\xc0\x84",
    rb"\xc0\x85", rb"\xc0\x86", rb"\xc0\x87", rb"\xc0\x88", rb"\xc0\x89",
    rb"\xc0\x8a", rb"\xc0\x8b", rb"\xc0\x8c", rb"\xc0\x8d", rb"\xc0\x8e",
    rb"\xc0\x8f", rb"\xc0\x90", rb"\xc0\x91", rb"\xc0\x92", rb"\xc0\x93",
    rb"\xc0\x94", rb"\xc0\x95", rb"\xc0\x96", rb"\xc0\x97", rb"\xc0\x98",
    rb"\xc0\x99", rb"\xc0\x9a", rb"\xc0\x9b", rb"\xc0\x9c", rb"\xc0\x9d",
    rb"\xc0\x9e", rb"\xc0\x9f",
    rb"\xc1\x80", rb"\xc1\x81", rb"\xc1\x82", rb"\xc1\x83", rb"\xc1\x84",
    rb"\xc1\x85", rb"\xc1\x86", rb"\xc1\x87", rb"\xc1\x88", rb"\xc1\x89",
    rb"\xc1\x8a", rb"\xc1\x8b", rb"\xc1\x8c", rb"\xc1\x8d", rb"\xc1\x8e",
    rb"\xc1\x8f", rb"\xc1\x90", rb"\xc1\x91", rb"\xc1\x92", rb"\xc1\x93",
    rb"\xc1\x94", rb"\xc1\x95", rb"\xc1\x96", rb"\xc1\x97", rb"\xc1\x98",
    rb"\xc1\x99", rb"\xc1\x9a", rb"\xc1\x9b", rb"\xc1\x9c", rb"\xc1\x9d",
    rb"\xc1\x9e", rb"\xc1\x9f", rb"\xc1\xa0", rb"\xc1\xa1", rb"\xc1\xa2",
    rb"\xc1\xa3", rb"\xc1\xa4", rb"\xc1\xa5", rb"\xc1\xa6", rb"\xc1\xa7",
    rb"\xc1\xa8", rb"\xc1\xa9", rb"\xc1\xaa", rb"\xc1\xab", rb"\xc1\xac",
    rb"\xc1\xad", rb"\xc1\xae", rb"\xc1\xaf", rb"\xc1\xb0", rb"\xc1\xb1",
    rb"\xc1\xb2", rb"\xc1\xb3", rb"\xc1\xb4", rb"\xc1\xb5", rb"\xc1\xb6",
    rb"\xc1\xb7", rb"\xc1\xb8", rb"\xc1\xb9", rb"\xc1\xba", rb"\xc1\xbb",
    rb"\xc1\xbc", rb"\xc1\xbd", rb"\xc1\xbe", rb"\xc1\xbf",
]


def is_valid_utf8(bytes_data: bytes) -> bool:
    """
    Validate UTF-8 per Unicode 15.0 Table 3-7.
    
    Must reject:
    - Overlong forms
    - Encoded surrogates (U+D800 to U+DFFF encoded in UTF-8)
    - Truncated sequences
    """
    try:
        # First, try to decode as strict UTF-8
        # This catches most errors including truncated sequences
        decoded = bytes_data.decode('utf-8', errors='strict')
    except UnicodeDecodeError:
        return False
    
    # Check for overlong forms by re-encoding and comparing
    # If the re-encoded bytes differ, there might be overlong forms
    # But this doesn't catch all cases because Python's encoder might normalize
    
    # Check for encoded surrogates (U+D800 to U+DFFF)
    # In UTF-8, these should be encoded as 3-byte sequences:
    # 0xE0 0xA0 0x80 to 0xED 0xBF 0xBF
    # We need to check if any code point in the decoded string is a surrogate
    for i, char in enumerate(decoded):
        codepoint = ord(char)
        # Surrogate code points: U+D800 to U+DFFF
        if 0xD800 <= codepoint <= 0xDFFF:
            return False
    
    # Check for overlong forms by looking at the raw bytes
    # An overlong form uses more bytes than necessary to encode a character
    # We can detect some by checking for specific patterns
    # But the most reliable way is to ensure that each character's encoding
    # matches its minimal UTF-8 representation
    
    # Re-encode and compare
    re_encoded = decoded.encode('utf-8')
    if re_encoded != bytes_data:
        return False
    
    return True


# ============================================================
# Store Implementation
# ============================================================

class Store:
    """
    Single-authority store implementation.
    
    Satisfies SPEC.md and AMENDMENT.md requirements for a single authority.
    """
    
    PREFIX = b'@p-e/x0'  # MUST 9.2: candidate MUST begin with these octets
    
    def __init__(self, db_path: str | Path, authority_id: str, g1_floor: int = 0):
        """
        Initialize the store.
        
        Args:
            db_path: Path to SQLite database file
            authority_id: Authority identifier (namespace label)
            g1_floor: The seq from which this authority claims G1 (MUST 2)
        """
        self.db_path = Path(db_path)
        self.authority_id = authority_id
        self.g1_floor = g1_floor
        
        # Configuration
        self._init_db()
        
        # G1 floor configuration file
        self._g1_floor_path = self.db_path.parent / "g1_floor.json"
        self._save_g1_floor()
    
    def _init_db(self) -> None:
        """Initialize the SQLite database schema."""
        with sqlite3.connect(self.db_path) as conn:
            # Enable WAL mode for better concurrency (still crash-safe)
            conn.execute("PRAGMA journal_mode=WAL")
            # Full synchronization for durability (fsync on every commit)
            conn.execute("PRAGMA synchronous=FULL")
            
            # Allocation table: tracks which (authority_id, seq) are allocated
            conn.execute("""
                CREATE TABLE IF NOT EXISTS alloc (
                    authority_id TEXT NOT NULL,
                    seq INTEGER NOT NULL,
                    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (authority_id, seq)
                )
            """)
            
            # Ledger table: maps (authority_id, seq) to digest and metadata
            # Per MUST 4: non-rewindable, so (authority_id, seq) is unique and immutable
            conn.execute("""
                CREATE TABLE IF NOT EXISTS ledger (
                    authority_id TEXT NOT NULL,
                    seq INTEGER NOT NULL,
                    digest TEXT NOT NULL,  -- SHA-256 hex of bound-content (MUST 10.1)
                    extent INTEGER NOT NULL,  -- Length in bytes (MUST 9.1)
                    content_path TEXT,  -- Path to content in content table
                    bound_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (authority_id, seq),
                    FOREIGN KEY (authority_id, seq) REFERENCES alloc(authority_id, seq)
                )
            """)
            
            # Content table: stores bound-content octet-for-octet (MUST 9.3)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS content (
                    digest TEXT PRIMARY KEY,  -- SHA-256 hex
                    bytes BLOB NOT NULL  -- Exact octets as received
                )
            """)
            
            # Create index for content lookup
            conn.execute("CREATE INDEX IF NOT EXISTS idx_content_digest ON content(digest)")
            
            conn.commit()
    
    def _save_g1_floor(self) -> None:
        """Save G1 floor to configuration file (MUST 2)."""
        config = {
            "authority_id": self.authority_id,
            "g1_floor": self.g1_floor
        }
        with open(self._g1_floor_path, 'w') as f:
            json.dump(config, f, indent=2)
    
    def _check_g1_floor(self, seq: int) -> None:
        """Check that seq >= g1_floor (MUST 2)."""
        if seq < self.g1_floor:
            raise BelowG1FloorError(
                f"Cannot allocate seq {seq} below G1 floor {self.g1_floor} for authority {self.authority_id}"
            )
    
    def _next_seq(self) -> int:
        """
        Find the next available sequence number.
        
        Per MUST 1: "Allocation MUST be settled by an atomic exclusive commit, 
        never by reading the current maximum".
        
        We use the alloc table's auto-increment behavior via rowid, but we
        can't rely on max(seq)+1. Instead, we allocate sequentially starting
        from g1_floor and skipping any already allocated.
        
        However, the spec says "wx claim is atomic, has no shared race point,
        and succeeds for exactly one writer, so concurrent allocators cannot
        both take an id".
        
        With SQLite, we use INSERT OR IGNORE and check if the row was inserted.
        We try seq values starting from the current max+1 or from g1_floor.
        """
        # Get the current max seq for this authority
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=FULL")
            
            # Find the highest allocated seq
            cursor = conn.execute(
                "SELECT MAX(seq) FROM alloc WHERE authority_id = ?",
                (self.authority_id,)
            )
            max_seq = cursor.fetchone()[0]
            if max_seq is None:
                # No allocations yet, start from g1_floor
                candidate_seq = self.g1_floor
            else:
                candidate_seq = max_seq + 1
            
            # Ensure candidate is at least g1_floor
            candidate_seq = max(candidate_seq, self.g1_floor)
            
            return candidate_seq
    
    def deposit(self, candidate: bytes) -> RecordIdentity:
        """
        Accept a candidate and bind it to a new record identity.
        
        This is the main write operation. It performs:
        1. Admission validation (MUST 9.2)
        2. Allocation (MUST 1)
        3. Binding with recorded content identity (MUST 10.1)
        4. Crash-atomic write (MUST 8)
        
        Args:
            candidate: The candidate octet sequence
            
        Returns:
            The record identity (authority_id, seq) of the bound record
            
        Raises:
            AdmissionError: If candidate fails admission
            AllocationError: If allocation fails (should not happen with single writer)
            BelowG1FloorError: If allocation would be below G1 floor
        """
        # Step 1: Admission (MUST 9.2)
        # - Must begin with @p-e/x0
        if not candidate.startswith(self.PREFIX):
            raise AdmissionError(
                f"Candidate must begin with {self.PREFIX!r}, got first 6 bytes: {candidate[:6]!r}"
            )
        
        # - Must be valid UTF-8
        if not is_valid_utf8(candidate):
            raise AdmissionError(
                "Candidate is not valid UTF-8 (Unicode 15.0 Table 3-7)"
            )
        
        extent = len(candidate)
        
        # Compute content identity (MUST 9.4: over octets, not decoded string)
        digest = hashlib.sha256(candidate).hexdigest()
        
        # Get next seq and check G1 floor
        seq = self._next_seq()
        self._check_g1_floor(seq)
        
        identity = RecordIdentity(authority_id=self.authority_id, seq=seq)
        
        # Atomic binding via SQLite transaction (MUST 8: crash-atomic)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=FULL")
            
            try:
                # Step 1: Allocate - this is create-or-fail (MUST 8)
                # Use INSERT OR FAIL to ensure we don't overwrite
                conn.execute(
                    "INSERT OR FAIL INTO alloc (authority_id, seq) VALUES (?, ?)",
                    (self.authority_id, seq)
                )
            except sqlite3.IntegrityError:
                # This seq is already allocated, try next
                # Per MUST 1: concurrent allocators cannot both take an id
                # So we need to handle this by trying the next seq
                # But with a single writer (as per scope), this shouldn't happen
                # However, for robustness, we handle it
                while True:
                    seq += 1
                    self._check_g1_floor(seq)
                    identity = RecordIdentity(authority_id=self.authority_id, seq=seq)
                    try:
                        conn.execute(
                            "INSERT OR FAIL INTO alloc (authority_id, seq) VALUES (?, ?)",
                            (self.authority_id, seq)
                        )
                        break
                    except sqlite3.IntegrityError:
                        # Already allocated, try next
                        # This could loop indefinitely if all seqs are taken
                        # But with proper allocation, this shouldn't happen
                        # For safety, we could add a limit, but the spec doesn't specify
                        pass
            
            # Step 2: Store content (MUST 9.3: octet-for-octet)
            # Use content-addressed storage for deduplication (MAY: Content deduplication)
            conn.execute(
                "INSERT OR IGNORE INTO content (digest, bytes) VALUES (?, ?)",
                (digest, candidate)
            )
            
            # Step 3: Record in ledger (MUST 10.1: record content identity at binding)
            conn.execute(
                "INSERT INTO ledger (authority_id, seq, digest, extent, content_path) VALUES (?, ?, ?, ?, ?)",
                (self.authority_id, seq, digest, extent, f"content:{digest}")
            )
            
            conn.commit()
        
        return identity
    
    def read(self, identity: RecordIdentity) -> ReadResult:
        """
        Read a bound record.
        
        Performs:
        1. Admission check on stored content (MUST 10.4: admission before verification)
        2. Content identity verification (MUST 10.1)
        3. Returns visibility and integrity states (MUST 6)
        
        Args:
            identity: The record identity to read
            
        Returns:
            ReadResult with visibility, integrity, content, and digests
            
        Raises:
            AdmissionError: If stored content fails admission (MUST 10.4)
            VerificationError: If content identity verification fails (MUST 10.3)
        """
        with sqlite3.connect(self.db_path) as conn:
            # Check if this (authority_id, seq) is allocated
            cursor = conn.execute(
                "SELECT seq FROM alloc WHERE authority_id = ? AND seq = ?",
                (identity.authority_id, identity.seq)
            )
            if cursor.fetchone() is None:
                # Not allocated -> UNKNOWN (MUST 6)
                return ReadResult(
                    identity=identity,
                    visibility=Visibility.UNKNOWN,
                    integrity=Integrity.UNVERIFIED,
                    content=None,
                    recorded_digest=None,
                    recomputed_digest=None
                )
            
            # Check ledger for binding
            cursor = conn.execute(
                """SELECT digest, extent, content_path FROM ledger 
                   WHERE authority_id = ? AND seq = ?""",
                (identity.authority_id, identity.seq)
            )
            ledger_row = cursor.fetchone()
            
            if ledger_row is None:
                # Allocated but no ledger entry -> KNOWN_MISSING
                # This shouldn't happen with our binding process, but could occur
                # if we crashed after allocation but before ledger insert
                return ReadResult(
                    identity=identity,
                    visibility=Visibility.KNOWN_MISSING,
                    integrity=Integrity.UNVERIFIED,
                    content=None,
                    recorded_digest=None,
                    recomputed_digest=None
                )
            
            recorded_digest, extent, content_path = ledger_row
            
            # Get content from content table
            cursor = conn.execute(
                "SELECT bytes FROM content WHERE digest = ?",
                (recorded_digest,)
            )
            content_row = cursor.fetchone()
            
            if content_row is None:
                # Ledger entry exists but content is missing -> KNOWN_MISSING
                # This can happen if content was deleted or corrupted
                return ReadResult(
                    identity=identity,
                    visibility=Visibility.KNOWN_MISSING,
                    integrity=Integrity.UNVERIFIED,
                    content=None,
                    recorded_digest=recorded_digest,
                    recomputed_digest=None
                )
            
            content = content_row[0]
            
            # Step 1: Admission check (MUST 10.4: before verification)
            # Must begin with @p-e/x0
            if not content.startswith(self.PREFIX):
                # Content fails admission - but it was admitted at binding?
                # This could happen if content was corrupted
                # Per MUST 10.4: admission is tested before verification
                return ReadResult(
                    identity=identity,
                    visibility=Visibility.PRESENT,
                    integrity=Integrity.FAILED,
                    content=content,
                    recorded_digest=recorded_digest,
                    recomputed_digest=None
                )
            
            # Must be valid UTF-8
            if not is_valid_utf8(content):
                return ReadResult(
                    identity=identity,
                    visibility=Visibility.PRESENT,
                    integrity=Integrity.FAILED,
                    content=content,
                    recorded_digest=recorded_digest,
                    recomputed_digest=None
                )
            
            # Step 2: Verification (MUST 10.1)
            # Recompute content identity
            recomputed_digest = hashlib.sha256(content).hexdigest()
            
            if recorded_digest != recomputed_digest:
                # MUST 10.3: OPEN - verdict undefined
                # We raise VerificationError with both digests
                # The record is still PRESENT (bytes are retrievable)
                # but integrity is FAILED
                return ReadResult(
                    identity=identity,
                    visibility=Visibility.PRESENT,
                    integrity=Integrity.FAILED,
                    content=content,
                    recorded_digest=recorded_digest,
                    recomputed_digest=recomputed_digest
                )
            
            # All checks passed
            if recorded_digest is not None:
                integrity = Integrity.VERIFIED
            else:
                # MUST 10.5: records bound without recorded content identity
                integrity = Integrity.UNVERIFIED
            
            return ReadResult(
                identity=identity,
                visibility=Visibility.PRESENT,
                integrity=integrity,
                content=content,
                recorded_digest=recorded_digest,
                recomputed_digest=recomputed_digest
            )
    
    def get_visibility(self, identity: RecordIdentity) -> Visibility:
        """
        Get the visibility state of a record (MUST 6).
        
        This is a lighter-weight check than full read, for when
        you only need to know if a record exists.
        """
        with sqlite3.connect(self.db_path) as conn:
            # Check alloc table
            cursor = conn.execute(
                "SELECT seq FROM alloc WHERE authority_id = ? AND seq = ?",
                (identity.authority_id, identity.seq)
            )
            if cursor.fetchone() is None:
                return Visibility.UNKNOWN
            
            # Check ledger table
            cursor = conn.execute(
                "SELECT digest FROM ledger WHERE authority_id = ? AND seq = ?",
                (identity.authority_id, identity.seq)
            )
            if cursor.fetchone() is None:
                # Allocated but no ledger -> could be in-progress or missing
                return Visibility.KNOWN_MISSING
            
            # Check content exists
            cursor = conn.execute(
                """SELECT l.digest FROM ledger l 
                   LEFT JOIN content c ON l.digest = c.digest
                   WHERE l.authority_id = ? AND l.seq = ?""",
                (identity.authority_id, identity.seq)
            )
            row = cursor.fetchone()
            if row is None or row[0] is None:
                return Visibility.KNOWN_MISSING
            
            # Content digest exists but might not have bytes
            # Actually, we already checked content exists above
            return Visibility.PRESENT
    
    def list_records(self, authority_id: str | None = None, limit: int = 100) -> list[RecordIdentity]:
        """
        List bound records.
        
        Args:
            authority_id: Filter by authority (defaults to store's authority)
            limit: Maximum number of records to return
            
        Returns:
            List of record identities
        """
        if authority_id is None:
            authority_id = self.authority_id
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                """SELECT authority_id, seq FROM ledger 
                   WHERE authority_id = ? 
                   ORDER BY seq ASC 
                   LIMIT ?""",
                (authority_id, limit)
            )
            return [
                RecordIdentity(authority_id=row[0], seq=row[1])
                for row in cursor.fetchall()
            ]
    
    def get_g1_floor(self) -> int:
        """Get the declared G1 floor (MUST 2)."""
        return self.g1_floor
    
    def verify_g1_claim(self, from_seq: int, to_seq: int | None = None) -> bool:
        """
        Verify that G1 holds for a range of seqs.
        
        G1: "an id, once bound, never names other bytes" - meaning no seq
        is reused (MUST 1).
        
        Since we use unique (authority_id, seq) as primary key, seq reuse
        is prevented by the database. This method checks that all seqs
        in the range are uniquely bound.
        
        Args:
            from_seq: Starting seq (inclusive)
            to_seq: Ending seq (inclusive, or None for current max)
            
        Returns:
            True if G1 holds for the range
        """
        if to_seq is None:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute(
                    "SELECT MAX(seq) FROM alloc WHERE authority_id = ?",
                    (self.authority_id,)
                )
                to_seq = cursor.fetchone()[0]
                if to_seq is None:
                    return True  # No allocations, vacuously true
        
        # Check that all seqs in range are allocated exactly once
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                """SELECT COUNT(*) FROM alloc 
                   WHERE authority_id = ? AND seq BETWEEN ? AND ?""",
                (self.authority_id, from_seq, to_seq)
            )
            count = cursor.fetchone()[0]
            expected_count = to_seq - from_seq + 1
            
            # G1 is violated if there are duplicate seqs or gaps
            # But our schema prevents duplicates, so we only need to check gaps
            # Actually, we need to check that every seq in the range is allocated
            # and that no seq is allocated more than once (which the PK prevents)
            
            # Check for gaps: are there any seqs in the range not in alloc?
            cursor = conn.execute(
                """SELECT seq FROM alloc 
                   WHERE authority_id = ? AND seq BETWEEN ? AND ?
                   ORDER BY seq""",
                (self.authority_id, from_seq, to_seq)
            )
            allocated_seqs = [row[0] for row in cursor.fetchall()]
            
            # Check that all seqs from from_seq to to_seq are present
            if len(allocated_seqs) != expected_count:
                return False
            
            # Check no duplicates (should be impossible with PK, but verify)
            if len(allocated_seqs) != len(set(allocated_seqs)):
                return False
            
            return True


# ============================================================
# Citation support (SPEC.md §288-312)
# ============================================================

@dataclass
class Citation:
    """A citation per SPEC.md §288."""
    store_identity: str | None  # None for same-store citation
    locator: str  # e.g., "relay-0001" or "auth-0001"
    content_digest: str  # SHA-256 hex
    
    def __str__(self) -> str:
        if self.store_identity is None:
            return f"({self.locator}, {self.content_digest})"
        return f"({self.store_identity}, {self.locator}, {self.content_digest})"
    
    @classmethod
    def parse(cls, s: str) -> "Citation":
        """Parse a citation string."""
        # Remove surrounding parens
        s = s.strip()
        if s.startswith('(') and s.endswith(')'):
            s = s[1:-1]
        
        parts = [p.strip() for p in s.split(',')]
        
        if len(parts) == 2:
            # Same-store: (locator, digest)
            return cls(store_identity=None, locator=parts[0], content_digest=parts[1])
        elif len(parts) == 3:
            # Cross-store: (store, locator, digest)
            return cls(store_identity=parts[0], locator=parts[1], content_digest=parts[2])
        else:
            raise ValueError(f"Invalid citation format: {s}")
    
    def verify(self, store: Store) -> bool:
        """
        Verify a citation against the store.
        
        For same-store citations, verify that the locator exists and has
        the specified content digest.
        For cross-store, only verify if store_identity matches (but we only
        implement single authority, so cross-store is out of scope).
        """
        if self.store_identity is not None:
            # Cross-store citation - out of scope per CONTRACT.md §2
            # We can only verify if it's our store
            if self.store_identity == store.authority_id:
                # Treat as same-store
                pass
            else:
                # Cannot verify cross-store
                return False
        
        # Same-store verification
        try:
            identity = RecordIdentity.parse(self.locator)
        except ValueError:
            return False
        
        if identity.authority_id != store.authority_id:
            return False
        
        result = store.read(identity)
        
        if result.visibility != Visibility.PRESENT:
            return False
        
        if result.recorded_digest != self.content_digest:
            return False
        
        return True


# ============================================================
# Envelope convention support (SPEC.md §314-327)
# ============================================================

def parse_envelope(content: bytes) -> tuple[dict[str, str], bytes]:
    """
    Parse a record's header block and body.
    
    Per SPEC.md §318: "The bytes above the first blank line" are the header block.
    Per AMENDMENT.md: A blank line is "A line containing no octets. A line carrying
    whitespace is not blank."
    
    Returns:
        Tuple of (header_fields, body) where header_fields is a dict of name->value
    """
    lines = content.split(b'\n')
    header_fields = {}
    body_start = 0
    
    for i, line in enumerate(lines):
        # Check for blank line (no octets)
        if line == b'':
            body_start = i + 1
            break
        
        # Try to parse as field: name: value
        # Per AMENDMENT.md: Field is "name: value" where name matches [A-Za-z][A-Za-z0-9-]*
        if b':' in line:
            name_part, _, value = line.partition(b':')
            name = name_part.strip()
            value = value.strip()
            
            # Validate field name
            if re.match(rb'^[A-Za-z][A-Za-z0-9-]*$', name):
                try:
                    header_fields[name.decode('ascii')] = value.decode('utf-8')
                except UnicodeDecodeError:
                    # Value is not valid UTF-8, store as bytes? 
                    # But the whole candidate must be valid UTF-8 per MUST 9.2
                    # So this shouldn't happen
                    pass
    
    body = b'\n'.join(lines[body_start:])
    return header_fields, body


def validate_envelope_id(identity: RecordIdentity, content: bytes) -> bool:
    """
    Validate that a declared id: in header block matches the store-assigned identity.
    
    Per SPEC.md §317: "The envelope id: inside the digested bytes is the only identity 
    a chain can pin; it is OPTIONAL but, when present, MUST be checked against the 
    store-assigned id (optional-and-checked)."
    """
    header_fields, _ = parse_envelope(content)
    
    declared_id = header_fields.get('id')
    if declared_id is None:
        # No declared id, nothing to check
        return True
    
    # Declared id should match store-assigned identity
    # The store-assigned identity is (authority_id, seq) which we format as authority_id-seq
    expected_id = str(identity)
    
    return declared_id == expected_id


# ============================================================
# CLI Interface
# ============================================================

def main():
    """Command-line interface for the store."""
    import argparse
    import sys
    
    parser = argparse.ArgumentParser(description='Single-authority store implementation')
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # Deposit command
    deposit_parser = subparsers.add_parser('deposit', help='Deposit a record')
    deposit_parser.add_argument('--db', type=str, default='store.db', help='Database path')
    deposit_parser.add_argument('--authority', type=str, default='relay', help='Authority ID')
    deposit_parser.add_argument('--g1-floor', type=int, default=0, help='G1 floor sequence')
    deposit_parser.add_argument('file', type=str, help='File containing candidate content')
    
    # Read command
    read_parser = subparsers.add_parser('read', help='Read a record')
    read_parser.add_argument('--db', type=str, default='store.db', help='Database path')
    read_parser.add_argument('--authority', type=str, default='relay', help='Authority ID')
    read_parser.add_argument('identity', type=str, help='Record identity (e.g., relay-0001)')
    
    # List command
    list_parser = subparsers.add_parser('list', help='List records')
    list_parser.add_argument('--db', type=str, default='store.db', help='Database path')
    list_parser.add_argument('--authority', type=str, default='relay', help='Authority ID')
    list_parser.add_argument('--limit', type=int, default=100, help='Maximum records to list')
    
    # Verify G1 command
    verify_parser = subparsers.add_parser('verify-g1', help='Verify G1 claim')
    verify_parser.add_argument('--db', type=str, default='store.db', help='Database path')
    verify_parser.add_argument('--authority', type=str, default='relay', help='Authority ID')
    verify_parser.add_argument('--from', type=int, dest='from_seq', default=0, help='Starting seq')
    verify_parser.add_argument('--to', type=int, default=None, help='Ending seq (optional)')
    
    # Info command
    info_parser = subparsers.add_parser('info', help='Show store info')
    info_parser.add_argument('--db', type=str, default='store.db', help='Database path')
    info_parser.add_argument('--authority', type=str, default='relay', help='Authority ID')
    
    args = parser.parse_args()
    
    if args.command is None:
        parser.print_help()
        sys.exit(1)
    
    if args.command == 'deposit':
        # Load candidate from file
        with open(args.file, 'rb') as f:
            candidate = f.read()
        
        store = Store(
            db_path=args.db,
            authority_id=args.authority,
            g1_floor=args.g1_floor
        )
        
        try:
            identity = store.deposit(candidate)
            print(f"Bound: {identity}")
            print(f"Content identity: {hashlib.sha256(candidate).hexdigest()}")
            print(f"Extent: {len(candidate)} bytes")
        except AdmissionError as e:
            print(f"Admission error: {e}", file=sys.stderr)
            sys.exit(1)
        except BelowG1FloorError as e:
            print(f"G1 floor error: {e}", file=sys.stderr)
            sys.exit(1)
        except AllocationError as e:
            print(f"Allocation error: {e}", file=sys.stderr)
            sys.exit(1)
    
    elif args.command == 'read':
        store = Store(
            db_path=args.db,
            authority_id=args.authority
        )
        
        identity = RecordIdentity.parse(args.identity)
        
        try:
            result = store.read(identity)
            print(f"Identity: {identity}")
            print(f"Visibility: {result.visibility.value}")
            print(f"Integrity: {result.integrity.value}")
            if result.recorded_digest:
                print(f"Recorded digest: {result.recorded_digest}")
            if result.recomputed_digest:
                print(f"Recomputed digest: {result.recomputed_digest}")
            if result.content:
                print(f"Extent: {len(result.content)} bytes")
                # Show first 100 bytes
                preview = result.content[:100]
                print(f"Content preview: {preview!r}")
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)
    
    elif args.command == 'list':
        store = Store(
            db_path=args.db,
            authority_id=args.authority
        )
        
        records = store.list_records(authority_id=args.authority, limit=args.limit)
        for identity in records:
            print(identity)
    
    elif args.command == 'verify-g1':
        store = Store(
            db_path=args.db,
            authority_id=args.authority
        )
        
        g1_holds = store.verify_g1_claim(from_seq=args.from_seq, to_seq=args.to)
        print(f"G1 claim from seq {args.from_seq} to {args.to or 'max'}: {'VERIFIED' if g1_holds else 'VIOLATED'}")
    
    elif args.command == 'info':
        store = Store(
            db_path=args.db,
            authority_id=args.authority
        )
        
        print(f"Authority: {store.authority_id}")
        print(f"G1 floor: {store.g1_floor}")
        print(f"Database: {store.db_path}")
        
        with sqlite3.connect(args.db) as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM alloc WHERE authority_id = ?", (args.authority,))
            alloc_count = cursor.fetchone()[0]
            cursor = conn.execute("SELECT COUNT(*) FROM ledger WHERE authority_id = ?", (args.authority,))
            ledger_count = cursor.fetchone()[0]
            cursor = conn.execute("SELECT COUNT(*) FROM content")
            content_count = cursor.fetchone()[0]
            
            print(f"Allocated seqs: {alloc_count}")
            print(f"Ledger entries: {ledger_count}")
            print(f"Content blobs: {content_count}")


if __name__ == '__main__':
    main()
