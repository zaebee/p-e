# Answer to CONTRACT.md

SHA256 verification: **Matched.** The output of `sha256sum A-spec.md B-store-interface.ts C-tool-descriptions.txt` is byte-for-byte identical to PIN.txt.

---

**Rule (\u00a73):** A clause addressed to a named role binds the entities that perform the actions described by that role. If the governing document does not define the role, there is no textual basis to determine what is bound; the binding is undefined.

---

## \u00a72 Answer

### 1. Who does the clause bind?
**The document does not define the term.** A-spec.md \u00a74:27\u201328 states:

> **[MUST NOT]** A consumer presents any linear projection as *the* causal history, or makes protocol assertions from a linearized sequence.

The word "consumer" appears only in this clause and in the very next sentence at A-spec.md \u00a74:29:

> A consumer needing a flat presentation deduplicates first, then sorts:

No prior definition, introduction, or scope statement for "consumer" exists in A-spec.md. Other role terms such as "producer" (A-spec.md:75), "publisher" (A-spec.md:93), "reader" (A-spec.md:23), "verifier" (A-spec.md:264), and "store" (A-spec.md:338) are also used without formal definition, but "store" is addressed by its own clause:

> **[MUST]** A store guarantees the invariant, by deriving the digest at load or by verifying it before committing the record. (A-spec.md:338\u2013339)

This indicates that roles are defined by their associated MUST/MUST NOT clauses. Since "consumer" appears only in one MUST NOT clause and has no defining clause of its own, **the term's scope is undefined in A-spec.md**.

### 2. Is such a backend one of those?
A backend satisfying B-store-interface.ts must implement:

> getAllRecords(limit?: number): Promise<RelayRecord[]> | RelayRecord[]; (B-store-interface.ts:155)
> getRecord(locator: string): Promise<RelayRecord | null> | RelayRecord | null; (B-store-interface.ts:158)

**B-store-interface.ts does not specify the order of returned records.** The interface provides no method whose contract claims that the returned order represents causal history. The description of the underlying storage as a "monotonic sequence log" appears in the server tool descriptions, not in B itself:

> Read all committed records from the **monotonic sequence log** with integrity check (PRESENT vs KNOWN_MISSING under SPEC MUST 6). (C-tool-descriptions.txt:15)

Since B does not require any particular ordering and does not require the backend to present records as history, **such a backend is not, by virtue of satisfying B, one of the entities described by the clause's subject.**

### 3. If the clause is violated, by whom, and at which line of which file?
**By nobody.** The backend that satisfies B-store-interface.ts provides only data access. It does not itself present any linear projection as *the* causal history, nor does it make protocol assertions from a linearized sequence. Presentation occurs at higher layers (e.g., the server tools in C-tool-descriptions.txt:15), which consume the backend's data. The backend's interface contains no presentation semantics.

---

## \u00a74 Two readings

The clause admits two readings.

| | Reading | Support | Decisive words |
|---|---|---|---|
| **1** | The clause prohibits presenting a linear order **as if it were the singular, definitive causal history**. Linear presentations for display are permitted provided they are constructed via the specified comparator. | Strong. A-spec.md \u00a74:29 explicitly permits flat presentations: *A consumer needing a flat presentation deduplicates first, then sorts: ProjectThread(E) = Sort(DeduplicateByID(E), Comparator)* (A-spec.md:129\u2013135). | \u201cas *the* causal history\u201d (A-spec.md:127). The definite article \u201cthe\u201d signals the prohibition targets the *claim* that a linear projection is the one true causal history. |
| **2** | The clause prohibits any use of linear projections in relation to causal history. | Weak. Self-contradicts A-spec.md \u00a74's own instructions for creating flat (linear) presentations. | None; this reading ignores the explicit permission in A-spec.md:129\u2013135. |

**Reading 1 is better supported.** The words \u201cas *the*\u201d (A-spec.md:127) decide between the readings.

---

## \u00a75 The parts of B that do not fit A

B-store-interface.ts models a **monotonic sequence** (linear), while A-spec.md models a **causal DAG** (partial order). The following members of B have no counterpart in A:

- `seq: number` in `Envelope` (B:40) \u2014 A's ordering is a DAG with topological depth, not a linear sequence (A:124).
- `store_id: string` in `Envelope` (B:41) \u2014 A contains no notion of store identifiers.
- `status: 'committed' | 'missing' | 'disputed' | string` in `Envelope` (B:51) \u2014 A treats records as immutable once published; it does not model status lifecycles (A:19).
- `header_block: EnvelopeHeaderBlock` (B:48) \u2014 A's `RelayAct` (A:60\u201370) contains no equivalent header block.
- `parent_locator?: string | null` (B:47) \u2014 A uses `parent_id` and `parent_digest` (A:63\u201364), not a locator string.
- `allocateSequence()` (B:149) \u2014 A has no sequence allocation; records are published with UUIDv7 ids (A:36).
- `sendToInbox(agent, message)` and `getInbox(agent)` (B:167\u2013170) \u2014 A delivers to per-recipient files under `.relay/in/` (A:27\u201330), not to named inboxes.
- `deletePayload(locator)` (B:161) \u2014 A forbids mutation: *A record, once published, is immutable* (A:19).
- `inboxes` in `RelayStoreStatus` (B:74\u201379) \u2014 A has no inbox abstraction.

---

## \u00a77 Confidence

| Part | Confidence | Rationale |
|---|---|---|
| 1 | Certain | A-spec.md contains no definition of \u201cconsumer\u201d; the term's scope is undefined. |
| 2 | Certain | B requires no order; the backend's methods do not present records as causal history. |
| 3 | Certain | The backend provides data access only; presentation and assertions occur at higher layers. |
