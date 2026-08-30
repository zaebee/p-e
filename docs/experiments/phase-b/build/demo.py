"""A store, on disk, doing the whole job once. Run: python3 demo.py [dir]"""
import os, shutil, sys
import store as S

root = sys.argv[1] if len(sys.argv) > 1 else "/tmp/pe-demo-store"
shutil.rmtree(root, ignore_errors=True)

st = S.Store.create(root, store_identity="urn:p-e:store:demo",
                    authority_id="demo", g1_floor=32)
print(f"authority {st.authority_id}, G1 claimed from seq {st.g1_floor}, "
      f"store identity {st.store_identity}\n")

def offer(octets, **kw):
    try:
        c = st.deposit(octets, len(octets), **kw)
        print(f"  bound   {c.locator}  sha256:{c.digest[:16]}...  extent {len(octets)}")
        return c
    except S.Refused as e:
        print(f"  refused {e.reason}: {e.detail}")
        return None

print("deposits:")
a = offer(b"@p-e/x0\nsubject: first\n\nthe body of the first record\n",
          deposited_by="local")
b = offer(b"@p-e/x0\nsubject: second\nparent: demo-0032\n\nfollows the first\n",
          deposited_by="mcp")
offer(b"@p-e/x0\nid: demo-9999\n\nclaims an id it was not given\n")   # DECISION 7
offer(b"@p-e/x0\nparent: other-0001\n\ncross-authority parent\n")     # DECISION 8
offer(b"no magic here\n")                                             # A 9.2
c = offer(b"@p-e/x0\nid: demo-0035\n\nan envelope id that matches\n")

print("\nhistory/ (marker per id; .bind is the ledger entry):")
for n in sorted(os.listdir(st.history)):
    print(f"  {n:<20} {os.path.getsize(os.path.join(st.history, n))} bytes")

print("\nreads:")
for loc in ["demo-0032", "demo-0034", "demo-0035", "demo-0099"]:
    r = st.read(loc)
    head = (r.bound_content or b"").split(b"\n\n")[-1].strip().decode() if r.bound_content else "-"
    print(f"  {loc}  {r.visibility:<14} {r.verdict:<20} {head}")

print("\nthe relay-0183 case: remove a record, then deposit again")
os.remove(st.object_path(a.locator))
print(f"  {a.locator} now {st.visibility(a.locator)} "
      f"(ledger still answers sha256:{st.ledger_entry(a.locator).content_identity[:16]}...)")
d = offer(b"@p-e/x0\n\nthe next record, which does not get demo-0032\n")
print(f"  marker for {a.locator} still present: {os.path.exists(st.marker_path(a.locator))}")

print("\ncitations (cross-store form):")
for c in [x for x in (a, b, c, d) if x]:
    print("  " + str(c))
