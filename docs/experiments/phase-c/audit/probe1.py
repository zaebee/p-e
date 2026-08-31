import sys, os, hashlib, tempfile, shutil, json
sys.path.insert(0, "/tmp/claude-1001/phase-c/impl")
import store as S

def fresh(floor=0, auth="alpha"):
    root = tempfile.mkdtemp(prefix="probe-")
    return S.Store.create(root, store_identity="urn:probe", authority_id=auth, g1_floor=floor)

print("=== A. UTF-8 Table 3-7 boundary set (9.2) ===")
# (name, octets_after_magic, should_be_refused)
cases = [
  ("bare continuation \\x80", b"\x80", True),
  ("overlong 2-byte \\xc0\\xaf", b"\xc0\xaf", True),
  ("overlong 3-byte \\xe0\\x80\\xaf", b"\xe0\x80\xaf", True),
  ("overlong 3-byte \\xe0\\x9f\\xbf", b"\xe0\x9f\xbf", True),
  ("overlong 4-byte \\xf0\\x80\\x80\\xaf", b"\xf0\x80\x80\xaf", True),
  ("overlong 4-byte \\xf0\\x8f\\xbf\\xbf", b"\xf0\x8f\xbf\xbf", True),
  ("surrogate D800 \\xed\\xa0\\x80", b"\xed\xa0\x80", True),
  ("surrogate DFFF \\xed\\xbf\\xbf", b"\xed\xbf\xbf", True),
  ("above U+10FFFF \\xf4\\x90\\x80\\x80", b"\xf4\x90\x80\x80", True),
  ("5-byte \\xf8\\x88\\x80\\x80\\x80", b"\xf8\x88\x80\x80\x80", True),
  ("\\xfe", b"\xfe", True),
  ("truncated \\xe2\\x82", b"\xe2\x82", True),
  ("valid U+10FFFF", b"\xf4\x8f\xbf\xbf", False),
  ("valid U+FFFD", b"\xef\xbf\xbd", False),
  ("valid NUL byte", b"\x00", False),
  ("valid noncharacter U+FFFE", b"\xef\xbf\xbe", False),
]
st = fresh()
for name, tail, want_refused in cases:
    cand = b"@p-e/x0\n\n" + tail
    try:
        c = st.deposit(cand, len(cand))
        got = "ADMITTED"
    except S.Refused as e:
        got = "refused:" + e.reason
    ok = ("ADMITTED" not in got) == want_refused
    print(("  ok  " if ok else "  ** MISMATCH ") + f"{name:35s} -> {got}")

print()
print("=== B. magic-prefix edge cases ===")
st2 = fresh()
for name, cand in [
  ("exactly the magic, nothing else", b"@p-e/x0"),
  ("magic + newline only", b"@p-e/x0\n"),
  ("magic with BOM before", b"\xef\xbb\xbf@p-e/x0\n\nx"),
  ("magic uppercase", b"@P-E/X0\n\nx"),
  ("magic with trailing char no sep", b"@p-e/x0Z\n\nx"),
]:
    try:
        c = st2.deposit(cand, len(cand))
        print(f"  ADMITTED  {name:38s} -> {c.locator}")
    except S.Refused as e:
        print(f"  refused   {name:38s} -> {e.reason}")

print()
print("=== C. fidelity 9.3: stored octets vs delivered, over many shapes ===")
st3 = fresh()
shapes = [
  b"@p-e/x0",
  b"@p-e/x0\n",
  b"@p-e/x0\n\n",
  b"@p-e/x0\n\nbody no trailing newline",
  b"@p-e/x0\n\nbody trailing newlines\n\n\n",
  b"@p-e/x0\r\nsubject: crlf\r\n\r\nbody\r\n",
  b"@p-e/x0\n\n\x00\x01\x02 nul and controls \x7f",
  b"@p-e/x0\n\n" + ("é中\U0001f41d" * 100).encode(),
  b"@p-e/x0\n\n" + b"a" * 100000,
  b"@p-e/x0\nsubject: x\n\n  \t leading ws body\t \n",
]
bad = 0
for i, cand in enumerate(shapes):
    c = st3.deposit(cand, len(cand))
    on_disk = open(st3.object_path(c.locator), "rb").read()
    r = st3.read(c.locator)
    same = on_disk == cand == r.bound_content
    dg = c.digest == hashlib.sha256(cand).hexdigest()
    if not (same and dg and r.verdict == "OK"):
        bad += 1
        print(f"  ** shape {i}: same={same} digest_ok={dg} verdict={r.verdict}")
print(f"  {len(shapes)-bad}/{len(shapes)} shapes stored octet-identical, digest == sha256(candidate), read OK")
