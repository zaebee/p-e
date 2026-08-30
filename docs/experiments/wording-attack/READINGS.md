# READINGS — ambiguity attack on `DRAFT.md`

Scope: `DRAFT.md` only, as instructed by `CONTRACT.md`. Fifteen ambiguities are reported:
findings 1-10 attack single sentences, findings 11-15 attack combinations of clauses that are
each locally unambiguous but that compose into different observable behaviour. Each gives two
internally coherent readings and an observation that separates them. Sentences not listed here I
found unambiguous, and I say nothing about them.

---

## 1. Is the deduplication sentence a rule or an observation?

> "Consequently `sha256(bytes)` is stable across ids only for records that declare no envelope `id:`; content deduplication and the `duplicate content` case apply to those records alone."

**Reading 1 (normative).** A store MUST NOT apply content deduplication, and MUST NOT
report `duplicate content`, for any record that declares an envelope `id:`, regardless of
whether the octets match something already stored. Deduplication is switched off for that
class of record.

**Reading 2 (descriptive).** The sentence states a consequence of the preceding rule: since
the digest of an id-bearing record covers its id, matches will not normally arise across
distinct ids. The store's dedup path is unchanged; it simply finds nothing to match. A
match, if one does occur, is handled like any other.

**Observable difference.** Submit one record that declares an envelope `id:`, then submit
the byte-identical octets again (same declared id — nothing in the draft forbids a repeated
submission, and 9.2 forbids the store from altering the octets, so the two digests are
equal). Reading 1: the second submission MUST NOT be answered `duplicate content` — the
store accepts it, or refuses it on some other ground. Reading 2: the store answers
`duplicate content`. A client sees two different responses to the same input.

**Settled by the rest of the draft?** No. "Consequently" signals derivation, which favours
Reading 2, but "apply to those records alone" is exclusionary phrasing of the kind used for
rules. No other sentence in the draft mentions deduplication.

---

## 2. Is "the record's own declared id" the record's identity, or only content that names one?

> "record identity MUST NOT derive from content identity — an id is allocated, never computed from bytes — while the digested content MAY contain the record's own declared id."

The sentence uses "an id is allocated" (passive, allocator unnamed) and "the record's own
declared id" (declared by the submitter, since the store may not alter the octets under 9.2).

**Reading 1 (the declared id *is* the identity).** The submitter allocates the id and
declares it in the envelope; the store adopts that value as the record's identity. The MUST
NOT constrains how the submitter chose it — not computed from the bytes.

**Reading 2 (the store allocates; the declared id is just content).** The store allocates
record identity itself and keeps it in its own metadata, which the preamble places "outside"
the digested bytes. Any `id:` inside the record is content the digest happens to cover, and
need not equal the record's identity.

**Observable difference.** Submit a record declaring `id: X`. Reading 1: the store reports
the record's identity as `X`, and a later fetch by identity `X` returns it. Reading 2: the
store reports its own allocated identity `Y`; a fetch by `X` finds nothing, and identity `Y`
disagrees with the record's own declared id. Both stores hold the same octets and the same
digest, so the difference is visible only in the identity they report — but it is visible.

**Settled by the rest of the draft?** No. The draft never says who allocates. The MUST 9
preamble says the store "composes metadata of its own about the receipt", which is
compatible with either — identity may or may not be part of that metadata.

---

## 3. What counts as "declar[ing] no envelope `id:`"?

> "Consequently `sha256(bytes)` is stable across ids only for records that declare no envelope `id:`; content deduplication and the `duplicate content` case apply to those records alone."

"Envelope" is used once and never defined; neither is what constitutes a declaration.

**Reading 1 (syntactic presence).** A record declares an envelope `id:` iff the key `id`
appears in the envelope, whatever its value. `id:` with an empty or null value counts as
declaring; such records are outside deduplication.

**Reading 2 (an id is actually carried).** A record declares an envelope `id:` iff it
carries an id value. `id:` present but empty or null declares no id; such records are inside
deduplication.

**Observable difference.** Submit two records with identical octets, each containing an
envelope `id:` with an empty value. Reading 1: no dedup, two records (or a non-dedup
refusal). Reading 2: the second is answered `duplicate content`.

A second, independent split on the same phrase: a record carrying an `id:` field *somewhere
other than the envelope* (a nested body, say) is dedup-eligible under a narrow reading of
"envelope" and ineligible under a wide one where "envelope" means the record's declarative
region generally. Same observation: identical bodies, one store dedups and one does not.

**Settled by the rest of the draft?** No. The draft never fixes the envelope's boundary, and
9.1 fixes only the record's boundary, which is a different question.

---

## 4. Where does a record end?

> "`bytes` begins at the first octet of the record and ends at its last."

The start is pinned by the following sentence (`@p-e/x0`). The end is defined circularly —
"its last" octet — and no sentence says how a store determines which octet that is.

**Reading 1 (the delimiter terminates the record).** Under 9.1's third sentence, a store
that frames as `<record><delimiter><metadata>` finds the end at the octet before the first
occurrence of the delimiter. Extent is recovered from the stored form.

**Reading 2 (extent is carried out of band).** The record's length is known at receipt and
kept in the store's own metadata; the delimiter is presentational and an occurrence of the
delimiter octets *inside* the record does not end it.

**Observable difference.** Receive a record whose own octets contain the store's delimiter
sequence. Both readings record the same digest at write time (the whole record is in hand).
On read, Reading 1 reconstructs a truncated `bytes` and computes a different `sha256`, so the
10.1 verification disagrees; Reading 2 reconstructs the full record and it verifies. Same
input, same store code path, opposite verification results — and under 10.3 the two stores
may then report anything at all.

**Settled by the rest of the draft?** No. 9.1's third sentence establishes that the delimiter
belongs to neither side but not that it is unique within the record; 9.2 forbids the store
from escaping or altering the record's octets, which removes the usual repair and so
sharpens the conflict rather than resolving it.

---

## 5. Does "a candidate" mean the octets as delivered, or the record region after framing is stripped?

> "A record MUST begin with the octets `@p-e/x0`; a candidate with any octet before them is not a record and MUST be refused."

"Candidate" is introduced here and in 9.3 and never defined.

**Reading 1 (post-framing).** The test runs on the region identified as the record after any
store or transport framing is set aside. A store may lay its metadata down first, as
`<metadata><delimiter><record>`, because 9.1's third sentence puts the metadata and the
delimiter outside the record.

**Reading 2 (as delivered).** The test runs on the octet sequence presented to the store. Any
octet at all before `@p-e/x0` — including a store's own leading metadata and delimiter on a
read-back — makes the thing not a record, and it MUST be refused.

**Observable difference.** A store that writes metadata-first. Under Reading 1 its records
read back normally. Under Reading 2 every one of its own stored blobs fails the test on
read-back and MUST be refused — the store cannot serve what it stored. Equivalently, present
a store with `<metadata><delimiter>@p-e/x0…` on write: Reading 1 accepts, Reading 2 refuses.

**Settled by the rest of the draft?** Partly, toward Reading 1. 9.1's third sentence
explicitly contemplates a store separating its metadata from the record by a delimiter and
excludes both from `bytes`, which is incoherent with a rule that would refuse any such
arrangement. Reading 2 survives only for candidates arriving from outside the store.

---

## 6. What is "valid UTF-8"?

> "A candidate that is not valid UTF-8 is not a record: a store MUST refuse it, on read as well as on write, and MUST NOT substitute replacement characters and proceed."

No normative reference is given for the term.

**Reading 1 (strict).** Well-formed UTF-8 in the strict sense: no overlong encodings, no
encoded surrogate code points, no truncated sequences, no values above U+10FFFF. Anything
else is refused.

**Reading 2 (decodable).** Anything a permissive decoder consumes without emitting a
replacement character — which admits overlong forms and encoded surrogates, since a
permissive decoder maps them to real code points rather than to U+FFFD. The clause's stated
concern is replacement characters, and none are produced.

**Observable difference.** Submit a record containing `ED A0 80` (a UTF-8-form encoding of
U+D800) or `C0 AF` (an overlong `/`). Reading 1 refuses it on write, and refuses it on read
if it is already stored. Reading 2 accepts and stores it, digests it, and serves it. Two
conformant stores disagree on acceptance of the same octets — and a record accepted by the
second becomes permanently unreadable if copied into the first, since 9.3 also refuses on
read.

**Settled by the rest of the draft?** No. 9.3's first sentence ("computed over octets, never
over a decoded string") settles how the digest is taken, not which octet sequences qualify.

---

## 7. "The moment of binding" — binding is never defined

> "The digest MUST be recorded at the moment of binding and verified against the record on every read."

**Reading 1 (binding = receipt).** Binding is the act of taking the record into the store.
The digest is computed and recorded synchronously with the write; no stored record ever lacks
a recorded digest except the pre-adoption ones of 10.4.

**Reading 2 (binding = a distinct act).** Binding is the association of a record with its
identity — a separate step, given MUST 3's "an id is allocated". A store may receive and
persist a record, then bind it later; the digest is recorded at that later moment.

**Observable difference.** Write a record to a store whose identity allocation is
asynchronous, then read it back immediately. Reading 1: the read is verified against a
recorded digest. Reading 2: there is no recorded digest yet, and by 10.1's second sentence a
recomputation "is not evidence of anything" — so the read reports unverified, or the record is
not yet visible at all. The client sees a different verification status for the same record
depending only on when it asked.

**Settled by the rest of the draft?** No. "Binding" appears in 10.1, 10.2 ("the recorded
binding") and 10.4 ("records bound before it did so"), always as a given.

---

## 8. What is a "read"?

> "The digest MUST be recorded at the moment of binding and verified against the record on every read."

**Reading 1 (content reads).** A read is an operation that returns the record's octets.
Verification runs then, and only then.

**Reading 2 (any serving of the record).** A read is any operation that serves the record or
anything about it — including a listing, a metadata query, or serving the recorded digest
itself. Verification runs for every record so touched.

**Observable difference.** Store a record and corrupt it in place (or take the 9.1-extent case
above), then list the store's contents without fetching content. Reading 1: the listing
succeeds and includes the record; the trouble surfaces only on a later content fetch. Reading
2: the listing itself must verify, and reports or fails on that record. A second observation:
a listing of N records costs N digest computations under Reading 2 and none under Reading 1 —
detectable in latency at scale.

**Settled by the rest of the draft?** No. 9.3 also uses "on read" without definition, in a
context where the check is a UTF-8 validation rather than a digest comparison.

---

## 9. Does "cannot acquire one" forbid backfilling?

> "A store adopting 10.1 MUST define what it reports for records bound before it did so. Such records have no recorded digest and cannot acquire one."

**Reading 1 (prohibition).** A store MUST NOT compute a digest for a pre-adoption record and
record it. The stored set of such records is permanently without recorded digests.

**Reading 2 (evidentiary remark).** The sentence states why a backfilled value is worthless,
echoing 10.1's "not evidence of anything": a value computed after the fact is not a *recorded*
digest in 10.1's sense. Storing one is not forbidden; it just does not make the record bound.

**Observable difference.** Adopt 10.1 on a store holding legacy records, then read a legacy
record a year later. Reading 1: it reports, forever, whatever the store defined for
"no recorded digest". Reading 2: the store backfilled at adoption time and reports the record
as verified, indistinguishably from a genuinely bound one. An auditor asking "is this record
verified?" gets opposite answers.

**Settled by the rest of the draft?** Partly, toward Reading 1. 10.1's second
sentence denies evidentiary value to a recomputation with nothing to compare against, and 10.2
denies that verification establishes honesty at recording time. Neither is phrased as a
prohibition on the store's storage behaviour, so Reading 2 remains coherent with them.

---

## 10. May a pre-adoption record be served at all?

> "The digest MUST be recorded at the moment of binding and verified against the record on every read." (10.1)
>
> "A store adopting 10.1 MUST define what it reports for records bound before it did so." (10.4)

**Reading 1 (10.4 is a carve-out).** 10.1's "every read" is scoped to records that have a
recorded digest. Pre-adoption records are read normally, accompanied by whatever disclosure
10.4 obliges the store to define.

**Reading 2 (10.1 is unconditional).** Every read must be verified. A pre-adoption record
cannot satisfy that, so it cannot be read; 10.4's obligation to "define what it reports" is
satisfied by defining a refusal.

**Observable difference.** Read a pre-adoption record. Reading 1: the octets come back, marked
unverified. Reading 2: the read fails. Both stores are conformant, because 10.4 constrains only
that the store *define* something, never what.

**Settled by the rest of the draft?** Not as between the two implementations — 10.4 delegates
the choice. But note what 10.4 does *not* delegate: it says the store must define what it
*reports*, and is silent on whether it may *serve*. That silence is the ambiguity; the reporting
half is settled and the serving half is untouched.

---

# Composed readings

The findings above attack single sentences. The ones below attack combinations: each clause
involved is locally unambiguous, and the ambiguity appears only when an implementer has to
compose them into one write path and one read path. The recurring seam is the boundary
between what MUST hold before a record is bound and what is only checked afterwards.

---

## 11. May a store bind a digest it cannot later reproduce?

Clauses composed:

> "`sha256(bytes)` is computed over the received record alone." (MUST 9 preamble)
> "`bytes` begins at the first octet of the record and ends at its last." (9.1)
> "The digest MUST be recorded at the moment of binding and verified against the record on every read." (10.1)

Each is clean alone. The preamble anchors the computation to the record *as received*. 9.1
defines the extent. 10.1 fixes when the value is recorded and requires a later comparison. No
sentence requires the two sides to be reconciled at write time.

**Composed reading 1 (binding includes reconstruction).** Binding is complete only when the
store has recorded a digest it can reproduce from its own stored form. Before recording, the
store reconstructs `bytes` from what it just wrote, per 9.1, and confirms the recomputation
matches. A record the store cannot reproduce is never bound.

**Composed reading 2 (binding is receipt-side only).** The digest is computed over the received
octets and recorded. Whether the stored form permits the same extent to be recovered is not part
of binding; any divergence surfaces later, as a 10.1 verification disagreement.

**Observable difference.** Submit a record whose own octets contain the store's framing delimiter
(the finding-4 case), or submit to a store that frames metadata-first (the finding-5 case).
Reading 1: the write fails, or the store must change its framing before accepting — the client
learns immediately, at submission. Reading 2: the write is accepted and reported successful; the
first read fails, whose verdict 10.3 leaves undefined, and it may be the *thousandth* read, long
after the submitter has gone. Same input, same octets, and the failure lands in a different
operation, at a different time, with a different party present to see it — and under Reading 2 it
lands in a class of failures the draft declines to characterise at all.

**Settled by the rest of the draft?** No. 10.1 says when the digest is recorded, never what must
be true for recording to be permitted. 9.2's fidelity rule constrains the stored octets but not
the store's ability to delimit them again.

---

## 12. After a refused candidate, what does the store hold?

Clauses composed:

> "a candidate with any octet before them is not a record and MUST be refused." (9.1)
> "a store MUST refuse it, on read as well as on write" (9.3)
> "The digest MUST be recorded at the moment of binding" (10.1)
> "The store MUST store the record octet for octet as it arrived." (9.2)

**Composed reading 1 (validate, then bind).** Record-hood under 9.1 and 9.3 is a precondition of
binding. A candidate that fails either was never a record, so 9.2 never obliged the store to keep
it and 10.1 never obliged it to record a digest. After a refusal, the store holds nothing
attributable to that candidate.

**Composed reading 2 (bind at receipt, refuse at the boundary).** Binding is receipt (10.1);
refusal is what the store *reports*. The checks may run in any order, including after the octets
and their digest have been persisted — a streaming store cannot know a candidate's last octet is
malformed until it has consumed all of them, and 9.2 tells it to store what arrived. After a
refusal, the store may still hold the octets and a recorded digest.

**Observable difference.** Send a candidate that is well-formed for its first megabyte and ends in
an invalid UTF-8 sequence. Both stores answer the write with a refusal. Now ask the store what it
holds: Reading 1's store lists nothing and reports no digest; Reading 2's store may list an entry,
report a byte count, and hold a recorded digest for something it must refuse to serve under 9.3
and must not repair under 9.2. Under finding 8's wider sense of "read", the two stores also return
different listings. A quota or billing counter derived from stored octets differs between them.

**Settled by the rest of the draft?** No, and the composition creates a second gap the draft does
not address: whether a store *may discard* octets it has stored. 9.2 forbids trimming, padding,
re-encoding and normalising, and says nothing about deletion; 9.3 forbids serving; nothing says
which of "keep it forever, unreadable" and "delete it" is conformant.

---

## 13. Does the `@p-e/x0` test run on read — and does that decide whether a corruption has a defined verdict?

Clauses composed:

> "A record MUST begin with the octets `@p-e/x0`; a candidate with any octet before them is not a record and MUST be refused." (9.1)
> "a store MUST refuse it, on read as well as on write" (9.3)
> "verified against the record on every read" (10.1)
> "The verdict when the recorded and recomputed values disagree is **not defined by this draft.**" (10.3)

9.3 states explicitly that its check is two-sided. 9.1 states no side. An implementer must decide
what to make of that asymmetry, and the draft nowhere says.

**Composed reading 1 (record-hood is re-established on read).** 9.3's "on read as well as on
write" states a general principle of the digest domain; the 9.1 prefix test binds equally on read.
A stored blob no longer beginning with `@p-e/x0` is not a record, and the read MUST be refused.

**Composed reading 2 (9.1 is a write-side admission test).** 9.1 governs *candidates* — things
offered to the store. 9.3 says "on read as well as on write" precisely because that extension is
not otherwise implied, and 9.1 does not say it. On read, the only guard is 10.1's verification.

**Observable difference.** Corrupt the first octet of a stored record. Reading 1: the read is
refused, mandatorily, and every conformant store behaves the same way. Reading 2: the corruption
is detected as a digest disagreement, whose verdict 10.3 explicitly does not define — the store
may serve the octets with a warning, may refuse, may return a partial result. The same physical
damage lands under a MUST in one composition and inside an acknowledged hole in the other, so two
conformant stores answer the same read differently and both can point at the text.

Sharper still: corrupt the first octet in a way that *preserves* the recorded digest's subject
under Reading 2's reconstruction — e.g. a store that recovers extent out of band and whose
recomputation therefore covers the same region and disagrees, versus one that fails the prefix test
before ever recomputing. The first reports a digest disagreement; the second reports a refusal and
never computes a digest at all. An observer distinguishes the two by which error arrives.

**Settled by the rest of the draft?** No. The asymmetry between 9.1 and 9.3 is exactly the evidence
each reading uses, in opposite directions: Reading 2 treats 9.3's explicitness as meaningful,
Reading 1 treats it as illustrative.

---

## 14. When two read-time checks both fire, which verdict is reported?

Clauses composed:

> "a store MUST refuse it, on read as well as on write, and MUST NOT substitute replacement characters and proceed." (9.3)
> "verified against the record on every read" (10.1)
> "The verdict when the recorded and recomputed values disagree is **not defined by this draft.**" (10.3)

Neither 9.3 nor 10.1 says when in the read path it runs relative to the other.

**Composed reading 1 (record-hood first).** A read establishes that the stored octets are a record
— 9.3's UTF-8 check — before verifying anything. If that fails, the read is refused under a MUST
and no verification is performed or reported.

**Composed reading 2 (verification is unconditional).** 10.1 says "every read", without exception;
verification runs first, or independently. Its outcome is reported under the store's 10.3-defined
behaviour, and 9.3's refusal is applied to the result.

**Observable difference.** Take a stored record that is both invalid UTF-8 and whose octets have
since been altered, so that both checks fire. Reading 1: a single mandatory refusal on encoding
grounds; the client never learns the digest disagrees, and the store may not even have the
recorded value in hand. Reading 2: a digest disagreement is produced first and handled under the
store's own 10.3 policy — which may be to serve the octets with a warning, in which case 9.3's
"MUST NOT ... proceed" and the store's own policy point opposite ways on the same read. The client
sees `refused: invalid encoding` from one store and a 10.3-flavoured digest verdict, possibly with
content attached, from the other.

**Settled by the rest of the draft?** No. 9.3's clause is absolute in its own terms and 10.1's
"every read" is absolute in its own terms; the draft never orders them, and 10.3 guarantees that
one of the two branches ends somewhere it does not describe.

---

## 15. Must a record's identity exist before its digest is recorded?

Clauses composed:

> "an id is allocated, never computed from bytes — while the digested content MAY contain the record's own declared id" (MUST 3 amendment)
> "The digest MUST be recorded at the moment of binding" (10.1)

Locally, the amendment fixes a direction of derivation and 10.1 fixes a moment. Composed, they
constrain an ordering the draft never states.

**Composed reading 1 (allocate, then compose, then bind).** For a record's declared id to be its
identity, the id must exist before the octets are finalised, because 9.2 forbids the store from
writing it in afterwards. Allocation therefore precedes composition, which precedes receipt, which
precedes binding. A store implementing this exposes allocation as its own step and treats a
declared id it never allocated as not being an identity.

**Composed reading 2 (compose, submit, then allocate at binding).** Identity is allocated by the
store at binding, after the octets exist. The declared id in the content is therefore never the
identity — it is content that names something else. The digest and the identity are recorded at
the same moment and have no dependency on each other.

**Observable difference.** Submit a record declaring `id: X`, where `X` was never allocated by this
store. Reading 1: the store's identity for that record is `X` — a fetch by `X` returns it — or the
write is refused because `X` is not an id this store allocated. Reading 2: the store reports an
allocated identity `Y`; a fetch by `X` returns nothing, and the record's own content contradicts
the identity under which it is held. Both stores hold identical octets and identical digests, and
`sha256(bytes)` is not "stable across ids" for either, so the MUST 3 dedup clause cannot separate
them; only the identity lookup does.

**Settled by the rest of the draft?** No. This is finding 2 reached from the timing side rather
than the wording side, and the two approaches agree that the draft leaves the allocator, and now
also the ordering, unstated.

## Terms doing load-bearing work that the draft never fixes

- **"envelope"** (MUST 3 amendment) — dedup eligibility turns on it. Finding 3.
- **"binding" / "bound"** (10.1, 10.2, 10.4) — the moment the digest must be recorded, and the
  dividing line for 10.4's legacy class. Finding 7.
- **"candidate"** (9.1, 9.3) — the thing that is tested and refused. Finding 5.
- **"read"** (9.3, 10.1) — the trigger for two different mandatory checks. Finding 8.
- **"content identity"** (MUST 3 amendment) — the amendment forbids deriving record identity
  from it. If it means `sha256(bytes)` the rule is testable in principle; if it means something
  wider, nothing in the draft says what. The draft names it and never returns to it.
- **"valid UTF-8"** (9.3) — no normative reference. Finding 6.
- **"refuse"** (9.1, 9.3) — the only stated consequence anywhere in the draft, and its form is
  unspecified. A store that drops the candidate silently and one that returns a typed error are
  both "refusing"; an observer distinguishes them immediately.
- **"the `duplicate content` case"** (MUST 3 amendment) — referenced in backticks as an existing
  named case. It is not defined in this draft. It may well be defined in the protocol, which I
  was instructed not to consult; I record only that the draft does not carry it.
- **"digest domain"** (MUST 9 heading, 10.2) — 10.2 makes verification's meaning relative to it,
  and the draft supplies its content by example (9.1–9.3) rather than by definition.

## Terms used in more than one sense

- **`id`.** Sense (a), MUST 3's "record identity", which is "allocated". Sense (b), the envelope
  `id:` that a record "declare[s]" and that the digest covers. The amendment moves between them
  in a single sentence, and never says whether the two must be equal. This is the substance of
  finding 2.
- **"record".** In MUST 9's preamble and 9.2 it is the thing that "arrived" — a wire object. In
  9.1's extent rule and in 10.1's "verified against the record" it is the thing the store holds
  and reconstructs. Findings 4 and 5 live in the gap between those two.
- **"metadata".** MUST 9's preamble scopes it to metadata "about the receipt". 9.1's delimiter
  sentence and 10.1's recorded digest imply store metadata generally. Whether identity (finding
  2) or the recorded digest belong to the "about the receipt" class is not stated.

## Rules that state no consequence for violation

- 9.2 in full ("The store MUST store the record octet for octet as it arrived. It MUST NOT trim,
  pad, append to, re-encode, or otherwise normalise it."). Nothing says what a store that
  normalises produces, what a client observes, or whether the resulting object is still a record.
  Contrast 9.1 and 9.3, which do say "MUST be refused" / "MUST refuse".
- The amendment's "record identity MUST NOT derive from content identity". No verdict, and no
  statement of who is bound — see finding 2 on the unnamed allocator. A store cannot in general
  detect that a submitted id was computed from bytes, so it is unclear whether this is a
  conformance requirement with an observable test at all.
- 9.1's first clause, "A record MUST begin with the octets `@p-e/x0`", where the octets are absent
  entirely. Refusal is stated only for the narrower case of a candidate with *something before*
  them. A candidate that simply lacks the magic falls under a MUST whose consequence the draft
  states nowhere, while 10.3 shows the draft marking an undefined verdict explicitly elsewhere.
  What that contrast amounts to, the text does not say.
- 10.4's "MUST define what it reports". The obligation is to have a definition; no constraint is
  placed on its content, and no consequence is stated for a store that has none. See finding 10.
- Composed: nothing states what may become of octets the store holds but must refuse to serve —
  the case finding 12 produces. 9.2 forbids altering them, 9.3 forbids serving them, and no
  sentence says whether the store may delete them or must retain them indefinitely.
- Composed: 9.2's fidelity rule and 10.1's verification are two guards over the same property —
  that the stored octets are the received octets. One has no stated consequence, the other has an
  explicitly undefined one (10.3). Which of the two a store reports when the property fails is not
  fixed by the draft; see findings 11 and 13.

## Requirements that cannot be satisfied together

One, and the draft appears to know it: 10.1 requires verification "on every read", while 10.4
concedes a class of records that "have no recorded digest and cannot acquire one". For that class
the 10.1 obligation is unsatisfiable. 10.4 does not repair the contradiction so much as delegate
it — which is finding 10.

One further pair is jointly unsatisfiable only under a particular composition, so I record it as
conditional rather than flat: under finding 14's Reading 2, a store whose 10.3 policy is to serve
the octets of a record whose digest disagrees will, for a record that is also invalid UTF-8, be
obliged both to proceed (its own 10.3 policy) and not to proceed (9.3's "MUST NOT substitute
replacement characters and proceed"). The draft permits the policy that creates the collision
without saying that 9.3 overrides it.

I found no other pair of requirements that cannot be jointly satisfied. In particular, 9.2's
"MUST NOT ... append to" and 9.1's permission to write a delimiter are compatible: 9.1's third
sentence puts the delimiter outside the record, so writing one is not an append to the record.

## Readings the draft already excludes

Recorded because the exclusion is itself useful.

- *That a store may exclude the record's declared id from the digested bytes*, so as to keep
  `sha256(bytes)` stable across ids for all records. Excluded by 9.1's first sentence — `bytes`
  runs from the record's first octet to its last, with no interior exemption — and by 9.2, which
  forbids the store from removing anything. The amendment's own "the digested content MAY contain
  the record's own declared id" points the same way.
- *That a leading UTF-8 BOM is tolerable because 9.3 is about encoding validity.* Excluded by
  9.1: the BOM octets stand before `@p-e/x0`, so the candidate "is not a record and MUST be
  refused". 9.3 never gets to run.
- *That a failed verification must gate the read.* 10.3 says the verdict on disagreement is not
  defined by the draft, so gating is neither required nor forbidden. Two stores may legitimately
  differ here; this is delegation, not ambiguity, and I do not count it among the ten.

## Not an ambiguity

The MUST 9 preamble's "`sha256(bytes)` is computed over the received record alone" and "the
record is digested exactly as it arrived" read one way only once 9.1 and 9.2 are in hand, and I
could construct no second implementation from them that an observer could tell apart. Likewise
10.2, which is a disclaimer about what verification does not establish and constrains no
behaviour, and 10.3, which withholds a verdict explicitly rather than ambiguously — though 10.3
becomes load-bearing in composition, since findings 11, 13 and 14 all end by routing a failure
either into a MUST or into 10.3's acknowledged hole. The "Standing" section is not normative and I
did not attack it.
