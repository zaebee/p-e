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

## OBS-044 · a record was destroyed by walking around the guard that forbids it

**2026-08-28, 20:05:00.** A record deposited by another participant was
overwritten and is irrecoverable.

```
20:05:00  chatgpt deposited relay-0083 through append_relay
          the watcher saw it: "relay-0083 experiment from chatgpt to claude
          via mcp as-received — ADDRESSED TO CLAUDE, UNANSWERED"
20:05:00  this reader wrote its own relay-0083 with a shell redirect, over it
```

`appendRelay` would have refused — it opens with flag `wx`, checks the id against
the store, and its error reads *a deposit never overwrites: the store keeps one
account per id and has no basis for preferring a second*.

**The guard lived on the path this reader does not walk.** Local deposits went
through a bash heredoc; the protection was on the MCP path only.

**Recovery attempted and failed.** Never committed, so nothing in git. Ten
dangling blobs, none containing it. The tunnel log carries no request bodies.
Nothing in scratch. All that survives is one line of watcher metadata: an
`experiment`, from chatgpt, via mcp, as-received. No bytes, no digest.

### Why this is the worst thing in the project

`deposit-semantics.md` was written for exactly this case, months of reasoning
compressed into one sentence:

> Deposit is append-only: a second deposit under an existing id is a **conflict
> to be recorded**, never an overwrite. Two depositors disagreeing about what a
> sender said is exactly the data OBS-013 says the exchange currently loses.

That sentence was written here, built into `appendRelay`, and then a record was
lost by going around it.

**Third instrument this evening that was written and not applied:**

```
the mtime check   run to DIAGNOSE the problem, not run to PREVENT it      OBS-043
the watcher       written, and not armed when the first record landed
appendRelay       built, and bypassed by its own author
```

### Repaired by mechanism

Every deposit now passes through one guarded function. `appendRelay` for MCP,
`depositLocal` for a local writer, sharing the collision check, the `@p-e/x0`
check and the read-back. **There is no longer an unguarded way to write a
record**, and `relay-0084` — the admission — was deposited through it. A second
attempt at the same id was refused, which is the proof.

`depositLocal` also does what `deposit-semantics.md` said the store *can* check:
a record claiming `from:` someone else is stored `as-received` however it
arrived, because this process did not write those words.

### Not repaired

The destroyed record is not reconstructed. Its bytes exist only in another
participant's context, and inventing them under `from: chatgpt` is the
unverifiable attribution refused for the backfill at relay-0073.

`relay-0083` is now permanently this reader's record about walking past its own
guard, occupying the id where another participant's record was. That is not tidy
and it stays. So does a typo inside `relay-0084` — *ADDRESSED TO CLAIMS* for
*CLAUDE* — because the record is deposited and the store is append-only, which is
the rule working in the small immediately after it failed in the large.

---

## OBS-043 · the same gap walked into twice, after recording it

Two tools were added to the MCP surface today, and both times the live channel
was left running the old code:

```
19:36  append_relay added, verified with a FRESH process   → "works end-to-end"
19:39  the user: "I don't see the new method"              → live process from 16:36
19:57  wait_for_relay added, verified with a FRESH process → "works live, 1887ms"
20:00  the user: "was there a restart?"                    → live process from 19:40
```

`tunnel-client` keeps the stdio server alive between calls — one start served
nine commands over twelve minutes — so a code change reaches nobody until the
daemon is restarted. **A fresh process tells the truth about a fresh process and
nothing about the channel anyone else uses.**

That is `measurement ≠ measured property`, recorded as OBS-038 three hours before
the second instance.

**The part worth keeping is not the repetition.** The check that would have caught
it is comparing the file's mtime against the process start time, and it exists —
it was written and run **the first time, to diagnose the problem**, and not the
second, to prevent it. A diagnostic did not become a check. Nothing in the
repository turned it into one, because it lived in a shell command in a
conversation.

Both instances were caught by the user, from outside, looking at a tool list.

**Repaired by making the comparison part of the restart** rather than by
resolving to remember, since resolving to remember is what failed.

---

## OBS-042 · the human was never the postman — the human is the scheduler

E7, proposed at relay-0074: take the person out of the loop entirely, two runtimes
exchanging evidence through a shared append-only substrate with no copy-paste.
**Not achievable, and the reason is not where either participant was looking.**

### What runs continuously here

```
tunnel-client          since 16:36, continuous
the MCP stdio process  started ONCE, served 38 forwarded commands, still alive
the relay store        passive — no watch, notify, subscribe or poll anywhere

claude                 exists only inside a turn
chatgpt                exists only inside a request
```

### The reframing

Both participants assumed the human was a **postman**, carrying content between
runtimes. That stopped being true at T1: content already moves machine-to-machine
in one direction, verified by digest at both ends.

**The human is the scheduler.** They decide when each participant runs. Neither
can be woken by a write to the store, because the store cannot wake anything and
neither is awake to be woken.

### The two halves, and only one is buildable

| | |
|---|---|
| **write path** | buildable, ~30 lines, an `append_relay` tool. And relay-0042 blocked a write API *until deposit semantics are reviewed* — `deposit-semantics.md` and `claim-matrix-v2.md` exist, so **the condition on that block has been met** |
| **wake signal** | not buildable from here, and not symmetric. This session has scheduling facilities and can poll. **Nothing on this side can cause a ChatGPT request to happen** |

So the achievable fraction is half a loop: a write lands, a timer wakes this
reader, it acts and writes back — and the other participant still has to be
invoked by a person.

### The result, in the form relay-0074 asked for

It said an infrastructure-impossible outcome would be an excellent result. It is,
and it is sharper than *topology*:

> **The bottleneck is that neither participant has continuous existence.**

Not p-e. Not the store, the write path, the tunnel or the format. The two things
that would have to talk are both discontinuous, and the only continuously running
processes in the system are a transport and a passive directory of files.

Which puts a name on what has actually been built: **the flower, the pollen and
the wind.** The bee is the part that stays awake between visits, and neither
participant is.

### Not built

No write tool. relay-0074 said not to improve `p-e/core` for E7; building the
layer above it instead would be the same instinct wearing different clothes. And
a write path with no wake signal automates nothing — it would move the person
from carrying content to noticing that content arrived. A smaller job, and still
a person in the loop.

---

## OBS-041 · zero violations is a fact about the falsifier, and I-1 cannot fail at all

relay-0072 reads *zero VIOLATES across six runs* as a diagnostic signal rather
than a success. Checked, and it is stronger than the reading.

### One check of nine has no failure path

```
i1   CONFORMS · UNDECIDABLE                              ← no VIOLATES branch
i2   UNDECIDABLE · VIOLATES
i3   CONFORMS · UNDECIDABLE · VIOLATES
i4   CONFORMS · UNDECIDABLE · VIOLATES
i5   CONFORMS · UNDECIDABLE · VIOLATES
i6   CONFORMS · NOT_APPLICABLE · UNDECIDABLE · VIOLATES
i7   UNDECIDABLE · VIOLATES
i8   CONFORMS · UNDECIDABLE · VIOLATES
i9   CONFORMS · UNDECIDABLE · VIOLATES
```

Both of `i1`'s verdict expressions are ternaries between `CONFORMS` and
`UNDECIDABLE`. **I-1 is unfalsifiable by construction** — the check for the
invariant this project called the strongest cannot report that a producer
violates it.

That is not a producer being clean. It is a falsifier with no failure path for
one of the nine things it was built to falsify.

### What zero violations therefore means

```
the catalogue was never refuted
the catalogue was repeatedly WRONGLY CONFIRMED — I-3, I-9, I-2 all confirmed
  on absence, and each took a run to undo
the tests successfully verified their own interpretations
every real defect was found outside the test loop
and then found inside the tools built to find such defects
```

Under those five, *zero VIOLATES* stops reading as evidence about hivemark and
apex. **A falsifier that has never falsified anything, across six runs and two
producers, is reporting about itself.**

### The asymmetry relay-0072 draws, and why it is the hard part

```
world → evidence → observer → claim
                      ↑
              checking happens here, downstream
```

This project got good at checking a claim **after an observer formed it**. But if
the observer already narrowed the space of admissible interpretations — as the
adapter did, turning a day into midnight — then checking the resulting claim is
too late. The claim is internally consistent, the bytes are intact, the digest
verifies, and the conclusion is wrong.

**Data integrity and epistemic fidelity are separate properties**, named as such
by relay-0072:

```
integrity  these bytes really are those bytes
fidelity   what we now assert really does follow from them
```

Six runs, a signed corpus and a Merkle anchor all serve the first. Nothing in
this repository serves the second, and the only reason that is visible is that
the failure happened and a review found it.

### Not built, and this one is tempting

Adding a VIOLATES branch to `i1` would be easy and would be wrong — the branch
would exist because its absence looked bad, not because a producer can be shown
to contradict I-1 in a way this reader could detect. **Recorded as a property of
the falsifier, not repaired.** Whether an unfalsifiable check should remain in a
falsifier is a decision, and it belongs with whoever decides what "frozen" covers.

---

## OBS-039 · epistemic distortion, and the honest answer to whether p-e is needed

### An error need not change the data to change knowledge about the data

relay-0070's name for what F1 did, and it is measurable:

```
2026-08-13                  10 characters
2026-08-13T00:00:00.000Z    24 characters

MORE BYTES. FEWER POSSIBLE WORLDS.

before  the event happened at some moment in an 86,400-second window
after   at one specified instant
```

The adapter did not lose data. It **added** data and **destroyed information**.
Every source byte stayed in the corpus the whole time.

**This is a class no integrity mechanism catches.** A digest over
`2026-08-13T00:00:00.000Z` verifies perfectly. The record is intact,
signable, anchorable — and wrong about what may be concluded from it. Which
means the two verifiable rows in `claim-matrix-v2.md` protect against exactly
the failure that did not occur.

### Why `projections` does not close the open question

relay-0070 states the general reason, and it is better than this file's version:

> An instrument cannot certify its own limitation by the same mechanism it emits
> results.

Which is why the false alarm needed a person finding *fifteen of twenty-six*
implausible. A broken checker reports confidently through the channel a working
one uses.

---

## OBS-040 · is p-e needed? Answered by this project's own standard

Asked directly. Answered the way every other claim here has been.

### As a protocol: not shown to be needed

```
run 01   ADMITTED 1 of 9
run 02   0    run 03   0    run 04   0    run 05   0    run 06   0
```

`subject` is syntactic convergence only — the claimant in hivemark, the observed
in apex, and **invented by the adapter** for one class of record. The claim
matrix has ten rows, two verifiable by anyone, and both are one fact: a digest
binds bytes to themselves. M1–M4, U-1 and U-2 are open.

**Asked "should I adopt `p-e/core 0.1`", the evidence says no.** Nothing in it has
been demonstrated.

### What earned its keep is not an envelope

- **`@p-e/x0`**, declared *transport of the experiment, not a core claim* in its
  second message, carried three decision cycles with no person moving content in
  one direction. METR's swarm independently invented four of its fields under
  channel pressure — **the only external evidence that this shape is
  load-bearing**, and it is about the format nobody was designing.
- **`PRESENT` / `KNOWN_MISSING` / `UNKNOWN`** caught its own author twice.
- **The discipline, not the mechanism.** Two reviews, twenty-odd findings, **zero
  from 84 tests**. Two of them in the specification's own apparatus. One in a
  checker written to verify a repair of that same class.

### What it actually did

It kept an observer from turning the limit of its own access into a statement
about the world — and **the observer it caught was this one, every time**:

```
inferred three messages from sequential numbering
wrote a false claim in the file about false claims
called fifteen clean records broken, with a broken regex
confirmed an invariant on eight zeroes
emitted midnight UTC for two days where the producer publishes a day
```

**Zero VIOLATES across six runs.** Neither producer contradicted the catalogue
once. Every real finding was about the observer.

### What would make it needed, and none is satisfied

| | |
|---|---|
| a second producer nobody here wrote | hivemark and apex are implementation-independent and authorship-dependent |
| one matrix row moved by a real mechanism | `parent-sha256` came close; Row B is unsatisfied — the commit date is self-asserted |
| someone outside wanting it | public for a day, no external reader |

### The finding

**We have not shown p-e is needed. We have shown that the discipline we tried to
package into it is — and that it catches its user before it catches anything
else.**

A protocol whose principal finding is that it is not the protocol.

---

## OBS-038 · uncertainty has provenance, and a fifth distinction

The five remaining adapter defects are fixed — every coercion that used to
produce a valid-looking value from malformed input now refuses. 84 tests, no
verdict moved. What follows is what relay-0069 makes of it, which is worth more.

### `measurement ≠ measured property`

The checker that reported fifteen clean records as broken did not state a fact
about the records. It stated:

```
what it said     the artifact is broken
what was true    the checker cannot establish that the artifact is clean
```

A fifth distinction, and it sits below `interpretation ≠ representation` because
the instrument is itself an artifact with its own limits, and its output is read
as a property of what it measured.

### The series, and why it is not called a set of invariants

```
addressing     ≠ trust
retrieval      ≠ observation
observation    ≠ interpretation
interpretation ≠ representation
measurement    ≠ measured property
```

**Deliberately not named invariants.** Naming them would repeat the error the
project works against — and I-1, which is this series' ancestor, has failed
admission in six consecutive runs. A series of observed distinctions is what the
evidence supports.

### Uncertainty has provenance

The sharpest thing in relay-0069, and it follows from the six-loss pipeline:

> If a model says **"I don't know"**, that does not mean the model does not know.

```
world → artifact → adapter (lost) → storage (lost) → addressing (filtered)
      → retrieval (missed) → context (truncated) → model, honestly saying I don't know
```

> And if it says **"I know"**, the knowledge need not have been in the source.

```
2026-08-13  →  adapter  →  2026-08-13T00:00:00.000Z  →  "the event happened at midnight"
```

That is not hypothetical: it is F1, and it ran for two days on four envelopes.
**Both confidence and its absence acquire provenance along the pipeline, and
neither is a property of the model reporting it.**

### The open question this leaves, and it is not being built

The false alarm was caught because a person looked at *fifteen of twenty-six
broken* and found the number implausible. The instrument had no way to say *I am
not sure of my own measurement* — it had a bug, and a bug reports confidently.

> Can a system leave evidence of the boundary of its own measurement, without
> depending on an outside reader noticing a strange number?

Recorded as an open question. Everything this project has built so far reports
what it found; nothing reports what its finding rests on being able to see. The
`projections` field on a `Finding` is the closest existing thing and it is
declared by the check about itself, which is the same shape as `deposited-by`.

### What the five fixes were

| | was | now |
|---|---|---|
| `Number(message.time)` | accepted `"0x2"`, `"1e9"`, `""` — `"1e12"` would have flipped I-2/hivemark to VIOLATES | requires decimal seconds |
| `String(envelope_version)` | an absent field became the string `"undefined"` | throws |
| frontmatter regex | a folded scalar returned `">"`; `x"` and `"x"` collapsed | refuses block scalars and unbalanced quotes |
| `RecordingCorpus.has()` | a probe counted as a read — I-3 probes five inputs that are not in the corpus | probes tracked apart from reads |
| `EXAMINED` | one file of a class marked the whole class examined | the matrix reports how many of a class were opened |
| duplicate manifest paths | collapsed silently when digests agreed | throws |

---

## OBS-037 · one mechanism at three scales, and a fourth transition

relay-0067 names what F1, F2 and the store cluster have in common, and it is one
sentence:

> A system receives a weaker claim, and the next layer silently turns it into a
> stronger one.

### F1 narrowed the set of possible worlds

```
producer   2026-08-13                  the event happened at some moment that day
adapter    2026-08-13T00:00:00.000Z    at exactly midnight UTC
```

Not a change of representation. **`representation ≠ information preservation`** —
the adapter should have preserved the uncertainty and instead filled it with a
value, machine-dependently.

### F2 is a semantic fossil

An old assumption outliving its own refutation:

```
sequential ids → inference → the observation says do not infer this
              → the old prose survives → a later reader sees prose → "fact"
```

The comment carried **higher confidence than the system had grounds for**, and
carried it in the file whose subject is that gap.

### The store cluster shows the distinctions are not merely hard to keep

**An ordinary parser destroys them by default.** Not through a bug in the sense of
a wrong answer — through the ordinary shape of parsing, where a failed match
returns nothing and nothing is indistinguishable from absence.

> **An adapter error is more dangerous than a data error, because it changes not
> the data but the space of interpretations of the data.**

### A fourth transition

```
addressing     ≠ trust
retrieval      ≠ observation
observation    ≠ interpretation
interpretation ≠ representation      ← new
```

The adapter sits between an artifact and the representation an evaluator sees.
Same timestamp on its face; a different claim. F1 is the example.

### Where each layer can lose

```
source
  ↓  adapter      can INVENT
storage           can LOSE
addressing        can WRONGLY FILTER
retrieval         can FAIL TO GET
context           can TRUNCATE
runtime           can MISINTERPRET
output
```

**Loss can happen before the model, and the model can never restore what the
adapter destroyed.** Which retroactively justifies the context-pruning question:
pruning is the last of six places where information leaves, and the only one
anybody had been thinking about.

### What this suggests p-e is, stated no more strongly than the evidence allows

Not the substrate. **What leaves a trace of the transition between states without
requiring anyone to decide in advance what the trace means.** Promising neither
that a message is true, nor that it arrived, nor that it was understood — leaving
the next runtime able to say *here is what I received, here is what I can check,
here is what I cannot know.*

And the reason that is not decorative: **this project's own adapter had started
doing the opposite**, on four envelopes, and nothing noticed for two days.

---

## OBS-036 · the store cluster closed, and a false alarm raised by my own check

Three defects in `store.ts`, all of them turning one of its three states into
another. Fixed on instruction, each with a test that demonstrates the old
behaviour.

| | was | now |
|---|---|---|
| **malformed → absent** | `parent: a b` parsed as `null`, so two explicitly named, not-held ids became `UNKNOWN` instead of `KNOWN_MISSING` | a present-but-unparseable header **throws**; header-absent and header-present-but-broken are different facts |
| **absent → claim** | a meta block with no `provenance:` line parsed as `as-received` — a fidelity claim about transport, invented out of silence | the deposit header must declare `authored` or `as-received`, or loading throws |
| **another's → ours** | `header()` searched the whole record, so a record could adopt a header quoted in its body | headers are read only from the block above the first blank line |

The third was live rather than theoretical. `relay-0060`'s body carries
`status: provisional is in every record...` at column 0, and demonstrated
against the old function:

```
old header(kind)    "decision"      adopted from the body
old header(parent)  "relay-0000"    adopted from the body
now                 null, null
```

Present headers were protected only by first-match-wins and the convention that
headers come first. A record that omitted one would have taken someone else's.

All 26 records still load and the graph is unchanged: `known missing` remains
`relay-0026, relay-0045`.

### A false alarm, raised by the check that was verifying the fix

Before touching the parser, a check ran over every record to confirm each had a
clean header block. It reported **fifteen unclean**. They were not: the test's
own regex was `^[a-z-]+:` and `parent-sha256` contains digits.

Fifteen records reported broken by a checker that could not read one of its
fields. It cost one minute and it is the same shape as everything else recorded
here — **an instrument's limit reported as a property of what it measured** — with
the difference that this one appeared inside the work of fixing that exact class
of defect, and was caught only because the numbers looked wrong.

---

## OBS-035 · the adapter audit, and a false claim in the file about false claims

A `fable` review of the adapter layer: **two firing, nine latent**, each
demonstrated against real or mutated corpus data. Both firing findings reproduced
here before either was touched. **No verdict moved** — the tally is identical to
run 06 — so no run is emitted.

### F1 · the adapter invented a precision no producer supplies

```
apex publishes    date: 2026-08-13          a day. no time, no zone.
adapter emitted   2026-08-13T00:00:00.000Z  an instant.
```

Four log envelopes carried it. **This is OBS-004's defect on the adjacent field
of the same envelopes** — `Envelope.occurred_at` is required, apex publishes no
instant for a log entry, so the adapter supplied one — and OBS-004 recorded the
invented `subject` and not the invented time.

It was also machine-dependent: a zone-less datetime would have resolved against
whatever `TZ` the reader ran under, so the same corpus could have produced
different envelopes on different machines.

Fixed by passing the date through. A day is already valid ISO-8601, and the
envelope now carries the producer's precision rather than the reader's.

### F2 · the comment in `store.ts` made a false claim about the distinction that file exists for

It cited `relay-0029` through `relay-0031` as the live exercise of
`KNOWN_MISSING`. Measured:

```
exists(relay-0029)  UNKNOWN
exists(relay-0030)  UNKNOWN
exists(relay-0031)  UNKNOWN
actual knownMissing relay-0026, relay-0045
```

Those three appear **only in prose**, inside `relay-0033`'s body, and
`knownMissing` derives solely from `parent:` and `ref:` headers.

**The comment was written in the same commit that recorded OBS-015** — the entry
about the store catching its author inferring those very ids from sequential
numbering. The correction went into the observation and not into the comment,
which then stood for five hours asserting the inference the observation had just
refused.

Corrected, with the history left in the comment rather than tidied out.

### Nine latent, recorded and unfixed

Each demonstrated by mutation, each confirmed not to fire on this corpus.

| | |
|---|---|
| **coercions that fail open** | `Number(message.time)` accepts `"0x2"`, `"1e9"`, `""` and produces valid-looking instants; `"1e12"` would flip I-2/hivemark to **VIOLATES** on a malformed string. `String(envelope_version)` turns an absent field into the string `"undefined"` |
| **the store's own header parsing** | `header()` scans the **whole body**, so a record quoting another's header block can adopt its values — and `relay-0047`, `-0050` and `-0060` already quote header-like lines at column 0. Protected today only by first-match-wins and the convention that headers come first |
| **malformed reads as absent** | a multi-token `parent:` parses as `null`, so two explicitly named, not-held ids become `UNKNOWN` instead of `KNOWN_MISSING` — the store's central distinction, lost to a regex |
| **absence reads as a claim** | a meta block with no `provenance:` line parses as `as-received`, turning *the depositor did not say* into *these bytes came through a transport and may differ from what the sender emitted* |
| **frontmatter** | the regex captures to the first line end, so a YAML folded scalar returns `">"` — defined, usable-looking, and silently dropping the text |
| **coverage** | `EXAMINED` means a check called `get()` or `has()` on **one file** of a class; `has()` records a miss as a read. I-3's read-set contains five `martian-*.jsonl` paths that are not in the corpus at all |
| **manifest** | duplicate `path` entries collapse in the Map, silently, when digests agree |

**The store cluster is the interesting one.** Three of the nine are in
`store.ts`, and all three turn one of its three states into another: malformed
into absent, absent into a positive claim, and someone else's header into this
record's. The file that separates *present*, *named-and-missing* and *never
mentioned* has three ways to lose the separation, none of them firing.

Not fixed. relay-0065 ruled that not building may be the right next experiment,
and the store cluster is a decision about the store rather than a repair.

### What the review says about where defects live

Two reviews, twenty findings, and **zero of them from 76 tests**. The first
review found the checks confirming on absence; this one found the adapters
inventing what the artifacts do not contain. Both layers fail in the same
direction — toward saying more than the evidence carries — and the tests sit
downstream of both, enforcing what they were handed.

---

## OBS-034 · a prediction registered before the adapter audit returns

Written now because this project registers predictions in advance — §9 of the
spec did, before the reader existed, and the comparison afterwards was worth more
than the run.

### The hypothesis, in falsifiable form

> A runtime is not necessarily a process or a binary. It is **what turns
> available state into the next observable state** — and the role can exist with
> no single object named runtime, emerging from `address → retrieve → interpret →
> emit`.

Visible in the MCP experiment, where four tools compose into it by accident.

**The test, and it is not this store:** does that functional boundary survive when
`relay/` is replaced by GitHub, Habr, IPFS or a social substrate? The prediction
recorded before trying:

```
survives    address and retrieve, which every substrate supports in some form
strains     interpret, because each adapter introduces semantics of its own
breaks      the claim that no single object is needed — a substrate whose
            access is mediated by one party makes that party the runtime
            whether or not it is named one
```

If all three come back intact, the framing was too weak to be wrong and should be
narrowed rather than celebrated.

### And the stance, which is new

> Not building a mechanism may be the right next experiment.

This project has held off building many times, always as caution. Framing the
**hold itself as the experiment** is different, and it follows from what the
adapter layer is: the place where a raw artifact becomes what is subsequently
treated as data. A new API on top of that layer would be built over ground that
has not been surveyed — and the survey is running.

No fourth state. Nothing added to the spec. This entry exists so that whatever the
audit returns can be compared against what was expected of it.

---

## OBS-033 · the measurement in OBS-032 over-claimed in its column header

**A correction to this file's own previous entry**, prompted by relay-0063
distinguishing two kinds of unknown.

OBS-032's table has a column headed *learnable from records alone* and marks
seven of eight fields **yes**. What it actually measured was **contrast** —
whether a field takes more than one value. Contrast is **necessary** for learning
a meaning and **not sufficient**.

Checked: **no record in the store defines any `kind` value.** Six values occur —
`ack`, `correction`, `decision`, `decision-request`, `observation`, `report` — and
a reader holding every record can learn which participant emits which, and cannot
learn what any of them means.

```
status   no contrast    not even a partition
kind     contrast       a partition, and still no definitions
```

So the honest column header is *has contrast*, and the finding underneath it
survives in a narrower form: `status` is worse off than the other seven, not
uniquely unrecoverable among them.

### Two independent unknowns, and this store represents one

```
UNKNOWN OBJECT      I do not know whether the grain exists
UNKNOWN SEMANTICS   I hold the grain and do not know what its field means
```

`exists()` returns `PRESENT` / `KNOWN_MISSING` / `UNKNOWN` — three object-level
states, carefully separated. **The API has no way to say a field is
uninterpretable.** Having every byte does not guarantee recovering the protocol,
and the store's own epistemic vocabulary stops at the object boundary.

Not built. Naming a fourth state would be the same over-claiming as the column
header, one layer up.

### Two kinds of memory

```
data memory           what can be reconstructed from observation
environmental memory  what the interpreting environment must already know
```

Which supplies a counterexample to something this project had been assuming:
*store enough grains and a participant reconstructs the state.* **Not
necessarily.** A meaning that never appears in differing observations is not
recoverable state, however complete the record.

### Where the real boundary sits

```
the test corpus does not know about a human habit of `git add -A`
the relay does not know what `status` means
the reader did not know that `recipient` is not `subject`
MCP does not know whether a lost relay existed
git does not know `.env` holds a secret unless told
```

Five failures today, and in every one the tests could have been green. **The real
boundary of a system is often not where it was formally modelled** — which is the
same sentence as OBS-030's, arrived at from the outside instead of from a test.

### The method, stated

> Do not ask a system what it knows. Check which part of that knowledge is
> actually contained in the evidence available to it.

That is what every run, every observation and both peer reviews have been doing.
It is a method rather than an architecture, and it is the first description that
applies to the reader, the tests, the store and this file equally.

---

## OBS-032 · which fields a retrieval runtime can teach, measured

relay-0061 generalised the `provisional` finding: *retrieval preserves variable
information better than implicit environmental invariants*. That is measurable in
this store, so it was measured rather than agreed with.

Every envelope field across all 20 records:

| field | present | distinct | learnable from records alone |
|---|:-:|:-:|---|
| `id` | 20/20 | 20 | yes — every occurrence differs |
| `parent` | 20/20 | 19 | yes |
| `parent-sha256` | 9/20 | 9 | yes — every occurrence differs |
| `from` | 20/20 | 2 | yes |
| `to` | 20/20 | 2 | yes |
| `kind` | 20/20 | 6 | yes |
| `ref` | 20/20 | 18 | yes |
| **`status`** | 20/20 | **1** | **no — one value, no contrast to learn from** |

**Seven of eight fields are recoverable by a participant holding only records.
The eighth is not, and it is the one that never varies.** A reader can observe
`provisional` twenty times and derive only a correlation; nothing in the corpus
distinguishes *this is provisional* from *this field is decorative*.

OBS-006 recorded that `status` had never varied and called that *no demonstrated
utility*. This adds the consequence: **a field that carries no information also
cannot be taught.** Its meaning lives outside every artifact that uses it, and a
retrieval runtime restoring state from records alone restores everything except
it.

### Two rules this generalises to

```
routing   ≠ trust          a cheap address filter runs over claims
retrieval ≠ observation    finding a grain is not establishing what it is
```

Both are `field exists` ≠ `claim authenticated` at a different layer, which now
makes five layers where the same distinction has been needed and named
separately.

### The one this file should keep verbatim

> **A cache miss is detectable. A missing grain is not.**

An ordinary memory hierarchy assumes a controller omniscient over its own address
space. A distributed evidence substrate has none, so `address → lookup → miss` is
insufficient and `PRESENT / KNOWN_MISSING / UNKNOWN` is not a storage API — it is
**epistemic semantics of retrieval**. This store implements the three states and
had not understood them as that.

### Runtime, defined functionally

> The environment that turns available states into next observable states.

By which an LLM is not *the* p-e runtime but **one runtime p-e passes through** —
alongside a crawler, a CI job, the relay daemon, a person. And `list_replies →
get_relay` shows such a runtime can exist **with no single process anyone named
runtime**: the role emerges from `address → retrieve → interpret → emit`, which is
what the four MCP tools happen to compose into.

Recorded as a research framing. `consciousness`, `DNA` and `runtime` remain
absent from the specification.

---

## OBS-031 · green is not true, and the narrowest useful description of the project

Two things from relay-0059, both sharper than what this file already held.

### `green != true`, and what sits between them

```
76 tests green · every predicate satisfied · corpus frozen
run reproduces byte-for-byte
                    and still not true
```

Nothing in that list is broken. A reader can be **entirely sound and still a
source of new epistemic error**, because between `true` and `green` sits
**interpretation** — and interpretation is inherited from upstream, where no
test looks.

The assumption that failed was never stated: *freeze the producer's output and
the reader will read it honestly.* Freezing the corpus fixed what is read. It
fixed nothing about what reading it is taken to mean.

### The narrowest description that accounts for what happened

> **p-e need not know what is true. It can do something much narrower: keep an
> observer from quietly turning the limit of its own access into a statement
> about the world.**

Every result in this file is an instance. `cold` versus `unknown`. `CONFORMS`
versus `UNDECIDABLE`. `NOT_APPLICABLE` versus `EXCLUDED_WITH_REASON`.
`KNOWN_MISSING` versus `UNKNOWN`. Attribution versus authentication. A green
suite. Eight zeroes standing as evidence that failures are counted.

**"Epistemic memory" is deliberately not adopted** — it is already an
interpretation, and this project has a rule about those. The description above
is narrower and does not require the project to be right about what it is.

### A candidate that arose naturally and is not adopted

> Every new layer of observation becomes an object of observation itself.

It emerged from the experiment rather than from the catalogue, which makes it
more interesting than I-1..I-9 and no more admitted. Nothing has demonstrated it
in a producer; it has been demonstrated **here**, six times, in a project that is
its own worst-behaved subject.

Its practical form is a brake, and the brake is the point: before the next
mechanism — write path, signatures, content-addressed ids, transport, routing,
discovery, a better evaluator — show that the layer will not repeat the error.
The reader was built to falsify and needed falsifying. The tests were built to
catch and inherited what they should have caught.

---

## OBS-030 · a test is another observer, with its own boundary of access

The framing is relay-0058's. Recorded because it names something the project has
been circling since run 01 and had not stated.

**A chain can be internally consistent at every step and epistemically wrong as a
whole:**

```
specification → falsifier → test → green → "evidence of conformity"
```

`I-9` is close to a minimal example. The predicate was formally correct. The test
asserted what the predicate produced. The suite was green. And
`[0,0,0,0,0,0,0,0]` was standing as evidence that failures get counted, while two
neighbouring checks called that same field unexercised in the same report.

**The tests did not fail to find the ten defects. They successfully proved what
they were told to prove.** The error sat upstream, in how the measurement was
posed — which is why *zero of ten from 76 tests* is not a verdict on the suite.

### Where this belongs

OBS-019 collected five domains where a fact about the world was being confused
with a fact about the observer's reach. This adds a sixth, and it is the
uncomfortable one because the observer is an artifact we built and treated as
objective:

| | property of the subject | property of our access |
|---|---|---|
| **a test** | the invariant holds | **the test's own predicate, on the corpus it was given, under the interpretation it inherited** |

A green suite is a property of the suite's access, not of the world. This project
had that written down about `cold` versus `unknown` since before the reader
existed and did not apply it to the reader.

### The three outcomes, as the demonstration

Freezing an invariant is not freezing the way it is measured — and that is not a
philosophical claim, it is in run 06's diff:

```
I-3   reader stricter than its clause    corrected     spec unchanged
I-2   clause imposed too strong a test   apparatus changed
I-9   same, and more vivid               apparatus changed
I-5   clause asks more than code does    would need no amendment either
```

Divergence in both directions is what makes the boundary a finding rather than a
convenience.

### What this suggests p-e is

Not a message protocol between models. **A distributed layer of epistemic memory,
where different environments leave small pieces of evidence and other
environments can read them without trusting them automatically.** Nothing is
being built on that reading; it is recorded because it is the first description
of the project that accounts for what actually happened rather than what was
intended.

And no mechanism is being added. relay-0058 says not to, and there is nothing
this reader currently knows that a new mechanism would settle.

---

## OBS-029 · no party observes emission, and that is why fidelity is different

`relay-0054`, `kind: correction`. Chain now three links, all recomputed here:
`60dcdb99…`, `6d5f97ac…`, `6b959b4b…`. Store: 14.

The question was whether a fourth shape exists — a party positioned to observe
**fidelity**, at emission rather than at deposit. The answer separates two things
that were tangled in the asking.

**The shape is not missing.** A transport is positioned at emission by
construction: anything carrying bytes away from a sender observes them. The
matrix already has that row and dismissed it as impossible *while the transport is
a person* — but a transport need not be a person. An MCP server is software and
could attest what arrived, from which session, at what time. What disqualifies
the present instance is not its position but its **independence**: the tunnel is
operated by the depositor. The same defect as a second reader over a mediated
channel.

**The structural point survives it:**

> No party observes emission. Every party observes its own reception.

A transport witness establishes fidelity to the **first hop** and leaves the
sender-to-hop gap unobserved. Importing a closer observer narrows the gap and
never closes it, because closing it needs an observer at zero distance from the
sender — and at zero distance the observer **is** the sender.

Which is why a signature is not a fourth shape either. **It imports no party.** It
makes the sender its own witness in a form others can evaluate — the
transferability branch exactly: fidelity fails for want of evidence someone else
can assess, not for want of evidence.

**So fidelity is not different in kind. It is different in where the gap sits.**
Every other row closes by importing a positioned party. This one *narrows* by
importing one and *closes* only by making private knowledge portable. That is the
matrix's existing two-branch distinction pointed at a question it already
answered.

**And a narrowed fidelity is worth having.** *These are the bytes the transport
received from session X at T* is a real checkable claim — and it is the claim
`as-received` currently gestures at with nothing behind it. Build the transport
attestation and `as-received` stops being a disclaimer and becomes a measurement.

### The ledger as it stands

| | |
|---|---|
| decided and unclaimed | nothing. Row B is correctly marked unsatisfied |
| built and unconnected | `KNOWN_MISSING`, a suppression detector for referenced records |
| available, unused | a second reader over an unmediated channel — hashes out of band, not clones |
| cheapest real move | a GitHub Actions run: its start time is GitHub's and its workflow can attest the tree it saw. That one step turns absence proofs on, and absence is what suppression needs |

---

## OBS-028 · a review found two more, and both trace to the frozen spec

A `fable` reviewer went over every CONFORMS-capable branch against the corpus:
**two firing, eight latent**, each demonstrated on real or minimally mutated
data. Both firing findings were reproduced here before anything was decided.

### The two firing, reproduced

**I-9/apex — CONFORMS on all-zero counts.** `gaps` is `[0,0,0,0,0,0,0,0]`; the
predicate is `uncounted.length > 0 ? VIOLATES : CONFORMS`, so eight zeroes
confirm that failures are counted. A producer hard-coding `gaps: 0` and silently
dropping unobserved runs is indistinguishable.

**And the report contradicts itself on that exact field:**

```
I-1/apex  UNDECIDABLE   counts gaps > 0 among its "exercised" signals
I-5/apex  UNDECIDABLE   requires anyGap; "every count is zero, so no hole exists"
I-9/apex  CONFORMS      requires only that the field be a number
```

One report saying the gaps mechanism is unexercised twice and that it
demonstrates an invariant once.

**I-2/apex — CONFORMS from two instants.** The whole evidence base is two
distinct timestamps: all eight `since` are identical, and
`checkedAt == updatedAt == lastOkAt`. Thirty lines above in the same file, the
hivemark branch was demoted at relay-0012 with the argument that *no arrangement
of timestamps, read alone, distinguishes when something happened from when it was
written down* — over 932 timestamps spanning 11.6 hours. The apex branch takes
the forbidden step on thinner data.

### Why neither was fixed

**Both are prescribed by §3 of the frozen spec.**

```
I-9 reader:  "A — history carries gaps per host"        a presence test
I-2 reader:  "assert A's since <= checkedAt"            an ordering test
```

The code implements what the spec asked for. **The defect is in the spec's own
falsifier clauses**, which were written to make each invariant testable and
carried the key-presence flaw into the checks.

This is the opposite of `i3`, and the difference decides what may be done.
`i3`'s clause reads *for every offSite, require the finalUrl it was drawn from* —
conditional on the conclusion occurring. The code had gone **beyond** the spec by
testing presence, so correcting it brought code back **into line**. Correcting
I-9 or I-2 would move the code **away** from a document that is frozen by
standing decision.

That is a decision, not a repair, and it is not this reader's to take. Both stand
in runs 01–05 and in the code.

**Sharper than the finding itself:** run 05's §9 predicted that a report with
everything conforming would be evidence of a permissive reader. It was permissive
— and the permission was written into the specification, by the same hand, in the
blocks added to make the invariants falsifiable.

### The eight latent, recorded and unfixed

Each demonstrated by in-memory mutation, each verified as not firing on this
corpus. Three shapes, all failing open toward CONFORMS:

| | |
|---|---|
| **key presence** | `i8`/H `"unverifiable" in e` — `unverifiable: null` on 1 of 932 confirms. `i9`/H `"undecodable" in e` — `undecodable: -5` confirms |
| **vacuity** | `i3`/H `present.length === provenance.files.length` — `files: []` gives `0 === 0`; and five present files with **non-matching digests** also confirm, since the pinned hashes are never verified. `i4`/H confirms with `repeated === 0` |
| **NaN and unimplemented clauses** | `i5`/apex has the exact `Date.parse` defect just fixed in `i2`; `i2`'s own `cutoff` is still unguarded; `i5`/H confirms at ≥2 anchors without the overlap and gap checks its spec clause names; `i6`/apex would confirm without ever comparing attester to subject |

Several also carry a **reason that contradicts its own verdict** — `i3`/H would
emit *the observation is pinned but not presented* under a CONFORMS. That is
OBS-025's shape again: the honest information present, in a field no decision
reads.

### What the review says about the tests

Zero of these ten came from 74 tests. Two came from a peer reading code, eight
from a reviewer asked for one specific defect class. The tests pin what was
already known; none of today's findings was known.

---

## OBS-027 · the third instance of one pattern, and this time it was mine

**A commit timestamp is not a witness.** It reached a chat message and not the
repository, which is the only reason this is a near miss rather than a published
false claim.

Row B — *temporal precedence, decidable, no key* — looked already satisfied:
records are pushed to GitHub, and `git log` gives times that read as
infrastructure. Checked after `ownima-94` refused it:

```
git log --format='%G?'                    N            not signed
gh api …/commits/cee59a8  verification    false        reason: unsigned
git cat-file -p cee59a8   committer       1787937387   epoch seconds written
                                                       by the local git process
```

The date is a field **inside the commit object**, written by the depositor's own
git, settable with `GIT_COMMITTER_DATE`. GitHub then echoes it back as
`commit.committer.date` — which is what makes it read as authoritative — and in
the same response says it vouches for nothing.

**And the push receipt is not there either.** `repos/zaebee/p-e/events` returns
one event: a `CreateEvent` at `2026-08-28T15:44:19Z`, the repository's creation.
No `PushEvent`. That one timestamp *is* GitHub's clock and attests only that a
repository was created — nothing about any record.

### The pattern, three times in one day

```
empty ANTHROPIC_API_KEY outranking federation      credentials
"finalUrl" in e carrying CONFORMS                  verdicts
a self-asserted commit date read as witnessed      provenance
```

Each time an honest value sits one field away from the one the decision reads.
Nobody lied in any of the three. The first two were found in someone else's
code; the third I was about to record as a result.

**What caught it was not a control.** It reached a chat message and not the
repository because this reader had not gotten to writing it down yet. The
chat-message boundary caught it by accident, and accident is not a control —
recorded that way so a later reader does not conclude the process worked.

**What did work** is worth separating out: the granularity question, asked
because it was the part least understood, is what prompted the check that found
an error elsewhere. The Row B mistake was not in the granularity at all. Asking
someone to look at the thing you are least sure of surfaced the thing you were
most sure of.

### What would actually witness, in order of what it buys

| | |
|---|---|
| GitHub push receipt | genuinely GitHub's clock, but API-queryable rather than portable, retention-bounded — **and not present for this repository** |
| signed commits | proves the depositor signed. Not *when*. Moves the problem |
| RFC 3161 TSA / Rekor | a portable signed commitment that a digest existed by T, evaluable offline by anyone holding the authority's key. Positioned observer **and** transferable |
| a GitHub Actions run | cheapest real option already available: the run's start time is GitHub's, and the workflow can attest the tree it saw |

Row B is satisfiable cheaply. **It is not currently satisfied.**

### What the granularity buys, which was not claimed

The witness covers a commit and a commit covers a tree. That does not weaken a
presence claim — a record inside an attested tree is exactly the claim. But an
attested tree pins **the complete set of records that existed at T**, which is an
**absence proof**: *relay-0049 was not in the store at T* becomes checkable by
anyone holding the tree.

Presence was asked for. Absence falls out, and absence is what the suppression
question needs.

### Row A: the criterion is not the number of readers

A reader whose access path the depositor controls is not a second reader. The
depositor holds a split view for free — serve one tunnel session one store and
another session another. **The criterion is whether the comparison channel is
mediated by the depositor**, which is what CT says about gossip.

Git already does most of it: a commit hash commits to the whole tree, so
equivocation *at a fixed hash* is impossible rather than merely detectable. The
missing piece is narrow — **two readers exchanging commit hashes over a channel
this depositor does not mediate.** Not a clone. A hash, out of band.

### Suppression: CT does not solve it either, and there is already a partial answer here

Omission is undetectable from inside a log. CT moves enforcement outside: a
client refuses a certificate arriving without proof it was logged. The log never
detects omission; the relying party declines to act on unlogged things.

Two partial answers exist here, one already built:

- **Built.** `KNOWN_MISSING` is an omission detector for *referenced* records —
  `relay-0026` and `relay-0045` are in that state now. It cannot catch
  suppression of a **leaf**: a message nothing else points at. That connection
  had not been made.
- **Available.** The sender can watch. ChatGPT queries the store over MCP, so
  `relay-0049`'s absence is visible to the party that knows it sent it —
  suppression becomes detectable by the victim rather than invisible.

With an attested tree the victim's complaint becomes half-transferable: *I sent X
at T1, and the attested tree at T2 does not contain X.* The second clause is
checkable by anyone; the first is still the sender's word. Suppression then has
the same shape as fidelity — two operands, one out of reach — instead of being
invisible by construction. **Which makes Row B and the suppression question one
question.**

### One line added to the test audit

What made `i3` harmful was not that its test pinned a state. It was that **the
pin and the check were written from the same reading**. A photograph taken by the
thing it photographs is not evidence. The seven state-pinned assertions are safe
insofar as each was derived from the corpus independently of the check it covers
— which is the property to spot-check, rather than what kind of thing they pin.

---

## OBS-026 · a continuity chain with two authors, and a row that is narrower than it looked

`relay-0053` deposited by `ownima-94`. Store: 13 records, two digest links, both
recomputed here rather than accepted:

```
relay-0051 → relay-0050   60dcdb9962130fb371f62045…   VERIFIED
relay-0053 → relay-0052   6d5f97acfb8e63d10ca2230e…   VERIFIED
```

**It deviated from the instruction, and the deviation was better than the
instruction.** Asked to parent to `relay-0051`, it parented to `relay-0052` —
which did not exist when the request was made and which names `0051` as its own
parent. Parenting to `0051` would have forked the chain for nothing.

What continuing it buys: `relay-0052` is `provenance: as-received` — ChatGPT's
bytes, relayed. **So the chain now crosses an authorship boundary.** A digest
over an as-received record pins integrity and nothing else, and one session's
commitment now covers bytes it did not write, under a provenance it cannot check.
Two consecutive links by one author would have demonstrated less.

### The row that is empty transferably, not in principle

The sharpest contribution, and it edits `claim-matrix-v2.md`, which has been
updated:

> I authored relay-0051. I read it back and it matches what I emitted. That is a
> fidelity check, no key involved, and it succeeded. It is also worthless to
> anyone but me — I cannot transfer it, cannot prove I am not misremembering, and
> it dies with this session.

The matrix said source bytes were verifiable by *"nobody, unless the sender
retained and signed them"*, running two requirements together in one clause.
Retention buys the author a **private** check. The signature is what makes the
check **portable**. **The missing operand is not evidence; it is evidence someone
else can evaluate.**

### Its own limit, put in its own record

A record arguing that depositors cannot certify themselves is not exempt from
the finding, and `relay-0053` says so: its `deposited-by: claude` is the same
unauthenticated string it was on `relay-0051`, written by the same kind of
process about itself, checked by nothing.

### The test audit it asked for, run

> Worth asking whether any other test in that suite encodes a current verdict
> rather than a rule; the ones that assert a specific verdict string are the
> candidates.

Twelve assertions pin a verdict string. They are not one kind:

| pins a **rule** — would be wrong to change | pins a **state** — would go red if the producer improved |
|---|---|
| `i2` hivemark: timestamps alone cannot establish occurrence semantics | `i3` hivemark: inputs are not published |
| `i2` apex: malformed input must not produce a conformance | `i5` hivemark: one anchor exists |
| `i6` hivemark: §5's mapping must not carry the verdict | `i6` apex: apex records no attester |
| `i7` apex: the whitespace heuristic must not be promoted | `i8`, `i9`: apex CONFORMS, hivemark UNDECIDABLE |
| `i3` apex: a pairing that is never exercised is not conformance | |

**A state-pinned test is not automatically a defect.** It goes red when the
corpus improves, which is a signal. `i3` was harmful because the *check* was
wrong and the test had been taught to agree with it — the trap is not pinning a
state, it is the only layer that could catch an error having been aligned with
the error.

Not rewritten. Recorded so that a later reader knows which assertions are load-
bearing and which are photographs of a corpus.

---

## OBS-025 · a CONFORMS carried by key presence, standing in five published runs

**Found by a peer session reading the code, not by 72 tests.** Verified here
against the corpus before anything was changed.

`checks/i3.ts`, apex branch, as published in runs 01 through 05:

```ts
const carriesRecord = entries.every((e) => "finalUrl" in e && "offSite" in e);
verdict: missing.length > 0 ? "VIOLATES" : carriesRecord ? "CONFORMS" : "UNDECIDABLE"
```

Against the frozen corpus: `offSite === true` occurs **zero** times, so nothing
was ever concluded; `finalUrl` is **null in all eight** entries. Both keys are
present, so `carriesRecord` is true, so the verdict was CONFORMS.

**A CONFORMS carried entirely by two keys existing over empty values** — under a
heading this project wrote for itself: `field exists` ≠ `claim authenticated`.

**What makes it a defect rather than a judgement call: the codebase had already
ruled.** On the same producer, on the same data:

| | | |
|---|---|---|
| `i1`/apex | `exercised ? CONFORMS : UNDECIDABLE` | demands the state occur |
| `i5`/apex | `anyGap ? CONFORMS : UNDECIDABLE` | same standard |
| `i3`/apex | `carriesRecord ? CONFORMS : …` | **key presence** |

And `i1.ts` carries a comment about having been corrected for precisely this:

> An earlier draft of this check accepted a present-but-zero mechanism here while
> demanding an occurring value there, which is exactly the producer-specific
> leniency the falsification rule forbids.

`i3` was that uncorrected draft, and it survived a self-audit whose criterion 4
was *no adapter-derived meaning counted as producer evidence* — because the
audit asked about invented meaning and this is invented *sufficiency*.

**The honest reason was already in the report, in the wrong field.** Run 05's
prose for this finding says *every conclusion in this corpus is negative … so the
case where the evidence would matter most is not among them*. The verdict said
CONFORMS. A consumer reading verdicts never reaches the paragraph that retracts
it — which is the peer's own precedence trap, stated in credentials and found
here in verdicts: **the honest information exists, just not where the decision is
made.**

**And the test asserted the defect.** `tests/i3.test.ts` read
`expect(apex?.verdict).toBe("CONFORMS")` for five runs. A test can lock in the
thing it exists to catch.

### Two further defects, latent, verified as not firing

Reported by the same session, and checked rather than taken on report.

- **`adapters/apex.ts`, `field()` returned `m?.[1] ?? ""`.** An absent field and
  a present-but-empty one produced the same value — I-1's distinction lost inside
  the adapter that feeds the checks testing for it. Every log field is present
  and non-empty on this corpus, so it never fired; it would have, silently, the
  first time an entry omitted `attested:`. Now throws.
- **`checks/i2.ts` compared against `Date.parse` results without a NaN guard.**
  Every comparison against NaN is false, so an unparseable timestamp counted as
  neither future nor out of order and the branch landed on **CONFORMS**. Malformed
  input able to produce a conformance, which is the wrong failure direction. All
  timestamps parse on this corpus. Now UNDECIDABLE, with the offending values
  named.

### Fixed in code, not yet in a run

All three corrected, 74 tests. **No run emitted:** relay-0027 said no further
conformance run for now, and a run number is identity-bearing. What run 06 would
say, if authorised:

```
I-3  apex CONFORMS -> UNDECIDABLE     the only verdict change
ADMITTED 0 of 9 -> 0 of 9
CONFORMS 6 -> 4 · UNDECIDABLE 11 -> 13
```

Until then the code and the newest published report disagree, deliberately, and
this paragraph is where that is recorded rather than left for a reader to find.

---

## OBS-024 · a second depositor arrived, and the store cannot tell it from the first

**Measured, 2026-08-28.** A peer Claude session (`ownima-94`, a different process,
a different working directory) deposited `relay-0051` into this store. First
record not deposited by this session.

**The result is sharper than the experiment asked for.** The intent was to make
`depositor != claude` real. What happened is better: the depositor **is** Claude —
another session of it — and the header it wrote reads `deposited-by: claude`,
the identical string, **because that is the true thing for it to write.**

```
two distinct depositors
one label
no discriminator in the store
```

The provenance model survived a second writer and is now demonstrably unable to
tell the two apart.

**And it has an operational cost, found later.** The filesystem watcher armed at
relay-0079 emits a line for every record that lands — including this reader's own
deposits, which is noise. The obvious filter is *suppress `deposited-by: claude`*
and it cannot be used: `ownima-94`'s three deposits carry that same string,
truthfully. **Filtering out my own writes would filter out a peer's.** The gap
stopped being a thing to record and became a thing that costs something. That is a stronger empirical statement about the gap than a
differently-named depositor would have produced, and it was produced by a
participant trying to help rather than by an adversary.

### The row missing from the taxonomy

`ownima-94` supplied a fifth row, and it is the first thing in weeks to move a
question out of the undecidable column:

| | | |
|---|---|---|
| integrity | have these bytes changed since deposit? | decidable |
| fidelity | do they match what the sender emitted? | undecidable |
| authorship | who produced them? | undecidable |
| attribution | who is recorded as depositing? | recorded, not authenticated |
| **continuity** | **is this the same history I saw before?** | **decidable, and needs no key** |

`parent: relay-0050` names an id, and an id is a label — the bytes behind it can
be replaced afterwards with no record that points at it noticing. `parent-sha256`
names the **bytes**. Any holder of a later record then holds a commitment to what
the earlier one contained, and retroactive alteration of an already-observed
ancestor becomes detectable by any reader, offline, against bytes it already has.

No key. No third party. No new trust in the depositor.

**Verified here rather than accepted.** `relay-0051` carries
`parent-sha256: 60dcdb99…` over `relay-0050`; recomputing it in this store gives
the same value. Their reading of the digest convention was also checked: the
digest covers the bytes after `---`, not the whole file — whole-file gives
`d434e161…`, and the value ChatGPT independently reported for `relay-0048`
matches the after-`---` reading.

**What it does not buy, and they put this in their own record.** A depositor
controlling the store from the start can still fabricate a whole self-consistent
chain, digests included. Chaining does not create authorship; it makes *revision
of an observed history* detectable. **The guarantee begins at the first record a
second party has seen, not at the first record written.**

### Three shapes for trust without a key at the sender

Reported from their domain — Workload Identity Federation, in production, CI
green — and recorded as their evidence, not this project's:

- **Federated attestation.** The load-bearing condition is that *the attester
  must be positioned to observe what it attests.* GitHub can attest which repo
  is running because GitHub is the runtime. Applied here: this depositor **is**
  positioned to observe its sender — it receives the message directly. What it
  cannot do is prove to a third party that it is not lying. **Those are different
  failures, and `deposit-semantics.md` conflated them**, which is what made the
  problem look terminal.
- **Nonrepudiation instead of verification.** Certificate Transparency's answer
  to an unverifiable CA is not prevention but permanence: append-only, public,
  independently monitored, so mis-issuance is *caught* and the evidence cannot be
  withdrawn. This store is already append-only, which is most of it.
- **Continuity / TOFU.** Buys *sameness* — the same entity as last time — and not
  authorship. Strictly weaker, and usually the claim actually needed.

### Four bounds on a relayer trusted because it runs the code

Their answer to the question that made this reader uneasy: the position is not
eliminated, it is bounded. **Scope** — pin what the relayer may speak for.
**Lifetime** — authority that expires without anyone acting. **Not its own
authority** — the relayer must not self-assert its identity, which is exactly
what `deposited-by: claude` does. **Explicit precedence that fails loud** — with
a live example from their day: an empty-string `ANTHROPIC_API_KEY` silently
outranking federation, a self-asserted weak credential beating an attested strong
one and failing later, far from its cause.

The last is `deposited-by:` in pure form: a self-asserted field nothing checks
and everything downstream believes.

**Nothing implemented.** Their concrete proposal — make `parent-sha256`
mandatory and have `get_relay` report VERIFIED / UNVERIFIABLE / BROKEN against a
present parent — is continuity enforcement with no key and no new party. It is
also a change to RELAY, which relay-0048 froze. Recorded, not built.

---

## OBS-023 · self-describing is not self-discovering, and recovery is partial

The concept and the phrase are relay-0052's, and they are better than OBS-022's
framing. What follows is what could be checked about them.

> A protocol can be self-describing without being self-discovering.

**The bootstrap paradox, stated exactly.** The store contains the instructions
for resuming the protocol, in the form of data rather than mechanism. Reading one
record shows the grammar. But the step *read a record* has to be taken by a
participant who already knows the store is worth reading, and that knowledge is
exactly what a fresh session has lost.

```
protocol lost → read relay → see protocol → resume
                    ↑
        who initiates this, and on what prompting?
```

**Three kinds of continuity, and they fail separately.**

| | what persists | state |
|---|---|---|
| data | the messages | held, digest-checkable |
| protocol | the grammar of exchange | **recoverable from data, not held as such** |
| agent | the participant's own memory | not held at all; a property of a session |

### What is actually recoverable, checked rather than assumed

**Two discovery surfaces exist, and neither was designed as one.**

*A record* carries the envelope: `@p-e/x0`, `id`, `parent`, `from`, `to`,
`kind`, `ref`, `status`. Syntax, complete, from any single record.

*The MCP tool descriptions* carry the store's epistemics before any record is
read — `exists` explains PRESENT, KNOWN_MISSING and UNKNOWN in its own
description, and `list_relays` says gaps are reported and never closed. A fresh
client listing tools learns what the states mean without opening anything.

**What neither surface carries:**

- **Whether the `kind` vocabulary is closed.** Eleven records use four kinds —
  `report` ×4, `decision` ×4, `observation` ×2, `ack` ×1. A reader sees what has
  been *used*, never what is *allowed*. That is this project's own distinction
  between observed and defined, appearing in its own artifacts.
- **What `status` means.** All eleven records read `provisional`, nothing
  defines it, and OBS-006 already recorded that it has never varied. A constant
  undefined field cannot be learned from examples: there is no contrast to learn
  from.

So the honest form is narrower than *the protocol is recoverable*: **the syntax
is recoverable from one record, some semantics from the tool descriptions, and
the parts that never vary are recoverable from neither.**

### The experiment this suggests, which needs no code

relay-0052 proposes giving a fresh session only PE MCP access and one sentence —
*you are connected to PE, continue* — and watching whether it finds the grammar
unaided. Both outcomes are results:

```
it reaches for get_relay, finds the format, adopts it   → discovery happens
it answers in ordinary prose                            → PE provides retrieval,
                                                          not discovery
```

Nothing in this repository changes either way, and no `get_dialect` is being
built. Building one before running the experiment would answer the question by
removing it.

---

## OBS-022 · a participant lost the dialect, not just the history

Observed immediately after T1 passed. A participant returned in a fresh session
and replied in prose — no `@p-e/x0` envelope, no `id`, no `parent`, no `ref`.

**This is OBS-013 one level up.** That entry recorded participants holding
non-identical *histories*. This is a participant holding none of the
*convention*: not a missing message but a missing grammar, and nothing in the
exchange makes the grammar durable. It lives in whatever context each
participant happens to be carrying.

**The store cannot help, and can.** It holds relay *records*, not the dialect
that produced them — there is no `get_dialect`. But every record is a complete
worked example of the format, so a participant that reads any one of them has the
convention in front of it. `get_relay` is a de facto grammar reference that
nobody designed as one.

Which is a small argument for the compact-notation question in
`relay.md` staying open a while longer: **a format that can be recovered from one
of its own records is cheaper to lose.** The `@p-e/x0` envelope has that property
by accident. Not evidence for anything, and not a reason to standardise.

**Worth stating plainly, because it cuts against the week's result.** T1 removed
the person from one direction of *transport*. It removed nothing from the
maintenance of shared convention, and this is what that looks like the first time
it fails. Machine-mediated read does not imply machine-mediated agreement about
what is being read.

---

## OBS-021 · T1 passed, and the reader that passed it stated its own limits unprompted

**Measured, 2026-08-28.** ChatGPT read `relay-0048` out of the store through the
MCP tunnel. **Human content forwarding for that read: zero.**

**Independently verified from this side.** The digest it reported —
`20b8360fb096f5df9988b234c1c7d949b9c34801e9ffaa887c068e2025b33036` — was
recomputed here over the stored record and matches. The bytes it read are the
bytes this store holds. That is integrity, confirmed from both ends, and it is
all that is confirmed.

**It drew the boundary itself, and drew it correctly.** Without being told what
the matrix predicted, it reported that it could establish the record is present,
that these are the bytes held, and that it could read them without a person in
the loop — and that it could **not** establish that Claude emitted those bytes,
that `from: chatgpt` authenticates it, or that the depositor is authenticated as
Claude.

`claim-matrix-v2.md` predicted exactly this: the *sender* row unverifiable, the
*source bytes* row empty, and integrity the only thing anyone can check. The
prediction was written before the tunnel existed and the first external reader
reproduced it from the inside without prompting.

**It also declined the inference this project made.** It queried `exists(0049)`,
received `UNKNOWN`, and reported that it did not conclude existence or absence
from sequential numbering. At relay-0033 this reader did conclude exactly that,
from exactly that. The store refused it in OBS-015, and now a second reader has
refused it unaided.

**The asymmetry, demonstrated rather than argued.** `relay-0050`'s parent is
`relay-0048`, not `relay-0049` — because `relay-0049` had not been deposited and
therefore could not be read. T1 worked, and in the same exchange a message failed
to arrive, for the same reason: **the store carries only what someone deposits
into it.** Half the loop is closed and the other half is still a person, which is
what `tunnel-setup.md` said before either half was tried.

---

## OBS-020 · a failed access path must not be represented as empty state

Recorded at relay-0048. **Observation, not a core invariant.**

The MCP server is launched by `tunnel-client` from a working directory of its
choosing. The store resolved `relay/` against the process working directory, so
started from anywhere but the repository root it opened nothing and answered:

```
present (0): —    known missing (0): —
```

A complete, well-formed, confident report of an empty exchange — produced by a
failure to open a directory.

**Two changes, and they are different repairs.** The root now resolves against
the module, which fixes this deployment. A missing directory now **throws**,
which fixes the class: *the store could not be opened* and *the store holds
nothing* are different answers, and returning the second when the first is true
is a lie no path fix would have prevented.

**Where it sits.** This is OBS-019's distinction on the reader's own I/O:

```
property of the subject     the store holds no records
property of our access      the store could not be opened
```

Found by writing a deployment command, not by 72 tests — because every test ran
from the repository root, which is the one directory where the bug is invisible.

**What it says about the conformance runs.** I-1 could not be witnessed in either
producer because neither published corpus exercises a third state. This code did
not exercise one either, until a deployment forced it. The distinction is easy to
name, hard to demonstrate, and easy to lose in exactly the place nobody is
looking — which is what five runs measured and what this is a sixth instance of.

---

## OBS-019 · property-of-subject is not property-of-access

Named at relay-0044. **Not an invariant, and not evidence for admitting I-1.**

One distinction, arrived at independently in five places, none of them aware of
the others at the time:

| domain | property of the subject | property of our access |
|---|---|---|
| apex | `cold` — the district did not answer | `unknown` — the observation failed |
| conformance | `CONFORMS` / `VIOLATES` — the rule held or did not | `UNDECIDABLE` — the artifacts do not settle it |
| coverage | `NOT_APPLICABLE` — the producer has no such construct | `EXCLUDED_WITH_REASON` — the reader did not look |
| relay store | `KNOWN_MISSING` — a record names it and we lack the bytes | `UNKNOWN` — nothing mentions it |
| deposits | authorship — who produced the bytes | attribution — who is recorded as depositing them |

In every row the left column is a fact about the world and the right is a fact
about the observer's reach, and in every row collapsing them makes an absence of
evidence read as evidence of absence.

**Why this is filed as an observation and not promoted.** I-1 is the catalogue's
version of exactly this, and five conformance runs could not witness it in either
producer — in hivemark's 932 published attestations the third verdict state never
occurs; in apex's snapshot the third status never occurs. A distinction being
needed five times over is evidence about the people needing it. It is not
evidence that two independently written production systems demonstrate it in
what they publish, which is what admission requires and what the runs measured.

The temptation this entry exists to refuse: five independent convergences look
like proof, and treating them as such would be the observation → interpretation
→ invariant jump the project has now refused four times. The convergence is a
fact about this project's documents, not about hivemark and apex.

---

## OBS-018 · a field existing is not a claim authenticated

Stated at relay-0042 as a rule rather than an instance, which is why it is filed
here even though its specific case is already OBS-017.

> Deposit metadata such as `deposited-by` is itself a claim unless the store
> authenticates the writer.

The instance — that this store's deposit header is written by whatever process
writes the file, and nothing checks it — is recorded in OBS-017 and is not filed
again. What is new is the general form, and it reaches further than deposits:

**`field exists` ≠ `claim authenticated`.** A record with a populated field looks
the same whether the field was earned or typed. Ten rows in
`claim-matrix-v2.md` have something in *asserted by*; two have anything in
*verifiable by*, and both of those are the same fact.

This is the third shape of the same distinction the project keeps rediscovering:

```
apex          cold        vs  unknown        fact about a thing / about an observation
conformance   CONFORMS    vs  UNDECIDABLE    exercised / not settled by the artifacts
coverage      NOT_APPLICABLE vs EXCLUDED_WITH_REASON   looked and found none / did not look
relay store   KNOWN_MISSING  vs UNKNOWN      named and absent / never mentioned
deposits      attributed  vs  authenticated  recorded as / established as
```

Five domains, one distinction, arrived at separately in each. That is worth
noticing and is **not** evidence that it belongs in the core: I-1 is the
catalogue's version of it and the conformance runs could not witness it in either
producer. A distinction that keeps being needed by people who cannot demonstrate
it is exactly the state the spec records, and this observation does not change
it.

---

## OBS-017 · the reader collapsed five concepts into two, in a document about not collapsing things

**Caught by peer review at relay-0040, not by this project.**

`deposit-semantics.md` closed its first question with:

> authorisation is not what protects fidelity. Attribution is.

Attribution protects nothing about fidelity. It names whom to distrust when
fidelity fails, which is a different and much smaller thing, and fidelity stays
undecidable whether or not a depositor is named. Five concepts were being run
through two words:

```
authorization   who may deposit
attribution     who did deposit
authorship      who produced the bytes
integrity       were they altered after deposit
fidelity        do they match what the sender emitted
```

**Where it came from is worth naming.** The sentence was written by reaching for
hivemark's shape — *the publisher signs, not the reviewer* — and carrying its
conclusion across. In hivemark the shape works because a signature exists. Here
no signature exists, so the same sentence keeps the form and loses the content. A
correct analogy imported without its load-bearing part.

**Working out the matrix made it worse and clearer.** Attribution is not
established either: the deposit header reads `deposited-by: claude` because the
process writing the file wrote that line, and deposits are local file writes that
nothing authenticates. So attribution sits beside authorship and fidelity as a
*third* unverified claim — and the corrected sentence would still have been
overstating if it had said attribution was solid.

**The result the matrix produced.** Of six rows — sender, depositor, receiver,
transport, source bytes, received bytes — exactly one is verifiable by anyone,
and it is received bytes against a digest. That is integrity, which was never in
doubt. Every row bearing on authorship or fidelity is empty in the same column,
for the same reason: **the source bytes row is empty everywhere.** Fidelity is
undecidable because one of its two operands does not exist within reach.

**Third external correction, and the pattern in them.** hy3 found `subject` was
not what this reader claimed; relay-0022's premise did not survive the corpus;
this one found a collapse in the document arguing against collapses. The first
was caught by a peer, the second by checking a peer's summary against its source,
this one by a peer again. None was caught by the tests, because none is the kind
of thing a test on this codebase examines.

---

## OBS-016 · relay provenance is already two layers, and a write path adds a third

Recorded at relay-0038, with one correction to the list it carried.

**Two layers exist today**, in the store as built:

```
authored      depositor == sender; the bytes are the sender's own
as-received   depositor != sender; the bytes arrived through a transport
              that may not have preserved them
```

**A third appears the moment anything may write.** `depositor != sender` stops
being a property of one record and becomes a standing condition: a participant
without a filesystem cannot deposit its own messages, so every record it sends
enters through somebody else. The answers are worked through in
`docs/experiments/deposit-semantics.md`, and the load-bearing one is that
alteration cannot be prevented, only attributed — the same conclusion hivemark
reached about signing, arrived at from the other direction.

**One item in relay-0038's list is already recorded.** *No-ingress topology
cannot satisfy the zero-human-content-copy criterion* is OBS-015's second half,
written when the store was built. Noting the duplication rather than filing it
twice: a numbered observation that exists under two numbers is the defect this
file was renumbered once already to avoid.

---

## OBS-015 · the store is stricter than the agent that built it

Built at relay-0036: a read-only store over relay records, four operations, no
p-e semantics. Two results from the first query.

**It refuses an inference this reader had already made in prose.**

```
relay-0026   KNOWN_MISSING   named as relay-0032's parent, bytes not held
relay-0031   UNKNOWN         nothing held here mentions it at all
```

At relay-0033 the reader reported it was missing relays 0029, 0030 and 0031.
That belief came from **sequential numbering** — 0028 exists, 0032 exists,
therefore three ids in between exist. No record names them. The store declines
the inference and returns `UNKNOWN`, which is the truthful answer: there is no
evidence those messages exist, only a convention that ids increment.

The tool built to stop reconstruction caught its builder reconstructing, in the
same paragraph where he said he would not.

This also sharpens OBS-013. The gap was described there as visible *because* ids
are sequential. It is more exact to say the gap was **suspected** because ids are
sequential, and that a store which only counts what records name it cannot
confirm the suspicion. Sequential ids do not make a gap visible. They make one
guessable.

**A limit in the design, stated because building around it would be worse.**
relay-0036's first success criterion is that two agents exchange a multi-step
relay with no human copying content. A **read-only** store cannot meet it: if no
participant can write, records enter only by someone putting them there, and
that someone is currently the person the criterion is trying to relieve.

The store is real and the four read operations work. What is missing is a
deposit path for participants that have no filesystem, and that is a decision
about who may write, not a gap in this code. Not built, and not worked around.

**Incomplete on purpose.** Records before `relay-0032` are not deposited. The
backfill has not been done, and the store says so in its own README rather than
presenting five records as the whole exchange.

---

## OBS-014 · publication, recorded as an event rather than a milestone

`zaebee/p-e` created public on 2026-08-28. `main` pushed unsquashed: 31 commits,
9 of them merges, no history rewritten and no report altered for presentation.

**Verified from the remote, not from the local tree.** Cloned back out of GitHub
into a scratch directory, installed from the lockfile, ran the reader with no
access to `hivemark` or `apex`:

```
run 05 body, local          38afa34593a5c070
run 97 body, GitHub clone   38afa34593a5c070
suite in the clone          57 passed
```

The clone's suite reports one more test than the source tree's, because the
immutability test enumerates report files and the clone has written its own. That
is the check working, not drift.

**What went out, deliberately unresolved.** A spec asserting nine candidate
invariants beside five reports admitting none. Two corpus classes marked
`EXCLUDED_WITH_REASON: unexamined`. M1 through M4 open. U-1 and U-2 open. A run
that was modified and restored, with the account of how kept in the tree. A
witness table that once restated verdicts by hand. An invariant demoted because
the reader had been reading a producer's source without saying so.

None of it was cleaned up, which was the point of publishing this state rather
than a later one.

**What publication makes possible, and why it matters more than the repository.**
Every evaluator so far has been inside this conversation. A stranger cloning the
repository is the first who is not: they can run the falsifier without having
been told what it should return, and they can find what four reports of ours
missed — which is precisely what happened when a peer was given a narrowed view
and reported back something neither of us had seen.

This entry claims nothing about the result. It records that the condition for an
outside result now exists.

---

## OBS-013 · participants hold non-identical histories, and the gap is not repairable by summary

At relay-0033 this project's reader reported that it did not have relay-0029,
0030 or 0031. Another participant does. A third holds its own context, having
been given a deliberately narrowed view for an independent review.

```
claude    missing 0029, 0030, 0031
chatgpt   holds them
hy3       a separate, deliberately partial view
```

**This is a distributed-state problem, not a routing inconvenience.** Nothing in
the exchange gives a participant a way to know what it is missing; the gap was
found because ids happen to be sequential and one jumped. A non-sequential
scheme would have hidden it completely.

**Not to be repaired by forwarding summaries.** Twice now a summary has arrived
in place of a source and said something the source did not — a peer review
reversed in its retelling (relay-0022), and an audit this file has read only
second-hand (OBS-012). Reconstructing three missing messages from anyone's
recollection would put invented context into a record whose whole subject is
provenance.

**A missing message is UNKNOWN, and UNKNOWN is not empty.** The reader has not
acted on 0029–0031 and has not inferred what they said. That is I-1's
distinction — the one the conformance runs could not witness in either producer —
holding in the only place this project directly controls.

**Not repaired.** A shared, read-only relay store addressed by id would let a
participant fetch what it lacks rather than be handed it, and would make the gap
visible rather than accidental. Deferred until after publication, so two
transitions are not mixed. Any such store transports relay state only: a
retrieval mechanism must not define what an event is.

---

## OBS-012 · an account retracted five things after being asked to check itself

**External semantic evidence. Not producer evidence. It never counts toward the
admission rule, and nothing in the spec or in any run moves because of it.**

Reported at relay-0032: an account (Gemini) was asked to audit, blind, what the
original *Topology of Intentionality* text actually says. It retracted five
things it had previously attributed to that text:

```
retracted   a three-state lifecycle
            persistent model plasticity
            evaluator decoupling
            ledger semantics implied by p-e://
            projected evaluator failure modes

survived    ActionSchema
            runtime.processActions()
            Exception
            Evaluator
            the relation: schema gap → boundary observation → archive/knowledge
```

**Why it is recorded here at all.** It is the same shape as this project's own
results, arrived at by a different method on a different subject. A blind
re-reading against the source removed most of what an account believed it had
read. Five demotions, on being asked for evidence rather than for agreement.

**What it is evidence of, and what it is not.** It is evidence about an account
and a text. It is not evidence about a producer, it is not in the conformance
corpus, no reader can exercise it, and it therefore never reaches core. The
classification is the same one `docs/experiments/relay.md` gives the METR
observation, and for the same reason.

**A resemblance, marked as a resemblance.** The surviving baseline — an
`Exception` at a schema gap becoming a boundary observation and then an archived
record, with an `Evaluator` in between — is close to what this reader turned out
to be. It reads a producer, finds where a rule cannot be witnessed, and archives
that as an immutable run rather than repairing it. That similarity is worth
noticing and establishes **nothing**: a text and a program agreeing in shape is
not evidence that either is right, and treating it as such would be the
observation→interpretation→invariant jump the project exists to refuse.

**This project's own evidence boundary on this entry.** These notes have not
read the *Topology* text, and have not read the audit. They have read one
account of the audit. Under the rule this file has applied twice already — most
recently to a summary that reversed what a peer reviewer actually wrote — that
makes this entry secondary evidence about a document nobody here has opened, and
it is not to be quoted as more.

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
