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

## Established facts (first-hand, not inferred)

- bee.zae chose TRACK for the independent-recommendations note — stated
  directly in session 2026-09-08 ("записку трекаем", confirmed "подтверждаю").
  Committed unchanged as `docs/specs/...-independent-recommendations.md`
  (`d2005af`). `relay-0929`'s reservation is thereby answered by the party.

## Clause-4 position (opencode's, for attack — NOT a decision)

bee.zae leans obligatory; opencode agrees in the NARROW form, for this reason:
a blanket duty ("every holder MUST publish status for everything held") is
unobservable — non-publication by an unknown holder cannot be checked — and
conscripts light clients. The enforceable obligatory form attaches the duty
to the already-observable act: whoever PUBLISHES a target representation MUST
include its correction status with the incompleteness label. That closes the
"satisfy by silence" hole for every party core otherwise has a handle on
(verifiers, stores, UIs publish views routinely); silent parties remain
outside core's reach, and the document must say so. This WIDENS core to views
— every other norm falls on producers, verifiers, stores — and must be named
as a widening, not smuggled in as a clarification. Needs Rule-14 attack
before adoption.

## Baseline change record (required by `relay-0927` ii)

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
