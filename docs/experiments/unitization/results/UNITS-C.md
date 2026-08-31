# UNITS.md

## Unit List

### Numbered MUSTs (10 units)
- **M1** [SPEC, MUST 1]: "Each authority binds `(authority_id, seq)` uniquely, monotonically, and never reuses a seq" (lines 151-156)
- **M2** [SPEC, MUST 2]: "An authority MUST declare the seq from which it claims G1, and MUST NOT claim G1 below it" (lines 170-172)
- **M3** [SPEC, MUST 3]: "Record content is identified by `sha256(bytes)`, stable across ids. Record identity and content identity are different things and neither derives from the other." (line 173-174)
- **M4** [SPEC, MUST 4]: "A conforming authority's ledger is non-rewindable: a bound `(authority, seq)` never changes its digest." (lines 175-177)
- **M5** [SPEC, MUST 5]: "`parent`, when present, is scoped to the same authority. Cross-authority references are **observations** and MUST be labelled as such." (lines 178-180)
- **M6** [SPEC, MUST 6]: "Visibility state is exposed honestly: `PRESENT` / `KNOWN_MISSING` / `UNKNOWN`. A quiet window MUST NOT be reported as a failure, and a failure MUST NOT be reported as absence." (lines 181-189)
- **M7** [SPEC, MUST 7]: "The absence of a witness is reported **as absence**, never as 'no evidence found'." (line 190)
- **M8** [SPEC, MUST 8]: "Every write that establishes a binding MUST be crash-atomic AND create-or-fail." (lines 191-201)
- **M9** [AMENDMENT, MUST 9]: "The digest domain: A store receives a candidate and composes metadata of its own about the receipt. Content identity is computed over the admitted candidate alone. The store's metadata is outside it, and the octets are digested exactly as they arrived." (lines 85-89, covering 9.1-9.4)
- **M10** [AMENDMENT, MUST 10]: "Recorded at binding: A store MUST record the content identity at the moment of binding, and MUST verify it against bound-content on every read..." (line 110, covering 10.1-10.5)

### MUST NOT Statements (8 units)
- **N1** [SPEC]: "MUST NOT claim a global total order across authorities without a consensus layer." (line 214)
- **N2** [SPEC]: "MUST NOT let witnessing masquerade as ordering. A witness records a cut, and two records inside one cut are never ordered by it." (lines 216-217)
- **N3** [SPEC]: "MUST NOT present a vantage-limited verdict — 'latest', 'unreferenced' — as a property of the record." (lines 218-219)
- **N4** [SPEC]: "MUST NOT make deposit depend on the parent being present and readable. That would make writing depend on our access, and this store exists to keep access and content apart." (lines 220-222)
- **N5** [SPEC]: "MUST NOT silently strengthen. Equivocation by a *non-conforming* authority is **detected, not prevented**; witnessing is partial, not total." (line 223)
- **N6** [SPEC]: "MUST NOT be read as attesting that a record says what its author meant. A content digest attests transmission and storage. It does not attest composition." (lines 225-227)
- **N7** [AMENDMENT]: "Record identity MUST NOT derive from content identity." (line 72)
- **N8** [AMENDMENT]: "a store's deduplication MUST NOT be switched off for them." (line 83)

### MAY Grants (6 units)
- **Y1** [SPEC]: "Content deduplication across ids." (line 205)
- **Y2** [SPEC]: "Witnessing and inclusion evidence — one or more witnesses, best-effort." (line 206)
- **Y3** [SPEC]: "Key rotation or multi-key authority. Operational, not protocol." (line 207)
- **Y4** [SPEC]: "A deterministic reading order across authorities (`authority_id` then `seq`). A convention, never a guarantee." (line 208)
- **Y5** [SPEC]: "Replication and availability of bytes." (line 210)
- **Y6** [AMENDMENT]: "bound-content MAY contain a declared id." (line 81)

### Definitions (12 units)
- **D1** [AMENDMENT, Definitions]: "**Candidate.** An octet sequence offered to a store as a record, together with its extent." (lines 25-27)
- **D2** [AMENDMENT, Definitions]: "**Record.** A candidate a store has admitted." (line 29)
- **D3** [AMENDMENT, Definitions]: "**Bound-content.** The octet sequence of a record: every octet of the candidate that was admitted, in order, and nothing else." (lines 31-33)
- **D4** [AMENDMENT, Definitions]: "**Content identity.** `sha256(bound-content)`. Nothing wider is meant by the term." (line 35)
- **D5** [AMENDMENT, Definitions]: "**Record identity.** The name under which a store holds a record. It is allocated by the store." (lines 37-38)
- **D6** [AMENDMENT, Definitions]: "**Blank line.** A line containing no octets. A line carrying whitespace is not blank." (line 40)
- **D7** [AMENDMENT, Definitions]: "**Field.** A header-block line of the form `name: value`, where `name` matches `[A-Za-z][A-Za-z0-9-]*` and is followed immediately by `:`. A line that is not a field is not one, wherever it appears." (lines 42-44)
- **D8** [AMENDMENT, Definitions]: "**Header block.** The octets of bound-content above its first blank line." (lines 46-49)
- **D9** [AMENDMENT, Definitions]: "**Declared id.** An `id` field appearing in a record's header block. It is bound-content, not identity." (lines 51-52)
- **D10** [AMENDMENT, Definitions]: "**Binding.** The association, completed at a single moment, of a record identity with a bound-content, its content identity, and its extent." (lines 54-55)
- **D11** [AMENDMENT, Definitions]: "**Read.** An operation that returns bound-content or any part of it. An operation that returns only a store's own metadata — a listing, an extent, a recorded digest — is not a read." (lines 57-59)
- **D12** [AMENDMENT, Definitions]: "**Refuse.** To decline, with an indication the offering party can distinguish from acceptance. Silence is not refusal." (lines 61-62)

### Conventions (8 units)
- **C1** [SPEC]: **K1** — artifact boundary: "what counts as *one artifact*. The receiving store writes the deposit header and `loadStore` splits it off again, so the boundary is ours and is not in the bytes." (line 75)
- **C2** [SPEC]: **K2** — byte extraction: "which bytes are digested. Every digest failure here was K2: OBS-055 four times, relay-0237 twice." (line 76)
- **C3** [SPEC]: **K3** — hash function: "SHA-256. Zero historical disagreement; named for completeness." (line 77)
- **C4** [SPEC]: **K4** — manifest format: "serialization of the hash list, declared range, schema, evaluator." (line 78)
- **C5** [SPEC]: **K5** — evaluator semantics: "deterministic execution. Untested here: two `bun` runs are byte-identical at 531 bytes... Unestablished, not broken." (line 79)
- **C6** [SPEC]: **K6** — spec version: "names K1–K5 together so an amendment cannot silently reinterpret an old root." (line 80)
- **C7** [SPEC]: **citation** — "A citation references one record and MUST be a (locator, digest) pair... Cross-store citation is normative... the citation MUST be (store identity, locator, content digest)..." (lines 288-300)
- **C8** [SPEC]: **envelope** — "The store-assigned id is the authoritative record identity... The envelope `id:` inside the digested bytes is the only identity a chain can pin... when present, MUST be checked against the store-assigned id..." (lines 314-327)

### Named Failures (7 units)
- **F1** [SPEC]: **partition** — "total order unavailable; binding unaffected; merge is union" (line 333)
- **F2** [SPEC]: **crash before commit** — "the ledger MUST be written **before** the record, or an id is handed out twice. The one place the order of two local operations is load-bearing" (line 334)
- **F3** [SPEC]: **crash after write, before witness** — "durability holds, witnessing is merely absent. A durable record MAY be unwitnessed" (line 335)
- **F4** [SPEC]: **delete** — "the id stays bound. Deletion removes the record but **never** the allocation marker (v1 / future authority); the marker is the ledger entry that persists, so the id cannot be rebound." (line 336)
- **F5** [SPEC]: **duplicate content** — "two ids, one digest. Correct, and needs no resolution" (line 337)
- **F6** [SPEC]: **concurrent append** — "no conflict under `(authority, seq)`. Under a global counter it needs consensus" (line 338)
- **F7** [SPEC]: **equivocation** — "prevented in a conforming authority, detected in a non-conforming one, never prevented in the latter" (line 339)

### Migration Requirements (2 units)
- **MG1** [SPEC]: "Three components assume a single global tail: `src/relay/reference.ts:94`, `nextFree()`, `check-continuity`'s six states. These must be made authority-aware while exactly one authority exists." (lines 343-349)
- **MG2** [SPEC]: "This change has a window that is open only while exactly one authority exists, and that window does not reopen." (lines 358-359)

---

## Counts

| Section | Count |
|---------|-------|
| Numbered MUSTs | 10 |
| MUST NOT statements | 8 |
| MAY grants | 6 |
| Definitions | 12 |
| Conventions | 8 |
| Named Failures | 7 |
| Migration Requirements | 2 |
| **Total** | **53** |

---

## Judgement Calls (where the rule did not determine the cut)

### JC-1: Convention Count (C1-C8)
**Decision:** Treated K1-K6 as 6 separate conventions (C1-C6) plus citation (C7) and envelope (C8), totaling 8 conventions.
**Rule Text:** Rule 2(d) states "each convention (K1-K6, citation, envelope) is one row."
**Alternative Rejected:** K1-K6 as one grouped convention with citation and envelope (3 total: C1-C3). The explicit listing of K1-K6 as separate table rows in SPEC.md (lines 73-81) supports treating each as distinct. The rule's parentheses appear to list categories, but the document structure presents them individually.

### JC-2: MUST NOT Count from AMENDMENT.md (N7-N8)
**Decision:** Included N7 and N8 from AMENDMENT.md's unnumbered normative text.
- N7: "Record identity MUST NOT derive from content identity" (line 72) — amendment to MUST 3
- N8: "a store's deduplication MUST NOT be switched off for them" (line 83) — consequence of digest domain
**Alternative Rejected:** Count only the 6 MUST NOT statements from SPEC.md's dedicated MUST NOT section (lines 212-228). The rule says "each MUST NOT statement is one row" (Rule 2(a)) without restricting to a specific section, so all uppercase MUST NOT statements across both documents are counted.

### JC-3: MAY Count from AMENDMENT.md (Y6)
**Decision:** Included Y6: "bound-content MAY contain a declared id" (AMENDMENT.md line 81).
**Alternative Rejected:** Count only the 5 MAY grants from SPEC.md's MAY section. The rule does not limit MAY counting to a specific section, and this is an explicit MAY grant in normative text.

### JC-4: Numbered MUSTs with Sub-clauses (M9-M10)
**Decision:** Treated MUST 9 and MUST 10 as single units each, with their sub-clauses (9.1-9.4, 10.1-10.5) as compound parts carrying sub-verdicts that roll up.
**Rule Text:** Rule 1 states "Numbered MUSTs: one row per numbered MUST. Compound parts carry sub-verdicts that roll up into the parent's verdict."
**Alternative Rejected:** Split each sub-clause into separate units (e.g., M9.1, M9.2, etc.). The rule explicitly prioritizes one row per numbered MUST, with compound parts rolling up, so sub-clauses are not separate units.

### JC-5: MUST Statements Within Conventions (C7-C8)
**Decision:** Did NOT create separate units for MUST statements found within the citation (C7) and envelope (C8) convention sections. The MUST statements in these sections are part of the convention's normative content.
**Rule Text:** Rule 2(d) says "each convention... is one row", and Rule 2 has priority over Rule 3's splitting rules for unnumbered normative text.
**Alternative Rejected:** Extract the MUST statements from citation and envelope as separate unnumbered MUST units (e.g., M11: "A citation... MUST be a (locator, digest) pair"). The convention takes precedence as a unit boundary per Rule 2(d).

---

**Total unit count: 53. Number of judgement calls: 5.**