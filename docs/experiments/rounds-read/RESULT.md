# Result — rounds-read, reader 1 of 4 (cold subagent)

Contract and pin sealed at 14:17:03 UTC, before any answer existed. The reader verified the input
pin `be77df58…` and reported it matched.

**All 46 undertakings classified. Nothing is wholly absent. The losses are demotions and halves of
distinctions.**

| verdict | n |
|---|---:|
| `LANDED` | 36 |
| `LANDED-ALTERED` | 4 |
| `PARTIAL` | 6 |
| `NOT-LANDED` | **0** |
| `SUPERSEDED` | 0 |
| `UNDECIDABLE` | 0 |

`NOT-LANDED` at zero is a real result and the reassuring one: **the sixteen rounds' undertakings
largely arrived.** Every loss found is a component of an item, not an item.

## The controls — four of five agree, and the fifth is mine

Five items were already classified in withheld documents. The reader was not told which.

| thread line | item | mine | reader's | |
|---|---|---|---|---|
| 242 | dual-order | `PARTIAL` | `PARTIAL` | agree |
| 315 | tie-break | `PARTIAL` | `PARTIAL` | agree |
| 1795 | 2×2 truth table | `LANDED` | `LANDED` | agree |
| 2242 | archival summary | counted, flagged arguable | `PARTIAL`, ambiguity named | agree in substance |
| **234** | **§5 finding vs ruling** | **`SUPERSEDED`** | **`PARTIAL`** | **disagree** |

**The reader is right.** Verified against the thread: `AGGREGATED_FINDING` occurs **twice in
2262 lines**, both inside item 234 itself. Item 343, which I said superseded it, addresses
`ruled_by` — attribution against conferral — and says nothing about a procedure's output being a
measurement.

**343 superseded one half of 234 and left the other untouched and unmentioned.** `SUPERSEDED` was
too coarse; `PARTIAL` is correct.

## The reader's structural finding, which nobody had

> "The two components that fell out cleanly are both **the second half of a distinction**. Each
> undertaking promised to separate two things; the draft kept the half that had a section to live
> in and dropped the half that would have needed a new one. Neither was mentioned again —
> forgotten, not withdrawn, twice in the same shape."

Item 3's `AGGREGATED_FINDING` — the measurement half of measurement-versus-ruling. Item 5's
arrival-order leg — the queue half of queue-versus-causal. Both gone, neither withdrawn.

**And my own error is a third instance of that shape.** I saw the half of item 234 that was
superseded and called the whole item superseded. The same collapse, one level up, by the party
classifying it.

## The six `PARTIAL`s

| item | line | what fell out |
|---|---|---|
| 3 | 234 | `AGGREGATED_FINDING` — zero occurrences after its own statement |
| 5 | 242 | the arrival/queue-order leg; `arrival`, `queue`, `lexicograph`, `drain`, `worker` all zero across all seven files |
| 6 | 315 | rule 2's `MUST use a deterministic presentation convention` — arrived unmarked between two siblings that kept their brackets |
| 11 | 570 | *"Consumers MUST deduplicate … prior to executing the sorting comparator"* — formula verbatim at draft line 129, **`MUST` gone** |
| 28 | 1461 | the `[MUST NOT]` on rejecting `UNCHECKABLE` acts — **this is `#63`**, found independently |
| 46 | 2242 | the review record landed with different content, and contradicts the item's *"verified against empirical corpus measurements"* |

Item 11 is the exemplar the §4 warning exists for: *"every noun of the undertaking survives —
`ProjectThread`, `DeduplicateByID`, `Comparator`, `id`, plus three sentences arguing why dedup
matters — and only `MUST` is missing. Term-presence scores it a perfect match."*

## What the reader established about the method

The §4 warning fired on three items — 6, 11 and 28. **All three would have been scored `LANDED` by
the screen `relay-0881` ran.** That is the blind spot measured rather than argued.

And the draft's own consistency is what makes the omissions legible: it brackets obligations
exactly 12 times, and *strengthens* several undertakings beyond what was promised. Against that
consistency, three unmarked cases read as omissions rather than house style.

## Contamination

Predicate, population, item list and contract are all mine; `OPERATOR.md` states it. The reader
declared it recognises the project — the draft names the repository, which is a sibling of its
working directory — and said no verdict rests on that.

# Reader 2 — gemini, blind, pin verified

Declared recognition of the project — *"we have analyzed and worked on it in previous runs"* — and
said no verdict rests on it. Pin `be77df58…` verified by the reader and re-verified here after the
run: `input/` untouched.

| verdict | subagent | gemini |
|---|---:|---:|
| `LANDED` | 36 | 29 |
| `LANDED-ALTERED` | 4 | 12 |
| `PARTIAL` | 6 | 4 |
| `NOT-LANDED` | 0 | 1 |

**They agree on which undertakings did not fully arrive and disagree on how to grade them.**

## Where both readers agree, including against the operator

| item | subagent | gemini |
|---|---|---|
| 3 · §5 finding vs ruling | `PARTIAL` | `PARTIAL` |
| 5 · dual-order | `PARTIAL` | `PARTIAL` |
| 11 · dedup `MUST` | `PARTIAL` | `PARTIAL` |
| 46 · archival summary | `PARTIAL` | `NOT-LANDED` |
| 19, 22, 37 | `LANDED-ALTERED` | `LANDED-ALTERED` |

**Item 3 is the operator's control and both readers overturn it independently**, with different
reasoning — gemini adds that `ruled_by` is absent from the schema entirely. `relay-0885` had
already conceded it to the first reader; a second reader reaching it unaided settles it.

## Where they differ, adjudicated against the draft

Three are decidable by pointing at lines. **The operator is the interested party here and one
ruling favours a verdict he also gave, so each is grounded in text anyone can check.**

**Item 6 · tie-break — the subagent's `PARTIAL` stands.** gemini gave `LANDED-ALTERED`, saying
*"the rules are implemented with explicit `[MUST]` and `[MUST NOT]` tags."* True of rules 1 and 3
— draft lines 124 and 126. Rule 2's convention sits at lines 129-134 **unmarked**. The alteration
gemini cites, the terminal key moving from `lexicographical(digest)` to `id`, is real and
recorded; it does not restore the missing mark.

**Item 28 · `UNCHECKABLE` — the subagent's `PARTIAL` stands.** gemini gave `LANDED-ALTERED`,
reasoning that tri-state evolved into the 6-state partition. That explains the *states*. The
undertaking's second half was *"Verifiers MUST NOT reject or discard a well-formed act solely
because its causal link evaluates to `UNCHECKABLE`"*. Every occurrence of "reject" in the draft:
line 43 (CNS recipient), 268 (Stage 2 duplicate keys), 294, 321-322 (Stage 2 rejects
`UNANCHORED`). **No prohibition on rejecting `UNCHECKABLE` exists.** Line 294 gives a
consequence — *"rejects correct acts routinely"* — not a rule. This is `#63`, reached
independently for the second time.

**Item 46 · archival summary — the subagent is more accurate.** gemini answered *"nothing answers
this"*. `Provenance and standing` occurs **twice** in the draft, and the provenance paragraph at
lines 4-8 names the review's shape. Something answers it; whether it is the same undertaking is
the ambiguity both `relay-0883` and the subagent named.

**Item 30 · three-stage pipeline — contested, and left contested.** gemini gave `PARTIAL` because
the pipeline rule arrived unmarked; the subagent gave `LANDED`. The draft says *"The ordering is
normative"* in prose rather than with the bracket convention. Both readings are defensible and
**the operator is not the party to settle it.**

## The granularity split, which is a method difference

gemini returned 12 `LANDED-ALTERED` to the subagent's 4. The subagent declared a tie-break rule
before classifying — *later-round refinement → `LANDED`, later-round contradiction →
`LANDED-ALTERED`* — so sixteen rounds of evolution would not sweep every early item into
`ALTERED`. gemini declared none and swept.

Declaring the rule before applying it is this project's own practice, and it is why the two counts
diverge on 8 items where neither found a loss.

## The unknown, resolved — and it was better than the contract

`relay-0886` recorded that `answer-subagent.md` had left the stand and that whether gemini
removed it was **not established**. It is now: **bee.zae removed it before the run and restored
it after**, and the restored file is byte-identical to the repository copy — `270280ce…` both
sides, `input/` pin unchanged.

**That is stronger discipline than the contract asked for.** `CONTRACT.md` §1 and the dispatch
prompt told the reader not to read the prior answer. The dispatcher made it *unreadable*. An
instruction depends on the reader honouring it; removal does not — and one reader on these
materials has already declared blindness falsely once (`relay-0873`).

Recorded because it is a method improvement made by the party dispatching rather than the party
designing, and the next stand should be built this way rather than instructed this way.

## A contradiction in the contract, found after both runs

gemini-code-assist on PR #111: `CONTRACT.md` §3 says *"Use these five and no others … rather than
inventing a sixth"*, while §8 says *"If you cannot reach a verdict on an item, say `UNDECIDABLE`"*.
**They contradict.** §3 forbids a sixth verdict and §8 supplies one.

**The contract is not edited.** Both readers ran against it as written; editing a sealed artifact
after the runs is what sealing exists to prevent. The defect belongs to the record.

**What it may have cost, measured rather than assumed.** Both runs returned `UNDECIDABLE` 0, and
that was reported as a clean result. The two readers reached it differently:

- The **subagent** listed `UNDECIDABLE` in its own verdict tally — it treated the option as
  available and returned zero of it.
- **gemini's answer does not contain the word at all**, not once in 37 KB. That is consistent
  with never needing it, and equally consistent with §3 having removed it from consideration.

**Which of those it was cannot be established now.** So `UNDECIDABLE 0` stands for the subagent
and is weaker than it looks for gemini, and any future stand should state its verdict set once.

## Run closed at two readers

`chatgpt` and `relay-grok` were not dispatched — bee.zae's call. The run stands on two blind
readers who verified the pin, one of them cold with no prior exposure to this project and one
declaring prior exposure and setting it aside.

What that leaves unresolved is named rather than left implicit: **item 30 is contested** between
the two and no third reader will settle it, and the eight-item granularity split between
`LANDED` and `LANDED-ALTERED` has no tiebreaker. Neither affects which undertakings were found
incompletely landed — on that the two readers agree completely.
