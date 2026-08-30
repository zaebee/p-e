"""Tests for store.py. Run: python3 test_store.py

Each test names the clause it is evidence for. What is NOT tested, and why, is in
NOTES.md.
"""

import hashlib
import json
import multiprocessing as mp
import os
import shutil
import sys
import tempfile

import store as S

PASS, FAIL = [], []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(("  ok   " if cond else "  FAIL ") + name + (f"  -- {detail}" if detail and not cond else ""))


def fresh(floor=32, authority="alpha"):
    root = tempfile.mkdtemp(prefix="pe-store-")
    return S.Store.create(root, store_identity="urn:p-e:store:alpha-test",
                          authority_id=authority, g1_floor=floor)


def rec(body=b"hello", **hdr):
    lines = [b"@p-e/x0"]
    for k, v in hdr.items():
        lines.append(k.replace("_", "-").encode() + b": " + v.encode())
    return b"\n".join(lines) + b"\n\n" + body


def dep(st, octets, **kw):
    return st.deposit(octets, len(octets), **kw)


# --------------------------------------------------------------------------- #
print("\n-- round trip, fidelity, citation (A 9.3, 9.4; S Citing a record)")
st = fresh()
cand = rec(b"the body\n\xe2\x82\xac euro", note="x")
cite = dep(st, cand)
r = st.read(cite.locator)
check("deposit then read returns OK", r.verdict == "OK", r.verdict)
check("bound-content is octet-identical", r.bound_content == cand)
check("stored object file is the candidate and nothing else (DECISION 4)",
      open(st.object_path(cite.locator), "rb").read() == cand)
check("stored size equals recorded extent (A 9.1)",
      os.path.getsize(st.object_path(cite.locator)) == r.entry.extent == len(cand))
check("content identity is sha256 over octets (A 9.4, K3)",
      cite.digest == hashlib.sha256(cand).hexdigest())
check("citation carries store identity, locator, digest",
      (cite.store_identity, cite.locator, cite.digest) ==
      (st.store_identity, r.entry.locator, r.entry.content_identity))
check("visibility PRESENT", r.visibility == "PRESENT")
check("witness absence reported as absence (S MUST 7)", r.witnesses == [] and r.witnesses_absent)
check("no replacement characters: raw octets survive a non-ASCII body (A 9.4)",
      b"\xe2\x82\xac" in r.bound_content)

# --------------------------------------------------------------------------- #
print("\n-- allocation: floor, monotonicity, density (S MUST 1, MUST 2; DECISION 2)")
st2 = fresh(floor=32)
locs = [dep(st2, rec(b"r%d" % i)).locator for i in range(5)]
check("first binding sits at the declared floor",
      locs[0] == "alpha-0032", locs[0])
check("seqs are dense and monotone above the floor",
      [S.split_locator(l)[1] for l in locs] == [32, 33, 34, 35, 36])
check("no marker below the floor", min(st2.allocated_seqs()) == 32)
check("locator carries the authority id (DECISION 1)",
      all(l.startswith("alpha-") for l in locs))
check("g1 floor is recorded in the authority declaration (S MUST 2)",
      json.load(open(os.path.join(st2.root, "authority.json")))["g1_floor"] == 32)

# --------------------------------------------------------------------------- #
print("\n-- allocation under concurrency (S MUST 1; capsule 04's 16 writers)")


def _worker(args):
    root, i = args
    s = S.Store(root)
    return dep(s, rec(b"concurrent %d" % i)).locator


st3 = fresh(floor=0)
with mp.get_context("fork").Pool(16) as pool:
    got = pool.map(_worker, [(st3.root, i) for i in range(16)])
check("16 racing writers get 16 distinct ids, 0 duplicates",
      len(set(got)) == 16, f"{len(set(got))} distinct of {len(got)}")
check("and the space they took is exactly 0..15",
      sorted(S.split_locator(l)[1] for l in got) == list(range(16)))

# --------------------------------------------------------------------------- #
print("\n-- the relay-0183 class: a freed id is not reallocated (S MUST 1)")
st4 = fresh(floor=0)
a = dep(st4, rec(b"first occupant")).locator
os.remove(st4.object_path(a))                    # as a deletion would
os.remove(st4.bind_path(a))                      # even losing the ledger entry
b = dep(st4, rec(b"second occupant")).locator
check("the marker survives and the id is never handed out again",
      a != b and os.path.exists(st4.marker_path(a)))
check("the allocator skips it rather than filling the hole",
      S.split_locator(b)[1] == S.split_locator(a)[1] + 1)

# --------------------------------------------------------------------------- #
print("\n-- create-or-fail on the binding write (S MUST 8; DECISION 9)")
st5 = fresh(floor=0)
c = dep(st5, rec(b"held")).locator
try:
    S.write_crash_atomic_create_or_fail(st5.tmp, st5.object_path(c), b"@p-e/x0\n\nreplacement")
    check("a write to a held id fails rather than replacing", False, "it succeeded")
except S.Refused as e:
    check("a write to a held id fails rather than replacing", e.reason == "id_already_bound")
check("the original bytes are untouched",
      open(st5.object_path(c), "rb").read().endswith(b"held"))
try:
    S.write_crash_atomic_create_or_fail(st5.tmp, st5.bind_path(c), b"{}")
    check("the ledger entry is non-rewindable (S MUST 4)", False, "it succeeded")
except S.Refused as e:
    check("the ledger entry is non-rewindable (S MUST 4)", e.reason == "id_already_bound")

# --------------------------------------------------------------------------- #
print("\n-- write order: ledger before record (S Named failures)")
order = []
_real = S.write_crash_atomic_create_or_fail


def _spy(tmp_dir, final_path, payload):
    order.append(os.path.basename(final_path))
    return _real(tmp_dir, final_path, payload)


S.write_crash_atomic_create_or_fail = _spy
st6 = fresh(floor=0)
order.clear()
d = dep(st6, rec(b"ordered")).locator
S.write_crash_atomic_create_or_fail = _real
check("the ledger entry is written before the record",
      order == [d + ".bind", d + ".rec"], str(order))

# --------------------------------------------------------------------------- #
print("\n-- admission (A 9.2)")
st7 = fresh(floor=0)
for name, cand, reason in [
    ("no @p-e/x0 prefix", b"id: x\n\nbody", "not_x0"),
    ("overlong encoding", b"@p-e/x0\n\n\xc0\xaf", "not_utf8"),
    ("encoded surrogate", b"@p-e/x0\n\n\xed\xa0\x80", "not_utf8"),
    ("truncated sequence", b"@p-e/x0\n\n\xe2\x82", "not_utf8"),
]:
    try:
        dep(st7, cand)
        check(f"refused: {name}", False, "admitted")
    except S.Refused as e:
        check(f"refused: {name}", e.reason == reason, e.reason)
check("a refused candidate consumes no seq", st7.allocated_seqs() == [])

# --------------------------------------------------------------------------- #
print("\n-- extent is a property of the offer (A 9.1; DECISION 5)")
st8 = fresh(floor=0)
cand = rec(b"body")
try:
    st8.deposit(cand, len(cand) - 1)
    check("a disagreeing extent is refused", False, "admitted")
except S.Refused as e:
    check("a disagreeing extent is refused", e.reason == "extent_disagrees_with_offer")
check("and nothing was allocated for it", st8.allocated_seqs() == [])
ok = st8.deposit(cand, len(cand))
check("extent is recorded at binding", st8.ledger_entry(ok.locator).extent == len(cand))

# --------------------------------------------------------------------------- #
print("\n-- the envelope id (S Envelope convention; DECISION 7)")
st9 = fresh(floor=0)
first = dep(st9, rec(b"no envelope id"))
check("id: is optional -- a record with no envelope id binds and reads",
      st9.read(first.locator).verdict == "OK"
      and "id" not in S.header_fields(st9.read(first.locator).bound_content))
matching = rec(b"body", id="alpha-0001")
m = dep(st9, matching)
check("a matching envelope id is accepted at the id it names", m.locator == "alpha-0001")
try:
    dep(st9, rec(b"body", id="alpha-0099"))
    check("a mismatching envelope id is refused", False, "admitted")
except S.Refused as e:
    check("a mismatching envelope id is refused", e.reason == "declared_id_mismatch")
abandoned = "alpha-0002"
check("the id it consumed is abandoned: marker, no binding",
      os.path.exists(st9.marker_path(abandoned)) and st9.ledger_entry(abandoned) is None)
check("and it reads UNKNOWN (DECISION 12)", st9.visibility(abandoned) == "UNKNOWN")
dep(st9, rec(b"points back", parent=abandoned))
check("naming it as a parent does not flip it to KNOWN_MISSING (DECISION 12)",
      st9.visibility(abandoned) == "UNKNOWN")
check("a header-like line in the body is not adopted as a field (S line 320)",
      st9.read("alpha-0001").verdict == "OK")
body_quoting = b"@p-e/x0\n\nid: alpha-9999\nquoted header above\n"
q = st9.deposit(body_quoting, len(body_quoting))
check("a quoted id: below the blank line is not a declared id",
      st9.read(q.locator).verdict == "OK")

# --------------------------------------------------------------------------- #
print("\n-- parent scoping (S MUST 5 and its MUST NOT; DECISION 8)")
st10 = fresh(floor=0)
p0 = dep(st10, rec(b"root, no parent:")).locator
check("out-of-chain is omission of parent:, not a second dialect",
      "parent" not in S.header_fields(open(st10.object_path(p0), "rb").read()))
dep(st10, rec(b"child", parent=p0))
check("a same-authority parent is accepted", st10.visibility("alpha-0001") == "PRESENT")
dangling = dep(st10, rec(b"dangling", parent="alpha-0777"))
check("deposit does not depend on the parent being present and readable",
      st10.read(dangling.locator).verdict == "OK")
try:
    dep(st10, rec(b"foreign", parent="beta-0001"))
    check("a cross-authority parent: is refused", False, "admitted")
except S.Refused as e:
    check("a cross-authority parent: is refused", e.reason == "parent_crosses_authority")
obs = dep(st10, rec(b"observation", ref="beta-0001"))
check("the same reference is accepted when labelled ref:",
      st10.read(obs.locator).verdict == "OK")

# --------------------------------------------------------------------------- #
print("\n-- the header block (A Header block; DECISION 6)")
hb = b"@p-e/x0\nid: alpha-0000\n  \nparent: alpha-0000\n\nbody"
f = S.header_fields(hb)
check("a whitespace-only line does not end the header block",
      set(f) == {"id", "parent"}, str(sorted(f)))
check("bound-content with no blank line is all header block",
      set(S.header_fields(b"@p-e/x0\nid: alpha-0000\n")) == {"id"})
check("CRLF: a bare CR line is blank",
      set(S.header_fields(b"@p-e/x0\r\nid: alpha-0000\r\n\r\nnote: body\r\n")) == {"id"})
try:
    S.header_fields(b"@p-e/x0\nid: a-0000\nid: a-0001\n\nbody")
    check("a repeated header field is refused", False, "accepted")
except S.Refused as e:
    check("a repeated header field is refused", e.reason == "duplicate_header_field")

# --------------------------------------------------------------------------- #
print("\n-- visibility (S MUST 6; DECISION 12)")
st11 = fresh(floor=0)
v = dep(st11, rec(b"visible")).locator
check("PRESENT while bound and held", st11.visibility(v) == "PRESENT")
os.remove(st11.object_path(v))
r = st11.read(v)
check("bound with bytes gone is KNOWN_MISSING, not UNKNOWN",
      r.visibility == "KNOWN_MISSING" and r.verdict == "CONTENT_UNREACHABLE")
check("and the ledger still answers with (authority, seq, digest)",
      r.citation.digest == r.entry.content_identity and r.entry.seq == 0)
check("no bound-content is returned for it", r.bound_content is None)
os.remove(st11.bind_path(v))
check("allocated but never bound is UNKNOWN", st11.visibility(v) == "UNKNOWN")
check("never allocated is UNKNOWN", st11.visibility("alpha-0500") == "UNKNOWN")
check("and reads NOT_BOUND rather than an error",
      st11.read("alpha-0500").verdict == "NOT_BOUND")

# --------------------------------------------------------------------------- #
print("\n-- verification on read (A 10.1, 10.3, 10.4; DECISIONS 10, 11)")
st12 = fresh(floor=0)
x = dep(st12, rec(b"authentic")).locator
tampered = rec(b"forged!!!")
os.chmod(st12.object_path(x), 0o644)
with open(st12.object_path(x), "wb") as fh:
    fh.write(tampered)
r = st12.read(x)
check("recomputed disagreeing with recorded fails the read (DECISION 11)",
      r.verdict == "DIGEST_MISMATCH", r.verdict)
check("no bound-content is handed back", r.bound_content is None)
check("and it is not reported as absence (S MUST 6)", r.visibility == "PRESENT")
with open(st12.object_path(x), "wb") as fh:
    fh.write(b"XXXXXXX\n\nlost the prefix too")
r = st12.read(x)
check("admission is tested before verification and is what is reported (A 10.4)",
      r.verdict == "ADMISSION_FAILED" and r.detail == "not_x0", r.verdict)
y = dep(st12, rec(b"extent case")).locator
os.chmod(st12.object_path(y), 0o644)
with open(st12.object_path(y), "ab") as fh:
    fh.write(b"!")
check("a stored object of the wrong extent fails the read",
      st12.read(y).verdict == "EXTENT_MISMATCH")

# --------------------------------------------------------------------------- #
print("\n-- records bound without a recorded digest (A 10.5)")
st13 = fresh(floor=0)
z = dep(st13, rec(b"legacy-shaped")).locator
e = json.load(open(st13.bind_path(z)))
e["digest_recorded"] = False
os.chmod(st13.bind_path(z), 0o644)
open(st13.bind_path(z), "w").write(json.dumps(e))
r = st13.read(z)
check("such a record is distinguishable and never reported as verified",
      r.verdict == "UNVERIFIABLE" and r.bound_content is None, r.verdict)

# --------------------------------------------------------------------------- #
print("\n-- duplicate content across ids (S Named failures)")
st14 = fresh(floor=0)
same = rec(b"identical bytes")
c1, c2 = dep(st14, same), dep(st14, same)
check("two ids, one digest, both readable, no resolution needed",
      c1.locator != c2.locator and c1.digest == c2.digest
      and st14.read(c1.locator).verdict == st14.read(c2.locator).verdict == "OK")
d1 = dep(st14, rec(b"same body", id="alpha-0002"))
check("a declared id makes content identity vary with it (A, amendment to MUST 3)",
      d1.digest != S.content_identity(rec(b"same body", id="alpha-0003")))

# --------------------------------------------------------------------------- #
print("\n-- reading another authority's locator (CONTRACT §2: one authority)")
try:
    st14.read("beta-0001")
    check("a foreign locator is refused, not answered", False, "answered")
except S.Refused as e:
    check("a foreign locator is refused, not answered", e.reason == "foreign_authority")

# --------------------------------------------------------------------------- #
print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
for f in FAIL:
    print("  FAILED: " + f)
sys.exit(1 if FAIL else 0)
