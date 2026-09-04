# relay-lite v0.12 — addendum: what the clock claims, and what it does not

**Status:** Addendum, not an amendment. `relay-lite-v0.12-draft.md` is committed as a record of
what was proposed and is not edited — corrections are new documents, never edits, the same rule
this store applies to its own records. Nothing here changes that file.

**Occasion:** [issue #32](https://github.com/zaebee/p-e/issues/32), and the exchange
`relay-0820`–`relay-0826`.

---

## 1. The two defects, reproduced

Both run against the merged implementation, which follows §3.3 exactly.

**The counter escapes the domain that admits it.**

```
incoming        {"l":1756800000000,"c":9007199254740991,"node_id":"peer"}
stage 2         ACCEPTED — valid I-JSON; §3.1 admits MAX_SAFE_INTEGER
we then emit    {"l":1756800000000,"c":9007199254740992,"node_id":"node-1"}
canonicalize    REFUSED — integer outside the safe range
```

A node conforming to §3.3, ingesting a message §3.1 requires it to accept, produces a clock it
cannot serialize under §3.1.

**One message moves `l` and it does not come back.**

```
ingest l = 9007199254740991, then five honest emits at a correct clock
result          l = 9007199254740991, c = 7
node's clock    2025-09-02T08:00:00.000Z
its HLC l as a date   Invalid Date
```

Every act the node seals from then on carries that timestamp, and every peer ingesting one
inherits it.

## 2. What the source actually provides, checked in the paper

The framing this project first reached — *"§3.3 imported HLC and dropped its bounds"* — is
**wrong**, and is withdrawn in `relay-0826`. Kulkarni et al., *Logical Physical Clocks*, states
four requirements, of which two are the bounds:

> 3. `l.e` is represented with bounded space,
> 4. `l.e` is close to `pt.e`, i.e., `|l.e − pt.e|` is bounded.

And proves them like this:

> **Corollary 1.** For any event `f`, `|l.f − pt.f| ≤ ε`
> *Proof.* We cannot have two events `e` and `f` such that `e hb f` and `pt.e > pt.f + ε`
> **due to clock synchronization constraints.**

> **Corollary 4.** **Under the assumption made above**, `c.f` is at most `ε/d + 1`.

**ε is an assumed property of the system, not a check the algorithm performs.** The HLC algorithm
contains no ε test and rejects nothing. There was no mechanism to drop; what v0.12 omits is the
*premise*, and the property that needs it is one relay-lite never asserts.

Adding an ε check would not restore Kulkarni. It would **invent a mechanism the source does not
have**.

## 3. What relay-lite claims

**[MUST]** An implementation claims, and a consumer may rely on, exactly this:

> The tuple `(l, c, node_id)` is **strictly monotonic per node**, regardless of physical clock
> regressions.

**[MUST NOT]** A consumer reads `l` as an approximation of wall-clock time, or computes a duration,
an age, or an expiry from it.

That prohibition is not new policy; it is already load-bearing. The TTL addendum rejected `hlc.l`
as an expiry origin precisely because it may run ahead of the wall clock, and takes the origin from
the UUIDv7 timestamp instead.

**relay-lite claims monotonicity and not boundedness.** `|l − pt|` is unbounded here, and the
citation to Kulkarni carries the update rule, not the corollaries — because the corollaries rest on
a synchronization premise this specification does not state and does not require.

## 4. The cost of saying so, stated rather than left to be found

The paper assumes benign clocks. **A hostile peer violates that assumption deliberately**, and no
theorem conditional on it protects against that. So the behaviour in §1 is not a defect against
this specification once §3 is stated — it is the specification's cost, and it is this:

- A single peer can move a node's `l` arbitrarily far forward, permanently.
- Every act that node seals afterwards carries the moved value.
- Every peer that ingests one of those acts inherits it.
- Nothing in the protocol detects this, and no honest node can distinguish it from a peer whose
  clock is simply wrong.

**The mitigation is out of scope for the protocol and belongs to deployment**: a store that
accepts acts only from parties it has reason to trust does not meet a hostile `l`. relay-lite has
no authentication layer and does not pretend to one — `signature` left the envelope without a
record ([#51](https://github.com/zaebee/p-e/issues/51)), and this is one of the things that
absence costs.

Recording it here so that a later reader meets the cost in the specification rather than in
production.

## 5. What this does not do

It does not add ε. It does not add a check, a stage, or a parameter. It does not close the
counter's escape from §3.1's domain — **that defect is independent of everything above** and is
addressed separately; the domain is not closed under the operation the protocol performs on it,
whatever premise the clock rests on.

It does not settle where HLC state lives across a restart (#32's third point). §3.3 gives update
rules and says nothing about persistence, so per-node monotonicity rests on state the specification
does not require anyone to keep. That remains open.
