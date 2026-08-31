import sys, os, tempfile
sys.path.insert(0, "/tmp/claude-1001/phase-c/impl")
import store as S

def fresh(floor=0):
    root = tempfile.mkdtemp(prefix="probe7-")
    return S.Store.create(root, store_identity="urn:probe", authority_id="alpha", g1_floor=floor)

print("=== S. create-or-fail vs a pre-existing symlink at the target name ===")
st = fresh()
outside = os.path.join(st.root, "OUTSIDE")
os.symlink(outside, st.object_path("alpha-0000"))     # dangling symlink at the id's object path
cand = b"@p-e/x0\n\nwould this escape?"
try:
    c = st.deposit(cand, len(cand))
    print(f"   ** deposit succeeded at {c.locator}; OUTSIDE created: {os.path.exists(outside)}")
except S.Refused as e:
    print(f"   refused: {e.reason} (link does not follow a dangling symlink); OUTSIDE created: {os.path.exists(outside)}")

print()
print("=== T. the abandoned-id path: repeated declared-id mismatch, then a hit ===")
st2 = fresh()
target = "alpha-0004"
bound = None
for i in range(8):
    cand = b"@p-e/x0\nid: " + target.encode() + b"\n\nattempt %d" % i
    try:
        c = st2.deposit(cand, len(cand)); bound = c; print(f"   attempt {i}: bound {c.locator}")
    except S.Refused as e:
        print(f"   attempt {i}: refused ({e.reason}) -- {e.detail.split(';')[0]}")
print(f"   final: {target} verdict {st2.read(target).verdict}; "
      f"seqs allocated {st2.allocated_seqs()}; bound ids {st2.bound_locators()}")
print(f"   nothing was rebound: each bound locator appears once: "
      f"{len(st2.bound_locators()) == len(set(st2.bound_locators()))}")

print()
print("=== U. deposit must not depend on the parent being present/readable ===")
st3 = fresh()
p = st3.deposit(b"@p-e/x0\n\nparent record", 22).locator
os.chmod(st3.object_path(p), 0o644)
open(st3.object_path(p), "wb").write(b"@p-e/x0\n\nTAMPERED")   # parent now DIGEST_MISMATCH
print(f"   parent {p} now reads {st3.read(p).verdict}")
for label, par in [("tampered parent", p), ("never-allocated parent", "alpha-0900"),
                   ("abandoned parent", "alpha-0001"), ("self-referential", "alpha-0002")]:
    cand = b"@p-e/x0\nparent: " + par.encode() + b"\n\nchild\n"
    try:
        c = st3.deposit(cand, len(cand))
        print(f"   {label:24s} -> bound {c.locator}, read {st3.read(c.locator).verdict}")
    except S.Refused as e:
        print(f"   ** {label:24s} -> REFUSED {e.reason}")
