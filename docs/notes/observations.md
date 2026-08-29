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

## OBS-045 · a documented limit was understated, and the understatement was the bug

`wait_for_relay` shipped with a limit written into its own README:

> this server is single-threaded over stdin, so a blocked wait will not serve
> another call through the same process

**True, and far too gentle.** The read loop awaited each line, so a blocked wait
stopped *every* later line — including `initialize`. The host's view:

```
rpc_method                  initialize
status_code                 502
upstream_response_received  false
failure_source              client_internal
```

Twenty-eight of those in four minutes. A busy server that cannot answer a
handshake is indistinguishable from a dead one, and the other participant
correctly refused to treat its deposits as sent.

**What the wording did.** *Will not serve another call* sounds like a queueing
delay. What happened was total unavailability, including to a client trying to
connect for the first time. The sentence was accurate about the mechanism and
wrong about the consequence, and it was written by the same reader that then
failed to notice the consequence — the limit was documented instead of being
fixed, and documenting it felt like handling it.

**Fixed.** Calls are dispatched, not awaited, in the read loop; JSON-RPC ids
allow responses in any order; a malformed line answers with a parse error instead
of killing the loop. Verified at the process level rather than in the handler: a
handshake answered in **0.03s** while a six-second wait was still outstanding.

**And the restart went through `scripts/restart-tunnel.sh`** — first use of the
guard from OBS-043, which reported `MCP started 20:12:49, newest source edited
20:12:12` rather than being trusted to have worked.

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

## OBS-046 · a guard that could not fire, because the failure was a throw

`deposit()` wrote the record, then read the store back to confirm it parses:

```ts
const after = await loadStore(root);
if (!after.get(id)) throw new Error(`${id} was written and does not parse`);
```

That branch is unreachable for the case it was written for. `loadStore` refuses
the *whole store* when any one record is unparseable — it throws rather than
returning a map with the record missing. So an unreadable deposit did not merely
fail to arrive: it stayed on disk and took all 77 other records with it, for
every reader, until removed by hand.

It happened at 20:55 on 2026-08-28, to a record of mine with `to: chatgpt,
relay-hy3` — the envelope has no multi-recipient field and the parser rejects
whitespace in a header value. The store was bricked for ChatGPT and hy3 over MCP
for four minutes.

The fix makes the deposit atomic: the read-back removes the file it just wrote
and rethrows. The `!stored` branch is kept for a parser that one day drops a
record silently, and is now documented as unreachable by the throwing path.

The class is worth naming, because the code shows the author anticipated exactly
this failure and still did not catch it: **a guard written against a condition,
tested by asking whether the condition is visible, when the condition destroys
the ability to look.** The same shape as I-1 — absence of a value versus absence
of the ability to observe — appearing in the apparatus that checks for I-1.

## OBS-047 · the staleness check vouched for someone else's process

`restart-tunnel.sh` exists because a tool was twice added and verified against a
freshly spawned process while ChatGPT's channel kept the old code (OBS-043). Its
check found the live MCP process by name:

```sh
mcp_pid=$(pgrep -f 'relay/mcp.ts' | head -1)
```

Three participants now run that same server. bee.hy3 reaches it over SSH, with
`sshd-session` as the parent, and its process started first — so `head -1`
returned hy3's. At 20:58 the script compared my freshly edited source against
hy3's start time and reported `FAIL` for a restart that had in fact succeeded.

A false FAIL is the harmless direction. The same line fails the other way with
equal ease: another participant's fresh process would vouch for my stale one,
which is precisely the outage OBS-043 was written to prevent. The check was
answering "does a process by this name look recent" while claiming to answer "is
the code I just edited the code being served".

Fixed by asking for the child of the tunnel-client this script itself started:
`pgrep -P "$tunnel_pid"`. Ancestry can answer "is this mine"; a name match never
could.

Recorded also because of what nearly happened while diagnosing it. Earlier the
same day I killed pid 1358171 after inferring from a single coincidence that it
was a stray of mine; it was hy3's. Reaching the same conclusion about pid
1376673 here, the parent check — `ps -o ppid=` then `ps -o cmd=` on the
result — returned `sshd-session: zaebee@notty` and stopped it. The habit that
caught it is cheap and was skipped the first time.

## OBS-048 · a digest that names bytes, under two rules about which bytes

`parent-sha256` was contributed by the peer `ownima-94` because it names bytes
rather than a label, and is therefore decidable by anyone holding both records
without any key. It is the store's only continuity claim.

It is filled under one settled rule: the digest the store computes over the
record body, after the `---` provenance block. That block holds `deposited-by:`
and `provenance:`, which the *receiving* store writes and which differ by
delivery channel — the same bytes deposited over MCP and locally carry different
headers. A digest over the whole file therefore names something the sender never
wrote and cannot reproduce.

I used `sha256sum` over the whole file in relay-0119 and relay-0123. Both values
are unverifiable by anyone applying the store's rule.

Audited across 83 records: 60 match the store digest, 20 declare no
`parent-sha256`, 3 diverge — hy3's relay-0113 `PLACEHOLDER`, which hy3 retracted
itself in relay-0114, and my two, both inside one hour. So the convention was
never ambiguous. What is worth recording is the shape of the mistake rather than
its size: the field exists precisely so that two parties can check the same
bytes, and it is satisfied by both parties computing *a* digest, which is not
the same thing as checking the same bytes. A wrong value here is indistinguishable
from a right one without the parent in hand.

Nothing enforces it. The store accepts any `parent-sha256`, including
`PLACEHOLDER`. A read-only check comparing every declared value against the named
parent's store digest is twenty lines and would have caught all three the moment
they landed; whether it should *refuse* a deposit is a protocol change and not
mine to make — a record may legitimately name a parent the depositor does not
hold, and records arrive out of order.

Corrected to hy3 in relay-0124. relay-0119 and relay-0123 keep their wrong
values, because records are immutable and an erratum is the only repair the store
allows.

## OBS-049 · the corpus format assumes what the catalogue never claims

`scripts/freeze-corpus.ts` locates producers as *repositories* on disk —
`P_E_PRODUCERS` points at a directory holding `hivemark/` and `apex/` — and
writes `sourceRev: <git rev>` for each artifact. The single escape,
`sourceRev: null` with `reason: artifact_not_versioned`, was added for gitignored
build outputs *inside* a repository that still has a rev.

There is no shape in `corpus/manifest.json` for an artifact fetched over HTTP
from a producer with no checkout and no revision. The first candidate third
source, Debian reproducible builds, is exactly that: no rev, responses carrying
no timestamp of their own, and an upstream effort still running while it is read.

So admitting a third producer is a *format* change before it is a decision.
Someone must first settle what a manifest entry for a fetched artifact asserts,
and the honest answer is close to nothing — a digest, a URL, and a retrieval time
from the fetcher's own clock. That last one is evidence about the fetcher's
access rather than about the producer: Row B of `claim-matrix-v2.md` unsatisfied,
and the manifest has no column for the difference.

The point is about this project rather than about Debian. The corpus format
encodes an assumption the catalogue never states — that a producer is a local
git repository whose artifacts pin to a revision. Both original sources satisfied
it, which is why it was never written down and never noticed. `§2` decomposes
independence into implementation and authorship and says nothing about
retrievability; the tooling quietly added a third requirement and enforced it.

That the first source failing the assumption is also the first with *both*
independence axes is not a coincidence worth mystifying: a producer sharing
neither implementation nor author is unlikely to be sitting in the same
directory. The assumption was load-bearing exactly where independence was
weakest.

Raised to hy3 in relay-0126 before it writes an adapter, together with the
narrower hazard that `src/run.ts` has one namespace — `--run 07` is run 07 of the
immutable series, not an experiment beside it.

## OBS-050 · `git add -A` in a working tree with two authors in it

At 21:18 a commit of mine swept up `src/adapters/debian-rb.ts` and
`scripts/debian-rb-check.ts` — bee.hy3's in-progress adapter, written into the
same tree minutes earlier under the relay-0124 handoff. They landed under my
commit and my message, which described neither, and the second file's mtime falls
inside the window of the `git add` itself, so it may have been mid-write.

Recoverable and recovered: the commit was local, both files were digested,
`git reset --soft HEAD~1` and an unstage put them back untracked, and
`sha256sum -c` confirmed both byte-identical afterwards.

The commit is not the finding. Two agents are writing into one working tree with
one git index and no branch between them. `git add -A` from either sweeps the
other's uncommitted work; a `git reset` or `git checkout` from either moves the
other's ground. The relay store is safe — append-only, every deposit through one
guard, verified. The repository has no equivalent, and it went unnoticed until
the first piece of work in it was not mine.

Third incident for this one command in this project. The first was a `.env`
holding a live control-plane API key in a public repository, which reached no
commit only because it was caught before the next `git add -A` ran. Each time the
reasoning was that the tree contained only my own work; each time that was an
assumption about the tree rather than an observation of it, and the third time it
was false.

The distinction is the familiar one, applied to a working directory: `git add -A`
stages *what is there*, while the author is thinking of *what they wrote*. Those
coincide only while nobody else is writing, and nothing tells you when that stops
being true.

Raised in relay-0127 with three ways out. Independent of which hy3 picks, `-A`
should not be how work is staged here.

## OBS-051 · the local deposit tool asserted an identity it could not observe

`deposit.ts` says of `deposited-by`: *"A fact about the channel, not a claim
about identity. Writing `chatgpt` would assert something no part of this system
observed."* `scripts/put-relay.ts` then called `depositLocal(bytes, "claude", id)`
with the name hardcoded.

That was true while one agent ran it. bee.hy3 now works in this same checkout,
ran `bun run relay-put`, and relay-0128 consequently reads `deposited-by: claude`
about a record I never touched. The tool made the claim the field forbids, on
behalf of someone who did not make it.

The store's consistency check contained it without preventing it: `depositLocal`
writes `authored` only when the record's `from:` matches the depositor, so 0128
came out `as-received`. The record is therefore internally coherent and still
says the wrong thing about who deposited it.

Fixed: the depositor defaults to `local` — a record was written from a shell on
this machine, which is what the script can observe — and `--as <name>` states it
when the caller wants to. Same reasoning as `mcp` on the other path.

Two things worth keeping. First, the doc comment stating the principle sat eight
lines above the call violating it, in a file whose whole subject is that
principle; a rule written down is not a rule enforced. Second, the defect was
invisible for as long as the assumption behind it held, and became false the
moment a second participant appeared — the same shape as OBS-050 one layer up,
where `git add -A` staged the tree while its author was thinking of their own
work. Both are single-occupancy assumptions that nothing announces the end of.

relay-0128 keeps its wrong value; records are immutable and relay-0129 is the
erratum.

## OBS-052 · the correction was unreferenced and the error was cited four times

`bun run check-references` was written to answer ChatGPT's relay-0132 question —
whether a `short` class of coordination traffic exists that should not have become
durable evidence. It reports what nothing has ever pointed at, which is a fact
about the graph rather than a prediction by an author.

The answer to the question asked is small: 5 UNREFERENCED of 94, two of them with
three and one successors, so at most three records and only across weeks.

The answer to a question nobody asked:

    relay-0113  PROSE_ONLY    cited in relay-0114, 0124, 0127, 0134
    relay-0114  UNREFERENCED  20 records came after and none did

relay-0113 is hy3's wake-test reply carrying `parent-sha256: PLACEHOLDER`.
relay-0114 is hy3's own correction, superseding it minutes later with the real
digest. The wrong record has four citations; the correction has none. Three of
the four are mine.

The structural half is worse. relay-0114's `parent:` is relay-0112 — the record
it answers — not relay-0113, the record it retracts. No header anywhere in the
store points at relay-0113. A reader following `parent:` and `ref:` from the
retracted record therefore finds no retraction; the only thing joining them is a
sentence in prose, which is the evidence this store deliberately refuses to build
a graph from.

`@p-e/x0` has `parent:` and `ref:` and no way to say *supersedes*. A correction is
structurally a sibling reply, and the corrected record carries no mark at all. The
whole erratum discipline — immutable records, "this is the erratum" written three
times in my own records today — depends on a reader finding the erratum, and the
envelope offers no path to it.

Which makes the citation count the more interesting number rather than an
incidental one: it is what happens when the only route from an error to its
correction is that somebody remembered. Four times, the route was not taken.

No header is proposed. relay-0134 argued a sender cannot classify their own
message, and proposing that senders classify their own corrections would be the
same move. The convention costs nothing instead: point `parent:` at what a record
corrects, and the retraction becomes findable with no new field.

Third thing today that was invisible while one participant held all the context —
after `git add -A` (OBS-050) and the hardcoded depositor (OBS-051).

## OBS-053 · every integrity check passes over the destroyed record

ChatGPT proposed in relay-0136 that references need three separated concepts —
identity, locator, integrity — and asked for counterexamples before treating it
as a protocol requirement. The counterexample is relay-0083, and it defeats all
three at once.

At 20:05:00 ChatGPT deposited relay-0083 through `append_relay`. At 20:05:00 a
shell redirect of mine wrote a different record over it. Today:

    identity   relay-0083 resolves
    locator    relay/relay-0083.txt exists and is fetchable by anyone
    integrity  relay-0084 declares parent-sha256 75d86045acdd61a6…, which is
               exactly the current store digest of relay-0083

The bytes are not the record ChatGPT deposited. Every concept reports success.

relay-0084 is the correction — the record whose first line is "I DESTROYED YOUR
relay-0083. IRRECOVERABLY. THIS IS THE ADMISSION." It binds itself by digest to
the bytes that did the destroying. The admission is cryptographically anchored to
the substitute.

Both read-only checks written tonight pass it: `check-continuity` reports MATCHES,
`check-references` reports REFERENCED. Neither is wrong. There is nothing for
them to disagree with.

The general statement: **integrity is a claim about bytes somebody already held.**
It binds a reference to whatever was at that id when the reference was written,
so a substitution that precedes the first reference is confirmed rather than
caught by every check downstream of it. Integrity can establish that two readers
hold the same bytes. It cannot establish that those are the bytes the emitter
sent, because no part of a record is written by its emitter about itself.

The missing concept is not a locator. It is *first binding* — which party's bytes
took the id, and whether anything recorded it. `@p-e/x0` records nothing of the
kind, and a self-digest would not supply it: the replacement was a well-formed
record and would have carried a valid one.

What actually prevents this is the store's refusal to overwrite, which existed at
20:05 and sat one function away from the path used. Same shape as OBS-046 and
OBS-051: a guarantee enforced at one entrance is not a property of the store.

The residue is the sharpest part. ChatGPT alone holds the original bytes —
never committed, absent from dangling blobs, no request bodies in the tunnel log.
If it re-deposits them they will be the first record here attested by exactly one
party and checkable by nobody, and the store has no state for that either.

## OBS-054 · one sentence, two standards, indistinguishable until the third producer

Run 01 gave hivemark UNDECIDABLE on I-3 with this reason:

> provenance.json pins 5 derivation inputs by digest; 0 of them are in the
> published corpus, so the conclusion cannot be recomputed from what is published
> — the observation is pinned but not presented

That sentence states two standards and treats them as one:

  (a) the input is in the corpus
  (b) the conclusion can be recomputed from what is published

For hivemark they coincide — its inputs are in neither. For apex they coincide.
They come apart for the first time on Debian reproducible builds, whose
observation is **not in the corpus** and **is published**: `has_diffoscope` is a
boolean and no pinned field holds a handle to the diff, while
`/arm64/api/v0/builds/132177/diffoscope` returns 2,573,853 bytes of real
diffoscope output to anyone who asks. Under (a) the verdict is UNDECIDABLE; under
(b) it is CONFORMS.

The frozen falsifier reads "a producer publishes a conclusion whose input is not
in the corpus", favouring (a). The `watch:` note reads "may not itself be
published", favouring (b). The catalogue does not decide, because it never had to.

The argument for (b) is not a preference. For a producer with no checkout, "the
corpus" is whatever somebody chose to pin — so under (a) the verdict is a fact
about the curator rather than about the producer. That is not hypothetical: it
produced the first I-1 UNDECIDABLE for debian-rb, and the repair was to pin more
bytes rather than to accept the verdict. Under (b) hivemark still fails, so no
existing verdict moves and the difference between producers stays real.

What (b) costs, so it is not smuggled: `build_id` is an integer, not a digest, and
nothing binds the diff retrieved today to the diff the conclusion was drawn from.
debian-rb is retrievable-but-unbound; hivemark is pinned-but-unpublished. Neither
dominates — bytes you cannot verify are the right ones, against a digest for bytes
you cannot get.

Same shape as OBS-049. A word that was unambiguous across two producers becomes
two words on the third, and both original sources satisfied the assumption so
nobody wrote it down.

Recorded also because of how it propagated — **and that second half was wrong.**
relay-0119 — mine — says 14,825 BAD records "carry a diffoscope diff". They
declare that one exists; the verb is my error and it stands. But this entry then
claimed hy3's adapter inherited the wrong verb from that sentence rather than
from the bytes. It did not. hy3 pointed out in relay-0141 that its adapter read
`has_diffoscope`, and the record bears that out: its relay-0128 verdict was I-3
UNDECIDABLE, which is what the boolean gives you and is not what my sentence
gives you. It became CONFORMS only after the pinned bytes arrived, on a reason
citing fields.

So the separation held and the contamination did not occur. The correction is
worth keeping beside the original claim because the error has the shape of the
one it was alleging: I inferred what another reader had read from what I had
written, without opening their file. Raised in relay-0140, corrected in
relay-0142; the verdict was never disputed, only the standard it applied.

## OBS-055 · the obvious command gave the wrong digest and nothing gave the right one

`parent-sha256` is the digest of the record body, after the `---` deposit header,
because `deposited-by:` and `provenance:` are written by the receiving store and
differ by delivery channel. OBS-048 recorded this after I got it wrong twice.

hy3 acknowledged the rule in relay-0125 — "agreed. the store digest is over the
body after the `---` block" — and then declared whole-file digests in relay-0138
and relay-0141.

Four divergences of one kind, from two participants, twice each, each time after
acknowledging the rule. At that point it is not a discipline problem.

The cause is that `sha256sum relay/relay-0140.txt` answers confidently and wrongly,
while the correct value could be obtained **only** by running the store's own
loader — no command printed it. The wrong answer was one keystroke away and the
right answer was not available. Everyone who reached for a shell got it wrong.

Fixed by `bun run relay-digest <id>`, which prints what a child must declare.

Two things worth keeping. First, this is the erratum discipline failing in the
way OBS-052 predicted: relay-0124 was the erratum explaining the rule, hy3 read
and acknowledged it, and the acknowledgement did not survive contact with the
shell. Writing the correction down was not enough, because what people run is not
what they read.

Second, `check-continuity` caught both records on the first run after they landed
— the first time it has found something it was not written from. Its baseline of
"already accounted for" is what made the new pair visible rather than lost in a
red wall, which was the argument for the baseline when it was added.

## OBS-056 · the formatter wanted to rewrite the evidence

`biome check .` reported the two frozen Debian artifacts —
`docs/experiments/debian-rb-bytes/b.json` and `v0-arm64-stride1000.json` — as
needing formatting. They are producer bytes, pinned by digest in
`debian-rb-retrieval.md`, with a recorded claim that each record in them occurs
verbatim in the 167MB source.

`biome check --write .` would have reformatted both. Silently: no error, exit 0,
a tidy diff. Every digest in the retrieval document would then be wrong, the
verbatim claim false, and hy3's adapter reading bytes that no longer match what
the rule produced. The source they were extracted from expires with this session,
so it would not have been recoverable by re-running the extraction.

`corpus/**` was already ignored for exactly this reason; nobody thought to extend
it when a second evidence directory appeared four hours ago. Now both are, with
the reason written in the config rather than in someone's memory.

The near miss is the ordinary kind. A formatter cannot tell source from evidence,
because that distinction is not in the file — it is in what somebody claimed about
the file somewhere else. Tooling that acts on everything in a directory acts on
the evidence too, and the only thing standing between the two is an ignore list
that has to be updated by hand every time the evidence grows.

Same shape as OBS-050: a tool operating on *what is there* while its author is
thinking of *what they wrote*.

## OBS-057 · I-4's title and I-4's falsifier are different rules

    title:      derived state is never stored
    falsifier:  a stored value disagrees with recomputing it from the published set

Debian reproducible builds stores derived state — the dashboard's four counts —
and the recomputation agrees with it exactly: walking all 18,349 source records
for trixie/arm64 and filtering `seen_in_last_sync == true` gives 16,921 / 827 / 1
/ 0, which is the stored dashboard on every count.

By the title, r-b violates I-4. By the falsifier, r-b conforms. Both original
producers store no derived state at all, so the two sentences have never been
apart and nobody noticed they were two.

The outcomes are not symmetric, which is what makes the ruling urgent rather than
academic:

- by the falsifier, hivemark CONFORMS + r-b CONFORMS is two distinct producers,
  and I-4 becomes the first ADMITTED invariant this catalogue has had;
- by the title, r-b VIOLATES, one VIOLATES sinks an invariant outright, and the
  catalogue moves from "0 admitted, nothing contradicted across six runs" to "0
  admitted, one falsified" — which no later evidence can undo.

Ruling for the title is therefore not the conservative option, though it reads
like one.

§1 makes the falsifier the thing a reader runs and the title a name, so the
falsifier should govern. That is a view and not a ruling; relay-0056 established
that "frozen" covers the catalogue rather than the apparatus, and this is the
same class — a clause prescribing a verdict on its own wording rather than on the
evidence.

Third instance tonight of one shape: I-3's corpus-membership versus
recomputable-from-published (OBS-054), the corpus format's assumption of a git
checkout (OBS-049), and now this. Each was invisible while two producers
satisfied both readings simultaneously, and each surfaced on the first producer
that did not.

Also recorded: hy3 reached CONFORMS by the wrong road — "nothing derived is
stored, so nothing can disagree" is the NOT_APPLICABLE case, which is never
support. The right verdict via an argument that would not have carried it is not
a small thing to catch, and it was catchable only because the promise of scrutiny
in relay-0144 was kept rather than the CONFORMS being welcomed.

## OBS-058 · nine rules were each written twice, and five times the two differ

OBS-057 recorded that I-4's title and its falsifier are different rules. ChatGPT's
relay-0148 made a procedural point — that privileging the title would be a
governance decision needing an explicit migration, "otherwise identical historical
evidence changes meaning without any new observation" — which prompted a check
nobody had run: comparing all nine titles against all nine falsifiers.

Five diverge.

| | title says | falsifier tests |
|---|---|---|
| I-3 | observation kept **beside** conclusion | input **in the corpus** |
| I-4 | derived state is **never stored** | a stored value **disagrees** with recomputation |
| I-7 | ownership is **enforced, not conventional** | an artifact carries a value from the **wrong class** |
| I-8 | **a record** states the limit of its testimony | no boundary **and no equivalent anywhere in the corpus** |
| I-9 | data read back is **validated**, failures counted | unreadable input dropped **with no count** |

I-1, I-2, I-5 and I-6 state the same rule twice.

The I-7 gap is already load-bearing in a committed run. Run 01's apex CONFORMS
reads, in full: *"72 values across the two machine-written files, none of them
prose (0 exceptions); the enforcement itself is a test inside the producer and is
not observable from artifacts — only its result is."* That sentence is the gap. The
title requires a mechanism, the reader says plainly it could observe only the
outcome, and it returned CONFORMS. Written honestly at the time and not recognised
for what it described.

So the pending ruling is not about I-4. Deciding that titles participate in verdict
computation reopens at least four invariants and at least one committed CONFORMS,
and makes ChatGPT's migration concern concrete rather than hypothetical. "Rule for
the title, it is more conservative" costs four invariants rather than one.

The finding is about the catalogue and not about any producer: **nine rules were
each written twice, once as a name and once as a test, and in five cases the two
are not the same rule.** It stayed invisible across six runs because both original
producers satisfied both readings of every one. Separating a single pair took a
producer resembling neither; discovering it was a class rather than an instance
took someone asking a procedural question about migration.

Fourth instance of one shape in two days — after I-3's two standards (OBS-054), the
corpus format's assumption of a git checkout (OBS-049) and I-4's split (OBS-057) —
and the first where the shape turned out to describe the others.

## OBS-059 · the file documenting the blinding contained the leak

`docs/experiments/blind-reader/MANIFEST.md` records exactly what a blind reader was
handed, by digest, and why the current specification could not be used. Its reason
for rejecting the current spec is that §11 quotes run 01's I-7 finding verbatim —
so it quotes that finding verbatim, to show what would have leaked.

Which makes the manifest disqualifying to read: handing it to the reader supplies
the very verdict the frozen revision was chosen to withhold. The document that
describes the precautions defeats them.

Caught by bee.zae asking whether MANIFEST.md should go into the chat along with the
rest. Nothing about the bundle's construction would have surfaced it — the digests
all verify, the corpus matches, the catalogue is the right revision. The leak is in
the prose of the file that certifies the absence of leaks.

Not repaired by deleting the quotation: the quotation is what makes the stated
reason checkable, and a record that says "the spec leaked" without showing how is
weaker. Repaired by a line at the top saying the file is not part of the bundle,
which is the honest shape — the file is correct as a record and wrong as an
enclosure.

Same class as OBS-046, where a guard checked whether a condition was visible while
the condition destroyed the ability to look, and as OBS-056, where the formatter
could not tell source from evidence. And the same provenance as every finding of
consequence in this project: it came from someone else asking a question.

## OBS-060 · the reader deviated from its clauses in both directions

The blind reading produced two findings that are one finding.

`I-3 / apex`'s neighbour, `I-3 / hivemark`: the frozen falsifier reads *a producer
publishes a conclusion whose input is not in the corpus*. Run 07 established that
condition in its own words — *"provenance.json pins 5 derivation inputs by digest;
0 of them are in the published corpus"* — and returned `UNDECIDABLE`. The blind
reader returned `VIOLATES`. The clause is **stronger** than the reader was.

`I-5 / apex`: run 07 returned `UNDECIDABLE` because *"every count is zero, so no
hole exists for the record to have preserved"*. That is the amended I-9 standard.
The I-5 clause asks only that periods be valid, non-overlapping and never merged —
and it is byte-identical between `580c01d` and the current specification, never
amended. The blind reader returned `CONFORMS`. The clause is **weaker** than the
reader was.

Same reader, same corpus, deviation in both directions, both invisible from inside
for seven runs, both surfaced by one outside pass that did nothing but follow the
text.

**Half of this is disputed under one reading of the clause and stands under the
other — see OBS-069's correction and OBS-070.** The I-3 leg stands: the clause is stronger than the reader was, settled
at relay-0174 on two blind readings. The I-5 leg does not. The clause was not
weaker than the reader; `src/conformance/clause.ts` was, by never implementing the
`expect:` line. Our check's `UNDECIDABLE` was correct, and the "deviation in both
directions" below was one real finding plus one misreading of my own, presented as
a symmetry.

The original entry is left standing rather than rewritten, because the pin,
OBS-069, relay-0192 and the clause-reader result all quote it.

The hypothesis this supports is narrow: **a reader's own assessment of its
interpretation cannot detect systematic interpretation drift.** The loop from
interpretation to implementation to result closes without ever leaving the reader,
so nothing inside it can measure the gap between what a clause says and what the
reader does with it. A second reader on the same clause breaks the loop, and it is
the only thing here that has.

`I-5` is the cleaner instance of the two. `I-3` invites the objection that the
falsifier's wording is arguable; `I-5` involves no amendment, no ambiguity, and no
disputed word — only a standard the reader imported from a different invariant.

This also corrects relay-0155, which grouped `I-5 / apex` with `I-2` and `I-9` as a
defect the catalogue had already amended. relay-0056 amended `I-2` and `I-9` only.

## OBS-061 · a true verdict resting on a false statement of fact

Bounding the I-1/apex incompleteness turned up a second one, and this one reached a
committed report.

Three checks make "not exercised" claims: i1, i3, i9. i3's is sound — it claims
`offSite` is never true, and `offSite` is false in 8 of 8.

`src/checks/i9.ts` reads `apexHistory(...).hosts[*].gaps` and does not open
`health.json` at all. Its reason, in every report from run 06 onward:

> all 8 host records publish a gaps count and every one is zero: the mechanism
> exists and **has never recorded a failure**, so whether failures would be counted
> cannot be observed here

In the same corpus, in the file it never opens:

| host | ok | code |
|---|---|---|
| aura.zae.life | false | 502 |
| car.zae.life | false | null |
| comics.zae.life | false | null |
| grani.zae.life | true | 200 |
| chat.zae.life | false | null |
| crm.zae.life | false | 502 |
| medicine.zae.life | true | 200 |
| quiz.zae.life | false | null |

Six of eight failed. Four returned no status at all. `gaps` reads 0 across all
eight.

**The verdict does not move.** I-9's falsifier is *unreadable input is dropped with
no count anywhere in the record*, and the failures are not dropped — they sit in
health.json per entry, with a code distinguishing "no status obtained" from "an
error status obtained". `UNDECIDABLE` stands.

What is wrong is the sentence attached to it. This is a **true verdict resting on a
false statement of fact** — a shape no tally can surface, and one that survived
seven runs and three reviewers because nobody re-read a reason against the bytes it
describes. Reports are immutable; relay-0165 is the erratum for this and for i1's.

The pattern, now that there are two: both checks state a limit of the corpus, both
derive it from one file, and both are contradicted by a second file in the same
corpus that the check never opens.

`RecordingCorpus` cannot catch either. It measures **which files a check read**,
and `health.json` *is* read — by i2, i3, i4 and i7. Coverage at file granularity is
blind to a check that opens a file and ignores the field that decides the question.
The honesty apparatus was built one level coarser than the defect it needed to see.

## OBS-062 · the guard is on the write path, not on the directory

bee.hy3 deposited relay-0166 and relay-0167 with byte-identical bodies — the same
`sha256`, `aff0157f99e1ffee…` — then removed relay-0167 as housekeeping. Confirmed
by bee.zae rather than inferred, after two identity inferences from single
coincidences went wrong earlier the same day.

The intent was reasonable and the content was not lost, since the bytes survive at
relay-0166. What the incident shows is structural.

**An append-only store whose append path is guarded and whose directory is not.**
`deposit()` refuses to overwrite: `flag: "wx"`, an explicit id check, and an error
message that says a deposit never overwrites. None of that is reachable by `rm`.
relay-0083 was destroyed by a shell redirect (OBS in the same family); relay-0167
was destroyed by a deletion. Both bypassed the guard, because the guard guards
*appending* and the store is a *directory*.

There is also a window nothing covers. Once a record is committed, git holds it and
`reports-immutable` pins the reports. relay-0167 was never committed, so git cannot
restore it and cannot show that it existed. For a record deleted between deposit and
commit there is no recovery and no detection.

The only trace that relay-0167 ever existed is a line in `/tmp/pe-watch.log`, which
is itself ephemeral, on a machine whose `/tmp` is session-scoped. The evidence that
an append-only store lost a record lives in the least durable place in the system.

What would catch the committed case is cheap — compare the store against `HEAD` and
report ids that git holds and the directory does not. What would catch the
uncommitted case is not a check at all: it is committing sooner, which shortens the
window without closing it.

Tracked as [issue #1](https://github.com/zaebee/p-e/issues/1), deliberately out of
the reader-conformance thread — a filesystem incident is the kind of thing that
becomes an unbounded hardening branch if it is worked on where it happened.

**The id was then reused.** Within the hour, `relay-0167` came back holding
different bytes — digest `46534c9a…` against the deleted `aff0157f…`, a different
parent, a different message. So the store's central guarantee failed in the round:
delete, then deposit, and an id that named one record names another. `deposit()`
refuses to overwrite and cannot refuse this, because from its side the id was free.

Nothing pointed at the old `relay-0167` in between — `check-continuity` reports no
divergence — so nothing broke. That it did not break is luck, not design: any record
depositing `parent: relay-0167` during that window would now name bytes its author
never read.

The duplicate that preceded the deletion is a separate matter and is recorded
separately, in OBS-063. This entry is about durability: deletion, the commit
window, and where the evidence of a loss lives.

## OBS-063 · record identity is not content identity

relay-0166 and relay-0167 held the same body digest, `aff0157f99e1ffee…`, for a
few minutes. That is not a defect: the store correctly refused to overwrite, so a
resubmission became a second record rather than replacing the first.

What it exposes is a limit in the identity model this project has been assembling.
`parent-sha256` was adopted, on `ownima-94`'s argument, because a digest names
bytes where a label names whatever the store calls a record. Two records with one
digest split that apart:

    sha256(X)   identifies the BYTES exactly
    sha256(X)   does not identify the RECORD at all

So a digest remains an exact statement about content and stops being a unique
pointer to a record the moment any two records agree. **`parent-sha256` does not
replace `parent:`** — it authenticates what `parent:` names, and the two answer
different questions.

That refines the decomposition relay-0136 and relay-0137 arrived at. The model was
identity, locator, integrity, and first binding; identity itself now splits:

| | answers |
|---|---|
| record identity | which record is meant — `parent:`, assigned by the store |
| content identity | which bytes are meant — `parent-sha256`, computable by anyone |

Neither is derivable from the other. A record can be renamed without its bytes
changing, and two records can share bytes without being the same record. The store
had been treating one field as covering both, and only a duplicate could show it.

`check-continuity` now reports shared digests. Its test is written against a
scratch store rather than pinned to the live one: pinning a duplicate would make
the test fail whenever the store was repaired, which is backwards.

## OBS-064 · every layer has been wrong, including the one that checks

The system that produced these observations now has six layers, and each has been
caught in error by another. This is the list, with a worked instance for each,
because the shape is the project's strongest result and it is easy to lose.

| layer | what it is for | where it was wrong |
|---|---|---|
| the reader | applying the catalogue | I-3 fired no falsifier on a condition it had established; I-5 imported another invariant's standard; i1 and i9 stated corpus limits without opening the deciding field |
| the peer | correcting the reader | hy3 reasoned from `relay/` being untracked when it holds 131 records in HEAD, and read a `VIOLATES` as sitting beside a `CONFORMS` when `admits()` short-circuits |
| the blind reader | reading without our answers | over-generous `EXCLUDED_WITH_REASON` on I-8 and I-9 hivemark, where the clause says the value never reaches an artifact at all |
| the suite | catching reader errors | its watcher missed every field read through `Object.values`, which bypasses the `get` trap; its harness ran `isoWeekOf` because that is `i5`'s first export |
| the relay | preserving provenance | relay-0083 overwritten by a redirect; relay-0167 deleted, and its freed id reused within the hour for different bytes |
| git | recording corrections | cannot restore or attest a record deleted before commit; `git add -A` swept a second author's uncommitted work into someone else's commit |

And once by hand: running the store-versus-`HEAD` check I had just recommended, I
read 132 against 131 and reported a missing record. The counts compare different
sets, one including `README.md`. The check produced a false positive on its first
use, by the person proposing it, in the message proposing it.

**No layer here is the one that is reliable.** Each was corrected by a different
one, and the correcting layer was itself corrected elsewhere in the same two days.
What worked was not a trustworthy component but the absence of a privileged one —
every claim eventually met a reader with a different vantage, and the ones that
never did are the ones that survived seven runs.

That is the catalogue's own subject, arrived at from the outside: a system cannot
audit the limits of its own access from inside, and this includes the system built
to audit access limits. `bee.zae` put it as the observation this entry records —
that each of these layers has erred, including the checking instrument.

The uncomfortable corollary, which follows and is not softened: nothing here
licenses the conclusion that the current state is correct. It licenses only that
the errors found so far were found by somebody else looking.

## OBS-065 · DEMOTED collapses insufficiency into falsification

Run 08 reports I-3 as `DEMOTED`, and so does every other invariant in the table.
`admits()` returns `"ADMITTED" | "DEMOTED"`, so the presentation layer has one word
for two states the evidence distinguishes:

    DEMOTED because no two producers CONFORM      — the evidence is insufficient
    DEMOTED because one producer VIOLATES         — the invariant is falsified

The first is recoverable by later evidence; the second never is. A reader of run
08's table sees nine identical `DEMOTED` labels, and the only place the difference
survives is the tally line — `1 VIOLATES` where seven runs read `0`.

The data has the distinction and the projection discards it, which is this
project's own subject arriving one layer further out than usual: not a reader
mistaking its access for the world, but a *renderer* mistaking two states for one
because its type has two constructors and the domain has three.

Named by bee.zae on reading run 08, and deliberately **not repaired**. The
authorization at relay-0176 covered repairing `src/checks/i3.ts` and emitting a run,
and explicitly excluded changing `admits()`. Recording a defect found while working
inside a narrow scope, rather than fixing it because it is in reach, is the whole
of what a scope is for.

## OBS-066 · the auditor found the hole I had looked past twice

The conformance suite was audited by a local Mistral, blind to every conclusion this
project has drawn, with execution and no network. Contract by bee.zae; the suite's
author wrote none of the questions.

Its central finding: **`parseHivemark` is not wrapped by the field watcher.** Only
the apex adapters are mocked, so every hivemark branch of every check has its field
access invisible to the rule that exists precisely because file-level coverage
missed two defects.

The registered prediction, written before the bundle was handed over, said the
watcher *"may still miss access paths"* and listed destructuring, `JSON.stringify`,
`structuredClone`, `Reflect.ownKeys`. Every one of those is an exotic escape from a
mechanism I assumed was attached. The actual hole is that the mechanism covers one
of two producers — in a file I had already fixed once, for this exact class of
blindness, and re-read closely while fixing it.

Twice now: `Object.values` bypassing the `get` trap was found by printing what the
watcher recorded rather than trusting it. This one was found by someone else asking
what it was attached to. Both times the fault was in the same file, and both times I
was looking at the level below the one that was broken.

The audit also missed two things the prediction named, and the pattern in what it
missed is worth more than the tally. It counted what the suite covers — four of nine
invariants, two of eighteen clauses, three of eighteen evidence rules — and it did
not question **whose reading** `clause.ts` encodes, treating it as authoritative
(*"the clause re-implementation correctly returns CONFORMS"*). That is the one thing
only an independent reader could have tested, by reading the clause itself, and it
is the deepest weakness in the suite.

An auditor can enumerate a scope exhaustively and still accept its premise. Coverage
is countable and independence is not, so an audit drifts toward the countable half.

And the audit's severity was partly mine. The bundle carried the two conformance
test files and not `tests/i1.test.ts`–`i9.test.ts`, which catch all four of its
attacks. It assessed the suite as the only guard because that is the only guard I
showed it. Sixth instance of curation deciding an outcome, and the first pointing
at my own work rather than away from it.

## OBS-067 · reconstructed attribution drifts toward the reconstructor

Two attribution corrections in about an hour, both in the same direction.

`relay-0180` read the *"zero now has a different shape"* passage as bee.hy3's own,
from `relay-0174`. That record is `from: claude`; hy3's first record in the exchange
is `relay-0175`, which acks it. Corrected in relay-0181, accepted in relay-0182.

`relay-0187` read *"rationale.ts matches phrasing, not meaning"* as hy3's note in
`relay-0180`. It is not in relay-0180; the earliest occurrence is the header of
`src/conformance/rationale.ts`, written when the rule was built. Corrected in
relay-0188.

Two is not enough to generalise from, and it is enough to record, because in a store
whose subject is who said what an unchallenged attribution becomes the record.

**The likely mechanism is not a claim.** Several agents work from a shared context
none of them wrote in full. When *"someone observed X"* is reconstructed rather than
looked up, the reconstruction has to supply a subject, and the nearest available
subject is the one doing the reconstructing. That predicts drift toward self,
predicts it in every participant including me, and predicts that it will feel like
memory rather than inference.

Which is the project's own distinction once more, applied to authorship: a property
of the record versus a property of the reader's recall of it. `parent:` and
`parent-sha256` were built because a label is not bytes. Nothing equivalent exists
for *"who first said this"* — it is recoverable by `grep -l` over the store in about
a second, and nobody runs it, because remembering does not feel like guessing.

Both corrections cost less to check than to write. That is the whole finding: the
store already holds the answer, and the failure is in not asking it.

## OBS-068 · the blind auditor has blind spots too, and they were the predicted ones

OBS-064 recorded that every layer here has been found wrong by another, including
the layer that checks. The suite audit adds the piece that was missing: **the
outside reader is not the exception.**

Before handing over the bundle, two weaknesses were registered in
`docs/experiments/suite-audit-prediction.md`:

- `clause.ts` is a second reading by the author of the thing it checks;
- `rationale.ts` matches phrasing — *never*, *none*, *zero* — and not meaning.

The audit found neither. It treated `clause.ts` as authoritative, in the words
*"the clause re-implementation correctly returns CONFORMS"*, and did not mention
`rationale.ts`'s trigger vocabulary at all. It did find something neither the author
nor two earlier blind readers had: `parseHivemark` was never wrapped, so one
producer of two was invisible to the field rule.

One audit is one data point and the misses were the two that were predicted, which
is a weaker claim than a pattern and a stronger one than an anecdote.

The shape is legible. The audit counted: four invariants of nine, two clauses of
eighteen, three evidence rules of eighteen, one producer of two. Every one of those
is a number. What it did not do is ask whose reading a table encodes, which is not
countable and cannot be answered by enumerating a scope. **Coverage is countable;
independence is not**, and an auditor asked for both will return the half that has
a denominator.

Which forecloses the obvious move. Mistral cannot become the trusted auditor, for
exactly the reason our reader could not be trusted, our suite could not be trusted,
and neither earlier blind reader could be:

```
reader → conformance suite → blind auditor → independent clause reader → ?
```

The chain does not terminate in a validator. Every layer added has been wrong
somewhere, and the reason the errors were found is that a layer with a different
vantage looked — not that any layer was sound.

So the thing this project has built is not a validator with a stack of checks under
it. It is **a protocol for mutual error discovery**, in which no participant holds
the last word and the guarantee is structural rather than personal: not *this
component is correct*, but *no component is the final one*. Named by bee.zae on
reading the audit result, and it is a better statement of the whole than the
catalogue it started from.

## OBS-069 · the file written to be independent of me was the one that misread

An independent reader — fresh session, frozen catalogue and corpus only, no
implementation of ours, no network — implemented the clauses itself and ran them.
Contract by bee.zae; `reader.py`, 51 KB, executable predicates rather than prose.

Contract §5 permits comparison on the two pairs both sides implemented:

| | our `clause.ts` | our check | independent |
|---|---|---|---|
| I-3 / hivemark | VIOLATES | VIOLATES | UNDECIDABLE |
| I-5 / apex | **CONFORMS** | UNDECIDABLE | **UNDECIDABLE** |

**On I-5 the outlier is ours — under one of two readings of the clause, and the
one nobody has ruled. See the correction at the end of this entry.**

The frozen I-5 block ends:

    expect:  one anchor exists. a gap cannot be observed in a single period, so
             the no-backfill half is UNDECIDABLE and must not be reported as CONFORMS

`src/conformance/clause.ts` contains zero occurrences of `expect:`. I implemented
the `reader:` line, stopped, and wrote a paragraph arguing that the clause "does not
ask that a gap have occurred" — true of the line I read and answered by the line
beneath it. The independent reader found that line, cited it, and returned
UNDECIDABLE. So had our check, since run 01.

So the `ACCOUNTED_CLAUSES` pin naming the check as defective named the wrong side.
The divergence it recorded is real; its account of who caused it was not.

This also removes one leg of OBS-060. I-3 — clause stronger than the reader —
stands, settled at relay-0174 on two blind readings. I-5 — clause weaker than the
reader — does not: the clause was not weaker, my implementation of it was, and
"deviation in both directions" was half an artefact of my own misreading.

Two things worth keeping about the shape.

**The error is the one the file exists to prevent.** `clause.ts` was written after
the audit chain showed that a reader cannot check its own interpretation, precisely
to supply a second reading. It supplied a second reading by the same person, and the
second reading skipped a line. Nothing about writing it twice made it independent.

**Three readers agreed and were still not evidence.** The check and the independent
reader both applied `expect:` to apex, and the line opens with "one anchor exists",
which is about hivemark's anchors. Whether it binds apex's half is not stated. Two
parties converging on the wider reading is agreement; the sentence still admits the
narrower one, and it is recorded as an open ambiguity rather than settled by a vote.

### Correction, added after OBS-070

**This entry overclaims, and I made the error it warns about.** The defect above is
established only under the *wide* reading of the `expect:` line — that it binds apex
as well as hivemark. Under the *narrow* reading the A reader-line is fully satisfied
(8 records, none without a gaps count, none with `since` after the fold), the
falsifier does not fire, and `CONFORMS` is correct — which makes `clause.ts` right
and our check over-strict, which is bee.hy3's original diagnosis, retracted in
relay-0193 partly on the strength of this entry.

Nobody has ruled between the readings. Two parties converging on the wide one is
agreement, and I wrote that sentence in OBS-070 after having already treated the
convergence as settling it in four places.

So the accurate statement is conditional: **under the wide reading `clause.ts` is
defective; under the narrow reading it is correct and the check is not.** The
ruling is a catalogue act of the same class as I-3's, which the human made at
relay-0153 rather than the party who noticed.

Neither file was silently corrected. `clause.ts` keeps its original text with the
defect marked above it, because the pin, this entry and the result document all
quote that text, and a quiet rewrite would leave three records describing a file
that no longer says what they quote.

**And the marking changed the evidence.** The defect was that `clause.ts` contained
no occurrence of `expect:`; the marker quotes the `expect:` line in order to say so.
So the file now contains the word whose absence was the finding, and anyone grepping
it today finds one hit and would conclude the claim was wrong. bee.hy3 read the
marked file and reported *"contains `expect:` exactly once"* — accurate about that
revision, and not a contradiction.

The check that survives is `git show HEAD~2:src/conformance/clause.ts | grep -c
'expect:'`, which returns 0. Annotating a defect in place alters the artifact the
annotation describes, which is why an erratum is a separate record everywhere else
in this project: records are immutable and code is not.

## OBS-070 · the same verdict by two different routes, and the clause ambiguity underneath

The I-5 reversal (OBS-069) left one question open, and looking at *how* each party
reached its verdict makes it sharper than "does the line bind apex or not".

The frozen block:

```
I-5  named periods, gaps never backfilled
reader:  H — every anchors.json period is a valid ISO week; …
         A — since never precedes first observation; gaps counted
expect:  one anchor exists. a gap cannot be observed in a single period, so
         the no-backfill half is UNDECIDABLE and must not be reported as CONFORMS
```

**The premise is narrow and the conclusion is not.** *"one anchor exists"* is about
hivemark's `anchors.json`. *"the no-backfill half is UNDECIDABLE"* carries no
producer qualifier, and the invariant's title has two halves — named periods, and
gaps never backfilled — so "the no-backfill half" reads naturally as the
invariant's, not H's.

Two readings, and the sentence supports both:

| | |
|---|---|
| narrow | the line reasons about H's single anchor and concludes about H. Apex is not mentioned and not bound. |
| wide | the no-backfill half of the invariant is unobservable here for anyone, so no producer may be reported CONFORMS on it. |

**Both parties returned UNDECIDABLE for apex, and neither route is the same.**

`src/checks/i5.ts` contains zero occurrences of `expect`. It reaches UNDECIDABLE
from `anyGap === false`, with the reason *"every count is zero, so no hole exists
for the record to have preserved"*. That is the `expect:` line's own reasoning,
arrived at without reading it.

The independent reader reached the same verdict by citing the line: *"no-backfill
UNDECIDABLE per CATALOGUE"*. It applied the wide reading.

So the agreement is on the verdict and not on the ground. Under the narrow reading
apex's `UNDECIDABLE` is a defensible reader judgement rather than a clause
requirement; under the wide reading it is required. Nothing in the corpus decides
between them, because both produce the same answer on this corpus — which is
exactly why it stayed invisible until three parties were compared.

**One consequence for the record.** bee.hy3's original diagnosis, retracted in
relay-0193, said the check *"imported the amended I-9 standard into I-5"*. That was
wrong on the side, and also on the mechanism: `anyGap` is not I-9's standard carried
across, it is the direct expression of *"a gap cannot be observed in a single
period"*. The check agreed with the clause's reasoning without ever citing the
clause. Its retraction accepted that the check *"agreed with the clause's full
text"*, which is true of the verdict and not of the route — the check never read the
full text.

**The unconditional finding, kept separate from the conditional one.** It is
tempting to say two independent implementers reproduced the same erroneous semantic
projection — and that claim is true only if the narrow reading governs, which is
exactly the thing not ruled. Stating it now would repeat the error this entry
exists to record.

What holds under either ruling is weaker and still worth having:

> **Convergence on a verdict does not reveal which reading the parties converged
> on.** Our check reached UNDECIDABLE from `anyGap === false`, having never read the
> `expect:` line; the independent reader reached it by citing that line. Identical
> output, different grounds, and the difference was invisible until someone compared
> the routes rather than the results.

That is a sharper statement than "independence is structural" (OBS-068). Two parties
can be genuinely independent, agree, and still not be evidence for the same
proposition — because agreement is measured on outputs and the thing at issue is
upstream of them.

**Evidence available to whoever rules, gathered without ruling.** The frozen
catalogue contains five `expect:` lines. Four name a producer — I-4 *"A's half"*,
I-6 *"if A can never exercise this"*, I-8 *"H's half"*, I-9 *"for H"*. I-5 says
*"the no-backfill half"*: definite article, no producer, and "half" denoting a
conjunct of the invariant's title rather than a producer's share, which is not how
the other four use the word. That pattern is a fact about the document and is
compatible with more than one account of it, which is why it is recorded here and
not resolved.

Not resolved here. Which reading governs is a catalogue question of the same class
as I-3's title-versus-falsifier, and that one was ruled by the human at relay-0153
rather than settled by whoever noticed it. `docs/experiments/i5-adjudication/`
carries the question and the frozen text, with no implementation and no reading of
ours.

## OBS-071 · finding a defect and settling it are different capabilities

Three readers were asked about one sentence, and what separated them was not
accuracy but **which job they were good at**.

**Mistral** implemented the clauses from the frozen text — 51 KB of working
predicates — and found something nobody inside this project had: `clause.ts` never
implemented I-5's `expect:` line. Excellent as an implementer. Then, asked to
adjudicate the scope of that same line, it argued from two false statements about
the document: that I-4 is the only producer-named `expect:` line, when there are
four, and that I-1 has an `expect:` block, which it does not.

**Gemini** was asked only to adjudicate. It ruled, reported that the alternative
reading survives, gave the wording that would settle each way, and found unaided
the strongest textual evidence — the shift in how `half` is used — which had been
deliberately withheld from its bundle. It also produced a ground nobody in this
project had: apex's `history.json` is likewise a single folded snapshot, so *"a gap
cannot be observed in a single period"* transfers to A on its own merits.

**Grok**, never previously exposed to the catalogue, ruled crisply and supplied the
producer-bifurcation ground, all of it verifiable and verified.

So: **an independent implementation can find a problem it cannot settle.** The
reader that discovered the omission was the least reliable about what the omission
means, and the reader that produced the best account of the question was not the
one that found it. Independent implementer and norm-adjudicator are different roles
with different epistemic powers, and nothing about being good at the first predicts
the second.

That was invisible while one party did both. `clause.ts` was written to be a second
implementation *and* an arbiter of the reader's fidelity, by the same author, and
its failure was in the second role — it did not misimplement what it read, it read
less than the clause said.

**And this is the concrete reason a vote would have been wrong**, beyond the general
one. Counting 2:1 for the narrow reading requires counting Gemini as a narrow vote.
Gemini's answer was *"narrow on the strict reading, and genuinely ambiguous"* — and
the ambiguity is the part carrying information. A tally would have discarded
precisely the half of the most careful answer that no other reader produced, and
reported the result as more settled than any participant claimed it was.

bee.zae's formulation, recorded because it is the one that generalises: different
roles, different epistemic powers, and no final privileged layer.

## OBS-072 · our own timeout converted a fact about the store into a fact about us

bee.zae reported that chatgpt was getting 502 from the relay. It was real: fifteen
of them between 11:18 and 11:19 UTC on 2026-08-29, and by the time I looked the
tunnel had recovered on its own.

The diagnosis is one line of the log, and it is not the 502s:

```
11:18:07  command response deadline reached; dropping without posting a response
```

A timeout, not a crash — and the serving MCP process kept the same pid across the
whole window, so nothing died and nothing respawned. The tunnel forwarded a command
at 11:16:04.84 and gave up on it at 11:18:07.36. **122.5 seconds.** Our
`MAX_WAIT_MS` was `120_000`.

So a `wait_for_relay` that runs its full cap and finds nothing finishes in a photo
finish against the tunnel's deadline and loses it, because serialization and the
return trip still come after our timer fires. It can only happen when the store is
quiet — and that is exactly when it happened: nothing landed between relay-0216 at
11:16:00 and relay-0217 at 11:18:38.

**What was actually lost was not availability, it was the distinction.** The tool
already had the right answer for a quiet window, written into it:

> *nothing appeared in 122500ms. That is a fact about this window, not about
> whether anything was sent.*

A 502 says something else entirely: it reports our access. The caller asked whether
anything had been sent, and got told the relay was broken. In a protocol whose
recurring finding across nine domains is *a property of the subject versus a property
of our access*, our own cap silently performed that exact substitution — and did it
in the one tool written specifically to keep them apart.

Three further things this cost, none of which a bigger cap would fix:

- **A quiet store is indistinguishable from a broken one, from outside.** That is the
  store vocabulary's `UNKNOWN` arriving where `KNOWN_MISSING` was true and available.
- **The failure is invisible in the busy case.** Every test and every working session
  had records landing well inside the window, so the bug could only appear once the
  thread went quiet — which is the state it exists to serve.
- **The certifier would have sent me the wrong way.** `restart-tunnel.sh` refuses a
  tunnel whose MCP started before the newest source, and by that rule this one was
  stale by thirteen hours. But `mcp.ts` imports four files, and none of them had
  changed. The script measures *any* source edited, not any *served* source edited —
  the same over-broad reading it exists to prevent. It would have had me restart a
  correct process for a reason that was not true of it.

Fixed by dropping the cap to `90_000`, which leaves the margin on our side and
returns the honest sentence instead of the misleading status code.

## OBS-073 · a tool does not replace a habit, and copying a header breaks the one join nothing checks

The continuity check found a sixth divergence. Its own comment had said *"a sixth
would be new"*, so it announced itself correctly. The sixth is mine, and it is not
the mistake the other five are.

relay-0200 declares `parent: relay-0199` and `parent-sha256: ac30f957…`.
relay-0199's body digest is `92b5da45…`. The declared value is not the whole-file
digest either (`2d219e07…`), so this is not OBS-055 recurring.

I scanned every record for the declared value. It is relay-0198's body — and it is
byte-identical to the `parent-sha256:` line **inside relay-0199**, which correctly
names relay-0198 as its own parent. relay-0199 landed 11:04:46; relay-0200 at
11:05:35.

So nothing was miscomputed. **I copied the header block from the record above,
advanced `parent:`, and left `parent-sha256:` where it was.** One field moved; the
other did not.

**This is OBS-063 with a cost attached.** That entry recorded that `parent:` names a
label the store assigns while `parent-sha256:` names bytes anyone can compute, and
that neither derives from the other. Stated as a property of identity, it sounds
like a nicety. Here is what it buys: because neither derives from the other, *nothing
in the system relates them*, so advancing one and not the other yields a record that
is well-formed, passes the guarded write path, and is false. And copying the previous
record's header — the cheapest way to produce a new one — is exactly the operation
that preserves every appearance of consistency while breaking the join.

The un-derivability is not a flaw to fix. It is what makes `parent-sha256` worth
having: a digest that could be derived from the label would attest nothing the label
does not already say. The cost is intrinsic to the value.

Three uncomfortable specifics:

- **`deposit.ts` contains zero occurrences of `parent`.** The guarded write path
  never looks at parent digests, so it could not have caught this. Only the read-only
  checker was ever going to, and only afterwards. That is the right division — making
  deposit verify the parent would make writing depend on the parent being present and
  readable, which is a fact about our access wearing the costume of a fact about the
  store — but it means this class of error is *detectable and not preventable*, which
  should be said out loud rather than discovered twice.
- **`scripts/relay-digest.ts` already existed**, built after OBS-055 precisely because
  "the obvious command produced the wrong value and nothing produced the right one."
  I did not run it. **A tool does not replace a habit; it only makes the right habit
  cheap.** OBS-055 diagnosed the absence of a command and built one, and the recurrence
  came from the part the diagnosis did not cover.
- **The five earlier divergences were a shared rule-misunderstanding; this one is
  clerical.** They are not the same category and pinning them in one list flattens
  that. The pin now carries the distinction in its comment.

The last thing OBS-055 got right and I under-read: it said the root cause was that
no command produced the right value. True, and incomplete. The deeper cause is that
producing a record by editing the previous one is the default motion, and that motion
is unsafe for exactly the fields that do not derive from each other.

## OBS-074 · a false statement about the corpus, sitting in a test that verified only the shape of our access

hy3 caught it in relay-0230. A comment in `tests/relay-continuity.test.ts` opened:

> relay-0166 and relay-0167 hold byte-identical bodies.

They do not. Their body digests are `aff0157f…` and `46534c9a…`, which are also
exactly what the store holds as `sha256` for them. **The live store contains no
byte-duplicate at all** — checked across every record.

So the sentence was false when written, and the store is immutable, so it has been
false ever since. I then read it and repeated it into relay-0226 as an established
fact about the corpus, where hy3 tested it and found nothing there.

**Why nothing caught it.** The `duplicates` block has three assertions. Two build a
fixture and assert against that. The third touches the live store and asserts:

```ts
expect(Array.isArray(await dupes())).toBe(true);
```

That is a claim about the *shape of the answer*, not about the store. It passes
whether the store holds two duplicates, one, or none — it would pass on an empty
directory. So the file contains a specific factual claim about two named live
records, and the only line that reaches those records checks that the function
returned an array.

**This is the catalogue's own distinction, found in our test suite.** The comment
asserts a property of the subject; the assertion beneath it verifies a property of
our access. They sit four lines apart and nothing relates them — the same
non-derivation that cost us OBS-073 one entry earlier, and the same substitution
OBS-072 recorded two entries earlier at the transport layer. Three consecutive
observations, three layers, one shape.

**What makes it worse than a stale comment.** The check itself is sound and the
reasoning behind it survives intact: a digest is unambiguous where a label is not,
and a duplicate would make one digest name two records — exact about bytes,
ambiguous as a pointer. That argument never needed the example. But the example is
what made the check *feel* grounded, and it was the part that was false. **The
check has never had a live instance to fire on**, and the comment concealed that by
naming two records as if it had.

**One further thing, unresolved rather than settled.** hy3 reported the two bodies as
`9b5622c6` and `eefc4b23`. Those match neither the body digest nor the whole-file
digest, and appear nowhere in this store. We agreed on the conclusion — not
identical — from numbers only one of us can reproduce. Had the disagreement been
about the conclusion rather than the example, our agreement would have been counted
as confirmation, and it would have been confirmation of a measurement that cannot be
located. Asked in the correction record rather than assumed to be hy3's error.

## OBS-075 · the digest attests transmission, not composition

I built relay-0236 with an unquoted heredoc so it would interpolate the parent id and
digest. The shell also interpolated the backticks around `` `relay` `` and ran it as a
command. The word was replaced by the empty output of a command that does not exist,
and line 81 landed as *"authority , guarantee-start declared"*.

One word, and the record is otherwise complete. That is not the finding.

**The store did everything right.** It accepted the bytes as-received, computed
`9dddc345…` over them, and that digest is a perfect, permanent, independently
verifiable attestation — **of content that was already wrong when it arrived.**

The thread this happened inside had spent twenty records designing guarantees over one
interval: from deposit forward. G1 — a bound id never names other bytes.
Non-rewindability — the ledger cannot roll back. A witness — this head existed at time
T. Every one of them protects the bytes *after* they land, and every one would have
protected these bytes just as faithfully. A witness attesting that head would have
attested the corruption along with it, and been correct to.

**The interval in front of deposit has no name here.** Between what the author meant
and what the deposit path received there is no guarantee, no detector, and no
vocabulary — not in the nine invariants, not in the contract hy3 assembled in
relay-0235, not anywhere in this project. It is where this defect lives, and it was
invisible because everything we built looks the other way.

It is the catalogue's own distinction moved one step earlier than we have been looking.
Every previous instance was **us reporting a property of our access as a property of
the subject** — OBS-072 at the transport, OBS-073 in the record headers, OBS-074 in the
tests. This one inverts: the subject's state is fixed, permanently and verifiably, to
something the subject never held. The digest is not wrong. It is exactly right about
the wrong thing.

Proposed for issue #1's MUST NOT list, and it is the fifth defect in my own attack on
that contract:

> The protocol MUST NOT be read as attesting that a record says what its author meant.
> A content digest attests transmission and storage. It does not attest composition.

**And the operational lesson is smaller and duller than the finding, which is usually
the shape of these.** Compose the body with a quoted heredoc and prepend the header
separately; never let the shell see a record body it is allowed to evaluate. The
guarded write path guards the store. Nothing guards the sentence on its way to it.

## OBS-076 · three reviewers, three documents, one comparison that cannot be made

The issue #1 draft was reviewed twice from outside within twenty minutes. It has three
commits:

```
11:50  the draft
11:54  + the BLOCKER header
11:57  + the proposed repair
```

**Gemini read 11:50.** It treats the exception question as open and never mentions the
rewrite vector — because that vector was not written yet. Verdict: *Production Ready.*

**Grok read 11:54.** It discusses the blocker at length and says *"neither option is
chosen or written"*, which was true of that commit and false ten minutes later.
Verdict: *readiness 3/10, internal consistency 5/10.*

**Neither read the current document.**

Two maturity verdicts sit six points apart, and almost the entire gap is a header I
added between the two readings. Reading them as two opinions of one artifact is the
obvious move and it is wrong. There is no disagreement here to adjudicate.

**The second thing, which is subtler and worse.** Grok's four secondary findings — MUST
4 is a substrate property, MUST 7 conflates two absences, key rotation is misfiled,
the scope is narrower than the issue — appear *verbatim* in the BLOCKER header it was
reading. Checked against the commit, not assumed. So they are my own findings returned,
and had I not checked I would have recorded four independent confirmations of my own
reasoning. That is the convergence-as-proof error (OBS-070, relay-0192 → 0196 → 0198),
which this project has recorded three times in other people and had not yet recorded in
itself under conditions this favourable to making it.

**What actually survives review** is small and identifiable once the stale parts are
subtracted: Gemini's dangling-binding and tombstone cases, and Grok's Variant A — forbid
exceptions in v1 rather than make them safe. Three findings from two reviews, and the
rest is either stale or reflected.

**The cause is procedural and entirely mine.** The blind-reader experiments were handed
*pinned bundles* and the pinning is why their results meant anything. I handed these two
a live file in a repository I was actively editing. Nobody was misled on purpose and
both reviews are weaker for it.

So: **a review names a commit, or it names nothing.** Eighth and ninth instances in this
project of curation deciding an outcome, and the first two that were consecutive.

## OBS-077 · a verdict is an observation, and we have written every one as a fact

chatgpt proposed closing the evidence-boundary problem with a content-addressed manifest:
hash the artifacts, the schemas, the evaluator, the declared range, and let a verdict name
the manifest root. It asked whether that actually closes the gap or whether we were about
to build another self-referential catalogue.

**A manifest pins bytes. Interpretation is not bytes.** I-5 is the proof and it is ours:
one frozen text, one version, one digest, and two live readings that three independent
readers did not settle. Both parties hash identical bytes and still disagree, because what
is in dispute was never a question about which bytes.

**The escape hatch is a trap.** You can put the evaluator in the manifest, and then
interpretation is pinned operationally — the evaluator's behaviour *is* the reading, and
any two parties running it agree by construction. The cost is exact: a verdict becomes
portable only among readers running our evaluator. Every blind-reader experiment this
project has run would have been impossible under that rule — Mistral's 51 KB of independent
predicates, Gemini's and Grok's divergences, all of them legitimate and none reproducible
from our binary.

So: **reproducible execution is not portable interpretation.** Pinning the evaluator turns
"two parties reach the same conclusion from the same bytes" into "two parties get the same
output from the same program" — reproducible builds, a solved problem, wearing the harder
claim's name.

**And then the part that reaches past this thread.** If a verdict names its manifest and its
evaluator, it stops being *"this artifact violates I-3"* and becomes *"evaluator E over
manifest M says VIOLATES"*.

Which is this project's own fact/observation split, applied one level up — to the verdicts
themselves. We built that discipline for record existence: `BOUND` is a fact about the
system, `PRESENT` is a claim about one reader's reach, and the vocabulary was designed so
neither could wear the other's name. It never occurred to any of us that **our own verdicts
sit on the observation side of exactly that line**, and every verdict this project has
emitted — in nine invariants, eight runs, four blind readings and a closing report — has
been written in the grammar of a fact.

The evidence that this is right rather than merely tidy is that we already behaved as
though it were true and did not say so. The clause-reader result records our reader
returning `VIOLATES` for I-3/hivemark and an independent reader returning `UNDECIDABLE`,
and explains the difference as **our packaging** rather than as one of them being wrong.
That is the observation grammar, used correctly, once, without the general rule being
drawn.

What it costs: "I-3/hivemark VIOLATES" is not a sentence v1 can honestly print. "Our reader
over this manifest says VIOLATES; a second reader over a smaller one returned UNDECIDABLE"
is, and it is longer for the reason that it is true.

## OBS-078 · CORRECTED — the write path does not delete anything, and I read my own demonstration wrong

> **This entry was wrong when written, and the correction came from the experiment it
> proposed.** The blind reproducer — given only a procedure, no verdict, no line number
> and no word suggesting a defect — ran both conditions and returned a *different*
> mechanism, better supported than mine. Verified decisively before accepting it, below.
> The original text is kept beneath the correction rather than deleted.

**What is actually true.** `deposit()` calls `loadStore(root)` at line 63, before the
guard at 68 and long before the write at 104. A malformed neighbour makes that call
throw on entry, so the deposit fails **upstream of the write**: nothing is written,
nothing is removed, no id is bound and none is freed.

Verified by a test that separates the two stories, which my original demonstration did
not: in a poisoned store, ask to deposit an id that is *already held*. If the guard at
68 were reached the error would be `is already held`; the actual error is
`` header `to:` is present and unparseable: "b c" ``. So control never reaches the
guard.

**Why I got it wrong, which is the part worth keeping.** My demonstration ended with
*"my correctly-formed relay-0004 still on disk? -> false"*, and I read absence as
evidence of deletion. **Absence is consistent with both stories** — written-then-removed,
and never-written — and it distinguishes neither. I had an observation and reported it
as a mechanism, in a project whose entire subject is that distinction, one entry after
recording OBS-077 about verdicts being observations.

**What survives.** A single malformed file halts every subsequent append and blocks every
reader of that directory. That is real and serious — and it is **already documented in
the code's own comments** (`deposit.ts:50-54`, `108-116`), so it is a known property, not
a discovery.

**And the hazard Fable named is structurally possible but was not what I showed.** Write
at 104, read-back `loadStore` at 119, `rm` at 124: if a malformed file lands in that
window, a committed record is removed by another party's failure. That is a narrow race,
it is untested, and no run here has exercised it. Claiming it on the strength of my
demonstration was unsupported.

**Severity, restated honestly:** not the `relay-0183` mechanism manufactured. Not a
record-deleting defect. A known availability property of a fail-closed reader, plus an
unexercised race worth a test.

---

### Original entry, kept as written


Found by an independent auditor reading `deposit.ts` cold, with no access to this
project's reasoning. Twenty rounds of adversarial design, five outside readers and
three of us had all read this file without seeing it.

`deposit.ts:118-126` reads a deposit back through the store's own parser, and removes
the file if the read fails:

```ts
try {
  const after = await loadStore(root);
  const found = after.get(id);
  if (!found) throw new Error(`${id} was written and does not parse as a record`);
  stored = found;
} catch (error) {
  await rm(path, { force: true });
  throw error;
}
```

The intent is right and is documented four lines above: an unparseable deposit left on
disk takes every other record down with it, because `loadStore` refuses the whole
store when any one record fails. So the write path undoes itself.

**But `loadStore(root)` throws on ANY record in the directory, and the `catch` removes
`path` — my own file — regardless of which record threw.** Demonstrated on a scratch
store rather than asserted:

```
1. healthy store: relay-0002 written
2. a NEIGHBOUR writes its own malformed relay-0003 (a space in `to:`)
3. my deposit is REJECTED by the neighbour's file: header `to:` is present and unparseable: "b c"
4. my correctly-formed relay-0004 still on disk? -> false
```

A correctly composed, successfully written record is deleted because somebody else
wrote a bad file, and its id is freed.

**Which is `relay-0183` — the incident this entire issue exists for — manufactured by
the guard built to prevent it.** `deposit.ts:68` asks whether an id is *currently held*
rather than *ever bound*, so a freed id is rebindable; this is a second, automated way
to free one, inside the guarded path, requiring no human deletion at all.

Two things worth separating from the bug:

- **It lives on the error path.** Every reading that found nothing was a reading of the
  happy path, including all of mine. For a store whose whole subject is what happens
  when things go wrong, happy-path review is close to worthless.
- **It is a real concurrency hazard here, not a hypothetical.** Three writers share this
  directory — claude ×126, local ×66, mcp ×63 — and a malformed deposit from any of
  them is exactly what the atomic-deposit work in OBS-046 was about.

**Deliberately not fixed.** It is the first controlled failure this project has had that
is executable rather than argued, and it is the baseline for a reproduction experiment:
whether a third party, given only a procedure and no verdict, independently observes the
same thing. Repairing it now would spend the baseline to save a one-line change.

## OBS-079 · more context did not help the auditor, and may have hurt

Two audits of the same pinned commit, same model, same bundle of artifacts, minutes
apart. The only deliberate difference: the first contract carried three "weak spots"
nominated by the document's own author, placed last with an instruction to form
findings before reading them.

That mitigation did not work and could not have: the contract is one file, so the steer
was in front of the auditor from its first read. The auditor said so itself, unprompted,
in its opening disclosure — which is the disclosure rule earning its place.

| | top findings | the executable defect |
|---|---|---|
| steered auditor | found 3 of 3 | **missed** — saw only the weaker half of the same area |
| blind auditor | found 3 of 3 | **found**, with the mechanism |

The steered reader had strictly more information and produced the weaker result on the
finding that mattered most. It reached `flag: "wx"` is overstated and stopped; the blind
one reached the same place and kept going into the error path.

**What this does not license.** n = 1, one run per condition, and the two runs differ in
more than the steer. Ordinary variance is not excluded and the design cannot separate it.

**What it does license**, and it is bee.chatgpt's formulation because it is the right
one: *additional context is not monotonically beneficial to independent auditing.* The
mechanism is anchoring — hand a reader three places to look and they audit the space
someone else drew, which is a smaller space than the artifact.

The consequence for how this project runs experiments is concrete: **knowledge sharing
and audit independence are different needs and should not be served by the same
bundle.** A rich-context analyst, a blind auditor, a blind reproducer and an adversarial
reader should be given different material on purpose, and their results compared
afterwards — rather than everyone receiving everything, which produces an information
cascade in which every later reader sees through the first one's eyes.

This is also the tenth instance in this project of what we hand a reader deciding the
outcome, and the first where the deciding was measured against a control rather than
noticed afterwards.

## OBS-080 · the reproduction experiment worked, by contradicting everyone who set it up

bee.chatgpt proposed the design: a discovery is not established until a party who did
not make it can reproduce it from a procedure alone. Independent *discovery* was already
demonstrated; independent *reproduction* was not, because the only party who had
reproduced the finding was its subject — me.

So the capsule was built to withhold everything that would turn reproduction into
agreement: no verdict, no line number, no `expected`/`observed` fields from
bee.chatgpt's own sketch, and no word — bug, defect, delete, removed — that names an
outcome. Two conditions, one of them a control with no malformed record at all, so that
"the conditions were identical" remained a reportable result rather than a failure.

**Result: `NOT_REPRODUCED`, with a better mechanism supplied.**

The reproducer observed the same *outcome* both I and the discovering auditor observed —
in condition B the deposit throws and no file appears — and then read the source and
placed the cause somewhere else entirely: `loadStore` at `deposit.ts:63`, on entry,
before the write. Not the read-back guard at 118-126 that the auditor had named and I had
demonstrated against.

It was right. Verified with a test neither of the earlier readings had run.

**What this experiment actually established, in order:**

1. An independent reader found something twenty rounds and five readers had missed.
2. A second independent reader, given only a procedure, found that the first reader's
   *mechanism* was wrong — and that the author's confirmation of it was wrong too.
3. The author's "confirmation" turned out to be the weakest link in the chain, because
   confirming a finding you already believe requires only an observation consistent with
   it, and mine was consistent with two mechanisms.

Point 3 is the result. **Author confirmation is not reproduction, and this is the
concrete demonstration of why** — not a methodological principle argued in advance, but a
case where the author agreed with a wrong mechanism and the disinterested party did not.

**And the capsule's neutrality is what made it possible.** Had it carried `expected:
relay-0004 remains / observed: deleted` — the shape originally proposed — the reproducer
would have been asked to confirm a deletion, and the deletion is the part that was false.
The design that withheld the answer is the reason the answer got corrected.

The remaining gap, stated so it is not quietly closed: **nobody has yet independently
reproduced a finding that turned out to be correct.** What was reproduced here is a
correction. That is a stronger result for the method and a weaker one for the finding,
and the two should not be reported as one.

## OBS-081 · independent discovery and independent reproduction, both, on a finding that is correct

The gap left open in OBS-080 is closed. There, the reproducer had reproduced a
*correction* — it showed the discoverer's mechanism was wrong. What had never happened
was independent reproduction of a finding that turned out to be **right**.

A blind auditor reading the spec cold reported that `KNOWN_MISSING` carries two
incompatible definitions: the requirement derives it from a ledger that survives
deletion, the code derives it from whether a surviving record happens to name the id.

Capsule 02 was built to test that without saying so. It contained the normative text
verbatim, the implementation, and four states spanning the vocabulary — present,
absent-and-named, absent-and-unnamed, never-existed — with no indication that any state
was interesting, no mention of a defect, and an explicit statement that all four agreeing
was a complete result. The reproducer was told nothing had been found.

**It found S3 on its own.** And it was right — verified here afterwards rather than
taken on trust:

```
S2 (survivor names relay-0002): exists(relay-0002) = KNOWN_MISSING
S3 (survivor does not):         exists(relay-0002) = UNKNOWN
```

Identical deposits, identical deletion, different visibility state, and the only
difference is whether some other record happened to mention the id. The requirement says
a client "must never confuse *content removed* with *no binding*"; the implementation
confuses exactly those two whenever nothing references the id.

**Two things the reproducer produced that neither audit did.**

First: **S2 agrees in output and not in mechanism.** The requirement gets
`KNOWN_MISSING` from a retained binding; the implementation gets it from a surviving
reference. In S2 both models happen to give the same answer, "by coincidence of the
state's construction." A test suite exercising only S2 would have certified the wrong
model — which is a general point about conformance testing that this project had not
made, arriving from an agent that had read none of it.

Second, and better: **the requirement is only evaluable under a mapping.** It is written
for a two-part architecture, ledger plus payload, where the binding survives the bytes.
The implementation is single-part — the file *is* both — so both of the requirement's
defined cases presuppose a component that does not exist. Whether S3 is a violation
therefore depends on whether this store is the component the clause binds, and the
reproducer said plainly that the withheld remainder of the specification would settle it
and that it could not.

That is the interpretation gap — a verdict that byte-identical artifacts cannot settle,
because what is in dispute was never about which bytes. Twenty rounds reached it as P3.
An agent with none of that context walked into the same wall in a single run and named
it correctly.

**So the criterion is met, in both halves and on a correct finding:** a party that did
not make the discovery reproduced it from a procedure alone, without being told what to
look for or that there was anything to look for. And the honest caveat travels with it —
the finding it reproduced is itself conditional on a reading nobody has ruled.

## OBS-082 · output equality is not semantic conformance

From capsule 02's S2, and separated out because it is wider than this project.

The requirement derives `KNOWN_MISSING` from a ledger that retains the binding across
deletion. The implementation derives it from whether a surviving record happens to name
the id. Two different mechanisms.

In state S2 — deleted record, and a survivor names it — **both models return
`KNOWN_MISSING`**. The blind reproducer's phrasing: they agree "by coincidence of the
state's construction."

So a conformance suite exercising only S2 would have gone green while certifying the
wrong mechanism. The output matched; nothing about the model did. And S2 is not a
contrived state — it is the *natural* one to write a test for, because it is the case a
specification author has in mind when writing the clause.

> **A test can reproduce the correct output while testing the wrong mechanism.**

The general form: `output equality ≠ semantic conformance`, and any black-box conformance
suite can have this defect without any of its tests being wrong. Every individual
assertion passes, every assertion is about a real requirement, and the suite still
certifies a model the implementation does not hold.

This is the same disease as the suite-audit finding that four mutations left the
conformance suite green — but sharper, because there the suite was not *looking*, and
here it looks, gets the right answer, and is wrong about why.

What would have caught it: the S2/S3 pair. Neither state alone distinguishes the models;
the difference between them does. So the unit of a conformance test is not a state but
**a pair of states chosen so the candidate mechanisms disagree** — which is a demand on
test design that "cover the requirement" does not produce, because both members of the
pair are the same requirement.

Open, and worth more than this project: how to tell observational equivalence from
semantic conformance without already knowing which mechanisms are in play. The relay is
useful here for a reason that is now concrete — it can store not just `PASS` but the
evidence boundary and the reasoning that produced it, and the mechanism is exactly what
that boundary would have exposed.

## OBS-083 · byte provenance is not enough, and this is the system's boundary

P3, stated on its own because it is a limit rather than a defect.

Byte-level provenance answers one question completely: *did everyone look at the same
thing?* Content addressing, digests, immutable storage and replication all serve that
question and can settle it beyond argument.

They cannot settle the next one. Capsule 02's reproducer, with byte-identical material,
reported that whether the divergence it found is a *violation* depends on whether the
store under test is the component the clause binds — and that the withheld remainder of
the specification would settle it, and that it could not.

```
same bytes
   ├── interpretation A → VIOLATES
   └── interpretation B → CONFORMS
```

**If a disagreement lives below the byte level, no quantity of hashes, replicas or
append-only storage removes it.** That is the ceiling on what evidence infrastructure can
deliver, and it is worth stating as a property rather than discovering repeatedly.

So provenance is needed for more than bytes. At minimum:

- the **interpretation version** — not the artifact's, the reading's, and a frozen text
  can carry two live readings at one version (I-5 has, all day);
- the **scope** — which component a clause binds;
- the **clause → implementation mapping**, which capsule 02 showed can be missing entirely:
  the requirement assumed a ledger-plus-payload architecture and the store is single-part;
- the **architecture assumptions** a requirement was written against, which are usually
  invisible precisely because the author shared them.

Without these, a system can prove perfectly that everyone examined identical bytes and
still not establish what those bytes were required to mean.

Two consequences worth keeping:

- **A verdict is portable only up to interpretation.** Pinning the evaluator closes the
  gap operationally and costs the independence that made outside readings worth having —
  reproducible execution is not portable interpretation.
- **An unresolved reading is not a failure of the evidence layer.** It is the evidence
  layer working correctly and reporting that the remaining disagreement is not of its
  kind. Reporting it as `UNDECIDABLE` rather than picking a side is the honest output,
  and the catalogue has had the word for it since the beginning.

## OBS-084 · the race I left claimed is refuted, and a different one is real

The third capsule closes the loose end from OBS-078's correction, where I wrote that
Fable's read-back hazard was "structurally possible as a narrow race, untested." It is
not merely untested. **Under concurrent deposits it does not happen, and there is an
argument for why.**

The blind agent's reasoning, verified against the code: the only `rm` in the write path
targets the caller's **own** id path, and for a sibling deposit to target id X it would
have to hold X — which `wx`'s exclusive create and the `held.has` guard both prevent while
X exists. So a losing writer never deletes anything, and both halves of the invariant hold
against racing writers. Over ~5,000 deposit attempts, including 1,200 run against a task
rapidly poisoning read-backs, returned-count equalled on-disk-count exactly, with zero
violations either way.

So the hazard as Fable described it and as I repeated it — **a committed record removed
because someone else's deposit failed — is refuted**, not unconfirmed.

**What is real is a different mechanism, and the agent found it by taking the invariant
literally.** The cleanup is `rm(path)` on a fixed path. An external `rename` that hides
the file and restores it defeats it:

```
writeFile creates relay-0001.txt
read-back parse throws; catch entered
external rename: relay-0001.txt -> hold
rm(path) finds nothing, removes nothing, rethrows   <- the call throws
external rename: hold -> relay-0001.txt
final state: the call threw, and its own record is on disk under the asked id
```

Verified here independently with a matched control: **353 of 400 with the renamer
running, 0 of 400 without.** The general form is worth keeping: **cleanup-by-fixed-path
cannot be atomic against a concurrent rename of that path.**

**And this is partly a criticism of my own invariant.** I wrote half (b) —
"if it throws, no file for the asked id is present" — unconditionally. No code can hold
that against an actor manipulating its paths mid-operation. The agent said so plainly:
the capsule permits renames and the invariant is stated unconditionally, so this is a
literal reproduction, reported with the mechanism disclosed. That is the correct handling
and the fault in the framing is mine.

Reachability here: nobody renames files in `relay/`. It is worth noting anyway that
write-temp-then-rename is the standard safe-write idiom, so a tool adopting it would be
doing renames in that directory as ordinary operation — it would still need to hit that
exact id path inside a sub-millisecond window.

**The agent's experimental hygiene was better than mine**, and that is the durable lesson
of this run. It separated *vacuously possible* from *measured code property* — declining
to count an external deleter as a finding, because "it breaks the claim for any file in an
adversary-writable directory and reveals nothing about `appendRelay`." It ran matched
controls and reported both counts. And it stated where it could **not** get control:
cross-process timing against a 0.4 ms deposit was not achievable, so all control came from
in-process interleaving — which changes what its negative results mean, and it said so
rather than letting a null read as proof.

That is the discipline `NOT_REPRODUCED`-as-a-real-outcome was meant to produce, and it
produced it: the negative half is the more valuable half here.

## OBS-085 · REFUTED is not NOT_REPRODUCED, and the difference is a mechanism

bee.chatgpt's correction to how OBS-084 was filed, and it belongs in the vocabulary
rather than in prose about one experiment.

  `NOT_REPRODUCED`  I tried and did not observe it. Says something about the attempt.
  `REFUTED`         The hypothesised mechanism cannot produce the effect, and here is
                    why. Says something about the subject.

The race capsule returned the second, and the gap between them is the whole value of the
run. A bare `NOT_REPRODUCED` reads as *we were unlucky* and leaves the hypothesis alive,
which creates an ugly incentive: suspect, try, fail, **try harder** — and research becomes
a hunt for confirmation with no stopping rule.

What made it a refutation instead:

- ~5,000 deposit attempts, including 1,200 run against a task continuously poisoning
  read-backs;
- **paired controls**, reported with both counts, not just the interesting one;
- an argument from the code for *why* it cannot happen — the only `rm` targets the
  caller's own path, and no sibling can hold that id while it exists;
- an explicit statement of the limit: cross-process timing against a 0.4 ms deposit was
  not achievable, so all control was in-process, which changes what the negatives mean.

Any one of those alone would leave a null result. Together they kill the hypothesis.

**And the same run produced a positive finding by taking the invariant literally** — the
rename-versus-`rm(path)` defeat, 353/400 against a 0/400 control. So one experiment did
three things at once: killed our hypothesis, found a real defect, and showed that part of
the defect was in the **specification** — half (b) of the invariant was written
unconditionally by me, and no implementation can hold that against an actor moving its
paths mid-operation.

The general shape worth keeping: **a negative result is worth what its mechanism is
worth.** Without one it is a report about the experimenter. With one it is a report about
the system, and it can be stronger than a positive — here the refutation removed a claim
that two parties had already repeated and one had recorded.

## OBS-086 · the third occurrence, made while claiming to avoid it

A blind audit of the revised spec found a factual error about our own code. Verified, and
it is worse than the auditor could see.

The spec said which absent seq reads `KNOWN_MISSING` "depends on whether a surviving
record happens to mention it — **established by prose**, not by any ledger." That is
wrong. `knownMissing` derives **solely** from `parent:` and `ref:` headers, and
`reference.ts` carries a verdict, `PROSE_ONLY`, whose whole purpose is to stop a body
mention being read as a link.

Measured with the store's own predicate rather than by reading:

```
knownMissing(store), whole store: relay-0026, relay-0045.  Two ids, and that is all.
gap 37-45: relay-0037..relay-0044 UNKNOWN, relay-0045 KNOWN_MISSING.
```

**So relay-0257's "five of nine are KNOWN_MISSING" was false**, and on the strength of it
I corrected hy3 — it had offered seq 42 as an id any reader gets `UNKNOWN` for, and it was
right. relay-0042 is UNKNOWN. I told it the example was wrong.

**How, and it is the part that matters.** relay-0075 mentions relay-0042 in its *body*.
I read that and treated it as establishing `KNOWN_MISSING` — in the same sentence where I
wrote that I had verified it *"by reading relay-0075, not by a substring match, because a
substring match is how I would have got this wrong."* I swapped one unreliable method for
another and called the second one verification. The boast and the error are in one line.

**And this project has made this exact inference before and recorded the correction.**
`store.ts:38-44`, which I read today:

> An earlier version of this comment cited relay-0029 through relay-0031 as the example.
> They are UNKNOWN, not KNOWN_MISSING: they appear only in prose inside relay-0033's
> body… So the file whose subject is this distinction made a false claim about it —
> written in the same commit that recorded the store catching its author making exactly
> that inference.

Third occurrence, and the first two are documented four lines apart in a file I had open.

**What this costs beyond the number.** OBS-084's line that "five records' worth of prose
is doing the work a ledger should do" was not a measurement; it was this error with a
figure attached. The real state is two ids, both by header. The social layer I claimed to
have sized was never sized.

**What survives:** `GAP` still cannot be a vocabulary state, because one contiguous
absence of nine ids still holds two states — 0045 differs from 0037–0044. The conclusion
stands on one instance instead of five, which is enough for it and was never the reason
I believed it.

**The pattern, stated so it can be checked next time.** Every one of my measurement errors
today — the `deposited-by` census, the absence-means-deletion reading, this — came from
answering a question about the system with an *ad-hoc query over its files* instead of
with *the system's own predicate*. The store exports `knownMissing`, `exists`, and
`loadStore`. I used `grep` and my eyes. The rule that would have caught all three: **if
the system has a function that answers the question, a measurement that does not call it
is not a measurement.**

## OBS-087 · the counter destroys the evidence that would detect the counter's own failure

Capsule 04 gave a blind agent the design and no implementation — it wrote its own, so what
was tested was the design rather than my code. Four results, three of which overturn
something we had agreed.

**Ordering settled by measurement.** Reserve-before-payload survives every crash point
constructed: 0 violations across 1000 randomised trials of ~40 operations each. Payload-first
fails at the gap: **927 of 1000 trials** left a durable file the store did not know about,
which the next allocation renamed over. That is not analysis; both numbers were run.

**My detectability argument is refuted, and I verified the refutation rather than accept it.**
In relay-0307 I held that a rolled-back allocation history is cross-checkable — every record
file's id must appear in the history — while a deleted record leaves nothing. Measured:

```
files survive, history rolled back:  coverage ok=false, orphans=[0004,0005]  detected
files deleted, then rolled back:     coverage ok=true,  orphans=[]           NOT detected
both cases: the same id is reissued and content-4 is overwritten by "NEW"
```

The check passes **vacuously** when the files are gone, because there is nothing left to
check against. And deleting record files is exactly what the counter exists to make safe.

> **The counter makes pruning safe for never-reuse and, by the same act, destroys the only
> evidence that would detect a rolled-back counter.**

The agent measured the general case too: 250 of 500 randomised rollbacks detected — every one
where the rolled-off files survived — and 250 undetected, every one where they had been
deleted. So the asymmetry I claimed is real only in the case the design is meant to eliminate.

**The fourth state is unassignable from disk.** chatgpt and I converged on
`ALLOCATED_NOT_BOUND` as distinct from `KNOWN_MISSING`, and hy3 conceded it. Measured: under
reserve-first both are the *identical* disk state — history yes, file no. Telling them apart
needs a **second record type** the design does not have: a binding-completed mark or a
deletion tombstone. An allocation-only history cannot carry it.

So the state is real conceptually and **not assignable by any reader**, which is a word for
something nobody can identify. Three of us agreed to add it and none of us checked whether it
could be read.

**And the design does not survive concurrency at all.** All 20 interleavings of two
concurrent deposits were run: **12 of 20 duplicate an id under reserve-first**, 18 of 20 under
payload-first, because pick-and-append is not atomic and the design nowhere requires it to be.

That is the sharpest practical finding. Our current code gets atomicity from `writeFile(...,
{flag: "wx"})` — create-or-fail on the id itself. The counter moves allocation into the
history and specifies nothing in its place, so **as written it is worse than what we have on
the axis we were not discussing.** Every one of us reasoned about crashes and none about two
writers, in a store that has had three writers all day and two id collisions this afternoon.

## OBS-088 · the guard hid the behaviour, and two different failures were counted as one

Two findings from one investigation, and the first is another wrong measurement of mine —
the fifth today, and the first of a new kind.

### Zero was survivorship

I reported that no record in the store has a declared `id:` disagreeing with its assigned id,
and read that as evidence about our practice: *"we are choosing a practice, not describing
one."* hy3 repeated it.

`deposit.ts:82-84`:

```ts
const id = proposedId ?? nextFree(new Set(held.keys()));
const declared = /^id:\s*(\S+)\s*$/m.exec(bytes)?.[1];
if (declared !== undefined && declared !== id) throw ...
```

**The store refuses a disagreement.** So zero disagreements exist because none can be stored,
not because none were made — **five were made today** and every one was repaired by hand
before landing. I counted survivors and reported behaviour.

This is a different error from the previous four. Those were the wrong *method* — grep where
a predicate existed. This one used the right source and asked a question the source cannot
answer: **a guarded store shows the guard's output, not the population's behaviour.** Where
there is a guard, the attempts are the measurement and the contents are its shadow.

### And it explains the collisions

If a record declares no `id:`, the store assigns `nextFree` and there is nothing to conflict
with. The whole collide-and-renumber-by-hand loop is produced by authors naming the record
they are composing.

Which separates two failures this project — me included — had been counting as one:

- **Race.** Two writers propose the same free id at the same moment. `relay-0225` (hy3 and
  me), `relay-0232` and `relay-0336` (chatgpt and me). Real, and `wx` already handles it:
  capsule 03 measured 16 writers on one id — one returns, fifteen `EEXIST`, never duplicated.
  Lossy, never wrong.
- **Stale declaration.** A writer names an id already taken because its view is behind. hy3's
  `0324` landed as `0326` — and **both records are hy3's**, so it collided with itself, not
  with anyone. Its `0328` landed as `0329` because chatgpt held `0328`. Authorship verified
  from the records rather than taken from the report.

Three races and two stale declarations. I had been offering all five as motivation for a
design change, and only three of them are about allocation at all.

### The rule that falls out, and what it unexpectedly closes

> **Declare `id:` only when importing. Never when authoring.**

Declared identity is load-bearing exactly and only for cross-store import — an imported record
gets a new local id, and the declared one is the only surviving trace of what it was called at
its origin. For a locally authored record it is pure redundancy, since the store assigns
anyway and refuses on mismatch.

And it closes an ambiguity flagged two records earlier and left open: a bare declared id
cannot distinguish an import from a typo, because both are just a number that disagrees.
Under this rule an authored record carries no `id:` at all, so **any record that declares one
is an import** — and the two cases stop being structurally identical. The rule that removes
the collisions removes the ambiguity as well, which I did not expect and checked twice for
that reason.

### One more, from hy3, sharpened

hy3 observed that namespacing must cover every locator-bearing field, not just declared `id:`.
Sharper than it put it: an imported `parent: relay-0042` carrying no namespace **does not
dangle here — it matches our `relay-0042`**, a different record. Silent misresolution rather
than visible absence.

It is caught only because the citation pair's digest half turns it into a reported divergence.
That is the pair earning its place on a case nobody listed when we derived it from the three
properties.
