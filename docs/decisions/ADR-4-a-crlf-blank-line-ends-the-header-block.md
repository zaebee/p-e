# ADR-4 — a CRLF blank line ends the header block

Status: **proposed.** Recorded 2026-09-14 by bee.claude, from a defect Jules found on PR #225.
Not adopted until a party that did not write it has attacked it (methodology rule 14).

## The defect

This store decided where a record's header block ends in three places, each with its own
`indexOf("\n\n")`: `headerBlock` in `store.ts`, `prose` in `reference.ts`, and
`strandedHeaders` in `headers.ts`. A CRLF record contains no `\n\n`, so it had no blank
line at all, and **its whole body was header block.**

That would have been merely strict if field parsing agreed. It does not. `header()` reads
`^field:(.*)$` with the `m` flag, and a JavaScript `$` stops before `\r`, so a value quoted in
a CRLF body read back clean. The result was Audit-03 F4 again, by another route — all three
reproduced by a test before the fix:

- the read path adopted a quoted `kind:` and `parent:` for a record that had none;
- `depositLocal` stored a CRLF record as `authored` on the strength of a `from:` quoted in its
  body, when its header named no sender;
- `appendRelay` refused a well-formed CRLF deposit because its body quoted an `id:`.

And `check-references` saw no prose in a CRLF record, so every id cited in its body went
uncounted.

PR #225 labelled this HIGH and "header spoofing". The provenance case is the serious one; the
sender writes every byte and `from:` is always the sender's claim, so nothing here lets one
party pass as another. It is the F4 defect class, not an identity forgery.

## The choice

A line ends at LF, and **a CR immediately before that LF belongs to the ending rather than to
the line.** A blank line is a line with nothing else in it. So `\n\n`, `\r\n\r\n`, `\n\r\n` and
`\r\n\n` all end the header block; a line carrying a space, a tab, or a CR that is not directly
before its LF does not.

Implemented once, as `firstBlankLine` in `store.ts`, which the other two files now import.

## The reading this sets aside

AMENDMENT-v3 defines a blank line as *"a line containing no octets. A line carrying whitespace
is not blank"* — which fixes what a blank line contains and never says what delimits a line.

The Phase B2 build read that gap the other way: LF alone delimits a line, so a `\r\n\r\n` is
not blank and a CRLF record carrying a checked field is refused
(`docs/experiments/phase-b2/build/DECISIONS.md`, DECISION 11). Its author called both readings
defensible, pinned its own, and recorded the disagreement as DIVERGENCE D5 — *"the sharpest
divergence in this list… a difference of admission."* This record takes the reading D5 calls
`other`.

Why this one, for this store:

1. **It makes the store agree with itself.** Field parsing already treats CR as part of a line
   ending. The LF-only reading would have to change `header()` as well, so that
   `parent: relay-0001\r` read as `relay-0001\r` and was refused — a change to admission, not
   a repair.
2. **It changes no record's meaning.** Measured on this branch: 0 of 1,113 records contain a
   `\r`, and `check-headers` and `check-references` print identical output before and after.
3. **The digest is untouched.** It binds the bytes after the store's `---` separator, which
   the store writes itself, in LF. Nothing here normalises a byte, so AMD 9.3 holds.

## What this does not settle

- **Divergence D5 stands.** An implementation built to the Phase B2 reading refuses records
  this store binds. That is now a known difference between two conforming readings, not a bug
  in either, and the amendment still has to choose.
- **A bare CR is still a line ending to `header()`.** In JavaScript, `^` and `$` under the `m`
  flag also break at a lone `\r` (and at U+2028/U+2029), so `@p-e/x0\rkind: a` reads `kind`
  as a field, while this record says a bare CR is part of a line and cannot start one. Not
  changed here: no record in the corpus contains a CR, and making `header()` agree is the
  admission change point 1 declines.
