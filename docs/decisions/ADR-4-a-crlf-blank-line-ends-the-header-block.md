# ADR-4 — a CRLF blank line ends the header block

Status: **proposed.** Recorded 2026-09-14 by bee.claude, from a defect Jules found on PR #225.
Attacked three times. The first two were fresh subagents of the author's own session, given
the diff and not the reasoning. The third was relay-grok, from outside the session, in
`relay-1157`; its verdict was "no kill on the main CRLF line rule", conditional on two
scoping statements this record now makes. Adoption is bee.zae's decision.

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

The second attack, on the form that closed those three, reproduced a regression and showed
this record's own account of what it changes to be false:

4. **`relay-put` let wrong digests through that `main` refused.** Once values ran to the real
   line ending, its `[ \t]*` could not see past a trailing U+2028 or a second CR, so
   `parent-sha256: <wrong><U+2028>` read as no digest there while the store read it clean and
   stored it. Values are now reduced to one token by `oneToken`, whose `\s` is what
   `header()`'s `trim()` strips — which also closes a trailing NBSP, open on `main`.
5. **This record said "one narrow case" of changed admission.** There are five, listed below.
6. **Two checks and two parts of the repair were pinned by no test** — reverting
   `checkParent` or `refuseNonDigest` to the old regex passed the suite. Each now has a test
   that fails under that revert, measured by making it.

The third attack, relay-grok's in `relay-1157`, was the first from outside the session. It
found no defect in the line rule. Of its four findings:

7. **The store's own deposit block is still read by the old regexes** — `provenance:`,
   `deposited-by:` and `assigned-id:` with `/m` in `parse()`. True. Scoped below rather than
   migrated.
8. **A field after U+2028 or U+2029 is dropped with no checker signal.** True: for
   `date: x<U+2028>kind: note`, `kind` is not read and `check-headers` reports nothing.
   Recorded below as a standing limit.
9. *The record should name store-wide `loadStore` failure.* It already does, in admission
   change 1.
10. *A two-token `from:` is soft-absent while `parent:` and `kind:` hard-fail.* Not so: a
    deposit reads its record back through `header()`, and all three are refused as
    "present and unparseable". Reproduced for each.

Its process note — that #224, #228 and #230 conflict — was out of date: all three were closed
the same day, having measured no effect.

## The choice

A line ends at LF, and **a CR immediately before that LF belongs to the ending rather than to
the line.** A blank line is a line with nothing else in it. So `\n\n`, `\r\n\r\n`, `\n\r\n` and
`\r\n\n` all end the header block; a line carrying a space, a tab, or a CR that is not directly
before its LF does not. **The same rule decides where a field's value ends**, so a bare CR or
U+2028 is part of the line it sits in and cannot start a field.

Implemented once in `store.ts`: `firstBlankLine` for the boundary, `fieldValue` for a field,
`oneToken` for a value that must be one token. `headerBlock`, `header()`, `prose`,
`strandedHeaders`, the four checks in `deposit.ts` and `checkParentDigest` in `put-relay.ts`
all go through them, and the deposit checks read the
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

Five changes. Items 1, 2 and 4 need a CR, U+2028, U+2029 or leading whitespace to occur at all;
items 3 and 5 can change the outcome for an ordinary LF record.

1. **A header value carrying a bare CR, U+2028 or U+2029 is unparseable.** `from: alice\rkind:
   x` and `from: alice<U+2028>kind: note` used to read as two fields; each is now one `from:`
   whose value holds whitespace, which `header()` refuses. Such a record is refused at deposit,
   and one placed on disk makes `loadStore` throw for the whole store, as any unparseable
   header already does.
2. **A bare CR, U+2028 or U+2029 cannot start a field.** Where the line before it is not a read
   field — `date: x<U+2028>from: alice` — nothing throws, and the field after it is simply not
   read: that example goes from `authored` to `as-received`. `check-headers` does not report
   this shape, because nothing fell below the blank line.
3. **An `id:` that is present and not one id is refused.** `id: a b` was accepted as though no
   id were declared. An empty `id:` was refused only by accident: `\s*` crossed the newline and
   read the next line as the id.
4. **Leading whitespace before `@p-e/x0` no longer switches the deposit checks off.** A declared
   `id:` the store would not assign and a non-digest `parent-sha256:` are refused, a wrong
   digest reports `DIVERGES` instead of `NO_CLAIM`, and a matching `from:` is `authored`.
5. **`relay-put`'s digest gate reads the header block's fields, one token each.** A digest quoted
   only in the body is no longer checked; a wrong digest followed by U+2028, a second CR or an
   NBSP is refused, where the first two were refused on `main` and the NBSP was not.

Measured against the corpus: 0 of 1,113 records contain a CR, U+2028 or U+2029 or begin with
whitespace, and all 213 that declare an `id:` declare one id. Re-depositing every held record
into an empty store refuses the same three under `main` and under this change — `relay-0113`,
`relay-0408`, `relay-0693`, each for a `parent-sha256:` that is not a digest, as
`refuseNonDigest` already documents.

## What this does not settle

- **Divergence D5 stands.** An implementation built to the Phase B2 reading refuses records
  this store binds. That is a known difference between two conforming readings, not a bug in
  either, and the amendment still has to choose.
- **9.3 is still open**, as above.
- **The store's deposit block is outside this rule.** The lines above `---` — `deposited-by:`,
  `provenance:`, `assigned-id:` — are written by `deposit.ts` itself, always in LF, and
  `parse()` still reads them with `/m` regexes. That is safe only because nothing loads a
  store file this store did not write: on this corpus, 0 deposit blocks contain a CR and
  every `deposited-by:` is one token. **Any path that ingests another store's files — a
  merge, an import — must move that block onto `fieldValue` and `oneToken` first**, or F4
  reopens on provenance.
- **A field after a bare CR, U+2028 or U+2029 is lost silently, and that is a standing
  limit.** Admission change 2 is deliberate — such a character is not a line break — but
  nothing reports the lost field: `check-headers` looks below the blank line, and this field
  never reached it. No held record contains these characters. If one arrives,
  `check-headers` is the place to teach the shape; until then the limit is stated rather
  than detected.
