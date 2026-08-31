# NOTES.md

## The digest check

Both matched, verified with `sha256sum` before I read either document:

```
847b8971d36390cd8843da7ebe59bc3499cd8050473425eb91a4a09f30b9901c  SPEC.md
efcf6df9b3a25ad37d8db628e5d0cd497e1ad9b701c2294aae2738d453dbb2a6  AMENDMENT.md
```

Identical to the values in `CONTRACT.md` §"What you were given". I read nothing outside
`/tmp/claude-1001/phase-b2/`, used no network, and did not look for an existing
implementation.

## What this is

A single-authority append store in Python 3.13, standard library only, built from the
MUST / MAY / MUST NOT sections of `SPEC.md` as governed by `AMENDMENT.md`. Scope is
CONTRACT §2: accept a record, allocate identity, bind, persist, read back. No deletion, no
migration, no crash recovery, no second authority, no cross-authority history.

- `store.py` (722 lines) — the store.
- `test_store.py` (41 tests) — one or more per clause, named for the clause it evidences.
- `demo.py` — an end-to-end run.
- `DECISIONS.md` — 18 decisions and 6 "settled elsewhere" lines; no blockers.
- `COVERAGE.md` — 69 clauses: 59 IMPLEMENTED, 2 NOT IMPLEMENTED, 7 NOT APPLICABLE, 1 split.
- `DIVERGENCE.md` — 10 predicted divergences, plus 5 places I claim there is no room.

## What runs

```
$ python3 test_store.py     ->  41/41 passed
$ python3 demo.py           ->  deposits, cites, attests, refuses, reports visibility
```

The demo builds an authority with `g1_floor=32`, deposits at `relay-0032`…`relay-0035`,
witnesses two of them, refuses three malformed candidates, and shows `relay-0036` sitting
allocated-but-unbound after the refused envelope check.

The shape of the store, and the write order that is load-bearing:

```
authority.json   declared once, O_EXCL: authority_id, store_identity, g1_floor
history/<loc>    allocation marker, empty, O_EXCL, never removed        MUST 1
ledger/<loc>     binding: locator + content identity + extent, O_EXCL   MUST 4, 10.1
objects/<sha256> bound-content, content-addressed, deduplicated         MAY
records/<loc>    hard link to the object                                MUST 8
```

deposit: admit → header checks → **marker** → declared-id check → **ledger entry**
(fsync, fsync dir) ← the binding moment → payload to a staging file (fsync) → `link()` into
`objects/` then `records/` (fsync dirs).

`link(2)` rather than `rename(2)` is the whole of MUST 8: it is atomic *and* fails
`EEXIST` instead of replacing, which is the trap the clause spends five lines warning
about. The ledger goes before the payload because SPEC's "Named failures" makes that order
explicit, and the crash window it opens is exactly the `KNOWN_MISSING` state MUST 6
defines.

## What does not run, and what I could not test

- **Durability (MUST 8c).** I issue `fsync` on the record and on the directory entry that
  names it, in the required order, and I test that order. I did not and cannot test that
  the data survives power loss. `AMENDMENT.md` says the same of this clause in its own
  *Known open* list: verified "only as syscall structure on filesystems where `fsync` is a
  no-op". This is the weakest claim in the store and it is weak in the documents too.
- **"Record identity MUST NOT derive from content identity."** Satisfied by construction —
  `_allocate()` takes no arguments and never sees the digest — and untestable, because the
  amendment says so itself: "**A store cannot observe it** ... stated as a rule the
  allocator's construction must satisfy and not as one a peer can test."
- **Crash behaviour** is exercised by fault injection at two points, not by real crashes. A
  fault is raised where a crash would occur and the resulting on-disk state is asserted.
  Recovery from those states is out of scope (§2); the store *reports* them and never
  repairs them.
- **`MUST NOT be read as attesting that a record says what its author meant`** and
  **`from:`/`to:` are not cryptographic identity** are the two clauses marked NOT
  IMPLEMENTED. Neither has a behaviour to implement — the first constrains how the
  document is read, the second forbids a use of fields I never implemented. I have not
  claimed either as satisfied.
- **Concurrency** is tested with 16 forked processes racing to allocate (16 distinct ids,
  0 duplicates, matching the measurement SPEC MUST 1 cites). I did not test concurrent
  readers against a writer.

## The one thing I would flag to a reader

Not a blocker, but the near-miss: SPEC MUST 8 says "the bytes are durable before the name
that points at them appears", and SPEC's Named-failures table says "the ledger MUST be
written **before** the record". If the ledger entry counts as a name that points at the
bytes, those two are incompatible and nothing can be built. I resolved it by scoping "the
name" to the record's own directory entry (DECISION 3), which makes both satisfiable and
produces precisely the crash state MUST 6 goes on to define. I do not think the text forces
that resolution — it is DIVERGENCE D8 — and it is the single interpretive choice the rest
of the write path hangs from.

Separately, and found by probing my own build rather than by reading: choosing LF as the
only line terminator (DECISION 11, forced because the amendment defines a blank line's
*contents* but never a line's *end*) means a CRLF-authored record cannot carry any checked
header field — the trailing `\r` lands inside the field's value, and AMD 9.3 forbids
normalising it away. My store refuses such records; a CRLF-aware store binds them. That is
DIVERGENCE D5 and the test `crlf_header_values_carry_their_trailing_cr`.
