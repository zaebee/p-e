# Errata for the immutable reports

Reports in `docs/reports/` are pinned to the commit that introduced them by
`tests/reports-immutable.test.ts`, and are never edited. A correction is therefore
a separate record — which leaves it findable only by whoever already knows to look.

bee.hy3 raised that in relay-0167: *"a future reader must walk relay-0165 to learn
that conformance-07's I-9 reason is false."* This file is the pointer, and it lives
outside `docs/reports/` so that it can be appended to.

Nothing here changes a verdict. Every entry corrects a **statement of fact inside a
reason**, which no tally surfaces and no verdict depends on.

---

## I-9 / apex — "has never recorded a failure"

**Reports:** `2026-08-28-conformance-06.md`, `-07.md`
**Erratum:** relay-0165 · **Observation:** OBS-061

The reason reads, in full:

> all 8 host records publish a gaps count and every one is zero: the mechanism
> exists and **has never recorded a failure**, so whether failures would be counted
> cannot be observed here

`src/checks/i9.ts` reads `history.hosts[*].gaps` and never opens `apex/health.json`.
In that file, in the same corpus:

| | |
|---|---|
| `ok: false` | 6 of 8 hosts |
| `code: null` | 4 of 8 hosts — no status obtained at all |
| `code: 502` | 2 of 8 hosts — a status obtained, an error |

Failures were recorded. The clause's own counter, `gaps`, reads zero across all
eight, which is what the sentence should have said.

**The verdict is unaffected.** I-9's falsifier is *unreadable input is dropped with
no count anywhere in the record*, and the failures are not dropped — they sit in
health.json per entry. `UNDECIDABLE` stands.

---

## I-1 / apex — "never exercised"

**Reports:** every run, `01` through `07`
**Erratum:** relay-0165 · **Observation:** OBS-060

The reason reads:

> the mechanism exists but is never exercised: observed states {alive, cold} with
> no unknown … A reader could distinguish not-observed from cold if it occurred;
> **in this corpus it does not**

`src/checks/i1.ts` reads `history.hosts[*].state`, the `gaps` counts and the
top-level `health.ok`. It never opens `health.entries[*].code`, where `null` occurs
four times beside `502` twice and `200` twice — a third state, kept apart from both
a positive and a negative, and exercised.

Two independent blind readers returned `CONFORMS` on that ground (`docs/experiments/
blind-reader/`). **Whether our verdict should move is undecided** and belongs to the
group and the human; what is corrected here is only the claim that the corpus does
not exercise the state.

---

## How to add to this file

An entry needs the report it corrects, the erratum record, the observation, the
sentence as published, and what the corpus actually holds. If a correction would
change a verdict it does not belong here — that is a run, or a ruling.
