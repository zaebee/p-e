<!-- NOT A RUN -->
# Pre-registered key — committed before the run

**NOT A RUN.** Changes no catalogue.

Every expected answer below is transcribed from `docs/experiments/lineage-blind/CANDIDATES.md`
§5, written by hand in an earlier investigation that did not know this experiment would exist.
Line numbers verified against `docs/specs/relay-lite-v0.12-draft.md` on 2026-09-22.

`marker-reader` is the trivial baseline: *binding iff the passage carries `**[MUST]**` or
`**[MUST NOT]**`*. It is scored alongside the model so a good result is not mistaken for skill.

| # | v0.12 | passage, first words | key | marker-reader | why |
|---|---|---|---|---|---|
| 1 | 93 | `**[MUST NOT]** Publishers re-tick the HLC…` | binding | binding | agreed in rounds, arrived marked |
| 2 | 126 | `**[MUST NOT]** A consumer presents any linear projection…` | binding | binding | agreed in rounds, arrived marked |
| 3 | 264 | `**[MUST NOT]** A verifier parses, normalizes…` | binding | binding | agreed in rounds, arrived marked |
| 4 | 124 | `**[MUST]** The protocol and storage model treat the graph as a DAG…` | binding | binding | clause 1 of a two-clause rule; kept its force |
| 5 | 276 | `**[MUST]** A citation carries both handles…` | binding | binding | checked and cleared in §5 |
| 6 | 293–294 | `Partial visibility is the normal case, and a verifier that rejects…` | **descriptive** | descriptive | **demotion.** The fourth agreed `[MUST NOT]` — *verifiers MUST NOT reject a well-formed act solely because its causal link is `UNCHECKABLE`* — survives only as this consequence statement. It says rejecting would be wrong; it does not forbid it |
| 7 | 129 | `A consumer needing a flat presentation deduplicates first, then sorts:` | **descriptive** | descriptive | **demotion.** Clause 2 of the same two-clause rule as item 4 — *consumers **MUST** use a deterministic presentation convention*. Same round, same paragraph; one half kept its marker and this half did not |
| 8 | 137–139 | `Deduplication is not an optimisation. Fan-out delivers N copies…` | **descriptive** | descriptive | **demotion.** A separate agreed rule — *consumers **MUST** deduplicate by `id` prior to the comparator* — is folded into item 7's unmarked description, and this paragraph is rationale about a rule no longer stated as one |
| 9 | 258–259 | `Three stages, in order. The ordering is normative: stage 1 must not parse…` | **binding** | descriptive | **the discriminating item.** Force is asserted in prose with a lowercase `must not`, outside the document's own marking convention. §5: *"Not a demotion — the force is stated — but it is invisible to the same tooling"* |
| 10 | 261–262 | `**Stage 1 — wire-octet hashing.** … No parsing, no normalization.` | descriptive | descriptive | **checked and cleared** in §5: unmarked, but the `**[MUST NOT]**` at 264 forbids the alternative, so the substance is carried next door. A model calling this binding is over-flagging |

## Scores this key implies

- **marker-reader, condition A: 9/10.** It fails item 9 and nothing else.
- **marker-reader, condition B: undefined** — the markers it reads are gone.

So condition A discriminates on **one** item. This is stated here, before the run, so that a
9/10 or 10/10 is not reported as though it settled anything.

## What is not in this key

The `[MUST]` pass in `CANDIDATES.md` covers roughly fifteen agreed MUST-level rules, of which
eight map cleanly onto v0.12's nine markers. Those eight are not itemised here and are not
tested. This key is **ten passages, not a census**, and a result against it is a result about
these ten.
