# READINGS — attack on the wording of `DRAFT.md`

Scope: `DRAFT.md` and `CONTRACT.md` only. Nothing outside this directory was read.

15 findings: **5 against single sentences**, **10 against compositions**. Each gives the
verbatim text, two rules an implementer could write from it, an observation that
separates them, and what (if anything) in the draft settles it.

Sentences not listed here I take to be unambiguous, or ambiguous only in ways no
observation can separate. Two near-misses are recorded at the end for that reason.

---

# Part A — single sentences

## A1. `extent` is load-bearing and never defined

> **Candidate.** An octet sequence offered to a store as a record, together with its
> extent. A candidate has an extent because it was delivered as one — extent is a property
> of the offer, never derived from the octets.

The definition list fixes *candidate*, *record*, *bound-content*, *content identity*,
*record identity*, *header block*, *declared id*, *binding*, *read*, *refuse*. It does not
fix *extent*, and extent is constitutive of both `Candidate` and `Binding` and carries a
MUST in 9.1.

- **Reading 1 (extent is a count).** Extent is a non-negative integer number of octets,
  supplied by the offer. An offer that carries no such number is not a candidate: there is
  nothing to bind and nothing to record under 9.1.
- **Reading 2 (extent is a delimitation).** Extent is whatever fact about the offer fixes
  where the octet sequence ends — a length header, a terminator, a closed stream. Every
  completed delivery has one, so every completed delivery is a candidate.

**Observable.** Offer the same 40 octets over a transport that carries no declared length
and ends the sequence by closing the connection. Reading 1: no extent was delivered, so no
candidate exists — the store binds nothing and (under A2) may or may not answer at all.
Reading 2: the extent is the close, the store binds and records extent 40. Bound vs. not
bound, for byte-identical input.

**Settled?** No. `Read` calls "an extent" a piece of "a store's own metadata", which fits
Reading 1's integer; the `Candidate` definition calls extent "a property of the offer",
which fits either. Nothing reconciles them.

## A2. 9.2's refusal: statement of fact or obligation to answer?

> A candidate that does not is refused.

Compare the imperative form used one clause earlier in 9.1 — "MUST refuse the candidate at
admission rather than bind it" — and the definition:

> **Refuse.** To decline, with an indication the offering party can distinguish from
> acceptance. Silence is not refusal.

- **Reading 1 (declarative).** "Is refused" states the candidate's standing: it is not
  admitted, and no record comes into existence. The store discharges the rule by not
  binding. The `Refuse` definition then tells you what *counts* as a refusal if the store
  chooses to send one, not that it must.
- **Reading 2 (imperative).** "Is refused" imposes 9.1's obligation in the passive voice.
  The store MUST emit an indication distinguishable from acceptance, because the definition
  says silence is not refusal.

**Observable.** Offer a candidate beginning `@p-e/x1`. The store discards it and answers
nothing at all. Reading 1: compliant. Reading 2: violation — the offering party cannot
distinguish this from a lost message or from a slow acceptance. Directly observable at the
offering party: a distinguishable rejection vs. no response.

**Settled?** No. The draft supplies the definition of *refuse* but never says which
sentences in 9.2 carry its force, and 9.1's explicit `MUST refuse` makes the contrast in
9.2 legible as deliberate in both directions.

## A3. 9.1's "its own stored form" — ambiguous antecedent, and self-defeating on one reading

> **9.1 Extent.** Bound-content is the candidate's octets in full. **A store MUST NOT
> derive extent from the content of a candidate**, and MUST record the extent at binding.
> A store that cannot recover a record's extent from its own stored form MUST refuse the
> candidate at admission rather than bind it.

"its own" has two available antecedents in its own sentence: *a store* and *a record*.

- **Reading 1 (the store's stored form).** The test is over everything the store persists,
  including the metadata it composed at receipt. A store that writes the octets to a blob
  and the extent to a metadata row can always recover the extent, so this clause refuses
  nothing and is a design constraint on storage engines that lose lengths.
- **Reading 2 (the record's stored form).** The test is over the stored octets of the
  record. Recovering extent from those octets is exactly "deriv[ing] extent from the
  content", which the same sentence forbids. No compliant store can satisfy the test, so
  every candidate must be refused.

**Observable.** Offer any well-formed candidate to a store that keeps octets in one place
and extent in a sidecar row. Reading 1: bound, and readable. Reading 2: refused, and the
store is permanently empty. Same input, opposite acceptance decision.

**Settled?** No. `Bound-content` and the MUST 9 invariant separate the store's metadata
from the octets ("The store's metadata is outside it"), which supports Reading 2's narrow
sense of "stored form"; 9.1's own requirement to "record the extent at binding" presupposes
somewhere to record it, which supports Reading 1. Neither sentence names the antecedent.

## A4. "a store's deduplication MUST NOT be switched off for them" — assurance or obligation?

> A record whose bound-content contains a declared id has a content identity that varies
> with that id. Content deduplication and the `duplicate content` case therefore find no
> match across identities for such records; this is a consequence of the digest domain,
> **not a prohibition** — a store's deduplication MUST NOT be switched off for them.

*Deduplication* and *the `duplicate content` case* are load-bearing here and are not in the
definition list. The sentence is the only MUST NOT in the amendment.

- **Reading 1 (vacuous assurance).** Deduplication means matching on content identity. For
  records with a declared id it structurally never matches. The MUST NOT forbids only the
  bookkeeping step of marking such records exempt; behaviour is identical either way.
- **Reading 2 (positive obligation).** The store must keep running its duplicate-detection
  path for such records rather than short-circuiting it. Since content identity provably
  never matches, a store discharging this reading meaningfully must key on something else —
  bound-content with the `id` field excluded, for instance — and then report
  `duplicate content` for two records that differ only in their declared id.

**Observable.** Offer record X, then record X' identical to X except for its `id` header
field. Reading 1: two independent records, no `duplicate content`. Reading 2 as
implemented meaningfully: the second offer draws the `duplicate content` case. Different
acceptance response for the same pair of inputs.

**Settled?** Partly, and against Reading 2's mechanism but not against its obligation.
"**Content identity.** `sha256(bound-content)`. Nothing wider is meant by the term" forbids
redefining *content identity* to skip the id field, but deduplication is nowhere required to
key on content identity, so Reading 2 survives by keying on something the draft never names.

## A5. "derive" in the amendment — a fact about construction or a fact about the pair?

> record identity MUST NOT derive from content identity — an identity is allocated, never
> computed from bound-content

> This is a requirement on the allocator. **A store cannot observe it**: given an
> identity, nothing in the record shows how it was chosen.

- **Reading 1 (construction).** The prohibition is on the procedure. An allocator that
  draws from a counter complies, whatever value it produces. The "cannot observe" sentence
  is then true, and no run-time check is required.
- **Reading 2 (relation).** The prohibition is on the resulting pair. An allocation whose
  output equals the content identity *has* derived from it as far as any reader can tell,
  so the allocator must check and re-allocate on collision.

**Observable.** Construct a candidate whose content identity, rendered in the store's
identity space, equals the next value that store's counter would issue. Reading 1: the
record is bound under that identity. Reading 2: the store skips it and binds under the
following value. Different persisted record identity for the same input, visible in any
listing.

**Settled?** No — and the settling sentence is the one at issue. "A store cannot observe
it" is only true under Reading 1; under Reading 2 the coincidence case is exactly what a
store observes. The sentence asserts the conclusion of the reading it is meant to select.

---

# Part B — compositions

## B1. Offered extent vs. delivered octets: three compliant implementations

> extent is a property of the offer, never derived from the octets

> **9.1 Extent.** Bound-content is the candidate's octets in full. **A store MUST NOT
> derive extent from the content of a candidate**, and MUST record the extent at binding.

> **9.3 Fidelity.** A store MUST store bound-content octet for octet as it arrived. It
> MUST NOT trim, pad, append to, re-encode, or otherwise normalise it.

Each clause is clean alone. Composed on the write path, they do not settle the case where
the offer declares an extent of N and the delivery carries M ≠ N octets — a case the
`Candidate` definition makes possible by insisting extent is independent of the octets.

- **Reading 1 (offer authoritative).** Extent is the offer's, so bound-content is the first
  N octets. Rejected by 9.3 when M > N — taking N of M octets is trimming — so this reading
  collapses into refusal for M > N and is unavailable for M < N.
- **Reading 2 (delivery authoritative).** "Bound-content is the candidate's octets in full"
  governs: bind all M, and record M as the extent. This is deriving extent from the octets,
  which the preceding sentence forbids in terms.
- **Reading 3 (refuse).** Neither can be honoured, so the candidate is not admissible.
  9.2 lists no such ground for refusal, and 9.1's only refusal ground is about the store's
  own stored form, not about the candidate.

**Observable.** Offer a candidate declaring extent 8 and delivering the 12 octets
`@p-e/x0abcd`. Reading 1: bound with content identity `sha256` of 8 octets, extent 8.
Reading 2: bound with content identity of 12 octets, extent 12. Reading 3: refused. Three
distinct outcomes — different digests, different extents, different acceptance decisions —
and any peer holding the same offer can tell which store it is talking to.

**Settled?** No. "Bound-content is the candidate's octets in full" excludes Reading 1 for
the M > N case only; it does not say what the recorded extent then is, and the sentence
immediately after forbids the obvious answer.

## B2. "admission (9.2) is tested before verification (10.1)" — admission of *what*, on a read?

> **10.4 Order.** On a read, admission (9.2) is tested before verification (10.1). Where
> both would fail, the admission failure is what the store reports.

> **9.2 Admission.** A candidate MUST begin with the octets `@p-e/x0`. [...] Admission is
> tested on the candidate as delivered, before any framing a store may add.

> **Record.** A candidate a store has admitted.

9.2 is a test on a *candidate*; on a read there is no candidate — the candidate became a
record at admission and the offering party is gone.

- **Reading 1 (re-test).** On every read, re-run 9.2's two tests — the `@p-e/x0` prefix
  and Unicode 15.0 Table 3-7 well-formedness — against the stored bound-content, before
  comparing digests.
- **Reading 2 (recall).** Admission is a historical fact recorded at binding. "Testing" it
  on a read means consulting that fact, which is always true for anything the store holds,
  so 10.4 orders a test that can never fail and only 10.1 can ever fire.

**Observable.** Take a record whose stored octets have been corrupted in place — say a
final continuation byte flipped so the tail is a truncated UTF-8 sequence — while the
recorded content identity still names the original octets. Reading 1: the store reports an
admission failure and never reaches verification, so 10.3's open verdict is never engaged.
Reading 2: admission passes, verification fails, and the outcome falls into 10.3 — where
the draft defines nothing, so the store may return the corrupt octets. Corrupt bytes
returned vs. an admission failure, for the same read of the same record.

**Settled?** No, and the draft argues both ways. 9.2's closing sentence ("on the candidate
as delivered") makes Reading 1 hard to state coherently at read time; but 10.4's "Where
both would fail" presupposes admission *can* fail on a read, which is only true under
Reading 1. Note also that `Refuse` is defined in terms of "the offering party", so under
Reading 1 the draft has no vocabulary for the outcome it requires.

## B3. Legacy records and the prefix test — B2 Reading 1 makes them unreadable

> **10.5 Records bound before 10.1.** A store MUST distinguish records bound with a
> recorded content identity from records bound without one, and MUST NOT report the latter
> as verified. [...] 10.1's verification obligation does not extend to them.

Composed with 10.4 under B2's Reading 1. 10.5 grants these records exactly one exemption,
from 10.1. It says nothing about 9.2, and records bound before this document existed were
not bound under 9.2's prefix rule.

- **Reading 1 (10.4 applies to all reads).** Every read tests admission, including reads of
  pre-10.1 records. A legacy record not beginning `@p-e/x0` fails admission on every read
  and is permanently unreadable, though it remains bound and listable.
- **Reading 2 (10.4 is scoped to the reads 10.1 governs).** 10.4 exists to order two tests
  against each other; where 10.1 does not apply there is nothing to order, so the sentence
  does not reach legacy reads and they proceed.

**Observable.** Read a pre-10.1 record whose first octets are `record:` rather than
`@p-e/x0`. Reading 1: admission failure, no octets returned. Reading 2: octets returned,
labelled not-verified per 10.5. A whole class of stored records readable or not.

**Settled?** No. 10.5's exemption is explicitly and only from "10.1's verification
obligation"; naming that one clause is evidence the other clauses were meant to apply,
which is Reading 1 — but nothing states it.

## B4. "its binding is void" cancels the obligation that would catch the violation

> **9.3 Fidelity.** [...] A store that does holds something that is not the record it
> received; its binding is void, and the violation is detectable only by a party holding
> the octets it sent.

> **Binding.** The association, completed at a single moment, of a record identity with a
> bound-content, its content identity, and its extent. A record is *bound* from that moment.

> **10.1** A store MUST record the content identity at the moment of binding, and MUST
> verify it against bound-content on every read of a record bound under this clause.

- **Reading 1 (void means unbound).** A normalising store's record ceases to be bound.
  10.1's obligation runs on "a record bound under this clause", so it lapses precisely for
  the tampered records. 10.5's distinguish-and-label duty does not cover them either: it
  separates records "bound with a recorded content identity" from records "bound without
  one", and this record is in neither class. The record still exists — `Record` is "A
  candidate a store has admitted", and admission did happen — and no clause governs reads
  of it.
- **Reading 2 (void is a verdict, not a state change).** "Void" marks the binding as
  invalid without withdrawing it; obligations attached to bound records continue, so 10.1
  still requires verification, which now fails and lands in 10.3.

**Observable.** A store appends a trailing `0x0A` to a stored record, then serves a read.
Reading 1: no verification is performed, no not-verified label is owed, the padded octets
are returned as an ordinary read. Reading 2: verification runs, mismatches, and the store
is in 10.3's undefined verdict — where 10.3's second paragraph then binds it to any other
MUST touching that read. Silent success vs. a mismatch path.

**Settled?** No. The `Binding` definition makes boundness a state ("A record is *bound*
from that moment"), which supports Reading 1's reading of "void"; nothing says the state
survives voiding.

Related, and unresolved by either reading: 9.3 asserts the violation "is detectable only by
a party holding the octets it sent", while 10.1 requires the store itself to compare the
recorded content identity against bound-content on every read. Under Reading 2 the store
detects its own violation on the next read, so the sentence's factual claim holds only for
a store that normalises *before* the content identity is recorded at binding — an ordering
the draft never fixes.

## B5. "a record bound under this clause" — the record bound after 10.1 with no recorded digest

> **10.1** A store MUST record the content identity at the moment of binding, and MUST
> verify it against bound-content on every read of a record bound under this clause. A
> digest recomputed with no recorded value to compare against is not evidence of anything.

> **10.5 Records bound before 10.1.** A store MUST distinguish records bound with a
> recorded content identity from records bound without one [...]

Binding is defined in the definition list and performed under 9.1; 10.1 is not a binding
clause, so "bound under this clause" has to be construed.

- **Reading 1 (bound *with a recorded content identity*).** A record bound after adoption
  by a store that failed to record a digest was not bound under this clause. No
  verification is owed on reads of it; 10.5's class is defined by the same property, so it
  must not be reported as verified, and that is the whole read-path consequence.
- **Reading 2 (bound *while this document is in force*).** The record is bound under the
  clause regardless of the store's failure. Verification is owed on every read, has nothing
  to compare against, and 10.1's second sentence says the recomputation "is not evidence of
  anything" without saying what the store does with a read it cannot discharge.

**Observable.** Read a record bound last week by a store that never wrote a digest.
Reading 1: octets returned, marked not-verified, no error. Reading 2: an obligation the
store cannot discharge — implementations will split between returning the octets unmarked
and failing the read. Returned-and-labelled vs. failed.

**Settled?** No. 10.5's heading ("Records bound before 10.1") scopes it by *time*, not by
whether a digest exists, while its body scopes it by whether a digest exists. The two
scopings pick out different records exactly in this case, and 10.1 defers to whichever one
"bound under this clause" means.

## B6. Admitted but not yet bound

> **Record.** A candidate a store has admitted.

> **Binding.** The association, completed at a single moment, of a record identity with a
> bound-content, its content identity, and its extent.

> A store that cannot recover a record's extent from its own stored form MUST refuse the
> candidate at admission rather than bind it.

The last sentence separates admission from binding — it contemplates admitting-or-refusing
as a step distinct from binding.

- **Reading 1 (one moment).** Admission and binding are the same event; the window is
  empty; every record a store holds is bound.
- **Reading 2 (two moments).** A candidate becomes a record at admission and acquires a
  binding later. Between the two, the store holds a *record* with no record identity, no
  recorded content identity and no recorded extent.

**Observable.** Offer a candidate to a store that admits on receipt and binds
asynchronously, then list and read immediately. Reading 1: nothing exists until binding
completes; the read is a not-found. Reading 2: a record exists and can be read — and it
falls outside 10.5, which covers records "bound without" a digest, not records that are not
bound at all, so nothing forbids reporting it as verified. Not-found vs. an unbound record
that no clause labels.

**Settled?** No. The draft uses "at admission" and "at binding" as different times in 9.1
and 10.1 without ever saying whether one entails the other.

## B7. `Candidate` and `Record` define each other, and the circle decides whether replication is tested

> **Candidate.** An octet sequence offered to a store as a record, together with its
> extent.

> **Record.** A candidate a store has admitted.

A candidate is defined through *record*; a record is defined through *candidate*. The
circle is short and closes in one step. What it fails to fix is which transfers count as
being "offered to a store as a record".

- **Reading 1 (any offer).** "As a record" is descriptive. Any octet sequence handed to a
  store for storage is a candidate, so 9.2's admission tests run on every intake path,
  including replication and mirroring from a peer store.
- **Reading 2 (offer-mode matters).** Only an offer made in the record-offering mode is a
  candidate. A record copied from a peer arrives as an already-admitted record, not as a
  candidate, so 9.2 never runs on it.

**Observable.** Store A holds a legacy record whose octets are not valid UTF-8; store B
replicates it. Reading 1: B refuses — the transfer is a candidate and fails 9.2. Reading 2:
B binds it, and now holds a record that could never have been offered to it directly.
Present vs. absent in B, and detectably so by listing B.

**Settled?** No. Nothing in the draft names replication, copying, or any intake path other
than offer-and-admit, and `Record identity` ("allocated by the store") is satisfied by both
readings.

## B8. Framing and the definition of `Read`: a store can frame its way out of 10.1

> Admission is tested on the candidate as delivered, before any framing a store may add.

> **Bound-content.** The octet sequence of a record: every octet of the candidate that was
> admitted, in order, and nothing else.

> **Read.** An operation that returns bound-content or any part of it. An operation that
> returns only a store's own metadata — a listing, an extent, a recorded digest — is not a
> read.

> **10.1** [...] MUST verify it against bound-content on every read of a record bound under
> this clause.

That framing sits outside bound-content is settled — by "and nothing else" in the
`Bound-content` definition, and by 9.2 acknowledging framing as something distinct from the
candidate. What is not settled is the status of an operation that returns the framed form.

- **Reading 1 (superset is still a read).** An operation that hands back the framed octets
  returns bound-content — plus more. It is a read; 10.1's verification fires.
- **Reading 2 (a read returns bound-content or a part, nothing wider).** The definition
  enumerates two shapes: the whole, or a part. Framed octets are neither. Such an operation
  is not a read; it is also not "only a store's own metadata", so it is in neither category
  the definition names — and 10.1, which is keyed to "every read", never fires for it.

**Observable.** A store whose only retrieval interface returns `<4-octet length><octets>`.
Reading 1: every retrieval verifies the recorded content identity, and a corrupted record
is caught. Reading 2: no verification ever runs on that store, because it performs no
reads; a corrupted record is served indefinitely. Detectable by a client holding the
original octets: one store's retrievals start failing or reporting, the other's never do.

**Settled?** No for the operation's status; yes for the digest, which the `Bound-content`
definition and "Content identity is computed over octets" hold to the unframed octets in
both readings.

## B9. 10.3's declared gap and 10.4 — does the ordering rule narrow the gap? (§5)

> **10.3** **OPEN.** The verdict when the recorded and recomputed content identities
> disagree is not defined by this document.
>
> An open verdict is not a permission. Where another clause states a MUST that applies to
> the same read, that clause governs, and no behaviour is admissible under 10.3 that
> another MUST forbids.

> **10.4 Order.** [...] Where both would fail, the admission failure is what the store
> reports.

The gap itself is declared and is not a finding. Whether 10.4 narrows it is.

- **Reading 1 (10.4 fixes only the label).** 10.4 governs *what the store reports*, not
  what it does. Even where admission fails, whether the octets are returned falls back to
  10.3, which defines nothing — so returning the corrupt octets alongside an
  admission-failure report is admissible.
- **Reading 2 (10.4 imports 9.2's refusal).** Reporting an admission failure means the read
  is refused, because 9.2 says a candidate failing those tests "is refused". The gap is
  narrowed: content must be withheld.

**Observable.** Read a record that both fails UTF-8 well-formedness and mismatches its
recorded digest. Reading 1: HTTP-200-shaped answer carrying the octets and an
admission-failure indication. Reading 2: an error carrying no octets. Whether the caller
receives the bytes.

**Settled?** Reading 2 depends on 9.2 counting as "another clause [that] states a MUST that
applies to the same read". 9.2's only MUST is addressed to the candidate ("A candidate MUST
begin with the octets `@p-e/x0`"), not to the store, and the refusal is stated passively —
so on the face of 10.3's own test, Reading 1 survives and Reading 2 does not. The draft
comes closest to settling here, and settles it in the direction that leaves corrupt octets
returnable.

## B10. `Header block` re-imports a term it says it is not depending on — and its only path to observability runs through A4

> **Header block.** The octets of bound-content above its first blank line. This is the
> scope the existing specification already gives the term (line 318, "the bytes above the
> first blank line"); it is restated here so this document does not depend on a term it
> never fixes.

> **Declared id.** An `id` field appearing in a record's header block.

The restatement is offered as making this document self-sufficient. It turns on *blank
line* and on *field*, neither of which the definition list fixes, and it does not say what
the header block is when bound-content contains no blank line.

- **Reading 1 (no blank line ⇒ the whole of bound-content is the header block).** "Above
  its first blank line" degenerates to "all of it" when there is none, so an `id` field
  anywhere in such a record is a declared id.
- **Reading 2 (no blank line ⇒ no header block).** The scope is undefined and therefore
  empty; such a record has no declared id however its octets read.

Independently: whether `\r\n\r\n` delimits, and whether a line of spaces is blank, changes
where the block ends for records that do contain one.

**Observable — and conditional.** Within this document, *declared id* is load-bearing in
exactly one place: the amendment's "a store's deduplication MUST NOT be switched off for
them". Under A4's Reading 1 that sentence has no behavioural content, so the two readings
here cannot be told apart by any observation the draft permits, and by §4 this would not be
a finding. Under A4's Reading 2 it does: offer two records with no blank line, identical
but for an `id:` line. Reading 1 classifies them as declared-id records, so the store owes
them a running duplicate-detection path and reports `duplicate content` on the second;
Reading 2 classifies them as ordinary records with no such obligation. So the header-block
ambiguity is observable if and only if A4 resolves the second way — and the draft resolves
neither.

**Settled?** No, in either layer. The one sentence that could have settled the degenerate
case is the sentence claiming the definition needs no outside support.

---

# Near-misses, recorded so they are not mistaken for omissions

- **"every octet of the candidate that was admitted"** (`Bound-content`) can be read as
  admitting partial admission — some octets admitted, others not. The draft excludes it:
  9.1's "Bound-content is the candidate's octets in full", and 9.2's whole-candidate
  disposition ("A candidate that does not is refused"). No observation separates the
  readings once those sentences are in force.
- **Order of the two tests inside 9.2** (prefix before UTF-8 well-formedness, or the
  reverse) is unfixed, but the draft never requires a store to say *which* admission test
  failed — 10.4 requires only that "the admission failure is what the store reports". Two
  implementations differ only in an error string the draft does not mandate, so nothing
  observable turns on it under this document.
