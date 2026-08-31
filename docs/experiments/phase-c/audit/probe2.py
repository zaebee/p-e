import sys, os, tempfile, json, multiprocessing as mp, random, time
sys.path.insert(0, "/tmp/claude-1001/phase-c/impl")
import store as S

def fresh(floor=0, auth="alpha"):
    root = tempfile.mkdtemp(prefix="probe2-")
    return S.Store.create(root, store_identity="urn:probe", authority_id=auth, g1_floor=floor)

def _w(args):
    root, i = args
    s = S.Store(root)
    time.sleep(random.random()*0.01)
    cand = b"@p-e/x0\n\nworker %d" % i
    return s.deposit(cand, len(cand)).locator

if __name__ == "__main__":
    print("=== D. MUST 1 uniqueness under heavy concurrency (128 procs) ===")
    st = fresh(floor=0)
    with mp.get_context("fork").Pool(32) as pool:
        got = pool.map(_w, [(st.root, i) for i in range(128)])
    seqs = sorted(S.split_locator(l)[1] for l in got)
    print(f"  {len(got)} deposits, {len(set(got))} distinct locators, dense 0..127: {seqs == list(range(128))}")
    # every binding readable and correct
    bad = [l for l in got if S.Store(st.root).read(l).verdict != "OK"]
    print(f"  all readable OK: {not bad}")

    print()
    print("=== E. MUST 1 monotonicity: does a seq ever go backwards? ===")
    st2 = fresh(floor=5)
    locs = []
    for i in range(20):
        cand = b"@p-e/x0\n\nr%d" % i
        locs.append(S.split_locator(st2.deposit(cand, len(cand)).locator)[1])
    # burn some ids by declared-id mismatch, then continue
    for i in range(3):
        cand = b"@p-e/x0\nid: alpha-9998\n\nx%d" % i
        try: st2.deposit(cand, len(cand))
        except S.Refused as e: pass
    for i in range(5):
        cand = b"@p-e/x0\n\ns%d" % i
        locs.append(S.split_locator(st2.deposit(cand, len(cand)).locator)[1])
    print(f"  seqs: {locs}")
    print(f"  strictly increasing: {all(b>a for a,b in zip(locs,locs[1:]))}; min >= floor 5: {min(locs)>=5}")
    # reopen the store from disk; still monotone?
    st2b = S.Store(st2.root)
    cand = b"@p-e/x0\n\nafter reopen"
    n = S.split_locator(st2b.deposit(cand, len(cand)).locator)[1]
    print(f"  after reopen next seq = {n} (> {max(locs)}): {n > max(locs)}")

    print()
    print("=== F. seq exhaustion: reuse or refuse? ===")
    st3 = fresh(floor=S.SEQ_CEILING - 1)
    for i in range(2):
        cand = b"@p-e/x0\n\ne%d" % i
        print("   bound", st3.deposit(cand, len(cand)).locator)
    try:
        cand = b"@p-e/x0\n\noverflow"
        print("   ** ADMITTED", st3.deposit(cand, len(cand)).locator)
    except S.Refused as e:
        print(f"   refused: {e.reason} (no reuse)")

    print()
    print("=== G. MUST 4 non-rewindable: try to rebind a bound seq ===")
    st4 = fresh(floor=0)
    cand = b"@p-e/x0\n\noriginal"
    c = st4.deposit(cand, len(cand))
    e0 = st4.ledger_entry(c.locator)
    # direct attempts
    for label, path, payload in [
        ("ledger .bind", st4.bind_path(c.locator), b"{}"),
        ("object .rec", st4.object_path(c.locator), b"@p-e/x0\n\nreplaced"),
        ("marker", st4.marker_path(c.locator), b""),
    ]:
        try:
            S.write_crash_atomic_create_or_fail(st4.tmp, path, payload)
            print(f"   ** {label}: overwrite SUCCEEDED")
        except S.Refused as ex:
            print(f"   {label}: refused ({ex.reason})")
    print("   marker create again ->", S.create_marker(st4.marker_path(c.locator)))
    print("   ledger digest unchanged:", st4.ledger_entry(c.locator).content_identity == e0.content_identity)
    # file modes
    for label, p in [("marker", st4.marker_path(c.locator)), ("bind", st4.bind_path(c.locator)), ("obj", st4.object_path(c.locator))]:
        print(f"   mode {label}: {oct(os.stat(p).st_mode & 0o777)}")
