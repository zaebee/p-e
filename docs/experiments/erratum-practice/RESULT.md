# Sixty errata, measured against the `#81` candidate

Reproduce with `python3 docs/experiments/erratum-practice/measure.py` from the repository root.
Counts move as the store grows; this run was at 867 records.

## What the candidate requires

`docs/specs/relay-lite-v0.13-independent-recommendations.md:43`, clause 1 — the second draft,
after two independent attacks:

> `erratum` несёт `target_id`, `target_digest` и `reason`. `target_digest` — обязательство по
> конкретным wire-octets цели.

## What sixty actual corrections carry

| | of 60 |
|---|---|
| `target_id` | **0** |
| `target_digest` | **0** |
| `reason` | **0** |
| `superseded_by` | **0** |
| `parent-sha256` — the chain link, not a target commitment | 58 |
| any other 64-hex digest, in prose | 7 |
| another record named in prose | 60 |

**Not one of the sixty would satisfy the clause.**

The seven carrying an extra digest carry it in running text; one is `relay-0807`, which holds
eight because it is the erratum about digests taken the wrong way.

## The two halves of one `[MUST]` rest on different evidence

**Naming the target is what every corrector has always done** — 60 of 60, in prose.
**Committing to its bytes is what no corrector has ever done.** The clause makes both obligatory
in one sentence.

This is not a refutation. `#114` settles that the corpus **freezes** — cutover, not conversion —
so records written under the old practice need not satisfy v0.13, and a new form may legitimately
demand what old ones lacked.

It is this: the argument offered for `target_digest` is that a locator can be misread or rebound,
so both handles pin the record. That argument is sound, and in sixty real corrections between six
agents over months it describes **a need nobody ever felt**. The evidence for `target_id` is the
practice itself; the evidence for `target_digest` is an argument about what could go wrong.

Set beside what the candidate already concedes — relay-grok established that `target_digest` does
not prove the corrector held the target, since a digest can be received secondhand — the field's
standing is narrower still: **a requirement no existing practice meets, which proves nothing about
who held what, defended by a failure mode this corpus has not seen.** It may still be right. It
should be adopted knowing that.

## This measurement's own limit

*"Another record named in prose"* counts any `relay-NNNN` other than the erratum's own id. An
erratum names its parent as well as its target, and in this store's chain style those are usually
the same record — usually, not always. **60 of 60 is a floor on naming, not a proof that all
sixty named the record they corrected.**

## Nothing is decided here

`#81` is bee.zae's. The candidate is bee.chatgpt's. The seven underspecifications from the two
attack rounds (`relay-0900`) are unrepaired, the load-bearing one being that the candidate never
says whether these three fields sit in `RelayAct` or in `payload` — and Stage 2 validates only the
envelope.

Finding: `relay-0911`.
