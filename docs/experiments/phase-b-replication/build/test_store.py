#!/usr/bin/env python3
"""
Tests for the single-authority crash-durable store.

These tests verify the MUST requirements from SPEC.md and AMENDMENT.md.
"""

import hashlib
import os
import shutil
import tempfile
import unittest
from pathlib import Path

from store import (
    Store,
    Binding,
    ContentIdentity,
    RecordIdentity,
    VisibilityState,
    AdmissionError,
    AdmissionErrorExc,
    BindingError,
    VerificationError,
    Citation,
    is_valid_utf8_strict,
    ADMISSION_PREFIX,
)


# =============================================================================
# Test Utilities
# =============================================================================

TEST_DIR = "test_store_data"

def make_valid_candidate(content: str = "test content") -> bytes:
    """Create a valid candidate with @p-e/x0 prefix and valid UTF-8."""
    return ADMISSION_PREFIX + content.encode('utf-8')


def make_candidate_no_prefix(content: str = "test") -> bytes:
    """Create a candidate without @p-e/x0 prefix."""
    return content.encode('utf-8')


def make_invalid_utf8() -> bytes:
    """Create invalid UTF-8 bytes."""
    # Truncated UTF-8 sequence
    return b'\xc0\x80'  # Overlong encoding of NUL


def cleanup_test_dir():
    """Remove test directory."""
    if os.path.exists(TEST_DIR):
        shutil.rmtree(TEST_DIR)


# =============================================================================
# UTF-8 Validation Tests
# =============================================================================

class TestUTF8Validation(unittest.TestCase):
    """Test strict UTF-8 validation (MUST 9.2, MUST 9.4)."""
    
    def test_valid_ascii(self):
        """ASCII is valid UTF-8."""
        self.assertTrue(is_valid_utf8_strict(b"hello"))
        self.assertTrue(is_valid_utf8_strict(b""))
    
    def test_valid_utf8_multibyte(self):
        """Valid multi-byte UTF-8."""
        self.assertTrue(is_valid_utf8_strict("hello ñ σελ".encode('utf-8')))
        self.assertTrue(is_valid_utf8_strict("emoji 😀".encode('utf-8')))
    
    def test_overlong_encoding(self):
        """Reject overlong encodings (MUST 9.2)."""
        # Overlong encoding of '/' (0x2F): 11000010 10001111 instead of 00101111
        self.assertFalse(is_valid_utf8_strict(b'\xc0\xaf'))
        # Overlong encoding of NUL: 11000000 10000000
        self.assertFalse(is_valid_utf8_strict(b'\xc0\x80'))
        # Overlong encoding of ASCII 'A' (0x41): 11000001 10000001
        self.assertFalse(is_valid_utf8_strict(b'\xc1\x81'))
    
    def test_encoded_surrogates(self):
        """Reject encoded surrogates (MUST 9.2)."""
        # U+D800 encoded in UTF-8 (should be rejected)
        # 0xD800 = 11011000 00000000 00000000 in UTF-16 surrogate
        # In UTF-8 this would be: 11101101 10100000 10000000
        self.assertFalse(is_valid_utf8_strict(b'\xed\xa0\x80'))
        # U+DFFF
        self.assertFalse(is_valid_utf8_strict(b'\xed\xbf\xbf'))
    
    def test_truncated_sequence(self):
        """Reject truncated UTF-8 sequences (MUST 9.2)."""
        self.assertFalse(is_valid_utf8_strict(b'\xc0'))  # Truncated 2-byte
        self.assertFalse(is_valid_utf8_strict(b'\xe0\x80'))  # Truncated 3-byte
        self.assertFalse(is_valid_utf8_strict(b'\xf0\x80\x80'))  # Truncated 4-byte
    
    def test_invalid_continuation(self):
        """Reject invalid continuation bytes."""
        self.assertFalse(is_valid_utf8_strict(b'\xc0\xc0'))  # Second byte not 10xxxxxx


# =============================================================================
# Store Tests
# =============================================================================

class TestStoreBasics(unittest.TestCase):
    """Test basic store operations."""
    
    def setUp(self):
        cleanup_test_dir()
        self.store = Store(TEST_DIR, authority_id="test", g1_floor=0)
    
    def tearDown(self):
        cleanup_test_dir()
    
    def test_init(self):
        """Store initializes correctly."""
        self.assertEqual(self.store.authority_id, "test")
        self.assertEqual(self.store.g1_floor, 0)
        self.assertTrue((self.store.store_dir / "authority.json").exists())
        self.assertTrue((self.store.store_dir / "history").exists())
        self.assertTrue((self.store.store_dir / "records").exists())
    
    def test_bind_and_read(self):
        """Test basic bind and read (MUST 3, MUST 10.1)."""
        candidate = make_valid_candidate("hello world")
        binding = self.store.bind(candidate)
        
        # Verify binding
        self.assertEqual(binding.record_id.authority_id, "test")
        self.assertEqual(binding.record_id.seq, 0)
        self.assertEqual(binding.extent, len(candidate))
        
        # Read back
        binding2, content, state = self.store.read(0)
        self.assertEqual(state, VisibilityState.PRESENT)
        self.assertEqual(content, candidate)
        self.assertEqual(binding.content_id.digest, binding2.content_id.digest)
    
    def test_sequential_allocation(self):
        """Test sequential allocation (MUST 1)."""
        self.store.bind(make_valid_candidate("first"))
        self.store.bind(make_valid_candidate("second"))
        self.store.bind(make_valid_candidate("third"))
        
        # Check seq numbers
        bindings = self.store.list_bindings()
        self.assertEqual(len(bindings), 3)
        self.assertEqual(bindings[0].record_id.seq, 0)
        self.assertEqual(bindings[1].record_id.seq, 1)
        self.assertEqual(bindings[2].record_id.seq, 2)
    
    def test_no_seq_reuse(self):
        """Test that seq numbers are never reused (MUST 1, G1)."""
        self.store.bind(make_valid_candidate("first"))
        
        # Try to bind again - should get seq 1, not 0
        binding2 = self.store.bind(make_valid_candidate("second"))
        self.assertEqual(binding2.record_id.seq, 1)
        
        # Check that marker for seq 0 still exists
        marker_path = self.store.store_dir / "history" / "0000"
        self.assertTrue(marker_path.exists())
    
    def test_admission_missing_prefix(self):
        """Test admission fails without @p-e/x0 prefix (MUST 9.2)."""
        candidate = make_candidate_no_prefix()
        with self.assertRaises(AdmissionErrorExc) as ctx:
            self.store.bind(candidate)
        self.assertEqual(ctx.exception.reason, AdmissionError.MISSING_PREFIX)
    
    def test_admission_invalid_utf8(self):
        """Test admission fails with invalid UTF-8 (MUST 9.2)."""
        candidate = ADMISSION_PREFIX + make_invalid_utf8()
        with self.assertRaises(AdmissionErrorExc) as ctx:
            self.store.bind(candidate)
        self.assertEqual(ctx.exception.reason, AdmissionError.INVALID_UTF8)
    
    def test_content_identity_is_sha256(self):
        """Test content identity is sha256 of bound-content (MUST 3, MUST 9.4)."""
        candidate = make_valid_candidate("test")
        binding = self.store.bind(candidate)
        
        expected_digest = hashlib.sha256(candidate).hexdigest()
        self.assertEqual(binding.content_id.digest, expected_digest)
    
    def test_extent_recorded(self):
        """Test extent is recorded at binding (AMENDMENT MUST 9.1)."""
        candidate = make_valid_candidate("x" * 123)
        binding = self.store.bind(candidate)
        self.assertEqual(binding.extent, 123 + len(ADMISSION_PREFIX))
    
    def test_verification_on_read(self):
        """Test content is verified on every read (MUST 10.1)."""
        candidate = make_valid_candidate("original")
        self.store.bind(candidate)
        
        # Read should work
        binding, content, state = self.store.read(0)
        self.assertEqual(state, VisibilityState.PRESENT)
        
        # Tamper with content (keep prefix so admission passes)
        record_path = self.store.store_dir / "records" / "0000"
        tampered = ADMISSION_PREFIX + b"tampered content"
        with open(record_path, 'wb') as f:
            f.write(tampered)
        
        # Read should fail verification (digest won't match)
        with self.assertRaises(VerificationError):
            self.store.read(0)
    
    def test_visibility_states(self):
        """Test visibility states (MUST 6)."""
        # UNKNOWN: no ledger entry
        state = self.store.get_visibility(999)
        self.assertEqual(state, VisibilityState.UNKNOWN)
        
        # Bind a record
        self.store.bind(make_valid_candidate("test"))
        
        # PRESENT: ledger entry and content exist
        state = self.store.get_visibility(0)
        self.assertEqual(state, VisibilityState.PRESENT)
        
        # Delete content
        self.store.delete(0)
        
        # KNOWN_MISSING: ledger entry exists but content missing
        state = self.store.get_visibility(0)
        self.assertEqual(state, VisibilityState.KNOWN_MISSING)
    
    def test_delete_preserves_marker(self):
        """Test deletion preserves allocation marker (MUST 1, MUST 6)."""
        self.store.bind(make_valid_candidate("test"))
        
        # Delete content
        self.store.delete(0)
        
        # Marker should still exist
        marker_path = self.store.store_dir / "history" / "0000"
        self.assertTrue(marker_path.exists())
        
        # Record file should not exist
        record_path = self.store.store_dir / "records" / "0000"
        self.assertFalse(record_path.exists())
        
        # Next allocation should skip seq 0
        binding = self.store.bind(make_valid_candidate("next"))
        self.assertEqual(binding.record_id.seq, 1)
    
    def test_ledger_non_rewindable(self):
        """Test ledger is non-rewindable (MUST 4)."""
        self.store.bind(make_valid_candidate("first"))
        binding = self.store.bind(make_valid_candidate("second"))
        
        # Get ledger content
        ledger_path = self.store.store_dir / "ledger.csv"
        with open(ledger_path, 'r') as f:
            ledger_content = f.read()
        
        # Verify bindings are in ledger
        self.assertIn("0,", ledger_content)
        self.assertIn("1,", ledger_content)
        
        # Modify the stored content
        record_path = self.store.store_dir / "records" / "0000"
        with open(record_path, 'ab') as f:
            f.write(b" extra")
        
        # Ledger should be unchanged
        with open(ledger_path, 'r') as f:
            new_ledger = f.read()
        self.assertEqual(ledger_content, new_ledger)
    
    def test_admission_before_verification_on_read(self):
        """Test admission is checked before verification on read (MUST 10.4)."""
        # Bind valid content
        self.store.bind(make_valid_candidate("valid"))
        
        # Tamper to make it invalid UTF-8
        record_path = self.store.store_dir / "records" / "0000"
        with open(record_path, 'wb') as f:
            f.write(ADMISSION_PREFIX + make_invalid_utf8())
        
        # Read should fail admission before verification
        with self.assertRaises(AdmissionErrorExc) as ctx:
            self.store.read(0)
        self.assertEqual(ctx.exception.reason, AdmissionError.INVALID_UTF8)
    
    def test_create_or_fail(self):
        """Test create-or-fail behavior (MUST 8)."""
        # Bind first record
        self.store.bind(make_valid_candidate("first"))
        
        # The marker for seq 0 should exist
        marker_path = self.store.store_dir / "history" / "0000"
        self.assertTrue(marker_path.exists())
        
        # Try to manually create marker for seq 0 - should fail
        try:
            fd = os.open(marker_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.close(fd)
            self.fail("Should have raised FileExistsError")
        except FileExistsError:
            pass  # Expected
    
    def test_g1_floor(self):
        """Test G1 floor declaration (MUST 2)."""
        # Create store with G1 floor of 100
        store2 = Store("test_store2", authority_id="test2", g1_floor=100)
        
        # First allocation should be 100, not 0
        binding = store2.bind(make_valid_candidate("test"))
        self.assertEqual(binding.record_id.seq, 100)
        
        # Cleanup
        shutil.rmtree("test_store2", ignore_errors=True)
    
    def test_citation(self):
        """Test citation creation and verification."""
        candidate = make_valid_candidate("cited content")
        binding = self.store.bind(candidate)
        
        # Create citation
        citation = Citation.from_binding(binding)
        self.assertEqual(citation.locator, "test-0000")
        self.assertEqual(citation.digest, binding.content_id.digest)
        
        # Verify citation
        self.assertTrue(citation.verify(self.store))
        
        # Delete record
        self.store.delete(0)
        
        # Citation should no longer verify
        self.assertFalse(citation.verify(self.store))


class TestContentIdentity(unittest.TestCase):
    """Test content identity properties."""
    
    def test_identity_separate_from_record_identity(self):
        """Test that record identity and content identity are separate (AMENDMENT)."""
        cleanup_test_dir()
        store = Store(TEST_DIR)
        
        # Two records with same content should have same content identity
        candidate = make_valid_candidate("same content")
        binding1 = store.bind(candidate)
        binding2 = store.bind(candidate)  # Same content
        
        self.assertEqual(binding1.content_id.digest, binding2.content_id.digest)
        
        # But different record identities
        self.assertNotEqual(binding1.record_id.seq, binding2.record_id.seq)
        
        cleanup_test_dir()
    
    def test_digest_over_octets_not_string(self):
        """Test content identity computed over octets, not decoded string (MUST 9.4)."""
        # Create content that would be different if decoded/re-encoded
        candidate = make_valid_candidate("test\u00e9")  # é as single char
        binding = Store(TEST_DIR).bind(candidate)
        
        # The digest should be over the UTF-8 octets
        expected = hashlib.sha256(candidate).hexdigest()
        self.assertEqual(binding.content_id.digest, expected)
        
        cleanup_test_dir()


# =============================================================================
# Integration Tests
# =============================================================================

class TestIntegration(unittest.TestCase):
    """Integration tests for store operations."""
    
    def setUp(self):
        cleanup_test_dir()
        self.store = Store(TEST_DIR, authority_id="integration", g1_floor=0)
    
    def tearDown(self):
        cleanup_test_dir()
    
    def test_full_lifecycle(self):
        """Test full record lifecycle."""
        # Create
        candidate = make_valid_candidate("lifecycle test")
        binding = self.store.bind(candidate)
        locator = binding.record_id.to_locator()
        self.assertEqual(locator, "integration-0000")
        
        # Read
        binding2, content, state = self.store.read(0)
        self.assertEqual(state, VisibilityState.PRESENT)
        self.assertEqual(content, candidate)
        
        # List
        bindings = self.store.list_bindings()
        self.assertEqual(len(bindings), 1)
        
        # Delete
        self.store.delete(0)
        
        # Check visibility
        state = self.store.get_visibility(0)
        self.assertEqual(state, VisibilityState.KNOWN_MISSING)
        
        # Try to read deleted
        binding3, content3, state3 = self.store.read(0)
        self.assertEqual(state3, VisibilityState.KNOWN_MISSING)
        self.assertIsNone(content3)
        
        # Allocate new
        binding4 = self.store.bind(make_valid_candidate("new"))
        self.assertEqual(binding4.record_id.seq, 1)
        
        # Verify old marker still exists
        marker_path = self.store.store_dir / "history" / "0000"
        self.assertTrue(marker_path.exists())
    
    def test_multiple_records(self):
        """Test multiple records with different content."""
        records = []
        for i in range(5):
            candidate = make_valid_candidate(f"record {i}")
            binding = self.store.bind(candidate)
            records.append((binding, candidate))
        
        # Verify all can be read
        for i, (binding, candidate) in enumerate(records):
            binding2, content, state = self.store.read(i)
            self.assertEqual(state, VisibilityState.PRESENT)
            self.assertEqual(content, candidate)
            self.assertEqual(binding.content_id.digest, binding2.content_id.digest)
    
    def test_extent_variation(self):
        """Test records with varying extents."""
        lengths = [10, 100, 1000, 10000]
        for length in lengths:
            content = "x" * (length - len(ADMISSION_PREFIX))
            candidate = ADMISSION_PREFIX + content.encode('utf-8')
            binding = self.store.bind(candidate)
            self.assertEqual(binding.extent, length)


# =============================================================================
# Crash Atomicity Tests (Conceptual)
# =============================================================================

class TestCrashAtomicity(unittest.TestCase):
    """
    Tests for crash-atomic behavior.
    
    Note: True crash testing requires killing the process mid-operation,
    which is hard to do reliably in unit tests. These tests verify the
    mechanisms that provide crash atomicity.
    """
    
    def setUp(self):
        cleanup_test_dir()
        self.store = Store(TEST_DIR)
    
    def tearDown(self):
        cleanup_test_dir()
    
    def test_temp_file_rename_pattern(self):
        """Test that content is written via temp file + rename."""
        candidate = make_valid_candidate("atomic test")
        binding = self.store.bind(candidate)
        
        # Record file should exist
        record_path = self.store.store_dir / "records" / "0000"
        self.assertTrue(record_path.exists())
        
        # No temp files should remain
        records_dir = self.store.store_dir / "records"
        temp_files = [f for f in records_dir.iterdir() if f.name.startswith('.') and f.name.endswith('.')]
        self.assertEqual(len(temp_files), 0)
    
    def test_ledger_append_only(self):
        """Test that ledger is append-only."""
        self.store.bind(make_valid_candidate("first"))
        self.store.bind(make_valid_candidate("second"))
        
        ledger_path = self.store.store_dir / "ledger.csv"
        with open(ledger_path, 'r') as f:
            lines = f.readlines()
        
        # Should have exactly 2 entries
        self.assertEqual(len(lines), 2)
        
        # Each line should end with newline
        for line in lines:
            self.assertTrue(line.endswith('\n'))


# =============================================================================
# Edge Cases
# =============================================================================

class TestEdgeCases(unittest.TestCase):
    """Test edge cases and boundary conditions."""
    
    def setUp(self):
        cleanup_test_dir()
        self.store = Store(TEST_DIR)
    
    def tearDown(self):
        cleanup_test_dir()
    
    def test_empty_content(self):
        """Test binding with minimal valid content."""
        # Just the prefix
        candidate = ADMISSION_PREFIX
        binding = self.store.bind(candidate)
        self.assertEqual(binding.extent, len(ADMISSION_PREFIX))
        
        binding2, content, state = self.store.read(0)
        self.assertEqual(content, candidate)
    
    def test_unicode_content(self):
        """Test content with various Unicode characters."""
        test_strings = [
            "ASCII",
            "ñ",  # Latin-1 supplement
            "αβγ",  # Greek
            "你好",  # Chinese
            "😀🎉",  # Emoji
        ]
        
        for s in test_strings:
            candidate = make_valid_candidate(s)
            binding = self.store.bind(candidate)
            binding2, content, state = self.store.read(binding.record_id.seq)
            self.assertEqual(state, VisibilityState.PRESENT)
            self.assertEqual(content, candidate)
    
    def test_large_content(self):
        """Test large content (within reason)."""
        large_content = "x" * 100000
        candidate = ADMISSION_PREFIX + large_content.encode('utf-8')
        binding = self.store.bind(candidate)
        self.assertEqual(binding.extent, len(candidate))
        
        binding2, content, state = self.store.read(0)
        self.assertEqual(content, candidate)
    
    def test_read_nonexistent(self):
        """Test reading non-existent seq."""
        binding, content, state = self.store.read(999)
        self.assertIsNone(binding)
        self.assertIsNone(content)
        self.assertEqual(state, VisibilityState.UNKNOWN)


# =============================================================================
# Main
# =============================================================================

if __name__ == '__main__':
    # Run tests
    unittest.main(verbosity=2)
