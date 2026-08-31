import sys, os, tempfile, random, hashlib
sys.path.insert(0, "/tmp/claude-1001/phase-c/impl")
import store as S

def fresh(floor=0, auth="alpha"):
    root = tempfile.mkdtemp(prefix="probe5-")
    return S.Store.create(root, store_identity="urn:probe", authority_id=auth, g1_floor=floor)

print("=== J. header block vs body: which lines become fields ===")
for name, cand in [
  ("LF blank separator",        b"@p-e/x0\nsubject: a\n\nid: alpha-9999\nbody\n"),
  ("space-only separator",      b"@p-e/x0\nsubject: a\n \nid: alpha-9999\nbody\n"),
  ("tab-only separator",        b"@p-e/x0\nsubject: a\n\t\nid: alpha-9999\nbody\n"),
  ("CR-only separator",         b"@p-e/x0\nsubject: a\n\r\nid: alpha-9999\nbody\n"),
  ("no separator at all",       b"@p-e/x0\nsubject: a\nid: alpha-9999\n"),
  ("magic glued to a field",    b"@p-e/x0id: alpha-9999\n\nbody\n"),
  ("indented id in header",     b"@p-e/x0\n id: alpha-9999\n\nbody\n"),
]:
    try:
        f = S.header_fields(cand)
        print(f"   {name:26s} fields={sorted(f)}  declared_id={f.get('id')!r}")
    except S.Refused as e:
        print(f"   {name:26s} REFUSED {e.reason}")

print()
print("=== K. does a body line get rejected as a declared id? (S envelope clause) ===")
for name, cand in [
  ("body id: after LF blank",   b"@p-e/x0\nsubject: a\n\nid: alpha-9999\nbody\n"),
  ("body id: after space line", b"@p-e/x0\nsubject: a\n \nid: alpha-9999\nbody\n"),
]:
    st = fresh()
    try:
        c = st.deposit(cand, len(cand))
        print(f"   {name:28s} -> bound {c.locator}, read {st.read(c.locator).verdict}")
    except S.Refused as e:
        print(f"   {name:28s} -> REFUSED {e.reason}: {e.detail}")

print()
print("=== L. fuzz: 400 random admissible candidates, deposit / reopen / read ===")
st = fresh()
random.seed(7)
alphabet = ["a","Z","0","-",":"," ","\t","\n","\r","é","中","\U0001f41d","\x00","@p-e/x0"]
sent = {}
for i in range(400):
    body = "".join(random.choice(alphabet) for _ in range(random.randint(0, 60)))
    hdrs = "".join(random.choice(["", "subject: s%d\n" % i, "parent: alpha-%04d\n" % random.randint(0,50),
                                  "ref: beta-0001\n", "note:\n"]) for _ in range(2))
    cand = b"@p-e/x0\n" + hdrs.encode() + b"\n" + body.encode()
    try:
        c = st.deposit(cand, len(cand))
        sent[c.locator] = (cand, c.digest)
    except S.Refused:
        pass
print(f"   {len(sent)} of 400 admitted")
st2 = S.Store(st.root)           # reopen from disk
bad = []
for loc, (cand, dg) in sent.items():
    r = st2.read(loc)
    if not (r.verdict == "OK" and r.bound_content == cand
            and dg == hashlib.sha256(cand).hexdigest()
            and r.entry.extent == len(cand) and r.visibility == "PRESENT"):
        bad.append((loc, r.verdict))
print(f"   round-trip failures after reopen: {len(bad)} {bad[:5]}")
print(f"   locators all distinct: {len(set(sent)) == len(sent)}")
seqs = sorted(S.split_locator(l)[1] for l in sent)
print(f"   no seq reused, strictly increasing: {seqs == sorted(set(seqs))}")

print()
print("=== M. input-type surface ===")
st3 = fresh()
cand = b"@p-e/x0\n\nbytearray body"
c = st3.deposit(bytearray(cand), len(cand))
print("   bytearray accepted, stored identically:", st3.read(c.locator).bound_content == cand)
for label, args in [("extent True (bool)", (cand, True)), ("extent -1", (cand, -1)),
                    ("extent float", (cand, float(len(cand)))), ("str candidate", ("@p-e/x0\n\nx", 10))]:
    try:
        st3.deposit(*args); print(f"   ** {label}: ADMITTED")
    except S.Refused as e:
        print(f"   {label:20s} refused: {e.reason}")
print("   seqs consumed by the refusals:", st3.allocated_seqs())
