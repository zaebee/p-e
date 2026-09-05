# Result — loss census, stratum 3: structural units

Same predicate, sealed 09:18:12 UTC in `PREDICATE.md` before any comparison, which already
names this stratum. Strata 1 and 2 are in [`RESULT.md`](RESULT.md).

**The largest losses are here, and the largest of them is an invariant no round ever mentioned.**

## §1 · Invariants — one of three is gone, unremarked

v0.1 §1 states three core invariants. v0.12 §1 states four.

| v0.1 | v0.12 | verdict |
|---|---|---|
| 1 · history strictly additive; errors annulled by `erratum` records, never deleted or overwritten | 1 · "A record, once published, is immutable. Corrections are new records, never edits." | `PRESENT` |
| 2 · order from the dependency graph and a logical counter, not absolute clocks | 2 · "Order comes from the citation graph, not from absolute system clocks." | `PRESENT` |
| **3 · separation of four epistemic acts** | **—** | **`ABSENT-NO-RECORD`** |
| — | 3 · partial order; concurrent replies fork | added, recorded |
| — | 4 · a reader's inability to see a record is not a defect in that record | added, recorded |

The missing invariant, in full:

> **Разделение 4 эпистемических актов:** Свидетельство (`Witnessing`), Проверка (`Examination`),
> Критерий (`Criterion`) и Вердикт (`Ruling`) разделены и не схлопываются в один шаг.
>
> ("**Separation of the 4 epistemic acts:** Witnessing, Examination, Criterion and Verdict are
> separated and do not collapse into a single step.")

**`Witnessing`, `Examination`, `Criterion` and `Verdict` each occur zero times in v0.12.** And in
the 2262-line thread, the phrase occurs **exactly once — at line 15, its own statement.** Not one
of sixteen review rounds mentions it.

**This project practises that invariant daily and did not know it was specified.** Witnessing is
the record; Examination is the blind read; Criterion is the sealed criteria set — this very
census sealed one at 09:18:12 before looking; Verdict is the ruling. The discipline was
rediscovered by failing without it (`relay-0799`, [`defect1-criteria.md`](../defect1-criteria.md), and today's four errata)
while its statement sat in the source document, dropped.

## §2 · Layout — five directories became three

| v0.1 | v0.12 | verdict |
|---|---|---|
| `in/` | `in/` | `PRESENT` |
| `errata/` — recorded errors, disputes and claims | `errata/` — expired records | `CHANGED` — the correction meaning vanished (`#81`) |
| `history/YYYY-MM/` — append-only archive | — | `ABSENT` (`#61`) |
| **`active/`** — messages atomically claimed by one agent | — | **`ABSENT`**, and a round *agreed to specify it* |
| **`out/`** — prepared replies before routing | — | **`ABSENT-NO-RECORD`** |
| — | `tmp/` | added |

`active/` is the sharper of the two. Thread line 252, a round's own decision:

> "**Directory Mutation Scoping:** Explicitly specify that `.relay/in/` and `.relay/active/` are
> ephemeral…"

A round agreed to say something about `active/`, and v0.12 contains no `active/` at all. **The
round's own conclusion did not land**, which is a sixth shape: not a commitment lost from the
source, but a commitment agreed in review that never reached the draft.

`out/` occurs **once in 2262 lines**, at line 28 in the original layout. No round mentions it.

## §4 · Delivery lifecycle — two of three stages gone

v0.1 §4 gives three stages. v0.12 §4 is "Ordering", with §4.1 "Publishing".

| v0.1 stage | v0.12 | verdict |
|---|---|---|
| 1 · Publish — `tmp/` → `fsync` → atomic rename into `in/` | §4.1, with `link` instead of `rename` | `CHANGED-WITH-RECORD`; obligation `DEMOTED` (`#103`) |
| **2 · Claim-or-Fail** — scan `in/` by `to=` prefix, atomically move to `active/` | — | **`ABSENT`** |
| **3 · Settle** — move to `history/YYYY-MM/` | — | **`ABSENT`** (`history/`, `#61`) |

The section was renamed from *Delivery Lifecycle* to *Ordering* and kept its number. Two of the
three stages it described are not in v0.12, and nothing says a receiver does anything at all with
a file after it appears in `in/`.

## §5 · A protocol became four sentences, on a one-clause objection

v0.1 §5 is the **4-Act Adjudication** protocol:

```
[ CLAIM ] ──→ [ CHALLENGE ] ──→ [ CRITERION-CHECK ] ──→ [ RULING ]
```

carrying three payload shapes, a three-valued finding vocabulary, an obligation on the
challenger, and a criterion gate on rulings.

**One clause of it was objected to, correctly**, at thread line 180:

> "§5 derives a norm from a measurement, which the README forbids — the biggest one … ruling
> *'применяется только при выполнении заранее зафиксированного критерия (например, 2 независимых
> `PASS` + чистый прогон тестов)'* … That is a function from a measurement to a normative
> outcome."

That objection is about the **criterion gate**. What left the document with it:

| from v0.1 §5 | in v0.12 | recorded? |
|---|---|---|
| the criterion gate on rulings | absent | **yes** — line 180, correctly |
| the four-act chain | absent | no |
| `claim` payload `{ proposal, target_digest }` | absent | no |
| `challenge` payload `{ finding, counter_evidence }` | absent | no |
| `ruling` payload `{ status, ruled_by }` | `ruled_by` survives; the shape does not | partly |
| **`PASS` / `VIOLATES` / `UNDECIDABLE`** | **absent** | no |
| **"an independent agent (a different epistemic path) is obliged to supply a counter-example"** | **absent** | no |

Counts in v0.12: `PASS` 0, `VIOLATES` 0, `UNDECIDABLE` 0, `counter_evidence` 0, `target_digest` 0,
`proposal` 0, `criterion` 0, `consensus-v1` 0.

v0.12 §5 is now four sentences on what `ruled_by` records.

**A valid objection to one clause, and the section left with it.** That is the class's most
expensive instance so far.

## The consequence for `type`

Occurrences in v0.12: `message` 6, `claim` 2, `ruling` 2, **`challenge` 1**, **`erratum` 1**.

The single occurrence of `challenge` and of `erratum` is the enum member itself. **Four of the
five `type` members have no semantics in v0.12.** `#81` found this for `erratum`; it holds for
three more.

## §6 and §7

§6 — the Refuge / Erratum Model — is `#81`, and this sweep adds nothing to it.

§7 — v0.1's conformance checklist — became v0.12 §7 "Verification". Its three `[MUST]` are the
stratum-2 result: two `DEMOTED` (`#103`, `#104`) and one `CHANGED-WITH-RECORD`.

## Standing count after three strata

| | instance | shape | status |
|---|---|---|---|
| `#37` `#51` `#60` `#61` `#63` `#81` | six known before this census | | |
| `#103` | atomic publication | `DEMOTED` | filed |
| `#104` | filename conformance | `DEMOTED` | filed |
| **new** | **§1 invariant 3 — the four epistemic acts** | **`ABSENT-NO-RECORD`** | — |
| **new** | **§5 — the adjudication protocol minus its objected clause** | **`ABSENT-NO-RECORD`** | — |
| **new** | `out/` | `ABSENT-NO-RECORD` | — |
| **new** | `active/`, and the round that agreed to specify it | agreed-but-never-landed | — |
| **new** | §4's Claim-or-Fail and Settle stages | `ABSENT` | — |

## What this sweep still cannot see

The predicate's limits hold unchanged: a commitment made outside the frozen thread, one weakened
in wording rather than removed or demoted, and anything neither document contains.

And one new limit, learned here: **this method finds what left the source. It does not find what a
round agreed and never reached the draft** — `active/` was caught only because it was also in the
v0.1 layout. A round-by-round sweep of agreed conclusions against v0.12 is a different instrument
and has not been built.
