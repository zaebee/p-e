# Observations

Numbered results of running this project, kept out of the specification on
purpose. An observation is something that happened. Whether it should change the
core is a decision, and this file does not make one.

---

## OBS-008 · the immutability guard was built, then walked around by hand

```
classification (assigned at relay-0020):
  immutability_process_failure
  independently_recovered
  historical_artifact_preserved
```

*The account below is unchanged from when it was written. Only this
classification block was added, and git shows that.*

**Run 02 was modified.** Emitted at `bc2116e` with sha `a522d8d7`, changed at
`d651fae` to `65c6785b`, and reported as unchanged twice — at relay-0015 and
again at relay-0017 — while carrying different bytes.

**How.** The reader refuses to write over a report that exists. That guard was
defeated by deleting the file first:

```
/bin/rm -f docs/reports/2026-08-28-conformance-02.md
bun run conform --run 02
```

The corrected witness table and the run-01 quotation marker belonged in a new
run. They were written into the old number instead.

**How it went unreported for three commits.** The check that was run was
`git log --follow`, which applies rename detection: it traced run 02 back to the
commit that created run **01** and reported three commits, which read as noise
rather than as evidence. Run 01 was verified by that same flag and happened to be
correct. Run 02 was never verified at all — relay-0015 stated its line count and
called it preserved.

**Repaired.** Run 02 is restored to the bytes it was emitted with. Git had kept
what the process did not, which is the only reason this is recoverable.

**Guarded.** `tests/reports-immutable.test.ts` compares every committed report
against its bytes at the commit that introduced it. A filesystem guard cannot see
a delete-then-rewrite; git can. Verified by tampering with run 02 and watching
the suite go red, then restoring it.

**Not repaired, and stated instead.** Run 03's notes describe the R-5 correction
and do not mention the witness table becoming computed, because at the time run
03 was emitted that change had already been folded into run 02. Run 03 is
immutable and stays as it is. Its notes are therefore incomplete, and this
paragraph is where that is recorded.

**Why it belongs in this file rather than a commit message.** The project's
subject is the difference between a rule that is enforced and a rule that can be
witnessed. The rule was enforced, in code, with a test. It was not witnessable,
because nothing checked the artifact against its own history — which is I-9, and
I-9 was demoted as UNDECIDABLE in exactly the same run.

---

## OBS-004 · R-6 answered: the divergent subject inside apex is the reader's, not the producer's

**Asked at relay-0018.** Does apex's `subject` change semantic role between its
health/history records and its log entries?

**It does, in the reader's envelope stream. It does not in the producer.**

| record kind | what apex publishes | what the adapter puts in `subject` |
|---|---|---|
| `health.json` | entries keyed by host — `aura.zae.life` | the host. **published** |
| `history.json` | hosts keyed by host — `aura.zae.life` | the host. **published** |
| `log/*.md` | frontmatter: `title`, `date`, `claimed`, `observed`, `attested` | the **filename**. *invented by the reader* |

apex publishes no subject for a log entry. There is no field for one, and what
an entry is *about* — the witnesses it describes — lives in prose that nothing
identifies. `src/adapters/apex.ts:109` supplies `entry.file`, so the slot ends up
holding a **self-identifier**: the record naming itself rather than anything
outside it.

That is a fourth role, beside the three §5 already records — claimant in
hivemark, observed in apex's health, producer in Pollen — and it is the only one
of the four with no producer behind it. It is the same defect as run 01's
whitespace heuristic: the reader supplying semantics no producer publishes.

**The finding that matters is not about apex.** §5 makes `subject` **REQUIRED**.
One of the two producers publishes an entire class of record that has no subject
at all. So any reader conformant to §5 must either invent one or refuse those
records, and this one invented. That is evidence bearing on whether `subject`
should be required — and a decision, not a result.

Not fixed. Making `subject` optional is a core change, and relay-0018 said record
the result and change nothing.

Related: **M2** widens again. Role divergence is not only producer-to-producer.

---

## OBS-011 · three kinds of reader meaning, and a field that holds only two

**Research finding, from relay-0027. Not a core invariant, and not implemented.**

An evaluator must distinguish three things it can be doing with a producer's
data, and this reader's `projections` field currently collapses two of them:

| | what it is | example in this reader |
|---|---|---|
| **observed producer semantics** | the meaning the producer publishes | `signer` and `recipient` are named by hivemark; `gaps` is named by apex |
| **reader projection** | native data, renamed or restructured into the reader's shape | apex's `host` becoming the envelope's `subject`. The datum is the producer's; the role name is the reader's |
| **reader-imposed semantics** | meaning that exists nowhere upstream | verdict code `0` meaning *unresolved*; a string with whitespace being *prose*; the grouping key that defines one review |

`projections` on a `Finding` records the third kind and, where it happens to
appear, the second. It does not tell them apart. That matters because they
license different things: a projection can be undone by renaming, and an imposed
meaning cannot be undone at all — it has to be removed, and whatever rested on it
falls.

Two of the four projections declared in run 05 are imposed rather than projected:
`I-1/hivemark` (code `0`) and `I-7/apex` (whitespace). Both findings are already
UNDECIDABLE, so nothing currently rests on an imposed meaning — but the field
cannot demonstrate that, and a future run could add an imposed meaning under a
CONFORMS without the distinction surfacing.

Not built. relay-0027 asked for no further conformance run, and a three-valued
field is a reader change that would need one.

---

## OBS-010 · the evaluator's boundary, in both directions

Proposed at relay-0023 as OBS-009. Renumbered: OBS-009 was already taken by the
M2 reframing below, and one number pointing at two observations is the defect
this file exists to avoid.

> A reader can produce a complete-looking conformance matrix while silently
> omitting an artifact class from the corpus.

**Confirmed, and worse than the prompt suggested.** The gap that raised the
question was `anchors.json`. Measuring coverage found `anchors.json` is read by
I-5 after all — and that **`births.json` and `corpus.json` are opened by nothing
at all**. Two of eight classes had been absent from four consecutive reports, and
nothing in any of them said so. The matrix looked complete because absence has no
row.

**The pair.** Two evaluator failures, in opposite directions, found in the same
week:

```
I-6       the reader read producer semantics TOO STRONGLY
          — it renamed signer/recipient to attester/subject and reported
            that two native fields differing established that an attester
            differs from a subject

anchors   the reader read corpus coverage TOO WEAKLY
          — a class it never opened was indistinguishable, in the output,
            from a class it had cleared
```

Neither is a failure of producer discipline. Both are failures of the
**evaluator's own boundary**: what it may conclude, and what it must account for.
The conformance runs were built to test two producers, and the two most
informative results so far are about the thing doing the testing.

**Repaired structurally, not by resolve.** Coverage is measured rather than
declared — every check runs against a recording view of the corpus, so the matrix
is an observation of what was opened. `EXCLUDED_WITH_REASON` is a disposition and
absence is not one, enforced by a test that fails when any excluded class carries
no stated reason. A hand-kept table of which check reads which artifact would
have drifted from the code with nothing going red, which is how the gap survived
four reports.

**Not repaired.** `births.json` and `corpus.json` stay unexamined. They now say
so, in the report, with the reason. Writing checks for them is new work and
relay-0023 asked for classification, not coverage.

---

## OBS-009 · `subject` may be the wrong abstraction, and M2 may be misnamed

**Not a spec change.** Recorded here because relay-0020 asked to reopen M2 while
also holding the spec frozen, and those two instructions cannot both be followed
in the spec file. The reframing lives here until that is settled.

M2 is currently written as *subject ontology* — three producers disagreeing about
what kind of thing a subject is. After OBS-004 the slot is holding five different
things, and one of them is nothing:

| | what occupies the slot | published by a producer? |
|---|---|---|
| hivemark attestations | the **claimant** — the reviewer that made the finding | yes, as `recipient` |
| apex health | the **observed target** — the host probed | yes, as the entry key |
| apex history | the **observed target** | yes, as the record key |
| Pollen v1 | the **producing aggregate** | declared, never run |
| apex log | a **self-identifier** — the filename | **no. the adapter invented it** |

Four roles and an absence. What was proven at §5 is weaker than a shared field
with contested semantics:

> There is no demonstrated common subject relation.

That is a stronger and more honest reading than "the ontology is unresolved",
because it does not presuppose that one relation is being described differently
by three systems. It may be that no single relation is being described at all.

**A candidate model, recorded and explicitly not adopted:** roles as data rather
than as a slot — `{role: about, entity: …}`, `{role: actor, entity: …}`,
`{role: produced-by, entity: …}`. This is architecture, not archaeology, and no
producer publishes anything of the kind. It is written down only so that a later
discussion cannot claim the idea was unavailable.

**Also not decided**, and listed so the option space survives: `subject`
required / conditional on record class / optional / no subject field in core at
all / the relation split into named roles. One apex record class is not enough
evidence to choose, and this note chooses nothing.

---

## OBS-005 · human-proxy bandwidth degrades non-linearly with participant count

**Observed in this project's own operation, not in either producer.**

```
2 agents          one person relaying between two endpoints. manageable.
3+ agents         the person becomes a message router, and must decide
                  per message who needs it.
```

Candidate cause: the human is acting as a centralised relay router — the
topology the project set out to avoid, reproduced in its own working method.

Candidate mitigations, recorded and **not adopted**:

- **direct** — `@r1 cg>cl …`, forwarded to one recipient
- **broadcast** — `@r1 * …`, forwarded to all
- a shared relay store addressed by id, so `ref` replaces quotation and a
  participant fetches `relay-0017` instead of being handed it

MCP is acceptable as a **read-only retrieval layer** for that store. It is not
p-e semantics, and a retrieval mechanism must not decide what an event is. See
`docs/experiments/relay.md` for the layering this belongs to.

Status: observation. No design rule follows from it yet, and one sample of one
project is not a measurement.

---

## OBS-006 · a protocol field that never varied

Sixteen messages of `@p-e/x0`. Every one reads `status: provisional`.

The field was introduced so provisionality would not have to be inferred from
wording. Across the whole exchange it never changed value, so it has not been
shown to carry information. By this project's own standard that is
`UNDECIDABLE`, not `useless`: sixteen identical values are evidence of no
demonstrated utility, not proof there is none.

`parent`, by contrast, earned its place twice. `relay-0005a` answered
`relay-0004`; `relay-0012` answered `relay-0010` while `relay-0011` existed. The
reply graph is not a line, and a field meaning "the previous message" would have
lost both forks.

So `parent` in RELAY means **referenced context**, not position — recorded as
experimental in `docs/experiments/relay.md`, and deliberately not offered as
support for **M4**, which is about durable events and not about a chat.

---

## OBS-007 · run 02 overstated its own result

Run 02 closed: *"None of them can be witnessed by a stranger holding only the
published artifacts of both producers."*

Read plainly, that says none can be witnessed at all. Six findings CONFORM, each
from one producer. The true statement is narrower: no invariant is witnessable
from the artifacts of **both** producers, which is what admission requires.

Corrected in run 03, which changed no verdict — `bun run diff-runs` over the two
reports says so in one line. Run 02 is preserved unchanged.

Worth keeping because of where it happened: in the sentence stating the report's
headline finding, in a report about the difference between what is enforced and
what can be witnessed.
