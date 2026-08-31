# DECISIONS.md — decision journal

Kept as I built, in the order the choices arose. A choice is here only because I could
not write the next line of code without making it.

Digest check: both `SPEC.md` (`847b8971…901c`) and `AMENDMENT.md` (`efcf6df9…dbb2a6`)
matched the values in CONTRACT.md before I read either.

Convention: "SPEC MUST n" and "AMD 9.x/10.x" name clauses; line numbers are of the
documents as given.

---

## Settled elsewhere (not decisions)

These read two ways until a later sentence closed them. Recorded as one line each, per §4.

- Whether the record payload or the ledger goes first — settled by SPEC "Named failures",
  row *crash before commit*: "the ledger MUST be written **before** the record, or an id is
  handed out twice."
- Whether `rename` is an acceptable atomic binding write — settled by SPEC MUST 8: "`rename`
  is atomic and replaces silently, so an implementer reading 'atomic' alone reaches for the
  call that reopens the `relay-0183` rebinding path".
- Whether the legacy authority may declare a G1 floor at 32 — settled by SPEC *The legacy
  authority*: "under the ban, a reuse anywhere means legacy cannot claim from 32 or from
  anywhere at all." (Out of scope here anyway; §2 excludes migration.)
- Which hash — settled by K3: SHA-256.
- What `bytes` means in `sha256(bytes)` — settled by AMD *Bound-content*: "Where
  `sha256(bytes)` appears elsewhere in this document, `bytes` means bound-content."
- Whether a header-like line inside a body is a field — settled by AMD *Field*: "A line that
  is not a field is not one, wherever it appears", and SPEC line 320's header-block scoping.

---

DECISION 1
  clause:        "To allocate, the authority walks ids and claims the first marker that
                 does not yet exist" (SPEC MUST 1) against "Each authority binds
                 `(authority_id, seq)` uniquely, monotonically" (SPEC MUST 1).
  chosen:        The walk starts at the authority's declared G1 floor and never below it;
                 markers are never removed, so first-free is always one above the highest
                 marker and the two clauses coincide. Rule: allocate(seq) = min { s >= floor
                 : history/<locator(s)> does not exist }.
  rejected:      (a) Walk from seq 1 regardless of floor. (b) Keep an in-memory counter and
                 claim max+1.
  why:           (a) would allocate below the floor, and MUST 2 forbids claiming G1 there —
                 the store would hand out ids it cannot make its own guarantee about. (b) is
                 the `max+1` MUST 1 names explicitly as never safe.
  consequence:   Observable in a store whose floor is above 1: my first allocation is
                 `relay-0032` for floor 32, not `relay-0001`. Under (a) an observer would see
                 ids below the floor.

DECISION 2
  clause:        "each id owns a persistent allocation marker — an empty file
                 `history/relay-NNNN` created with `wx`/`O_EXCL`" (SPEC MUST 1) against
                 "`bound` | an **id** | this id has been given to some content, ever".
  chosen:        Two separate persistent artifacts. The **marker** (empty, `O_EXCL`) makes a
                 seq permanently unavailable — it is the G1 guard. The **ledger entry**
                 (`ledger/<locator>`, `O_EXCL`, carrying seq, content identity, extent)
                 is the binding, and only its existence makes the id `bound`. A marker
                 without a ledger entry is an *allocated but never bound* id.
  rejected:      Marker alone is the binding, with the digest kept beside the payload.
  why:           AMD *Binding* requires identity, bound-content, content identity and extent
                 to be associated "at a single moment"; an empty marker carries none of the
                 last three, so it cannot be that moment. And MUST 10.1 requires the content
                 identity to be recorded *at* binding, which needs a place to put it.
  consequence:   An id can be allocated and never bound (a candidate refused after its id was
                 taken — SPEC line 321's "ids being abandoned once taken"). An observer sees
                 that id as permanently unusable and reporting UNKNOWN, not KNOWN_MISSING
                 (see DECISION 8). Under the rejected reading the same id would be `bound`
                 to nothing.

DECISION 3
  clause:        "the bytes are durable before the name that points at them appears — which
                 requires flushing the record and the directory entry that names it" (SPEC
                 MUST 8) against "the ledger MUST be written **before** the record" (SPEC
                 Named failures).
  chosen:        "The name that points at them" means the *record's* directory entry
                 (`records/<locator>` and `objects/<digest>`), not the ledger entry. Order is:
                 marker -> ledger entry (fsync, fsync dir) -> payload octets written to a
                 temp file (fsync) -> `link()` into `objects/` and `records/` (fsync dirs).
  rejected:      Treat the ledger entry as a name pointing at the bytes, and therefore write
                 the payload durably first, ledger second.
  why:           The rejected order inverts the Named-failures row, which is explicit that
                 this is "the one place the order of two local operations is load-bearing",
                 and it makes the crash window produce an unbound id holding octets — a state
                 MUST 6 has no vocabulary for. The chosen order produces the window MUST 6
                 does define: "Ledger committed, bytes never written ... That state is
                 `KNOWN_MISSING`".
  consequence:   A crash in the window leaves `KNOWN_MISSING` under my order and a durable
                 orphan payload with no binding under the rejected one.

DECISION 4
  clause:        "**Every write that establishes a binding MUST be crash-atomic AND
                 create-or-fail** ... `rename` is atomic and replaces silently" (SPEC MUST 8).
  chosen:        `link(2)` is the binding write for the payload name: octets go to a temp
                 file, `fsync`, then `os.link(tmp, records/<locator>)`, then `fsync` the
                 directory. `link` is atomic and fails `EEXIST` on an id already held, so it
                 is both properties at once. The ledger entry uses `O_CREAT|O_EXCL`, which is
                 the same pair for a file written in one `write()`.
  rejected:      (a) `rename(tmp, final)`. (b) `open(final, O_CREAT|O_EXCL)` then write then
                 fsync.
  why:           (a) is the call MUST 8 names as destroying create-or-fail. (b) makes the
                 name appear before the bytes are durable, which is the half of MUST 8 that
                 (a) gets right — an implementer must not trade one for the other.
  consequence:   Depositing to an id already held raises a refusal instead of replacing.
                 A crash mid-payload leaves a temp file and no record name, never a
                 truncated `records/<locator>`.

DECISION 5
  clause:        "A candidate has an extent because it was delivered as one — extent is a
                 property of the offer, never derived from the octets." (AMD *Candidate*),
                 with "**A store MUST NOT derive extent from the content of a candidate**"
                 (AMD 9.1).
  chosen:        `deposit()` takes the extent as an explicit argument of the offer. If the
                 delivered octet count differs from the declared extent, the candidate is
                 refused (`EXTENT_MISMATCH`) — the offer is internally inconsistent and the
                 store has no rule for choosing between its two halves.
  rejected:      (a) Accept the octets and record `len(octets)` as the extent. (b) Truncate or
                 pad the octets to the declared extent.
  why:           (a) *is* deriving extent from the content, which 9.1 forbids in those words;
                 it would also make the extent parameter decorative. (b) violates AMD 9.3,
                 which forbids trimming and padding outright.
  consequence:   An offer of 12 octets declaring extent 10 is refused by me and bound (as
                 either 10 or 12 octets) by a store taking (a) or (b).

DECISION 6
  clause:        "**10.3 OPEN.** The verdict when the recorded and recomputed content
                 identities disagree is not defined by this document." (AMD 10.3), with
                 "An open verdict is not a permission."
  chosen:        On disagreement the read returns the octets it holds *and* reports
                 `integrity: MISMATCH` beside `visibility: PRESENT`. Nothing is withheld and
                 nothing is repaired. Rule: the store reports, the reader judges.
  rejected:      (a) Refuse the read — return no bound-content, reporting PRESENT/MISMATCH.
                 (b) Raise an error, i.e. treat the disagreement as a store failure.
  why:           (a) would settle a question the amendment lists as *still open* in its own
                 words ("whether a store may discard octets it holds and must refuse to
                 serve"); choosing it silently would be exactly the invention §7 forbids.
                 (b) is forbidden by the surviving MUSTs: MUST 6 says a failure must not be
                 reported as absence and 10.3 says no store may move the record out of
                 `PRESENT`, and an error return does both by collapsing the two axes.
  consequence:   Given a record whose octets were altered under the store, I hand back the
                 altered octets with a MISMATCH verdict; a store taking (a) hands back
                 nothing with the same verdict. Both readers learn the same fact; only mine
                 can inspect what is actually there.

DECISION 7
  clause:        "The envelope `id:` inside the digested bytes ... is OPTIONAL but, when
                 present, MUST be checked against the store-assigned id" (SPEC line 317),
                 with AMD *Known open*: "Q8b, what a store does when a declared and an
                 assigned id disagree".
  chosen:        The check runs. On disagreement the candidate is refused
                 (`DECLARED_ID_DISAGREES`) and the id already claimed for it stays claimed
                 forever — it is never bound and never reallocated.
  rejected:      (a) Bind anyway and ignore the declared id. (b) Bind anyway and keep the
                 declared id as source metadata. (c) Release the marker so the id is reusable.
  why:           (a) and (b) make the MUST decorative — a check whose failure changes nothing
                 is not a check. (c) is the direct contradiction: MUST 1's marker "persists
                 beyond deletion of the record" precisely so no id is ever freed, and
                 releasing it on a refusal reopens `relay-0183`'s path through a new door.
                 SPEC line 321 anticipates the cost — "deposit.ts records ids being abandoned
                 once taken" — so abandonment is the sanctioned price.
  consequence:   Observable directly: after a refused deposit my sequence has a permanent
                 hole (`relay-0003` allocated, never bound, UNKNOWN forever) and the next
                 deposit gets `relay-0004`. Under (a)/(b) there is no hole. Under (c) the
                 next deposit gets `relay-0003`.

DECISION 8
  clause:        "Visibility state is exposed honestly: `PRESENT` / `KNOWN_MISSING` /
                 `UNKNOWN`." (SPEC MUST 6) — three states, and my store has four
                 distinguishable conditions.
  chosen:        bound + octets held -> `PRESENT`; bound + octets absent -> `KNOWN_MISSING`;
                 not bound but named in some held record's `parent:`/`ref:` **header** ->
                 `KNOWN_MISSING`; otherwise -> `UNKNOWN`. An allocated-but-never-bound id
                 falls in the last case and reads `UNKNOWN`.
  rejected:      (a) Allocated-but-unbound -> `KNOWN_MISSING`, on the ground that the store
                 knows the id is taken. (b) A fourth state, e.g. `ALLOCATED`.
  why:           (a) misreports: MUST 6 defines KNOWN_MISSING as the case where "the digest
                 and the binding are known", and for an abandoned id neither is — there is no
                 content that went missing. (b) is a fourth value in a vocabulary MUST 6
                 enumerates closed, and MUST NOT *silently strengthen* argues against
                 inventing one. The header-reference rule is not mine: it is the store's own
                 predicate as SPEC describes it ("What separates them is whether a surviving
                 record names the id in a `parent:` or `ref:` **header**").
  consequence:   Ask my store about an abandoned id and it says UNKNOWN; under (a) it says
                 KNOWN_MISSING, which a client would read as "content was removed".

DECISION 9
  clause:        "`parent`, when present, is scoped to the same authority. Cross-authority
                 references are **observations** and MUST be labelled as such" (SPEC MUST 5).
  chosen:        `parent:` accepts only a locator of this authority; anything else refuses the
                 candidate at admission. Cross-authority references travel in a differently
                 named field, `observes:`, and `references()` returns them tagged
                 `kind: OBSERVATION, in_chain: False` — the label is structural, not a note.
  rejected:      (a) Accept a foreign locator in `parent:` and label it an observation on the
                 way out. (b) Accept it and silently drop it.
  why:           (a) puts a non-membership claim in the field the same clause defines as
                 meaning membership ("`parent` implies membership in the same chain"), and a
                 label attached at read time is lost the moment the record is quoted
                 elsewhere. (b) is a normalisation of bound-content's meaning and loses a
                 claim the author made.
  consequence:   `parent: otherauth-0007` is refused by me and bound by a store taking (a),
                 which then reports a parent edge I would report as an observation.

DECISION 10
  clause:        "The absence of a witness is reported **as absence**, never as 'no evidence
                 found'." (SPEC MUST 7)
  chosen:        `witnesses()` always returns a `WitnessReport` whose `status` is literally
                 `ABSENT` or `PRESENT`. An unwitnessed record yields `ABSENT`, not an empty
                 list to be interpreted, not `None`, not an exception. The report also carries
                 `orders_records=False` and `independence_asserted=False` as printed fields.
  rejected:      Return a plain list of attestations and let `[]` mean absence.
  why:           `[]` is precisely "no evidence found" in the type system — it is the same
                 value a failed lookup, an unreachable witness log, or a search that never
                 ran would produce. MUST 7 is a requirement about which of those a caller can
                 tell apart, and a bare list cannot carry it.
  consequence:   A caller of mine reads a field that says ABSENT; a caller of the rejected
                 design reads an empty list and must supply the distinction itself.

DECISION 11
  clause:        "**Blank line.** A line containing no octets. A line carrying whitespace is
                 not blank." (AMD) — which fixes what a blank line *contains* and never says
                 what delimits a line.
  chosen:        LF (`0x0A`) alone delimits a line. So the header block ends at the first
                 `\n\n`, and a `\r\n\r\n` sequence is not a blank line because the line
                 between the two LFs carries the octet `\r`.
  rejected:      (a) CRLF is also a line terminator, so `\r\n\r\n` ends the header block.
                 (b) Any of LF, CR, CRLF.
  why:           Not that the rejected readings are wrong — they are defensible — but that I
                 had to pick one to know where a header block ends, and the amendment's own
                 example of a not-blank line ("a line carrying whitespace") reads most
                 naturally as counting `\r` among the octets a line can carry.
  consequence:   Sharper than I first realised, and I found it by probing my own build
                 rather than by reading. Under LF-only lines a CRLF header line's octets
                 include the trailing `\r`, so the value of `parent: relay-0001\r\n` is
                 `relay-0001\r` — not a locator. **A CRLF-authored record therefore cannot
                 carry any checked field and is refused**, where a CRLF-aware store binds it
                 normally. AMD 9.3 forbids me from normalising the `\r` away, so refusal is
                 the only move this rule leaves. Pinned in
                 `crlf_header_values_carry_their_trailing_cr`; see DIVERGENCE D5. Also
                 tested: `a_line_carrying_whitespace_is_not_blank`,
                 `amd93_octets_are_stored_exactly_as_they_arrived`.

DECISION 12
  clause:        "**locator** — the record's store-scoped id, `relay-NNNN` within one
                 authority." (SPEC *Citing a record*)
  chosen:        `locator(seq) = f"{authority_id}-{seq:04d}"`, zero-padded to a configured
                 width defaulting to 4, widening naturally past 9999. The authority id is a
                 parameter, so `relay` is a default and not baked in.
  rejected:      (a) No padding: `relay-1`. (b) Fixed width 4, refusing to allocate past 9999.
  why:           `NNNN` and every example in the corpus (`relay-0183`, `relay-0045`) show four
                 digits, so (a) would not resolve against any citation in the documents.
                 (b) would make the authority stop allocating, which no clause asks for and
                 MUST 1's "monotonically" implies it should not.
  consequence:   `relay-0001` from me, `relay-1` from a store taking (a); citations do not
                 cross between them even though both are conforming.

DECISION 13
  clause:        MAY: "Content deduplication across ids", with AMD's amendment to MUST 3:
                 "a store's deduplication MUST NOT be switched off for them".
  chosen:        Deduplicate. Octets live once at `objects/<sha256hex>`; `records/<locator>`
                 is a hard link to it. The path is unconditional — a record carrying a
                 declared `id:` goes through exactly the same code, so dedup is never
                 switched off for any class of record.
  rejected:      Store each record's octets separately under its locator.
  why:           Not that the rejected design is non-conforming — it plainly is conforming,
                 dedup being a MAY. I chose dedup because the same content-addressed name
                 gives me MUST 8's "bytes durable before the name that points at them
                 appears" for free: the object is fsynced before either name exists.
  consequence:   Two ids holding identical octets share one inode in my store. Out-of-band
                 corruption of that inode is then observed at both locators, where a
                 non-deduplicating store would show it at one. Both report it honestly under
                 10.3; the blast radius differs.

DECISION 14
  clause:        "**Read.** An operation that returns bound-content or any part of it."
                 (AMD) with "MUST verify it against bound-content on every read" (10.1).
  chosen:        The store offers only whole-record reads. There is no range or streaming
                 read.
  rejected:      Offer a range read that verifies only the range returned.
  why:           The two clauses together make a partial read verify the *whole* record
                 anyway — a range is a read, and 10.1's obligation is over bound-content, not
                 over the part returned. A range API would therefore read everything and
                 return a slice, which is a worse interface making the same promise.
  consequence:   None observable in the store's answers; a caller wanting 40 octets of a
                 large record gets all of them and slices.

DECISION 15
  clause:        "**10.5 Records bound before 10.1.** A store MUST distinguish records bound
                 with a recorded content identity from records bound without one".
  chosen:        The ledger entry's `content_identity` is optional in the stored form. When it
                 is absent the read reports `integrity: UNRECORDED` — never `VERIFIED` — and
                 no digest is recomputed for comparison. Because nothing a depositor offers
                 can produce such an entry, an explicit non-deposit constructor
                 (`bind_without_recorded_identity`) exists so the distinction can be
                 exercised and tested.
  rejected:      (a) Treat 10.5 as vacuous, since this store always records an identity.
                 (b) Compute and record an identity for such a record on first read.
  why:           (a) leaves a MUST with no implementation and no evidence — precisely the
                 failure §5 exists to catch. (b) is forbidden in as many words: "Recording a
                 content identity for such a record afterwards does not bind it".
  consequence:   Such a record reads PRESENT/UNRECORDED from me and PRESENT/VERIFIED from a
                 store taking (b) — the second being a claim about octets it never saw bound.

DECISION 16
  clause:        "**Refuse.** To decline, with an indication the offering party can
                 distinguish from acceptance. Silence is not refusal." (AMD)
  chosen:        A refusal is a raised `Refused` carrying a machine-readable `code` and a
                 detail string. Acceptance returns a `Binding`. The two are different types
                 on different control paths, so no caller can miss the difference.
  rejected:      Return `None`, or a `Binding` with a null locator.
  why:           `None` is the value an unrelated failure also produces; the amendment's
                 "Silence is not refusal" is aimed at exactly that.
  consequence:   None between conforming stores — this is an interface shape, not a
                 behaviour. Recorded because I had to choose it to write `deposit`.

DECISION 17
  clause:        "**An authority MUST declare the seq from which it claims G1**" (SPEC MUST 2)
                 — which does not say where, when, or to whom.
  chosen:        The floor is declared once, at `Store.create`, into `authority.json`, written
                 `O_EXCL` so it cannot be redeclared. Allocation begins at it (DECISION 1),
                 and `claims_g1(seq)` answers False below it.
  rejected:      (a) Let the floor be set or raised at any time. (b) Infer the floor as the
                 lowest seq present.
  why:           (a) reintroduces the retroactive move the whole v1 position was built to
                 forbid — "MUST 2 let an authority declare exceptions and said nothing about
                 *when*, so delete -> rebind -> 'seq N is an exception' made the claim
                 unfalsifiable". A raisable floor is that same move under another name. (b) is
                 not a declaration at all; it is a measurement, and it moves as the corpus does.
  consequence:   My store will refuse to claim G1 below its declared floor forever, including
                 for seqs it never used. A store taking (a) could answer the same question
                 differently at two times.

DECISION 18
  clause:        "A witness attests one of three different things and the model must name
                 which" (SPEC *What a witness does, exactly*).
  chosen:        `attest()` requires the caller to pass `kind` in {a, b, c}; the kind is
                 written into the attestation record and returned unchanged. The store never
                 infers a kind and never upgrades one.
  rejected:      Infer the kind from what the attestation happens to contain — e.g. treat an
                 attestation listing (id, digest) pairs as (b) automatically.
  why:           Inference is the silent strengthening the MUST NOT names, and the SPEC's own
                 worked example is that `relay-0184` "is **(b)**, not (c)" — a judgement about
                 what the witness saw, which no store can recover from the record's shape.
  consequence:   An attestation deposited without a kind is refused by me; a store that
                 infers would bind it with a kind it invented.

---

## Blockers

**None.** No clause left me unable to write any code, and I found no pair of clauses
requiring incompatible things once DECISION 3 fixed the referent of "the name that points
at them". Two clauses come close enough to be worth naming, and neither is a blocker:

- AMD's amendment to MUST 3 — "record identity MUST NOT derive from content identity" —
  states of itself: "**A store cannot observe it** ... It is stated as a rule the
  allocator's construction must satisfy and not as one a peer can test." I satisfied it by
  construction (the allocator never sees the digest; `_allocate` takes no arguments) and I
  cannot test it. Implementable, unverifiable.
- SPEC MUST 8's durability is listed by AMD as "**Known open** ... verified only as syscall
  structure on filesystems where `fsync` is a no-op" (AMD line 17-19) — one document saying
  of a requirement in the other that it has never actually been established. I issue the
  fsyncs; I cannot confirm they reach a platter, and I did not test power loss. Implementable,
  unverified here — see NOTES.md.

Both are recorded in COVERAGE.md as IMPLEMENTED with the limit of the evidence stated,
rather than claimed as proven.
