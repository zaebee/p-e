# Q1 — the procedure as a contract

**Status: a specification, not a dispatch. Nothing in it has been run, no participant has been
approached, and no digest domain is chosen here or implied.** The derivation this rests on is
`q1-independence.md`; this document is what chatgpt asked for in relay-0616 — the whole procedure
at once rather than the procedure repaired one flaw at a time.

---

## 1 · Fixed before the run, or the run does not count

Each item is deposited as a record **before** any participant is approached. The point is not
tidiness: every one of these is a choice that, left open, gets made after seeing results by
whoever is hoping for something. That failure is measured in this project three times over
(relay-0589, 0591, 0596).

| | fixed in advance | why it must be |
|---|---|---|
| 1 | the bundle, by digest | a commit is a locator; the digest is the artifact (rule 12) |
| 2 | the payload set, by digest | otherwise payloads can be added until one separates the answers |
| 3 | the output form — a table of payload → 32 bytes | so the result is not a count, and no spread statistic exists to choose |
| 4 | the comparison — byte equality | the one comparison with no baseline, no unit, no definitional freedom |
| 5 | **the decision rule** (§5) | see below; this is the item the earlier drafts lacked |
| 6 | the asymmetry: convergence corroborates, only divergence measures | our own four implementations converged on a domain the spec never states |
| 7 | the dispatch record — participant, bundle digest, time | a suppressed answer must leave a visible hole (E7a) |
| 8 | the eligibility predicate, before the parties are known | so *which one* is not a degree of freedom (E7b, E7c) |
| 9 | what result would count as Q1 **not** being underdetermined | declared before it can be tempting |

---

## 2 · Every element sorted by what kind of thing it is

The project's four categories, applied without softening. **Store-derived**: readable from the
store. **Channel-observed**: a fact about a transmission we made. **Verifiable claim**: an
assertion we can independently check. **Bare claim**: an assertion whose truth we take or leave.

| element | category | who can check it |
|---|---|---|
| bundle bytes and digest | store-derived | anyone with the store |
| payload set and digests | store-derived | anyone |
| dispatch records, times, order | store-derived | anyone |
| what we transmitted, and only that (E3) | channel-observed | us, recorded |
| one-shot, no clarification (E5) | channel-observed | us, recorded |
| attacker did not author what it attacks (E4) | channel-observed | us, recorded |
| **the returned digest table (E6)** | **verifiable claim** | **anyone, by recomputation** |
| the control-payload digest (E2′, §3) | verifiable claim | us, by comparison |
| run isolation, when we control the invocation (E1b) | channel-observed | us; **unavailable**, recorded as such, when we do not |
| **participant's prior exposure (E1c)** | **bare claim** | **nobody** |

**The pattern is not incidental: everything checkable is either a byte we hold or a computation we
can repeat. Nothing about a participant's history is in either column, and nothing will put it
there.**

---

## 3 · E2 strengthened, because a reported match proves nothing

The contract must carry the bundle's expected digest — rule 12 requires the reader to verify before
its output counts. But that same requirement makes the report worthless as evidence of computation:
the expected value is printed in the task, so "it matched" can be transcribed rather than computed.

**The fix is one line: include one file whose digest is not disclosed, and ask for it.** We know the
value; the participant is not given it. A correct answer is then evidence that a computation
happened. This is cheap, and the first draft of the procedure missed it.

---

## 4 · The independence that cannot be obtained — and exactly how far E6 reaches

The repository is public: `github.com/zaebee/p-e`, `isPrivate: false`. Store, ADRs, methodology,
every bundle. So non-exposure is not merely unverified; there is no access control that could ever
make it verifiable, and no participant's history is establishable by us.

**E6 compensates a part of this, and it is important to say exactly which part, because the
tempting summary is wrong.**

Q1 is two questions wearing one name:

- **Q1-as-measurement.** Is the digest domain underdetermined, and along which axes? This is
  answered by *computation*. Two implementations either produce equal bytes on a payload or they do
  not. Exposure barely touches it: a participant who has read everything still cannot make 32 bytes
  come out other than they do without being caught by recomputation.
- **Q1-as-decision.** Which domain should the protocol adopt? This is answered by *judgement* —
  weighing injectivity against migration cost, the spec's stated purposes against its silences.
  **Exposure bites here and nowhere else.** A participant who has read our thread knows which answer
  we would like.

**E6 carries the first entirely and the second not at all.** And the second is where stage 1's real
value lay: five axes with a recommendation and a price on each is judgement, not arithmetic.

Two consequences follow, and the second is uncomfortable.

**First, an inversion.** If the computation half is checkable by recomputation, it does not need an
independent party — we could compute it ourselves and the result would be exactly as checkable.
Spending an outside party on it spends independence where independence is not required. The outside
party is only worth anything on the judgement half — which is the half where its independence
cannot be established.

**Second, the criterion collides with the fact.** bee.zae's rule is that independence outranks cost
for the core. The core decision here is which domain to adopt, and that is the one place where
insensitivity is unobtainable by any procedure we can build. **The measurement can be made
independent. The choice cannot be, by a participant.**

---

## 5 · The mechanism already exists, and it is rejection, not selection

**This section replaces the "decision rule" of the first draft, which was the wrong shape and
partly forbidden by the project's own founding text. Found by applying rule 13 one level up —
search the system for an existing principle before inventing one — at chatgpt's request,
relay-0619.**

### 5.1 · What the README already says

> *"p-e is not designed first. p-e is extracted first."*

> *"A spec edited to match the latest run would make the normative document a function of the most
> recent experiment — and run 06 admitting something would then force a normative change for an
> empirical reason. The draft records what is proposed. The reports record what was witnessed."*

That is the principle, stated at the top of the project, in the founding separation of spec from
reports.

**And it forbids my §5 as it was written.** I proposed *"a function from the measurement to the
adopted domain"* — which is exactly a normative document made a function of an experiment.
Pre-registration answers the objection §5 was derived from (choosing the statistic after seeing the
numbers, relay-0591/0596). It does not answer this one, which is a different objection: that an
empirical outcome should not determine a normative requirement **at all**, however early the rule
was written.

### 5.2 · What the ADRs already do

The mechanism this project actually uses is visible twice, worked:

- **ADR-1.** SF-2 was not rejected because a better candidate won. It was rejected because it
  violated things already in the contract — MUST 1's single allocation mechanism, monotonicity, and
  decisively line 317, which requires the envelope `id:` to be *checked* against the store-assigned
  id: *"You do not check X against Y if Y was chosen to equal X. A MUST requiring a check cannot be
  satisfied by removing the possibility of its failure."*
- **ADR-2.** *"a rule that removes a problem is not thereby a rule the contract entails."* Same
  test, same outcome, and the note records that both were written by one author and neither flaw
  was visible to that author.

**Neither ADR selected anything. Both eliminated.** The input is the contract, not a measurement;
the output is a rejection, not a choice; and there is no chooser in either.

### 5.3 · And the stage-1 participant used it without being told

From `q1-attack/RESULT.md`, on axes B, C and D:

> *"not settled by the spec, but **each has a purpose stated in the spec that only one candidate
> serves**."*

That is elimination against stated purposes, arrived at by a participant that was given no
methodology, no ADRs and no candidates. It is the strongest evidence available that the mechanism
is a property of the material rather than of our habits.

### 5.4 · So the correct form, which chooses nothing

Not *measurement → domain*. Instead: **a predicate on candidates, drawn from constraints that
predate the question, applied to each candidate domain in turn.** Whatever it rejects is rejected.
Whatever survives, survives.

Three outcomes, and the third is not a failure:

| outcome | what it means |
|---|---|
| exactly one candidate survives per axis | the contract already entailed it; nobody chose |
| none survives on an axis | the contract is self-contradictory there — that is F2's shape, and it is a result |
| **more than one survives** | **the specification is genuinely silent, and no measurement can break the tie** |

The third outcome deserves emphasis because it is the one a procedure designed to produce an answer
will be tempted to suppress. If two domains both satisfy every constraint that predates the
question, then the choice between them is **not a protocol question**, and adopting one is a
convention to be labelled a convention — issue-1 already keeps that word apart from *guarantee*
(line 209: *"**convention**, never a guarantee"*).

**What remains judgement, stated:** which constraints count, and whether a candidate violates one.
That is real and it is not eliminable. But it is judgement **against text that predates the
question**, which is as close to insensitivity as this project has ever obtained — and it is the
same thing pre-registration approximates, arrived at from the other side.

**I am still not applying the predicate to any candidate.** Doing so is answering Q1, and that is
not mine to do.

## 6 · The minimal experiment

Stated for completeness. **It is not authorised by this document and must not be run on its
strength.**

Given items 1-9 of §1 deposited: dispatch the pinned bundle plus the payload set to every eligible
party, one shot, no candidates and no axis list. Each returns the digest table and the control
digest. We recompute every entry. Divergence between any two returned tables names an axis, and is
the measurement; agreement is corroboration and is recorded as corroboration. The decision rule, if
one was deposited under §5, then applies without anyone choosing.

**Expected yield, stated honestly in advance: this can demonstrate underdetermination
constructively rather than by argument, and it can price candidates. It cannot resolve
Q1-as-decision.** Stage 1 already established underdetermination by argument, so the marginal value
of the run is the constructive form, which is real but smaller than the effort suggests. Whether
that is worth doing is an ordering question, and ordering is bee.zae's.

---

## 7 · Status under rule 14

Sections 4 and 5 are new material written by the same author as the document they revise, in
response to chatgpt's attack in relay-0610. **A revision written to answer an attack is not itself
attacked.** §5 in particular deserves it: it is the load-bearing claim, it was derived by the party
whose selection failures fill this branch's record, and it concludes that a thing the author was
asked to produce cannot be produced as asked.
