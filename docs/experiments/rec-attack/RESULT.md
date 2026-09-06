# Result — rec-attack, three readers

Contract and pin sealed at 11:43:34 UTC before any answer existed. All three verified the input
pin `a998df27…` themselves; re-verified here after the runs, `input/` untouched.

| reader | declared | note |
|---|---|---|
| cold subagent | blind, prior exposure to a project of this name, set aside | most thorough sourcing |
| gemini | blind | |
| relay-grok | **sighted**, and said so unprompted | confirmed it did not open `relay-0894` |

## The verdicts

| # | recommendation | subagent | gemini | grok |
|---|---|---|---|---|
| 1 | `#81`+`#67` — `history/`, `expired/`, deletion ban | FAILS | FAILS | weak FAIL |
| 2 | `#81` form — refusing `superseded_by` | FAILS | FAILS | **FAILS** |
| 3 | `#103` — normalise the property, not `link` | FAILS | FAILS | *survives* |
| 4 | `#104` — filename check into Stage 2 | FAILS | FAILS | *survives, mild* |
| 5 | `#63` — restore the `UNCHECKABLE` `MUST NOT` | **SURVIVES** | **SURVIVES** | **SURVIVES** |
| 6 | `#106` — four acts to methodology | FAILS | *survives* | *survives* |
| 7 | `#107` — shrink `type`, delete §5 | FAILS | *survives* | **FAILS** |
| 8 | `#51` — no inline `signature` | FAILS | FAILS | *survives* |

**Unanimous:** `#63` survives. `#81`'s two halves — the storage decision and the erratum form —
both fail on all three.

## The two findings verified here against the files

Two readers found contradictions with **this project's own addendum**, and grok, the sighted one,
found neither. Both are confirmed by reading the file:

**Recommendation 3 reverses a declaration.** `relay-lite-v0.12-addendum-identifiers.md` §6:

> **relay-lite requires a POSIX filesystem.** §4.1 already mandates `link` with `EEXIST`
> semantics, `O_EXCL` for the temporary file, and a directory `fsync` … Declaring POSIX makes the
> existing assumption explicit and **closes the door on an unbuilt port**.

The recommendation's stated motive is *"не сделав обязательным POSIX API"*. The addendum made it
obligatory on purpose, and said so.

**Recommendation 4 closes a question the addendum reserved.** §7 of the same file:

> It does not amend v0.12, **it does not close #35 — that is bee.zae's call**

Binding the addendum's alphabet into a `MUST` closes it.

**And a contradiction inside our own documents, found by the subagent and counted here.** §6
above asserts *"§4.1 already mandates"* those three primitives. **§4.1 contains zero `[MUST]`
clauses** — which is the whole of `#103`. An addendum asserts a mandate the draft does not carry.

## What each reader found that the others did not

**grok — the fork, and an obligation on the wrong party.** Neither other reader named either.
Without `superseded_by`, *"concurrent errata on the same target (two corrections that do not point
at each other) yield a fork with no transport-level winner"*. And *"Читатель обязан уметь
показать отношение исправления"* is a **normative obligation on consumers**, where the rest of the
document constrains producers and verifiers.

**The subagent — the backward chain does not reach the party that needs it.** Draft lines 291-294
say a node holding a child *cannot* hold the parent under single-leg delivery. The same structure
applies to errata: a holder of a corrected record does not hold the erratum correcting it. The
note's *"без потери информации"* is false for exactly the reader who has the record and not the
correction. **This breaks `relay-0894`, which accepted the backward chain unexamined** — erratum
`relay-0895`.

**gemini — nothing the others did not have**, and see below.

## A reader characteristic worth recording

**Five of gemini's five failures cite mode 4**, "a cost the note does not name", and only one adds
a second mode. It found one lens and applied it to everything that failed.

That is the same shape as its previous run in `docs/experiments/rounds-read/`, where it returned
twelve `LANDED-ALTERED` to another reader's four by applying a verdict without declaring a rule
for it. **Twice now, gemini's individual verdicts are worth less than its citations**, which have
been sound both times — including the addendum contradiction here.

## §4 of the contract was justified

It told readers to look hardest at the two paragraphs written under objection. **Both fail.** The
`superseded_by` refusal fails on all three readers; the §5 removal fails on two.

grok names the shape without being told it: *"each answers a review objection by a move that looks
minimal … and smuggles reader obligations, acceptable forks, and core-scope reduction. That is the
same shape as an erratum that concedes to the line where the remainder survives."*

That is grok's own finding from `relay-0871`, reached again on a different artifact by a party
that was not reminded of it.

## What this run does not establish

Three readers disagree on five of eight. **The disagreement is not noise and is not resolved
here.** Where two agree against one and the ground is a file in the bundle, this document verified
the file and says so — that is recommendations 3 and 4. Where the disagreement is about scope or
venue — 6, 7, 8 — no reading of the bundle settles it, and it is left open.

The contract's five failure modes are the operator's enumeration. All three readers used them and
none proposed a sixth, which is weak evidence they are adequate and no evidence they are complete.
