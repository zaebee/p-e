# Answer to the question on I-5

**Question:** Does the line in invariant I-5 —

```
expect:  one anchor exists. a gap cannot be observed in a single period, so
         the no-backfill half is UNDECIDABLE and must not be reported as CONFORMS
```

constrain the verdict for A, or only for H?

---

## Ruling

The line constrains **both A and H**.

## Grounds (textual)

1. The sentence appears in the `expect:` block of invariant **I-5**, which the catalogue presents as a single rule applied to both producers:
   > I-5 · Coverage is stated over named absolute periods, and a gap is visible
   >
   > **H** — …
   > **A** — …

2. The line is written in the passive voice and the third person (“the no-backfill half is UNDECIDABLE”), not addressed to a specific producer. This matches the style the document uses for global constraints (cf. I-1’s `expect:` block: “the verdict vocabulary … has four values and not two” — a rule about the reader, not a producer).

3. When the catalogue intends a constraint for only one producer, it names that producer explicitly inside the `expect:` line. The only such example is I-4:
   > `expect:     A's half may return UNDECIDABLE`
   This line does *not* name a producer, so it is not scoped to one.

4. The phrase “the no-backfill half” refers to a portion of I-5 itself (the rule that gaps are never backfilled). The subject of the sentence is the invariant’s half, not H’s artifact or A’s artifact.

5. The I-5 `reader:` instructions are stated for both producers (`H — … A — …`), and the `expect:` line sits beside them as a joint prediction about how the reader will evaluate the invariant against both producers’ artifacts.

## Ambiguity check

The sentence is **not genuinely ambiguous**. The document’s consistent pattern is:
- Named producer in the `expect:` line → constraint scoped to that producer (I-4).
- No producer named, passive voice, referring to the invariant itself → constraint scoped to the invariant’s evaluation across all applicable producers.

To make it explicit, the line could be reworded as:

```
expect:  one anchor exists. a gap cannot be observed in a single period, so
         the no-backfill half of I-5 is UNDECIDABLE for both producers
         and must not be reported as CONFORMS for either
```

As written, the existing grammar and the catalogue’s conventions already convey the same meaning.
