# UNITS — unitization of SPEC.md + AMENDMENT.md under RULE.md

Produced by applying `RULE.md` as stated to `SPEC.md` and `AMENDMENT.md`. No other
documents were read. This is not an assessment of the rule; where the rule did not
determine the cut, the choice made is recorded in §3 rather than absorbed into §1.

**Total: 50 units.**

One convention applies throughout and is itself a judgement call (see §3, R-9):
rule 4 allocates ID *ranges* but never binds an ID to a text. Every ID→text
assignment below is therefore mine, made in document order within each series.

---

## §1 The unit list, in document order

### SPEC.md — "The trusted kernel — six conventions, one name deep" (rule 2(d))

| id | source | text |
|---|---|---|
| C1 | SPEC K1 | "artifact boundary" — "what counts as *one artifact*" |
| C2 | SPEC K2 | "byte extraction" — "which bytes are digested" |
| C3 | SPEC K3 | "hash function" — "SHA-256" |
| C4 | SPEC K4 | "manifest format" — "serialization of the hash list, declared range, schema, evaluator" |
| C5 | SPEC K5 | "evaluator semantics" — "deterministic execution" |
| C6 | SPEC K6 | "spec version" — "names K1–K5 together so an amendment cannot silently reinterpret an old root" |

### SPEC.md — "MUST" (rule 1)

| id | source | text |
|---|---|---|
| M1 | MUST 1 | "binds `(authority_id, seq)` uniquely, monotonically, and never reuses a seq" — sub-verdicts: "Allocation MUST be settled by an atomic exclusive commit, never by reading the current maximum"; "The marker persists beyond deletion of the record" |
| M2 | MUST 2 | "An authority MUST declare the seq from which it claims G1, and MUST NOT claim G1 below it" — sub-verdict: the MUST NOT half |
| M3 | MUST 3, as amended | "Record content is identified by `sha256(bytes)`, stable across ids"; second sentence replaced by AMENDMENT: "record identity MUST NOT derive from content identity … while bound-content MAY contain a declared id" — sub-verdicts: the MUST NOT, the MAY, and "a store's deduplication MUST NOT be switched off for them" |
| M4 | MUST 4 | "a bound `(authority, seq)` never changes its digest" — "Equivocation by a conforming authority is therefore *prevented*, not detected" |
| M5 | MUST 5 | "`parent`, when present, is scoped to the same authority" — sub-verdict: "Cross-authority references are **observations** and MUST be labelled as such" |
| M6 | MUST 6 | "Visibility state is exposed honestly: `PRESENT` / `KNOWN_MISSING` / `UNKNOWN`" — sub-verdicts: "A quiet window MUST NOT be reported as a failure"; "a failure MUST NOT be reported as absence"; the Deletion case; the crash-between-ledger-and-payload case |
| M7 | MUST 7 | "The absence of a witness is reported **as absence**, never as 'no evidence found'" |
| M8 | MUST 8 | "Every write that establishes a binding MUST be crash-atomic AND create-or-fail" — sub-verdicts: crash-atomic ("the bytes are durable before the name that points at them appears"); create-or-fail ("a write to an id already held FAILS rather than replacing what is there") |

### SPEC.md — "MAY" (rule 2(b))

| id | source | text |
|---|---|---|
| Y1 | MAY bullet 1 | "Content deduplication across ids." |
| Y2 | MAY bullet 2 | "Witnessing and inclusion evidence — one or more witnesses, best-effort." |
| Y3 | MAY bullet 3 | "Key rotation or multi-key authority. Operational, not protocol." |
| Y4 | MAY bullet 4 | "A deterministic reading order across authorities (`authority_id` then `seq`)" — "A **convention**, never a guarantee" |
| Y5 | MAY bullet 5 | "Replication and availability of bytes." |

### SPEC.md — "MUST NOT" (rule 2(a))

| id | source | text |
|---|---|---|
| N1 | MUST NOT 1 | "MUST NOT claim a global total order across authorities without a consensus layer" |
| N2 | MUST NOT 2 | "MUST NOT let witnessing masquerade as ordering" — "two records inside one cut are never ordered by it" |
| N3 | MUST NOT 3 | "MUST NOT present a vantage-limited verdict — 'latest', 'unreferenced' — as a property of the record" |
| N4 | MUST NOT 4 | "MUST NOT make deposit depend on the parent being present and readable" |
| N5 | MUST NOT 5 | "MUST NOT silently strengthen" — "Equivocation by a *non-conforming* authority is **detected, not prevented**" |
| N6 | MUST NOT 6 | "MUST NOT be read as attesting that a record says what its author meant" |

### SPEC.md — "Citing a record" (rule 2(d): citation, envelope)

| id | source | text |
|---|---|---|
| CT1 | citation convention | "MUST be a **(locator, digest) pair**, never a locator alone"; crossing a boundary, "MUST be `(store identity, locator, content digest)`" |
| EV1 | envelope convention | the envelope `id:` "is OPTIONAL but, when present, MUST be checked against the store-assigned id" — scoped to "the bytes above the first blank line"; "`from:`/`to:` are provenance and routing claims, not cryptographic identity" |

### SPEC.md — "Named failures" (rule 2(e))

| id | case | outcome text |
|---|---|---|
| F1 | partition | "total order unavailable; binding unaffected; merge is union" |
| F2 | crash before commit | "the ledger MUST be written **before** the record, or an id is handed out twice" |
| F3 | crash after write, before witness | "durability holds, witnessing is merely absent. A durable record MAY be unwitnessed" |
| F4 | delete | "the id stays bound. Deletion removes the record but **never** the allocation marker" |
| F5 | duplicate content | "two ids, one digest. Correct, and needs no resolution" |
| F6 | concurrent append | "no conflict under `(authority, seq)`. Under a global counter it needs consensus" |
| F7 | equivocation | "prevented in a conforming authority, detected in a non-conforming one, never prevented in the latter" |

### SPEC.md — "Migration, and the one step with a deadline" (rule 2(f))

| id | source | text |
|---|---|---|
| MG1 | Migration | "These must be made authority-aware while exactly one authority exists" — `reference.ts:94`/`:105`, `nextFree()`, `check-continuity`; verifiable "by a **null result**" |
| MG2 | Migration | "This change has a window that is open only while exactly one authority exists, and that window does not reopen" |

### AMENDMENT.md — "Definitions" (rule 2(c))

| id | term | text |
|---|---|---|
| D1 | Candidate | "An octet sequence offered to a store as a record, together with its extent" |
| D2 | Record | "A candidate a store has admitted" |
| D3 | Bound-content | "every octet of the candidate that was admitted, in order, and nothing else" |
| D4 | Content identity | "`sha256(bound-content)`. Nothing wider is meant by the term" |
| D5 | Record identity | "The name under which a store holds a record. It is allocated by the store" |
| D6 | Blank line | "A line containing no octets. A line carrying whitespace is not blank" |
| D7 | Field | "A header-block line of the form `name: value`, where `name` matches `[A-Za-z][A-Za-z0-9-]*`" |
| D8 | Header block | "The octets of bound-content above its first blank line" |
| D9 | Declared id | "An `id` field appearing in a record's header block. It is bound-content, not identity" |
| D10 | Binding | "The association, completed at a single moment, of a record identity with a bound-content, its content identity, and its extent" |
| D11 | Read | "An operation that returns bound-content or any part of it" — metadata-only operations "not a read" |
| D12 | Refuse | "To decline, with an indication the offering party can distinguish from acceptance. Silence is not refusal" |

### AMENDMENT.md — numbered MUSTs added (rule 1)

| id | source | text |
|---|---|---|
| M9 | MUST 9 | "the digest domain" — "Content identity is computed over the admitted candidate alone … the octets are digested exactly as they arrived" — sub-verdicts 9.1 Extent ("MUST NOT derive extent from the content of a candidate"), 9.2 Admission ("MUST begin with the octets `@p-e/x0`"), 9.3 Fidelity ("MUST store bound-content octet for octet as it arrived"), 9.4 Type ("never over a decoded string") |
| M10 | MUST 10 | "recorded at binding" — sub-verdicts 10.1 ("MUST record the content identity at the moment of binding, and MUST verify it … on every read"), 10.2 (verification "does not establish that the record is correct"), 10.3 (**OPEN**; "no store may report an integrity disagreement by moving a record out of `PRESENT`"), 10.4 Order ("admission (9.2) is tested before verification (10.1)"), 10.5 ("MUST distinguish records bound with a recorded content identity from records bound without one") |

---

## §2 Counts

| document | section | rule clause | count |
|---|---|---|---|
| SPEC.md | The trusted kernel (K1–K6) | 2(d) | 6 |
| SPEC.md | MUST | 1 | 8 |
| SPEC.md | MAY | 2(b) | 5 |
| SPEC.md | MUST NOT | 2(a) | 6 |
| SPEC.md | Citing a record (citation + envelope) | 2(d) | 2 |
| SPEC.md | Named failures | 2(e) | 7 |
| SPEC.md | Migration | 2(f) | 2 |
| AMENDMENT.md | Definitions | 2(c) | 12 |
| AMENDMENT.md | MUST 9 | 1 | 1 |
| AMENDMENT.md | MUST 10 | 1 | 1 |

SPEC.md subtotal: 6 + 8 + 5 + 6 + 2 + 7 + 2 = **36**
AMENDMENT.md subtotal: 12 + 1 + 1 = **14**

**Total: 36 + 14 = 50.**

Cross-check by ID series: M 10 + N 6 + Y 5 + C 6 + CT 1 + EV 1 + F 7 + MG 2 + D 12
= 10+6 = 16; +5 = 21; +6 = 27; +1 = 28; +1 = 29; +7 = 36; +2 = 38; +12 = **50**. Agrees.

Sections of the two documents that produced **zero** units under the rule, listed so the
36/14 split is not mistaken for coverage: SPEC's front matter, "What this document
certifies", "The incident this exists for", "Three guarantees", "Capabilities and their
monotonicity", "What a witness does, exactly", "What is not covered", "The legacy
authority", "Deferred to a separate issue"; AMENDMENT's preamble, "Known open",
"Amendment to MUST 3" (folded into M3), and "Standing". See R-4 and R-5.

---

## §3 Where the rule did not determine the cut

Ten places. Each gives the reading taken and the alternative rejected.

### R-1 — Rule 2(d) and rule 4 allocate different numbers of convention units
**The conflict.** Rule 2(d) says "each convention (K1-K6, citation, envelope) is one
row" — that is 6 + 1 + 1 = 8 rows. Rule 4 allocates `C1, C2, C3`, `CT1, CT2, CT3`,
`EV1, EV2, EV3` — 3 + 3 + 3 = 9 IDs, with three for conventions where 2(d) requires six,
and three each for citation and envelope where 2(d) requires one each. No reading
satisfies both clauses.
**Reading taken.** Rule 2 governs boundaries — it is the clause that says "using the
following priority for unit boundaries", whereas rule 4 is headed "Unit identity" and
concerns stability of names across versions. So: 6 kernel rows (C1–C6, extending the
allocated C range), 1 citation row (CT1), 1 envelope row (EV1). CT2, CT3, EV2, EV3 are
left unallocated.
**Alternative rejected.** Treat rule 4's enumeration as the record of the boundaries the
first unitization actually drew: cut citation into three claims (pair-required /
cross-store triple / nesting-safety), envelope into three (`id:` is OPTIONAL / when
present MUST be checked / header-block scope and quoted lines), and compress K1–K6 into
three. Rejected because the last step has no textual basis at all — nothing distinguishes
three of the six kernel conventions from the other three. Under that alternative the
total would be 51, not 50.

### R-2 — The amendment adds MUST 9 and MUST 10, which rule 4 does not allocate
Rule 4 allocates `M1 … M8`. `AMENDMENT.md` adds two further numbered MUSTs. Rule 4 also
requires that "when an amendment edits a unit, the amendment states the mapping
explicitly"; this amendment states no mapping for anything.
**Reading taken.** Rule 1 ("one row per numbered MUST") applies to the amendment's
numbered MUSTs as much as to the spec's; allocate M9 and M10 in document order.
**Alternative rejected.** Treat MUST 9 and MUST 10 as text the allocation does not cover
and unitize them under rule 2 instead — which would split them at their nine embedded
MUST/MUST NOT keywords into N-series rows, overflowing N1–N6 by nine.

### R-3 — Rule 1 versus rule 3 for keywords inside a numbered MUST
Numbered MUSTs contain further keywords: MUST 2's "MUST NOT claim G1 below it", MUST 5's
"MUST be labelled as such", MUST 6's two MUST NOTs, MUST 8's two named properties, the
amended MUST 3's MUST NOT and MAY, and every sub-clause of MUST 9 and MUST 10. Rule 1
says compound parts "carry sub-verdicts that roll up into the parent's verdict"; rule 3
says to "split at each new MUST/MAY/MUST NOT keyword".
**Reading taken.** Rule 1 governs inside a numbered MUST; rule 3 applies to the
unnumbered text rule 2 covers, since rule 2's own stem reads "Unnumbered normative text".
Embedded keywords are recorded as sub-verdicts in §1, not as separate rows.
**Alternative rejected.** Apply rule 3 everywhere. That adds roughly twenty rows to the N
and Y series and immediately contradicts rule 4, whose N1–N6 and Y1–Y5 ranges match the
standalone MUST NOT and MAY sections exactly — six bullets and five bullets. That match
is the evidence for the reading taken.

### R-4 — "the Definitions section" is not a section of SPEC.md
Rule 2(c) says "each definition in the Definitions section". Only `AMENDMENT.md` has a
heading named `Definitions`. `SPEC.md` nevertheless defines terms in tabular form: the
three guarantees (G1, G2a, G2b) and the three capabilities (`bound`, `held`,
`witnessed`), the latter introduced as a repair to a finding that "`held` [was] used in
three senses within one document".
**Reading taken.** Only the amendment's `## Definitions` qualifies. It contains exactly
twelve definitions, matching D1–D12 exactly — the strongest confirmation available in
the rule that this is the section meant.
**Alternative rejected.** Treat SPEC's definitional tables as definitions too, adding six
rows (D13–D18) and breaking the D1–D12 allocation. Noted because the capability
definitions are load-bearing — the spec calls monotonicity "the axis the whole design
turns on" — and the rule leaves them with no unit.

### R-5 — Is the (a)–(f) list closed, or only a priority ordering?
Rule 2's stem asks for "one row per distinct normative claim", then gives (a)–(f) "for
unit boundaries". If the stem is the scope, several passages are units; if (a)–(f) is a
closed list, none are. Affected text includes: the kernel's availability requirement
("the requirement is that the named bytes be obtainable by the party asked to reproduce");
"A witness detects rewrite. It does not prove inclusion"; the leaves-not-proofs witness
form, which is "**Recommended**"; "the model must name which" for witness types (a)/(b)/(c);
and all six "What is not covered" bullets, which are scope exclusions carrying no
MUST NOT keyword.
**Reading taken.** Closed list. Rule 4 allocates an ID prefix for each of (a)–(f)'s
categories and none for anything else, which reads as the allocation of a closed
enumeration.
**Alternative rejected.** Open stem, adding roughly ten to twelve rows with no allocated
prefix and no rule-given order. Recorded because this is the largest body of
normative-sounding text the output does not contain, and a reader comparing this list
against the documents will notice its absence first.

### R-6 — A MAY grant inside a Named Failures row
Rule 2's priority puts "(b) each MAY grant is one row" above "(e) each entry in the Named
Failures table is one row". The `crash after write, before witness` row contains a MAY
grant: "A durable record MAY be unwitnessed". Read by priority, that grant is its own row
and F3 is the remainder; read by table structure, the row is one unit.
**Reading taken.** One unit (F3), grant included. The Y1–Y5 allocation matches the MAY
section's five bullets exactly, so the Y series appears not to be intended to reach into
tables.
**Alternative rejected.** Y6 = "A durable record MAY be unwitnessed", total 51. The same
question arises for the MUST inside the `crash before commit` row ("the ledger MUST be
written **before** the record"), which no priority clause reaches at all.

### R-7 — What counts as "a Migration requirement"
Rule 2(f) gives one row per Migration requirement without saying what a requirement is.
The section contains: three components that assume a single global tail (findings, not
requirements); the bolded authority-aware change; the bolded non-reopening window; and,
in "The legacy authority", a three-row position table with normative force — "legacy
`relay` makes no G1 claim" and "a future authority **may** declare a floor, and **must**
satisfy v1's rules above it".
**Reading taken.** Two: MG1 and MG2, the two bolded imperatives, matching the MG1/MG2
allocation.
**Alternative rejected.** Include the legacy/future-authority position as MG3 (or as a
MAY grant Y6 plus a MUST), giving 51 or 52. The position table states what an authority
may and must do and is arguably the most operative text in the section; it is excluded
only because MG1/MG2 stops at two.

### R-8 — Sub-verdicts are not rows
Rule 1 says compound parts "carry sub-verdicts that roll up into the parent's verdict"
but does not say whether a sub-verdict is itself a row. MUST 9 has four sub-clauses,
MUST 10 has five, MUST 6 has two named cases, MUST 8 has two named properties.
**Reading taken.** Not rows. "Roll up into the parent's verdict" describes a subordinate
object, and M1–M8 could not be an eight-ID range otherwise.
**Alternative rejected.** One row per sub-clause, which would take the MUST series alone
from 10 to 24.

### R-9 — The rule allocates ranges, not assignments
Rule 4 says identity is "allocated, not computed" and lists the ranges, but never states
which text carries which ID — no clause says D1 is *Candidate* or F4 is *delete*.
**Reading taken.** Document order within each series, as recorded in §1.
**Alternative rejected.** None available; there is no other stated basis. Flagged because
every ID in this document is therefore mine, and rule 5's stability guarantee — an ID
survives reflow and rewording — cannot bind a later reader who orders differently.

### R-10 — The amendment edits MUST 3 without the mapping rule 4 and rule 5 require
Rule 4 requires an amendment editing a unit to state "U-X in vN is U-Y of vN-1,
narrowed/widened/merged/split", and rule 5 requires that "the amendment records which IDs
changed and why". `AMENDMENT.md` does neither: it replaces MUST 3's second sentence
outright, converting "neither derives from the other" into a one-way prohibition plus a
MAY, and records nothing.
**Reading taken.** M3 is retained, its content read as the amended text, and no ID change
is recorded — the rule gives no procedure for supplying a mapping the amendment omitted.
**Alternative rejected.** Treat the change as substantive under rule 5 and allocate a new
ID for the amended clause, orphaning M3. Rejected because inventing the mapping is
exactly what rule 4 reserves to the amendment; but note that under rule 5's own test the
alternative is the better-supported one, since the normative content was substantively
altered.
