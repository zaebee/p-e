# RESULT — candidate elimination against the binding text of `SPEC.md`

## 0. Integrity

`sha256sum SPEC.md` = `847b8971d36390cd8843da7ebe59bc3499cd8050473425eb91a4a09f30b9901c`.
This **matches** the value pinned for `SPEC.md` in `PIN.txt`. (`CANDIDATES.md` and `CONTRACT.md`
also match their pinned values.) Nothing outside this directory was read.

## 1. The binding set (§2), derived before any evaluation

### 1a. The section the document declares non-binding

The declaration is the block quote opening **"## The trusted kernel — six conventions, one name
deep"**, at **lines 61–62**:

> **This section and the one above it constrain no requirement below** (audit finding F10, pin
> `6dfcce1`).

reinforced at **lines 65–66**: "An implementer can build from the MUST/MAY/MUST NOT sections
alone and lose nothing."

"This section" is the kernel section, **lines 59–94**. "the one above it" is **"What this
document certifies, and what it cannot", lines 33–57**. Both are excluded in full.

**Lines excluded on this ground, and why it matters here:** the excluded range contains **K1**
(line 75) and **K2** (line 76) — "artifact boundary … the boundary is ours and is not in the
bytes" and "byte extraction — which bytes are digested". K1/K2 are the only text in the document
that speaks directly to axes A and A′ in the vocabulary of those axes, and the document has
declared that text non-constraining. It is therefore **not** available as grounds for rejection.
(K1/K2 also carry no RFC-2119 keyword, so they fail the criterion twice over.) The keyword
occurrences physically inside the excluded range are lines 45, 62, 63, 66 — all of them
refers-to prose in any case.

### 1b. Also excluded: prose that refers to a clause rather than stating one

Lines **9** ("MUST/MAY/MUST NOT contract (relay-0235)"), **24** ("MUST 2 let an authority declare
exceptions"), **45** ("(MUST 1)"), **62–63**, **66**, **363** ("the existing store does not satisfy
MUST 1"), **380** ("Nor can MUST 2 rescue it"), **394** ("MUST 2 exists for the third row").
Headings **149** ("## MUST") and **212** ("## MUST NOT") are labels, not clauses.
(Line **200**, "This is the MUST that G2a … was left without", is refers-to prose but sits
inside admitted clause 8; it states nothing of its own and I rely on none of it.)
`SHALL` and `REQUIRED` occur **nowhere** in the document (verified by case-sensitive search).
`MAY` and `OPTIONAL` are not in the criterion's keyword list, so the **MAY section (203–210)** is
not binding; the one clause containing `OPTIONAL` (317) is admitted because it also contains
`MUST`.

### 1c. Admitted binding clauses, by line

| # | lines | clause | literal keyword inline? |
|---|---|---|---|
| 1 | 151–169 | MUST 1 — unique/monotone seq, atomic exclusive allocation, persistent marker | yes (152) |
| 2 | 170–172 | MUST 2 — declare the seq G1 is claimed from | yes (170) |
| 3 | 173–174 | MUST 3 — "Record content is identified by `sha256(bytes)`, stable across ids…" | **no** |
| 4 | 175–177 | MUST 4 — non-rewindable ledger; equivocation prevented | **no** |
| 5 | 178–180 | MUST 5 — `parent` scoped to one authority | yes (179) |
| 6 | 181–189 | MUST 6 — visibility state, incl. the Deletion (184–186) and Crash (187–189) bullets | yes (182 ×2) |
| 7 | 190 | MUST 7 — absence of a witness reported as absence | **no** |
| 8 | 191–201 | MUST 8 — crash-atomic AND create-or-fail | yes (191) |
| 9 | 214–215 | MUST NOT — global total order without consensus | yes |
| 10 | 216–217 | MUST NOT — witnessing as ordering | yes |
| 11 | 218–219 | MUST NOT — vantage-limited verdict as a property | yes |
| 12 | 220–222 | MUST NOT — deposit depending on parent readability | yes |
| 13 | 223–224 | MUST NOT — silently strengthen | yes |
| 14 | 225–227 | MUST NOT — read as attesting what the author meant; "A content digest attests transmission and storage" | yes |
| 15 | 290–294 | citation MUST be a (locator, digest) pair; "digest — `sha256(bytes)` of the cited record" | yes (290) |
| 16 | 296–300 | cross-store citation MUST be (store identity, locator, content digest) | yes (298) |
| 17 | 316–320 | Envelope convention — "The envelope `id:` inside the digested bytes … MUST be checked against the store-assigned id"; check scoped to the header block | yes (317) |
| 18 | 334 | Named failures, *crash before commit* row — "the ledger MUST be written **before** the record" | yes |

### 1d. Where my list differs from what I would have guessed, and a stated sensitivity

Two differences from a naive guess:

- I would have guessed the kernel section (K1/K2) was the governing text for axes A and A′. It is
  the text that most looks like an answer, and the document rules it out itself.
- I admitted **items 3, 4 and 7 (lines 173–177, 190), which contain no literal RFC-2119 keyword**,
  because they sit under the `## MUST` heading (149) and the document names them with the keyword
  in its own prose ("only K3 reappears, **in MUST 3**", line 62; "does not satisfy **MUST 1**",
  line 363). I read "clause using an RFC-2119 keyword" as covering a numbered provision the
  document itself labels MUST. I likewise admitted the sub-bullets of MUST 6 (184–189) as parts of
  that clause.

**Sensitivity, stated because two results depend on it.** Under a stricter, literal-only reading —
only sentences containing the keyword bind — MUST 3 (173–174) and MUST 6's sub-bullets (184–189)
drop out, and with them the rejections on axis A ("whole file") and axis D. Axis A would then
have **2** survivors and axis D **2**. Every other result below is unaffected. I flag this rather
than hide it; the choice is mine and it is contestable.

---

## 2. Axis-by-axis findings

Throughout: **stated** = words in `SPEC.md`; **inferred** = my reasoning; **supplied fact** = the
two measured facts given in `CANDIDATES.md`, which are not in `SPEC.md`.

### Axis A — extent

Candidates: (A1) whole file · (A2) the record below the deposit header · (A3) the payload below
the record's own headers.

**A3 — REJECTED.** Contradicted by the clause at lines 316–318:

> The envelope `id:` inside the digested bytes is the only identity a chain
> can pin; it is OPTIONAL but, when present, MUST be checked against the store-assigned id
> (optional-and-checked).

and lines 318–319, which locate the envelope `id:` in the header block:

> The check is scoped to the header block - the bytes above the first
> blank line

*Stated:* the envelope `id:` is inside the digested bytes, and it is a field of the header block.
*Supplied fact 1:* "The record below may carry its own `id:` header." *Inferred:* A3 places the
record's own header block outside the digested region, so under A3 the envelope `id:` is **not**
inside the digested bytes. The clause asserts it is. Direct contradiction.

**A1 — REJECTED.** Contradicted by MUST 3, lines 173–174:

> 3. Record content is identified by `sha256(bytes)`, stable across ids. Record identity
>    and content identity are different things and neither derives from the other.

*Supplied fact 1:* the deposit header written by the receiving store "carries `deposited-by:`,
`provenance:` and **`assigned-id: relay-NNNN`**". *Inferred:* under A1 the digested bytes contain
the record's own id, so the same record content deposited at two ids yields two different digests
— the identification of content is not stable across ids, and content identity varies with (i.e.
partly derives from) record identity. Both halves of MUST 3 are contradicted.

*The contrary reading I considered and rejected:* "stable across ids" could be read as describing
the uniformity of the scheme ("the same rule applies whatever the id") rather than as a
cross-id equality claim. I rejected it because that reading leaves the phrase with no content, and
because the second sentence — "neither derives from the other" — independently forbids the digest
tracking the id. I record this as a rejection, not as an arguable case, but the reader should see
that the rejection rests on MUST 3 being admitted (see §1d) **and** on supplied fact 1, not on
anything `SPEC.md` says about the deposit header's contents in binding text.

*Not used as grounds:* the corroborating but **non-binding** material — K1 "the boundary is ours
and is not in the bytes" (line 75, declared non-binding); MAY "Content deduplication across ids"
(205, MAY is not in the keyword set); the named-failures row "duplicate content | none | two ids,
one digest. Correct" (337, no keyword). Each points the same way; none is a rejection under §3.

*Also considered and not used:* lines 298–300 require a cross-boundary citation to be
`(store identity, locator, content digest)` and then say "the third element is what makes a
citation resolvable elsewhere". If "the third element" means the content digest, the digest must
be store-independent and A1 (which embeds the receiving store's own header) is contradicted a
second time; if it means the newly-added store identity, the clause is neutral. **Arguable in both
directions → not used.**

**A2 — NOT REJECTED.** Consistent with 316–318 (record header block, hence the envelope `id:`, is
inside) and with MUST 3 (the store-written deposit header, which carries `assigned-id:`, is
outside, so the digest does not vary with the store-assigned id).

**Surviving: A2 only. Count: 1.**

### Axis A′ — self-identity

Candidates: the envelope `id:` **is** inside the digested region · **is not**.

**"is not" — REJECTED.** Same quote, lines 316–318: "The envelope `id:` **inside the digested
bytes** is the only identity a chain can pin; it is OPTIONAL but, when present, MUST be checked
against the store-assigned id". *Stated*, in a binding clause, that the envelope `id:` is inside
the digested bytes. The candidate asserts the negation.

*The contrary reading:* one could argue "inside the digested bytes" is descriptive apposition
carried along by a clause whose normative force is only the checking obligation. I considered
this and do not find it sustains the candidate: the apposition is an assertion in the admitted
clause, and the candidate denies exactly it. Recorded as a rejection, with the alternative shown.

**"is" — NOT REJECTED.** No binding clause contradicts it. (Lines 314–315, "The store-assigned id
… is not an authored field", concern the *store-assigned* id, not the envelope field, and carry no
keyword.)

**Surviving: "is inside". Count: 1.**

### Axis B — fidelity

Candidates: (B1) the bytes the sender emitted · (B2) the bytes the store stored.

**No binding clause contradicts either candidate.** Both are NOT REJECTED.

- The nearest binding text is lines 225–227: "**MUST NOT be read as attesting that a record says
  what its author meant.** A content digest attests transmission and storage. It does not attest
  composition". This separates *composition* (pre-deposit intent) from transmission and storage; it
  does not choose between emitted bytes and stored bytes, both of which lie on the
  transmission/storage side of that line.
- MUST 6's crash bullet (187–189) — "Ledger committed, bytes never written: … the digest and the
  binding are known" — puts B2 under some tension: if the digested region is by definition the
  bytes the store stored, there are no such bytes in that state. **Arguable in both directions**,
  and recorded as NOT REJECTED per §3: *(i)* B2 is contradicted, because the clause asserts a known
  digest where nothing was stored; *(ii)* B2 is untouched, because "the bytes the store stored"
  reads naturally as "the store's copy of the record rather than the wire copy", and the digest
  recorded at ledger time is of exactly the byte string the store accepted for storage. I do not
  resolve it.
- The text that most obviously bears on B — "The interval in front of it — between the author's
  intent and what the deposit path received — has no guarantee and no detector. `relay-0236`
  carries a permanent, verifiable digest over content that was already corrupt when it arrived"
  (283–286) — **carries no RFC-2119 keyword and is not in the binding set.** It leans toward B2 and
  cannot reject B1.

**Surviving: B1 and B2. Count: more than 1.**

### Axis C — type

Candidates: (C1) octets · (C2) decoded UTF-8 text.

**Neither is rejected.**

- MUST 3 says `sha256(bytes)` (173). *Inferred:* a digest over decoded-then-re-encoded text is
  still a digest over bytes, so the word "bytes" alone does not exclude C2, and it plainly does not
  exclude C1.
- The strongest candidate ground against C2 is MUST 4, lines 175–177: "A **conforming** authority's
  ledger is non-rewindable: a bound `(authority, seq)` never changes its digest. Equivocation by a
  conforming authority is therefore *prevented*, not detected." Against supplied fact 2 — three
  files differing in one invalid octet produce the single digest `66e4ee59e2fc41e8…` — this is
  **arguable in both directions** and is recorded as NOT REJECTED:
  *(i) rejects C2:* MUST 4 asserts prevention; if the digest cannot distinguish three distinct byte
  strings, a bound `(authority, seq)` can come to name other bytes with its digest unchanged, so
  what the clause says is *prevented* is not prevented.
  *(ii) does not reject C2:* the clause's normative content is "never changes its digest", which a
  non-injective digest satisfies; nothing in the binding set requires the digest to be injective
  over file bytes, and a weaker guarantee is, per §3, "harder to satisfy / less useful" — expressly
  not a rejection.
  I do not resolve it.
- Line 226, "A content digest attests transmission and storage", raises the same tension in the
  same shape (an invalid octet altered in transit leaves the digest unchanged) and is arguable for
  the same reasons. Not a rejection.
- Nothing anywhere contradicts C1.

**Surviving: C1 and C2. Count: more than 1.**

### Axis D — time

Candidates: (D1) the bytes as bound, digest recorded at binding · (D2) the bytes present now,
recomputed on read.

**D2 — REJECTED.** Contradicted twice inside MUST 6, lines 184–189:

> - **Deletion.** The ledger keeps `(authority, seq, digest)` and answers with it; the
>   payload reads `KNOWN_MISSING`. A client must never confuse *content removed* with
>   *no binding*.
> - **Crash between ledger and payload.** Ledger committed, bytes never written: the
>   id is bound and the content unreachable. That state is `KNOWN_MISSING` — the
>   digest and the binding are known — not `UNKNOWN` and not an error.

*Stated:* in both states there are no bytes present to read — deleted in the first, never written
in the second — and in both the digest is nonetheless **kept, answered with, and known**.
*Inferred:* a digest recomputed on read over the bytes present now cannot exist in either state,
so the clause's assertion that the digest is known is false under D2. This is a contradiction of
what the clause states, not merely an awkwardness.

Supporting but not relied on: line 334 (binding) requires "the ledger MUST be written **before**
the record", i.e. the digest enters the ledger before any bytes are on disk to recompute from.

*The contrary reading I considered:* a D2 defender may call the ledger's stored digest a cache,
with recompute-on-read remaining the definition. I do not find this sustains D2: the clause makes
the recorded digest the thing the store *answers with* precisely when no bytes exist, which is D1's
semantics for the only cases where the two candidates differ.

**D1 — NOT REJECTED.** MUST 4 (175–177) and line 334 are consistent with it; nothing contradicts it.

**Surviving: D1 only. Count: 1.**

---

## 3. Summary

| axis | surviving candidates | count |
|---|---|---|
| **A** extent | the record below the deposit header | 1 |
| **A′** self-identity | the envelope `id:` **is** inside the digested region | 1 |
| **B** fidelity | the bytes the sender emitted; the bytes the store stored | more than 1 |
| **C** type | octets; decoded UTF-8 text | more than 1 |
| **D** time | the bytes as bound, digest recorded at binding | 1 |

Under the stricter literal-keyword reading of §2 described in §1d, A becomes **more than 1**
(whole file survives alongside the record below the deposit header) and D becomes **more than 1**.
A′, B and C are unchanged under either reading.

No recommendation is made about which surviving candidate is correct; that is outside this
contract (§5).

---

## 4. Defect not bearing on the five axes

Lines 298–300: in "the citation MUST be `(store identity, locator, content digest)` … so **the
third element** is what makes a citation resolvable elsewhere", the third element of the triple as
written is the content digest, but the supporting argument ("a bare `relay-NNNN` is only a locator
in one store") is an argument for *store identity*, which is written first — the referent is
ambiguous.
