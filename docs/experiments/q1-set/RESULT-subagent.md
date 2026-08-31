# Which text in `SPEC.md` is normative

## 0. Integrity

`sha256sum SPEC.md` = `847b8971d36390cd8843da7ebe59bc3499cd8050473425eb91a4a09f30b9901c`, which **matches** the
line for `SPEC.md` in `PIN.txt`. (`PIN.txt` also pins `CONTRACT.md`; that line also matches.)
`SPEC.md` is 410 lines. All line numbers below are from that file.

## 1. The rule

**Rule as stated before applying it (v1).** A passage is normative if it states an obligation,
permission, or prohibition that conduct under this specification could violate or exercise —
whether or not it carries a keyword — and non-normative if it reports, measures, narrates,
justifies, defers, or merely refers to such a provision stated elsewhere.

**The rule had to be refined.** Applying v1 to lines 33–94 gives the wrong answer against the
document's own evidence: line 91 says "the requirement is that the named bytes be obtainable",
which v1 reads as an obligation, while lines 61–68 declare that exact material binds nothing.
Applying v1 to lines 26, 336, 388–392 also promotes passages that restate provisions the document
itself locates elsewhere (line 45 assigns the exceptions ban to `MUST 1`).

**Rule as refined (v2), and the one actually applied.** A passage is normative if it states an
obligation, permission, or prohibition governing conduct under this specification — recording who
it addresses, since not every addressee is an implementer — **except** that (a) a passage the
document expressly declares non-binding is non-normative regardless of its wording, and (b) where
one provision appears in more than one place, the force sits at the statement the document points
to as its home, and the other occurrences are restatements.

v1 and v2 differ on exactly three groups: lines 33–94 (out under v2, partly in under v1), the
restatements at 26–27, 336, 388–392 (out under v2, in under v1), and the addressee column, which
v1 does not record at all.

## 2. Normative passages

Line ranges give the whole provision; where a provision contains non-normative matter I say so.

| lines | first words | note |
|---|---|---|
| 151–154, 157–166 | "1. Each authority binds `(authority_id, seq)` uniquely," | MUST 1. Binding core = the uniqueness/monotonicity/no-reuse sentence, "**Allocation MUST be settled by an atomic exclusive commit, never by reading the current maximum**" (152–153), and the mechanism paragraph "**Allocation mechanism (v1):** each id owns a persistent allocation marker" (157) through "the marker guards allocation, the record `wx` guards content" (166). |
| 170–171 | "2. **An authority MUST declare the seq from which it claims G1," | MUST 2. |
| 173–174 | "3. Record content is identified by `sha256(bytes)`, stable across ids." | MUST 3. No modal keyword; binds by position (see B4). |
| 175–176 | "4. A **conforming** authority's ledger is non-rewindable:" | MUST 4. |
| 178–180 | "5. `parent`, when present, is scoped to the same authority." | MUST 5. |
| 181–189 | "6. Visibility state is exposed honestly: `PRESENT` / `KNOWN_MISSING` / `UNKNOWN`." | MUST 6, including both sub-bullets (184–186, 187–189), which carry the two dispositions. Line 183 "Two cases the first draft left undefined, both raised by Gemini:" is editorial framing. |
| 190 | "7. The absence of a witness is reported **as absence**," | MUST 7. No modal keyword. |
| 191–196 | "8. **Every write that establishes a binding MUST be crash-atomic AND create-or-fail.**" | MUST 8, through "Create-or-fail: a write to an id already held FAILS rather than replacing what is there." (195–196). |
| 205 | "- Content deduplication across ids." | MAY. |
| 206 | "- Witnessing and inclusion evidence — one or more witnesses, best-effort." | MAY. |
| 207 | "- Key rotation or multi-key authority. Operational, not protocol." | MAY. |
| 208–209 | "- A deterministic reading order across authorities" | MAY, with its own limit: "A **convention**, never a guarantee." |
| 210 | "- Replication and availability of bytes." | MAY. |
| 214–215 | "- MUST NOT claim a global total order across authorities" | MUST NOT. |
| 216–217 | "- MUST NOT let witnessing masquerade as ordering." | MUST NOT. |
| 218–219 | "- MUST NOT present a vantage-limited verdict" | MUST NOT. |
| 220–222 | "- MUST NOT make deposit depend on the parent being present and readable." | MUST NOT. |
| 223–224 | "- MUST NOT silently strengthen." | MUST NOT. |
| 225–227 | "- **MUST NOT be read as attesting that a record says what its author meant.**" | MUST NOT; addressee is the reader, not the implementation (B12). |
| 231–235 | "A witness attests one of three different things and the model must name which:" | Lower-case "must", outside the keyword sections; the (a)/(b)/(c) list is the content it must name from. |
| 244–245 | "**Recommended** as the witness form for this protocol," | Advisory strength only; the document has no SHOULD tier (B10). |
| 248–249 | "So the protocol **records** who witnessed and when, and never asserts they were independent." | Declarative-present prescription (B11). |
| 254 | "Stated so that no implementation promises it:" | The directive; the bullets 256–286 are the list it ranges over (B13). |
| 290–294 | "A citation references one record and MUST be a **(locator, digest) pair**," | Including the two definition bullets 293–294, which supply the pair's terms. |
| 296–300 | "**Cross-store citation is normative (chatgpt relay-0354):**" | The document's only self-labelling of a passage as normative. |
| 309–312 | "A locator standing in for the pair — a bare `relay-NNNN` cite, or a content-derived label — is insufficient" | Restates 290 but extends the prohibition to content-derived labels (B17). |
| 314–320, 322–326 | "**Envelope convention (chatgpt relay-0354; claude relay-0342).** The store-assigned id is the authoritative record identity" | Binding parts: id is store-assigned and not authored (314–316); "it is OPTIONAL but, when present, MUST be checked against the store-assigned id" (317–318); the header-block scope and "must not be adopted or rejected as one" (318–320); source ids travel "as explicit *source* metadata in an import wrapper, never as the local id" (322–324); "Out-of-chain is represented by omitting `parent:`" (324–325); "`from:`/`to:` are provenance and routing claims, not cryptographic identity" (325–326). |
| 334 | "the ledger MUST be written **before** the record, or an id is handed out twice" | A MUST inside a table in a descriptive section; this ordering is not stated in these terms in the MUST section. |
| 335 | "A durable record MAY be unwitnessed" | A MAY keyword outside the MAY section. |
| 351 | "**These must be made authority-aware while exactly one authority exists.**" | Addressed to this project's three named components, not to a third-party implementer (B15). |

## 3. Considered and excluded

Every remaining line of the document, by range.

| lines | first words | reason excluded |
|---|---|---|
| 1 | "# Issue #1 · Crash-durable binding" | Heading; names the subject, states nothing (B3). |
| 3–6 | "> **The title used to read \"Durable binding\" and that over-promised**" | Editorial note on a rename; history. |
| 8–10 | "**Status:** draft for review. Not posted." | Status and attribution. |
| 12–18 | "**Scope — narrowed, and this is a change from what issue #1 was filed about.**" | Applicability and deferral, not a requirement; see B16 for "stating it is not optional". |
| 20–31 | "> **Twenty rounds settled this; relay-0294 is where it converged.**" | Editorial note: change history and argument. Contains the exceptions ban at 26–27, whose home line 45 gives as MUST 1 (B8). |
| 33–57 | "## What this document certifies, and what it cannot" | Declared non-binding at 61–62 ("the one above it"); B1, B2. Includes "must never be scored against each other" (57). |
| 59–94 | "## The trusted kernel — six conventions, one name deep" | Declared non-binding by its own note at 61–68; includes the K1–K6 table, the version-recursion paragraph, and the availability paragraph 88–94 (B2). |
| 96 | "---" | Rule. |
| 98–106 | "## The incident this exists for" | Narrative of `relay-0183` plus code citations; 105–106 is framing for what follows. |
| 108–117 | "## Three guarantees, kept apart" | Definitional; G1/G2a/G2b are the vocabulary the provisions use (B14). Includes the scope note "← **all v1 promises**" (113). |
| 119–147 | "## Capabilities, and their monotonicity" | Definitional and argumentative; fixes `bound`/`held`/`witnessed` and records audit finding F9 (B14). Line 134 "should read" is a vocabulary note (B18). |
| 149, 203, 212 | "## MUST", "## MAY", "## MUST NOT" | Headings. They state nothing themselves but assign force to what sits under them (B22). Blank lines are omitted from this table. |
| 154–156 | "This matters even with one authority:" | Justification and measurement inside MUST 1. |
| 160–162 | "(capsule 04 measured 16 racing writers → 16 distinct ids, 0 duplicates)" | Measurement inside MUST 1. |
| 166–169 | "Measured cost: one empty file per id," | Measurement and a deferral inside MUST 1. |
| 171–172 | "Without this the contract has no vocabulary for an authority with a history" | Rationale; "See *Migration*." is a pointer (B19). |
| 174 | "Record identity and content identity are different things" | Clarification attached to MUST 3. |
| 176–177 | "Equivocation by a conforming authority is therefore *prevented*, not detected." | Consequence drawn from MUST 4. |
| 183 | "Two cases the first draft left undefined, both raised by Gemini:" | Editorial framing of MUST 6's sub-bullets. |
| 196–201 | "Both properties are named because they are separable" | Rationale, measurement (`relay-0407`), and audit history (`audit-03 F1`) inside MUST 8. |
| 229–230 | "## What a witness does, exactly" | Heading and lead-in. |
| 237–243 | "**A witness detects rewrite. It does not prove inclusion**" | Descriptive claims about witnesses plus the hivemark measurement that grounds the recommendation at 244. |
| 247–248 | "Independence cannot be enforced by a protocol" | Argument supporting 248–249. |
| 249–250 | "Readers judge. This is what `deposited-by:` already does with channels." | Description of existing behaviour. |
| 252–253 | "## What is not covered" | Heading. |
| 256–286 | "- Availability of any record." | The non-guarantee list; content that 254 and 223 range over, stating no obligation itself (B13). Includes the reconciliation of audit finding F5 (256–262) and finding F4 (272–281). |
| 288–289 | "## Citing a record" | Heading. |
| 302–307 | "The pair is **self-contained and nesting-safe**:" | Rationale for 290, and the fix history for OBS-063. |
| 320–321 | "Forbidding it throws away the only pinnable identity;" | Rationale inside the envelope paragraph, with a measurement from `deposit.ts`. |
| 327 | "(F4 stays unresolved until a signature layer exists)." | Status of an audit finding. |
| 329–332 | "## Named failures" | Heading and table header. |
| 333 | "partition ... merge is union" | Cross-authority behaviour, which 16–17 and 405–410 defer (B20). |
| 336 | "the id stays bound. Deletion removes the record but **never** the allocation marker" | Restatement of MUST 1's marker rule (162–163); B9. |
| 337–339 | "duplicate content ... equivocation" | Outcomes restating MUST 1, MUST 4 and MUST NOT 223. |
| 341–349 | "## Migration, and the one step with a deadline" | Heading plus measurement of three existing components. |
| 352–356 | "Not for tidiness — because with one authority the change is verifiable by a **null result**" | Rationale for 351. |
| 358–359 | "**This change has a window that is open only while exactly one authority exists**" | Emphasis; the timing is already inside 351. |
| 361–387 | "### The legacy authority" | Measurement of the existing store and the argument that MUST 2 cannot rescue it. |
| 388–392 | "\| **v1** \| exceptions forbidden \|" | Summary of positions taken elsewhere; B9. |
| 394–397 | "MUST 2 exists for the third row." | Refers to a requirement rather than stating one (B7). |
| 399–403 | "**And the question of extracting exceptions from history does not arise in v1**" | Explicitly deferred: "That is deferred with the ledger, not solved here." (B21). |
| 405–410 | "## Deferred to a separate issue" | Explicitly out of scope. |

## 4. Borderline cases

Every case where the rule did not decide cleanly.

**B1 — Where does the non-binding declaration start and stop?**
Lines 61–62 read "**This section and the one above it constrain no requirement below** (audit finding
F10, pin `6dfcce1`)." *Chosen:* "this section" is the one headed at 59, running to 94 (line 96 is a
rule, 98 the next heading); "the one above it" is the section headed at 33, running to 57. Coverage
is therefore **lines 33–94**, including the declaration itself. *Alternative:* "the one above it"
means only the paragraph immediately above the blockquote — but the blockquote is the first thing
after the heading at 59, so there is no such paragraph; or that the declaration reaches back further,
to the front matter at 1–31. *Would change:* under the second reading, lines 1–31 join the covered
span — no listed item moves, since I already exclude 1–31 on other grounds, but the exceptions ban at
26–27 would then be excluded by declaration rather than by restatement.

**B2 — Does "constrain no requirement below" mean "is not normative"?**
Line 66 adds "An implementer can build from the MUST/MAY/MUST NOT sections alone and lose nothing."
*Chosen:* treat 33–94 as non-normative, so the availability paragraph at 88–94 — "**Availability of
the named bytes is inside the kernel**" ... "the requirement is that the named bytes be obtainable by
the party asked to reproduce" (91–92) — is excluded despite its wording. The declaration's own
reasoning supports this: it says the sections make "a claim about *readers of the spec*, not about
implementations of it" (65–66), and the availability paragraph does address a verifier, not a store.
*Alternative:* read 88–94 as normative, on the ground that 256–260 calls it "the kernel's availability
requirement" and works to reconcile it with a non-guarantee — a document does not usually reconcile
against something that binds nothing. *Would change:* lines 88–94 enter the normative list as an
obligation on the party publishing bytes a verdict names, and the first bullet of "What is not
covered" (256–262) becomes a boundary between two live requirements rather than commentary on one.

**B3 — Read literally, line 66 would also strike the citation rules.**
"the MUST/MAY/MUST NOT sections alone" names three sections; taken as a general statement of where
requirements live, it excludes 290–327 and 334 as well. *Chosen:* read 66 as scoped by the sentences
around it (62–63: "Of K1–K6 only K3 reappears"; "no MUST cites the kernel"), i.e. a claim about the
kernel material, not a map of the document. *Alternative:* read it literally. *Would change:* lines
290–294, 296–300, 309–312, 314–326, 334 and 335 all leave the normative list, and the document's own
label "Cross-store citation is normative" (296) would stand in direct contradiction to line 66.

**B4 — Does a passage need a keyword to bind?**
*Chosen:* no. Position decides inside the three keyword sections, and the document supplies the
evidence: MUST 3 (173) and MUST 7 (190) contain no modal at all, none of the five MAY bullets
(205–210) contains "MAY", and the document nevertheless cites them as provisions — "does not satisfy
MUST 1" (363), "only K3 reappears, in MUST 3" (62), "what MAY covers" (261), "(MUST 1)" (45).
*Alternative:* require a keyword. *Would change:* MUST 3, MUST 7 and all five MAY bullets leave the
list, as would 231, 248–249, 254, 314–316 and 324–326; and line 363's claim about MUST 1 would have
nothing to attach to, since MUST 1's first sentence has no keyword either.

**B5 — Is there normative text outside the sections that look normative?**
*Chosen:* yes — 290–300, 309–326, 331–335, 351, and 231/244/248–249/254. The strongest single piece
of evidence is the document labelling one of them itself: "**Cross-store citation is normative
(chatgpt relay-0354):**" (296). *Alternative:* confine force to 149–227. *Would change:* the
citation format, the cross-store third element, the envelope `id:` check, the ledger-before-record
ordering at 334 and the migration deadline at 351 all become commentary, and the only requirement
about citations anywhere in the document disappears.

**B6 — Do sub-bullets, tables and parentheticals inside a provision inherit its force?**
*Chosen:* sub-bullets and definitional sub-parts do (MUST 6's two bullets at 184–189; the locator and
digest bullets at 293–294; the (a)/(b)/(c) list at 233–235); embedded measurements and citations do
not, even inside a numbered MUST (154–156, the parenthetical at 160–162, "Measured cost:" at
166–169, the `relay-0407`/`audit-03 F1` matter at 196–201). *Alternative:* a numbered provision binds
whole and indivisible. *Would change:* MUST 1 would then require, as part of the provision, that
concurrent allocators be measured at 16 racing writers and that cost be one empty file per id;
MUST 8 would carry the `rename` narrative as a requirement. The document's own separator is
typographic — the mechanism paragraph at 157 is introduced with a bolded label ("**Allocation
mechanism (v1):**") while the measurements sit in parentheses or after "Measured cost:".

**B7 — Does a sentence that names a requirement by number state one?**
Instances: 45 "(MUST 1)", 62 "in MUST 3", 363 "does not satisfy MUST 1", 380 "**Nor can MUST 2 rescue
it.**", 394 "MUST 2 exists for the third row." *Chosen:* all refer; none states. The sharpest case is
line 24: "MUST 2 let an authority declare exceptions and said nothing about *when*" — past tense,
describing a clause the same blockquote says was removed ("resolved by removing the clause it was
about", 24). *Alternative:* treat such sentences as restating the provisions they name. *Would
change:* line 24 would reinstate a permission to declare exceptions that lines 26 and 390 say v1
forbids, and 394–395 would add to MUST 2 a clause about what it is "not a mechanism for".

**B8 — The exceptions ban lives in a blockquote.**
Lines 26–27: "**v1 forbids exceptions**: an authority claims G1 only if it has never reused a seq."
*Chosen:* non-normative restatement — line 45 names the ban's home as MUST 1 ("v1 handles it by
*forbidding exceptions* (MUST 1)"), and MUST 1's "never reuses a seq" (151–152) carries it.
*Alternative:* normative, since 26–27 is the only place the ban is put in imperative form and the
`>` marker is editorial styling rather than a force marker. *Would change:* little in practice — an
authority declaring an exception presupposes a reuse and so violates MUST 1 either way — but the ban
would then sit in a passage whose surrounding sentences are change history, and 390's table row
"**v1** | exceptions forbidden" would become a second statement rather than a summary.

**B9 — Restatements in the "Named failures" and "consistent position" tables.**
Line 336 restates MUST 1's marker rule; lines 388–392 restate MUST 2 and the ban. *Chosen:* exclude
both as restatements (rule v2(b)), while including 334 and 335, which state things the MUST/MAY
sections do not state in those terms. *Alternative:* include all table cells that carry a modal.
*Would change:* 336 and the row "**a future authority** | may declare a floor, and must satisfy v1's
rules above it" (392) would enter. Row 392 is the one that is not purely restatement: MUST 2 says only
that an authority must declare a floor and "MUST NOT claim G1 below it" (170–171); "must satisfy v1's
rules above it" is the complement, stated nowhere else in those words.

**B10 — "Recommended" with no SHOULD tier.**
Line 244: "**Recommended** as the witness form for this protocol, on that ground rather than on
hivemark's authority." *Chosen:* normative at advisory strength — it is bolded in the same style the
document uses for MUST/MAY/MUST NOT, and it directs a design choice. *Alternative:* commentary,
because the document declares its vocabulary as a "MUST/MAY/MUST NOT contract" (9) and provides no
recommendation tier. *Would change:* 244–245 leaves the list, and nothing in the document then
expresses a preference between publishing leaves and publishing proofs.

**B11 — Declarative present tense about "the protocol".**
Line 248: "So the protocol **records** who witnessed and when, and never asserts they were
independent." *Chosen:* prescriptive — the document is the protocol, and the same grammatical form
carries MUST 3, MUST 7 and MAY. *Alternative:* descriptive of a protocol described elsewhere.
*Would change:* the only statement requiring that witness identity and time be recorded leaves the
list; the MAY bullet at 206 would permit witnessing without saying what must be recorded.

**B12 — Provisions addressed to readers rather than implementations.**
Line 225: "**MUST NOT be read as attesting that a record says what its author meant.**" Also 231's
"the model must name which", and, if B2 goes the other way, 88–94. *Chosen:* include them, recording
the addressee, because 225 sits in the MUST NOT list and position decides there. *Alternative:*
restrict normativity to obligations on implementations. *Would change:* 225–227 and 231–235 leave the
list, and the MUST NOT section would become non-uniform — five of its six bullets binding, one not.

**B13 — Does "What is not covered" bind?**
Line 254: "Stated so that no implementation promises it:". *Chosen:* the framing line is normative
(no implementation may promise these); the bullets 256–286 are the content it ranges over and state
no obligation of their own. *Alternative:* treat the whole section as descriptive scope, with its
force borrowed entirely from "MUST NOT silently strengthen" (223). *Would change:* line 254 leaves
the list; the effect on an implementation is the same via 223, but the non-guarantee list would then
have no independent binding anchor and 223's content would be defined by a section that binds nothing.

**B14 — Do the definitions bind?**
The G1/G2a/G2b table (110–114) and the `bound`/`held`/`witnessed` table (127–131). *Chosen:*
definitional, not requirement-stating — excluded. *Alternative:* normative by incorporation, since
MUST 1 says "This is G1, localised" (152), MUST 8 turns on "an id already held" (195), and 121–125
records that an audit (finding F9) found `held` used in three senses. *Would change:* 108–117 and
127–134 enter the normative list as definitions, and the sense of `held` fixed at line 130 ("its
bytes are here now") would be a binding reading of MUST 8 rather than background.

**B15 — Line 351 addresses the project, not an implementer.**
"**These must be made authority-aware while exactly one authority exists.**" *Chosen:* normative,
lower-case modal notwithstanding; it imposes an obligation with a stated window on named artefacts
(`reference.ts:94`, `nextFree()`, `check-continuity`). *Alternative:* project planning, outside the
specification's normative content, since a third party implementing v1 has no such components.
*Would change:* 351 leaves the list, and the "Migration" section becomes wholly descriptive.

**B16 — "stating it is not optional" (line 18).**
*Chosen:* excluded — the obligation falls on whoever presents or restates the document, not on
conduct under it, and the sentence is inside a scope paragraph. *Alternative:* normative, since it is
the one place the document says something is not optional outside the keyword sections. *Would
change:* lines 12–18 enter as a requirement that the narrowing be stated wherever the spec is
carried, which would make the scope paragraph itself unremovable.

**B17 — 309–312 restates 290.**
*Chosen:* include, because it extends the prohibition beyond 290's "never a locator alone" to
"a content-derived label" and settles the status of the shorthand ("the locator alone is a
convenience shorthand, not the citation", 311–312). *Alternative:* exclude as restatement under rule
v2(b). *Would change:* content-derived labels would be prohibited only by inference from 290, and the
OBS-063 case at 305–307 would have no clause to attach to.

**B18 — "should read" (line 134).**
"'The id holds an occupant' is loose and should read 'the id is bound to a record which is held'."
*Chosen:* excluded — guidance about the document's own prose. *Alternative:* a normative naming rule
for implementations reporting state. *Would change:* 133–134 enters, constraining the wording of
messages an implementation emits, which nothing else in the document does.

**B19 — "See *Migration*." (line 172).**
*Chosen:* a pointer; it does not pull 341–403 inside MUST 2. *Alternative:* incorporation by
reference. *Would change:* the legacy findings at 363–384 and the position table at 388–392 would
inherit MUST 2's force, and MUST 2 would then itself assert that authority `relay` makes no G1 claim.

**B20 — "merge is union" (line 333).**
*Chosen:* excluded — it states behaviour for cross-authority operation, which lines 15–17 and 405–410
defer to a separate issue. *Alternative:* normative, as the only merge rule stated anywhere.
*Would change:* the row would enter the list as a requirement about material the document twice says
it does not cover.

**B21 — Rules stated for a future version (399–403).**
"the exception list is *derived by any reader, never declared*" (401). *Chosen:* excluded; the same
sentence group says "That is deferred with the ledger, not solved here." (402–403). *Alternative:*
normative for any implementation that does build a ledger. *Would change:* 399–403 enters as a
constraint on the deferred design, alongside 405–410 which the document marks as out of scope.

**B22 — Do headings bind?**
*Chosen:* no heading states a requirement, including the title at line 1. But "## MUST" (149),
"## MAY" (203) and "## MUST NOT" (212) assign force to what sits under them — this is what makes MUST
3, MUST 7 and the MAY bullets binding without a keyword (B4), and the document refers to provisions by
that assignment ("MUST 1", "MUST 2", "MUST 3", "what MAY covers"). *Alternative:* headings are pure
navigation and force comes only from wording. *Would change:* the eight items under "## MUST" would
have to be re-sorted one by one, and MUST 3 and MUST 7 would drop out entirely.

**B23 — "convention" as a weakening word.**
The envelope rules sit under "**Envelope convention**" (314), while line 209 uses the same word to
withhold force: "A **convention**, never a guarantee." *Chosen:* the heading word does not weaken
314–326, because that paragraph carries "OPTIONAL", "MUST be checked" (317) and "must not be adopted
or rejected as one" (319) in its own text. *Alternative:* read "convention" consistently across 209
and 314 as marking non-guarantees. *Would change:* the whole envelope paragraph leaves the normative
list, including the `id:` check, despite containing two explicit keywords.
