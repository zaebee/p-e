<!-- NOT A RUN -->
# Reader 3 — a stand for `jev-1.13`, registered before it runs

**NOT A RUN.** Not a `docs/reports/*-conformance-NN.md`, changes no catalogue.

`RESULT.md` closed this run at two readers — *"`chatgpt` and `relay-grok` were not dispatched —
bee.zae's call"* — and named what that leaves unresolved, including *"**item 30 is contested**
between the two and no third reader will settle it."* Reopening it at a third reader is bee.zae's
call too, and was made on 2026-09-22.

## This is not `CONTRACT.md`, and the difference is the point

The sealed contract is not edited and is not reused here. `jev-1.13` cannot run against it:

- **It cannot search.** It answers questions against a state it is given. The sealed contract has
  the reader locate each undertaking's rendering across the draft, three addenda and 2262 lines
  of thread. Here each undertaking's text is carried **in its own question**, extracted
  mechanically from the thread by the line numbers already in `ITEMS.md`, and the state is the
  draft plus its three addenda — about 11k tokens against a 32k state budget. The thread is never
  in the state.
- **It cannot reach three of the five verdicts.** `LANDED-ALTERED` and `SUPERSEDED` both turn on
  *"a later round records the alteration"*, which is a fact about the thread. The thread does not
  fit beside the draft in one state.

So the verdict set is reduced to the one distinction that survives the reduction:

| verdict | meaning |
|---|---|
| `arrived` | the draft carries what the undertaking promised, recognisably; wording may differ |
| `incomplete` | a component the undertaking promised is not in the draft |

**Stated once, here, because `RESULT.md` records that the sealed contract contradicted itself on
its own verdict set and that the cost of it could not be established afterwards.**

## The key, and how strong each entry is

Not written for this run. Taken from `RESULT.md`, where it was established by two blind readers
against a predicate sealed before either ran.

| item | thread line | key | strength |
|---|---|---|---|
| 3 | 234 | `incomplete` | **strong** — both readers reached `PARTIAL` independently, and both overturned the operator's own control |
| 5 | 242 | `incomplete` | **strong** — both readers `PARTIAL` |
| 11 | 570 | `incomplete` | **strong** — both readers `PARTIAL`. The exemplar: every noun survives and only `MUST` is missing |
| 46 | 2242 | `incomplete` | **strong** — subagent `PARTIAL`, gemini `NOT-LANDED`; they differ on grade, agree it did not fully arrive |
| 6 | 315 | `incomplete` | **weaker** — gemini said `LANDED-ALTERED`; adjudicated to `PARTIAL` against draft lines 129-134 |
| 28 | 1455 | `incomplete` | **weaker** — gemini said `LANDED-ALTERED`; adjudicated to `PARTIAL` against every occurrence of "reject" in the draft |
| all other scored items | — | `arrived` | |
| **30** | **1474** | **not scored** | **contested and left contested.** gemini `PARTIAL`, subagent `LANDED` |

**The two weaker entries are flagged because `RESULT.md` flags them itself:** *"The operator is
the interested party here and one ruling favours a verdict he also gave."* If jev dissents on 6
or 28 that is a third reading of a contested call, not a miss, and is reported as such.

## Registered before the run

1. **The trivial baseline answers `arrived` to everything and scores 39/45 — 87%.** Accuracy is
   therefore meaningless on this stand. The only measures that carry information are **how many
   of the six it flags** and **how much it flags that the key calls arrived**.
2. **Item 30 is unscored and its answer is recorded.** `jev` has already, accidentally, read that
   passage: it is item 9 of `docs/experiments/normative-force/`, answered `binding` at 0.72 with
   the markers present and 0.89 with them stripped — the only item there whose confidence rose
   under stripping. That run was designed and executed before its author knew item 30 existed or
   was contested. It was a different question — *does this passage bind* rather than *did this
   undertaking arrive* — so it is adjacent evidence, not a vote, and the coincidence was not
   designed.
3. **Expected weakness.** `normative-force` measured that this model reads normative force from
   markers and loses it when they are gone. Six of the seven key items turn on a missing marker,
   which is the evidence it reads best. **This stand is therefore easier for it than the task it
   would be used for**, and a good result here does not transfer to a corpus where the marker
   convention is absent.
4. **Confidence is recorded per item** and is the thing most worth looking at, because
   `normative-force` found it honest: 0.17 where the model had lost its evidence, 0.89-0.99 where
   it had it.

## Contamination, named

The question wording, the extraction rule and the reduction of the verdict set are mine. Under
`relay-0799` designing a checker's stopping conditions is authorship of its result, so this
produces a reading and not a verdict, and goes under rule 14. The key is not mine and was not
written for this.
