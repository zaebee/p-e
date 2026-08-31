# Amendment to issue-1 — digest domain and record identity, v3

Draft. Not part of the specification.

Definitions come first, and every rule below is stated in them — the first draft
legislated about objects it never defined, and nine of fifteen findings against it reduced
to undefined terms or to one word used in two senses.

v3 carries one repair from the Phase C implementation audit. Of the four proposed:
SF-3 survived attack and is here, in the attacker's wording rather than the author's; SF-1
was reversed under attack and is here in its reversed form; SF-2 and SF-4 were both
withdrawn as not following from the contract and are recorded as ADR-1 and ADR-2.

**Known open, and not resolved by this document:** Q8b, what a store does when a declared
and an assigned id disagree, with its measured cost in ADR-1; the verdict at 10.3; whether
a store may discard octets it holds and must refuse to serve; the identity-continuity
question, deliberately out of scope until an attestation layer exists; and MUST 8's
durability, which two independent parties have verified only as syscall structure on
filesystems where `fsync` is a no-op.

---

## Definitions

**Candidate.** An octet sequence offered to a store as a record, together with its
extent. A candidate has an extent because it was delivered as one — extent is a property
of the offer, never derived from the octets.

**Record.** A candidate a store has admitted.

**Bound-content.** The octet sequence of a record: every octet of the candidate that was
admitted, in order, and nothing else. Where `sha256(bytes)` appears elsewhere in this
document, `bytes` means bound-content.

**Content identity.** `sha256(bound-content)`. Nothing wider is meant by the term.

**Record identity.** The name under which a store holds a record. It is allocated by the
store.

**Blank line.** A line containing no octets. A line carrying whitespace is not blank.

**Field.** A header-block line of the form `name: value`, where `name` matches
`[A-Za-z][A-Za-z0-9-]*` and is followed immediately by `:`. A line that is not a field is
not one, wherever it appears.

**Header block.** The octets of bound-content above its first blank line. This is the
scope the existing specification already gives the term (line 318, "the bytes above the
first blank line"); it is restated here so this document does not depend on a term it
never fixes.

**Declared id.** An `id` field appearing in a record's header block. It is bound-content,
not identity. Whether the two must agree is not settled by this document.

**Binding.** The association, completed at a single moment, of a record identity with a
bound-content, its content identity, and its extent. A record is *bound* from that moment.

**Read.** An operation that returns bound-content or any part of it. An operation that
returns only a store's own metadata — a listing, an extent, a recorded digest — is not a
read.

**Refuse.** To decline, with an indication the offering party can distinguish from
acceptance. Silence is not refusal.

---

## Amendment to MUST 3, second sentence

Replaces: *"Record identity and content identity are different things and neither derives
from the other."*

> Record identity and content identity are different things, and the derivation between
> them runs one way only: record identity MUST NOT derive from content identity — an
> identity is allocated, never computed from bound-content — while bound-content MAY
> contain a declared id.
>
> This is a requirement on the allocator. **A store cannot observe it**: given an
> identity, nothing in the record shows how it was chosen. It is stated as a rule the
> allocator's construction must satisfy and not as one a peer can test.
>
> A record whose bound-content contains a declared id has a content identity that varies
> with that id. Content deduplication and the `duplicate content` case therefore find no
> match across identities for such records; this is a consequence of the digest domain,
> **not a prohibition** — a store's deduplication MUST NOT be switched off for them.

## MUST 9 — the digest domain

> **The invariant.** A store receives a candidate and composes metadata of its own about
> the receipt. Content identity is computed over the admitted candidate alone. The store's
> metadata is outside it, and the octets are digested exactly as they arrived.
>
> **9.1 Extent.** Bound-content is the candidate's octets in full. **A store MUST NOT
> derive extent from the content of a candidate**, and MUST record the extent at binding.
> A store that cannot recover a record's extent from its own stored form MUST refuse the
> candidate at admission rather than bind it.
>
> **9.2 Admission.** A candidate MUST begin with the octets `@p-e/x0`. A candidate that
> does not is refused. A candidate that is not valid UTF-8 — well-formed in the sense of
> Unicode 15.0 Table 3-7, admitting no overlong forms, no encoded surrogates and no
> truncated sequences — is refused. Admission is tested on the candidate as delivered,
> before any framing a store may add.
>
> **9.3 Fidelity.** A store MUST store bound-content octet for octet as it arrived. It
> MUST NOT trim, pad, append to, re-encode, or otherwise normalise it. A store that does
> holds something that is not the record it received; its binding is void, and the
> violation is detectable only by a party holding the octets it sent.
>
> **9.4 Type.** Content identity is computed over octets, never over a decoded string. A
> store MUST NOT substitute replacement characters for octets it cannot represent.

## MUST 10 — recorded at binding

> **10.1** A store MUST record the content identity at the moment of binding, and MUST
> verify it against bound-content on every read of a record bound under this clause. A
> digest recomputed with no recorded value to compare against is not evidence of anything.
>
> **10.2** Verification establishes consistency with the recorded binding under this
> digest domain. It does not establish that the record is correct, that its author meant
> what it says, or that the recorded value was honest when it was written.
>
> **10.3** **OPEN.** The verdict when the recorded and recomputed content identities
> disagree is not defined by this document.
>
> An open verdict is not a permission. Where another clause states a MUST that applies to
> the same read, that clause governs, and no behaviour is admissible under 10.3 that
> another MUST forbids.
>
> Visibility and integrity are separate axes and MUST NOT be reported through one
> vocabulary. `PRESENT` / `KNOWN_MISSING` / `UNKNOWN` answer *where the content is* —
> `PRESENT` means the octets are retrievable, never that they are correct. A disagreement
> between the recorded and recomputed content identities changes none of them, and **no
> store may report an integrity disagreement by moving a record out of `PRESENT`.**
>
> A store reports two facts, visibility and integrity. Neither alone is the full truth;
> together they are honest. MUST 6's *honestly* binds the pair, not either member.
>
> **10.4 Order.** On a read, admission (9.2) is tested before verification (10.1). Where
> both would fail, the admission failure is what the store reports.
>
> **10.5 Records bound before 10.1.** A store MUST distinguish records bound with a
> recorded content identity from records bound without one, and MUST NOT report the latter
> as verified. Recording a content identity for such a record afterwards does not bind it:
> the value attests the octets present when it was computed, not the octets that were
> bound. 10.1's verification obligation does not extend to them.

---

## Standing

This is the resolution of the questions asked in August 2026, reached by independent
attack on five axes and one attack on the wording of the first draft. It is not the only
coherent interpretation, and a later version may choose differently. The enumeration of
axes is not known to be complete.
