import sys, os, tempfile, itertools, threading
sys.path.insert(0, "/tmp/claude-1001/phase-c/impl")
import store as S

def fresh(floor=0):
    root = tempfile.mkdtemp(prefix="probe6b-")
    return S.Store.create(root, store_identity="urn:probe", authority_id="alpha", g1_floor=floor)

print("=== P. MUST 6: all 8 states of {marker, bind, object}, fresh store each ===")
for mk, bd, ob in itertools.product([1,0],[1,0],[1,0]):
    st = fresh()
    cand = b"@p-e/x0\n\nstate"
    loc = st.deposit(cand, len(cand)).locator
    for path, keep in [(st.object_path(loc), ob), (st.bind_path(loc), bd), (st.marker_path(loc), mk)]:
        if not keep:
            os.chmod(path, 0o644); os.remove(path)
    try:
        r = st.read(loc)
        out = f"{r.visibility:<14} {r.verdict:<20} content={'y' if r.bound_content else 'n'} witnesses={r.witnesses!r}"
    except Exception as e:
        out = f"** RAISED {type(e).__name__}: {e}"
    print(f"   marker={mk} bind={bd} obj={ob}: {out}")
print("   in-scope reachable rows are 111 (normal), 110 (crash before payload),")
print("   100 (crash before ledger). marker=0 rows need marker deletion, which")
print("   nothing in the store does and CONTRACT scope excludes.")

print()
print("=== Q. tmp-name collision under threads ===")
st2 = fresh()
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

print()
print("=== R. MUST 7: witness absence in every verdict reachable ===")
st3 = fresh()
cand = b"@p-e/x0\n\nw"
l1 = st3.deposit(cand, len(cand)).locator
print("   OK        ->", st3.read(l1).witnesses, st3.read(l1).witnesses_absent)
os.chmod(st3.object_path(l1), 0o644); os.remove(st3.object_path(l1))
print("   CONT_UNRE ->", st3.read(l1).witnesses, st3.read(l1).witnesses_absent)
print("   NOT_BOUND ->", st3.read("alpha-0500").witnesses, st3.read("alpha-0500").witnesses_absent)
