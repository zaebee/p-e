<!-- NOT A RUN -->
# Result — the reading holds, and the reader missed my strongest evidence

**NOT A RUN.** Not a `docs/reports/*-conformance-NN.md`, changes no catalogue.

Reader output verbatim in `READER-OUTPUT.md`. Key at `docs/experiments/envelope-clause-key.md`,
committed before the run. The reader had the specification, a contract and a PIN — no repository,
no records, no issues, no knowledge that a key existed. It reported the PIN as matching, and the
input verifies unchanged after the run.

## Against the key

| | outcome |
|---|---|
| **P1** — the document does not answer directly | **reached** |
| **P2** — it implies open, via Stage 2's enumerated rejections | **reached**, same reasoning and the same quotation |
| **P3** — §5's `ruled_by` requires an open envelope | **missed entirely** |
| **P4** — the counter-reading is Stage 2's title | **not used; it found a different counter** |
| **P5** — closing would be a change, not a reading | **reached** implicitly |

Three of five, one miss, and one place where we each found a counter-argument the other did not.

## The miss, and it is the first of these runs to go this way

The string `ruled_by` does not appear in the reader's answer. Neither does any reference to §5.
The only `§5` in the file is the heading of its own section 5.

That is the key's strongest evidence: §5 sets out what `ruled_by` records, and §3 does not declare
`ruled_by`, so a closed envelope makes §5 describe a field no conforming act may carry. It is
three sections away from the question and the reader did not connect them.

**Recording this plainly rather than softening it**, because `relay-0779` found that I write these
up as "the reader was better throughout" when an experiment shows me wrong, and that the shape
reads as honesty without being it. The correction to that habit is to say the opposite when the
opposite is true, and here it is: on the strongest single piece of evidence, I had it and the
reader did not.

## Its counter-argument is sharper than mine in form and false in substance

The contract's §5 — new to this run — asked for the strongest evidence against its own
conclusion. It produced one I had not considered:

> in a typed specification language (TypeScript), an object with a property not in the interface
> does not conform to that type

That is a better *kind* of argument than mine. I pointed at Stage 2's section title; it pointed at
the notation the document chose to declare the act in.

It is also wrong, and checkably so:

```ts
interface A { readonly x: number }
const wide = { x: 1, surprise: 2 };
const viaVariable: A = wide;                    // no error
const viaLiteral:  A = { x: 1, surprise: 2 };   // TS2353
```

TypeScript is **structurally typed**. An object carrying extra properties *does* conform to a
narrower interface. The error appears only when assigning an object *literal*, which is an excess
property check — a typo guard, not a statement about conformance.

**And corrected, the argument reverses.** If the document declares the act in a structurally typed
notation, then a wider object conforming to it is exactly what that notation means. The reader's
strongest evidence against its own conclusion becomes evidence for it.

## What the contract's new clause bought

This is the first run where the reader was asked for evidence against itself, and the first where
it produced an argument neither the key nor the earlier runs contained. That it turned out false
does not make the clause useless — it surfaced the one reading nobody had articulated, and being
wrong in a checkable way is worth more than being absent.

## The §6 anomaly

Not mentioned to the reader, and not noticed by it. The specification's sections run 1, 2, 3, 4,
5, 7, and a reader given the whole document to answer a question about §3 and §7 did not remark on
the hole between them.

That is now five parties and sixteen review rounds that have read this document without remarking
on the gap.

**Narrowed after checking, which should have happened before writing it.** `§6` is mentioned five
times in the corpus and once in the review thread — `relay-0192`, `relay-0758`, `relay-0764`,
`relay-0772`, `relay-0794`, and round one's *"§6 forbids delete/update only in `history/`"*. Every
one of those is about **v0.1's §6 and its content**, which is the subject of #67. None is about
v0.12 skipping the number.

So the claim holds, narrowly, and it holds by luck rather than by care: I asserted it from the
section list and my own memory and checked afterwards. That is the second time today an unverified
count came out in my favour — the first was `exactly twice` for `exactly once`, corrected in
`relay-0774`. Neither error flattered the argument it appeared in, which is the only reason
neither did damage.

## What this settles, and what it does not

The lenient reading is better supported, by two independent routes to the same conclusion — and
the reader's own counter-argument joins them once corrected. #39 is answered as a **reading**:
the document implies that an act carrying an undeclared field is not rejected.

It does not settle what the protocol *should* do. `relay-0768` recorded that this cannot be
deferred because every third-party act forces Stage 2 to decide; that decision is still open, and
this run establishes only that closing the envelope would be a change rather than a clarification.
