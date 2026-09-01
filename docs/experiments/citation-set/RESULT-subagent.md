# Outcomes the predecessor-reference report must be able to express

## Integrity check

`sha256sum SYSTEM.md CONTRACT.md` matches `PIN.txt` exactly for both files.

```
bb13b2bd28ed4d6b264497ac79535b308e346f66e90782a913a509886eb77051  SYSTEM.md
8c14bc2d05f167700cfa57cbce58eef178a528a42e94f79771588f972be6d10c  CONTRACT.md
```

## Method

**Method as first stated.** Two situations need separate outcomes when a reader is entitled to
conclude different things about the reference from the evidence that reader actually holds; if the
entitled conclusion is the same, one outcome.

**Revision, forced by applying it.** The first version merged two situations that must not merge: a
record that names a predecessor without a digest and does not hold it, and a record that names a
predecessor with a digest and does not hold it. Both entitle exactly the same present-tense
conclusion — "I cannot confirm this link" — so version one collapses them, yet the first can never
be confirmed by any reader and the second is confirmed the moment the predecessor arrives. The
report exists for people "deciding where to look," and those two send a person to different places.

**Method as applied.** Two situations need separate outcomes if they differ either (a) in what a
reader is entitled to conclude from the evidence it holds, or (b) in what would resolve the
remaining uncertainty. A further constraint on the set, not a reason to split: every outcome must be
decidable by a reader from what it holds alone, since a distinction the reader cannot draw cannot be
assigned and would leave the counting programs with an unfillable bucket.

## The evidence a reader has

Everything below is derived from exactly four observations, which is the whole of what the system
gives a reader about one record's reference:

1. presence or absence of the identifier field and of the digest field (four combinations, and the
   system states these are the only permitted variations — either may be absent, and records from
   different tools and times are in the log);
2. for a present identifier, whether the reader holds a record bearing it — and whether that
   identifier is the holding record's own;
3. for a held predecessor and a present digest, whether the predecessor's bytes hash to the digest
   (always computable: the system states the SHA-256 is well defined for any record someone holds,
   so there is no "could not compute" condition to express);
4. for a present digest with no identifier, whether any record the reader holds hashes to it.

## The set

### 1. NO_REFERENCE — record refers to nothing

*Situation:* both fields absent.

*Entitled to conclude:* this record makes no claim about any earlier record. Nothing about it is
pending, and no retrieval will change its state.

*Does not say:* that the record is the first of a chain, or that its author had no predecessor in
mind. A record whose author meant to refer and omitted both fields is byte-identical in this respect
to one that genuinely refers to nothing; the reader cannot tell them apart and this outcome does not
claim to.

*Error:* none. The system states a record that refers to nothing has both fields absent, so this is
the defined shape of a normal record.

### 2. NAMED_HELD_UNCHECKABLE — predecessor named and in hand, no digest to check it against

*Situation:* identifier present (and not the record's own), digest absent, reader holds a record
bearing that identifier.

*Entitled to conclude:* the predecessor is identified and the reader has it. Because identifiers are
unique and never reused and records are never modified, the held record *is* the record the author
named.

*Does not say:* that the reader's copy of the predecessor carries the bytes the author saw. There is
no digest, so no copy of this record will ever support that check — the assurance is by naming only,
permanently.

*Error:* none by anyone. The system states authors are not prevented from leaving either field
absent and that records written by different tools and times are in the log, so the omission breaks
no rule. Intent behind the omission is unavailable: the reader has no channel to the author.

### 3. NAMED_ABSENT_UNCHECKABLE — predecessor named, not held, and unverifiable if obtained

*Situation:* identifier present (not the record's own), digest absent, reader holds no record bearing
that identifier.

*Entitled to conclude:* there is a specific identifier to request. Obtaining it yields the
predecessor's content and nothing more — no check of that content against the author's claim is
possible then or ever.

*Does not say:* that no such record exists. A reader cannot enumerate the records it does not hold,
so absence from this reader is a fact about this reader, not about the log.

*Error:* none. Both the digest omission (permitted) and the reader's gap (the normal condition of a
distributed log) are error-free.

### 4. NAMED_ABSENT_PENDING — predecessor named with a digest, not held

*Situation:* identifier and digest both present, identifier not the record's own, reader holds no
record bearing that identifier.

*Entitled to conclude:* the link is fully checkable and merely unresolved here. There is both a
retrieval key and, once retrieved, a decisive test.

*Does not say:* that the record is absent from the log, nor that the link is sound — the pending test
may yet come out either way. If the reader happens to hold some *other* record whose bytes hash to
this digest, this outcome neither reports nor denies it; that record cannot be the named one, since
identifiers are never reused.

*Error:* none established. The condition is reader-side incompleteness only.

### 5. VERIFIED — predecessor named, held, and digest matches

*Situation:* identifier and digest both present, reader holds a record bearing that identifier, and
its bytes hash to the digest.

*Entitled to conclude:* the reader's copy of the predecessor carries the bytes the author of this
record digested. Both the naming and the content agree.

*Does not say:* anything about the predecessor's own reference, about the truth of either record's
content, or about who the author is. It is a statement about two byte sequences, nothing more.

*Error:* none. This is the fully consistent case.

### 6. CONTRADICTED — predecessor named and held, digest does not match

*Situation:* identifier and digest both present, identifier not the record's own, reader holds a
record bearing that identifier, and its bytes do not hash to the digest.

*Entitled to conclude:* an error exists somewhere, with certainty. The log is append-only and
identifiers are unique and never reused, so the record bearing that identifier has one fixed byte
sequence; two fixed values disagree, and no passage of time or arrival of further records can
reconcile them.

*Does not say:* whose error it is. The candidates are the author of this record (wrote a digest that
never matched), whoever produced or transmitted the reader's copy of the predecessor, and whoever
produced or transmitted the reader's copy of this record. The reader has no channel to the author and
no independent view of its own supply, so it cannot narrow this. The report must be able to state a
definite error with undetermined attribution — collapsing it to any one culprit would be a claim the
reader has no basis for.

*Error:* yes, by someone; author-versus-other undecided. Decided this way because the certainty of
the contradiction and the impossibility of attribution rest on different facts: the first on the
log's immutability and identifier uniqueness, the second on the reader's isolation.

### 7. CONTENT_MATCHED_UNNAMED — digest only, matching bytes in hand

*Situation:* identifier absent, digest present, and the reader holds at least one record whose bytes
hash to that digest.

*Entitled to conclude:* the reader has content that is exactly what the author digested. The
predecessor's *content* is authenticated.

*Does not say:* which record the predecessor is. Uniqueness is stated for identifiers, not for byte
sequences, so more than one record may carry these bytes; the held match may be a different record
from the author's referent, with the same content. The identifier is unrecoverable from what the
reader has.

*Error:* none. Omitting the identifier is permitted by the same clause that permits omitting the
digest.

### 8. CONTENT_UNMATCHED_UNNAMED — digest only, no matching bytes in hand

*Situation:* identifier absent, digest present, no held record hashes to that digest.

*Entitled to conclude:* a predecessor is claimed, and the only handle on it is its content digest.
There is no identifier to request. The reader can recognise the predecessor if it arrives, but cannot
name it to ask for it.

*Does not say:* that no record with those bytes exists, nor that the author's digest is wrong. The
reader's failure to match is a fact about the subset it holds.

*Error:* none.

### 9. SELF_REFERENCE — the reference cannot denote any earlier record

*Situation:* the identifier field is present and equal to the holding record's own identifier
(whatever the digest field does).

*Entitled to conclude:* this reference is impossible as written. The predecessor is by definition an
earlier record, identifiers are unique and never reused, so no record can be its own predecessor.
This is decidable from the single record alone, with nothing else held.

*Does not say:* whose defect it is — the author's, or corruption of this record between its writing
and this reader. It says nothing about any other record: no fetch, and no digest comparison, bears on
it.

*Error:* yes, certainly, and confined to this record's own provenance. Decided by the same reasoning
as CONTRADICTED for the certainty, but the suspect set is strictly narrower — only this record's
bytes are implicated, because no second record is involved.

## Boundaries

Only pairs a reasonable person might merge are argued.

**2 and 5 (predecessor in hand, unchecked vs checked).** Merged, a program counting how many links
are backed by a digest match would count NAMED_HELD_UNCHECKABLE records as verified and overstate the
log's tamper-evidence. An investigator tracing a suspected substitution would skip exactly the
records where a substituted predecessor leaves no trace.

**3 and 4 (predecessor named, not held).** Merged, a retrieval-and-verify program would fetch both
and then report the NAMED_ABSENT_UNCHECKABLE ones as still unverified forever, and an operator
working the resulting queue would retry a fetch that can never clear. One is a gap that closes; the
other is a gap that only ever converts into a permanently unchecked link.

**5 and 7 (both have the right bytes in hand).** Merged, a program assembling successor chains keyed
by identifier would attach the record to whichever held record happened to hash correctly. Because
byte sequences are not unique, this can bind a record to a content-duplicate written by a different
participant, mis-attributing the whole chain behind it.

**1 and 3 (nothing to consult in either case).** Merged, a program counting chain roots would count
every reader-side gap as a genesis record and report far too many chains — and a different number for
every reader, since the counts would move with which subset each reader holds.

**1 and 8 (no identifier to look up).** Merged, a person reconciling missing material would learn
nothing to ask for in either case, when in fact CONTENT_UNMATCHED_UNNAMED gives them a digest to
advertise to peers and a test to apply to whatever arrives.

**4 and 8 (a digest, no matching bytes in hand).** Merged, a program that requests predecessors by
identifier has nothing to request for the unnamed ones and would either stall or issue empty
requests; the two cases need different retrieval channels, one by identifier and one by content.

**2 and 3 (unverifiable either way).** Merged, a person told only "cannot be verified" cannot tell
whether the predecessor's content is already on their disk. One case is finished work; the other is
an outstanding fetch.

**6 and 9 (both definite errors).** Merged, a person told "digest mismatch" would go obtain a fresh
copy of the predecessor and re-check. For SELF_REFERENCE there is no predecessor to obtain and no
second party to suspect; the investigation is confined to this record's own provenance, and directing
it outward wastes the effort and implicates innocent suppliers.

## Distinctions considered and rejected

- **"The named record does not exist" vs "I do not hold it."** A reader cannot enumerate the records
  it does not hold, so nothing in its evidence separates these. Both fall under NAMED_ABSENT_PENDING
  or NAMED_ABSENT_UNCHECKABLE, which is why those outcomes are worded as facts about the reader.
- **Splitting CONTRADICTED by culprit** (author wrote a bad digest / the predecessor copy is corrupt
  / this record's copy is corrupt). Undecidable from the reader's position — no channel to the
  author, no independent view of its own supply. Kept as one outcome whose attribution is explicitly
  an open disjunction.
- **Splitting NAMED_ABSENT_PENDING by whether some other held record happens to hash to the digest.**
  The identifier is what the author used to name the predecessor, and identifiers are never reused, so
  a content match on a differently-identified record resolves nothing: it is equally consistent with a
  duplicate-content record and with a mistyped identifier. Splitting would add a reader-dependent
  category that supports no conclusion.
- **Reference cycles of length greater than one.** The report is per-record about that record's own
  reference. In a two-record cycle each individual reference may be well formed and even verify; the
  defect belongs to the pair, and no per-record evidence says which of the two is at fault.
  SELF_REFERENCE is kept precisely because it is the one case decidable from a single record.
- **"Author deliberately omitted the field" vs "the writing tool omitted it."** The system states
  records from different tools and times coexist and the reader has no channel to the author.
  Undecidable, and both are permitted, so nothing turns on it.
- **A "cannot compute the digest" condition.** The system states the SHA-256 of a record's bytes is
  well defined for any record someone holds, so a held predecessor can always be hashed. No outcome is
  needed.
- **Splitting VERIFIED by whether the predecessor's own reference is sound.** Out of the report's
  subject, which is one record's reference to its predecessor, and it would make each record's outcome
  depend on an unbounded walk of records the reader may not hold.

## Completeness

The set is exhaustive with respect to the evidence listed in "The evidence a reader has." The four
field combinations are exhaustive because the system describes presence and absence as the only
variation in these fields. Within them the branching is binary and total: identifier present splits on
self-reference, then on held or not held, then — when a digest is present — on match or mismatch;
digest without identifier splits on whether any held record matches. Every leaf is one outcome, the
outcomes are mutually exclusive with SELF_REFERENCE taking precedence in the identifier-present
branch, and nothing else about a record bears on its reference.

That guarantee is relative to the system as described. Two cases are not covered, and I state them
rather than assign them:

- **The reader holds two records bearing the same identifier with different bytes.** Identifiers are
  unique and never reused, so this cannot both be true and be genuine — one of the copies is not what
  it claims. When a reference names that identifier and the digest matches one copy but not the other,
  my method does not decide the outcome. Two readings are defensible — that the author's referent
  bytes are in hand, so the reference is verified; or that a store containing an impossible pair
  cannot ground a verification at all — and the method gives no basis for choosing, because they
  differ in what the reader is entitled to conclude while resting on the same evidence. Undecided.
- **A field present but not interpretable as an identifier or as a SHA-256 digest.** The system
  describes these fields only as present or absent and specifies no syntax, so whether such a value
  can occur, and what it would mean, is not determined by the description available to me. I cannot
  place it.

Beyond these, I can know the set covers every situation *a reader can encounter under this
description*, but not that the description covers every situation the running system produces; the
description is the only source available and it is not self-certifying on that point.
