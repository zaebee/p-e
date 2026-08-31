"""Tests for store.py, organised by the clause each one is evidence for.

Run: python3 test_store.py
"""

from __future__ import annotations

import hashlib
import multiprocessing as mp
import os
import shutil
import sys
import tempfile
import traceback

import store as S
from store import Candidate, Citation, Refused, Store, StoreFailure

TESTS = []


def test(fn):
    TESTS.append(fn)
    return fn


def fresh(**kw) -> Store:
    root = tempfile.mkdtemp(prefix="pe-store-")
    return Store.create(root, **kw)


def rec(body: str = "hello", extra: str = "") -> Candidate:
    text = "@p-e/x0\nkind: note\n" + (extra + "\n" if extra else "") + "\n" + body + "\n"
    b = text.encode("utf-8")
    return Candidate(b, len(b))


# ------------------------------------------------------------------ MUST 1

@test
def must1_allocation_is_unique_monotone_and_never_reuses():
    st = fresh()
    locs = [st.deposit(rec(f"r{i}")).locator for i in range(5)]
    assert locs == ["relay-0001", "relay-0002", "relay-0003", "relay-0004", "relay-0005"], locs
    seqs = [st.seq_of(l) for l in locs]
    assert seqs == sorted(set(seqs)) and len(set(seqs)) == 5


def _child(root, out_q, i):
    st = Store(root)
    try:
        out_q.put(st.deposit(rec(f"racer-{i}")).locator)
    except Exception as exc:  # pragma: no cover
        out_q.put(f"ERR {exc}")


@test
def must1_sixteen_racing_writers_get_sixteen_distinct_ids():
    """MUST 1: 'the `wx` claim is atomic, has no shared race point, and succeeds
    for exactly one writer' (capsule 04: 16 racing writers -> 16 ids, 0 dups)."""
    st = fresh()
    ctx = mp.get_context("fork")
    q = ctx.Queue()
    procs = [ctx.Process(target=_child, args=(st.root, q, i)) for i in range(16)]
    for p in procs:
        p.start()
    got = [q.get(timeout=60) for _ in range(16)]
    for p in procs:
        p.join(60)
    assert all(not str(g).startswith("ERR") for g in got), got
    assert len(set(got)) == 16, got


@test
def must1_marker_persists_so_an_id_cannot_be_rebound():
    """The marker 'persists beyond deletion of the record', so a freed id is not
    reallocated. Deletion itself is out of scope (CONTRACT §2); the record file is
    removed out of band here purely to exercise the marker's guard."""
    st = fresh()
    a = st.deposit(rec("first")).locator
    st.deposit(rec("second"))
    os.unlink(os.path.join(st.root, "records", a))          # out of band
    assert st.allocated(st.seq_of(a))                        # marker still there
    c = st.deposit(rec("third")).locator
    assert c == "relay-0003", c                              # never reuses relay-0001
    assert st.visibility(a) == S.KNOWN_MISSING               # ledger still answers


@test
def must1_allocation_never_reads_a_maximum():
    """Structural: the allocator contains no max() over present ids, and the only
    claim it makes is an O_EXCL create."""
    src = open(os.path.join(os.path.dirname(__file__), "store.py")).read()
    alloc = src.split("def _allocate")[1].split("def allocated")[0]
    assert "max(" not in alloc and "sorted(" not in alloc, alloc
    assert "_create_exclusive" in alloc


# ------------------------------------------------------------------ MUST 2

@test
def must2_authority_declares_a_floor_and_claims_nothing_below_it():
    st = fresh(g1_floor=32)
    assert st.deposit(rec()).locator == "relay-0032"
    assert st.claims_g1(32) and st.claims_g1(99)
    assert not st.claims_g1(31) and not st.claims_g1(1)


# ------------------------------------------------------------------ MUST 3 (+AMD)

@test
def must3_content_identity_is_sha256_of_bound_content_and_stable_across_ids():
    st = fresh()
    c = rec("same body")
    b1 = st.deposit(c)
    b2 = st.deposit(c)
    assert b1.content_identity == b2.content_identity == hashlib.sha256(c.octets).hexdigest()
    assert b1.locator != b2.locator                      # identity is allocated...
    assert st.read(b1.locator).content == st.read(b2.locator).content


@test
def amd_must3_record_identity_does_not_derive_from_content_identity():
    """Unobservable by construction ('A store cannot observe it'); what is testable
    is the negative consequence: identical content gets different identities, and
    different content can get adjacent identities."""
    st = fresh()
    same_a = st.deposit(rec("x")).locator
    same_b = st.deposit(rec("x")).locator
    diff = st.deposit(rec("y")).locator
    assert same_a != same_b
    assert st.seq_of(diff) == st.seq_of(same_b) + 1


@test
def amd_must3_deduplication_is_not_switched_off_for_declared_id_records():
    st = fresh()
    a = st.deposit(rec("dup")).locator
    b = st.deposit(rec("dup")).locator
    obj = os.path.join(st.root, "objects", st.cite(a).content_digest)
    assert os.stat(obj).st_nlink == 3                     # object + two records
    assert os.stat(os.path.join(st.root, "records", b)).st_ino == os.stat(obj).st_ino
    # a declared-id record travels the identical path; nothing is special-cased
    c = st.deposit(rec("with id", extra="id: relay-0003")).locator
    cobj = os.path.join(st.root, "objects", st.cite(c).content_digest)
    assert os.stat(cobj).st_nlink == 2                    # object + its one record


# ------------------------------------------------------------------ MUST 4

@test
def must4_a_bound_seq_never_changes_its_digest():
    st = fresh()
    loc = st.deposit(rec("immutable")).locator
    d0 = st.cite(loc).content_digest
    for _ in range(3):
        st.read(loc)
    assert st.cite(loc).content_digest == d0
    # the binding write is create-or-fail, so a second binding of the same seq
    # cannot overwrite the first
    assert S._create_exclusive(os.path.join(st.root, "ledger", loc), b"{}") is False
    assert st.cite(loc).content_digest == d0


# ------------------------------------------------------------------ MUST 5

@test
def must5_parent_is_scoped_to_the_same_authority():
    st = fresh()
    p = st.deposit(rec("root")).locator
    child = st.deposit(rec("child", extra=f"parent: {p}")).locator
    assert st.references(child).parent == p
    try:
        st.deposit(rec("bad", extra="parent: otherauth-0007"))
        assert False, "cross-authority parent should be refused"
    except Refused as e:
        assert e.code == "PARENT_OUT_OF_SCOPE"


@test
def must5_cross_authority_references_are_labelled_observations():
    st = fresh()
    loc = st.deposit(rec("obs", extra="observes: otherauth-0007")).locator
    r = st.references(loc)
    assert r.parent is None
    assert r.observations == [{"reference": "otherauth-0007", "kind": "OBSERVATION",
                               "in_chain": False}]


@test
def mustnot_deposit_does_not_depend_on_the_parent_being_present():
    st = fresh()
    loc = st.deposit(rec("orphan", extra="parent: relay-9999")).locator
    assert st.visibility("relay-9999") == S.KNOWN_MISSING   # named in a header
    assert st.references(loc).parent == "relay-9999"


# ------------------------------------------------------------------ MUST 6

@test
def must6_present_known_missing_and_unknown():
    st = fresh()
    loc = st.deposit(rec("here")).locator
    assert st.visibility(loc) == S.PRESENT
    assert st.visibility("relay-0500") == S.UNKNOWN        # never allocated, unnamed


@test
def must6_crash_between_ledger_and_payload_is_known_missing():
    """'Ledger committed, bytes never written: the id is bound and the content
    unreachable. That state is KNOWN_MISSING ... not UNKNOWN and not an error.'"""
    st = fresh()
    st.fault = "after_binding"
    try:
        st.deposit(rec("lost"))
        assert False, "fault should have fired"
    except StoreFailure:
        pass
    st.fault = None
    loc = "relay-0001"
    assert st.is_bound(loc)
    assert st.visibility(loc) == S.KNOWN_MISSING
    r = st.read(loc)
    assert r.visibility == S.KNOWN_MISSING and r.content is None
    assert r.recorded_content_identity is not None         # the digest is known


@test
def must6_an_abandoned_allocation_is_unknown_not_bound():
    st = fresh()
    st.fault = "after_marker"
    try:
        st.deposit(rec("never bound"))
        assert False
    except StoreFailure:
        pass
    st.fault = None
    assert st.allocated(1) and not st.is_bound("relay-0001")
    assert st.visibility("relay-0001") == S.UNKNOWN
    assert st.deposit(rec("next")).locator == "relay-0002"


@test
def must6_a_failure_is_not_reported_as_absence():
    if os.geteuid() == 0:
        return  # root bypasses the permission bit; nothing to assert
    st = fresh()
    loc = st.deposit(rec("guarded")).locator
    d = os.path.join(st.root, "records")
    os.chmod(d, 0o000)
    try:
        st.visibility(loc)
        assert False, "an EACCES must not be reported as KNOWN_MISSING"
    except StoreFailure:
        pass
    finally:
        os.chmod(d, 0o755)


# ------------------------------------------------------------------ MUST 7

@test
def must7_absence_of_a_witness_is_reported_as_absence():
    st = fresh()
    loc = st.deposit(rec("unwitnessed")).locator
    w = st.witnesses(loc)
    assert w.status == S.WITNESS_ABSENT and w.attestations == []
    st.attest("gemini", [loc], kind="b")
    w2 = st.witnesses(loc)
    assert w2.status == S.WITNESS_PRESENT
    assert w2.attestations[0]["kind"] == "b"
    assert w2.attestations[0]["digest_attested"] == st.cite(loc).content_digest


@test
def mustnot_a_witness_never_orders_records():
    st = fresh()
    a = st.deposit(rec("a")).locator
    b = st.deposit(rec("b")).locator
    st.attest("gemini", [a, b], kind="c")
    for loc in (a, b):
        w = st.witnesses(loc)
        assert w.orders_records is False
        assert w.independence_asserted is False


# ------------------------------------------------------------------ MUST 8

@test
def must8_create_or_fail_a_write_to_a_held_id_fails():
    st = fresh()
    loc = st.deposit(rec("held")).locator
    dest = os.path.join(st.root, "records", loc)
    before = open(dest, "rb").read()
    created = S._durable_then_link(os.path.join(st.root, "tmp"), dest, b"@p-e/x0\n\nusurper\n")
    assert created is False
    assert open(dest, "rb").read() == before               # nothing was replaced


@test
def must8_the_binding_write_is_never_rename():
    src = open(os.path.join(os.path.dirname(__file__), "store.py")).read()
    assert "os.rename" not in src and "os.replace" not in src
    assert "os.link(" in src


@test
def must8_crash_leaves_no_partial_record_at_that_id():
    st = fresh()
    st.fault = "after_binding"
    try:
        st.deposit(rec("interrupted"))
    except StoreFailure:
        pass
    st.fault = None
    assert not os.path.exists(os.path.join(st.root, "records", "relay-0001"))
    # and no half-written name was left behind under any id
    assert os.listdir(os.path.join(st.root, "records")) == []


@test
def must8_bytes_are_durable_before_the_name_appears():
    """Structural: the payload path fsyncs the staging file and its directory
    before link() makes any name point at the octets, and fsyncs the destination
    directory after. Durability itself is unverifiable here (see NOTES)."""
    src = open(os.path.join(os.path.dirname(__file__), "store.py")).read()
    body = src.split("def _durable_then_link")[1].split("# ----")[0]
    fsync_before = body.index("os.fsync(fd)") < body.index("os.link(")
    assert fsync_before
    assert body.index("_fsync_dir(tmp_dir)") < body.index("os.link(")
    assert "_fsync_dir(os.path.dirname(dest))" in body


# ------------------------------------------------------------------ AMD 9.1

@test
def amd91_extent_is_of_the_offer_and_is_recorded_and_recoverable():
    st = fresh()
    c = rec("measure me")
    b = st.deposit(c)
    assert b.extent == len(c.octets)
    assert st.recorded_extent(b.locator) == len(c.octets)
    assert st.stored_extent(b.locator) == len(c.octets)


@test
def amd91_an_offer_whose_extent_disagrees_with_its_octets_is_refused():
    st = fresh()
    c = rec("body")
    try:
        st.deposit(Candidate(c.octets, len(c.octets) - 2))
        assert False, "extent mismatch must be refused"
    except Refused as e:
        assert e.code == "EXTENT_MISMATCH"
    assert st.locators() == []                     # and nothing was bound


# ------------------------------------------------------------------ AMD 9.2

@test
def amd92_a_candidate_must_begin_with_the_magic_octets():
    st = fresh()
    for bad in (b"p-e/x0\n\nno at\n", b"\n@p-e/x0\n\nleading nl\n", b"", b"@p-e/x1\n\nx\n"):
        try:
            st.deposit(Candidate(bad, len(bad)))
            assert False, f"admitted {bad!r}"
        except Refused as e:
            assert e.code == "NOT_ADMISSIBLE"
    ok = b"@p-e/x0\n\nfine\n"
    assert st.deposit(Candidate(ok, len(ok))).locator == "relay-0001"


@test
def amd92_ill_formed_utf8_is_refused_table_3_7():
    st = fresh()
    cases = {
        "overlong 2-byte NUL": b"\xc0\x80",
        "overlong 3-byte slash": b"\xe0\x80\xaf",
        "encoded surrogate D800": b"\xed\xa0\x80",
        "unpaired low surrogate": b"\xed\xb0\x80",
        "truncated 3-byte": b"\xe2\x82",
        "above U+10FFFF": b"\xf4\x90\x80\x80",
        "invalid lead F5": b"\xf5\x80\x80\x80",
        "bare continuation": b"\x80",
        "lone FE": b"\xfe",
    }
    for name, bad in cases.items():
        cand = b"@p-e/x0\n\n" + bad + b"\n"
        try:
            st.deposit(Candidate(cand, len(cand)))
            assert False, f"admitted {name}"
        except Refused as e:
            assert e.code == "NOT_ADMISSIBLE", name
    good = "@p-e/x0\n\nsnowman ☃ and \U0001f41d\n".encode("utf-8")
    assert st.deposit(Candidate(good, len(good))).locator


# ------------------------------------------------------------------ AMD 9.3 / 9.4

@test
def amd93_octets_are_stored_exactly_as_they_arrived():
    st = fresh()
    awkward = (
        b"@p-e/x0\r\nkind: crlf\r\n\r\n"
        b"trailing spaces   \r\n\ttab-indented\r\nno final newline"
    )
    b = st.deposit(Candidate(awkward, len(awkward)))
    got = st.read(b.locator)
    assert got.content == awkward                    # byte for byte, no trim/pad
    assert got.extent == len(awkward)


@test
def amd94_the_digest_is_over_octets_never_over_a_decoded_string():
    st = fresh()
    text = "@p-e/x0\nkind: unicode\n\nnaïve ☃ \U0001f41d\n"
    octets = text.encode("utf-8")
    b = st.deposit(Candidate(octets, len(octets)))
    assert b.content_identity == hashlib.sha256(octets).hexdigest()
    assert b.content_identity != hashlib.sha256(text.encode("utf-16")).hexdigest()
    raw = st.read(b.locator).content
    assert b"\xef\xbf\xbd" not in raw                # no replacement characters


# ------------------------------------------------------------------ AMD 10

@test
def amd101_content_identity_is_recorded_at_binding_and_verified_on_every_read():
    st = fresh()
    b = st.deposit(rec("verify me"))
    for _ in range(3):
        r = st.read(b.locator)
        assert r.integrity == S.VERIFIED
        assert r.recorded_content_identity == r.computed_content_identity == b.content_identity


@test
def amd103_an_integrity_disagreement_does_not_move_a_record_out_of_present():
    st = fresh()
    b = st.deposit(rec("original"))
    path = os.path.join(st.root, "records", b.locator)
    replacement = b"@p-e/x0\nkind: note\n\ntampered\n"   # still admissible
    os.unlink(path)
    with open(path, "wb") as fh:
        fh.write(replacement)
    r = st.read(b.locator)
    assert r.visibility == S.PRESENT                     # unchanged, per 10.3
    assert r.integrity == S.MISMATCH
    assert r.recorded_content_identity == b.content_identity
    assert r.computed_content_identity == hashlib.sha256(replacement).hexdigest()
    assert r.content == replacement                      # reported, not withheld


@test
def amd104_admission_is_tested_before_verification():
    st = fresh()
    b = st.deposit(rec("original"))
    path = os.path.join(st.root, "records", b.locator)
    os.unlink(path)
    with open(path, "wb") as fh:
        fh.write(b"NOT-MAGIC\n\nboth checks would fail\n")
    r = st.read(b.locator)
    assert r.integrity == S.ADMISSION_FAILED             # not MISMATCH
    assert r.visibility == S.PRESENT
    assert "begin with" in r.admission_detail


@test
def amd105_records_bound_without_a_recorded_identity_are_distinguished():
    st = fresh()
    good = st.deposit(rec("recorded")).locator
    legacy = st.bind_without_recorded_identity(b"@p-e/x0\n\nno digest recorded\n").locator
    assert st.read(good).integrity == S.VERIFIED
    r = st.read(legacy)
    assert r.integrity == S.UNRECORDED
    assert r.verified is False
    assert r.recorded_content_identity is None
    assert r.visibility == S.PRESENT


# ------------------------------------------------------- citation & envelope

@test
def citation_is_a_pair_never_a_bare_locator():
    st = fresh()
    loc = st.deposit(rec("cited")).locator
    c = st.cite(loc)
    assert c.store_identity == st.store_identity
    assert c.as_pair() == (loc, hashlib.sha256(st.read(loc).content).hexdigest())
    assert st.resolve(c).integrity == S.VERIFIED
    try:
        st.resolve(loc)                                  # a bare locator
        assert False
    except Refused as e:
        assert e.code == "BARE_LOCATOR"


@test
def citation_detects_rebinding_and_a_foreign_store():
    st = fresh()
    loc = st.deposit(rec("cited")).locator
    wrong = Citation(st.store_identity, loc, "0" * 64)
    try:
        st.resolve(wrong)
        assert False
    except Refused as e:
        assert e.code == "REBOUND"
    try:
        st.resolve(Citation("some-other-store", loc, st.cite(loc).content_digest))
        assert False
    except Refused as e:
        assert e.code == "FOREIGN_STORE"


@test
def envelope_declared_id_is_optional_and_checked_when_present():
    st = fresh()
    assert st.deposit(rec("no id at all")).locator == "relay-0001"      # optional
    assert st.deposit(rec("agrees", extra="id: relay-0002")).locator == "relay-0002"
    try:
        st.deposit(rec("disagrees", extra="id: relay-0999"))
        assert False, "a disagreeing declared id must be checked"
    except Refused as e:
        assert e.code == "DECLARED_ID_DISAGREES"
    assert st.allocated(3) and not st.is_bound("relay-0003")  # abandoned once taken
    assert st.deposit(rec("next")).locator == "relay-0004"    # and never reused


@test
def envelope_a_header_like_line_in_the_body_is_not_a_field():
    st = fresh()
    text = "@p-e/x0\nkind: note\n\nid: relay-9999\nparent: otherauth-0001\n"
    octets = text.encode()
    b = st.deposit(Candidate(octets, len(octets)))
    assert b.locator == "relay-0001"                    # the body id was not adopted
    assert st.references(b.locator).parent is None      # nor the body parent
    assert S.field_value(octets, "id") is None


@test
def a_line_carrying_whitespace_is_not_blank():
    st = fresh()
    text = "@p-e/x0\nkind: note\n \nid: relay-9999\n\nbody\n"
    octets = text.encode()
    # the ' ' line is not blank, so `id:` below it IS in the header block
    assert S.field_value(octets, "id") == b"relay-9999"
    try:
        st.deposit(Candidate(octets, len(octets)))
        assert False
    except Refused as e:
        assert e.code == "DECLARED_ID_DISAGREES"


@test
def crlf_header_values_carry_their_trailing_cr():
    """A consequence of DECISION 11, pinned rather than left accidental: with LF as
    the only line terminator, every header line of a CRLF record ends in an octet
    that is part of the field's value. A CRLF record therefore cannot carry a
    checked field, and is refused rather than silently normalised (AMD 9.3)."""
    st = fresh()
    text = "@p-e/x0\r\nkind: note\r\nparent: relay-0001\r\n\r\nbody\r\n"
    octets = text.encode()
    assert S.field_value(octets, "parent") == b"relay-0001\r"     # the CR is in the value
    try:
        st.deposit(Candidate(octets, len(octets)))
        assert False, "a CRLF parent value is not a locator of this authority"
    except Refused as e:
        assert e.code == "PARENT_OUT_OF_SCOPE"
    # an LF record with padded whitespace around the value is accepted
    ok = b"@p-e/x0\nid:  relay-0002 \n\nbody\n"
    st.deposit(Candidate(b"@p-e/x0\n\nfirst\n", len(b"@p-e/x0\n\nfirst\n")))
    assert st.deposit(Candidate(ok, len(ok))).locator == "relay-0002"


# ------------------------------------------------------------- MUST NOT / MAY

@test
def mustnot_no_vantage_limited_verdict_is_offered_as_a_record_property():
    st = fresh()
    st.deposit(rec("a"))
    st.deposit(rec("b"))
    assert not hasattr(st, "latest") and not hasattr(st, "unreferenced")
    assert st.highest_seq_from_this_vantage() == 2
    assert not hasattr(S.ReadResult, "is_latest")


@test
def may_reading_order_is_a_convention_and_no_global_order_is_claimed():
    st = fresh()
    locs = [st.deposit(rec(f"n{i}")).locator for i in range(4)]
    assert st.locators() == locs                        # (authority_id, seq)
    assert not hasattr(st, "global_order")


@test
def k3_the_hash_function_is_sha256():
    assert S.content_identity(b"abc") == hashlib.sha256(b"abc").hexdigest()


# ------------------------------------------------------------------- runner

def main() -> int:
    failed = []
    for fn in TESTS:
        try:
            fn()
            print(f"  ok    {fn.__name__}")
        except Exception:
            failed.append(fn.__name__)
            print(f"  FAIL  {fn.__name__}")
            traceback.print_exc()
    print(f"\n{len(TESTS) - len(failed)}/{len(TESTS)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
