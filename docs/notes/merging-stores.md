<!-- NOT A RUN -->
# Two stores, one id, different bytes — and why that is not a consensus problem

**NOT A RUN.** Not a `docs/reports/*-conformance-NN.md`, changes no catalogue. A
note for `D7` and for the G1 question behind it, written after `relay-0998`
measured how cheaply this store forks: one `git worktree` and the scratch
allocated `relay-0998`, the same id this store handed out next.

Everything external below was read at its source, not recalled. Everything about
this repository was grepped.

## The question

Two or three copies of this store, each taking deposits. Ids collide, contents
differ. Merging them — is that the problem blockchains solve, or is there
something better shaped?

## It is not the problem blockchains solve

Consensus buys agreement on a **total order** over a **scarce** namespace under
adversarial conditions; without it, the same coin spends twice. This corpus has
neither half:

- **No total order is wanted.** §4: *"[MUST] The protocol and storage model treat
  the graph as a DAG — a partial order"*, and *"[MUST NOT] A consumer presents any
  linear projection as the causal history"*. A mechanism whose product is one
  agreed sequence would be producing the thing the spec forbids anyone to claim.
- **Nothing is scarce.** Two records with the same locator are not competing for
  one slot. `relay-0998` is a **name**, and the bytes are addressed by their
  digest. Nothing is spent by naming.

An append-only set of immutable records is a **grow-only set**. Union is
commutative, associative and idempotent, so merging two of them needs no
agreement protocol at all — it needs no protocol, full stop. That is the CRDT
result (Shapiro et al., 2011) and it is what this corpus already is.

## The whole difficulty is the name, and the protocol already models it

`relay-NNNN` is a **locator**; the digest is the **content address**. The review
separated them deliberately — the `(parent_id, parent_digest)` citation pair —
and `evaluateCausalLink` names the collision outright:

| `parent_id` | `parent_digest` | state |
|---|---|---|
| set | set | `MATCHES` — parent held, digest agrees |
| set | set | `DIVERGES` — parent held, digest differs |

**So the answer to "two stores, one id, different bytes" is already written, and
it is not to pick a winner.** It is `DIVERGES`. A merge that resolved the
collision would be discarding the finding the protocol exists to report.

Three ways to make the union total, of which the third is already spent:

1. **Key by digest.** The locator becomes a convenience; two records sharing a
   name simply have two digests and both survive. Git's model.
2. **Qualify the locator by authority** — `p-e/relay:relay-0998`. `issue-1`'s
   citation contract already requires the authority identifier for any citation
   crossing a store boundary, and `P_E_STORE_IDENTITY` is where it comes from.
3. **Coordinate allocation** — ranges, prefixes, a shared allocator. **Rejected
   already**: `logical_seq` was an id with no allocator, and thread 238 removed
   it in favour of the pure causal DAG.

## What the neighbours did, checked at the source

**Matrix stopped letting servers allocate ids.** Room version 3, quoted: *"The
event ID is the reference hash of the event encoded using Unpadded Base64,
prefixed with `$`"*, and the reason is our scenario in their words — server-side
ids *"leads to complications where servers receive multiple events with the same
ID in either the same or different rooms where the server cannot easily keep
track of which event it should be using."* They had this collision, in
production, and the fix was to make the name the hash.

Their **state resolution** machinery does not transfer, and it is worth saying
why: it exists because Matrix has **mutable state** — membership, power levels —
so two histories can disagree about what is *currently* true. Nothing here is
current. Immutability is what makes union enough.

**IPLD/IPFS**: the CID *is* the verification. A party either produces bytes that
hash to the name or it does not, and no reader has to trust an intermediary's
report about them. That is the same posture as §7.1's wire-octet rule.

**Certificate Transparency solves the problem we actually have**, and solves it
without consensus. RFC 6962, quoted: a *Merkle consistency proof* proves the
append-only property between two tree states; an audit path proves inclusion; and
*"violation of the append-only property is detected by global gossiping, i.e.,
everyone auditing logs comparing their versions of the latest Signed Tree
Heads"*, where two conflicting heads are *"cryptographic proof of that log's
misbehavior"*. Log operators agree on nothing.

That is our shape exactly. The hard problem here was never the merge — it is
**detecting that one authority handed out one locator for two different bytes**,
which is `relay-0183`: an id bound, freed by deletion, rebound to other bytes,
and the reason `authority.ts` declares that this authority **claims no G1 at
all**. Its own words for the limit: a single authority's G1 claim is
*self-asserted and not checkable by a reader who was not present for every
allocation.* CT's answer to precisely that is a published tree head, gossip
between readers, and a fork that becomes provable instead of trusted.

What it would cost, named without proposing it: a Merkle tree over the record
set (we already hash every record), a signed head, and at least one other party
willing to keep heads and compare. Note what it does **not** cost — an identity
layer. CT needs a key whose misbehaviour is provable, not a person; `#51`'s
objection, that this project has no anchor for identity, does not reach it.

## The `D7` finding this note carried, and why it is withdrawn

**The first version of this section claimed** that §7.3's duty on "a store"
exists only because §7.2's classifier compares a cached digest instead of hashing
the octets beside it — and that deriving there would leave the word "store"
needing no definition in that clause.

**It is wrong, and a blind reader found it by opening the files.** Three
corrections, each one grep:

1. **There is no `evaluateCausalLink` in `src/relay/mcp.ts`.** Zero occurrences.
   The spec's classifier is implemented as `stage3` in `src/relay-lite/verify.ts`.
   I named a file I had not opened.
2. **The legacy field is `RelayRecord.sha256`, computed by `parse()` at load.**
   `loadStore` hashes every record on the way in, so the value the comparison
   reads was derived from those same bytes moments earlier. There is nothing
   stale to drift.
3. **`verify.ts` already does what the note proposed:**

   ```typescript
   // §7.3's invariant is checked here rather than assumed, because a stale
   // cached digest would otherwise be reported as the child author's defect.
   if (sha256Hex(parent.bytes) !== parent.digest) throw new StoreCorruption(act.parent_id);
   ```

   The comment above it is this note's own argument, written first, with two
   tests covering the throw.

So `D7` stands where it stood. What survives is smaller and is a defect in the
**draft** rather than a route out of `D7`: §7.2's code listing compares the
cached field while the implementation of that clause derives first and raises
`STORE_CORRUPTION`. The listing and the implementation disagree, and the
implementation is the one that took the point.

**The numbers, since they were measured** (957 records; bodies min 25 B, median
2,950 B, p90 4,871 B, max 11,981 B): a hash costs 1.2 µs at the smallest record
and 12.8 µs at the largest; a full classification pass costs 407 µs reading the
stored value against 4,572 µs deriving — about four milliseconds on top of a
`loadStore` that itself costs 18 ms under bun and 64 ms under node. Four
predictions sealed before the measurement all held. Being right about all four
did not make the mechanism what the note said it was: **the seal disciplines the
answer, not the question.**

`relay-1001` records the withdrawal.
