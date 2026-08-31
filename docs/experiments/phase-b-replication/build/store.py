#!/usr/bin/env python3
"""
Store implementation for single-authority crash-durable binding.

This implements the specification from SPEC.md and AMENDMENT.md for a
single authority as required by CONTRACT.md §2.

Key guarantees:
- G1: an id, once bound, never names other bytes (no seq reuse)
- G2a: binding survives a crash (crash-atomic writes)
- G2b: NOT IMPLEMENTED (requires independent party, deferred)

MUST requirements implemented:
- MUST 1: Unique, monotonic seq allocation via O_EXCL marker files
- MUST 2: Authority declares G1 floor
- MUST 3: Record content identified by sha256(bytes)
- MUST 4: Non-rewindable ledger
- MUST 5: parent scoped to same authority (N/A for single authority)
- MUST 6: Visibility states: PRESENT/KNOWN_MISSING/UNKNOWN
- MUST 7: Absence of witness reported as absence (witnessing not implemented)
- MUST 8: Crash-atomic, create-or-fail binding writes
- MUST 9: Digest domain (extent, admission, fidelity, type)
- MUST 10: Content identity recorded at binding, verified on every read
"""

import hashlib
import json
import os
import shutil
import stat
import tempfile
import time
from dataclasses import dataclass, asdict
from enum import Enum, auto
from pathlib import Path
from typing import Optional, Tuple


# =============================================================================
# Configuration
# =============================================================================

DEFAULT_AUTHORITY_ID = "relay"
DEFAULT_G1_FLOOR = 0
STORE_DIR = "store_data"
HISTORY_DIR = "history"  # Allocation markers
RECORDS_DIR = "records"  # Record content files
LEDGER_FILE = "ledger.csv"  # Append-only ledger
AUTHORITY_FILE = "authority.json"

# Magic prefix for admission (MUST 9.2)
ADMISSION_PREFIX = b"@p-e/x0"


# =============================================================================
# Types
# =============================================================================

class VisibilityState(Enum):
    """MUST 6: Visibility states."""
    PRESENT = auto()          # Record exists and verifies
    KNOWN_MISSING = auto()   # Ledger entry exists but content missing (deleted)
    UNKNOWN = auto()         # No ledger entry for this seq


class AdmissionError(Enum):
    """Admission failure reasons (MUST 9.2)."""
    MISSING_PREFIX = auto()
    INVALID_UTF8 = auto()


class StoreError(Exception):
    """Base exception for store errors."""
    pass


class AllocationError(StoreError):
    """Failed to allocate a new seq."""
    pass


class BindingError(StoreError):
    """Failed to create a binding."""
    pass


class VerificationError(StoreError):
    """Content verification failed."""
    pass


class AdmissionErrorExc(StoreError):
    """Admission check failed."""
    def __init__(self, reason: AdmissionError):
        self.reason = reason
        super().__init__(f"Admission failed: {reason.name}")


@dataclass(frozen=True)
class RecordIdentity:
    """Record identity = (authority_id, seq)."""
    authority_id: str
    seq: int
    
    def to_locator(self) -> str:
        """Return store-scoped locator string."""
        return f"{self.authority_id}-{self.seq:04d}"


@dataclass(frozen=True)
class ContentIdentity:
    """Content identity = sha256(bound-content)."""
    digest: str  # hex string
    
    @classmethod
    def from_bytes(cls, content: bytes) -> "ContentIdentity":
        return cls(hashlib.sha256(content).hexdigest())


@dataclass(frozen=True)
class Binding:
    """The association of record identity with bound-content."""
    record_id: RecordIdentity
    content_id: ContentIdentity
    extent: int  # bytes, from candidate as delivered (MUST 9.1)
    timestamp: float  # binding time
    
    def to_ledger_line(self) -> str:
        """Format for append-only ledger."""
        return f"{self.record_id.seq},{self.content_id.digest},{self.extent},{self.timestamp:.6f}"
    
    @classmethod
    def from_ledger_line(cls, authority_id: str, line: str) -> "Binding":
        """Parse ledger line."""
        parts = line.strip().split(",")
        if len(parts) != 4:
            raise ValueError(f"Invalid ledger line: {line}")
        seq = int(parts[0])
        digest = parts[1]
        extent = int(parts[2])
        timestamp = float(parts[3])
        return cls(
            record_id=RecordIdentity(authority_id, seq),
            content_id=ContentIdentity(digest),
            extent=extent,
            timestamp=timestamp,
        )


# =============================================================================
# UTF-8 Validation (MUST 9.2)
# =============================================================================

def is_valid_utf8_strict(data: bytes) -> bool:
    """
    Validate UTF-8 strictly per Unicode 15.0 Table 3-7.
    
    Rejects:
    - Overlong forms
    - Encoded surrogates
    - Truncated sequences
    """
    try:
        data.decode('utf-8', errors='strict')
    except UnicodeDecodeError:
        return False
    
    # Check for overlong forms and encoded surrogates
    # This is a simplified check; full validation would require more complex logic
    # But Python's 'utf-8' decoder with errors='strict' already rejects these
    # However, we need to be extra careful about surrogates in UTF-8
    # Surrogates (U+D800 to U+DFFF) should not appear in UTF-8
    
    # Actually, Python's strict UTF-8 decoder already handles this correctly.
    # Let's add explicit checks for safety.
    i = 0
    while i < len(data):
        byte = data[i]
        
        # Single byte: 0xxxxxxx
        if byte < 0x80:
            i += 1
            continue
        
        # Check for overlong encoding
        # 2-byte: 110xxxxx 10xxxxxx, but not 11000000 10xxxxxx (which is overlong for < 0x80)
        if (byte & 0xE0) == 0xC0:  # 110xxxxx
            if i + 1 >= len(data):
                return False  # Truncated
            next_byte = data[i + 1]
            if (next_byte & 0xC0) != 0x80:
                return False
            # Check for overlong: should be >= 0x80
            if byte == 0xC0 or byte == 0xC1:
                return False  # Overlong encoding
            i += 2
            continue
        
        # 3-byte: 1110xxxx 10xxxxxx 10xxxxxx
        if (byte & 0xF0) == 0xE0:
            if i + 2 >= len(data):
                return False
            # Check continuation bytes
            if (data[i+1] & 0xC0) != 0x80 or (data[i+2] & 0xC0) != 0x80:
                return False
            # Check for overlong
            if byte == 0xE0 and (data[i+1] & 0xE0) == 0x80:
                return False  # Overlong for < 0x800
            # Check for surrogate code points (0xD800-0xDFFF)
            codepoint = ((byte & 0x0F) << 12) | ((data[i+1] & 0x3F) << 6) | (data[i+2] & 0x3F)
            if 0xD800 <= codepoint <= 0xDFFF:
                return False  # Encoded surrogate
            i += 3
            continue
        
        # 4-byte: 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
        if (byte & 0xF8) == 0xF0:
            if i + 3 >= len(data):
                return False
            for j in range(1, 4):
                if (data[i+j] & 0xC0) != 0x80:
                    return False
            # Check for overlong
            if byte == 0xF0 and (data[i+1] & 0xF0) == 0x80:
                return False  # Overlong for < 0x10000
            # Check for code points > 0x10FFFF
            codepoint = ((byte & 0x07) << 18) | ((data[i+1] & 0x3F) << 12) | ((data[i+2] & 0x3F) << 6) | (data[i+3] & 0x3F)
            if codepoint > 0x10FFFF:
                return False
            i += 4
            continue
        
        return False  # Invalid leading byte
    
    return True


# =============================================================================
# Store Implementation
# =============================================================================

class Store:
    """
    Single-authority store with crash-durable binding.
    """
    
    def __init__(self, store_dir: str = STORE_DIR, authority_id: str = DEFAULT_AUTHORITY_ID, g1_floor: int = DEFAULT_G1_FLOOR):
        """
        Initialize the store.
        
        Args:
            store_dir: Base directory for store data
            authority_id: Authority identifier (fixed for this store)
            g1_floor: The seq from which this authority claims G1 (MUST 2)
        """
        self.store_dir = Path(store_dir)
        self.authority_id = authority_id
        self.g1_floor = g1_floor
        
        # Initialize directories
        self._ensure_dirs()
        
        # Load or create authority declaration
        self._load_or_create_authority()
        
        # Ledger is append-only; we'll keep it open for appending
        self.ledger_path = self.store_dir / LEDGER_FILE
        
    def _ensure_dirs(self):
        """Create necessary directories."""
        self.store_dir.mkdir(exist_ok=True)
        (self.store_dir / HISTORY_DIR).mkdir(exist_ok=True)
        (self.store_dir / RECORDS_DIR).mkdir(exist_ok=True)
        
    def _load_or_create_authority(self):
        """Load or create authority.json (MUST 2)."""
        auth_path = self.store_dir / AUTHORITY_FILE
        if auth_path.exists():
            with open(auth_path, 'r') as f:
                auth_data = json.load(f)
            self.authority_id = auth_data.get('authority_id', self.authority_id)
            self.g1_floor = auth_data.get('g1_floor', self.g1_floor)
        else:
            auth_data = {
                'authority_id': self.authority_id,
                'g1_floor': self.g1_floor,
            }
            # Write atomically
            tmp_path = auth_path.with_suffix('.tmp')
            with open(tmp_path, 'w') as f:
                json.dump(auth_data, f)
                f.flush()
                os.fsync(f.fileno())
            tmp_path.replace(auth_path)
            # fsync directory
            dir_fd = os.open(str(auth_path.parent), os.O_RDONLY)
            try:
                os.fsync(dir_fd)
            finally:
                os.close(dir_fd)
    
    def _get_seq_path(self, seq: int) -> Path:
        """Get path to allocation marker for a seq."""
        return self.store_dir / HISTORY_DIR / f"{seq:04d}"
    
    def _get_record_path(self, seq: int) -> Path:
        """Get path to record content file for a seq."""
        return self.store_dir / RECORDS_DIR / f"{seq:04d}"
    
    def _mark_allocated(self, seq: int) -> bool:
        """
        Attempt to allocate seq via O_EXCL marker file creation (MUST 1).
        
        Returns True if allocated, False if already allocated.
        """
        marker_path = self._get_seq_path(seq)
        try:
            # O_EXCL | O_CREAT | O_WRONLY - atomic create
            fd = os.open(marker_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.close(fd)
            return True
        except FileExistsError:
            return False
    
    def allocate_seq(self) -> int:
        """
        Allocate the next available seq number (MUST 1).
        
        Uses atomic exclusive commit (O_EXCL) on marker files.
        Does NOT use max+1 approach.
        
        Returns:
            The allocated seq number.
            
        Raises:
            AllocationError: If no seq can be allocated.
        """
        # Start from g1_floor and find first unallocated
        seq = self.g1_floor
        while True:
            if self._mark_allocated(seq):
                return seq
            seq += 1
            # Safety limit
            if seq > self.g1_floor + 1000000:
                raise AllocationError("No available seq found")
    
    def _validate_candidate(self, candidate: bytes) -> Tuple[bool, Optional[AdmissionError]]:
        """
        Validate candidate for admission (MUST 9.2).
        
        Returns:
            (is_valid, error_reason) tuple
        """
        # Check prefix
        if not candidate.startswith(ADMISSION_PREFIX):
            return False, AdmissionError.MISSING_PREFIX
        
        # Check UTF-8
        if not is_valid_utf8_strict(candidate):
            return False, AdmissionError.INVALID_UTF8
        
        return True, None
    
    def bind(self, candidate: bytes) -> Binding:
        """
        Accept a candidate and create a binding (MUST 8).
        
        This is crash-atomic and create-or-fail:
        1. Write content to temp file
        2. fsync content file
        3. rename to final location
        4. fsync directory
        5. Create marker file with O_EXCL
        6. Append to ledger
        7. fsync ledger
        
        Args:
            candidate: The candidate bytes (bound-content)
            
        Returns:
            The Binding created.
            
        Raises:
            BindingError: If binding cannot be created.
            AdmissionErrorExc: If candidate fails admission.
        """
        # Validate admission (MUST 9.2)
        valid, error = self._validate_candidate(candidate)
        if not valid:
            raise AdmissionErrorExc(error)
        
        # Allocate seq
        seq = self.allocate_seq()
        record_id = RecordIdentity(self.authority_id, seq)
        content_id = ContentIdentity.from_bytes(candidate)
        extent = len(candidate)
        timestamp = time.time()
        
        # Step 1: Write content to temp file in records dir
        records_dir = self.store_dir / RECORDS_DIR
        record_path = self._get_record_path(seq)
        
        # Use temp file in same directory for atomic rename
        fd, tmp_path = tempfile.mkstemp(dir=records_dir, prefix=f".{seq:04d}.")
        try:
            os.write(fd, candidate)
            os.fsync(fd)
            os.close(fd)
            fd = -1
            
            # Step 2: Rename to final location (atomic on POSIX)
            os.rename(tmp_path, record_path)
            
            # Step 3: fsync directory to make entry durable (MUST 8)
            dir_fd = os.open(str(records_dir), os.O_RDONLY)
            try:
                os.fsync(dir_fd)
            finally:
                os.close(dir_fd)
            
            # Step 4: Marker already created by allocate_seq() via _mark_allocated
            # But we need to ensure it's durable too
            marker_path = self._get_seq_path(seq)
            marker_fd = os.open(str(marker_path), os.O_RDONLY)
            try:
                os.fsync(marker_fd)
            finally:
                os.close(marker_fd)
            
            # Step 5: Append to ledger (MUST 4 - non-rewindable)
            binding = Binding(record_id, content_id, extent, timestamp)
            ledger_line = binding.to_ledger_line() + "\n"
            
            with open(self.ledger_path, 'ab') as ledger_f:
                ledger_f.write(ledger_line.encode('utf-8'))
                ledger_f.flush()
                os.fsync(ledger_f.fileno())
            
            # fsync ledger directory
            ledger_dir_fd = os.open(str(self.ledger_path.parent), os.O_RDONLY)
            try:
                os.fsync(ledger_dir_fd)
            finally:
                os.close(ledger_dir_fd)
            
            return binding
            
        except Exception as e:
            # Cleanup on failure
            if fd >= 0:
                try:
                    os.close(fd)
                except:
                    pass
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except:
                    pass
            raise BindingError(f"Failed to create binding: {e}")
    
    def read(self, seq: int) -> Tuple[Binding, bytes, VisibilityState]:
        """
        Read a record by seq number.
        
        Performs admission check then verification on every read (MUST 10.4, MUST 10.1).
        
        Args:
            seq: The seq number to read.
            
        Returns:
            Tuple of (binding, bound-content, visibility_state).
            
        Raises:
            StoreError: If read fails.
            AdmissionErrorExc: If stored content fails admission.
            VerificationError: If content verification fails.
        """
        record_path = self._get_record_path(seq)
        marker_path = self._get_seq_path(seq)
        
        # Check ledger first
        binding = self._lookup_ledger(seq)
        
        if binding is None:
            # No ledger entry - UNKNOWN
            return (None, None, VisibilityState.UNKNOWN)
        
        if not record_path.exists():
            # Ledger entry exists but content missing - KNOWN_MISSING (MUST 6)
            return (binding, None, VisibilityState.KNOWN_MISSING)
        
        # Read content
        with open(record_path, 'rb') as f:
            stored_content = f.read()
        
        # Check admission first (MUST 10.4)
        valid, error = self._validate_candidate(stored_content)
        if not valid:
            raise AdmissionErrorExc(error)
        
        # Verify content identity (MUST 10.1)
        stored_digest = ContentIdentity.from_bytes(stored_content)
        if stored_digest.digest != binding.content_id.digest:
            raise VerificationError(
                f"Digest mismatch for {binding.record_id.to_locator()}: "
                f"expected {binding.content_id.digest}, got {stored_digest.digest}"
            )
        
        # Check extent
        if len(stored_content) != binding.extent:
            raise VerificationError(
                f"Extent mismatch for {binding.record_id.to_locator()}: "
                f"expected {binding.extent}, got {len(stored_content)}"
            )
        
        return (binding, stored_content, VisibilityState.PRESENT)
    
    def _lookup_ledger(self, seq: int) -> Optional[Binding]:
        """Look up binding in ledger."""
        if not self.ledger_path.exists():
            return None
        
        with open(self.ledger_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                binding = Binding.from_ledger_line(self.authority_id, line)
                if binding.record_id.seq == seq:
                    return binding
        return None
    
    def get_visibility(self, seq: int) -> VisibilityState:
        """
        Get visibility state for a seq without returning content (MUST 6).
        
        Args:
            seq: The seq number to check.
            
        Returns:
            VisibilityState
        """
        record_path = self._get_record_path(seq)
        marker_path = self._get_seq_path(seq)
        
        # Check ledger
        binding = self._lookup_ledger(seq)
        
        if binding is None:
            return VisibilityState.UNKNOWN
        
        if not record_path.exists():
            return VisibilityState.KNOWN_MISSING
        
        return VisibilityState.PRESENT
    
    def delete(self, seq: int) -> None:
        """
        Delete a record (content only, not the allocation marker).
        
        Per MUST 6: Deletion removes the record but never the allocation marker.
        The id stays bound.
        
        Args:
            seq: The seq number to delete.
            
        Raises:
            StoreError: If seq doesn't exist.
        """
        record_path = self._get_record_path(seq)
        
        # Check if record exists
        if not record_path.exists():
            raise StoreError(f"Record {seq} does not exist")
        
        # Remove content file but NOT marker (MUST 1: marker persists beyond deletion)
        os.unlink(record_path)
        
        # Fsync directory
        records_dir = self.store_dir / RECORDS_DIR
        dir_fd = os.open(str(records_dir), os.O_RDONLY)
        try:
            os.fsync(dir_fd)
        finally:
            os.close(dir_fd)
    
    def list_bindings(self) -> list:
        """List all bindings in the ledger."""
        bindings = []
        if self.ledger_path.exists():
            with open(self.ledger_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line:
                        binding = Binding.from_ledger_line(self.authority_id, line)
                        bindings.append(binding)
        return bindings
    
    def cleanup(self):
        """Remove all store data (for testing)."""
        if self.store_dir.exists():
            shutil.rmtree(self.store_dir)
            self._ensure_dirs()


# =============================================================================
# Citation support (MUST for citing records)
# =============================================================================

@dataclass(frozen=True)
class Citation:
    """
    A citation is a (locator, digest) pair.
    
    For single-authority store, locator = authority_id-seq.
    Digest = sha256(bound-content).
    """
    locator: str
    digest: str
    
    @classmethod
    def from_binding(cls, binding: Binding) -> "Citation":
        return cls(
            locator=binding.record_id.to_locator(),
            digest=binding.content_id.digest,
        )
    
    def verify(self, store: Store) -> bool:
        """Verify citation against store."""
        # Parse locator: authority_id-seq
        try:
            auth_id, seq_str = self.locator.split('-')
            seq = int(seq_str)
        except ValueError:
            return False
        
        if auth_id != store.authority_id:
            return False
        
        try:
            binding, content, state = store.read(seq)
            if state != VisibilityState.PRESENT:
                return False
            return binding.content_id.digest == self.digest
        except (StoreError, VerificationError, AdmissionErrorExc):
            return False


# =============================================================================
# Main CLI
# =============================================================================

import argparse
import sys


def main():
    parser = argparse.ArgumentParser(description="Single-authority crash-durable store")
    subparsers = parser.add_subparsers(dest='command', required=True)
    
    # Initialize store
    init_parser = subparsers.add_parser('init', help='Initialize store')
    init_parser.add_argument('--dir', default=STORE_DIR, help='Store directory')
    init_parser.add_argument('--authority', default=DEFAULT_AUTHORITY_ID, help='Authority ID')
    init_parser.add_argument('--g1-floor', type=int, default=DEFAULT_G1_FLOOR, help='G1 floor seq')
    
    # Bind a record
    bind_parser = subparsers.add_parser('bind', help='Bind a record')
    bind_parser.add_argument('--dir', default=STORE_DIR, help='Store directory')
    bind_parser.add_argument('file', help='File containing candidate bytes')
    
    # Read a record
    read_parser = subparsers.add_parser('read', help='Read a record')
    read_parser.add_argument('--dir', default=STORE_DIR, help='Store directory')
    read_parser.add_argument('seq', type=int, help='Seq number')
    
    # Delete a record
    delete_parser = subparsers.add_parser('delete', help='Delete a record')
    delete_parser.add_argument('--dir', default=STORE_DIR, help='Store directory')
    delete_parser.add_argument('seq', type=int, help='Seq number')
    
    # Visibility check
    visibility_parser = subparsers.add_parser('visibility', help='Check visibility')
    visibility_parser.add_argument('--dir', default=STORE_DIR, help='Store directory')
    visibility_parser.add_argument('seq', type=int, help='Seq number')
    
    # List all
    list_parser = subparsers.add_parser('list', help='List all bindings')
    list_parser.add_argument('--dir', default=STORE_DIR, help='Store directory')
    
    args = parser.parse_args()
    
    if args.command == 'init':
        store = Store(args.dir, args.authority, args.g1_floor)
        print(f"Store initialized: authority={store.authority_id}, g1_floor={store.g1_floor}")
        print(f"Store directory: {store.store_dir}")
    
    elif args.command == 'bind':
        store = Store(args.dir)
        with open(args.file, 'rb') as f:
            candidate = f.read()
        try:
            binding = store.bind(candidate)
            print(f"Bound: {binding.record_id.to_locator()}")
            print(f"  Content ID: {binding.content_id.digest}")
            print(f"  Extent: {binding.extent} bytes")
            print(f"  Timestamp: {binding.timestamp}")
        except AdmissionErrorExc as e:
            print(f"Admission failed: {e.reason.name}", file=sys.stderr)
            sys.exit(1)
        except (BindingError, AllocationError) as e:
            print(f"Binding failed: {e}", file=sys.stderr)
            sys.exit(1)
    
    elif args.command == 'read':
        store = Store(args.dir)
        try:
            binding, content, state = store.read(args.seq)
            if state == VisibilityState.UNKNOWN:
                print(f"Seq {args.seq}: UNKNOWN (no ledger entry)")
            elif state == VisibilityState.KNOWN_MISSING:
                print(f"Seq {args.seq}: KNOWN_MISSING (ledger entry exists, content deleted)")
                if binding:
                    print(f"  Was bound to: {binding.content_id.digest}")
            elif state == VisibilityState.PRESENT:
                print(f"Seq {args.seq}: PRESENT")
                print(f"  Locator: {binding.record_id.to_locator()}")
                print(f"  Content ID: {binding.content_id.digest}")
                print(f"  Extent: {binding.extent} bytes")
                print(f"  Content: {content[:200]}{'...' if len(content) > 200 else ''}")
        except AdmissionErrorExc as e:
            print(f"Admission check failed on read: {e.reason.name}", file=sys.stderr)
            sys.exit(1)
        except VerificationError as e:
            print(f"Verification failed: {e}", file=sys.stderr)
            sys.exit(1)
        except StoreError as e:
            print(f"Read failed: {e}", file=sys.stderr)
            sys.exit(1)
    
    elif args.command == 'delete':
        store = Store(args.dir)
        try:
            store.delete(args.seq)
            print(f"Deleted seq {args.seq} (content only; marker retained)")
        except StoreError as e:
            print(f"Delete failed: {e}", file=sys.stderr)
            sys.exit(1)
    
    elif args.command == 'visibility':
        store = Store(args.dir)
        state = store.get_visibility(args.seq)
        print(f"Seq {args.seq}: {state.name}")
    
    elif args.command == 'list':
        store = Store(args.dir)
        bindings = store.list_bindings()
        for binding in bindings:
            print(f"{binding.record_id.to_locator()}: {binding.content_id.digest} ({binding.extent} bytes)")


if __name__ == '__main__':
    main()
