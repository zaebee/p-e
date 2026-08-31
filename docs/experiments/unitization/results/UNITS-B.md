# Unitization of SPEC.md + AMENDMENT.md under RULE.md

Applying the rule as stated. Where it did not determine the cut, §3 below records the
place, the reading taken, and the reading rejected.

**Total: 57 units.** Per-section counts and the arithmetic are in §2.

---

## §1 The unit list

In document order: `SPEC.md` first, then `AMENDMENT.md`, each in its own order. (The
choice to list them consecutively rather than interleaving the amendment's MUST 9/10 into
the spec's MUST section is a judgement call — see A15.)

### SPEC.md · The trusted kernel — conventions (rule 2d) — C1–C6

| id | section | identifying text |
|---|---|---|
| C1 | trusted kernel, K1 | "artifact boundary" — "what counts as *one artifact*"; "the boundary is ours and is not in the bytes" |
| C2 | trusted kernel, K2 | "byte extraction" — "which bytes are digested" |
| C3 | trusted kernel, K3 | "hash function" — "SHA-256. Zero historical disagreement" |
| C4 | trusted kernel, K4 | "manifest format" — "serialization of the hash list, declared range, schema, evaluator" |
| C5 | trusted kernel, K5 | "evaluator semantics" — "deterministic execution"; "Unestablished, not broken" |
| C6 | trusted kernel, K6 | "spec version" — "names K1–K5 together so an amendment cannot silently reinterpret an old root" |

*C4–C6 are extensions beyond rule 4's allocation (see A1, A2).*

### SPEC.md · MUST — M1–M8

| id | section | identifying text |
|---|---|---|
| M1 | MUST 1 | "binds `(authority_id, seq)` uniquely, monotonically, and never reuses a seq" — sub-verdicts: "MUST be settled by an atomic exclusive commit, never by reading the current maximum"; the `wx`/`O_EXCL` marker mechanism; "**The marker persists beyond deletion of the record**" |
| M2 | MUST 2 | "An authority MUST declare the seq from which it claims G1, and MUST NOT claim G1 below it" |
| M3 | MUST 3, as amended | "Record content is identified by `sha256(bytes)`, stable across ids" + amendment: "record identity MUST NOT derive from content identity … while bound-content MAY contain a declared id"; "a store's deduplication MUST NOT be switched off for them" |
| M4 | MUST 4 | "A **conforming** authority's ledger is non-rewindable: a bound `(authority, seq)` never changes its digest" |
| M5 | MUST 5 | "`parent`, when present, is scoped to the same authority" — sub-verdict: cross-authority references "MUST be labelled as such" |
| M6 | MUST 6 | "Visibility state is exposed honestly: `PRESENT` / `KNOWN_MISSING` / `UNKNOWN`" — sub-verdicts: quiet window / failure inversion; Deletion; Crash between ledger and payload |
| M7 | MUST 7 | "The absence of a witness is reported **as absence**, never as 'no evidence found'" |
| M8 | MUST 8 | "Every write that establishes a binding MUST be crash-atomic AND create-or-fail" — sub-verdicts: crash-atomic (bytes durable before the name); create-or-fail (write to a held id FAILS) |

### SPEC.md · MAY — Y1–Y5

| id | section | identifying text |
|---|---|---|
| Y1 | MAY | "Content deduplication across ids" |
| Y2 | MAY | "Witnessing and inclusion evidence — one or more witnesses, best-effort" |
| Y3 | MAY | "Key rotation or multi-key authority. Operational, not protocol" |
| Y4 | MAY | "A deterministic reading order across authorities (`authority_id` then `seq`)" — "A **convention**, never a guarantee" |
| Y5 | MAY | "Replication and availability of bytes" |

### SPEC.md · MUST NOT — N1–N6

| id | section | identifying text |
|---|---|---|
| N1 | MUST NOT | "MUST NOT claim a global total order across authorities without a consensus layer" |
| N2 | MUST NOT | "MUST NOT let witnessing masquerade as ordering" — "two records inside one cut are never ordered by it" |
| N3 | MUST NOT | "MUST NOT present a vantage-limited verdict — 'latest', 'unreferenced' — as a property of the record" |
| N4 | MUST NOT | "MUST NOT make deposit depend on the parent being present and readable" |
| N5 | MUST NOT | "MUST NOT silently strengthen" — "detected, not prevented" |
| N6 | MUST NOT | "MUST NOT be read as attesting that a record says what its author meant" |

### SPEC.md · Citing a record — citation convention (rule 2d) — CT1–CT3

| id | section | identifying text |
|---|---|---|
| CT1 | Citing a record | "MUST be a **(locator, digest) pair**, never a locator alone" |
| CT2 | Citing a record | "crossing an authority or store boundary the citation MUST be `(store identity, locator, content digest)`" |
| CT3 | Citing a record | "Cite the pair; the locator alone is a convenience shorthand, not the citation" — a bare `relay-NNNN` or content-derived label "is insufficient" |

### SPEC.md · Envelope convention (rule 2d) — EV1–EV6

| id | section | identifying text |
|---|---|---|
| EV1 | Envelope convention | "The store-assigned id is the authoritative record identity and is not an authored field" |
| EV2 | Envelope convention | the envelope `id:` "is OPTIONAL but, when present, MUST be checked against the store-assigned id" |
| EV3 | Envelope convention | "The check is scoped to the header block … and a header-like line quoted in a record body is not a field and must not be adopted or rejected as one" |
| EV4 | Envelope convention | "where an import carries a source id it travels as explicit *source* metadata in an import wrapper, never as the local id" |
| EV5 | Envelope convention | "Out-of-chain is represented by omitting `parent:` — an UNSTATED predecessor, not a claim of roothood — not by a second dialect" |
| EV6 | Envelope convention | "`from:`/`to:` are provenance and routing claims, not cryptographic identity" |

*EV4–EV6 are extensions beyond rule 4's allocation (see A1, A4).*

### SPEC.md · Named failures — F1–F7

| id | section | identifying text |
|---|---|---|
| F1 | Named failures | partition — "total order unavailable; binding unaffected; merge is union" |
| F2 | Named failures | crash before commit — "the ledger MUST be written **before** the record, or an id is handed out twice" |
| F3 | Named failures | crash after write, before witness — "durability holds, witnessing is merely absent. A durable record MAY be unwitnessed" |
| F4 | Named failures | delete — "Deletion removes the record but **never** the allocation marker" |
| F5 | Named failures | duplicate content — "two ids, one digest. Correct, and needs no resolution" |
| F6 | Named failures | concurrent append — "no conflict under `(authority, seq)`" |
| F7 | Named failures | equivocation — "prevented in a conforming authority, detected in a non-conforming one" |

### SPEC.md · Migration — MG1–MG2

| id | section | identifying text |
|---|---|---|
| MG1 | Migration | "These must be made authority-aware while exactly one authority exists" (`reference.ts:94/:105`, `nextFree()`, `check-continuity`) — sub-verdicts: verification by null result, "every verdict on the existing corpus must come back byte-identical"; "that window does not reopen" |
| MG2 | Migration · legacy authority | "`relay-NNNN` cannot simply be reinterpreted as `(authority=relay, seq=NNNN)`"; "**legacy `relay`** makes no G1 claim"; "**Nor can MUST 2 rescue it**" |

### AMENDMENT.md · Definitions — D1–D12

| id | section | identifying text |
|---|---|---|
| D1 | Definitions | **Candidate.** "An octet sequence offered to a store as a record, together with its extent" |
| D2 | Definitions | **Record.** "A candidate a store has admitted" |
| D3 | Definitions | **Bound-content.** "every octet of the candidate that was admitted, in order, and nothing else" |
| D4 | Definitions | **Content identity.** "`sha256(bound-content)`. Nothing wider is meant by the term" |
| D5 | Definitions | **Record identity.** "The name under which a store holds a record. It is allocated by the store" |
| D6 | Definitions | **Blank line.** "A line containing no octets. A line carrying whitespace is not blank" |
| D7 | Definitions | **Field.** "A header-block line of the form `name: value`" matching `[A-Za-z][A-Za-z0-9-]*` |
| D8 | Definitions | **Header block.** "The octets of bound-content above its first blank line" |
| D9 | Definitions | **Declared id.** "An `id` field appearing in a record's header block. It is bound-content, not identity" |
| D10 | Definitions | **Binding.** "The association, completed at a single moment, of a record identity with a bound-content, its content identity, and its extent" |
| D11 | Definitions | **Read.** "An operation that returns bound-content or any part of it" |
| D12 | Definitions | **Refuse.** "To decline, with an indication the offering party can distinguish from acceptance. Silence is not refusal" |

### AMENDMENT.md · numbered MUSTs — M9–M10

| id | section | identifying text |
|---|---|---|
| M9 | MUST 9 — the digest domain | "the octets are digested exactly as they arrived" — sub-verdicts 9.1 Extent ("MUST NOT derive extent from the content of a candidate"), 9.2 Admission ("MUST begin with the octets `@p-e/x0`"; valid UTF-8), 9.3 Fidelity ("MUST store bound-content octet for octet"), 9.4 Type ("computed over octets, never over a decoded string") |
| M10 | MUST 10 — recorded at binding | "MUST record the content identity at the moment of binding" — sub-verdicts 10.1 (verify on every read), 10.2 (what verification does not establish), 10.3 OPEN ("An open verdict is not a permission"; "no store may report an integrity disagreement by moving a record out of `PRESENT`"), 10.4 Order (admission before verification), 10.5 (records bound before 10.1 "MUST NOT report the latter as verified") |

*M9–M10 are extensions beyond rule 4's allocation (see A1, A7).*

### AMENDMENT.md · Amendment to MUST 3 — 0 new units

Folded into M3 above. See A8: rule 4 requires the amendment to state the mapping
explicitly and it states none.

---

## §2 Counts

| document | section | units |
|---|---|---|
| SPEC.md | trusted kernel (conventions K1–K6) | 6 |
| SPEC.md | MUST | 8 |
| SPEC.md | MAY | 5 |
| SPEC.md | MUST NOT | 6 |
| SPEC.md | Citing a record — citation convention | 3 |
| SPEC.md | Citing a record — envelope convention | 6 |
| SPEC.md | Named failures | 7 |
| SPEC.md | Migration | 2 |
| AMENDMENT.md | Definitions | 12 |
| AMENDMENT.md | Amendment to MUST 3 | 0 |
| AMENDMENT.md | MUST 9 | 1 |
| AMENDMENT.md | MUST 10 | 1 |
| | **total** | **57** |

Arithmetic, checked twice:

- SPEC.md: 6 + 8 = 14; 14 + 5 = 19; 19 + 6 = 25; 25 + 3 = 28; 28 + 6 = 34; 34 + 7 = 41; 41 + 2 = **43**
- AMENDMENT.md: 12 + 0 = 12; 12 + 1 = 13; 13 + 1 = **14**
- Total: 43 + 14 = **57**

Cross-check against rule 4's allocation: rule 4 names 8 + 6 + 5 + 12 + 3 + 3 + 3 + 7 + 2 =
**49** ids. This unitization adds 8 (C4, C5, C6, EV4, EV5, EV6, M9, M10). 49 + 8 = **57**. ✓

Family totals: M 10, N 6, Y 5, D 12, C 6, CT 3, EV 6, F 7, MG 2 →
10 + 6 = 16; +5 = 21; +12 = 33; +6 = 39; +3 = 42; +6 = 48; +7 = 55; +2 = **57**. ✓

---

## §3 Where the rule did not determine the cut

Fifteen places. Each gives the reading taken and the reading rejected.

### A1 — Rule 4's id allocation is smaller than what rules 2–3 yield

Rule 4 allocates 49 ids. Rules 2 and 3, applied to the two documents, produce more units
than that in three families (C, EV, M). Rule 4 does not say whether its enumeration is a
cap on the cut or a record of an earlier one.

**Reading taken:** rules 2 and 3 determine the boundaries; rule 4 governs *identity*
("allocated, not computed"), and its enumeration is the allocation as of an earlier
unitization. Where it runs out, the family is continued and every extension is marked.

**Rejected:** treating the 49 ids as a cap and merging real normative claims to fit. That
would force arbitrary merges (which two of K1–K6 become one row?) and would silently drop
MUST 9 and MUST 10 from the list entirely.

**Evidence cutting both ways:** the enumeration already reflects amendment material
(D1–D12 matches the amendment's 12 definitions exactly), so it is not simply a pre-amendment
snapshot — yet it stops M at 8 and gives C and EV three each. The enumeration is internally
inconsistent about which version of the corpus it describes; I could not resolve that from
the rule.

### A2 — What C1–C3 denotes

Rule 2(d) names three convention groups (K1–K6, citation, envelope); rule 4 supplies three
prefixes (C, CT, EV) with three ids each. `CT` reads as citation and `EV` as envelope,
leaving `C` for the kernel — but the kernel has six conventions, not three.

**Reading taken:** C = the kernel conventions K1–K6, extended to C1–C6.

**Rejected:** C = the capabilities table (`bound`, `held`, `witnessed`), which is exactly
three rows and would fit the allocation perfectly. Rejected because rule 2 has no category
for the capabilities table at all, while it names K1–K6 explicitly under (d); taking C as
the capabilities would leave all six named kernel conventions with no ids, a larger gap
than the one it closes.

### A3 — "each convention (K1–K6, citation, envelope) is one row"

Read literally, this could mean three rows total — one for the kernel, one for citation,
one for the envelope.

**Reading taken:** one row per convention *entry* — six for the kernel table, and per
distinct claim for citation and envelope. Grounded in rule 3 ("split at each new keyword or
table row") and in rule 4 allocating nine ids across the three prefixes rather than three.

**Rejected:** three units for the whole of 2(d), total 45 units.

### A4 — Envelope granularity: 3 or 6

The envelope paragraph carries six distinct normative claims (EV1–EV6) but only one
uppercase MUST and one lowercase "must not". Rule 3's keyword split yields roughly 2; rule
2's "one row per distinct normative claim" yields 6; rule 4 allocates 3.

**Reading taken:** 6, from rule 2's opening clause, which is the operative test; rule 3's
keyword split is described as a boundary aid for sentences and paragraphs that *contain*
multiple keywords, not as a filter that discards keyword-free normative claims.

**Rejected:** 3 (fits the allocation, but requires discarding EV4/EV5/EV6 or silently
folding them into EV1–EV3 with no stated basis for which). Also rejected: 2 by strict
keyword split.

### A5 — Citation granularity: 2 or 3

Strict keyword splitting finds two MUSTs in "Citing a record". A third distinct normative
claim — "Cite the pair; the locator alone is a convenience shorthand, not the citation" —
carries no MUST keyword.

**Reading taken:** 3 (CT1–CT3), by the same logic as A4; it also matches rule 4's
allocation.

**Rejected:** 2 by strict keyword split. Noted that A4 and A5 are the same question decided
the same way, but the allocation agrees with the answer in one case and not the other.

### A6 — Is rule 2's list (a)–(f) exhaustive?

Rule 2 says "one row per distinct normative claim, **using the following priority for unit
boundaries**". The list may be an exhaustive set of unit kinds or an ordered tiebreaker over
a wider field.

**Reading taken:** exhaustive for unnumbered text. Only (a)–(f) produce units.

**Rejected:** the open reading, under which every distinct normative claim anywhere becomes
a unit. That would add at least these 19, which this list therefore does **not** contain:

1. the kernel availability requirement — "the requirement is that the named bytes be obtainable by the party asked to reproduce"
2. "The two are not comparable and must never be scored against each other" (profiles)
3. "an author must not be able to withhold what verification needs"
4. "A witness attests one of three different things and the model must name which"
5. "**Recommended** as the witness form for this protocol" (publish leaves, not proofs)
6. "the protocol **records** who witnessed and when, and never asserts they were independent"
7–9. the capabilities table: `bound` / `held` / `witnessed` (definitions, but not in "the Definitions section")
10–12. the guarantees table: G1 / G2a / G2b
13–19. the seven "What is not covered" bullets

The open reading would give 57 + 19 = 76 units. Note that item 1 is a requirement the spec
itself flags as in tension with item 13 (audit finding F5); the closed reading suppresses
both, which is a cost of the reading I took.

### A7 — Numbered MUSTs: rule 1 vs rule 3

Rule 1 says one row per numbered MUST, with compound parts as sub-verdicts. Rule 3 says
split at each new MUST/MAY/MUST NOT keyword. They are siblings in the rule and they
disagree: MUST 2 contains a MUST NOT, MUST 6 contains two, MUST 8 names two separable
properties, MUST 9 and MUST 10 contain nine numbered sub-clauses between them.

**Reading taken:** rule 1 governs numbered MUSTs — it is the more specific rule and its
second sentence ("compound parts carry sub-verdicts") exists precisely to say *do not
split*. Rules 2–3 govern unnumbered text, per rule 2's own heading.

**Rejected:** splitting numbered MUSTs at keywords. M1 would become ≥3, M2 2, M5 2, M6 3,
M8 2, M9 ≥8, M10 ≥7 — roughly +20 units. Also rejected: treating 9.1–9.4 and 10.1–10.5 as
"numbered MUSTs" in their own right, which would give 9 rows instead of 2 (total 64). That
alternative is not unreasonable — they *are* numbered and they *are* MUSTs — but rule 4's
M1–M8 matches the spec's eight *top-level* numbers while the spec's MUST 6 has sub-bullets
treated as parts, so top-level numbering is the row unit.

### A8 — The amendment to MUST 3 states no id mapping

Rule 4 requires: "When an amendment edits a unit, the amendment states the mapping
explicitly." The amendment replaces MUST 3's second sentence and states no mapping. Rule 5
says an id changes when normative content is "substantively altered"; the replacement adds
a one-way derivation prohibition, a MAY, and a MUST NOT on deduplication — substantive by
any reading.

**Reading taken:** M3 covers the amended text; the identifying quote gives both wordings. I
do not invent the mapping the amendment failed to state, and I record its absence here.

**Rejected:** allocating a fresh id for the amended clause and leaving M3 to the superseded
wording (+1 unit, total 58). Rejected because inventing an id mapping is exactly what rule 4
reserves to the amendment.

### A9 — An uppercase MAY inside the Named Failures table

"A durable record MAY be unwitnessed" (F3) is a MAY grant inside a failures-table entry.
Rule 2's priority puts (b) MAY grants **above** (e) failures-table entries, which read
strictly would split that row in two.

**Reading taken:** it stays a sub-part of F3. The priority list resolves conflicts *within*
a stretch of text; (c)–(f) each name a specific section whose entries are the units, and
(a)/(b) apply to normative text outside those sections.

**Rejected:** a separate MAY unit (+1, and F-family 7 rows yielding 8 units) — which would
also break the F1–F7 allocation that rule 4 supplies and that otherwise fits exactly.

### A10 — A lowercase "may" in the Migration position table

"a future authority **may** declare a floor, and must satisfy v1's rules above it" — same
(b)-vs-(f) conflict as A9, plus the question of whether lowercase "may" counts as a MAY
grant at all. The rule never says whether keyword matching is case-sensitive.

**Reading taken:** sub-part of MG2; lowercase keywords are not treated as RFC-2119
keywords for boundary purposes. Applied consistently: "A client must never confuse…"
(MUST 6), "must not be adopted or rejected as one" (envelope), "the model must name which"
(witness) are all treated as prose, not as boundary-creating keywords.

**Rejected:** case-insensitive keyword matching, which would add units in MUST 6, the
envelope paragraph, the witness section, the profiles section and Migration.

### A11 — What counts as "a Migration requirement"

Rule 2(f) gives one row per Migration requirement; rule 4 allocates two. The Migration
section contains one clear imperative ("These must be made authority-aware…"), a
verification criterion, a deadline statement, a prohibition on reinterpreting `relay-NNNN`,
and a three-row position table.

**Reading taken:** MG1 = make the three global-tail components authority-aware while
exactly one authority exists (null-result verification and the non-reopening window as
sub-verdicts); MG2 = legacy `relay` makes no G1 claim and cannot be reinterpreted as
`(authority=relay, seq=NNNN)`, and MUST 2 cannot rescue it.

**Rejected:** treating the three-row position table as three rows under rule 3's "split at
each table row", giving MG1 (authority-aware) + 3 = 4 units (total 59).

### A12 — "the Definitions section"

Rule 2(c) says "the Definitions section", definite and singular. Only AMENDMENT.md has one.
SPEC.md defines `bound`, `held`, `witnessed` in a table, and G1/G2a/G2b in another.

**Reading taken:** D = the amendment's 12 definitions only. Supported by D1–D12 matching
that section exactly.

**Rejected:** including the spec's capabilities and guarantees tables (+6; folded into A6's
count above).

### A13 — Front matter and narrative sections

The spec's title note, Status, Scope, "What this document certifies", "The incident this
exists for", "What a witness does", "What is not covered", and "Deferred to a separate
issue" contain claims that read normatively but sit in no category of rule 2.

**Reading taken:** not units, under A6's closed reading. The spec's own note that the
kernel and profile sections "constrain no requirement below" (finding F10) supports this
for those two sections, but says nothing about "What a witness does" or "What is not
covered", where I am relying on A6 alone.

**Rejected:** the open reading (A6).

### A14 — Rule 5 is untestable in this run

Rule 5 governs when an id changes across versions. I have no prior unitization to compare
against — rule 4's enumeration is a list of ids, not a mapping of ids to text — so I cannot
verify that any id I assigned is the same id the earlier allocation assigned to that text.
C1–C6 in particular assume K1–K6 map to C in order, which nothing states.

**Reading taken:** assign in document order within each family and mark the assumption.

**Rejected:** declining to reuse rule 4's ids at all and allocating fresh ones, which would
guarantee no false continuity but would discard the only allocation record available.

### A15 — Document order across two documents

The rule says nothing about how two documents interleave. The amendment's MUST 9 and
MUST 10 continue the spec's MUST sequence conceptually but appear in a different file.

**Reading taken:** SPEC.md in full, then AMENDMENT.md, each in its own document order.

**Rejected:** merging M9/M10 into the spec's MUST section listing, which would read more
naturally by id but would misrepresent where the text lives.

---

## §4 Note on what this is

One artifact: the list above and the record of where the rule ran out. It is not an
assessment of the rule, of the documents, or of any implementation. Of the 57 units, 49
are ids the rule allocated and 8 are extensions I made where the allocation stopped;
15 places in the cut were not determined by the rule and are recorded in §3.
