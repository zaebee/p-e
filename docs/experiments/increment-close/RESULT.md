<!-- NOT A RUN -->
# Result — the set was incomplete a fourth time, and structurally so

**NOT A RUN.** Not a `docs/reports/*-conformance-NN.md`, changes no catalogue.

Reader output verbatim in `READER-OUTPUT.md`. Key at `docs/experiments/increment-close-key.md`,
committed before the run in `a2c20d5`. Input re-hashed after: matches the pin `accd7d9c…`.

## Against the key

| | prediction | outcome |
|---|---|---|
| **P1** | 4–7 distinct resolutions | **9. Missed, above the range.** |
| **P2** | finds at least one I do not have | **hit — four, and the answer goes against me** |
| **P3** | finds `iii`, carrying the overflow into `l` | hit — its R5 |
| **P4** | finds `v`, via §3.1's "larger values encoded as strings" | hit — its R8, and R1 cites the clause explicitly |
| **P5** | does not find `i`'s failure mode | **vacuous** — it did not propose `i` at all |

## What it found that I did not

| | resolution | why I did not have it |
|---|---|---|
| **R1** | widen §3.1's integer range to `2^N` for some `N > 53` | I never considered changing §3.1's *bound*, only its *type* |
| **R2** | delete the range constraint; arbitrary-precision integers | same |
| **R4** | modular arithmetic — wrap the counter | did not occur to me at all |
| **R9** | **replace `c` with an `{epoch, offset}` pair** | did not occur to me at all |

**R9 is the strongest of the four.** Every component stays inside the safe range, integers stay
integers, counting stays unbounded, and monotonicity survives under lexicographic comparison of
the pair. Its cost is a wire-format change to an object — smaller than `v`'s change to a string,
and it does not refuse conforming acts the way `iv` does.

Its own note: *"standard technique for unbounded counters with bounded fields."* It is a known
pattern and I did not reach for it.

## The taxonomy, which is worth more than the list

> 1. **Expand the codomain** so the result of `max + 1` is always representable — R1, R2, R8, R9
> 2. **Change the operation** so it never leaves the codomain — R3, R4, R5, R6
> 3. **Prevent the input** that would cause overflow from ever reaching the operation — R7
>
> There is no fourth class.

Sorting my five into it explains the gap exactly:

| class | mine | its |
|---|---|---|
| expand the codomain | **v only** | R1, R2, R8, R9 |
| change the operation | i, ii, iii | R3, R4, R5, R6 |
| prevent the input | iv | R7 |

**I had one option in the class that contains four, and I reached it last, after being told I
had omitted something.** The imbalance is not random: the two classes I populated are the ones
that leave the act's declared shape alone, and I did not think of the class that changes it as a
place to look.

"There is no fourth class" is an argument, not a proof, and the reader offers it as one. It is
also the first structural claim about this question that came from outside.

## Where its list and mine disagree about what counts

**`i` — wait for the next millisecond — is absent from its nine.** It is not an oversight: waiting
does not close the domain, it postpones reaching it, and under the taxonomy that is not a
resolution at all. `relay-0829` reached the same conclusion by a different route, that `i` fails
once the bound on `l` is declined. Two independent findings that `i` was never a candidate.

**Its R7 is not my `iv`.** Mine rejects an act whose `c` is at or above a ceiling — a pure
function of the act. R7 computes whether *ingesting* would overflow, using the node's clock
state, and rejects on that. That is stateful, and it is the impure form `relay-0824` refuted mimo
for attributing to stage 2. The reader proposes deliberately what mimo asserted was already
there.

## What this does to the round

The three live options were `iii`, `iv` and `v`. **They are now three of at least seven**, and one
of the four new ones — R9 — has no objection yet raised against it.

Nothing here decides anything. The round's conclusion was that the set had survived attack; it had
not, and the party that showed it had never seen the attack.
