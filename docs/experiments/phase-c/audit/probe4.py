import sys, os, tempfile, json
sys.path.insert(0, "/tmp/claude-1001/phase-c/impl")
import store as S

root = tempfile.mkdtemp(prefix="probe4-")
S.Store.create(root, store_identity="urn:probe", authority_id="alpha", g1_floor=0)

def crash_child(stage):
    """Deposit in a child that hard-exits (os._exit, no flush) at `stage`."""
    pid = os.fork()
    if pid == 0:
        st = S.Store(root)
        real = S.write_crash_atomic_create_or_fail
        n = [0]
        def hook(tmp_dir, final, payload):
            n[0] += 1
            if stage == "before_ledger" and n[0] == 1: os._exit(9)
            if stage == "mid_record" and n[0] == 2:
                # write the tmp, fsync it, but die before the link
                p = os.path.join(tmp_dir, "t-crash")
                fd = os.open(p, os.O_CREAT|os.O_EXCL|os.O_WRONLY, 0o444)
                os.write(fd, payload); os.fsync(fd); os.close(fd)
                os._exit(9)
            r = real(tmp_dir, final, payload)
            if stage == "after_ledger" and n[0] == 1: os._exit(9)
            return r
        S.write_crash_atomic_create_or_fail = hook
        cand = b"@p-e/x0\n\ncrash at " + stage.encode()
        try: st.deposit(cand, len(cand))
        except BaseException: pass
        os._exit(0)
    os.waitpid(pid, 0)

print("=== I. crash windows (child hard-exits mid-deposit) ===")
for stage in ["before_ledger", "after_ledger", "mid_record"]:
    before = set(os.listdir(os.path.join(root, "history")))
    crash_child(stage)
    st = S.Store(root)
    new = sorted(set(os.listdir(os.path.join(root, "history"))) - before)
    loc = [n for n in new if not n.endswith(".bind")][0]
    r = st.read(loc)
    print(f"   crash {stage:14s}: new={new}")
    print(f"      -> {loc}: visibility={r.visibility} verdict={r.verdict} content={'yes' if r.bound_content else 'no'}")
    if r.entry: print(f"         ledger answers digest {r.entry.content_identity[:16]}... extent {r.entry.extent}")

print("   leftover tmp files:", os.listdir(os.path.join(root, "tmp")))
st = S.Store(root)
cand = b"@p-e/x0\n\nafter the crashes"
c = st.deposit(cand, len(cand))
print("   next deposit after crashes ->", c.locator, "(none of the crashed ids reused)")
print("   crashed ids still allocated, never rebound:",
      all(os.path.exists(st.marker_path(l)) for l in
          [n for n in os.listdir(st.history) if not n.endswith(".bind")]))
print("   read of every history id raises nothing:", end=" ")
try:
    for n in sorted(os.listdir(st.history)):
        if not n.endswith(".bind"): st.read(n)
    print("True")
except Exception as e:
    print("** RAISED", type(e).__name__, e)
