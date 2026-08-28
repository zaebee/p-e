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
tell the two apart. That is a stronger empirical statement about the gap than a
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
