# DIVERGENCE.md — where two conforming stores could differ

Predictions, not a restatement of DECISIONS.md. Each of these is a place where I believe
another implementation could satisfy `SPEC.md` as amended and behave observably
differently from mine. Where I think the documents force my behaviour I have said nothing,
so the omissions are as much of the claim as the entries.

Ten entries. Two of them (D1, D2) the amendment itself flags as open; the rest are gaps I
believe the documents leave without noticing.

---

## D1 — the verdict when recorded and recomputed content identities disagree

  input:      Read a bound record whose stored octets no longer digest to the recorded
              content identity, but which still begins `@p-e/x0` and is well-formed UTF-8.
  mine:       Returns `visibility=PRESENT`, `integrity=MISMATCH`, **and the octets it holds**.
  other:      Returns `visibility=PRESENT`, `integrity=MISMATCH`, **and no octets** — refusing
              to serve what it cannot vouch for. Or refuses the read entirely with an
              indication that is not an error and not an absence.
  clause:     AMD 10.3, "**OPEN.** The verdict when the recorded and recomputed content
              identities disagree is not defined by this document", together with AMD's
              *Known open* list: "whether a store may discard octets it holds and must
              refuse to serve". Both readings keep the record in `PRESENT`, which is the only
              thing 10.3 does settle.
  note:       The clause constrains the *reporting* completely and the *serving* not at all.
              A reader of both stores learns the same fact and gets different bytes.

## D2 — a declared `id:` that disagrees with the assigned id

  input:      Deposit `@p-e/x0\nid: relay-9999\n\n…` into a store whose next free seq is 3.
  mine:       Refuses `DECLARED_ID_DISAGREES`. Seq 3 stays allocated forever, never bound,
              and the next deposit gets seq 4 — a permanent hole in the sequence.
  other:      Binds it at `relay-0003`, having performed the check and recorded the
              disagreement (as metadata, or in a log), on the reading that "checked" does not
              entail "enforced". No hole; the next deposit gets seq 4 either way, but the
              corpus contains a record whose bound-content declares an id that is not its own.
  clause:     SPEC:317-318, "OPTIONAL but, when present, MUST be checked against the
              store-assigned id", with AMD *Known open*: "**Q8b**, what a store does when a
              declared and an assigned id disagree, with its measured cost in ADR-1."
  note:       The observable difference is durable and cumulative: over a corpus, my store's
              seq space has a hole per rejected envelope and theirs does not, so the two
              stores' locators drift apart permanently from the first disagreement onward.

## D3 — the visibility of an id that was allocated but never bound

  input:      Ask `visibility("relay-0003")` where seq 3 has a marker in `history/` and no
              ledger entry (the state D2 produces, and the state a crash between marker and
              ledger produces).
  mine:       `UNKNOWN`.
  other:      `KNOWN_MISSING`, on the reading that the store demonstrably knows something
              about this id — it is taken and can never be bound — so "unknown" understates
              what it can say.
  clause:     SPEC MUST 6 enumerates three states and defines only two of them by example:
              deletion and the ledger/payload crash. An allocated-and-unbound id matches
              neither example, and the clause offers no rule for it. My reading leans on
              "the digest and the binding are known" being constitutive of KNOWN_MISSING;
              theirs leans on `UNKNOWN` meaning the store has nothing to say.
  note:       This is the state a *client* is most likely to meet in practice, because every
              refused envelope check produces one.

## D4 — the visibility of an unbound id that a held record names in its header

  input:      Deposit a record with `parent: relay-9999` where seq 9999 was never allocated,
              then ask `visibility("relay-9999")`.
  mine:       `KNOWN_MISSING` — a surviving record names it in a header, which is the
              store's own predicate as SPEC:368-370 describes it.
  other:      `UNKNOWN` — no ledger entry exists, so no digest and no binding are known, and
              MUST 6's KNOWN_MISSING example requires both.
  clause:     SPEC MUST 6 against SPEC:366-370. The latter is a *measurement of the legacy
              store*, presented in a section on migration, not a normative rule; a store that
              declines to adopt it is not violating MUST 6. I adopted it because it is the
              only account the documents give of how the two absent states are told apart.
  note:       Directly observable and cheap to test, and I would not be surprised to be in
              the minority here.

## D5 — CRLF records, and where a line ends

  input:      Deposit `@p-e/x0\r\nkind: note\r\nparent: relay-0001\r\n\r\nbody\r\n`,
              where `relay-0001` is a real, bound record of this same authority.
  mine:       **Refused** `PARENT_OUT_OF_SCOPE`. LF alone terminates a line, so the line's
              octets include the trailing `\r` and the field's value is `relay-0001\r`,
              which is not a locator of this authority. The `\r\n\r\n` is not a blank line
              either, so the whole record is header block.
  other:      A CRLF-aware store ends the line at `\r\n`, reads the value as `relay-0001`,
              ends the header block at `\r\n\r\n`, and **binds** the record with a parent
              edge to `relay-0001`.
  clause:     AMD *Blank line* — "A line containing no octets. A line carrying whitespace is
              not blank" — fixes what a blank line contains and never says what delimits a
              line. AMD *Field* inherits the same gap for where a value ends.
  note:       The sharpest divergence in this list. It is not a difference of report but of
              admission: every record authored on a CRLF platform that carries a checked
              field is refused by my store and bound by theirs. I verified this against my
              own implementation rather than predicting it, and pinned it in the test
              `crlf_header_values_carry_their_trailing_cr` so it cannot drift into an
              accident. AMD 9.3 forbids me from normalising the octets away, so refusal is
              the only move my line rule leaves; the disagreement is entirely in the rule.

## D6 — an offer whose declared extent disagrees with the octets delivered

  input:      `Candidate(octets=b"@p-e/x0\n\nabcdef\n", extent=10)` where the octets number 16.
  mine:       Refuses `EXTENT_MISMATCH`; nothing is allocated and nothing is bound.
  other:      Binds the first 10 octets, reading AMD 9.1 "Bound-content is the candidate's
              octets in full" as "in full, up to the extent the offer declared", since extent
              is a property of the offer and the octets are merely how the offer was carried.
  clause:     AMD *Candidate* and AMD 9.1. Neither says what a store does when the offer's two
              halves disagree, and 9.3's ban on trimming is stated over bound-content —
              which, on the other reading, is the 10 octets and was never trimmed.
  note:       A third conforming behaviour exists: bind all 16 and record extent 16. That one
              I think is *excluded*, by 9.1's "MUST NOT derive extent from the content".

## D7 — where allocation begins relative to the declared G1 floor

  input:      `Store.create(..., g1_floor=32)`, then one deposit.
  mine:       `relay-0032`.
  other:      `relay-0001`, or any seq the store likes below the floor: MUST 2 governs where
              G1 is *claimed*, not where allocation *starts*, and a store may honestly
              allocate low ids while claiming G1 only from 32 up.
  clause:     SPEC MUST 2. It constrains the claim and says nothing about the allocator; the
              connection between them is mine.
  note:       Observable on the very first deposit, and it makes every subsequent locator
              differ between the two stores.

## D8 — what the crash window between ledger and payload leaves behind

  input:      Power loss inside one `deposit`, between the two writes.
  mine:       A bound id with no octets — `KNOWN_MISSING`, exactly MUST 6's second case.
  other:      A store that reads MUST 8's "the name that points at them" as covering the
              *ledger entry* must make the octets durable first; its crash window leaves
              durable octets with no binding, and its `KNOWN_MISSING` case is then
              unreachable by crash.
  clause:     SPEC MUST 8 against SPEC:334 ("the ledger MUST be written before the record").
              This is the closest the two documents come to requiring incompatible things,
              and it turns entirely on the referent of "the name". I resolved it in
              DECISION 3; I do not think the text forces my resolution.
  note:       Not testable here — §2 excludes crash recovery and I ran no power-loss test —
              which is why this is a prediction and not a measurement.

## D9 — whether witness attestations consume the authority's sequence space

  input:      Deposit two records, then attest over both, then deposit a third.
  mine:       The third record is `relay-0004`; the attestation took `relay-0003`, because
              "The attestation is itself a record" and my store has one id space.
  other:      The third record is `relay-0003`; attestations live in a space of their own, or
              outside the store, and are still records in the sense the clause means.
  clause:     SPEC:139-140 and SPEC:131, which make an attestation a record and a witness a
              capability of "a record or a head", but never place attestations in the
              authority's `(authority_id, seq)` space.
  note:       Observable in every locator after the first attestation, and it changes what
              `locators()` returns to a reader who did not ask about witnesses.

## D10 — whitespace between a field's colon and its value

  input:      Deposit a record whose header carries `id:  relay-0001` (two spaces) into a
              store whose next id is `relay-0001`.
  mine:       Accepted — I strip ASCII space and tab from both ends of a field value before
              comparing. Verified, along with a trailing space, in a fresh store.
  other:      Refused `DECLARED_ID_DISAGREES`, comparing the value as the raw octets after
              the colon, `" relay-0001"`, which is not `"relay-0001"`.
  clause:     AMD *Field* fixes the shape of the *name* precisely ("`[A-Za-z][A-Za-z0-9-]*`
              ... followed immediately by `:`") and says of the value only that the line has
              "the form `name: value`". Whether the single space is a delimiter or part of
              the value is unstated, and the same gap governs trailing whitespace.
  note:       Small, but it decides admission, and the two stores disagree about whether a
              perfectly ordinary record is conforming.

---

## Where I think there is no room, and why it is worth saying

These looked like divergences and I concluded they are not, so I am not listing them above:

- **Whether admission is re-tested on a read.** AMD 10.4 says it is, and names what to
  report when both checks fail. No latitude.
- **Whether a mismatch may move a record out of `PRESENT`.** AMD 10.3 forbids it in those
  words, and the "open verdict is not a permission" sentence closes the obvious escape.
- **Whether `rename` may be the binding write.** SPEC MUST 8 names the call and the failure
  mode. A store using it is not conforming, however atomic it is.
- **Whether allocation may consult a maximum.** MUST 1b: "never by reading the current
  maximum", with the mechanism spelled out. No latitude.
- **Whether a record bound without a recorded content identity may read as verified.**
  AMD 10.5 forbids it, and forbids curing it afterwards.
