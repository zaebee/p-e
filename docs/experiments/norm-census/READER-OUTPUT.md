# Analysis: relay-lite v0.12 HLC Integer Overflow Defect

## §5 Rule

A resolution "could violate" a clause if there exists a plausible change to the
specification that resolves the HLC integer overflow defect AND, under that
change, it becomes possible for a conforming implementation to violate the
clause as currently stated in the draft. A resolution that merely makes a
clause harder to satisfy or changes unrelated behavior does not count as
"could violate."

---

## Clause-by-Clause Assessment

### Clause 1 — line 42
> **[MUST]** `CNS.to` is an element of the act's `to[]`, or `to[] == ["all"]`. A delivery leg naming a recipient outside the attested audience is non-conformant and is rejected by the receiver.

**Answer:** Cannot

**Mechanism:** No resolution to the HLC integer overflow defect affects the validation of `CNS.to` against the act's `to[]` field. Delivery leg naming and audience validation are orthogonal to Hybrid Logical Clock computation and value ranges.

**Source:** `relay-lite-v0.12-draft.md:42-44`.

---

### Clause 2 — line 46
> **[MUST]** `CNS.id == act.id`.

**Answer:** Cannot

**Mechanism:** No resolution to HLC overflow affects the requirement that the canonical name system ID matches the act's internal ID. These are independent concerns.

**Source:** `relay-lite-v0.12-draft.md:46`.

---

### Clause 3 — line 75
> **[MUST]** Producers mint canonical wire bytes per **RFC 8785 (JCS)** encoded as raw UTF-8. JCS fixes key order (UTF-16 code units), number formatting (ECMAScript), and string escaping (non-ASCII emitted as literal UTF-8).

**Answer:** Could

**Mechanism:** A resolution that abandons JSON entirely in favor of a binary serialization format (e.g., Protocol Buffers, MessagePack) to avoid JSON/I-JSON integer precision limitations would violate this clause. RFC 8785 (JCS) is a JSON-specific canonicalization standard; a non-JSON format cannot produce bytes "per RFC 8785."

**Source:** `relay-lite-v0.12-draft.md:75-77`.

---

### Clause 4 — line 79
> **[MUST]** Acts conform to **I-JSON (RFC 7493)**: no duplicate keys; integers within `[-(2^53 - 1), 2^53 - 1]`, larger values encoded as strings; strings valid UTF-8 without overlong sequences or unpaired surrogates.

**Answer:** Could

**Mechanism:** A resolution that relaxes the I-JSON integer range restriction — for example, expanding it to `[-(2^54 - 1), 2^54 - 1]` or removing the upper bound entirely — would directly violate the current requirement that integers be constrained to `[-(2^53 - 1), 2^53 - 1]`. This is the clause whose constraint the HLC computation currently violates at the boundary.

**Source:** `relay-lite-v0.12-draft.md:79-81`.

---

### Clause 5 — line 90
> **[MUST]** An act is sealed at creation: `id` minted, `hlc` stamped once, bytes canonicalized once.

**Answer:** Cannot

**Mechanism:** Sealing occurs at the moment of act creation. The defect arises during *ingest* at a receiver, when a node updates its local HLC based on an incoming message. A resolution that changes ingest-time HLC computation (e.g., saturation, wrapping) does not affect the requirement that the *act itself* is sealed once at creation with its HLC stamped.

**Source:** `relay-lite-v0.12-draft.md:90-91`.

---

### Clause 6 — line 93
> **[MUST NOT]** Publishers re-tick the HLC or re-mint timestamps when retrying an existing `id`. Retries and fan-out transmit the identical sealed byte buffer.

**Answer:** Cannot

**Mechanism:** This clause governs publisher behavior during retries. The defect concerns receiver-side HLC computation during ingest. Even if HLC arithmetic is changed to handle overflow, the prohibition on publishers modifying HLC values for the same `id` remains unaltered and unalterable by any ingest-focused resolution.

**Source:** `relay-lite-v0.12-draft.md:93-94`.

---

### Clause 7 — line 124
> **[MUST]** The protocol and storage model treat the graph as a DAG — a partial order.

**Answer:** Cannot

**Mechanism:** The DAG property of the causal graph is derived from the `parent_id` citation structure, not from HLC values. HLC is used as metadata for *ordering within* the partial order, but does not determine the graph's edges or acyclicity. Changing HLC arithmetic cannot introduce cycles into the parent citation graph.

**Source:** `relay-lite-v0.12-draft.md:124`.

---

### Clause 8 — line 126
> **[MUST NOT]** A consumer presents any linear projection as *the* causal history, or makes protocol assertions from a linearized sequence.

**Answer:** Cannot

**Mechanism:** This is a direct prohibition on consumer behavior. A resolution to HLC overflow (e.g., saturation, wrapping, string encoding) does not require, enable, or encourage consumers to present a linear projection as definitive causal history. The prohibition remains absolute regardless of HLC representation.

**Source:** `relay-lite-v0.12-draft.md:126-127`.

---

### Clause 9 — line 264
> **[MUST NOT]** A verifier parses, normalizes, or re-serializes bytes when computing a digest or verifying `parent_digest`. Re-serializing makes a non-canonical producer verify against a body nobody transmitted, and makes verification depend on the verifier's JSON library.

**Answer:** Cannot

**Mechanism:** Digest computation and `parent_digest` verification operate on raw received bytes. Stage 1 of the verification pipeline explicitly performs "wire-octet hashing" without parsing. A resolution to HLC overflow does not affect this raw-byte operation, which is independent of how HLC values are interpreted or serialized.

**Source:** `relay-lite-v0.12-draft.md:264-266`.

---

### Clause 10 — line 276
> **[MUST]** A citation carries both handles — the locator and the digest:

**Answer:** Cannot

**Mechanism:** The requirement that citations include both `parent_id` (locator) and `parent_digest` (content address) is structural to the act format. HLC overflow and its resolutions do not affect the presence or format of citation fields.

**Source:** `relay-lite-v0.12-draft.md:276`.

---

### Clause 11 — line 338
> **[MUST]** A store guarantees the invariant, by deriving the digest at load or by verifying it before committing the record.

**Answer:** Could

**Mechanism:** A resolution that adopts a non-JSON serialization format lacking a deterministic canonical representation (to avoid integer range issues) would prevent stores from guaranteeing the invariant `digest === SHA-256(octets)`. If the same logical act can be serialized to different octet sequences by different implementations, the SHA-256 digest would vary, making it impossible for a store to guarantee the invariant for all conforming producers.

**Source:** `relay-lite-v0.12-draft.md:338-339`.

---

### Clause 12 — line 341
> **[MUST]** A detected discrepancy raises `STORE_CORRUPTION`. It **MUST NOT** surface as `DIVERGES` against a child record — the tri-state stops a reader's *visibility* gap from becoming an author's defect, and this stops the reader's *staleness* from doing the same.

**Answer:** Cannot

**Mechanism:** This clause governs error classification for store invariant violations. `STORE_CORRUPTION` addresses discrepancies in the `digest === SHA-256(octets)` invariant, while `DIVERGES` is a causal link evaluation state. HLC overflow resolution does not inherently cause store invariant discrepancies nor affect the classification of such discrepancies when they occur.

**Source:** `relay-lite-v0.12-draft.md:341-343`.

---

## §4 Beyond the Twelve

**Is there anything a resolution to this defect could break that is NOT among the twelve normative clauses?**

No.

The six-state causal link partition (NO_PARENT, UNANCHORED, LABEL_ONLY, MATCHES, DIVERGES, UNCHECKABLE) defined in §7.2 is explanatory and definitional prose, not a normative clause. It is relied upon by the verification pipeline, but its completeness and correctness depend on the `parent_id`/`parent_digest` citation mechanism, which is unaffected by HLC value ranges. The partition is stated at `relay-lite-v0.12-draft.md:276-294`, but none of these lines carry `[MUST]` or `[MUST NOT]`.

The HLC computation rules in §3.3 are also non-normative prose. No property outside the twelve identified clauses is at risk.

---

## §7 Confidence

| Clause | Line | Confidence | Reasoning |
|--------|------|------------|-----------|
| 1 | 42 | High | Delivery validation is entirely independent of HLC computation. |
| 2 | 46 | High | ID matching is independent of HLC computation. |
| 3 | 75 | Medium | Non-JSON serialization is a plausible but non-minimal resolution; mechanism is clear but resolution aggressiveness reduces confidence. |
| 4 | 79 | High | The defect directly violates this clause; relaxing the range directly violates it. |
| 5 | 90 | High | Sealing at creation is independent of ingest-time HLC updates. |
| 6 | 93 | High | Retry behavior is independent of ingest computation. |
| 7 | 124 | High | DAG property is structural, not dependent on HLC values. |
| 8 | 126 | High | Consumer prohibition is behavioral, unaffected by HLC resolution. |
| 9 | 264 | High | Raw-byte digest computation is independent of HLC interpretation. |
| 10 | 276 | High | Citation format is independent of HLC value ranges. |
| 11 | 338 | Medium | Similar to Clause 3, relies on non-JSON serialization being plausible. |
| 12 | 341 | High | Error classification is independent of HLC value ranges. |
