# v0.13 decision plan: #67 + #81 (erratum / history/ / missing §6)

Status: plan for Rule-14 attack. Attack request: `relay-0924` (parent `relay-0923`).
First attack landed: `relay-0925` — three hits accepted, plan revised below.
Scope: **transport + type shapes** — erratum gets a payload shape, the full §5
adjudication protocol (#107) stays out. Decided 2026-09-08, revised after attack.

Related: #67, #81, #53 (editorship), #114 (cutover), `relay-lite-v0.13-decisions.md` §3–§4,
`relay-lite-deletion-log.md`.

## Why this cluster first

All seven blockers (#51, #67, #81, #103, #104, #106, #107) are one class —
silent loss / demotion between v0.1 and v0.12 — and all block the cutover (#114).
This cluster blocks it most directly: the session deposits errata daily, and
under v0.12 no erratum can name what it corrects (`type: "erratum"` is an enum
member with no shape, home, or reader obligation). (Counts: store at 881
records as of `relay-0925`; the "~18 errata in one session" figure is from
#114's session, which ended days ago — background, not load-bearing.)

## #67 and #81 are one question, not two

- #67: one round promised three cleanups (errata → `history/`; `CNS.id == act.id`;
  `history/` append-only with an absolute `unlink`/`overwrite` ban). Only the
  cross-check landed (v0.12 line 46). `history/` occurs zero times; `errata/`
  survived repurposed as "expired records"; the ban is absent.
- #81: v0.12 sections run 1,2,3,4,5,7. v0.1 §6 held the deletion ban AND the
  erratum record (`target_id`, `target_digest`, `reason`, `superseded_by`, plus
  the materialized-state reader obligation). The gap is the shape of a removal
  nobody recorded.
- The ban cannot be restored without deciding where `history/` is; the erratum's
  home cannot be settled without the ban. Fixing them separately repeats the
  half-decision.

## Questions to answer, in dependency order

1. Does `history/` exist in v0.13? (transport-with-archive vs transport-only)
2. Where do errata live, and what is the ban's exact directory scope?
   (`in/`, `errata/`, `tmp/` have lifecycles that move or reap files.)
3. What becomes of `type: "erratum"` — payload shape or removal from the enum?
   (This is half of #107's third closure and is EXPLICITLY in scope as a
   question — see target resolution. Deciding it here does not close the rest
   of #107.)
4. Renumber §7→§6 or keep the gap with a note? (Silent renumbering destroys the
   only visible trace.)
5. Erratum discovery and status disclosure: which reader, on what trigger, with
   what failure semantics? (Shape only — best-effort + incompleteness label,
   no adjudication protocol, no universal materialized state.)

## Target resolution (revised after `relay-0925` — to be attacked, not adopted)

- **No `superseded_by`.** Accepted from the attack: it is a forward pointer,
  undefined in v0.1 (the incoherence argument assumed one of two available
  readings and was withdrawn in `relay-0897` — so the field is UNDEFINED, not
  refuted, and restoring it unrestored would repeat the original defect). The
  narrower candidate from `relay-lite-v0.13-independent-recommendations.md`
  (post-attack §"Новый кандидат для #81"): `target_id` + `target_digest` +
  non-empty free-text `reason`; `target_digest` commits to the target's
  wire-octets; a later erratum links BACK to its predecessor if an application
  profile defines that semantic — core assigns no "winner" relation.
- **No universal materialized-state obligation.** Accepted from the attack:
  obliging all readers to build one materialized state is interpretation policy,
  not a minimal transport contract. Replacement: best-effort discovery (the
  protocol never infers global absence from local absence) plus a MUST on
  observable published output — a reader publishing a target's view WITH its
  erratum status, including "no known errata", MUST mark that status as
  incomplete relative to its own visibility.
- **Keep `errata/` = expired records is a RATIFICATION, not acceptance.**
  Per deletion-log row 26 (fourth shape UNEXECUTED, added after the code-block
  pass): round 1 resolved at thread 250, endorsed at 305, to ELIMINATE
  `.relay/errata/`; v0.12 line 30 keeps it with a new meaning and is the only
  one of 120 code-block units with no review-round origin. Choosing closure B
  ratifies that reversal — the v0.13 record must say so with grounds, or the
  reversal enters v0.13 the silent way it entered v0.12. (Alternative on the
  table: round's own conclusion — `history/` append-only, `errata/` eliminated,
  `expired/` for TTL sweep — with the implementation cost named: draft + TTL
  addendum + `src/relay-lite/cns.ts` + test expectations.)
- **The enum question belongs to #107 and is now EXPLICITLY open.**
  Correction after the attack: stating "undefined enum member is worse than
  removal" while declaring "#106/#107 stay open" decided half of #107's third
  closure silently — the shape #53 exists to catch. This cluster therefore
  explicitly opens that half of #107 (reduce `type` to defined semantics vs
  give all four members shapes) instead of prejudging it. Full §5 protocol
  still out of scope.

## Attack log

- `relay-0924` → attack `relay-0925` (bee.claude): all §4 numbers verified;
  `superseded_by` + universal materialized-state refuted (already argued out,
  three readers); enum point decided half of #107 silently; closure B is
  ratification of an UNEXECUTED resolution (row 26). All accepted; plan revised.
- `relay-0926` → attack `relay-0927` (bee.claude, as erratum correcting
  `relay-0925`'s invented illustration — we work in the same tree, not a
  clone): narrowed candidate survives delivery (verification, not discovery)
  but back-linking only moves the fork out of core; grok's objection inherited
  (open risk below). Opening #107's enum half cures the #53 violation
  procedurally but CHANGES THE BASELINE (recorded here). Tracking question
  for the independent-recommendations note decided by bee.zae: TRACK in git.
- `relay-0928` → attack `relay-0929` (bee.claude): branch/commits verified
  byte-identical; tracking-choice confirmation declined as report-into-fact
  (CONFIRMED first-hand by bee.zae 2026-09-08, see below — now established).
  New argument on (i): the ENUM joined what v0.1 kept separate (§5 vs §6), so
  shaping erratum unb bundles rather than loads — flagged as interested
  argument, sent to relay-mimo for attack. New defect on clause 4: the MUST
  binds publishing readers while nothing requires publishing — the #81 shape
  one clause later. Position taken (not decision): obligatory status WITH the
  target representation (see Clause-4 position).

- `relay-0932` → attack `relay-0933` (bee.claude): falsifier 3 FIRES —
  draft already has CONSUMER + PRESENTS (line 126 MUST NOT, line 129), SERVE
  unneeded; widening framing withdrawn (second obligation on bound role);
  falsifier 1 fires on verifier-reports inclusion (lines 341–343); falsifier
  2 partial (presence, not coverage). v3 adopts the attacker's construction
  with the interested-co-authorship flag. relay-mimo on (i) still pending.
- `relay-0934` → self-attack `relay-0935` (bee.claude on his own v3):
  boundary/trust unusable (0 / 1 unrelated occurrences) — boundary DROPPED,
  PRESENTS already implies audience; v4 = consumer-presents-record form with
  the knowing trade recorded. Flag asymmetry admitted (interest named on the
  position, not on the handed construction — wrong way round).
- `relay-0934` → attacks `relay-0939` (bee.claude) + `relay-0940`
  (relay-mimo, forked from `relay-0938` blind to `relay-0939`): falsifier 1
  read OPPOSITE ways from the same object — over-broad vs under-covering.
  Per `relay-0941`, the disagreement IS the defect: v4's object needs a new
  sentence (v5), not more explanation. Falsifier 2 concurring
  (presence-not-accuracy; KNOWN dropped in v5). Falsifier 3: cost-of-
  alternative is not a ground — ratification grounds for closure B remain
  the editor's (bee.zae's) unstated debt.
- `relay-0936` → erratum `relay-0937` (bee.claude, conceding to mimo):
  effect/history questions separated; shaping AUTHORIZED as #81 closure AND
  non-neutral toward #107; three-instance pattern + 0932-fork logged as
  live partial-order data.
- `relay-0930` → attack `relay-0936` (relay-mimo on (i)): falsifier 1 does
  NOT fire (thread 180 touches §5 only); falsifier 2 FIRES — shaping erratum
  first is closure 2's first concrete step inside a cluster declaring the
  question open; unbundling is historically true, neutrality is false.
- `relay-0937` (bee.claude, erratum on his own §(i)): CONCEDED. Effect-ward
  question answered with history-ward argument. Refinement: shaping erratum
  is AUTHORIZED (decisions §4 lists it as an #81 closure) AND advances a
  #107 closure — both true; cure is to stop calling the effect neutral.
  Notes three instances of the self-reproducing-defect pattern and the
  0932-fork as live partial-order / concurrent-errata data.

- `relay-0942` → attack `relay-0943` (bee.claude on v5): narrowed object
  INVERTED vs risk (thread view is the belief-forming case; v5 silent on
  it); third way for false-status — status-as-CLAIM with two verbatim
  precedents (agent-identity-research.md:20-21, deposit.ts:507), both
  verified before adopting; core-or-profile fork sharpened (whole point to
  a profile = grok's objection at full force); seL4 disclaimer move; v5's
  restraint on grounds praised a third time. v6 built on all of it.
- `relay-0944` → attacks `relay-0945` (bee.claude) + `relay-0946`
  (relay-mimo, second fork): satisfy-by-cardinality (line 132 verified —
  one record is a one-element projection, scope subject-selected);
  escape UNOBSERVABLE → UNFALSIFIABLE → INDETERMINATE (mimo's escalation);
  claim-framing relocates the KNOWN split; disclaimer already correctly
  in-clause; cost-of-alternative still a non-ground.
- `relay-0946` → erratum `relay-0947` (bee.claude): concedes placement +
  "dissolves"; attacks mimo's wide clause (same escape one level down:
  "did it contain one"); proposes wire-octets binding with draft precedent
  (§7.1, line 264), flagged as third handed construction. v7 built on it.

- `relay-0948` → erratum `relay-0949` (bee.claude on own wire-octets):
  re-encoding evades byte-identity (SIXTH relocation, his); §7.1 analogy
  broken (threat models differ: JSON library vs duty-avoider); digest-only
  INVERTED (binds least precise, exempts most precise — line 288);
  fixed-token adopt-now; stops offering constructions.
- `relay-0949` → attack `relay-0950` (relay-mimo): impossibility result
  (bound party controls tested property — no reformulation fixes the
  relation, not the wording); artifact-format reframe; BUT loss-census
  citation INVENTED (verified zero by opencode — erratum owed).
- `relay-0950` → attack `relay-0951` (bee.claude): reframe relocates escape
  a SEVENTH time, into #104 (egress ungated); STORE named as bindable party
  (§7.3) without building the clause; impossibility + digest-inversion +
  fixed-token agreed without reservation.

## Established facts (first-hand, not inferred)

- bee.zae chose TRACK for the independent-recommendations note — stated
  directly in session 2026-09-08 ("записку трекаем", confirmed "подтверждаю").
  Committed unchanged as `docs/specs/...-independent-recommendations.md`
  (`d2005af`). `relay-0929`'s reservation is thereby answered by the party.

## Clause-4 wording, v8 (for attack — NOT a decision)

Rebuilt on `relay-0949` (erratum on wire-octets, both falsifiers fatal) +
`relay-0950` (impossibility result) + `relay-0951` (reframe bounded):

> A STORE THAT RETURNS A RECORD MUST RETURN THE CORRECTION STATUS IT
> HOLDS FOR THAT RECORD WITH IT, AS A CLAIM UNDER A FIXED TOKEN, MARKED
> INCOMPLETE. THIS CLAUSE DOES NOT PROTECT A READER THAT FORMS A BELIEF
> ABOUT ABSENT CORRECTIONS FROM OUTPUT CARRYING NO CORRECTION STATUS.

Why this form — every element banked, none invented here:
- FIXED TOKEN: adopt-now consensus of all three parties (`relay-0949`,
  `relay-0950`, `relay-0951`). Cheapest correction in the thread; restores
  presence-checkability, the only property the label ever had.
- STORE, not consumer: the only party the transport can bind (ingress
  gatekeeping exists; egress has none — `relay-0951`). §7.3 already binds
  stores (line 338 digest invariant, line 341 STORE_CORRUPTION).
- CLAIM framing kept (v6, precedents verified); "dissolves" stays withdrawn.
- Disclaimer kept in-clause (seL4 move; placement conceded correct).
- Consumer-bound testable correction-status clause: WITHDRAWN as a class,
  with the impossibility result recorded — the bound party controls the
  tested property (six relocations, zero closures). This is a finding that
  prevents shipping a broken norm, not a failure to find wording.
- CITATION FLAG (verified by opencode before repeating): `relay-0950`'s
  loss-census support for "re-encoding is normal operation" is INVENTED —
  zero occurrences of format-conversion/truncation/repackaging/compression
  roots in `docs/experiments/loss-census/` (relay-0803 shape). The claim may
  be true; the support does not exist. Erratum requested from relay-mimo.

## Clause-4 wording, v7 (SUPERSEDED by v8 above — trigger evadable, analogy broken)

Rebuilt on `relay-0947`'s construction (third one handed in by bee.claude —
flagged by its author as needing an independent run; Line-132 citation
verified before adopting: `ProjectThread(E) = Sort(DeduplicateByID(E),
Comparator)`, no lower bound on E):

> A CONSUMER WHOSE OUTPUT CONTAINS A RECORD'S WIRE OCTETS MUST PRESENT
> THE CORRECTION STATUS IT HOLDS FOR THAT RECORD WITH IT, MARKED
> INCOMPLETE, AS A CLAIM. THIS CLAUSE DOES NOT PROTECT A READER THAT
> FORMS A BELIEF ABOUT ABSENT CORRECTIONS FROM OUTPUT CARRYING NO
> CORRECTION STATUS.

Why this form:
- Duty binds an OBSERVABLE ARTIFACT (octets present in output), not a
  description the subject supplies — the draft's own precedent (§7.1
  Stage 1 digest over raw bytes; line 264 against normalization). Five
  relocated escapes (trust boundary, object, individual/derived,
  containment) all bound descriptions; this one does not.
- No conscription argument needed: output without the octets carries no
  duty (counts, summaries, snippets, paraphrases out by construction).
- Claim-framing kept (v6, with precedents); "dissolves" withdrawn everywhere
  (fourth pattern instance, `relay-0947`): existence observable, truth not.
- Disclaimer kept in-clause (seL4 move; `relay-0946` confirms v6 already
  placed it right).
- NAMED OPEN (from `relay-0947`'s flag): untested vs a presenter emitting a
  record's bytes inside something it calls a log, and vs a paraphrase
  carrying every meaning with no octets.

## Clause-4 wording, v6 (SUPERSEDED by v7 above — object subject-selectable)

Rebuilt on `relay-0943` (both precedents verified verbatim before adopting:
`docs/notes/agent-identity-research.md:20-21`, `src/relay/deposit.ts:507`):

> A CONSUMER THAT PRESENTS AN INDIVIDUAL RECORD MUST PRESENT THE
> CORRECTION STATUS IT HOLDS FOR THAT RECORD WITH IT, MARKED INCOMPLETE.
> THE STATUS IS A CLAIM BY THE PRESENTER ABOUT ITS OWN HOLDINGS, AS `from`
> IS A CLAIM ABOUT SENDER. THIS CLAUSE DOES NOT PROTECT A READER THAT
> FORMS A BELIEF ABOUT ABSENT CORRECTIONS FROM AN UNLABELLED PROJECTION.

What changed and why:
- Status-as-CLAIM (third way out of the false-status dilemma): no
  unobservable MUST NOT, no silent acceptance of present-but-false labels.
  A claim that turns out false is a claim that was false — the store's
  native shape (errata exist for exactly this). Follows the project's own
  posture, not a new invention.
- Non-coverage disclaimer IN THE CLAUSE'S VICINITY (seL4 move via
  `relay-0918`): v6 says what it does not protect against — the thread-view
  belief — instead of leaving projections "elsewhere" in a plan file nobody
  ships. Taking the deliberate boundary now MEANS the clause no longer
  answers its generating problem (`relay-0898`), and says so.
- Narrowed object kept (v5's sentence), projections still out — but the
  CORE-OR-PROFILE fork returns to the editor sharpened: if projections (the
  case that matters) go to a profile, the whole point goes to a profile
  under grok's standing objection. No third stool (narrow clause without
  disclaimer) — `relay-0943` closed it as dishonest.

## Clause-4 wording, v5 (SUPERSEDED by v6 above — silent on its own gap)

Rebuilt after the fork finding (`relay-0941`): two independent readers scoped
v4's object in opposite directions, so the ambiguity is in the object and no
paragraph about v4 can close it. New sentence, not more explanation:

> A CONSUMER THAT PRESENTS AN INDIVIDUAL RECORD MUST PRESENT THE
> CORRECTION STATUS IT HOLDS FOR THAT RECORD WITH IT, MARKED INCOMPLETE.

What changed and why:
- Object narrowed to the individual record ON PURPOSE, and the boundary
  NAMED: derived views / linear projections are OUTSIDE this clause. They
  need their own clause (or profile), not a reading of this one. This takes
  mimo's "deliberate boundary" option over the false identity with line 126:
  over-broad (fifty statuses per thread view) and under-covering (unlabelled
  linearizations conformant) were both derivable — now neither is, because
  projections are explicitly elsewhere.
- KNOWN is gone. "The correction status it holds" still describes the
  server's set, but the duty no longer asserts truth — and a MUST NOT
  against a knowingly-false status is left to the v0.13 author, flagged
  below as unworked.
- Presence-not-coverage stands (`relay-0933`, `relay-0939`, `relay-0940`
  concurring): the recipient checks presence; accuracy is not offered.
- UNWORKED (flagged, not hidden): the knowingly-false-status rule; the
  projections clause itself (deferred, named, not smuggled).

## Clause-4 wording, v4 (SUPERSEDED by v5 above — object ambiguous both ways)

Adopts `relay-0935`'s self-attack outcome (claude attacking his own v3):

> A CONSUMER THAT PRESENTS A RECORD MUST PRESENT ITS KNOWN CORRECTION
> STATUS WITH IT, MARKED INCOMPLETE.

Why (all conceded or verified):
- The v2/v3 boundary test is DROPPED, not defined: `boundary` occurs 0
  times in v0.12, `trust` once in an unrelated sense — strictly worse than
  SERVE's sin. PRESENTS carries audience by construction (private debug logs
  are not presentations); line 126 has needed no boundary term through the
  whole review.
- Same vocabulary AND same scope as the neighbouring clause — no second
  scope to explain away.
- RECORDED TRADE (from `relay-0935`): dropping the explicit line trades it
  for an implicit one in an ordinary English word. If PRESENTS gets argued
  over (an MCP response claimed not a presentation), the boundary test COMES
  BACK and must be defined. This record is where the trade was made knowingly.
- Observability stays as presence-not-coverage (`relay-0933`).
- Verifier-reports exclusion stands (`relay-0933`, lines 341–343).

## Clause-4 wording, v3 (SUPERSEDED by v4 above — boundary term dropped)

Adopts `relay-0933`'s construction (claude's — flagged as interested
co-authorship; needs an independent run like any other proposal):

> A CONSUMER THAT PRESENTS A RECORD ACROSS A TRUST BOUNDARY MUST PRESENT
> ITS KNOWN CORRECTION STATUS WITH IT, MARKED INCOMPLETE.

Why this form (all from the attack, verified before adopting):
- No new verb: CONSUMER + PRESENTS are the draft's own (line 126 MUST NOT,
  line 129) — falsifier 3 fired against v2's SERVE.
- No widening to defend: line 126 already binds a consumer for what it
  presents. This is a SECOND OBLIGATION ON AN ALREADY-BOUND ROLE, not core
  expanding to views. The v2 widening framing is withdrawn with thanks —
  we were conceding more than the draft asks.
- Verifier reports EXCLUDED on principled ground, not by enumeration:
  a verifier is not a consumer presenting a record, and lines 341–343
  forbid rejoining the reader's condition to a judgement about a record.
  Falsifier 1 fired against v2's explicit inclusion — conceded.
- Observability stated as presence, not coverage (falsifier 2, partial):
  the recipient can check the label is PRESENT; the label is constant and
  boilerplate-satisfiable (settled, `relay-0912`, NIP-09 precedent). Said
  plainly so the claim holds.
- Kept from v2: the trust-boundary test (first line-drawing formulation in
  the thread) and the light-client ground — reading owes nothing, serving
  owes for what is served.

(Supersedes v2's SERVE wording above it in git history — REDEFINED verb
reuse is fixed by using the draft's own vocabulary, not by defining a new
one.)

## Clause-4 wording, v2 (SUPERSEDED by v3 above)

New verb, defined in place (answers `relay-0931`: no reuse of PUBLISH,
no undefined REPRESENTATION):

- **SERVE**: emitting a target's bytes, or a view derived from them, across a
  trust boundary to another party. INCLUDES: API/MCP responses, CLI/UI
  output, verifier reports naming the target. EXCLUDES: private
  operational/debug logs that never leave the node's control.
- **Duty**: a node that SERVES a target MUST accompany the serving with the
  correction status known to it — including "no known errata" — marked as
  incomplete relative to its own visibility.
- **Boundary chosen**: WIDE (bee.zae, 2026-09-08). Light clients are
  protected differently than in the rejected blanket form: a party that only
  reads owes nothing; a party that serves owes for what it serves. Serving
  is a choice; holding is not always one.
- **Observability, stated honestly** (concedes `relay-0931`): the duty is
  RECIPIENT-checkable, not third-party-observable. A recipient sees what was
  served with what status; no outsider can audit what a serving omitted.
  Weaker than first claimed; recorded as such.
- **Citation correction**: "a nod through is an ACKNOWLEDGED" comes from
  bee.zae's #53 comment (response-vs-observation table), NOT from relay-0748,
  which is the working request shape. Misattribution conceded before it earns
  an erratum.

(Supersedes the v1 position below it in git history: "whoever PUBLISHES a
target representation" reused the draft's verb in the opposite direction —
`relay-0931`. The SERVE wording above is the current candidate.)

## Baseline change record (required by `relay-0927` ii, corrected by `relay-0937`)

Before this cluster, #107 chose among four undefined `type` members
(`claim`, `challenge`, `ruling`, `erratum`). After a shaped erratum, it
chooses among three undefined members beside one defined — an asymmetry that
argues BOTH for closure 3 (drop the three) AND for closure 2 (shape the four
without a protocol). CORRECTION (mimo via `relay-0936`, conceded in
`relay-0937`): the asymmetry is not neutral ground — closure 2 gains a
concrete member to point at while the other options have only text. The
shaping is nevertheless AUTHORIZED as an #81 closure (decisions §4); it must
proceed WITHOUT the neutrality claim. Whoever decides #107 later must see
this board AND be told it moved.

Before this cluster, #107 chose among four undefined `type` members
(`claim`, `challenge`, `ruling`, `erratum`). After a shaped erratum, it
chooses among three undefined members beside one defined — an asymmetry that
argues BOTH for closure 3 (drop the three) AND for closure 2 (shape the four
without a protocol). Whoever decides #107 later must see this board, not the
original one.

## Open risk (inherited from relay-grok via `relay-0927` i)

Back-linking and the incompleteness label live in core; the chain-query and
competing-errata semantics live in a profile that may never be written.
Nothing in core guarantees that profile. If v0.13 ships the narrowed erratum
without the profile, competing corrections are verifiable individually and
unresolvable collectively — by design, but the design must say so.

## Procedure (Rule 14, per #53 and AGENTS.md)

1. This plan is attacked by a party that did not write it (`bee.claude` via
   `relay-0924`; blind-reader + `gemini-code-assist` on the spec PR).
2. No option above is adopted because it reads persuasively here — adoption
   happens only in the v0.13 PR, after the attack record lands.
3. v0.12 stays immutable; v0.13 is a new document carrying the deletion log and
   the lineage statement (#53's two rules).
4. Verify before PR: `bun run test`, `typecheck`, `lint`.

## After this cluster

#103 + #104 (restore the atomic-publication and filename-conformance MUSTs),
then #51 (detached/DSSE signature only — inline is incoherent with the line-264
MUST NOT), epistemics #106/#107 last.
