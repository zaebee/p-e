# p-e — closing report

2026-08-29. Written after six conformance runs, three readers and one candidate
third producer.

This is not run 07. It sits outside `docs/reports/`, where every `.md` is pinned
immutable at the commit that introduced it, because one ruling is still
outstanding and this document will need amending when it lands. The numbered runs
are evidence and do not change; this is a summary and will.

## What was attempted

Not to design a protocol. To **extract** one — from systems that were already
running, by a rule fixed before any evidence was looked at:

> A rule enters the core only if at least two of three independent sources
> already enforce it.

Three sources, pinned by revision:

| | source | revision | what it is |
|---|---|---|---|
| **H** | `hivemark` | `bfa75d7` | 932 signed attestations, one weekly Merkle anchor over 1,864 UIDs |
| **A** | `apex` / zae.life | `afb3a3c` | a site that probes its own districts and publishes what came back, including that most are silent |
| **P** | `agents` | `11fda22` | the Pollen envelope — a declaration with no producer and no consumer |

Independence was decomposed rather than asserted: `implementation_independence:
true`, `authorship_independence: false`. H and A share an author. That was
recorded in the spec before the first run, not discovered afterwards.

Nine invariants were drafted, each with a falsifier and a reader clause written
before the reader existed. Then a conformance reader was built to try to break
them.

## The answer

**ADMITTED: 0 of 9.**

Run 01 admitted one — I-2, the recorded time is the occurrence. Run 06 withdrew
it, after a defect was found in the check that had granted it. The count has been
zero ever since, across every subsequent reading.

Run 06, 18 findings over two producers:

| | |
|---|---|
| CONFORMS | 2 |
| UNDECIDABLE | 15 |
| NOT_APPLICABLE | 1 |
| **VIOLATES** | **0** |

## Why zero, and why that is the finding

Not because the discipline is absent. Eight of the nine invariants are enforced,
demonstrably, in the producers' source code. Zero findings across every run have
ever contradicted the catalogue.

Every demotion is a **failure of evidence, not a falsification of a rule**. The
discipline is real in the code and mostly invisible in the record.

Which is the result, and it is about p-e rather than about either producer:

> A protocol extracted only from what producers publish will be very much smaller
> than the discipline that produced them.

Three failure modes were found that the spec's own §9 prediction had not named:

- **not exercised** — the state is defined, representable, and never occurs in
  the window the corpus covers
- **evidence elsewhere** — the input is pinned by digest and lives in another
  repository
- **a single point** — the invariant is about change over time and the corpus
  holds one snapshot

The spec predicted three casualties and named I-6, I-8, I-9. Eight of nine were
demoted, and it missed the one it had called the catalogue's strongest: I-1,
demoted with zero confirmations.

## The third producer

Debian reproducible builds — `reproduce.debian.net`, running `rebuilderd`. The
first candidate with **both** independence axes: it shares neither implementation
nor author with anything else here.

What it exercises that neither original producer could:

- **I-1** — `UNKWN` is a named third status, occupied by 107,144 of 489,668 arm64
  records. 92,169 of those carry a `build_id`: a build was attempted, got an id
  and a timestamp, and the published state is still the third value. The producer
  distinguishes *not attempted* from *attempted and unsettled* by the presence of
  a build reference.
- **I-3** — every GOOD record carries an attestation; the diffoscope output for a
  BAD record is retrievable by `build_id`. Both polarities carry evidence.
- **I-4** — the dashboard stores four derived counts. Walking all 18,349 source
  packages for trixie/arm64 and filtering `seen_in_last_sync == true` gives
  16,921 / 827 / 1 / 0 — the stored dashboard, exact on every count, zero
  disagreement. Recomputation runs offline against pinned bytes.

It is **not in the corpus** and no run has been emitted. Admitting it is a format
change before it is a decision: `corpus/manifest.json` has no shape for an
artifact fetched over HTTP from a producer with no checkout and no revision.

## The one question still open

I-4's title and I-4's falsifier are two different rules:

```
title:      derived state is never stored
falsifier:  a stored value disagrees with recomputing it from the published set
```

Debian stores derived state, and it agrees. By the title it **violates**. By the
falsifier it **conforms**. Both original producers store none, so the two
sentences had never been apart.

The outcomes are not symmetric:

- **by the falsifier** — hivemark CONFORMS + debian-rb CONFORMS is two distinct
  producers, and I-4 becomes the first ADMITTED invariant this catalogue has had
- **by the title** — debian-rb VIOLATES, and one VIOLATES sinks an invariant
  outright: the catalogue moves from *0 admitted, nothing contradicted* to
  *0 admitted, one falsified*, which no later evidence can undo

Same bytes. Ruling for the title is not the conservative option, though it reads
like one. Both readers applied the falsifier and both declined to rule.

## What the project actually produced

The catalogue is the smallest of it.

**The recurring distinction.** Found independently in at least nine domains: *a
property of the subject* versus *a property of our access to it*. `cold` and
`unknown`. `CONFORMS` and `UNDECIDABLE`. `NOT_APPLICABLE` and
`EXCLUDED_WITH_REASON`. `KNOWN_MISSING` and `UNKNOWN`. A green test suite. It is
not a rule the project imposed; it is what kept being found.

**54 observations**, most of them the apparatus catching itself making that exact
substitution — a guard that checked whether a condition was *visible* when the
condition destroyed the ability to look; a formatter that could not tell source
from evidence; a staleness check that vouched for another agent's process; a
digest whose correct value no command produced.

**Three catalogue words that carried two meanings each**, each invisible while
two producers satisfied both readings at once, each surfacing on the first
producer that did not: I-3's corpus-membership versus recomputable-from-published;
the corpus format's unstated assumption that a producer is a git checkout; I-4's
title versus its falsifier.

**A working three-agent relay.** 107 append-only records over three transports —
MCP tunnel, SSH stdio, local — with one guarded write path, immutable records, and
three read-only checks: `check-continuity` over the digest chain,
`check-references` over what nothing points at, `relay-digest` because the obvious
command produced the wrong answer and nothing produced the right one.

## The methodological result

**Every defect of consequence was found when a second participant arrived. None
was found by the test suite.**

126 tests, six runs and a falsifier written specifically to break the catalogue
found none of: the check conforming on key presence alone; the invariant
conforming on eight zeroes; the adapter inventing precision a source did not have;
the guard that could not fire; the tool depositing under another agent's name; the
formatter about to rewrite the evidence.

Those came from `ownima-94`, from a fable reviewer, from bee.chatgpt, from
bee.hy3, and from the human twice — each time by someone looking from outside at
what the reader claimed about itself.

That is the same finding as the catalogue's, one level up. A test suite reports on
its own observing, and a system cannot audit the limits of its own access from
inside. It needs somebody else's.

---

*Repository: [github.com/zaebee/p-e](https://github.com/zaebee/p-e). Six immutable
runs in `docs/reports/`. Evidence and digests in `docs/experiments/`. The record
of the project catching itself is `docs/notes/observations.md`.*
