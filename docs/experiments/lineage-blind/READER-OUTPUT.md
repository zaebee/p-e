# Spec-Compare Analysis Result

**SHA256 verification:** The hashes **matched** exactly with PIN.txt.

---

## §2 Rule

Normative content is any statement that imposes requirements, constraints, or behavioral obligations on implementations. This includes: explicit normative keywords (`MUST`, `MUST NOT`, `SHOULD`, `MAY`, `REQUIRED`, `OPTIONAL`), structural definitions (interfaces, types, field schemas), algorithmic specifications, invariant declarations, and mandatory procedural steps. Non-normative content includes rationale, examples, and provenance notes.

---

## §3 Lists by Line Number

### Present in A, absent from B

| Line | Kind | Content | Confidence |
|------|------|---------|------------|
| 13 | Invariant | **"Монотонность и сохранение свидетельств (Refuge Model):** История строго аддитивна. Ошибочные сообщения не удаляются и не перезаписываются; они аннулируются выпуском новых сообщений-исправлений (`erratum`)." | Certain |
| 14 | Invariant | **"Каузальный порядок (Causal Graph):** Порядок сообщений определяется графом зависимостей (`parent_digest`) и логическим счетчиком, а не абсолютными системными часами." | Certain |
| 15 | Invariant | **"Разделение 4 эпистемических актов:** Свидетельство (`Witnessing`), Проверка (`Examination`), Критерий (`Criterion`) и Вердикт (`Ruling`) разделены и не схлопываются в один шаг." | Certain |
| 24-31 | Directory structure | `.relay/active/` (сообщения в обработке) and `.relay/out/` (готовые ответы перед маршрутизацией) directories | Certain |
| 26 | Directory semantics | `in/` — входящие сообщения (доступны для захвата воркерами) | Certain |
| 27 | Directory semantics | `active/` — сообщения в обработке (атомарно захвачены конкретным агентом) | Certain |
| 28 | Directory semantics | `out/` — готовые ответы перед маршрутизацией | Certain |
| 29 | Directory semantics | `errata/` — зафиксированные ошибки, споры и рекламации | Certain |
| 30-31 | Directory structure | `history/` with `YYYY-MM/` subdirectories as append-only архив | Certain |
| 41 | Field definition | `to` [REQUIRED]: Идентификатор получателя (`claude`, `chatgpt`, `gemini`, `all`) | Certain |
| 42 | Field definition | `from` [REQUIRED]: Идентификатор отправителя | Certain |
| 43 | Field definition | `thread` [REQUIRED]: Идентификатор контекстной ветки / задачи | Certain |
| 44 | Field definition | `ttl` [OPTIONAL]: Время жизни сообщения в секундах (default: `3600`) | Certain |
| 45 | Field definition | `id` [REQUIRED]: Уникальный UUIDv7 | Certain |
| 57-79 | Interface | `RelayEnvelope<T>` interface with nested `hlc` object structure | Certain |
| 61 | Permitted values | `type: "message" \| "claim" \| "challenge" \| "ruling" \| "erratum"` | Certain |
| 64 | Field constraint | `from: string` with examples `"agent:claude-code" \| "agent:chatgpt" \| "human"` | Certain |
| 65 | Field constraint | `to: string` with examples `"agent:gemini" \| "all"` | Certain |
| 68-72 | Structure | `hlc` object with `wall_time` (ISO-8601 UTC), `logical_seq`, `parent_digest` (sha256) | Certain |
| 78 | Field definition | `signature?: string` — Подпись автора (опционально) | Certain |
| 86-89 | Procedure | **Publish:** write to `.relay/tmp/<id>.tmp`, `flush/fsync`, atomic `rename` to `.relay/in/<cns-filename>.json` | Certain |
| 91-94 | Procedure | **Claim-or-Fail:** scan `.relay/in/` by `to=<my_agent_id>`, atomic move to `.relay/active/<agent_id>_<file>`, fail silently on rename failure | Certain |
| 96-98 | Procedure | **Settle:** move to `.relay/history/YYYY-MM/<id>.json`, publish response as new message in `in/` | Certain |
| 100-101 | Procedure | **TTL GC:** move expired files from `.relay/in/` to `.relay/errata/` with `EXPIRED` marker | Certain |
| 107-112 | Invariant | 4-Act Adjudication chain: `[ CLAIM ] -> [ CHALLENGE ] -> [ CRITERION-CHECK ] -> [ RULING ]` | Certain |
| 114-115 | Message type | `type: "claim"` with payload `{ proposal: "...", target_digest: "sha256..." }` | Certain |
| 116-117 | Message type | `type: "challenge"` with payload `{ finding: "PASS" \| "VIOLATES" \| "UNDECIDABLE", counter_evidence: [...] }` | Certain |
| 118-119 | Message type | `type: "ruling"` with payload `{ status: "ACCEPTED" \| "REJECTED", ruled_by: "consensus-v1" }` | Certain |
| 125-137 | Error model | **Refuge/Erratum Model:** No DELETE/UPDATE in `.relay/history/`, erratum messages with `target_id`, `target_digest`, `reason`, `superseded_by`; clients must build Materialized State accounting for Errata chain | Certain |
| 144 | Conformance | **[MUST]** All incoming filenames must conform to section 2.2 schema | Certain |
| 145 | Conformance | **[MUST]** Message recording must be atomic (via `tmp/` + `rename`) | Certain |
| 146 | Conformance | **[MUST]** `hlc.parent_digest` must point to hash of valid predecessor in thread | Certain |
| 147 | Conformance | **[MUST NOT]** Deleting historical records to conceal failures | Certain |
| 148 | Conformance | **[SHOULD]** Workers should check `ttl` before expensive processing | Low (may be implicit elsewhere) |
| 149 | Conformance | **[MAY]** Relay may translate filesystem events to WebSocket/SSE for browser agents | Low (may be implicit elsewhere) |

---

### Present in B, absent from A

| Line | Kind | Content | Confidence |
|------|------|---------|------------|
| 19 | Invariant | "A record, once published, is immutable. Corrections are new records, never edits." | Certain |
| 20 | Invariant | "Order comes from the citation graph, not from absolute system clocks." | Certain |
| 21-22 | Invariant | "The causal graph is a **partial order**. Concurrent replies fork; there is no single true linearisation." | Certain |
| 23 | Invariant | "A reader's inability to see a record is not a defect in that record." | Certain |
| 28 | Directory | `.relay/tmp/` — ephemeral temp files, randomized names | Certain |
| 29 | Directory | `.relay/in/` — published delivery files | Certain |
| 30 | Directory | `.relay/errata/` — expired records | Certain |
| 39-40 | Constraint | `to=<agent>` names **one** delivery leg; message to N agents produces N delivery files with identical bytes | Certain |
| 42-44 | Conformance | **[MUST]** `CNS.to` is an element of `act.to[]`, or `to[] == ["all"]`; non-conformant delivery leg is rejected by receiver | Certain |
| 46 | Conformance | **[MUST]** `CNS.id == act.id` | Certain |
| 53-71 | Interface | `RelayAct<T>` and `HLC` interfaces with separate `l` (ms UTC), `c` (logical counter), `node_id` fields | Certain |
| 55-58 | Structure | `HLC` interface: `readonly l: number`, `readonly c: number`, `readonly node_id: string` | Certain |
| 60-70 | Interface | `RelayAct<T>` with `parent_id: string \| null`, `parent_digest: string \| null`, `to: readonly string[]`, `hlc: HLC`, `payload: T` | Certain |
| 63 | Field | `parent_id: string \| null` — predecessor locator | Certain |
| 64 | Field | `parent_digest: string \| null` — SHA-256 of parent's wire octets | Certain |
| 67 | Field | `to: readonly string[]` — invariant attested audience list | Certain |
| 75-77 | Serialization | **[MUST]** Producers mint canonical wire bytes per **RFC 8785 (JCS)** encoded as raw UTF-8 | Certain |
| 79-81 | Conformance | **[MUST]** Acts conform to **I-JSON (RFC 7493)**: no duplicate keys; integers in `[-(2^53-1), 2^53-1]`; valid UTF-8 | Certain |
| 88-94 | Procedure | **[MUST]** Act sealed at creation; **[MUST NOT]** re-tick HLC or re-mint timestamps on retry; retries transmit identical sealed byte buffer | Certain |
| 99-117 | Algorithm | **Hybrid Logical Clock** emission (lines 101-107) and ingest (lines 109-117) algorithms | Certain |
| 101-107 | Algorithm | HLC emission: `l' = max(physical_now_ms, last_l); c' = last_c + 1 if l' == last_l else 0` | Certain |
| 109-117 | Algorithm | HLC ingest: multi-case logic for `l'` and `c'` based on `physical_now_ms`, `last_l`, `last_c`, `M.hlc.l`, `M.hlc.c` | Certain |
| 124-127 | Ordering | **[MUST]** Protocol treats graph as DAG — partial order; **[MUST NOT]** present any linear projection as *the* causal history | Certain |
| 129-135 | Algorithm | Deduplication then sort: `ProjectThread(E) = Sort(DeduplicateByID(E), Comparator)` with `Comparator: TopologicalDepth -> HLC (l, c, node_id) -> id` | Certain |
| 141-222 | Procedure | **Publishing** algorithm with `link` (not `rename`), randomized temp names, directory `fsync`, explicit collision handling | Certain |
| 148-152 | Type | `PublishResult` type: `PUBLISHED`, `ALREADY_PUBLISHED`, `COLLISION_REFUSED`, `RETRY_EXHAUSTED` | Certain |
| 154-221 | Code | Full `publishMessage` function implementation in TypeScript | Certain |
| 186 | Procedure | Use `link`, not `rename` — prevents silent overwrite | Certain |
| 188-205 | Procedure | `EEXIST` handling: read existing file, compare SHA-256 digests, return `ALREADY_PUBLISHED` if match, `COLLISION_REFUSED` if differ | Certain |
| 210-212 | Procedure | Directory `fsync` after successful link | Certain |
| 224-244 | Rationale | Detailed justification for each element of publishing algorithm | Non-normative |
| 245 | Procedure | **GC:** sweeper reaps `.relay/tmp/` entries older than 10 minutes; moves `.relay/in/` entries past TTL to `.relay/errata/` | Certain |
| 250-252 | Constraint | `ruled_by` records **attribution of epistemic responsibility**, not delegated mandate; names who made judgment call | Certain |
| 258-272 | Procedure | **Three-stage verification pipeline:** Stage 1 (wire-octet hashing), Stage 2 (structural + I-JSON conformance), Stage 3 (causal link evaluation); ordering is normative | Certain |
| 261-262 | Procedure | Stage 1: `act_digest = SHA-256(raw_received_bytes)`; no parsing, no normalization | Certain |
| 264-266 | Conformance | **[MUST NOT]** Verifier parses, normalizes, or re-serializes bytes when computing digest or verifying `parent_digest` | Certain |
| 268-270 | Procedure | Stage 2: parse; reject on duplicate keys, numbers outside safe range, `CNS.id != act.id`, `CNS.to ∉ act.to[]`, unanchored citation (`parent_id == null && parent_digest != null`) | Certain |
| 272 | Procedure | Stage 3: causal link evaluation — total and pure | Certain |
| 276-285 | Constraint | **[MUST]** Citation carries both handles — `parent_id` and `parent_digest`; six-state partition table | Certain |
| 277-285 | Table | CausalStatus states: `NO_PARENT`, `UNANCHORED`, `LABEL_ONLY`, `MATCHES`, `DIVERGES`, `UNCHECKABLE` with meanings | Certain |
| 287-294 | Rationale | Explanation of why digest alone is insufficient without locator | Non-normative |
| 291-294 | Rationale | `UNCHECKABLE` is normal due to single-leg delivery; verifier must not reject on unheld parent | Non-normative |
| 296-300 | Type | `CausalStatus` type definition with six states | Certain |
| 301-318 | Code | `evaluateCausalLink` function implementation | Certain |
| 321-323 | Constraint | Evaluation is **total** — every input returns a state, none throws; Stage 2 rejects `UNANCHORED` at ingest | Certain |
| 325-327 | Rationale | Explanation of branching order in `evaluateCausalLink` | Non-normative |
| 329-343 | Structure/Constraint | `StoredRecord` interface with `octets: Buffer`, `digest: string`; **[MUST]** store guarantees invariant `digest === SHA-256(octets)`; **[MUST]** detected discrepancy raises `STORE_CORRUPTION`; **[MUST NOT]** surface as `DIVERGES` | Certain |
| 338-343 | Conformance | **[MUST]** Store verifies digest at load or before commit; **[MUST]** raise `STORE_CORRUPTION` on discrepancy; **[MUST NOT]** let staleness become author defect | Certain |

---

## §4 Changed Rather Than Removed

| Aspect | In A | In B | Change Type | Confidence |
|--------|------|------|-------------|------------|
| Language | Russian | English | Structural | Certain |
| Normative keywords | `[MUST]`, `[MUST NOT]`, `[SHOULD]`, `[MAY]`, `[REQUIRED]`, `[OPTIONAL]` | `** [MUST]**`, `** [MUST NOT]**` | Syntax | Certain |
| Root interface | `RelayEnvelope<T>` | `RelayAct<T>` | Renamed | Certain |
| `to` field type | `string` (e.g., `"agent:gemini"` or `"all"`) | `readonly string[]` (invariant audience list) | **Changed** | Certain |
| `from` field type | `string` (e.g., `"agent:claude-code" \| "agent:chatgpt" \| "human"`) | `string` (author identity) | **Modified semantics** | Certain |
| `type` field | Same permitted values | Same permitted values | Unchanged | Certain |
| `hlc` structure | Nested object with `wall_time: string` (ISO-8601), `logical_seq: number`, `parent_digest: string \| null` | Separate `HLC` interface with `l: number` (ms UTC), `c: number`, `node_id: string`; plus `parent_digest: string \| null` at act level | **Restructured** | Certain |
| Time representation | `wall_time: string` (ISO-8601 UTC) | `l: number` (physical/wall timestamp in **milliseconds** UTC) | **Changed unit and type** | Certain |
| Logical clock | `logical_seq: number` | `c: number` with explicit emission/ingest algorithms | **Algorithm added** | Certain |
| `parent` reference | `parent_digest: string \| null` (sha256 of parent body) | `parent_id: string \| null` **and** `parent_digest: string \| null` | **Added `parent_id`** | Certain |
| Publishing atomicity | `tmp/` + `rename` | `tmp/` + `link` (not `rename`) | **Changed mechanism** | Certain |
| Temp file naming | `<id>.tmp` (deterministic) | Randomized names (e.g., `.dep-${process.pid}-${Date.now()}-${random}`) | **Changed strategy** | Certain |
| Collision handling | Not specified | Explicit `EEXIST` handling with digest comparison; returns `ALREADY_PUBLISHED` or `COLLISION_REFUSED` | **Added** | Certain |
| Directory sync | Not specified | Explicit directory `fsync` after link | **Added** | Certain |
| GC timing | Move expired from `in/` to `errata/` with `EXPIRED` | Sweeper reaps `.relay/tmp/` >10min; moves `.relay/in/` past TTL to `.relay/errata/` | **Precise timing added** | Certain |
| Verification approach | Conformance checklist | **Three-stage pipeline** (wire-octet -> structural -> causal) | **Added structure** | Certain |
| Digest computation | Not specified | **[MUST NOT]** parse, normalize, or re-serialize when computing digest | **Added constraint** | Certain |
| Canonical serialization | Not specified | **[MUST]** RFC 8785 (JCS) canonical wire bytes; **[MUST]** I-JSON (RFC 7493) compliant | **Added** | Certain |
| Seal requirement | Not specified | **[MUST]** Act sealed at creation; **[MUST NOT]** re-tick HLC on retry | **Added** | Certain |
| Citation model | Only `parent_digest` | Both `parent_id` and `parent_digest` with six-state evaluation | **Expanded** | Certain |
| Store integrity | Not specified | `StoredRecord` with invariant; **[MUST]** verify digest; **[MUST]** raise `STORE_CORRUPTION` | **Added** | Certain |
| 4-Act chain | Described as flow | Not explicitly referenced (but types are same) | **Removed description** | Certain |
| Errata model | Explicit: no DELETE/UPDATE in history; erratum message structure with `target_id`, `target_digest`, `reason`, `superseded_by`; clients must build Materialized State | Not specified (only GC to errata/) | **Removed/Replaced** | Certain |
| Conformance items | Atomic recording; filename schema; parent_digest validity; no historical deletion | Structural/I-JSON conformance; CNS.id == act.id; CNS.to ∈ act.to[]; unanchored citation rejection | **Expanded and changed** | Certain |

---

## §5 Borderline Cases

### Case 1: Directory Structure Semantics
- **A:** `.relay/out/` (готовые ответы перед маршрутизацией) — explicit directory with semantics
- **B:** No `.relay/out/` mentioned; only `.relay/tmp/`, `.relay/in/`, `.relay/errata/`
- **Decision:** `out/` directory **absent in B**
- **Confidence:** Certain
- **Reason:** B's §2 lists only three directories; no reference to `out/`

### Case 2: TTL Default Value
- **A:** Line 44: `ttl` [OPTIONAL] with default: `3600`
- **B:** No explicit default for TTL
- **Decision:** Default value **absent in B**
- **Confidence:** High
- **Reason:** B does not specify a default; TTL is used in GC but no default is stated

### Case 3: Signature Field
- **A:** Line 78: `signature?: string` — optional
- **B:** No signature field
- **Decision:** Signature field **absent in B**
- **Confidence:** Certain
- **Reason:** `RelayAct` interface in B has no signature field

### Case 4: 4-Act Adjudication Types
- **A:** Lines 114-119: Explicit payload structures for `claim`, `challenge`, `ruling`
- **B:** Same `type` values exist (line 65), but no payload structure specified
- **Decision:** Payload structures **absent in B**
- **Confidence:** Certain
- **Reason:** B defines the types but not their payload schemas

### Case 5: SHOULD and MAY items
- **A:** Lines 148-149: `[SHOULD]` check TTL; `[MAY]` translate to WebSocket/SSE
- **B:** No equivalent SHOULD/MAY statements
- **Decision:** These normative items **absent in B**
- **Confidence:** Medium
- **Reason:** B may imply these but does not state them explicitly as normative

### Case 6: Provenance and Standing Section
- **A:** None
- **B:** Lines 347-384: Extensive provenance, what was imported, withdrawn, not decided
- **Decision:** Provenance **absent in A**, **present in B**
- **Confidence:** Certain
- **Reason:** Clear presence in B, absence in A

### Case 7: HLC Emission/Ingest Algorithms
- **A:** No HLC algorithm specified
- **B:** Lines 101-117: Explicit mathematical algorithms
- **Decision:** Algorithms **absent in A**, **present in B**
- **Confidence:** Certain

### Case 8: Normative Language Style
- **A:** Uses `[MUST]`, `[MUST NOT]`, etc. in checklist form
- **B:** Uses `**[MUST]**`, `**[MUST NOT]**` inline in prose
- **Decision:** Different syntax for same concepts — **not a normative change**, but a presentational one
- **Confidence:** Certain
- **Reason:** Both express normative requirements; style differs

---

## Summary

- **SHA256 match:** Verified
- **A has ~30 normative items absent from B** (Russian invariants, directory structure, envelope interface, procedures, errata model, conformance checklist)
- **B has ~45 normative items absent from A** (invariants, interfaces, HLC, algorithms, publishing code, verification pipeline, citation model, store integrity)
- **~20 items are changed** rather than removed (language, interface names, field types, mechanisms, added algorithms and constraints)
- **8 borderline cases** identified and resolved with reasoning
- **Confidence:** Certain for most items; medium/low only for SHOULD/MAY items where implicit presence in B cannot be ruled out definitively

The documents represent **different protocols** (as B explicitly states: "a different protocol from the one this repository runs"), despite sharing some conceptual DNA. B is significantly more detailed, with explicit algorithms, code examples, and a rigorous verification pipeline that A lacks.