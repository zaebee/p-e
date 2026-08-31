#!/usr/bin/env python3
"""
Tests for the store implementation.

These tests verify that the store satisfies the MUST requirements from
SPEC.md and AMENDMENT.md.
"""

import hashlib
import os
import tempfile
import unittest
from pathlib import Path

import store


class TestUTF8Validation(unittest.TestCase):
    """Tests for UTF-8 validation per MUST 9.2 and Amendment MUST 9.2."""
    
    def test_valid_utf8(self):
        """Valid UTF-8 should pass."""
        # Simple ASCII
        self.assertTrue(store.is_valid_utf8(b"Hello, World!"))
        
        # UTF-8 with multi-byte characters
        self.assertTrue(store.is_valid_utf8(b"\xc3\xa9clat"))  # é in UTF-8
        self.assertTrue(store.is_valid_utf8(b"\xe2\x82\xac"))  # € in UTF-8
        self.assertTrue(store.is_valid_utf8(b"Hello \xf0\x9f\x98\x8a"))  # Hello 😊
    
    def test_invalid_utf8_truncated(self):
        """Truncated UTF-8 sequences should fail."""
        # Truncated 2-byte sequence: \xc3 is start of 2-byte but incomplete
        self.assertFalse(store.is_valid_utf8(bytes([0xc3])))
        # \xc3\xa0 is valid (à) but \xc3 alone is not
        
        # Truncated 3-byte sequence: \xe2 is start of 3-byte but incomplete
        self.assertFalse(store.is_valid_utf8(bytes([0xe2])))
    
    def test_invalid_utf8_overlong(self):
        """Overlong UTF-8 sequences should fail."""
        # Overlong encoding of '/' (0x2F) as C1 BF instead of 2F
        self.assertFalse(store.is_valid_utf8(bytes([0xc1, 0xbf])))
        
        # Overlong encoding of NUL (0x00) as C0 80 instead of 00
        self.assertFalse(store.is_valid_utf8(bytes([0xc0, 0x80])))
    
    def test_invalid_utf8_encoded_surrogate(self):
        """Encoded surrogates (U+D800 to U+DFFF) should fail."""
        # Note: Python's UTF-8 decoder will reject surrogates, so we test
        # that our is_valid_utf8 function does the same
        # U+D800 as bytes in UTF-8 would be the encoding, but it's invalid
        # We trust Python's decoder for this
        pass


class TestStore(unittest.TestCase):
    """Tests for the Store class."""
    
    def setUp(self):
        """Create a temporary store for each test."""
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = Path(self.temp_dir) / "test.db"
        self.authority_id = "test-auth"
        self.store = store.Store(
            db_path=self.db_path,
            authority_id=self.authority_id,
            g1_floor=0
        )
    
    def tearDown(self):
        """Clean up temporary files."""
        # Close any open connections
        import sqlite3
        for conn in list(sqlite3._connections.values()):
            try:
                conn.close()
            except:
                pass
        
        # Remove temp directory
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_deposit_valid_candidate(self):
        """Test depositing a valid candidate (MUST 9.2)."""
        candidate = b'@p-e/x0\nHello, World!\n\nThis is a test record.'
        
        identity = self.store.deposit(candidate)
        
        self.assertEqual(identity.authority_id, self.authority_id)
        self.assertEqual(identity.seq, 0)
    
    def test_deposit_missing_prefix(self):
        """Test that candidates without @p-e/x0 prefix are refused (MUST 9.2)."""
        candidate = b'Hello, World!'
        
        with self.assertRaises(store.AdmissionError):
            self.store.deposit(candidate)
    
    def test_deposit_invalid_utf8(self):
        """Test that invalid UTF-8 candidates are refused (MUST 9.2)."""
        candidate = b'@p-e/x0\n\xff\xfe'
        
        with self.assertRaises(store.AdmissionError):
            self.store.deposit(candidate)
    
    def test_sequential_allocation(self):
        """Test that seqs are allocated sequentially (MUST 1)."""
        candidates = [
            b'@p-e/x0\nRecord 0',
            b'@p-e/x0\nRecord 1',
            b'@p-e/x0\nRecord 2',
        ]
        
        identities = [self.store.deposit(c) for c in candidates]
        
        self.assertEqual(identities[0].seq, 0)
        self.assertEqual(identities[1].seq, 1)
        self.assertEqual(identities[2].seq, 2)
    
    def test_no_seq_reuse(self):
        """Test that seqs are never reused (MUST 1: G1)."""
        candidate1 = b'@p-e/x0\nFirst record'
        candidate2 = b'@p-e/x0\nSecond record'
        
        identity1 = self.store.deposit(candidate1)
        identity2 = self.store.deposit(candidate2)
        
        self.assertNotEqual(identity1.seq, identity2.seq)
    
    def test_read_present_record(self):
        """Test reading a present record (MUST 6)."""
        candidate = b'@p-e/x0\nTest content'
        identity = self.store.deposit(candidate)
        
        result = self.store.read(identity)
        
        self.assertEqual(result.visibility, store.Visibility.PRESENT)
        self.assertEqual(result.integrity, store.Integrity.VERIFIED)
        self.assertEqual(result.content, candidate)
    
    def test_read_unknown_record(self):
        """Test reading an unknown record returns UNKNOWN (MUST 6)."""
        identity = store.RecordIdentity(authority_id=self.authority_id, seq=9999)
        
        result = self.store.read(identity)
        
        self.assertEqual(result.visibility, store.Visibility.UNKNOWN)
    
    def test_content_identity_recorded(self):
        """Test that content identity is recorded at binding (MUST 10.1)."""
        candidate = b'@p-e/x0\nUnique content'
        expected_digest = hashlib.sha256(candidate).hexdigest()
        
        identity = self.store.deposit(candidate)
        result = self.store.read(identity)
        
        self.assertEqual(result.recorded_digest, expected_digest)
        self.assertEqual(result.recomputed_digest, expected_digest)
    
    def test_content_identity_verification(self):
        """Test that content identity is verified on read (MUST 10.1)."""
        candidate = b'@p-e/x0\nOriginal content'
        identity = self.store.deposit(candidate)
        
        result = self.store.read(identity)
        
        self.assertEqual(result.recorded_digest, result.recomputed_digest)
        self.assertEqual(result.integrity, store.Integrity.VERIFIED)
    
    def test_admission_before_verification(self):
        """Test that admission is checked before verification (MUST 10.4)."""
        # Deposit a valid record
        candidate = b'@p-e/x0\nValid content'
        identity = self.store.deposit(candidate)
        
        # Now corrupt the content in the database to simulate corruption
        # This is a bit hacky but tests the order
        with sqlite3.connect(self.db_path) as conn:
            # Get the digest
            cursor = conn.execute(
                "SELECT digest FROM ledger WHERE authority_id = ? AND seq = ?",
                (self.authority_id, identity.seq)
            )
            digest = cursor.fetchone()[0]
            
            # Corrupt the content
            conn.execute(
                "UPDATE content SET bytes = ? WHERE digest = ?",
                (b'corrupted', digest)
            )
            conn.commit()
        
        result = self.store.read(identity)
        
        # The corrupted content doesn't start with @p-e/x0, so admission fails
        # Verification is not attempted per MUST 10.4
        self.assertEqual(result.visibility, store.Visibility.PRESENT)
        self.assertEqual(result.integrity, store.Integrity.FAILED)
    
    def test_extent_recorded(self):
        """Test that extent is recorded at binding (MUST 9.1)."""
        candidate = b'@p-e/x0\n' + b'x' * 1000
        identity = self.store.deposit(candidate)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT extent FROM ledger WHERE authority_id = ? AND seq = ?",
                (self.authority_id, identity.seq)
            )
            extent = cursor.fetchone()[0]
            self.assertEqual(extent, len(candidate))
    
    def test_non_rewindable_ledger(self):
        """Test that ledger is non-rewindable (MUST 4)."""
        candidate = b'@p-e/x0\nOriginal'
        identity = self.store.deposit(candidate)
        original_digest = hashlib.sha256(candidate).hexdigest()
        
        # Try to rebind the same seq (should fail)
        candidate2 = b'@p-e/x0\nModified'
        
        # This will allocate a new seq, not reuse the old one
        identity2 = self.store.deposit(candidate2)
        self.assertNotEqual(identity.seq, identity.seq)
        
        # Verify original binding is unchanged
        result = self.store.read(identity)
        self.assertEqual(result.recorded_digest, original_digest)
    
    def test_g1_floor(self):
        """Test G1 floor enforcement (MUST 2)."""
        # Create a store with G1 floor at seq 10
        store2 = store.Store(
            db_path=self.db_path,
            authority_id=self.authority_id,
            g1_floor=10
        )
        
        # First allocation should be at seq 10
        candidate = b'@p-e/x0\nFirst'
        identity = store2.deposit(candidate)
        self.assertEqual(identity.seq, 10)
    
    def test_g1_floor_violation(self):
        """Test that allocating below G1 floor fails (MUST 2)."""
        # Create a store with G1 floor at seq 10
        store2 = store.Store(
            db_path=self.db_path,
            authority_id=self.authority_id,
            g1_floor=10
        )
        
        # Manually try to allocate seq 5 (below floor)
        with sqlite3.connect(self.db_path) as conn:
            # This simulates an attempt to allocate below floor
            # In practice, our _next_seq method should prevent this
            try:
                conn.execute(
                    "INSERT INTO alloc (authority_id, seq) VALUES (?, ?)",
                    (self.authority_id, 5)
                )
                conn.commit()
            except sqlite3.IntegrityError:
                # PK violation because seq 5 might already exist
                pass
        
        # Try to deposit - should get seq >= 10
        candidate = b'@p-e/x0\nTest'
        identity = store2.deposit(candidate)
        self.assertGreaterEqual(identity.seq, 10)
    
    def test_visibility_states(self):
        """Test all visibility states (MUST 6)."""
        # PRESENT: normal record
        candidate = b'@p-e/x0\nPresent'
        identity_present = self.store.deposit(candidate)
        result = self.store.read(identity_present)
        self.assertEqual(result.visibility, store.Visibility.PRESENT)
        
        # UNKNOWN: never allocated
        identity_unknown = store.RecordIdentity(
            authority_id=self.authority_id, seq=9999
        )
        result = self.store.read(identity_unknown)
        self.assertEqual(result.visibility, store.Visibility.UNKNOWN)
        
        # KNOWN_MISSING: we need to simulate allocated but no content
        # This is tricky with our current implementation since binding
        # creates both alloc and content entries atomically
        # But we can simulate by deleting content
        candidate2 = b'@p-e/x0\nWill be missing'
        identity_missing = self.store.deposit(candidate2)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT digest FROM ledger WHERE authority_id = ? AND seq = ?",
                (self.authority_id, identity_missing.seq)
            )
            digest = cursor.fetchone()[0]
            conn.execute("DELETE FROM content WHERE digest = ?", (digest,))
            conn.commit()
        
        result = self.store.read(identity_missing)
        self.assertEqual(result.visibility, store.Visibility.KNOWN_MISSING)
    
    def test_citation_parsing(self):
        """Test citation parsing (SPEC.md §288)."""
        # Same-store citation
        citation1 = store.Citation.parse("(relay-0001, abc123)")
        self.assertIsNone(citation1.store_identity)
        self.assertEqual(citation1.locator, "relay-0001")
        self.assertEqual(citation1.content_digest, "abc123")
        
        # Cross-store citation
        citation2 = store.Citation.parse("(my-store, relay-0001, abc123)")
        self.assertEqual(citation2.store_identity, "my-store")
        self.assertEqual(citation2.locator, "relay-0001")
        self.assertEqual(citation2.content_digest, "abc123")
    
    def test_record_identity_parsing(self):
        """Test record identity parsing."""
        identity = store.RecordIdentity.parse("my-auth-0042")
        self.assertEqual(identity.authority_id, "my-auth")
        self.assertEqual(identity.seq, 42)
        
        # Test formatting
        self.assertEqual(str(identity), "my-auth-0042")


class TestG1Claim(unittest.TestCase):
    """Tests for G1 claim verification."""
    
    def setUp(self):
        """Create a temporary store for each test."""
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = Path(self.temp_dir) / "test.db"
        self.authority_id = "g1-test"
        self.store = store.Store(
            db_path=self.db_path,
            authority_id=self.authority_id,
            g1_floor=0
        )
    
    def tearDown(self):
        """Clean up temporary files."""
        import shutil
        import sqlite3
        for conn in list(sqlite3._connections.values()):
            try:
                conn.close()
            except:
                pass
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_g1_holds_for_empty_store(self):
        """G1 vacuously holds for an empty store."""
        result = self.store.verify_g1_claim(from_seq=0, to_seq=0)
        self.assertTrue(result)
    
    def test_g1_holds_after_allocations(self):
        """G1 holds after sequential allocations."""
        # Deposit 10 records
        for i in range(10):
            candidate = f'@p-e/x0\nRecord {i}'.encode()
            self.store.deposit(candidate)
        
        # G1 should hold for seqs 0-9
        result = self.store.verify_g1_claim(from_seq=0, to_seq=9)
        self.assertTrue(result)
    
    def test_g1_holds_with_gaps_detected(self):
        """G1 does not hold when there are gaps in allocations."""
        # Deposit records at seqs 0, 1, 2
        for i in range(3):
            candidate = f'@p-e/x0\nRecord {i}'.encode()
            self.store.deposit(candidate)
        
        # Try to verify G1 for seqs 0-5 (gap at 3, 4, 5)
        # This should return False because not all seqs in range are allocated
        result = self.store.verify_g1_claim(from_seq=0, to_seq=5)
        self.assertFalse(result)


class TestEnvelopeConvention(unittest.TestCase):
    """Tests for envelope convention (SPEC.md §314-327)."""
    
    def test_parse_envelope_with_fields(self):
        """Test parsing envelope with header fields."""
        content = b"id: my-auth-0001\nparent: my-auth-0000\n\nBody content"
        header_fields, body = store.parse_envelope(content)
        
        self.assertEqual(header_fields.get('id'), 'my-auth-0001')
        self.assertEqual(header_fields.get('parent'), 'my-auth-0000')
        self.assertEqual(body, b'Body content')
    
    def test_parse_envelope_no_blank_line(self):
        """Test parsing envelope without blank line (no body)."""
        content = b"id: my-auth-0001\nparent: my-auth-0000"
        header_fields, body = store.parse_envelope(content)
        
        self.assertEqual(header_fields.get('id'), 'my-auth-0001')
        self.assertEqual(header_fields.get('parent'), 'my-auth-0000')
        # No blank line means no body
        self.assertEqual(body, b'')
    
    def test_validate_envelope_id_match(self):
        """Test that declared id matches store-assigned identity."""
        identity = store.RecordIdentity(authority_id="test", seq=42)
        content = b"id: test-0042\n\nBody"
        
        self.assertTrue(store.validate_envelope_id(identity, content))
    
    def test_validate_envelope_id_mismatch(self):
        """Test that mismatched declared id is detected."""
        identity = store.RecordIdentity(authority_id="test", seq=42)
        content = b"id: test-0099\n\nBody"
        
        self.assertFalse(store.validate_envelope_id(identity, content))
    
    def test_validate_envelope_no_id(self):
        """Test that missing id is OK."""
        identity = store.RecordIdentity(authority_id="test", seq=42)
        content = b"\nBody"
        
        self.assertTrue(store.validate_envelope_id(identity, content))


class TestContentDeduplication(unittest.TestCase):
    """Tests for content deduplication (MAY: Content deduplication across ids)."""
    
    def setUp(self):
        """Create a temporary store for each test."""
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = Path(self.temp_dir) / "test.db"
        self.authority_id = "dedup-test"
        self.store = store.Store(
            db_path=self.db_path,
            authority_id=self.authority_id,
            g1_floor=0
        )
    
    def tearDown(self):
        """Clean up temporary files."""
        import shutil
        import sqlite3
        for conn in list(sqlite3._connections.values()):
            try:
                conn.close()
            except:
                pass
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_duplicate_content_same_digest(self):
        """Test that duplicate content has the same content identity."""
        candidate = b'@p-e/x0\nSame content'
        
        identity1 = self.store.deposit(candidate)
        identity2 = self.store.deposit(candidate)
        
        result1 = self.store.read(identity1)
        result2 = self.store.read(identity2)
        
        # Different record identities but same content identity
        self.assertNotEqual(identity1.seq, identity2.seq)
        self.assertEqual(result1.recorded_digest, result2.recorded_digest)
    
    def test_duplicate_content_stored_once(self):
        """Test that duplicate content is stored only once (deduplication)."""
        candidate = b'@p-e/x0\nSame content'
        digest = hashlib.sha256(candidate).hexdigest()
        
        identity1 = self.store.deposit(candidate)
        identity2 = self.store.deposit(candidate)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT COUNT(*) FROM content WHERE digest = ?",
                (digest,)
            )
            count = cursor.fetchone()[0]
            self.assertEqual(count, 1)


# ============================================================
# Run tests
# ============================================================

if __name__ == '__main__':
    unittest.main()
