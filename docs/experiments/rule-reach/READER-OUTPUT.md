# Answer to CONTRACT

## Rule (per \u00a75)

A clause was counted as "depends on \u00a73.3" if it (a) explicitly names HLC, `hlc`, `l`, or `c`, or (b) its normative promise or prohibition implicitly requires the deterministic, monotonic HLC tuple values that only \u00a73.3\'s emission and ingest rules produce. Structural clauses about the citation graph or general DAG treatment were not counted, since the graph\'s partial order is defined by `parent_id` independently of HLC timing.

---

## Findings: what breaks when \u00a73.3\'s rules are ignored

### 1. Line 54\u201358 \u2014 HLC interface definition

> **Quote:**
> ```
> export interface HLC {
>   readonly l: number;         // Physical/wall timestamp in milliseconds UTC
>   readonly c: number;         // Monotonic logical counter per node
>   readonly node_id: string;   // Unique node/process identifier
> }
> ```

**What breaks:** The type declares `l` as a physical timestamp and `c` as a monotonic logical counter. Without \u00a73.3\'s rules, implementations can emit arbitrary numbers for these fields. The semantic contract of the interface \u2014 that `l` tracks wall time and `c` enforces monotonicity per node \u2014 cannot be guaranteed.

**Detectable:** Yes. From a single act\'s bytes, another party can verify that `l` is not a plausible UTC millisecond value or that `c` fails to increment as required. From a sequence of acts from the same node, failure of monotonicity in `l` or the `c` reset/ increment discipline is observable.

**Sourcing:** sourced in type declaration at line 54\u201358, not normative.

---

### 2. Line 68 \u2014 RelayAct.hlc field

> **Quote:**
> ```
> readonly hlc: HLC;                      // Explicit immutable HLC tuple
> ```

**What breaks:** The act carries an `hlc` field that, per the specification\'s own type, is meant to be an immutable HLC tuple produced by the \u00a73.3 rules. Without those rules, the tuple can be fabricated, making the field a meaningless placeholder rather than a reliable timestamp.

**Detectable:** Yes. From the act\'s bytes: values inconsistent with \u00a73.3\'s emission/ingest logic can be identified.

**Sourcing:** sourced in type declaration at line 68, not normative.

---

### 3. Line 90 \u2014 Sealing: HLC stamped once

> **Quote:**
> **[MUST]** An act is sealed at creation: `id` minted, `hlc` stamped once, bytes canonicalized once.

**What breaks:** The clause requires `hlc` to be "stamped once" at creation. Without \u00a73.3, there is no defined stamping procedure. An implementation can satisfy the letter (it stamps *some* `l` and `c` once) but not the intent (the stamp is not the deterministic, monotonic HLC that the protocol elsewhere assumes). The sealing promise that retries transmit identical bytes (line 94) is also at risk: without \u00a73.3\'s rules, different runs could produce different `hlc` values for the same act, changing the digest and breaking the sealing guarantee.

**Detectable:** Yes. From a single act: the `hlc` values fail to match what \u00a73.3 would have produced given the node\'s prior state. From a retry sequence: differing `hlc` values across retries of the same `id` violate the "stamped once" expectation.

**Sourcing:** normative [MUST] at line 90.

---

### 4. Line 93 \u2014 No re-ticking on retry

> **Quote:**
> **[MUST NOT]** Publishers re-tick the HLC or re-mint timestamps when retrying an existing `id`.

**What breaks:** The prohibition on "re-ticking the HLC" presupposes a defined ticking mechanism. \u00a73.3 *is* that mechanism. Without it, "re-tick" is undefined. An implementation can claim compliance by never changing `hlc` after first minting, yet still violate the spirit because the initial tick was arbitrary. Conversely, an implementation that recomputes `hlc` on each retry using its own method violates the letter, but without \u00a73.3 there is no objective standard for what constitutes a valid tick versus a re-tick.

**Detectable:** Yes. From a sequence of retry attempts: identical `id` with differing `hlc` values indicates a re-tick. The detectability of *why* it\'s wrong (i.e., that the values don\'t follow \u00a73.3) requires observing the node\'s prior HLC state.

**Sourcing:** normative [MUST NOT] at line 93.

---

### 5. Line 134 \u2014 Comparator uses HLC

> **Quote:**
> Comparator: TopologicalDepth \u2192 HLC (l, c, node_id) \u2192 id

**What breaks:** The comparator orders acts first by topological depth, then by HLC tuple `(l, c, node_id)`, then by `id`. This ordering assumes HLC values respect causality: if act A causally precedes act B, then `A.hlc` \u2264 `B.hlc` in the HLC partial order. Without \u00a73.3\'s rules, `l` and `c` are arbitrary, so the comparator may order causally related acts incorrectly or inconsistently. The tie-breaking behavior becomes unreliable, potentially producing different orderings for the same set of acts across implementations.

**Detectable:** Yes. From a sequence of acts: if the comparator\'s output violates known causal relationships (e.g., a child appears before its parent in the HLC-sorted list when topological depth is equal), the broken HLC is observable. Also, inconsistent orderings across different consumers indicate arbitrary HLC values.

**Sourcing:** sourced in prose at line 134, not normative.

---

### 6. Lines 96\u201397 \u2014 Rationale for sealing

> **Quote:**
> Without this, a crash-recovery retry rebuilds the act with a later HLC, the digest changes, and the publisher\'s own retry is reported as a foreign collision.

**What breaks:** The commentary explains that sealing prevents retries from having different HLC values. This explanation only makes sense if HLC is produced by a deterministic rule that would yield different values on retry absent sealing. \u00a73.3 *is* that deterministic rule. Without it, the rationale collapses: there is no "later HLC" to prevent, and the described failure mode (digest change, collision report) is not necessarily averted by sealing alone, since the initial HLC could already be arbitrary.

**Detectable:** No. This is explanatory text; its truth depends on \u00a73.3 existing, but the text itself imposes no observable requirement. If \u00a73.3 is absent, the described scenario may or may not occur depending on the implementation\'s arbitrary HLC method.

**Sourcing:** sourced in explanatory prose at lines 96\u201397, not normative.

---

## \u00a74: Obligation that \u00a73.3\'s rules exist to produce

**Finding:** Yes. Two normative clauses state obligations whose satisfaction requires the properties that \u00a73.3\'s rules produce.

> **Quote 1:** Line 90 \u2014 **[MUST]** An act is sealed at creation: `id` minted, `hlc` stamped once, bytes canonicalized once.

This requires `hlc` to be *stamped* \u2014 i.e., produced by a deterministic, repeatable method. \u00a73.3\'s rules are the only method in the draft that defines how to stamp `l` and `c` deterministically.

> **Quote 2:** Line 93 \u2014 **[MUST NOT]** Publishers re-tick the HLC or re-mint timestamps when retrying an existing `id`.

This requires that HLC values be stable across retries. \u00a73.3\'s emission rule (lines 101\u2013107) ensures that for a given act context, the same `l` and `c` are produced, making retries identical. Without \u00a73.3, the property of deterministic, non-re-tickable HLC is not produced by any other stated mechanism.

**Conclusion for \u00a74:** The draft does state, as obligations, properties (deterministic stamping, no re-ticking) that \u00a73.3\'s rules exist to produce.

---

## \u00a77: Confidence

- Line 54\u201358: high confidence \u2014 type semantics directly reference the \u00a73.3 behavior.
- Line 68: high confidence \u2014 field semantics depend on \u00a73.3.
- Line 90: high confidence \u2014 sealing explicitly requires HLC stamping; \u00a73.3 is the only stamping method defined.
- Line 93: high confidence \u2014 prohibition on re-ticking presupposes \u00a73.3\'s ticking mechanism.
- Line 134: high confidence \u2014 comparator\'s correctness depends on HLC monotonicity from \u00a73.3.
- Lines 96\u201397: high confidence \u2014 rationale explicitly describes a \u00a73.3 failure mode.
- \u00a74 finding: high confidence \u2014 lines 90 and 93 obligate properties produced by \u00a73.3.
