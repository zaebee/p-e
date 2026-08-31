# Repairs for SF-1 … SF-4

Draft. Not part of the specification. Stated for attack, per the standing rule that a
resolution is named before it is applied.

These are four repairs to the documents, at the roots the Phase C audit named. They are
additions to DRAFT-2 except where they replace text, which is marked.

---

## SF-1 — `blank line` and `field`

The audit executed the failure: the same octets separated by one space are refused with an
id burned, separated by an empty line are bound, because the F4 clause rests on `blank
line` and neither document defines it. Two definitions, added to DRAFT-2's list:

> **Blank line.** A line containing no octets, or only space (`0x20`) and horizontal tab
> (`0x09`) octets.
>
> **Field.** A header-block line of the form `name: value`, where `name` matches
> `[A-Za-z][A-Za-z0-9-]*` and is followed immediately by `:`. A line that is not a field
> is not one, wherever it appears.

**Why the looser reading of blank, and not `empty`.** The clause exists so that a
header-like line quoted in a body is not adopted or rejected as a field. Defining blank as
`empty` extends the header block past a whitespace-only separator and *into the body*,
which is how the audit's counterexample arose. The looser definition ends the header at
the separator the author intended, which is what the clause is for. Its cost is that a
header line consisting only of whitespace terminates the block — and such a line is not a
field under the definition above, so nothing is lost.

## SF-2 — may a declared id direct allocation?

The audit measured the cost of the answer "no": binding one record that declared
`id: alpha-0004` took eight deposits and abandoned seven seqs, so the identity the spec
calls *"the only identity a chain can pin"* cannot in practice be pinned.

> **A declared id is an allocation request.** Where a candidate's header block carries a
> declared id, the store MUST attempt that identity and no other. The attempt is the same
> atomic exclusive claim as any other allocation. If it fails — the identity is held, or
> lies below the authority's declared G1 floor — the deposit is refused, and **no other
> identity is claimed or consumed.**
>
> Where a candidate carries no declared id, the store allocates.

**This dissolves Q8b rather than answering it.** Under this rule the store-assigned
identity equals the declared identity whenever there is one, so the mismatch state does
not arise; what remains is a failed request, refused with a stated cause and no
side-effect on allocation. That satisfies hy3's narrowed Q8a — *"a requested id that fails
validation MUST NOT be claimed / MUST NOT side-effect allocation"* — and it makes the
envelope id do the job the spec claims for it.

**It does not weaken the derivation rule.** Record identity is still allocated, never
computed from bound-content: the store claims an identity the candidate names, and naming
is not computing.

## SF-3 — MUST 6's closed vocabulary and 10.3's open verdict

> Visibility and integrity are separate axes and MUST NOT be reported through one
> vocabulary. `PRESENT` / `KNOWN_MISSING` / `UNKNOWN` answer *where the content is*. A
> disagreement between the recorded and recomputed content identities does not change any
> of them: the content is `PRESENT` and its integrity verdict is a second, separate
> answer, whose content 10.3 leaves open.
>
> No store may report an integrity disagreement by moving a record out of `PRESENT`.

## SF-4 — the label MUST 5 requires

MUST 5 requires cross-authority references to be *"labelled as such"* and names no label.
The document already carries one, at line 369, where `parent:` and `ref:` appear together
as headers.

> Replaces MUST 5's second sentence. **A cross-authority reference travels as `ref:`,
> never as `parent:`.** `parent:` asserts membership in the same chain and is scoped to
> one authority; `ref:` asserts an observation and carries the cross-store citation form
> `(store identity, locator, content digest)`. A `parent:` naming another authority is not
> a mislabelled observation — it is refused.

---

## Build contract v2 — the coverage line

Not a repair to the documents. A change to the build contract, so that a later comparison
of two builds measures forcing rather than coverage:

> For every MUST in the governing documents, report `IMPLEMENTED`, `NOT IMPLEMENTED`, or
> `NOT APPLICABLE` with the reason, each with the code or test location that backs the
> claim. A MUST you did not implement is a permitted answer and an honest one; a MUST you
> did not notice is what this list exists to prevent.

The second build passed 33 tests green while implementing no envelope-id check at all,
which is a MUST. That is what this line is for.
