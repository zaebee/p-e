# ADR-4 — a CRLF blank line ends the header block

Status: **proposed.** Recorded 2026-09-14 by bee.claude, from a defect Jules found on PR #225.
Attacked once, by a subagent given the diff and not the reasoning; the second section below
is what that attack found and what changed. Not adopted until a party that did not write it
has attacked the revised form (methodology rule 14).

## The defect

This store decided where a record's header block ends in three places, each with its own
`indexOf("\n\n")`: `headerBlock` in `store.ts`, `prose` in `reference.ts`, and
`strandedHeaders` in `headers.ts`. A CRLF record contains no `\n\n`, so it had no blank
line at all, and **its whole body was header block.**

That would have been merely strict if field parsing agreed. It did not. Fields were read with
`/^field:(.*)$/m`, and a JavaScript `$` stops before `\r`, so a value quoted in a CRLF body
read back clean. The result was Audit-03 F4 again, by another route — each reproduced by a
test before the fix:

- the read path adopted a quoted `kind:` and `parent:` for a record that had none;
- `depositLocal` stored a CRLF record as `authored` on the strength of a `from:` quoted in its
  body, when its header named no sender;
- `appendRelay` refused a well-formed CRLF deposit because its body quoted an `id:`;
- `check-references` saw no prose in a CRLF record, so every id cited in its body went
  uncounted.

PR #225 labelled this HIGH and "header spoofing". The provenance case is the serious one; the
sender writes every byte and `from:` is always the sender's claim, so nothing here lets one
party pass as another. It is the F4 defect class, not an identity forgery.

## What the attack found

The first form of this repair fixed the boundary and nothing else. The attack reproduced
three further holes, all in the same class:

1. **A blank line before `@p-e/x0` switched off every deposit check.** The store keeps
   `trimStart()` of what it is given, and the checks read the untrimmed input, so a leading
   blank line put the blank at offset 0 and every check saw an empty header block. A declared
   `id:` the store would not assign was accepted, a `PLACEHOLDER` digest was stored, and a
   wrong digest was reported as `NO_CLAIM` instead of `DIVERGES`. This was already open for
   a leading `\n\n` on `main`; **the first form of this repair widened it** to `\r\n\r\n` and
   `\n\r\n`.
2. **A bare CR or U+2028 still broke lines for field parsing.** Under `m`, JavaScript's `^`
   and `$` also break at a lone `\r` and at U+2028/U+2029. A CR-only record has no blank line
   under any rule here, so its whole body is header block — and its quoted `from:` still read
   as a field and deposited as `authored`. Open on `main` and after the first form alike.
3. **`relay-put` checked a parent digest quoted in the body.** `checkParentDigest` in
   `scripts/put-relay.ts` scanned the whole record, so a record naming no parent was refused
   for quoting another's `parent:` and `parent-sha256:`. Open on `main`.

## The choice

A line ends at LF, and **a CR immediately before that LF belongs to the ending rather than to
the line.** A blank line is a line with nothing else in it. So `\n\n`, `\r\n\r\n`, `\n\r\n` and
`\r\n\n` all end the header block; a line carrying a space, a tab, or a CR that is not directly
before its LF does not. **The same rule decides where a field's value ends**, so a bare CR or
U+2028 is part of the line it sits in and cannot start a field.

Implemented once in `store.ts`: `firstBlankLine` for the boundary, `fieldValue` for a field.
`headerBlock`, `header()`, `prose`, `strandedHeaders`, the four checks in `deposit.ts` and
`checkParentDigest` in `put-relay.ts` all go through them, and the deposit checks read the
header block of the bytes the store will keep — `trimStart()` of the input — rather than of
the input itself.

## The readings this takes and sets aside

AMENDMENT-v3 defines a blank line as *"a line containing no octets. A line carrying whitespace
is not blank"* — which fixes what a blank line contains and never says what delimits a line.
Two earlier builds read that gap, in opposite directions:

- **Phase B** (`docs/experiments/phase-b/build/DECISIONS.md`, DECISION 6) chose *"Lines are
  LF-delimited. A line is blank when it holds no octets, or the single octet CR"* — the same
  blank-line rule as this record. `phase-c/AUDIT.md` SF-1 records its implementation counting
  "only an empty line or a bare `\r`" as blank. How that build reads a field value's trailing
  CR was not checked for this record.
- **Phase B2** (`docs/experiments/phase-b2/build/DECISIONS.md`, DECISION 11) chose LF alone:
  a `\r\n\r\n` is not blank and a CRLF record carrying a checked field is refused. Its author
  called both readings defensible and recorded the disagreement as DIVERGENCE D5 — *"The
  sharpest divergence in this list. It is not a difference of report but of admission."* This
  record takes the reading D5 calls `other`.

Why this one, for this store:

1. **It makes the store agree with itself, now in both halves.** Boundary and fields follow one
   line rule. Before, fields followed JavaScript's, which is neither reading.
2. **It changes no record's meaning.** Measured: 0 of 1,113 records contain a `\r`, U+2028 or
   U+2029; every parsed field of every record is identical to `main`'s; and `check-headers`,
   `check-references` and `check-continuity` print byte-identical output.
3. **It adds no normalisation, and the digest is unchanged.** The digest is still over what
   the store writes after its `---` separator, and is identical to `main`'s on every record.
   That is not a claim that AMD 9.3 holds: CONFORMANCE-GAP-1 already marks 9.3 **no** —
   "`trimStart` twice in `deposit.ts`, plus an appended newline" — and this leaves that as it
   was. The checks now read the trimmed bytes because those are the bytes stored.

## What this changes for admission

One narrow case. A header line carrying a bare CR inside its value — `from: alice\rkind: x`
— used to read as two fields, `from: alice` and `kind: x`. It now reads as one `from:` whose
value contains whitespace, which `header()` refuses as unparseable, so such a record is
refused at deposit and would fail `loadStore` if placed on disk. No held record has this
shape.

## What this does not settle

- **Divergence D5 stands.** An implementation built to the Phase B2 reading refuses records
  this store binds. That is a known difference between two conforming readings, not a bug in
  either, and the amendment still has to choose.
- **9.3 is still open**, as above.
