# COVERAGE.md — every MUST in both documents

Every MUST, MUST NOT and normative "must"/"may not" I could find in `SPEC.md` and
`AMENDMENT.md`, in document order. Compound MUSTs are split where their parts can
independently succeed or fail, because a clause that is half implemented and reported as
IMPLEMENTED is the failure §5 exists to prevent.

`NOT APPLICABLE` always names the CONTRACT §2 exclusion that covers it.
Evidence is `store.py:LINE` or a test name in `test_store.py`. All 41 tests pass
(`python3 test_store.py` -> `41/41 passed`).

Totals: **69 clauses — 59 IMPLEMENTED, 2 NOT IMPLEMENTED, 7 NOT APPLICABLE, and 1
split** (MUST 6d: NOT APPLICABLE as an operation, IMPLEMENTED as a state). The five
MAY entries below are listed for completeness and carry no verdict, being no obligation.

---

## SPEC.md — front matter and kernel

**SPEC:18 "The narrowing is deliberate; stating it is not optional."**   NOT APPLICABLE
  reason:   An obligation on the document's authors to state their scope, not on a store.
            Discharged anyway by NOTES.md, which states the scope I built to.
  evidence: NOTES.md, "What this is".

**SPEC:88-94 "Availability of the named bytes is inside the kernel ... the requirement is
that the named bytes be obtainable by the party asked to reproduce."**   NOT APPLICABLE
  reason:   SPEC:61-68 disclaims this section as normative for implementations in its own
            words — "This section and the one above it constrain no requirement below ...
            An implementer can build from the MUST/MAY/MUST NOT sections alone and lose
            nothing." It is a claim about readers of the spec, and SPEC:256-262 confirms
            it is not a requirement that records be servable.
  evidence: SPEC:61-68, SPEC:256-262.

**K3 — the hash function is SHA-256.**   IMPLEMENTED
  reason:   The only kernel convention that reappears in a MUST (MUST 3). Content identity
            is `hashlib.sha256(...).hexdigest()` and nothing else.
  evidence: store.py:191-193; test `k3_the_hash_function_is_sha256`.

**K1, K2, K4, K5, K6.**   NOT APPLICABLE
  reason:   SPEC:62-63 — "Of K1-K6 only K3 reappears, in MUST 3; K4's manifest format is
            named and never used; no MUST cites the kernel". K1's artifact boundary is
            nonetheless settled de facto by AMD *Candidate* (the offer carries its extent),
            and K6's spec-version name `p-e/core 0.1` is recorded in the authority config.
  evidence: store.py:302 (`"spec_version": "p-e/core 0.1"`).

---

## SPEC.md — the MUST section

**MUST 1a — "Each authority binds `(authority_id, seq)` uniquely, monotonically, and never
reuses a seq."**   IMPLEMENTED
  reason:   Every id is claimed by an `O_EXCL` create of a marker that is never removed, so
            no seq is issued twice and issued seqs strictly increase.
  evidence: store.py:339-348; tests `must1_allocation_is_unique_monotone_and_never_reuses`,
            `must1_sixteen_racing_writers_get_sixteen_distinct_ids`.

**MUST 1b — "Allocation MUST be settled by an atomic exclusive commit, never by reading the
current maximum."**   IMPLEMENTED
  reason:   `_allocate` walks from the floor and returns on the first successful
            `O_WRONLY|O_CREAT|O_EXCL`. There is no read of any maximum anywhere in the
            allocator.
  evidence: store.py:339-348, store.py:207-224; test
            `must1_allocation_never_reads_a_maximum` (asserts structurally that the
            allocator body contains no `max(`/`sorted(`), and the 16-writer race test.

**MUST 1c — allocation mechanism: "an empty file `history/relay-NNNN` created with
`wx`/`O_EXCL` ... claims the first marker that does not yet exist".**   IMPLEMENTED
  reason:   Implemented literally, including the empty payload and the first-free walk.
  evidence: store.py:339-348, store.py:20 (layout); test
            `must1_marker_persists_so_an_id_cannot_be_rebound` inspects `history/`.

**MUST 1d — "The marker persists beyond deletion of the record, so a deleted id is not
freed and cannot be rebound."**   IMPLEMENTED
  reason:   Nothing in the store ever unlinks a marker — there is no code path that
            removes one. Exercised by removing a record file out of band and confirming the
            id is still refused to the allocator. The *deletion operation* itself is NOT
            APPLICABLE (§2 excludes deletion); the marker's persistence is not.
  evidence: store.py has no `unlink` of `history/` (only store.py:252, of a staging file);
            test `must1_marker_persists_so_an_id_cannot_be_rebound`.

**MUST 1e — "The binding write keeps its own `wx`; the marker guards allocation, the record
`wx` guards content."**   IMPLEMENTED
  reason:   Two separate guards, as the clause requires: the ledger entry is `O_EXCL` and
            the record name is created by `link()`, which fails `EEXIST`.
  evidence: store.py:421 (ledger `_create_exclusive`), store.py:435-437 (`os.link` ->
            `ALREADY_HELD`); test `must8_create_or_fail_a_write_to_a_held_id_fails`.

**MUST 2 — "An authority MUST declare the seq from which it claims G1, and MUST NOT claim
G1 below it."**   IMPLEMENTED
  reason:   `g1_floor` is declared once at store creation into an `O_EXCL` config and
            cannot be redeclared; `claims_g1(seq)` is False below it; allocation starts at
            it. See DECISION 17.
  evidence: store.py:279-306, store.py:333-336, store.py:339-341; test
            `must2_authority_declares_a_floor_and_claims_nothing_below_it`.

**MUST 3a — "Record content is identified by `sha256(bytes)`, stable across ids."**
  IMPLEMENTED
  reason:   `bytes` means bound-content per AMD. The same octets under two ids produce the
            same content identity.
  evidence: store.py:191-193, store.py:390; test
            `must3_content_identity_is_sha256_of_bound_content_and_stable_across_ids`.

**MUST 3b (as amended) — "record identity MUST NOT derive from content identity — an
identity is allocated, never computed from bound-content".**   IMPLEMENTED
  reason:   Satisfied by construction: `_allocate()` takes no arguments and never sees the
            candidate or its digest. The amendment states of itself that "**A store cannot
            observe it**", so the evidence below is the strongest available and is not a
            proof; see DECISIONS.md *Blockers*.
  evidence: store.py:339-348 (signature and body); test
            `amd_must3_record_identity_does_not_derive_from_content_identity` (identical
            content gets different identities).

**MUST 3c (amended) — "a store's deduplication MUST NOT be switched off for [records with a
declared id]."**   IMPLEMENTED
  reason:   There is one storage path and it is unconditional; nothing branches on the
            presence of a declared `id:` field.
  evidence: store.py:430-438; test
            `amd_must3_deduplication_is_not_switched_off_for_declared_id_records`.

**MUST 4 — "A conforming authority's ledger is non-rewindable: a bound `(authority, seq)`
never changes its digest."**   IMPLEMENTED
  reason:   The ledger entry is created `O_EXCL` and never reopened for writing by any code
            path; a second binding of the same seq fails rather than replaces. Prevention,
            not detection, as the clause requires.
  evidence: store.py:415-424; test `must4_a_bound_seq_never_changes_its_digest`.

**MUST 5a — "`parent`, when present, is scoped to the same authority."**   IMPLEMENTED
  reason:   A `parent:` value that is not a locator of this authority refuses the candidate
            at admission.
  evidence: store.py:442-457; test `must5_parent_is_scoped_to_the_same_authority`.

**MUST 5b — "Cross-authority references are observations and MUST be labelled as such."**
  IMPLEMENTED
  reason:   They travel in a structurally different field (`observes:`) and are reported
            tagged `kind: OBSERVATION, in_chain: False`, never as a parent edge. See
            DECISION 9.
  evidence: store.py:602-620; test `must5_cross_authority_references_are_labelled_observations`.

**MUST 6a — "Visibility state is exposed honestly: `PRESENT` / `KNOWN_MISSING` /
`UNKNOWN`."**   IMPLEMENTED
  reason:   Exactly those three values, computed from the ledger and the record's presence.
            Mapping of the four distinguishable conditions onto three values: DECISION 8.
  evidence: store.py:475-509; tests `must6_present_known_missing_and_unknown`,
            `must6_an_abandoned_allocation_is_unknown_not_bound`.

**MUST 6b — "A quiet window MUST NOT be reported as a failure".**   IMPLEMENTED
  reason:   `ENOENT` on the record path returns `KNOWN_MISSING`/`UNKNOWN` and never raises;
            no absence path produces an error.
  evidence: store.py:478-484, store.py:511-518.

**MUST 6c — "a failure MUST NOT be reported as absence".**   IMPLEMENTED
  reason:   Only `FileNotFoundError` is treated as absence; every other `OSError` becomes a
            `StoreFailure` naming the errno.
  evidence: store.py:481-486, store.py:465-467, store.py:515-517; test
            `must6_a_failure_is_not_reported_as_absence` (EACCES via `chmod 000`; skipped
            under uid 0, and the run was uid 1001).

**MUST 6d — deletion case: "The ledger keeps `(authority, seq, digest)` and answers with
it; the payload reads `KNOWN_MISSING`."**   NOT APPLICABLE *(operation)* /
IMPLEMENTED *(state)*
  reason:   §2 excludes deletion, so there is no delete operation to implement. The state it
            produces — bound, digest known, octets absent — is reachable without deletion
            and is implemented and tested.
  evidence: store.py:487-490; tests `must1_marker_persists_so_an_id_cannot_be_rebound`,
            `must6_crash_between_ledger_and_payload_is_known_missing`.

**MUST 6e — crash between ledger and payload: "That state is `KNOWN_MISSING` — the digest
and the binding are known — not `UNKNOWN` and not an error."**   IMPLEMENTED
  reason:   The write order makes this window real (DECISION 3), and the read reports
            KNOWN_MISSING with the recorded digest and no error.
  evidence: store.py:415-438 (order), store.py:487-490; test
            `must6_crash_between_ledger_and_payload_is_known_missing`. Recovery from that
            state is NOT APPLICABLE (§2 excludes crash recovery) — the store reports it and
            does not repair it.

**MUST 7 — "The absence of a witness is reported as absence, never as 'no evidence
found'."**   IMPLEMENTED
  reason:   `WitnessReport.status` is the literal value `ABSENT`, a field rather than an
            empty container to be interpreted. DECISION 10.
  evidence: store.py:676-704, store.py:53; test
            `must7_absence_of_a_witness_is_reported_as_absence`.

**MUST 8a — crash-atomic: "a crash leaves either no record at that id or a complete one".**
  IMPLEMENTED
  reason:   The payload is written to a staging file and `link()`ed into place, so a name
            for an id never points at partial octets. Verified as syscall structure and by
            fault injection; **not verified as durability** — see MUST 8c.
  evidence: store.py:227-253; tests `must8_crash_leaves_no_partial_record_at_that_id`,
            `must8_bytes_are_durable_before_the_name_appears`.

**MUST 8b — create-or-fail: "a write to an id already held FAILS rather than replacing what
is there."**   IMPLEMENTED
  reason:   `os.link` raises `FileExistsError`; no `os.rename` or `os.replace` appears
            anywhere in the store — the call MUST 8 warns about is absent by construction.
  evidence: store.py:245-248, store.py:435-437; tests
            `must8_create_or_fail_a_write_to_a_held_id_fails`,
            `must8_the_binding_write_is_never_rename`.

**MUST 8c — "the bytes are durable before the name that points at them appears — which
requires flushing the record and the directory entry that names it, not only the record."**
  IMPLEMENTED, with the evidence weaker than the claim
  reason:   `fsync` on the staging file, `fsync` on its directory, then `link`, then `fsync`
            on the destination directory. What is tested is the *order of the syscalls*, not
            that they achieved durability: AMD:17-19 records that this MUST has only ever
            been "verified ... as syscall structure on filesystems where `fsync` is a
            no-op", and that is exactly as far as my evidence goes too. I ran no power-loss
            test and this is the weakest claim in the store.
  evidence: store.py:227-253; test `must8_bytes_are_durable_before_the_name_appears`
            (asserts the fsyncs precede the link).

---

## SPEC.md — MUST NOT

**"MUST NOT claim a global total order across authorities without a consensus layer."**
  IMPLEMENTED
  reason:   The store has one authority and offers no cross-authority ordering API at all;
            `locators()` is documented as the `(authority_id, seq)` convention.
  evidence: store.py:570-582; test
            `may_reading_order_is_a_convention_and_no_global_order_is_claimed`.

**"MUST NOT let witnessing masquerade as ordering. A witness records a cut, and two records
inside one cut are never ordered by it."**   IMPLEMENTED
  reason:   `WitnessReport.orders_records` is a printed `False`, and attestations list
            covered leaves as a set of `covers:` fields with no ordering claim attached.
  evidence: store.py:655-704, store.py:129-130; test `mustnot_a_witness_never_orders_records`.

**"MUST NOT present a vantage-limited verdict — 'latest', 'unreferenced' — as a property of
the record."**   IMPLEMENTED
  reason:   There is no `latest()` and no `unreferenced()`. The one query of that shape is
            named `highest_seq_from_this_vantage()` and returns a seq, not a record
            property; no `ReadResult` field carries such a verdict.
  evidence: store.py:593-599, store.py:100-118; test
            `mustnot_no_vantage_limited_verdict_is_offered_as_a_record_property`.

**"MUST NOT make deposit depend on the parent being present and readable."**   IMPLEMENTED
  reason:   `_check_parent_scope` checks the *shape* of the value and explicitly does not
            stat, read or resolve the parent; the omission is commented so it is not
            "fixed" later.
  evidence: store.py:453-457; test `mustnot_deposit_does_not_depend_on_the_parent_being_present`.

**"MUST NOT silently strengthen."**   IMPLEMENTED
  reason:   Three places where strengthening was available and is refused: a witness kind is
            never inferred or upgraded (DECISION 18), independence is recorded and never
            asserted, and a record bound without a recorded content identity is never
            reported as verified (10.5).
  evidence: store.py:655-668, store.py:702-703, store.py:544-547; tests
            `mustnot_a_witness_never_orders_records`,
            `amd105_records_bound_without_a_recorded_identity_are_distinguished`.

**"MUST NOT be read as attesting that a record says what its author meant."**
  NOT IMPLEMENTED
  reason:   This is a constraint on how the *document* may be read, not a behaviour a store
            can exhibit; the nearest thing to compliance is not making the claim, which I
            have not made. I have implemented no positive mechanism and there is none to
            implement — "The interval in front of it ... has no guarantee and no detector"
            (SPEC:283-284).
  evidence: Absence of any composition or authorship claim in the API; store.py:98-118
            (`ReadResult` reports visibility and integrity and nothing about meaning).

---

## SPEC.md — citation and envelope

**"A citation ... MUST be a (locator, digest) pair, never a locator alone."**   IMPLEMENTED
  reason:   `cite()` returns a `Citation`; `resolve()` refuses anything that is not one,
            with code `BARE_LOCATOR`.
  evidence: store.py:622-641; test `citation_is_a_pair_never_a_bare_locator`.

**"crossing an authority or store boundary the citation MUST be (store identity, locator,
content digest), where store identity is the configured authority/store identifier (not a
filesystem path)."**   IMPLEMENTED
  reason:   `Citation` always carries all three, and `store_identity` comes from the
            authority config, never from `self.root`. A citation naming another store is
            refused rather than resolved locally.
  evidence: store.py:81-88, store.py:622-630, store.py:635-640; test
            `citation_detects_rebinding_and_a_foreign_store`.

**"it cannot detect rebinding (digest absent)" — the pair must detect rebinding.**
  IMPLEMENTED
  reason:   `resolve()` compares the cited digest against the ledger's and refuses `REBOUND`
            on disagreement.
  evidence: store.py:642-648; test `citation_detects_rebinding_and_a_foreign_store`.

**Envelope: "The envelope `id:` ... is OPTIONAL but, when present, MUST be checked against
the store-assigned id."**   IMPLEMENTED
  reason:   Checked on every deposit that carries the field. What to do on disagreement is
            AMD's open Q8b; I refuse and abandon the id — DECISION 7.
  evidence: store.py:400-407; test `envelope_declared_id_is_optional_and_checked_when_present`.

**Envelope: "The check is scoped to the header block ... and a header-like line quoted in a
record body is not a field and must not be adopted or rejected as one."**   IMPLEMENTED
  reason:   `field_value` reads only `header_block()`, and `header_block` stops at the first
            blank line. A body line `id: relay-9999` is neither adopted nor refused.
  evidence: store.py:156-189; test `envelope_a_header_like_line_in_the_body_is_not_a_field`.

**Envelope: "Out-of-chain is represented by omitting `parent:` — an UNSTATED predecessor,
not a claim of roothood — not by a second dialect."**   IMPLEMENTED
  reason:   `References.parent` is `None` when the field is absent, and no field, value or
            API means "root".
  evidence: store.py:602-620, store.py:139-145.

**Envelope: "`from:`/`to:` are provenance and routing claims, not cryptographic identity."**
  NOT IMPLEMENTED
  reason:   I implemented no `from:`/`to:` handling at all. The clause is a prohibition on
            treating them as identity; implementing nothing satisfies it vacuously, but I
            am recording it as not implemented rather than claiming credit — a store that
            routes on them would need the distinction and mine does not route.
  evidence: `grep -c 'from:' store.py` -> 0.

**"a declared `id:` in an authoring payload is not a claim about local identity; where an
import carries a source id it travels as explicit source metadata in an import wrapper."**
  NOT APPLICABLE
  reason:   Import is migration of an existing corpus, excluded by §2. No import wrapper is
            implemented and none is needed for a store that only accepts fresh candidates.
  evidence: n/a — no import path exists in store.py.

---

## SPEC.md — named failures and migration

**"the ledger MUST be written before the record, or an id is handed out twice."**
  IMPLEMENTED
  reason:   Marker, then ledger entry, then payload — in that order, with the referent of
            MUST 8's "name" resolved by DECISION 3.
  evidence: store.py:395-438 (the numbered comments (4)-(7) mark the order); test
            `must6_crash_between_ledger_and_payload_is_known_missing` observes the window
            the order produces.

**delete row: "Deletion removes the record but never the allocation marker".**
  NOT APPLICABLE *(operation)*; the marker half is MUST 1d above.
  reason:   §2 excludes deletion.
  evidence: see MUST 1d.

**Migration: "These must be made authority-aware while exactly one authority exists"
(`reference.ts` successors, `nextFree()`, `check-continuity`).**   NOT APPLICABLE
  reason:   §2 excludes migration of an existing corpus, and these name components of an
            existing implementation §1 forbids me to look for. The design point is native
            here regardless: every guarantee is keyed on `(authority_id, seq)`, and
            `nextFree()`'s `max(present)+1` is exactly what MUST 1b forbids and what
            `_allocate` does not do.
  evidence: store.py:339-348; test `must1_allocation_never_reads_a_maximum`.

---

## SPEC.md — MAY (recorded so the coverage is complete; none is an obligation)

**Content deduplication across ids** — taken. store.py:430-434, DECISION 13.
**Witnessing and inclusion evidence, best-effort** — taken, publishing leaves in full rather
than proof paths as SPEC:240-245 recommends. store.py:655-674.
**Key rotation / multi-key authority** — not taken. Operational, and §2 excludes the second
authority that would motivate it.
**A deterministic reading order across authorities** — taken as a documented convention
only. store.py:570-577.
**Replication and availability of bytes** — not taken.

---

## AMENDMENT.md — definitions with force

**Candidate: "extent is a property of the offer, never derived from the octets."**
  IMPLEMENTED
  reason:   `Candidate(octets, extent)` carries both, and an offer whose halves disagree is
            refused rather than reconciled. DECISION 5.
  evidence: store.py:69-75, store.py:374-379; test
            `amd91_an_offer_whose_extent_disagrees_with_its_octets_is_refused`.

**Binding: "The association, completed at a single moment, of a record identity with a
bound-content, its content identity, and its extent."**   IMPLEMENTED
  reason:   One `O_EXCL` create of a ledger entry carrying locator, content identity and
            extent is the single moment. DECISION 2 separates it from allocation.
  evidence: store.py:415-424.

**Blank line / Field / Header block.**   IMPLEMENTED
  reason:   A blank line is a zero-octet line (a line carrying `\r` or a space is not one);
            a field matches `[A-Za-z][A-Za-z0-9-]*:` and a non-field line is skipped
            wherever it appears; the header block is everything above the first blank line.
            The line terminator is undefined by the amendment — DECISION 11 chooses LF.
  evidence: store.py:35, store.py:156-181; tests `a_line_carrying_whitespace_is_not_blank`,
            `envelope_a_header_like_line_in_the_body_is_not_a_field`,
            `crlf_header_values_carry_their_trailing_cr` (which pins the cost of the
            LF-only rule: a CRLF record cannot carry a checked field).

**Refuse: "with an indication the offering party can distinguish from acceptance. Silence is
not refusal."**   IMPLEMENTED
  reason:   A refusal is a typed `Refused` with a code; acceptance returns a `Binding`.
            DECISION 16.
  evidence: store.py:57-66; every refusal test asserts on `e.code`.

**Read: "An operation that returns bound-content or any part of it. An operation that
returns only a store's own metadata ... is not a read."**   IMPLEMENTED
  reason:   `read()` is the only operation returning octets and it verifies;
            `recorded_extent()` and `visibility()` return metadata only and correctly do
            not verify.
  evidence: store.py:522-553, store.py:555-559.

---

## AMENDMENT.md — MUST 9

**9.1a — "A store MUST NOT derive extent from the content of a candidate."**   IMPLEMENTED
  reason:   The extent comes from the offer and is checked against the delivered octet
            count; nothing parses the content to find a length.
  evidence: store.py:374-379, store.py:391.

**9.1b — "MUST record the extent at binding."**   IMPLEMENTED
  reason:   `extent` is a field of the ledger entry written at the binding moment.
  evidence: store.py:415-420; test `amd91_extent_is_of_the_offer_and_is_recorded_and_recoverable`.

**9.1c — "A store that cannot recover a record's extent from its own stored form MUST
refuse the candidate at admission rather than bind it."**   IMPLEMENTED
  reason:   Checked once at open, before any candidate can be offered, so a store that could
            not would refuse everything. Mine can, two independent ways: the ledger's
            recorded extent and `stat().st_size` of the record. The refusal branch is
            therefore unreachable here, which is the correct outcome, not a gap.
  evidence: store.py:308-315, store.py:555-566; test
            `amd91_extent_is_of_the_offer_and_is_recorded_and_recoverable`.

**9.2a — "A candidate MUST begin with the octets `@p-e/x0`."**   IMPLEMENTED
  evidence: store.py:34, store.py:355-362, store.py:381-383; test
            `amd92_a_candidate_must_begin_with_the_magic_octets`.

**9.2b — "A candidate that is not valid UTF-8 — well-formed in the sense of Unicode 15.0
Table 3-7, admitting no overlong forms, no encoded surrogates and no truncated sequences —
is refused."**   IMPLEMENTED
  reason:   CPython's strict UTF-8 decoder is Table 3-7 conformant; the decoded string is
            discarded immediately. Nine ill-formed classes are tested, including both
            overlong shapes, both surrogate halves, truncation, > U+10FFFF, an invalid lead
            and a bare continuation.
  evidence: store.py:141-154; test `amd92_ill_formed_utf8_is_refused_table_3_7`.

**9.2c — "Admission is tested on the candidate as delivered, before any framing a store may
add."**   IMPLEMENTED
  reason:   `_admit` runs first in `deposit`, on the offered octets. The store adds no
            framing at all — bound-content is stored as its own file — so there is no
            framing to test before.
  evidence: store.py:381-383 (step (1), before allocation and before any write).

**9.3a — "A store MUST store bound-content octet for octet as it arrived."**   IMPLEMENTED
  evidence: store.py:227-253 (the octets are written unmodified); test
            `amd93_octets_are_stored_exactly_as_they_arrived` (CRLF, trailing spaces, tabs,
            no final newline).

**9.3b — "It MUST NOT trim, pad, append to, re-encode, or otherwise normalise it."**
  IMPLEMENTED
  reason:   No `strip`, `encode`, `rstrip` or newline fixing touches bound-content. The
            `.strip()` in `fields()` operates on a copy of a header value for comparison and
            never on stored octets.
  evidence: store.py:171-181 vs store.py:227-253; same test as 9.3a.

**9.4a — "Content identity is computed over octets, never over a decoded string."**
  IMPLEMENTED
  evidence: store.py:191-193 (`hashlib.sha256(octets)`), store.py:148-152 (decode result
            discarded); test `amd94_the_digest_is_over_octets_never_over_a_decoded_string`.

**9.4b — "A store MUST NOT substitute replacement characters for octets it cannot
represent."**   IMPLEMENTED
  reason:   Bound-content is `bytes` end to end; the only `errors="replace"` in the file is
            in the header-reference scan, which reads no bound-content out to a caller and
            writes nothing.
  evidence: store.py:191-193, store.py:507 (the one guarded use); test
            `amd94_the_digest_is_over_octets_never_over_a_decoded_string` asserts no
            `EF BF BD` in a read-back record.

---

## AMENDMENT.md — MUST 10

**10.1a — "A store MUST record the content identity at the moment of binding."**
  IMPLEMENTED
  evidence: store.py:415-424; test
            `amd101_content_identity_is_recorded_at_binding_and_verified_on_every_read`.

**10.1b — "and MUST verify it against bound-content on every read of a record bound under
this clause."**   IMPLEMENTED
  reason:   `read()` recomputes and compares on every call; there is no cache and no
            fast path. There is no partial read that could verify less (DECISION 14).
  evidence: store.py:536-553; same test, which reads three times.

**10.2 — "Verification establishes consistency with the recorded binding ... It does not
establish that the record is correct, that its author meant what it says, or that the
recorded value was honest when it was written."**   IMPLEMENTED
  reason:   An obligation not to over-claim. `VERIFIED` is scoped in the code to exactly
            "recorded == recomputed" and the API asserts nothing further; `Refused`,
            `ReadResult` and `WitnessReport` carry no correctness or authorship field.
  evidence: store.py:44-51, store.py:98-118.

**10.3a — "An open verdict is not a permission. Where another clause states a MUST that
applies to the same read, that clause governs."**   IMPLEMENTED
  reason:   The two MUSTs that apply — MUST 6 and 10.3's own PRESENT rule — both govern my
            mismatch path, which is why a mismatch is neither an error nor an absence.
            DECISION 6.
  evidence: store.py:549-553; test
            `amd103_an_integrity_disagreement_does_not_move_a_record_out_of_present`.

**10.3b — "Visibility and integrity are separate axes and MUST NOT be reported through one
vocabulary."**   IMPLEMENTED
  reason:   Two disjoint vocabularies on two fields; no value appears in both, and the
            constants are declared in separate blocks so a merge is visible.
  evidence: store.py:38-54, store.py:98-114.

**10.3c — "no store may report an integrity disagreement by moving a record out of
`PRESENT`."**   IMPLEMENTED
  reason:   Visibility is computed before and independently of the digest comparison, from
            the ledger and the record's presence alone.
  evidence: store.py:530-553 (`vis` is fixed at line 530, never revisited); test
            `amd103_an_integrity_disagreement_does_not_move_a_record_out_of_present`.

**10.3d — "MUST 6's *honestly* binds the pair, not either member."**   IMPLEMENTED
  reason:   `read()` always returns both axes; there is no call that returns one without the
            other being available on the same result.
  evidence: store.py:98-114, store.py:522-553.

**10.3 (the verdict itself, marked OPEN)** — not a MUST; resolved as DECISION 6 and listed
in DIVERGENCE.md, not claimed as settled.

**10.4 — "On a read, admission (9.2) is tested before verification (10.1). Where both would
fail, the admission failure is what the store reports."**   IMPLEMENTED
  reason:   `read()` runs `_admit` on the stored octets and returns `ADMISSION_FAILED`
            before any digest comparison. Applying a candidate-scoped test to stored octets
            is licensed by 9.3, which makes bound-content identical to the octets as
            delivered.
  evidence: store.py:538-542; test `amd104_admission_is_tested_before_verification`
            (a record that fails both reports the admission failure).

**10.5a — "A store MUST distinguish records bound with a recorded content identity from
records bound without one."**   IMPLEMENTED
  reason:   Absent `content_identity` in the ledger entry yields a distinct integrity value,
            `UNRECORDED`. DECISION 15.
  evidence: store.py:544-547, store.py:706-722; test
            `amd105_records_bound_without_a_recorded_identity_are_distinguished`.

**10.5b — "and MUST NOT report the latter as verified."**   IMPLEMENTED
  reason:   The `UNRECORDED` branch returns before any comparison, so `VERIFIED` is
            unreachable for such a record and `.verified` is False.
  evidence: store.py:544-547, store.py:112-114; same test.

**10.5c — "Recording a content identity for such a record afterwards does not bind it."**
  IMPLEMENTED
  reason:   No code path ever writes a `content_identity` into an existing ledger entry;
            ledger entries are `O_EXCL`-created and never reopened for writing.
  evidence: store.py:415-424, store.py:460-468 (read-only), store.py:706-722.

**AMD:14-19 "Known open" items — Q8b, the verdict at 10.3, whether a store may discard
octets it holds, identity continuity, MUST 8's durability.**   NOT APPLICABLE *(as
obligations)*
  reason:   The amendment states these are unresolved by it, so there is no requirement to
            implement. Each one I had to act on anyway is a decision (7, 6) or a stated
            evidence limit (MUST 8c). Identity continuity is "deliberately out of scope
            until an attestation layer exists", which §2's single-authority scope also
            excludes.
  evidence: DECISIONS.md 6 and 7; COVERAGE MUST 8c above.
