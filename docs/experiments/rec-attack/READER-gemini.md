# PIN Verification Report

The expected input tree SHA256 checksum in `PIN.txt` is:
`a998df279c10ac82dac8dc2bbc6867d4ba310a718b6528e140edda7bc36b2d1a`

The SHA256 checksum of the `input/` directory tree was computed using the command specified in `dispatch/DISPATCH.md` (line 25) and `dispatch/GROK.md` (line 36):
`find input -type f | sort | xargs sha256sum | sha256sum`

Result:
`a998df279c10ac82dac8dc2bbc6867d4ba310a718b6528e140edda7bc36b2d1a  -`

**Verdict:** The input pin MATCHES the computed checksum exactly.

---

# Evaluation of Recommendations

This report evaluates each of the eight recommendations made in `input/RECOMMENDATIONS.md` against the rules defined in `CONTRACT.md` §3.

---

## Recommendation 1

### 1. Quoted Recommendation
> `Вернуть append-only history/; устранить двусмысленность errata/: для истёкших доставок использовать expired/, а erratum сделать обычной записью истории. Запретить unlink и overwrite опубликованных исторических записей.`

### 2. Verdict
FAILS.

### 3. Broken Rule from `CONTRACT.md` §3
> `4. It has a cost the note does not name.`

### 4. Ground Sourcing & Line Numbers
- `input/relay-lite-v0.12-draft.md`, lines 24–27: Filesystem layout defines only `.relay/tmp/`, `.relay/in/`, and `.relay/errata/`.
- `input/relay-lite-v0.12-draft.md`, line 219: Garbage collection (GC) sweeper moves `.relay/in/` entries past their TTL to `.relay/errata/`.
- `input/relay-lite-deletion-log.md`, row 5: `.relay/history/YYYY-MM/` is marked `ABSENT` (v0.1 line 30, nothing in v0.12).
- `input/relay-lite-deletion-log.md`, row 18: "the Settle stage — move to `history/YYYY-MM/`" is marked `ABSENT` (v0.1 line 96, nothing in v0.12).

### 5. Analysis & Inference
By our own inference, returning `history/` as an append-only archive carries a significant, unacknowledged architectural and pipeline-redesign cost. In `relay-lite-v0.12-draft.md`, the "Settle" stage which originally transferred records into `history/` was completely removed (as documented in `input/relay-lite-deletion-log.md` row 18). Without restoring the Settle stage or specifying a replacement, `history/` remains empty and serves no functional purpose.

By our own inference, if we write directly to `history/` to bypass this, we render the temporary delivery, garbage collection, and TTL sweep mechanisms in `.relay/in/` entirely useless, which contradicts `input/relay-lite-v0.12-addendum-ttl.md`. The recommendation fails to name the cost of redesigning or restoring the settlement pipeline needed to get files into `history/`.

### 6. Confidence Statement
I am 100% confident that restoring `history/` without restoring or defining the settlement pipeline introduces a critical architectural gap with unnamed pipeline costs.

---

## Recommendation 2

### 1. Quoted Recommendation
> `Дать erratum обязательную ссылку на исправляемую запись: target_id + target_digest, и reason. Явно не возвращать superseded_by: последующий erratum ссылается назад на предшественника, и читатель выводит цепочку по этим ссылкам. Читатель обязан уметь показать отношение исправления; один обязательный materialized state не нужен.`

### 2. Verdict
FAILS.

### 3. Broken Rule from `CONTRACT.md` §3
> `4. It has a cost the note does not name.`

### 4. Ground Sourcing & Line Numbers
- `input/relay-lite-v0.12-draft.md`, lines 72–82: The `RelayAct` interface defines envelope fields, which exclude `target_id` and `target_digest`.
- `input/relay-lite-v0.12-draft.md`, lines 24–27: Filesystem directories exclude any dedicated index or database for querying.

### 5. Analysis & Inference
By our own inference, relying entirely on backward references (`target_id` + `target_digest`) in immutable records while refusing to provide a forward pointer (`superseded_by`) imposes a massive, unnamed query and indexing cost on readers. Because records are immutable, a reader cannot query a record itself to see if it has been corrected; they must search the entire filesystem history or build and maintain a complex secondary index mapping original message IDs to their errata.

By our own inference, if these fields are placed inside the message `payload` to avoid bloating the general `RelayAct` envelope, the transport layer cannot index them without parsing payload contents, breaking transport/payload separation. The note also asserts `"Читатель обязан уметь показать отношение исправления"` (The reader is required to be able to show the correction relationship), introducing reader presentation policy-creep into what is otherwise designed to be a minimal transport protocol. These performance and complexity costs are completely unnamed.

### 6. Confidence Statement
I am 100% confident that relying solely on backward links in immutable records introduces significant unacknowledged query and index-maintenance costs for readers.

---

## Recommendation 3

### 1. Quoted Recommendation
> `Нормировать свойство: публикация MUST быть crash-atomic и create-or-fail. link, временный файл и fsync оставить описанной POSIX-реализацией, а не единственным механизмом.`

### 2. Verdict
FAILS.

### 3. Broken Rules from `CONTRACT.md` §3
> `1. It contradicts the specification or an addendum.`
> `4. It has a cost the note does not name.`

### 4. Ground Sourcing & Line Numbers
- `input/relay-lite-v0.12-addendum-identifiers.md`, line 152: `relay-lite requires a POSIX filesystem. §4.1 already mandates link with EEXIST semantics, O_EXCL for the temporary file, and a directory fsync, and every implementation that exists runs on POSIX.`

### 5. Analysis & Inference
The recommendation to demote the POSIX primitives (`link`, temp file, and `fsync`) to a non-mandatory, merely "described" reference implementation directly contradicts Section 6 of the Identifier Addendum (line 152), which explicitly states that relay-lite *requires* a POSIX filesystem and *mandates* these specific primitives as core requirements to guarantee safety under concurrent writes.

By our own inference, this change also carries an unnamed verification cost: abstract properties like "crash-atomic" and "create-or-fail" are extremely difficult to test or verify in automated conformance suites, whereas verifying the use of specific POSIX system calls (`link` with `EEXIST` and directory `fsync`) is static, deterministic, and easily verifiable.

### 6. Confidence Statement
I am 100% confident that this recommendation directly contradicts the platform requirement established in the Identifier Addendum and introduces unstated verification costs.

---

## Recommendation 4

### 1. Quoted Recommendation
> `Включить проверку имени в Stage 2: имя доставки MUST соответствовать грамматике §2.1 и алфавиту addendum.`

### 2. Verdict
FAILS.

### 3. Broken Rule from `CONTRACT.md` §3
> `4. It has a cost the note does not name.`

### 4. Ground Sourcing & Line Numbers
- `input/relay-lite-v0.12-draft.md`, lines 219–220: The GC sweeper depends on parsing filenames to extract the UUIDv7 timestamp and TTL.
- `input/relay-lite-v0.12-draft.md`, lines 259–261: Stage 2 of the pipeline is defined for structural and I-JSON conformance checks.

### 5. Analysis & Inference
By our own inference, checking filename conformance in Stage 2 (which runs *after* a file has been written to `.relay/in/`) introduces a severe, unnamed directory-clogging and denial-of-service vulnerability. If a client writes a file with a malformed name, Stage 2 will reject it during processing. However, because the name is malformed, the GC sweeper (which depends on parsing the filename to find the UUIDv7 timestamp and TTL) will be unable to parse it and determine its expiration.

By our own inference, these rejected files will remain in `.relay/in/` indefinitely as un-sweepable garbage. Preventing this requires either immediate ingest-time filename validation or an explicit quarantine/deletion mechanism for Stage 2 rejections, both of which are significant architectural and implementation costs the note does not name.

### 6. Confidence Statement
I am 100% confident that verifying filename conformance in Stage 2 without an ingest-time guard or quarantine mechanism exposes the inbox to a directory-clogging vulnerability.

---

## Recommendation 5

### 1. Quoted Recommendation
> `Вернуть MUST NOT: well-formed act нельзя отвергать или отбрасывать только из-за UNCHECKABLE.`

### 2. Verdict
SURVIVES.

### 3. What Must Still Be True for It to Be Right
The project must commit to a decentralized, federated transport model where partial visibility of the causal graph is accepted as normal, and must explicitly codify verifier compliance rules to ensure that nodes do not reject well-formed acts simply because they do not hold their causal ancestors.

### 4. Ground Sourcing & Line Numbers
- `input/relay-lite-v0.12-draft.md`, lines 294–295: `Partial visibility is the normal case, and a verifier that rejects on an unheld parent rejects correct acts routinely.`
- `input/relay-lite-v0.13-decisions.md`, line 49: Section 2 (`#63`) discusses the restoration of the `UNCHECKABLE` prohibition.

### 5. Analysis & Inference
By our own inference, this recommendation is correct because it aligns perfectly with the core transport model of partial visibility and prevents naive or greedy verifier implementations from rejecting legitimate, well-formed messages simply due to network or routing delays.

### 6. Confidence Statement
I am 100% confident that this recommendation is logically supported, does not contradict any specifications, and is necessary to protect the transport model of partial visibility.

---

## Recommendation 6

### 1. Quoted Recommendation
> `Перенести разделение Witnessing / Examination / Criterion / Ruling в методологию, не в транспорт.`

### 2. Verdict
SURVIVES.

### 3. What Must Still Be True for It to Be Right
The project must document these four epistemic acts in a separate, non-transport methodology or adjudication guideline document, so that developers and users have a shared procedure for verification and independent reviews without complicating or bloat-testing the core message transport.

### 4. Ground Sourcing & Line Numbers
- `input/relay-lite-v0.12-draft.md`, lines 14–16: Core invariants do not contain these terms.
- `input/relay-lite-v0.13-decisions.md`, lines 132–140: Section 7 (`#106`) discusses the four epistemic acts.

### 5. Analysis & Inference
By our own inference, separating the four epistemic acts from the transport specification is the correct architectural decision because the transport layer cannot guarantee observer independence, which is a methodology-level concern. Keeping the core transport specification silent on these terms maintains a proper separation of concerns.

### 6. Confidence Statement
I am 100% confident that separating the four epistemic acts from the transport specification is correct and maintains a lean core transport model.

---

## Recommendation 7

### 1. Quoted Recommendation
> `Сократить core type до определённых семантик: message и исправленного erratum; одновременно удалить нынешний §5 из core и перенести его единственное содержательное утверждение — «a ruling is not a reading» — в методологию. claim / challenge / ruling вернуть позднее лишь отдельным adjudication-профилем с payload-схемами.`

### 2. Verdict
SURVIVES.

### 3. What Must Still Be True for It to Be Right
The project must be willing to deprecate or delay the formalization of the `claim`, `challenge`, and `ruling` types (ensuring that there are no active, production-critical deployments of relay-lite depending on their current uninterpreted enum state) and commit to defining them later under a separate adjudication profile.

### 4. Ground Sourcing & Line Numbers
- `input/relay-lite-v0.12-draft.md`, lines 72–82: The `RelayAct` interface defines types but does not contain a `ruled_by` field.
- `input/relay-lite-v0.12-draft.md`, lines 246–250: §5 references `ruled_by` as if it were a field (`"ruled_by records attribution..."`).
- `input/relay-lite-v0.13-decisions.md`, lines 142–156: Section 8 (`#107`) discusses §5's adjudication protocol.

### 5. Analysis & Inference
The recommendation's claim is 100% correct. Section 5 of the draft references a field named `ruled_by` (line 246: `ruled_by records attribution of epistemic responsibility...`), yet no such field exists in the `RelayAct` interface in Section 3 (lines 72–82). 

By our own inference, removing this section and the uninterpreted enum types resolves a direct, active schema contradiction in the core draft and simplifies the transport spec.

### 6. Confidence Statement
I am 100% confident that removing §5 and the uninterpreted enum types resolves an active schema contradiction and aligns with a clean core design.

---

## Recommendation 8

### 1. Quoted Recommendation
> `Не возвращать inline signature в хешируемое тело. Явно зафиксировать причину и отложить detached signature в профиль аутентификации.`

### 2. Verdict
FAILS.

### 3. Broken Rule from `CONTRACT.md` §3
> `4. It has a cost the note does not name.`

### 4. Ground Sourcing & Line Numbers
- `input/relay-lite-v0.12-addendum-clock.md`, lines 86–97: Discusses the severe HLC clock-poisoning vulnerability where a hostile peer can move a node's `l` forward permanently and infect the rest of the network.

### 5. Analysis & Inference
While the note is mathematically and logically correct that an inline signature within the hashed body is incoherent with the no-normalization hashing rule of §7.1, permanently excluding signatures from the core and deferring them to an optional future "authentication profile" carries a severe, immediate security cost.

By our own inference, without core authentication, the entire HLC monotonicity and correctness model remains completely vulnerable to permanent, viral clock-poisoning attacks by any single untrusted peer. Because the recommendation does not acknowledge or name this clock-poisoning vulnerability as a direct cost of leaving the core transport unauthenticated, it fails to present the true security trade-off of its design choice.

### 6. Confidence Statement
I am 100% confident that omitting signatures from the core leaves the HLC clock update mechanism completely unprotected against permanent, viral peer poisoning, which is a major unnamed cost.
