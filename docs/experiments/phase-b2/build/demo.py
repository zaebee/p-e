"""End-to-end run of the store. python3 demo.py"""
import shutil, tempfile
import store as S
from store import Candidate, Store, Refused

root = tempfile.mkdtemp(prefix="pe-demo-")
st = Store.create(root, authority_id="relay", store_identity="p-e/demo", g1_floor=32)
print(f"authority={st.authority_id} store={st.store_identity} g1_floor={st.g1_floor}")
print(f"claims G1 at 31? {st.claims_g1(31)}   at 32? {st.claims_g1(32)}")

def cand(text): 
    b = text.encode("utf-8"); return Candidate(b, len(b))

a = st.deposit(cand("@p-e/x0\nkind: note\n\nthe first record\n"))
print(f"\ndeposit -> {a.locator}  digest={a.content_identity[:16]}…  extent={a.extent}")
b = st.deposit(cand(f"@p-e/x0\nkind: note\nparent: {a.locator}\n\na child\n"))
print(f"deposit -> {b.locator}  parent={st.references(b.locator).parent}")
c = st.deposit(cand("@p-e/x0\nkind: note\nobserves: otherauth-0007\n\ncross-authority\n"))
print(f"deposit -> {c.locator}  observations={st.references(c.locator).observations}")

print(f"\ncite({a.locator}) = {st.cite(a.locator)}")
r = st.read(a.locator)
print(f"read  -> visibility={r.visibility} integrity={r.integrity} extent={r.extent}")
print(f"witnesses({a.locator}) -> {st.witnesses(a.locator).status}")
w = st.attest("gemini", [a.locator, b.locator], kind="c")
print(f"attest -> {w.locator}; witnesses({a.locator}) -> {st.witnesses(a.locator).status}"
      f" orders_records={st.witnesses(a.locator).orders_records}")

for bad, why in [("no magic\n\nx\n", "admission"),
                 ("@p-e/x0\nparent: otherauth-1\n\nx\n", "parent scope"),
                 ("@p-e/x0\nid: relay-9999\n\nx\n", "declared id")]:
    try:
        st.deposit(cand(bad)); print(f"  !! admitted {why}")
    except Refused as e:
        print(f"refused ({why}) -> {e.code}")

print(f"\nvisibility(relay-0036 abandoned) = {st.visibility('relay-0036')}")
print(f"visibility(relay-0900 never seen) = {st.visibility('relay-0900')}")
print(f"bound locators = {st.locators()}")
print(f"allocated      = {st.allocated_locators()}")
print(f"highest seq from this vantage = {st.highest_seq_from_this_vantage()}")
shutil.rmtree(root)
