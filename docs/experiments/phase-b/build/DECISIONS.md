# Decision journal — single-authority append store, v1

Kept while building, in the order the choices arose. Sources: `SPEC.md` (S) and
`AMENDMENT.md` (A); where they disagree A governs (CONTRACT §1).

Out of scope per CONTRACT §2 and therefore not journalled: deletion, migration of an
existing corpus, crash recovery, more than one authority, cross-authority history.

---

## Stage 1 — identity, namespace, and the on-disk shape of a binding

DECISION 1
  clause:        "**locator** — the record's store-scoped id, `relay-NNNN` within one
                 authority." (S, *Citing a record*), read against MUST 1's
                 "an empty file `history/relay-NNNN` created with `wx`/`O_EXCL`".
  chosen:        A locator is `<authority_id>-<seq, four digits>`. `relay` is a *value*
                 of `authority_id` — the legacy authority — not a literal in the format.
                 The marker path is `history/<authority_id>-NNNN`.
  rejected:      The string `relay` is literal: every authority's locators and markers
                 are `relay-NNNN`, and `authority_id` lives only outside the locator.
  why:           Under the rejected rule a new v1 authority writes its markers into the
                 same name space as legacy `relay`. S says of that name space that it
                 "makes **no G1 claim at all**" and that its seq 183 was reused; it also
                 says "anyone who can write to a namespace can append to it" and that
                 `authority` is "a namespace label". A new authority whose locators are
                 indistinguishable from legacy's is *in* legacy's namespace, so its G1
                 claim would be a claim about a namespace with a known reuse in it —
                 exactly what S refuses to let MUST 2 launder. The rejected rule also
                 makes every guarantee's index `(authority_id, seq)` unexpressible in the
                 thing a citation actually routes on.
  consequence:   Observable: markers and citations read `store-a-0032`, not
                 `relay-0032`. Under the rejected rule two authorities rooted at the same
                 `history/` would collide on the marker file, and the marker's `O_EXCL`
                 would silently serialise them into one seq space.

DECISION 2
  clause:        "To allocate, the authority walks ids and claims the first marker that
                 does not yet exist" (S, MUST 1) against "An authority MUST declare the
                 seq from which it claims G1, and MUST NOT claim G1 below it." (S, MUST 2)
  chosen:        The walk starts at the authority's declared G1 floor and never inspects
                 or claims a seq below it. The floor is required configuration; there is
                 no default. Seq renders in exactly four digits, so the space is
                 floor..9999 and exhaustion is a refusal.
  rejected:      (a) The walk starts at seq 0 (or 1) regardless of the declared floor,
                 the floor being only an annotation on the claim.
                 (b) On exhaustion, widen the rendering to five digits and continue.
  why:           (a) would have the store hand out bindings at seqs the authority has
                 told readers it makes no G1 claim about, while MUST 1's uniqueness and
                 monotonicity still nominally apply to them — the store would be issuing
                 bindings it disclaims, and MUST 2 gives the floor no other operational
                 meaning than "the store does not bind below here". (b) would mint
                 locators the citation format in S does not define; `relay-NNNN` is
                 four-wide, and a citation is supposed to route on the locator.
  consequence:   Observable: with floor 32 the first binding is `<auth>-0032` and
                 `history/` contains no marker below 0032. Under (a) the first binding
                 is `<auth>-0000`. Under (b) the store keeps accepting past 9999 and
                 emits a locator shape no reader was told to expect.

DECISION 3
  clause:        MUST 1: "each id owns a persistent allocation marker — **an empty file**
                 `history/relay-NNNN` created with `wx`/`O_EXCL`", against MUST 6: "The
                 ledger keeps `(authority, seq, digest)` and answers with it", and
                 *Named failures*/delete: "the marker is the ledger entry that persists".
  chosen:        Two artifacts per id. `history/<loc>` is the allocation marker: created
                 empty with `O_EXCL`, never written to again, never removed.
                 `history/<loc>.bind` is the ledger entry: it carries authority, seq,
                 content identity, extent and the binding time, and it is created
                 crash-atomically and create-or-fail. Allocation is the marker's
                 creation; **binding is the `.bind` creation**.
  rejected:      One artifact: `history/<loc>` is created already containing the ledger
                 line, by an atomic exclusive create, fusing allocation and binding into
                 a single act.
  why:           The rejected rule contradicts MUST 1's own words — the marker is
                 specified as *an empty file created with `wx`*, and a file linked into
                 place with a ledger line in it is neither. The fused form is otherwise
                 attractive (it removes the allocated-but-unbound window entirely), and I
                 note that S's "the marker is the ledger entry that persists" reads as if
                 it expects the fused form; but MUST 1 is the clause that specifies the
                 mechanism, and it says empty. Going the other way — writing the ledger
                 line *into* the already-created empty marker — was rejected too: MUST 8
                 requires every write that establishes a binding to be create-or-fail,
                 and appending into a file that already exists cannot be.
  consequence:   Observable: two files per id in `history/`, and a real window in which a
                 marker exists with no `.bind` beside it — an id allocated and not bound.
                 Under the fused rule that window does not exist and `history/` holds one
                 file per id. What is *not* different: an id can still never be rebound,
                 because the marker is what `O_EXCL` tests.

  settled elsewhere, not a decision (two of them, both about ordering):
  * Whether the binding can complete before the bytes are stored. MUST 6's crash case
    settles it — "Ledger committed, bytes never written: the id is bound and the content
    unreachable" — so binding *is* the ledger commit, and A's *Binding* definition
    ("completed at a single moment") is satisfied by the `.bind` create.
  * Whether "the bytes are durable before the name that points at them appears" (MUST 8)
    means the ledger entry, which would force payload-first and contradict *Named
    failures*' "the ledger MUST be written **before** the record". MUST 8's own next
    clause settles it — "which requires flushing the record and **the directory entry
    that names it**" — so the name is the object's directory entry, and ledger-then-record
    stands.

---

## Stage 2 — the digest domain and the deposit path

DECISION 4
  clause:        A, 9.3: "A store MUST store bound-content octet for octet as it arrived.
                 It MUST NOT trim, pad, append to, re-encode, or otherwise normalise it."
                 — against A, 9.2's "before any framing a store may add" and S's K1,
                 "The receiving store writes the deposit header (`deposit.ts:102`) and
                 `loadStore` splits it off again (`store.ts:127-133`)".
  chosen:        The store's framing — `deposited-by`, binding time, extent, content
                 identity — lives in the ledger entry alone. The object file holds
                 exactly the candidate's octets and nothing else, so the artifact
                 boundary (K1) is the object file's whole extent and needs no splitting
                 rule.
  rejected:      The store prepends its deposit header to the stored file, as the legacy
                 store does, and bound-content is recovered on read by splitting it off.
  why:           The rejected reading appends to what is stored, which 9.3 forbids in
                 those words, and it makes bound-content a function of the store's own
                 splitting rule rather than of the offer. S calls K1 "our only
                 100%-failure-rate decision" and A's stated invariant is that "the
                 store's metadata is outside it, and the octets are digested exactly as
                 they arrived".
  consequence:   Observable: `objects/<loc>.rec` is byte-identical to what the sender
                 offered — `cmp` against the sender's copy succeeds — and its size on
                 disk equals the recorded extent. Under the rejected rule the file is
                 longer than the extent and a reader cannot recover the record without
                 knowing this store's header format.

DECISION 5
  clause:        A, *Candidate*: "A candidate has an extent because it was delivered as
                 one — extent is a property of the offer, never derived from the octets."
                 A, 9.1: "**A store MUST NOT derive extent from the content of a
                 candidate**, and MUST record the extent at binding."
  chosen:        `deposit()` takes `extent` as a required argument beside the octets. If
                 the declared extent disagrees with the number of octets delivered, the
                 candidate is refused at admission, before anything is allocated. The
                 declared extent is what is recorded at binding, and a read re-checks the
                 stored object's size against it.
  rejected:      (a) `deposit(octets)` alone, with extent taken as `len(octets)`.
                 (b) Accept a disagreeing extent and bind the first `extent` octets.
  why:           (a) makes extent a function of the octets, which is what 9.1 forbids;
                 under it 9.1 has no content and the refusal its last sentence requires
                 could never fire. (b) contradicts A's *Bound-content* — "every octet of
                 the candidate that was admitted, in order, and nothing else" — by
                 admitting octets and then discarding them, invisibly to the sender.
                 Comparing the declared extent against the delivered octet count is not
                 *deriving* extent: the declared value still governs and a disagreement
                 is a defect in the offer, not an input to a computation.
  consequence:   Observable: an offer with a wrong extent is refused distinguishably and
                 no marker is created. Under (a) the same offer binds silently at
                 whatever length arrived, and the sender never learns the offer was
                 malformed.

DECISION 6
  clause:        A, *Header block*: "The octets of bound-content above its first blank
                 line" (restating S line 318, "the bytes above the first blank line").
  chosen:        Lines are LF-delimited. A line is blank when it holds no octets, or the
                 single octet CR. The header block is the octets before the first blank
                 line. If bound-content holds no blank line, all of it is the header
                 block. `@p-e/x0` is stripped from the first line before fields are
                 read; a field is `name: value` on one line, and a field name repeated in
                 the header block is a refusal.
  rejected:      (a) A line of only whitespace — spaces and tabs included — is blank.
                 (b) Bound-content with no blank line has no header block, so no fields.
  why:           (a) would let an indented line of two spaces terminate the header, so a
                 sender who indented would silently lose every field below it, `id:`
                 among them — the one field S says the store MUST check. A fixes the word
                 "blank", and a line with octets in it is not empty. (b) would give a
                 one-line record no fields at all, so the envelope check S requires would
                 not happen on precisely the records most likely to be hand-written.
  consequence:   Observable: for `@p-e/x0\nid: a-0001\n<two spaces>\nparent: a-0000\n\nbody`
                 the chosen rule sees both fields and (a) sees only `id:`. For a record
                 with no blank line the chosen rule checks its `id:` and (b) does not.

DECISION 7
  clause:        S, *Envelope convention*: "The envelope `id:` inside the digested bytes
                 is the only identity a chain can pin; it is OPTIONAL but, when present,
                 MUST be checked against the store-assigned id (optional-and-checked)."
                 A, *Declared id*, settles the direction but not the verdict: "Whether
                 the two must agree is not settled by this document."
  chosen:        A header-block `id:`, when present, is compared to the store-assigned
                 locator; on disagreement the candidate is refused. The seq already
                 allocated is **not** reclaimed: the marker stays, and that id is
                 abandoned — allocated, never bound.
  rejected:      (a) Keep walking until the allocator reaches the declared id, so the
                 record receives the identity it asked for.
                 (b) Bind anyway and record the disagreement as store metadata.
  why:           (a) computes record identity from bound-content, which A's amendment to
                 MUST 3 forbids in terms — "an identity is allocated, never computed from
                 bound-content" — and it is impossible whenever the declared id is below
                 the floor or already bound. (b) empties "MUST be checked" of any
                 consequence; a check whose only outcome is a note is not a check, and
                 the store would knowingly serve a record under an identity its own
                 pinnable identity contradicts.
  consequence:   Observable: a candidate declaring `id: a-0007` when the walk had reached
                 0006 is refused, and `history/a-0006` is left holding a marker with no
                 `.bind` beside it — visibility UNKNOWN, and exactly the "ids being
                 abandoned once taken" S reports `deposit.ts` doing. Under (a) it binds at
                 0007 and 0006 is skipped for good; under (b) it binds at 0006 with its
                 envelope naming another id.

DECISION 8
  clause:        S, MUST 5: "`parent`, when present, is scoped to the same authority.
                 Cross-authority references are **observations** and MUST be labelled as
                 such", against S, MUST NOT: "MUST NOT make deposit depend on the parent
                 being present and readable."
  chosen:        A header-block `parent:` must be a locator in this authority's
                 namespace. The check is lexical only. A `parent:` naming another
                 authority is refused, with the refusal naming `ref:` as the field for an
                 observation; `ref:` is accepted, stored, and never resolved. The
                 parent's presence is never tested — not at deposit, not at read.
  rejected:      (a) Accept any `parent:` and treat a foreign one as an observation.
                 (b) Resolve `parent:` at deposit and refuse a dangling one.
  why:           (a) leaves a cross-authority reference sitting unlabelled in the field S
                 says "implies membership in the same chain"; MUST 5 requires the label,
                 and a store that silently reinterprets the field has not produced one.
                 (b) is the MUST NOT verbatim — it makes writing depend on our access.
  consequence:   Observable: `parent: other-0001` is refused, `ref: other-0001` is
                 accepted unresolved, and `parent: a-0999` at an unallocated 0999 is
                 accepted, because deposit never looks.

DECISION 9
  clause:        S, MUST 8: "Every write that establishes a binding MUST be crash-atomic
                 AND create-or-fail... `rename` is atomic and replaces silently, so an
                 implementer reading 'atomic' alone reaches for the call that reopens the
                 `relay-0183` rebinding path while closing the durability hole."
  chosen:        Write the payload to a temp file, `fsync` the file descriptor, `link()`
                 it to its final name, `fsync` the containing directory, unlink the temp.
                 `EEXIST` from `link` is the create-or-fail arm. Used for both the ledger
                 entry and the object.
  rejected:      (a) `open(final, O_CREAT|O_EXCL)` and write the bytes in place.
                 (b) Write a temp file and `rename` it into place.
  why:           (a) is create-or-fail but not crash-atomic: a crash mid-write leaves a
                 short record under a name that already exists, and MUST 8 requires "a
                 crash leaves either no record at that id or a complete one". (b) is the
                 call MUST 8 names as reopening `relay-0183`.
  consequence:   Observable: under (a) a reader can find a truncated object at a bound id
                 whose recorded digest does not match it — the state A 10.3 declines to
                 rule on. Under (b) a second deposit at a bound id replaces the first
                 with no error. Under the chosen rule neither state is reachable.

---

## Stage 3 — the read path

DECISION 10
  clause:        A, 10.4: "On a read, admission (9.2) is tested before verification
                 (10.1). Where both would fail, the admission failure is what the store
                 reports." — against A, 9.2's own scoping: "Admission is tested on the
                 candidate as delivered, before any framing a store may add."
  chosen:        On a read the stored bound-content stands in for the candidate and 9.2
                 is re-run over it. On failure the read returns `ADMISSION_FAILED` naming
                 the 9.2 reason, returns no bound-content, and does **not** report the
                 digest comparison even when that also failed.
  rejected:      (a) 9.2 is admission-time only — "as delivered" scopes it to a candidate,
                 and a read therefore performs verification (10.1) alone.
                 (b) Run both tests and report both outcomes.
  why:           (a) makes the whole of 10.4 dead text: it orders two tests on a read,
                 and if only one of them exists on a read there is nothing to order.
                 (b) contradicts 10.4's second sentence in terms.
  consequence:   Observable: an object whose leading octets were overwritten reads
                 ADMISSION_FAILED, and the caller is not told the digest also disagreed —
                 strictly less diagnostic information than (b) offers. That is the
                 clause's instruction rather than my preference, and I note the cost.
                 Under (a) the same object reads as a digest mismatch. Because 9.3 makes
                 the store keep the octets as they arrived, this branch is reachable only
                 when something outside the store changed them — which is exactly when it
                 fires.

DECISION 11
  clause:        A, 10.3: "**OPEN.** The verdict when the recorded and recomputed content
                 identities disagree is not defined by this document." — with its gloss:
                 "An open verdict is not a permission. Where another clause states a MUST
                 that applies to the same read, that clause governs, and no behaviour is
                 admissible under 10.3 that another MUST forbids."
  chosen:        The read fails with verdict `DIGEST_MISMATCH`. No bound-content and no
                 citation are returned; both digests are named; visibility is reported as
                 PRESENT, because the octets are here.
  rejected:      (a) Return the octets with the disagreement flagged, and let the caller
                 decide.
                 (b) Report the record as absent — KNOWN_MISSING or UNKNOWN.
                 (c) Treat the recorded value as authoritative and re-record it over the
                 recomputed one.
  why:           This is the one clause that is explicitly open, so the choice is not
                 recovered from the text; the envelope of surrounding MUSTs is. (a) is
                 shut out by 10.1 with 10.5 — a store "MUST NOT report [as] verified"
                 what it has not verified, and returning bound-content from a read is how
                 this store reports a record; the amendment's own gloss says an open
                 verdict is not a permission. (b) is MUST 6 verbatim: "a failure MUST NOT
                 be reported as absence". (c) rewrites a ledger entry, which MUST 4
                 forbids: "a bound `(authority, seq)` never changes its digest".
  consequence:   Observable: corrupt an object, then read — the caller gets a
                 distinguishable failure and no bytes. Under (a) they get corrupt bytes;
                 under (b) they conclude nothing was ever bound at that id; under (c) the
                 store's own ledger silently follows the corruption.
  not a blocker: 10.3 states no requirement, so no code can fail to satisfy it; it left
                 a verdict I had to pick rather than a wall. Recorded here so the pick is
                 not silent (CONTRACT §5).

DECISION 12
  clause:        S, MUST 6: "Visibility state is exposed honestly: `PRESENT` /
                 `KNOWN_MISSING` / `UNKNOWN`" with its two named cases — against S, *The
                 legacy authority*: "What separates them is whether a surviving record
                 names the id in a `parent:` or `ref:` **header**".
  chosen:        Visibility is decided from this store's own artifacts alone:
                 marker + `.bind` + object → PRESENT; marker + `.bind`, no object →
                 KNOWN_MISSING (answered with the recorded digest and extent); marker, no
                 `.bind` → UNKNOWN; no marker → UNKNOWN. An id named in some other
                 record's `parent:`/`ref:` header does not move any of these.
  rejected:      Carry legacy's reference-based predicate into v1: an id this store never
                 bound, but named in a surviving record's `parent:` or `ref:` header, is
                 KNOWN_MISSING rather than UNKNOWN.
  why:           MUST 6 defines KNOWN_MISSING as the state where "the ledger keeps
                 `(authority, seq, digest)` and answers with it". For an id this store
                 never allocated there is no digest to answer with, so the rejected rule
                 reports a binding the store does not have — MUST 6's "a client must
                 never confuse *content removed* with *no binding*", run backwards. The
                 legacy predicate exists because legacy has no ledger and must infer from
                 references; v1 has one. It would also make a verdict about one id change
                 when an unrelated record is deposited, which is the `reference.ts`
                 verdict-flip S flags under *Migration* and what "MUST NOT present a
                 vantage-limited verdict... as a property of the record" forbids.
  consequence:   Observable: the id abandoned by DECISION 7 reads UNKNOWN, and stays
                 UNKNOWN after a later record deposits `parent: <that id>`. Under the
                 rejected rule that later deposit flips it to KNOWN_MISSING with no
                 digest to show for it.

  minor, recorded for completeness rather than as a fork: a stored object whose size
  disagrees with the recorded extent is reported as `EXTENT_MISMATCH`, after admission
  (10.4 orders admission first) and before the digest comparison, because 9.1 makes
  extent part of what is recorded at binding and a store that cannot recover it is not
  entitled to bind. Any such object also fails the digest comparison, so the choice
  changes the label and not whether the read fails.
