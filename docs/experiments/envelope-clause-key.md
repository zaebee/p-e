<!-- NOT A RUN -->
# Pre-registered key for the envelope blind read

**NOT A RUN.** Not a `docs/reports/*-conformance-NN.md`, changes no catalogue.

Written and committed **before** the reader runs. The sealed input is outside this repository at
`~/projects/envelope-clause/` and holds the specification, a contract, and a PIN — nothing else.

## What the run tests

Issue #39. §3 declares nine fields; an act carrying a tenth is admitted by our implementation,
and the document does not say whether it should be. `relay-0768` recorded that this cannot be
deferred, because every act from a third party forces Stage 2 to decide.

It goes to a blind reader for the same reason the §4 question did: **I have argued both sides.**
When the research came back proposing to close the envelope I relayed that proposal approvingly
and noted, in the same message, that a resolution collapsing two problems into one is exactly
when to suspect myself. A reader with access to this corpus would be choosing between my
positions rather than reading §3.

## My position at the time of writing

**P1. The document does not answer directly.** Nothing says what becomes of an undeclared field.

**P2. It implies OPEN, and the implication is stronger than it first looks.** §7.1's Stage 2
enumerates what it rejects — duplicate keys, numbers outside the safe range, `CNS.id != act.id`,
`CNS.to ∉ act.to[]`, and an unanchored citation. An undeclared field is not on that list, and the
list reads as exhaustive rather than illustrative.

**P3. §5 requires the envelope to be open, or it describes something inadmissible.** §5 sets out
what `ruled_by` records. §3 does not declare `ruled_by`. If the envelope is closed, §5 is about a
field no conforming act may carry.

**P4. The counter-reading is the section's title.** Stage 2 is named "structural and I-JSON
conformance", and an act carrying a field the structure does not declare is arguably not
conformant to that structure. So the title argues closed while the enumeration argues open, and
that is the two-reading shape the contract asks about.

**P5. Therefore closing the envelope would be a change, not a reading** — which is the opposite
of what I relayed approvingly when the research proposed it.

## What each outcome would mean

- **The reader reaches something like P1–P4.** My current reading survives an independent one. It
  does not confirm it; a second reader can share a blind spot with the first, and this one is
  given the document I chose.
- **The reader finds the document says CLOSED.** Then P2 and P3 are wrong and the earlier
  proposal I distrusted was right, which would be the most useful outcome for me personally and
  the most uncomfortable.
- **The reader finds something in neither.** The best outcome, and §4 and §5 of the contract exist
  to make it possible — both readings, and the strongest evidence against its own conclusion.

No prediction about which. I have argued both sides of this question already, and that is the
reason for the run rather than a caveat on it.

## What is deliberately in the input, and what is not

**In:** the whole specification. §3's declaration, §7.1's Stage 2, and §5's `ruled_by` are the
evidence, and they are three sections apart — trimming to §3 would remove the case.

**Out:** issue #39, this key, every record, and the fact that our implementation admits such
acts. That last one is a fact about our code and not about the document, and including it would
tell the reader which way we already went.

## Carrier rules

Deliver `PROMPT.md`, `CONTRACT.md`, `SPEC.md`, `PIN.txt`. Nothing else. Do not name a section, a
verdict, or a field in conversation; if the reader asks whether something counts, answer only
from `CONTRACT.md`. Return the output verbatim, including whatever looks wrong.

## A separate anomaly, recorded here because it was found while sealing this

The specification has **no §6**. Its sections run 1, 2, 3, 4, 5, 7.

v0.1's §6 was the Refuge / Erratum Model, which #67 is about — but the numbering does not carry
across versions (v0.1's §5 was adjudication and v0.12's is attribution; v0.1's §7 was a
conformance checklist and v0.12's is verification), so the gap is **not** demonstrably the ghost
of that section. It may be, or it may be an independent numbering slip.

What is certain is that a visible hole in the table of contents has gone unremarked for five days
by sixteen rounds of review, a term sweep, a blind reader, `relay-grok` and `relay-mimo`. It is
not part of this run and is not mentioned to the reader; if the reader notices it unprompted,
that is worth more than my own noticing was.
