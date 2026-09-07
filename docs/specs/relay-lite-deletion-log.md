# Deletion log — what left between v0.1 and v0.12

Mandated by `#53`, which makes this project the editor of relay-lite and states the rule this
table follows:

> the **"removed in" column may name only a version that exists**, and the **"reason" column cites
> an issue or is left blank**. … A deletion log whose reason column is invented propagates the
> disease it was built to stop. **Blank is honest. Invented is not.**

`#53` records that an earlier attempt at this table broke that rule — it dated `signature?: string`
to *"Removed in v0.6"*, and attributed the TTL rows to `#50`, which is the units defect rather than
the restoration.

## Why no row names a version between the two

**Two documents exist.** `docs/sources/issue-5-thread.txt` carries v0.1; `relay-lite-v0.12-draft.md`
carries v0.12, with three addenda beside it.

The thread names **twelve** versions — v0.1 through v0.12. **Ten of those twelve labels name no
document.** v0.2 to v0.11 are stages of a conversation, and the draft was written once, at the
end. That is exactly how *"Removed in v0.6"* was produced: a conversational label read as an
artifact.

**So nothing here can be dated more precisely than "between v0.1 and v0.12", and no row tries.**

## How each row was found

Every row carries a line number in the thread and a line number in the draft, or "nothing". They
come from four sweeps whose predicates were sealed before the comparisons ran —
`docs/experiments/loss-census/` and `docs/experiments/rounds-read/` — and from the issues those
sweeps produced. Six rows were found by accident before the sweeps existed; the rest were found by
method.

## Shapes

| shape | meaning |
|---|---|
| `ABSENT` | not in v0.12 in any form |
| `DEMOTED` | in v0.12, with its normative marking gone |
| `REDEFINED` | in v0.12, meaning something else |

---

## The table

| # | what left | v0.1 | v0.12 | shape | reason |
|---|---|---|---|---|---|
| 1 | `signature?: string` — the envelope's verification field | line 78 | nothing | `ABSENT` | `#51` |
| 2 | `ttl` default of 3600 seconds | line 44 | nothing in the draft; restored in `addendum-ttl` | `ABSENT` | `#37` |
| 3 | the sweep origin `created_time(uuidv7) + ttl < now()` | line 101 | nothing in the draft; restored in `addendum-ttl` | `ABSENT` | `#37` |
| 4 | `[MUST NOT]` on deleting historical records | line 147 | nothing | `ABSENT` | `#60`, superseded by `#67` |
| 5 | `.relay/history/YYYY-MM/` — the append-only archive | line 30 | nothing | `ABSENT` | `#61`, superseded by `#67` |
| 6 | `.relay/errata/` as recorded errors, disputes and claims | line 29 | line 30, "expired records" | `REDEFINED` | `#81` |
| 7 | §6 — the Refuge / Erratum Model, and with it `target_id`, `target_digest`, `reason`, `superseded_by` | line 123 | nothing; `erratum` survives as an enum member with no semantics | `ABSENT` | `#81` |
| 8 | invariant 3 — separation of the four epistemic acts: Witnessing, Examination, Criterion, Verdict | line 15 | nothing; all four terms occur zero times | `ABSENT` | `#106` |
| 9 | §5 — the 4-Act Adjudication protocol, its three payload shapes, and the vocabulary `PASS` / `VIOLATES` / `UNDECIDABLE` | line 105 | line 250, four sentences on what `ruled_by` records | `ABSENT` | `#107` |
| 10 | the obligation that an independent agent *on a different epistemic path* supply a counter-example | line 105 (§5) | nothing | `ABSENT` | `#107` |
| 11 | `AGGREGATED_FINDING` — the measurement half of measurement-versus-ruling | line 236 | nothing; the term occurs twice in 2262 lines, both inside its own statement | `ABSENT` | `#107` |
| 12 | `[MUST]` that incoming filenames conform to §2's scheme | line 144 | lines 42 and 46 constrain two fields inside a name already assumed to parse | `DEMOTED` | `#104` |
| 13 | `[MUST]` that message writing be atomic | line 145 | lines 224-232, the mechanism with its reasoning, unmarked | `DEMOTED` | `#103` |
| 14 | `[MUST NOT]` that verifiers reject an act solely because its causal link is `UNCHECKABLE` | line 1461 | line 294, a consequence — *"rejects correct acts routinely"* — not a prohibition | `DEMOTED` | `#63` |
| 15 | `.relay/out/` — prepared replies before routing | line 28 | nothing | `ABSENT` | |
| 16 | `.relay/active/` — messages atomically claimed by one agent | line 27 | nothing | `ABSENT` | |
| 17 | the Claim-or-Fail stage — scan `in/` by `to=` prefix, move to `active/` | line 91 | nothing | `ABSENT` | |
| 18 | the Settle stage — move to `history/YYYY-MM/` | line 96 | nothing | `ABSENT` | |
| 19 | `MUST` that consumers deduplicate before sorting | line 570 | line 129, the formula verbatim with `MUST` gone | `DEMOTED` | |
| 20 | `MUST use` a deterministic presentation convention | line 315 | lines 129-134, the comparator unmarked between two siblings that kept their brackets | `DEMOTED` | |
| 21 | the arrival/queue-order half of the dual-order model, and *"no causality is derived from filename timestamps"* | line 242 | nothing; `arrival`, `queue`, `lexicograph`, `drain`, `worker` all occur zero times | `ABSENT` | |
| 22 | `MUST` that the verifier hashes the octets it received | lines 1290, 1345 | line 261, Stage 1 prose; the `[MUST NOT]` at 264 marks the *prohibition* this rule exists to protect | `DEMOTED` | |
| 23 | `MUST` that the three verification stages run in that order | lines 1445, 1475 | line 258, *"The ordering is normative"* — the only sentence in v0.12 that asserts its own normative force instead of carrying a marker | `DEMOTED` | |
| 24 | `MUST NOT` that a reader's visibility limit be reported as a defect in the author's record — *"the core epistemic invariant of `p-e`"* at its statement | line 1449 | invariant 4 at line 23, and the table cell at 285; neither marked | `DEMOTED` | |
| 25 | `MUST` that causal evaluation be total | line 1457 | line 321, *"Evaluation is **total**"* — asserted, not required | `DEMOTED` | |

**Eleven reason cells are blank.** Each names a loss with evidence and no issue filed yet. Blank is
the rule's answer for that, and filing an issue to populate a cell would be writing the reason
after the fact.

**Rows 22-25 come from `#63`'s second question**, which asked *"which other agreed requirements are
sitting in v0.12 as unmarked prose"* and noted that only the `[MUST NOT]` set had ever been
checked. The `[MUST]` set was censused in `docs/experiments/must-census/` — 55 occurrences of
`MUST` in the pinned thread, 26 distinct obligations, nine of them carried in v0.12 as unmarked
prose. Five were already rows 12, 13, 14, 19 and 20. **These four were in no row and no issue.**
Their reason cells are blank for the same reason the other seven are.

Row 24's v0.12 column was `relay-0903`'s weakest claim and `relay-0905` corrects it: the invariant
survives at **line 23 as well as** the table cell, which makes the loss smaller than first
reported. It is still unmarked in a document that marks obligation with brackets.

## What is not in this table

**Changes that were argued and recorded.** `to` widening from `string` to `readonly string[]`,
the HLC restructuring from `{wall_time, logical_seq, parent_digest}` to `{l, c, node_id}`,
`parent_digest` lifting to the top level, `rename` giving way to `link`, the terminal tie-break key
moving from `lexicographical(digest)` to `id` — every one has a round that records it. They are
not deletions; they are decisions, and a deletion log that swept them in would be a change log
pretending to be one.

**Anything the sweeps cannot see**, stated in their own predicates before they ran: a commitment
made outside the frozen thread, one weakened in wording rather than removed or demoted, and
anything neither document contains.

**Row 16 is the exception worth naming.** `.relay/active/` did not leave v0.1 — a review round
*agreed to specify it* (thread line 252) and the draft has none. It is in the table because it is
absent from v0.12; the shape is different from every other row and `relay-0879` records it as a
sixth kind.

## Standing

This table records **what left**. It takes no position on what v0.13 should restore, and `#53` is
explicit that editorship does not license deciding open questions by writing them down. Rows 1-14
have issues where the argument belongs; rows 15-21 have none yet.
