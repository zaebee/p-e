# Contract — attack these recommendations before they are adopted

You are given a set of recommendations answering eight open questions about a protocol
specification, together with the specification, its three addenda, the questions the
recommendations answer, and a log of what the specification lost between its first version and
its current one.

## §1 Read nothing else

Work only from `input/`. Do not fetch anything, do not look for the project online, do not use
knowledge you may have of it. If you recognise it, say so and set it aside.

## §2 Why you are being asked

The project's own rule: **no repair is adopted until a party that did not write it has attacked
it.** These recommendations are a repair. They are well argued and internally consistent, and
that is the condition under which the rule binds hardest, not the condition that excuses it.

**Their author is not among the readers.** Neither is the party who reviewed them once already
and whose three objections they answer.

## §3 The question

`input/RECOMMENDATIONS.md` makes eight recommendations, in a table and then in prose.

**For each one: does it survive?**

A recommendation fails if any of these holds, and your answer says which:

1. It contradicts the specification or an addendum.
2. Its stated reason does not support it — the reason is true and the conclusion does not follow.
3. It decides something it does not admit to deciding.
4. It has a cost the note does not name.
5. It answers a different question from the one it cites.

**A recommendation that survives all five is not thereby right.** Say what would still have to be
true for it to be right, if anything.

## §4 Two the author already changed under review

The note was reviewed once and three objections were raised. Two are visible in it now — an
explicit refusal to restore `superseded_by`, and an explicit consequence for §5. **A correction
made under objection is where a second objection is most likely to be needed and least likely to
be looked for.** Give those two the same treatment as the rest, not less.

## §5 What each verdict carries

1. Which recommendation, quoted.
2. Survives, or fails — and if it fails, which of §3's five, quoted from the source it breaks.
3. A line number wherever your ground is in a supplied file.
4. One line of confidence: how sure you are, and of what.

## §6 The sourcing rule

Every claim quotes and locates its ground. If your ground is your own inference, **the claim says
so in itself**. A claim that can do neither is an opinion; mark it and keep it separate.

## §7 What you are not told

Which recommendations anyone believes are wrong. What decision this serves. Whether the note is
thought to be good. **Do not write a better note** — the question is whether this one holds, not
what you would have written.

## §8 One shot

One document, produced once. If a recommendation cannot be settled from what you have, say
`UNDECIDABLE` for it and say what you would need. That is a real answer and a guess is not.
`UNDECIDABLE` is a permitted verdict and is not an invented sixth thing.
