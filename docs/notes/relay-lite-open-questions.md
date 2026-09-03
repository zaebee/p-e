<!-- NOT A RUN -->
# relay-lite: five open questions, and what a lineage sweep already settled

**NOT A RUN.** Not a `docs/reports/*-conformance-NN.md`, not in the conformance series, not
pinned by `tests/reports-immutable.test.ts`, changes no catalogue.

Research brief, written to be handed to a model with no access to this repository. Self-contained
by design, which means it restates things the repository already knows.

Issues: #32, #35, #39, #50, #51, and items 4-5 of #19. Method and general finding: `relay-0758`.

## The system, in one paragraph

`relay-lite` is a message transport for several AI agents exchanging records over a shared POSIX filesystem. Records are immutable; corrections are new records, never edits. Ordering comes from a citation graph, not from wall clocks. Each act is a JSON envelope canonicalized per **RFC 8785 (JCS)** over **I-JSON (RFC 7493)** and addressed by its SHA-256. Delivery is one file per recipient in `.relay/in/`, named by a semicolon-delimited key-value grammar:

```
to=<agent>;from=<agent>;thread=<thread_id>;ttl=<seconds>;id=<uuidv7>.json
```

Publication is `link()` into `in/` — create-or-fail, so a name collision is refused rather than overwritten. Ids are **UUIDv7 (RFC 9562)**. Per-node time is a **Hybrid Logical Clock** (Kulkarni, Demirbas, Madeppa, Avva, Leone, 2014). A working implementation exists: ~1800 lines of TypeScript, 371 tests, plus a block-level crash-durability bench using `dm-log-writes`.

The specification is **working draft v0.12**, which descends from a v0.1 proposal revised across sixteen review rounds between one proposer and one reviewer.

## Why the questions below are shaped the way they are

A sixth question — what TTL's seconds are counted from, and what `ttl=0` means — was recently investigated. It turned out **not** to be an open protocol question. Both answers were in the v0.1 proposal:

```
ttl [OPTIONAL]: seconds, default 3600
created_time(uuidv7) + ttl < now()   ->  moved to errata/, marked EXPIRED
```

Both were **dropped between v0.1 and v0.12, and no review round records the removal.** The strings `created_time` and `3600` occur exactly twice in the 2262-line review thread, both times in the original body; across sixteen rounds neither appears again.

That produced a general observation worth stating, because it shapes what help is useful here:

> An unanswered question is visible in a document — a reader hits "past their TTL", asks "past what", and files a bug. A rule that was present and is now absent leaves nothing to notice. Sixteen rounds of careful review by two parties, with zero contested claims, and two normative rules left the document without either party recording it. Review catches what is *wrong on the page*. Neither party was reading for what *used to be* on the page.

So each question below is annotated with what a sweep of the v0.1 body and all sixteen rounds established. Three of the five turn out to be less open than they looked, and the sweep found one entirely new defect.

---

## 1. Is the envelope open or closed? *(the one that blocks the most)*

**v0.12 §3** declares the canonical act as a TypeScript interface with nine fields: `id`, `thread_id`, `parent_id`, `parent_digest`, `type`, `from`, `to`, `hlc`, `payload`. It says the hashed body "carries only what is true regardless of who receives it" — a criterion for what *belongs*, not a statement about whether unknown fields are *permitted*.

**Sweep result: never stated, in v0.1 or in any round.**

Why it blocks: **§5 of v0.12 describes a field `ruled_by`, and §3 does not declare it.** So either the envelope is open — and `ruled_by` is legal, but so is anything — or it is closed, and §5 describes a field no conforming act can carry. Question 5 below is not a separate problem; it is this problem, observed from the other end. Nobody can implement §5 without answering this.

The digest interacts with the answer in a way that is not obvious. Because verification hashes wire octets, a consumer that has never heard of a field still verifies a record containing it. Openness is therefore *safe for verification* and unsafe for structural validation — the two pull in opposite directions.

**Useful research:** prior art on extension points in content-addressed and signed formats. **RFC 6709** (Design Considerations for Protocol Extensions) and the "must-ignore" versus "must-understand" split; how JWS/JWT handled it with the `crit` header; how COSE, CBOR tags, and Protobuf unknown-field retention differ. Specifically: is there a known design that keeps a closed *validation* schema while remaining forward-compatible under a canonical hash, and what does it cost?

---

## 2. What alphabet may an agent identifier use?

**v0.12 §2.1** gives the delivery filename grammar above, but never says which characters `<agent>` and `<thread_id>` admit.

**Sweep result: a true gap.** The strings `traversal`, `alphabet`, `charset`, `sanitize` and character-class notation occur **zero times in all 2262 lines**. Nobody ever raised it. This is the only one of the five that is genuinely new rather than lost or half-answered.

Two concrete hazards, since these values are concatenated into a filename:

- **Path traversal.** `to=../../etc/x` places a delivery outside the store.
- **Field injection.** An identifier containing `;` or `=` forges additional fields — `from=a;to=victim` inside a `to` value produces a name that parses differently than it was written.

The implementation currently enforces `^[A-Za-z0-9._:@-]+$` and refuses everything else, which is a private protocol decision the spec can override.

**Useful research:** how comparable systems constrain identifiers that become path components. Prior art in Matrix user IDs, ActivityPub actor IDs, Docker/OCI reference grammars, Maildir naming. Also the Unicode dimension: should identifiers be ASCII-only, or is a normalization profile (**PRECIS, RFC 8264**) the right answer, and what does the confusability problem cost in a system where identity is attribution?

---

## 3. Under what premise is the HLC's bound proved?

**v0.12 §3.3** presents the Kulkarni HLC update rule. The paper proves the logical time `l` stays within a bound of physical time **given ε-synchronized clocks** — and the spec states no such premise.

**Sweep result: largely dissolvable, and this is a useful finding.** The rounds *did* address clocks, at length: the problem raised was backward jumps from "NTP sync, VM resume, container migration", and the resolution states the property the design actually claims —

> "The generated tuple `(l', c', node_id)` is strictly monotonic per node regardless of physical clock regressions."

**Monotonicity, not boundedness.** The synchronization premise is absent because the property that requires it is never asserted. Nothing in relay-lite reads `l` as an approximation of wall time — notably, the TTL work above explicitly *rejected* `hlc.l` as an expiry origin precisely because it may run ahead of the wall clock.

So this needs a disclaiming sentence rather than a decision. But that conclusion should be tested, not assumed.

**Useful research:** is per-node monotonicity alone sufficient for everything an HLC is normally used for, or does dropping the bound silently forfeit a property consumers will assume? What breaks in a system that cites Kulkarni but claims only the weaker guarantee? Is there a cleaner citation for "logical clock, monotonic per node, no synchrony assumption" — Lamport, or the HLC paper's own weaker corollary?

---

## 4. Does HLC state survive a restart?

The HLC is `{l, c, node_id}`. If a process starts fresh from `{l: 0, c: 0}` and the machine's clock has moved **backwards** across the restart, the node emits an `l` lower than one it has already published, and per-node monotonicity — the single property question 3 says the design claims — fails.

**Sweep result: not answered, and it looks answered, which is the trap.** The rounds solved an adjacent problem thoroughly: an act must be **sealed at creation**, stamped exactly once per `id`, because rebuilding it after a crash produces different `hlc` and turns the node's own retry into a reported foreign-writer collision. That fix is real and implemented. It is about *re-stamping one act*, and says nothing about *the node's clock state across a restart*. Reading the thread, it is easy to believe the restart case was handled.

**Useful research:** how production HLC implementations persist clock state — CockroachDB, MongoDB, YugabyteDB all ship one. What is written, how often, and what is the cost of the fsync on the emit path? Is there an established alternative to persistence, such as refusing to emit until the wall clock exceeds the last observed value, and what is its liveness cost after a large backward step?

---

## 5. `ruled_by` is described and never declared

**v0.12 §5** says `ruled_by` "records attribution of epistemic responsibility, not a delegated mandate" — it names who made a judgment call so a later reader knows whose judgment to weigh. **§3's envelope does not declare the field.**

**Sweep result: it never landed, rather than being lost.** The v0.1 envelope did not contain it either. The field was born in review-round prose — the rounds settled its *semantics* carefully, over several exchanges, converging on attribution rather than delegated authority — and the structural declaration was never updated to match. The inverse of the TTL loss: a rule added in discussion that never reached the schema.

This is question 1 seen from the other end.

**Useful research:** in systems that record *who decided* as first-class data — provenance formats like **W3C PROV**, sigstore/in-toto attestations, court and standards-body records — what belongs in the signed/hashed body versus in metadata alongside it? A field naming a responsible party is itself filled in by a party to the matter; is there prior art on making such a field credible, or is the honest answer that no schema can and the weight must come from elsewhere?

---

## 6. And one the sweep found: `signature` was dropped the same way TTL was

Filed as issue #51. The v0.1 envelope carried:

```typescript
signature?: string;      // author's signature (where an authentication layer exists)
```

**v0.12 contains the string `signature` zero times.** Across the sixteen rounds it appears once, in a remark about a *different* codebase, never about the envelope field. Same shape as the TTL loss: present in the proposal, absent from the draft, no round recording the removal.

Whether the field should return is a separate question from the fact that it left without a record. It is listed here because it is a second instance, and two instances of the same failure in one document argue that the sweep should be exhaustive rather than targeted.

**Useful research:** what is the standard practice for an optional signature field in a canonicalized, content-addressed envelope — given that a signature over a body cannot be *inside* the body it signs? Detached signature, a defined exclusion from the canonical form, or a signature envelope wrapping the act (JWS/COSE style)? This is a well-trodden problem and the answer likely settles whether `signature?` was even coherent as drafted.

---

## What would help most

Ranked by how much is unblocked:

1. **Question 1**, because question 5 is the same question and §5 cannot be implemented until it is answered.
2. **Question 2**, because it is a true gap with security consequences, and the implementation is currently deciding it privately.
3. **Question 6**, because it suggests the right next step is an exhaustive v0.1-to-v0.12 field-by-field diff rather than more targeted questions.
4. **Question 4**, because it is a real correctness hole disguised by a nearby solved problem.
5. **Question 3**, which likely needs one sentence, but the sentence should be the right one.

A general question, worth more than any of the six: **what review practice catches a rule that silently leaves a document across revisions?** Sixteen rounds by two careful parties lost at least three (`3600`, `created_time`, `signature`). Diffing consecutive revisions is the obvious answer and does not work here, because the revisions were prose rewrites rather than patches. Is there a known technique — a normative-claim inventory carried forward, a conformance checklist regenerated per revision, something else — that would have caught it?
