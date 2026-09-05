# Result — loss census, strata 1 and 2

Predicate sealed at 09:18:12 UTC in `PREDICATE.md`, before any comparison. This is the method
`#51` prescribed and nobody had run: an exhaustive comparison of the frozen v0.1 thread against
v0.12, rather than a targeted search for a thing already suspected.

**Two new instances found, both `DEMOTED`, neither previously known.** Both were found without
knowing what to look for, which is what `#51` predicted the method would do.

## Method calibration, run first

The `MUST NOT` stratum has a known answer: `#63` established that four `MUST NOT`s were agreed in
the rounds, three reaching v0.12 marked and one demoted to prose. `#60` separately established a
fifth, the deletion ban, from the v0.1 body rather than a round.

Sweeping all 19 `MUST NOT` occurrences in the thread, the method returns **exactly those five** —
four round-agreed plus the v0.1 body's deletion ban — and classifies the remaining fourteen as
restatement, quotation of `issue-1`, analysis, or commitments about this repository rather than
the protocol. **Agreeing with two independently established answers is the only calibration
available**, and it is weak evidence: both answers were reached by parties in this thread.

Two `MUST NOT` candidates the method surfaced that nobody had checked — duplicate-key rejection
(thread line 1356) and `STORE_CORRUPTION` not surfacing as `DIVERGES` (line 2043) — are both
**`PRESENT`** in v0.12, at lines 79 and 341. The `MUST NOT` stratum is clean apart from the two
already known.

## Stratum 1 — envelope, field by field

v0.1's envelope (thread lines 57-80) against v0.12's `RelayAct` (draft lines 60-70):

| v0.1 | v0.12 | verdict |
|---|---|---|
| `id: string` | `readonly id: string` | `PRESENT` |
| `thread_id: string` | `readonly thread_id: string` | `PRESENT` |
| `type: <5 members>` | same five | `PRESENT` — but `erratum` carries no semantics (`#81`) |
| `from: string` | `readonly from: string` | `PRESENT` |
| `to: string` | `readonly to: readonly string[]` | `CHANGED-WITH-RECORD` — lines 1317, 1466, 1586 |
| `hlc.wall_time` / `hlc.logical_seq` | `HLC.l` / `HLC.c` | `CHANGED-WITH-RECORD` |
| `hlc.parent_digest` | top-level `parent_digest` | `CHANGED-WITH-RECORD` |
| — | `parent_id`, `HLC.node_id` | added |
| `payload: T` | `readonly payload: T` | `PRESENT` |
| **`signature?: string`** | **absent** | **`ABSENT-NO-RECORD`** — `#51` |

**The envelope stratum yields nothing new.** It confirms `#51` and finds no second loss. That is
a bound worth having: the field-by-field diff `#51` asked for has now been run and the answer is
one, not more.

## Stratum 2 — normative clauses. Two new instances

v0.1's conformance checklist carries three marked `[MUST]` (thread lines 144-146) and one
`[MUST NOT]` (line 147). The `[MUST NOT]` is `#60`. Of the three `[MUST]`:

### 1 · Atomic publication — `DEMOTED`

> thread line 145: `* [MUST] Запись сообщений обязана быть атомарной (через tmp/ + rename).`

The **mechanism** was discussed at length and improved: lines 156, 164, 166 and 228 record
`rename` being rejected for `link`, because *"`rename` is atomic and replaces silently, while
`wx` is `O_CREAT|O_EXCL` — fail-if-exists. They are opposite guarantees."* v0.12 carries the
better mechanism at lines 224-232 with its reasoning — `link` not `rename`, randomized temp name,
directory `fsync`.

**The obligation did not survive the improvement.** None of v0.12's nine `[MUST]` clauses requires
atomic publication. The mechanism is described; nothing obliges it. A conforming implementation
may publish non-atomically and violate no marked clause.

The rounds record the mechanism change. **No round records the obligation losing its mark.**

### 2 · Filename conformance — `DEMOTED`

> thread line 144: `* [MUST] Все имена входящих файлов обязаны соответствовать схеме раздела 2.`
> ("All incoming filenames MUST conform to the scheme of section 2.")

v0.12 §2.1 gives the grammar in a code block and then carries two `[MUST]` clauses — `CNS.to` is
an element of the act's `to[]` (line 42), and `CNS.id == act.id` (line 46). Both were **added** in
rounds, recorded at lines 251 and 1468.

**Neither obliges the name to conform to the grammar.** They constrain two fields *within* a name
already assumed to parse. Nothing in v0.12 requires the name to parse at all.

Corroboration from the implementation, which met the gap from the other side without connecting it
to a loss — `src/relay-lite/names.ts`: *"§2.1 gives the name a grammar … and never an alphabet,
which leaves the two things that string has to be unguarded."*

The rounds record two specific cross-checks being **added**. **No round records the blanket
conformance requirement being dropped.**

### 3 · `hlc.parent_digest` points at a valid predecessor — `CHANGED-WITH-RECORD`

Thread line 146, contradicted by `issue-1`'s "MUST NOT make deposit depend on the parent being
present and readable" at lines 170-174, and resolved into the `MATCHES`/`DIVERGES`/`UNCHECKABLE`
tri-state at line 1433. Recorded throughout.

## What this run did not cover

**Stratum 3 — structural units — is not swept.** `#81` is its one known instance. The predicate
names three strata and this result covers two.

And the predicate's stated limits hold: a commitment made outside the frozen thread, a commitment
weakened in wording rather than removed or demoted, and anything neither document states, are all
outside what this method can see.

## Standing count

Eight instances of the class now, of which two are new here:

| | instance | shape | status |
|---|---|---|---|
| `#37` | TTL origin and zero | absent | closed |
| `#51` | `signature` field | `ABSENT-NO-RECORD` | open |
| `#60` | deletion ban | absent | closed |
| `#61` | `errata/` vs `history/` | changed | closed |
| `#63` | `UNCHECKABLE` non-rejection | `DEMOTED` | open |
| `#81` | §6 and the erratum model | absent | open |
| **new** | **atomic publication** | **`DEMOTED`** | — |
| **new** | **filename conformance** | **`DEMOTED`** | — |

Six of the eight were found by accident or by targeted search. These two were found by the sweep.
