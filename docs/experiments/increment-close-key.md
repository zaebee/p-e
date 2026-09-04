# Pre-registered key — is the option set for #32's defect 1 complete?

**Sealed 2026-09-04, before the run.** Input pinned at
`accd7d9c6ee648707eb527fa1c11661d4c8d397fa34da238d30aa49819eadb81`; stand at
`~/projects/increment-close/`, contract in `CONTRACT.md`.

## Why this run exists

Three times in this round I produced an incomplete set of options and someone else found the
missing one: `relay-0821` (the omitted "no ε"), my own correction after it (the omitted
string-typed `c`), and `relay-0832` (the unlisted cost of refusing conforming acts).

**I cannot produce evidence that a set I wrote is complete.** A reader given the defect and none
of my options can. The contract asks for an enumeration and forbids recommending, ranking, or
choosing — the choice is not what is being outsourced.

## The five I have

Withheld from the reader entirely.

| | rule | touches |
|---|---|---|
| **i** | at the ceiling, do not emit; wait for physical time to advance | §3.3 |
| **ii** | saturate — emit the ceiling without incrementing | §3.3 |
| **iii** | carry into `l`: if `c` would exceed the ceiling, `l' = l' + 1`, `c' = 0` | §3.3 |
| **iv** | reject at stage 2 an act with `c` at or above the ceiling | §7.1 |
| **v** | carry `c` as a decimal string, outside the integer domain | the act's type |

Live after the round: **iii**, **iv** (with an unanswered objection), **v**. **i** does not fix
the defect once the bound on `l` is declined; **ii** breaks the uniqueness of `(l, c)`.

## Predictions

| # | prediction | scored by |
|---|---|---|
| **P1** | The reader names **between 4 and 7** distinct resolutions. | count |
| **P2** | It finds **at least one I do not have**. | identity |
| **P3** | It finds **`iii` or an equivalent** — carrying the overflow into `l` is the one I expect any careful reader to reach. | presence |
| **P4** | It finds **`v`**, because §3.1's own text says *"larger values encoded as strings"* — see below. | presence |
| **P5** | It does **not** find `i`'s failure mode, because the extract does not say `l` is unbounded. | absence |

**P2 is the one that matters.** If it names a resolution I do not have, the set was incomplete a
fourth time and the round's conclusion is provisional. If it names none, that is the only
evidence of completeness available to me, and it is weak evidence — an enumeration by one reader
is not a proof — but it is not mine.

## Something I noticed while assembling, recorded rather than acted on

§3.1's own text reads: *"integers within `[-(2^53 - 1), 2^53 - 1]`, **larger values encoded as
strings**"*. The specification therefore already provides for values past the safe range, in the
same clause that forbids them as integers.

That strengthens **v** considerably — it would not be inventing a mechanism but applying a rule
§3.1 already states — and I did not notice it in the round. It is recorded here rather than
argued because arguing it now would be exactly the move `relay-0828` caught, one round later.

If the reader reaches **v** by that route, P4 scores; if it reaches **v** without noticing the
clause, that is a different and weaker result and I will say which happened.

## What is deliberately in the input, and what is not

**In:** §3.1, §3.3 and §7.1 of the draft, extracted whole.

**Out, and this one required a decision:** `src/relay-lite/hlc.ts` was in the stand and was
removed before sealing. Its comments name issue #32 and call the overflow "a defect of the
specification", which is this project's framing of the question and would have primed the answer.
The alternative — stripping its comments — is curating the input, which is the fault the `seq`
census caught me in. Dropping the file entirely was the cheaper honesty: the question is what a
*specification* can do, and the implementation is not needed to answer it.

**Also out:** the five options, the decision on ε, every record in this argument, and the fact
that anything has been decided at all.

## Carrier rules

Reader output goes into `READER-OUTPUT.md` verbatim, formatting damage included. Scoring goes into
`RESULT.md` and cites this file. The input is re-hashed after the run.

## The standing risk

I wrote the contract, and §3's four sub-questions are my choice of what to ask about each
resolution. A reader steered by those is steered by me. The mitigations are that the questions
are descriptive, that §6 forbids recommending, and that these predictions are sealed before the
answers exist. That is not neutrality.
