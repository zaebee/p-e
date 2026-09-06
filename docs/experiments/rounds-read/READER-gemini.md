# Census Results: Protocol Undertakings vs Draft v0.12

**Verification of PIN:**
The input tree SHA256 was calculated over all files in the `input/` directory sorted lexicographically and matched the value in `PIN.txt` exactly:
- Calculated SHA256: `be77df58707710ba6aacfe657bdc1be3608e3fccb226a859fcbfc1eba92f053e`
- Value in `PIN.txt`: `be77df58707710ba6aacfe657bdc1be3608e3fccb226a859fcbfc1eba92f053e`
- **Result: MATCHED**

**Recognition of Project:**
We recognize this project: it is part of the "p-e" (pchelkam-eval / Pollen-event) repository and its "relay-lite" protocol, which we have analyzed and worked on in previous runs. We set that knowledge aside and have worked strictly from the contents of the `input/` directory, fetching nothing and using no external resources.

---

## Census of the 46 Undertakings

### Item 1: Line 226
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 226-227:
   > "Replace rename(tmp, in/name) with POSIX link(tmp, in/name) followed by unlink(tmp)."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 186-187:
   > "await fs.link(tmpPath, targetPath);"
   and line 224-226:
   > "- **`link`, not `rename`** — `rename` overwrites an existing name silently; `link` fails with `EEXIST`, which is what a create-or-fail publish needs."
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. The draft carries the actual implementation of this POSIX `link` sequence inside the normative `publishMessage` reference function, and explicitly mandates its use in the accompanying protocol guidelines.
5. **Confidence:** Highly confident that POSIX `link` create-or-fail semantics are a core normative requirement of the draft.

---

### Item 2: Line 230
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 230-233:
   > "Downgrade §7's parent_digest MUST from \"must point to a valid/held predecessor\" to \"must record the asserted predecessor digest\". ... Adopt continuity.ts semantics: deposit never rejects due to unheld parents."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 23:
   > "4. A reader's inability to see a record is not a defect in that record."
   and line 258:
   > "| set | set | UNCHECKABLE | parent not held — **reader gap, not a defect** |"
   and line 273-275:
   > "Partial visibility is the normal case, and a verifier that rejects on an unheld parent rejects correct acts routinely."
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. The decoupling of deposit from parent availability is codified as a core protocol invariant (Invariant 4) and as a normative Stage 3 verification classification (`UNCHECKABLE`), with no deposit-time presence check mandated in the schema or the publisher.
5. **Confidence:** Highly confident, verified by the structural mapping of the `UNCHECKABLE` state.

---

### Item 3: Line 234
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 234-237:
   > "We remove the automated ruled_by: \"consensus-v1\" procedural ruling. - Invariant: A procedure ... produces an AGGREGATED_FINDING (Measurement / Reading). A RULING is an explicit, attributed act signed by a designated Authority (ruled_by: \"authority:<id>\"), maintaining the invariant that a ruling is not a reading."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 250-252:
   > "`ruled_by` records **attribution of epistemic responsibility**, not a delegated mandate. It does not assert that anyone conferred authority; it names who made the judgment call, so a later reader knows whom to distrust. A ruling is not a reading."
3. **Verdict:** `PARTIAL`
4. **Normative Force or Content:** Content only. The conceptual separation between a ruling and procedural reading is established ("A ruling is not a reading"), and the automated `ruled_by: "consensus-v1"` has indeed been removed. However, the specific terms `AGGREGATED_FINDING` and the exact format `ruled_by: "authority:<id>"` are absent from the draft's text and schemas (which does not define any `ruled_by` field).
5. **Confidence:** Highly confident, based on direct text search of Section 5 and the `RelayAct` schema.

---

### Item 4: Line 238
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 238-241:
   > "Rather than introducing filesystem allocation markers ... relay-lite eliminates logical_seq entirely."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 60-70:
   The `RelayAct` interface contains no `logical_seq` field.
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. The elimination of `logical_seq` is complete and absolute across all schemas and ordering rules.
5. **Confidence:** Highly confident, verified by the total absence of the field in the interface.

---

### Item 5: Line 242
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 242-246:
   > "We explicitly distinguish: - Arrival/Queue Order: Lexicographical order of UUIDv7 in .relay/in/ (used solely by workers for transport draining). - Causal/Semantic Order: Directed Acyclic Graph formed by parent_digest ... No causality is derived from filename timestamps."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 19-22:
   > "2. Order comes from the citation graph, not from absolute system clocks. 3. The causal graph is a **partial order**."
   and line 129-130:
   > "Comparator:  TopologicalDepth  →  HLC (l, c, node_id)  →  id"
3. **Verdict:** `PARTIAL`
4. **Normative Force or Content:** Content only. The draft correctly specifies causal/semantic order via the DAG and HLC/ID comparator and rejects wall-clock filenames as causal. However, the explicit dual-order model with the term "Arrival/Queue Order" and its use by workers for transport draining is absent from the draft.
5. **Confidence:** Highly confident, based on the missing terminology and worker draining details in the draft.

---

### Item 6: Line 315
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 315-324:
   > "1. The underlying protocol and storage model MUST be treated as a Directed Acyclic Graph (Partial Order). ... 2. Consumers requiring a flat linear presentation ... MUST use a deterministic presentation convention: Sort by: Topological Depth -> HLC Wall Time -> lexicographical(digest) 3. [MUST NOT] Consumers MUST NOT present any linear projection as the singular causal history..."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 125-128:
   > "**[MUST]** The protocol and storage model treat the graph as a DAG — a partial order. **[MUST NOT]** A consumer presents any linear projection as *the* causal history, or makes protocol assertions from a linearized sequence."
   and line 133-134:
   > "Comparator:  TopologicalDepth  →  HLC (l, c, node_id)  →  id"
3. **Verdict:** `LANDED-ALTERED`
4. **Normative Force or Content:** Normative force. The rules are implemented with explicit `[MUST]` and `[MUST NOT]` tags. However, the tie-break was altered from `lexicographical(digest)` to `id` in a later round (Round 3, line 427), which is reflected in the final draft.
5. **Confidence:** Highly confident, verified by the presence of `[MUST]` / `[MUST NOT]` and the documented alteration.

---

### Item 7: Line 325
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 325-341:
   > "To guarantee survival of both the content bytes and the namespace binding ... the publish sequence is strictly defined as: [provides the 9-step typescript-like pseudo-code]"
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 154-219:
   The `publishMessage` reference function code implements exactly this sequence.
   and line 230-233:
   > "- **Directory fsync** — durable bytes do not make a durable name. Without it a crash can leave a complete record that no directory entry points at..."
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. The typescript function in §4.1 is the formal, normative specification of the publish protocol and executes all 9 steps in the correct order with G2a directory `fsync` and error recovery.
5. **Confidence:** Highly confident, verified by matching steps in code.

---

### Item 8: Line 343
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 343-348:
   > "The draft explicitly adopts the repo’s finding: \"Authorisation is not what protects fidelity. Attribution is... It names whom to distrust.\" - Normative Rule: ruled_by: \"<identity>\" ... records Attribution of Epistemic Responsibility."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 250-252:
   > "`ruled_by` records **attribution of epistemic responsibility**, not a delegated mandate. It does not assert that anyone conferred authority; it names who made the judgment call..."
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. It defines the formal semantic meaning of the `ruled_by` metadata for the entire protocol.
5. **Confidence:** Highly confident, direct match of the text.

---

### Item 9: Line 427
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 427-438:
   > "The comparator replaces digest with the envelope/locator id (UUIDv7) ... Compare(A, B) = TopologicalDepth(A, B) or HLC(A, B) or lexicographical(A.id, B.id)"
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 133-134:
   > "Comparator:  TopologicalDepth  →  HLC (l, c, node_id)  →  id"
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. It is the formal tie-break comparator specification in §4.
5. **Confidence:** Highly confident, matches the comparator definition exactly.

---

### Item 10: Line 441
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 441-447:
   > "Formalize the publish sequence in strict try...finally semantics ensuring descriptor and temp cleanup on every exit path (success, refusal, or I/O crash)."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 178-219:
   `try...finally` block in `publishMessage`, which contains:
   ```typescript
       } finally {
         if (tmpHandle) await tmpHandle.close().catch(() => {});
         if (dirHandle) await dirHandle.close().catch(() => {});
         if (tmpCreated) await fs.unlink(tmpPath).catch(() => {});
       }
   ```
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. It is implemented in the normative reference code of the publish protocol.
5. **Confidence:** Highly confident, verified by code structure.

---

### Item 11: Line 570
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 570-578:
   > "Consumers MUST deduplicate the candidate record set by id prior to executing the sorting comparator: ProjectThread(E) = Sort(DeduplicateByID(E), Comparator)"
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 132:
   > "ProjectThread(E) = Sort(DeduplicateByID(E), Comparator)"
   and line 135:
   > "Deduplication is not an optimisation. Fan-out delivers N copies of one act..."
3. **Verdict:** `PARTIAL`
4. **Normative Force or Content:** Content only. The formula and explanatory text landed perfectly, but the explicit `MUST` word promised in the undertaking ("Consumers MUST deduplicate...") arrived unmarked in the draft ("A consumer needing a flat presentation deduplicates first, then sorts..."). Under §5's rule, this is `PARTIAL`, not `LANDED`.
5. **Confidence:** Highly confident, strictly following §5's "arrived unmarked is `PARTIAL`" rule.

---

### Item 12: Line 581
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 581-586:
   > "Replace logical_seq with a canonical Hybrid Logical Clock (HLC) local counter ... HLC = (wall_time_iso, logical_counter, node_id)"
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 60-64:
   > "export interface HLC { readonly l: number; ... }"
3. **Verdict:** `LANDED-ALTERED`
4. **Normative Force or Content:** Normative force. The HLC tuple was altered from using an ISO string `wall_time_iso` to a millisecond number `l` in a later round (Round 4, line 808), which is the version in the draft.
5. **Confidence:** Highly confident, verified by the recorded clock format alteration.

---

### Item 13: Line 592
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 592-598:
   > "Temp files are ephemeral and non-meaningful. Format: .relay/tmp/.dep-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)} GC Policy: Crashed temp files are inert garbage..."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 166-169:
   > "join(tmpDir, `.dep-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`)"
   and line 245-247:
   > "**GC:** a sweeper reaps `.relay/tmp/` entries older than 10 minutes..."
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. Code format and GC rules are explicitly specified as part of the transport.
5. **Confidence:** Highly confident, exact match of the randomizer formula.

---

### Item 14: Line 600
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 600-606:
   > "On EEXIST, the publisher reads the existing target to verify content identity: - sha256(existing_content) == sha256(payload) => ALREADY_PUBLISHED - sha256(existing_content) != sha256(payload) => COLLISION_REFUSED"
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 189-204:
   `readFile(targetPath)`, digests compared, returns `"ALREADY_PUBLISHED"` or `"COLLISION_REFUSED"`.
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. It is the core idempotency and safety recovery logic inside `publishMessage`.
5. **Confidence:** Highly confident, exact match of logic.

---

### Item 15: Line 608
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 608-630:
   `publishMessage` typescript implementation block.
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 144-220:
   Final `publishMessage` typescript code.
3. **Verdict:** `LANDED-ALTERED`
4. **Normative Force or Content:** Normative force. The code was further altered/hardened in later rounds (Round 4, line 824 and Round 5, line 1073), which is the version in the draft.
5. **Confidence:** Highly confident, verified by comparing the evolution of code blocks.

---

### Item 16: Line 787
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 787-802:
   > "Separation of Canonical Act (Payload) and Delivery Routing. - Delivery Metadata (CNS Path): to=<agent> lives strictly in the transport filename. - Canonical Act (Hashed Body): contains only recipient-invariant truths (id, thread_id, type, from, hlc, payload)."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 34-36:
   > "to=<agent> names **one** delivery leg. A message addressed to N agents produces N delivery files carrying identical bytes."
   and line 57-58:
   > "The hashed body carries only what is true regardless of who receives it."
3. **Verdict:** `LANDED-ALTERED`
4. **Normative Force or Content:** Normative force. The separation is the foundation of the protocol. However, the canonical act structure was altered in Round 7 (line 1361) to restore `to: string[]` (the invariant audience list) to prevent recipient relinking.
5. **Confidence:** Highly confident, verified by the recorded addition of `to: readonly string[]` to the schema in Round 7.

---

### Item 17: Line 808
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 808-821:
   > "Implement canonical monotonic HLC update: l' = max(physical_now_ms, last_wall_ms); c' = last_c + 1 if l' == last_wall_ms else 0."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 104-106:
   > "l' = max(physical_now_ms, last_l); c' = last_c + 1 if l' == last_l else 0."
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. The update formula is in §3.3, and the clock addendum (`relay-lite-v0.12-addendum-clock.md` line 78) mandates: `**[MUST]** An implementation claims ... tuple is strictly monotonic...`.
5. **Confidence:** Highly confident, matches the emission rule and addendum text.

---

### Item 18: Line 824
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 824-850:
   Typescript block of `publishMessage` code.
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 144-220:
   Final `publishMessage` code.
3. **Verdict:** `LANDED-ALTERED`
4. **Normative Force or Content:** Normative force. It was further refined in Round 5 (line 1073), which is the version in the draft.
5. **Confidence:** Highly confident, verified by code history.

---

### Item 19: Line 1031
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1031-1045:
   > "Canonical Act Interface with Explicit parent_digest. - Normative Rule: The parent_digest field is a first-class property of the canonical act. It MUST record the SHA-256 digest of the parent's Canonical Act body."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 63:
   > "readonly parent_digest: string | null;  // SHA-256 of parent's wire octets"
   and line 263-265:
   > "**[MUST NOT]** A verifier parses, normalizes, or re-serializes bytes when computing a digest or verifying parent_digest."
3. **Verdict:** `LANDED-ALTERED`
4. **Normative Force or Content:** Normative force. The `parent_digest` field is a first-class property. However, computing the digest was altered in Round 7 (line 1341) from "parent's Canonical Act body" to "parent's wire octets" (direct received wire octets zero-copy hashing), which is reflected in the final draft.
5. **Confidence:** Highly confident, verified by the recorded alteration in Round 7.

---

### Item 20: Line 1048
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1048-1070:
   > "To guarantee cross-node causal monotonicity, the HLC tuple is governed by two formal rules: 1. Emission Rule ... 2. Ingest Rule ..."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 103-118:
   Section 3.3 HLC mathematical formulas for emission and ingest.
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. The rules are the formal mathematical specification of the clock.
5. **Confidence:** Highly confident, formulas match exactly.

---

### Item 21: Line 1073
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1073-1090:
   > "Strictly Scoped, Four-State POSIX Publisher: [provides third iteration of typescript publishMessage code]"
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 144-220:
   Final `publishMessage` code.
3. **Verdict:** `LANDED-ALTERED`
4. **Normative Force or Content:** Normative force. This was the final major refactoring of the publisher (incorporating loop retries, `RETRY_EXHAUSTED`, and scoped `ENOENT` checks). It represents an alteration of previous versions and has landed in its final form.
5. **Confidence:** Highly confident, verified by matching code structure.

---

### Item 22: Line 1237
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1237-1247:
   > "Normative Canonical Serialization: RFC 8785 (JCS). - Normative Rule: 1. The canonical byte representation of a RelayAct MUST be generated according to RFC 8785 (JCS) ... 2. All cryptographic hashes ... MUST be computed over this JCS byte slice."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 75:
   > "**[MUST]** Producers mint canonical wire bytes per **RFC 8785 (JCS)** encoded as raw UTF-8."
   and line 263-265:
   > "**[MUST NOT]** A verifier parses, normalizes, or re-serializes bytes when computing a digest or verifying parent_digest."
3. **Verdict:** `LANDED-ALTERED`
4. **Normative Force or Content:** Normative force. The producer rule JCS requirement carries explicit `[MUST]`. However, the hashing rule for verifiers was altered in Round 7 (line 1341) to use direct wire octets instead of JCS-re-serialized bytes. This alteration is recorded in Round 7 and reflected in the draft.
5. **Confidence:** Highly confident, verified by Round 7's "wire-octet hashing" rule.

---

### Item 23: Line 1250
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1250-1268:
   > "A RelayAct is Sealed at Creation: 1. Sealing ... 2. Immutability ... 3. [MUST NOT] Publishers MUST NOT re-tick HLC or re-mint timestamps when retrying ..."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 87-93:
   > "**[MUST]** An act is sealed at creation ... **[MUST NOT]** Publishers re-tick the HLC or re-mint timestamps when retrying an existing id..."
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. Carries explicit `[MUST]` and `[MUST NOT]` tags.
5. **Confidence:** Highly confident, exact match of rules and markup.

---

### Item 24: Line 1341
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1341-1349:
   > "Verifier Wire-Octet Hashing Rule. - Normative Rule: ... 2. Verifier Rule [MUST]: Verifiers MUST compute digests directly over the exact received wire octets ... 3. [MUST NOT]: Verifiers MUST NOT parse, normalize, or re-serialize..."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 260-265:
   > "Stage 1 — wire-octet hashing ... **[MUST NOT]** A verifier parses, normalizes, or re-serializes bytes when computing a digest..."
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. Carries explicit `[MUST NOT]` tag and defines Stage 1 normatively.
5. **Confidence:** Highly confident, matches exact rules.

---

### Item 25: Line 1352
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1352-1359:
   > "All RelayAct bodies and arbitrary payloads ... MUST conform strictly to I-JSON (RFC 7493) ... Integers MUST be within the safe range ... Producers MUST NOT emit duplicate keys ..."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 79-82:
   > "**[MUST]** Acts conform to **I-JSON (RFC 7493)**: no duplicate keys; integers within [-(2^53 - 1), 2^53 - 1] ..."
   and line 268-270:
   > "Stage 2 — structural and I-JSON conformance ... reject on duplicate keys, on numbers outside the safe range..."
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. Carries explicit `[MUST]` tag in §3.1 and Stage 2 rejection mandate in §7.1.
5. **Confidence:** Highly confident, exact match of constraints.

---

### Item 26: Line 1361
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1361-1368:
   > "Audience Attestation: Invariant to: string[] ... Canonical Act contains the author's invariant intended audience list: to: string[]."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 65:
   > "readonly to: readonly string[];         // Invariant attested audience list"
   and line 35-36:
   > "to=<agent> names **one** delivery leg. A message addressed to N agents produces N delivery files carrying identical bytes."
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. Codified in the normative interface and CNS/attestation rules.
5. **Confidence:** Highly confident, exact match.

---

### Item 27: Line 1370
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1370-1388:
   `RelayAct` interface code block.
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 60-70:
   Final `RelayAct` interface.
3. **Verdict:** `LANDED-ALTERED`
4. **Normative Force or Content:** Normative force. The interface was altered in later rounds (Round 9, line 1654 added `parent_id`; Round 12, line 2139 added explicit `HLC` and standalone interfaces; Round 14, line 2218 added `readonly` to all fields), which is the version in the draft.
5. **Confidence:** Highly confident, verified by comparing fields across revisions.

---

### Item 28: Line 1455
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1455-1463:
   > "Evaluating parent_digest against the local store MUST yield one of three distinct states: MATCHES, DIVERGES, UNCHECKABLE ... Verifiers MUST NOT reject or discard a well-formed act solely because its causal link evaluates to UNCHECKABLE."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 258:
   > "| set | set | UNCHECKABLE | parent not held — **reader gap, not a defect** |"
   and line 273-275:
   > "Partial visibility is the normal case, and a verifier that rejects on an unheld parent rejects correct acts routinely."
3. **Verdict:** `LANDED-ALTERED`
4. **Normative Force or Content:** Normative force. The causal evaluation model was altered in later rounds to a 6-state partition (Round 10, line 1795 and Round 11, line 1929). In the draft, `UNCHECKABLE` is fully codified as one of the 6 states, and the draft's text explains why rejecting on unheld parent is wrong.
5. **Confidence:** Highly confident, based on the evolution from tri-state to 6-state.

---

### Item 29: Line 1465
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1465-1472:
   > "The delivery recipient named in the CNS filename (to=<agent>) MUST be an element of the sealed canonical audience array ... Any delivery leg naming an agent outside ... MUST be rejected"
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 42-45:
   > "**[MUST]** `CNS.to` is an element of the act's `to[]`, or `to[] == [\"all\"]`..."
   and line 269:
   > "Stage 2 ... reject ... on `CNS.to ∉ act.to[]`"
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. Carries explicit `[MUST]` tag in Section 2.1 and Stage 2 conformance check.
5. **Confidence:** Highly confident, exact match of formula and `[MUST]`.

---

### Item 30: Line 1474
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1474-1490:
   > "To resolve parser ordering ambiguity, verifiers MUST process incoming delivery files in a strict, sequential three-stage pipeline:"
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 256-257:
   > "Three stages, in order. The ordering is normative: stage 1 must not parse, and stage 2's conformance checks require parsing."
3. **Verdict:** `PARTIAL`
4. **Normative Force or Content:** Content only. The three stages and their normative ordering are fully specified in Section 7.1. However, the main pipeline rule itself arrived unmarked without an explicit `[MUST]` tag (though Stage 1 has a `[MUST NOT]`). Under §5's rule, this is `PARTIAL`, not `LANDED`.
5. **Confidence:** Highly confident, strictly applying the §5 unmarked constraint.

---

### Item 31: Line 1564
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1564-1568:
   > "The claim that v0.8 is \"logical complete\" is retracted ... Status of v0.8: Designated as Working Draft ..."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 3:
   > "**Status:** Working draft. Not verified. Not adopted by this project."
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Content only. As a statement of status/retraction, it applies to the meta-document and is fully reflected in the draft's Status and Provenance headers.
5. **Confidence:** Highly confident, verified by headers.

---

### Item 32: Line 1570
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1570-1582:
   > "UNCHECKABLE is an intrinsic mathematical necessity of selective delivery under partial visibility, independent of filesystem failures..."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 278-282:
   > "`UNCHECKABLE` is a consequence of this protocol's own transport, not an import: under §2.1's single-leg delivery ..."
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. It provides the mathematical proof and justification for the `UNCHECKABLE` state inside the specification.
5. **Confidence:** Highly confident, exact match of the reasoning text.

---

### Item 33: Line 1654
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1654-1672:
   > "Every causal link MUST explicitly carry both the Locator (parent_id) and the Digest (parent_digest)"
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 62-63:
   > "readonly parent_id: string | null;      // Predecessor locator (null for roots)"
   > "readonly parent_digest: string | null;  // SHA-256 of parent's wire octets"
   and line 255:
   > "**[MUST]** A citation carries both handles — the locator and the digest:"
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. Codified with an explicit `**[MUST]**` tag in Section 7.2.
5. **Confidence:** Highly confident, exact match with `[MUST]`.

---

### Item 34: Line 1674
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1674-1700:
   `evaluateCausalLink` first code snippet with locators and digests.
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 301-320:
   Final 6-state `evaluateCausalLink` code.
3. **Verdict:** `LANDED-ALTERED`
4. **Normative Force or Content:** Normative force. The code was altered in later rounds to its final 6-state form (Round 10, line 1795 and Round 11, line 1929) to handle the 2x2 matrix, which has landed.
5. **Confidence:** Highly confident, verified by comparing code evolutions.

---

### Item 35: Line 1795
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1795-1804:
   > "Complete Causal Link 2x2 Truth Table: [provides 2x2 table mapping null/set to NO_PARENT, LABEL_ONLY, MATCHES/DIVERGES/UNCHECKABLE]"
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 258-263:
   Complete 6-state table mapping `parent_id` and `parent_digest` to their respective causal states.
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. Reaffirmed with explicit `**[MUST]**` tag above the table.
5. **Confidence:** Highly confident, exact table present.

---

### Item 36: Line 1806
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1806-1814:
   > "In Stage 2 ... verifier explicitly rejects unanchored citations: parent_id === null && parent_digest !== null"
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 269-270:
   > "Stage 2 ... reject ... on an unanchored citation (parent_id == null && parent_digest != null)."
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. It is specified as a mandatory rejection rule in Stage 2 of the verification pipeline.
5. **Confidence:** Highly confident, exact rule match.

---

### Item 37: Line 1816
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1816-1840:
   `evaluateCausalLink` second code snippet.
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 301-320:
   Final `evaluateCausalLink` code.
3. **Verdict:** `LANDED-ALTERED`
4. **Normative Force or Content:** Normative force. The code was further altered in Round 11 (line 1929) to compile under strict TypeScript control flow narrowing, which is the version in the draft.
5. **Confidence:** Highly confident, verified by comparing code evolutions.

---

### Item 38: Line 1929
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1929-1942:
   > "CausalStatus is a total, pure function mapping any historical record state to an explicit variant with zero unhandled exceptions: export type CausalStatus = \"NO_PARENT\" | \"UNANCHORED\" | \"LABEL_ONLY\" | \"MATCHES\" | \"DIVERGES\" | \"UNCHECKABLE\";"
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 285-288:
   > "export type CausalStatus = | \"NO_PARENT\" | \"UNANCHORED\" | \"LABEL_ONLY\" | \"MATCHES\" | \"DIVERGES\" | \"UNCHECKABLE\";"
   and line 321:
   > "Evaluation is **total** — every input returns a state, none throws."
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. It defines the formal, normative union type of the status and is implemented in the reference evaluator.
5. **Confidence:** Highly confident, exact match of type declaration.

---

### Item 39: Line 1944
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1944-1975:
   `evaluateCausalLink` strict-compliant implementation code block.
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 301-320:
   The `evaluateCausalLink` function code block.
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. This is the normative reference implementation of the evaluator.
5. **Confidence:** Highly confident, exact match of code block.

---

### Item 40: Line 1979
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 1979-1987:
   > "Stage 2 (Ingest Gate): Enforces write-time validity ... Stage 3 (Causal Evaluator): Total evaluator ... returns UNANCHORED safely without crashing"
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 321-324:
   > "Evaluation is **total** — every input returns a state, none throws. Stage 2 rejects `UNANCHORED` at ingest, where rejection belongs; stage 3 still classifies it..."
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. Codified as the normative pipeline operational separation.
5. **Confidence:** Highly confident, exact match.

---

### Item 41: Line 2035
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 2035-2050:
   > "1. For any stored record, record.digest MUST be an exact, immutable mirror ... 2. Stores MUST guarantee this invariant ... 3. If an internal store discrepancy is detected ... store MUST flag an internal STORE_CORRUPTION fault; it MUST NOT emit DIVERGES"
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 335-341:
   > "**[MUST]** A store guarantees the invariant ... **[MUST]** A detected discrepancy raises `STORE_CORRUPTION`. It **MUST NOT** surface as `DIVERGES` against a child record..."
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. Codified with explicit `[MUST]` and `MUST NOT` tags in Section 7.3.
5. **Confidence:** Highly confident, exact match of all three invariants and markup.

---

### Item 42: Line 2134
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 2134-2137:
   > "The 6-state causal partition ... is recorded not as an independently verified universal law, but as a formal hypothesis derived from continuity.ts, subject to falsification..."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 358-368:
   Section "What is imported" carries this exact explanation.
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Content only. This is an epistemic/philosophical statement of standing, appropriately placed in the "Provenance and standing" section.
5. **Confidence:** Highly confident, exact match of the imported history context.

---

### Item 43: Line 2139
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 2139-2162:
   > "Standalone HLC Interface Declaration: [provides explicit HLC and RelayAct interface code]"
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 47-59:
   Declares `HLC` interface.
   and line 60-70:
   Declares `RelayAct` interface.
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. These are the normative typescript interfaces.
5. **Confidence:** Highly confident, exact code matches.

---

### Item 44: Line 2164
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 2164-2167:
   > "Formal Status: Working Draft for Reference Implementation & Multi-Agent Fuzzing (v0.12-draft)."
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 1:
   > "# relay-lite — Working Draft v0.12"
   and line 3:
   > "**Status:** Working draft. Not verified. Not adopted by this project."
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Content only. It defines the formal status of the meta-document and is carried in the headers.
5. **Confidence:** Highly confident, verified by headers.

---

### Item 45: Line 2218
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 2218-2238:
   > "[provides RelayAct and HLC interfaces with readonly prepended to all fields]"
2. **Draft Location & Answer:** `input/relay-lite-v0.12-draft.md` line 47-70:
   The `RelayAct` and `HLC` interfaces with `readonly` on all fields.
3. **Verdict:** `LANDED`
4. **Normative Force or Content:** Normative force. These are the normative typescript interfaces of the specification.
5. **Confidence:** Highly confident, exact match of `readonly` fields.

---

### Item 46: Line 2242
1. **Undertaking:** `input/thread-v0.1-and-16-rounds.txt` line 2242-2260:
   > "Archival Summary of the 14-Round Review Record: This review thread produced four hardened subsystems..."
2. **Draft Location & Answer:**
   > "nothing answers this"
3. **Verdict:** `NOT-LANDED`
4. **Normative Force or Content:** Content only. This archival summary summarizes the review process results in the thread but does not represent a change to the draft, and its text is completely absent from the draft specification and its addenda.
5. **Confidence:** Highly confident, verified by its absence in the specification documents.
