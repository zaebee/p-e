import sys, os, tempfile, itertools, json, threading
sys.path.insert(0, "/tmp/claude-1001/phase-c/impl")
import store as S

def fresh(floor=0, auth="alpha"):
    root = tempfile.mkdtemp(prefix="probe6-")
    return S.Store.create(root, store_identity="urn:probe", authority_id=auth, g1_floor=floor)

print("=== N. MUST 3 (amended): is identity independent of content? ===")
a = fresh(); b = fresh()
seq_a = [a.deposit(c, len(c)).locator for c in
         [b"@p-e/x0\n\nfirst", b"@p-e/x0\n\nsecond", b"@p-e/x0\n\nthird"]]
seq_b = [b.deposit(c, len(c)).locator for c in
         [b"@p-e/x0\n\nTOTALLY DIFFERENT " + b"x"*500, b"@p-e/x0\n\nq", b"@p-e/x0\n\n"]]
print(f"   same deposit order, wholly different content -> same locators: {seq_a == seq_b} {seq_a}")
c = fresh()
same = b"@p-e/x0\n\nidentical"
d1, d2 = c.deposit(same, len(same)), c.deposit(same, len(same))
print(f"   identical content twice -> distinct locators, one digest: "
      f"{d1.locator != d2.locator and d1.digest == d2.digest}")

print()
print("=== O. MUST 2: nothing binds below the declared floor ===")
f = fresh(floor=100)
for i in range(50):
    cand = b"@p-e/x0\n\nr%d" % i
    f.deposit(cand, len(cand))
print(f"   min allocated seq = {min(f.allocated_seqs())} (floor 100); "
      f"any marker below floor: {any(s < 100 for s in f.allocated_seqs())}")
print(f"   read below floor: {f.read('alpha-0050').visibility} / {f.read('alpha-0050').verdict}")
print(f"   authority.json: {json.load(open(os.path.join(f.root,'authority.json')))['g1_claim']}")

print()
print("=== P. MUST 6: all 8 states of {marker, bind, object} ===")
st = fresh(floor=0)
rows = []
for i, (mk, bd, ob) in enumerate(itertools.product([1,0],[1,0],[1,0])):
    cand = b"@p-e/x0\n\nstate %d" % i
    loc = st.deposit(cand, len(cand)).locator
    for path, keep in [(st.object_path(loc), ob), (st.bind_path(loc), bd), (st.marker_path(loc), mk)]:
        if not keep:
            os.chmod(path, 0o644); os.remove(path)
    try:
        r = st.read(loc); out = f"{r.visibility:<14} {r.verdict:<20} content={'y' if r.bound_content else 'n'} witnesses={r.witnesses!r}"
    except Exception as e:
        out = f"** RAISED {type(e).__name__}: {e}"
    rows.append((mk, bd, ob, out))
for mk, bd, ob, out in rows:
    print(f"   marker={mk} bind={bd} obj={ob}: {out}")
print("   (rows with marker=0 require deleting an allocation marker, which nothing in the")
print("    store does and which CONTRACT scope excludes)")

print()
print("=== Q. tmp-name collision under threads (create-or-fail integrity) ===")
st2 = fresh(floor=0)
errs, locs = [], []
def w(i):
    try:
        s = S.Store(st2.root)
        cand = b"@p-e/x0\n\nthread %d" % i
        locs.append(s.deposit(cand, len(cand)).locator)
    except Exception as e:
        errs.append(repr(e))
ths = [threading.Thread(target=w, args=(i,)) for i in range(64)]
[t.start() for t in ths]; [t.join() for t in ths]
print(f"   64 threads: {len(locs)} bound, {len(set(locs))} distinct, {len(errs)} errors {errs[:3]}")
bad = [l for l in locs if S.Store(st2.root).read(l).verdict != "OK"]
print(f"   all read OK: {not bad}")
