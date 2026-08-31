import sys, os, tempfile, json
sys.path.insert(0, "/tmp/claude-1001/phase-c/impl")
import store as S

# Instrumented COPY of the syscall surface: we wrap os.* to record the ordering of
# open/write/fsync/link/unlink relative to the final directory entry appearing.
trace = []
_open, _write, _fsync, _link, _unlink = os.open, os.write, os.fsync, os.link, os.unlink
def t_open(p, f, *a, **k):
    r = _open(p, f, *a, **k); trace.append(("open", os.path.basename(str(p)), r)); return r
def t_write(fd, b):
    trace.append(("write", fd, len(b))); return _write(fd, b)
def t_fsync(fd):
    trace.append(("fsync", fd)); return _fsync(fd)
def t_link(a, b):
    trace.append(("link", os.path.basename(a), os.path.basename(b))); return _link(a, b)
def t_unlink(p):
    trace.append(("unlink", os.path.basename(p))); return _unlink(p)
os.open, os.write, os.fsync, os.link, os.unlink = t_open, t_write, t_fsync, t_link, t_unlink

root = tempfile.mkdtemp(prefix="probe3-")
st = S.Store.create(root, store_identity="urn:probe", authority_id="alpha", g1_floor=0)
trace.clear()
cand = b"@p-e/x0\nsubject: traced\n\nbody"
c = st.deposit(cand, len(cand))
os.open, os.write, os.fsync, os.link, os.unlink = _open, _write, _fsync, _link, _unlink

print("=== H. MUST 8 syscall order for one deposit ===")
for e in trace:
    print("   ", e)

# Now verify the invariant textually: for each link(tmp -> final), was there an
# fsync of the tmp fd before it, and an fsync of the dir after it?
fds = {}
ok = True
for i, e in enumerate(trace):
    if e[0] == "open": fds[e[2]] = e[1]
    if e[0] == "link":
        tmpname, final = e[1], e[2]
        # find fd for tmpname
        fd = [k for k,v in fds.items() if v == tmpname]
        before = trace[:i]
        synced = any(x[0]=="fsync" and x[1] in fd for x in before)
        after = trace[i+1:]
        dirsynced = any(x[0]=="fsync" for x in after)
        print(f"   link {tmpname} -> {final}: data fsynced before = {synced}, a dir fsync after = {dirsynced}")
        ok = ok and synced and dirsynced
print("   MUST 8 durability ordering holds for every binding write:", ok)
