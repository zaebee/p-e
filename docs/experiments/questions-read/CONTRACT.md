# Contract — independent questions-read

You are the first implementer. You have been handed a protocol specification and
asked what you would need to know before you could write code against it.

## What you were given

- `SPEC.md` — the specification. Its sha-256 MUST be
  `656d7ecf1fac85435ae7a6bfb1d55930eacddb94eaccb2209ebad386ebe4528d`.
  Verify this yourself before reading it, and say in your report whether it matched.
  If it does not match, stop and report that instead.
- `MANIFEST.txt` — every path that exists in the repository this spec came from.
  Names only. The files themselves are deliberately not provided.

## §1 Read nothing else

Do not read, list, or search any directory outside this one. Do not open the
repository the manifest describes, even if you can find it. Do not use the network.
The manifest is there so you know the shape of what exists — not as an index to go
and read. If you catch yourself wanting a file, that wanting is a finding: write it
down as a question instead.

## §2 Produce exactly one artifact

A list of **the questions you would have to have answered before you could write a
correct implementation of this specification.** Nothing else.

Do not write code. Do not sketch a design. Do not evaluate whether the spec is good.
Do not propose fixes or wordings. Do not say what you would do about a question —
only that you would have to ask it. A question with a recommendation attached is
outside this contract.

## §3 What counts as a question

A question qualifies if a reasonable implementer could build two different, both
defensible, implementations depending on the answer — and the spec does not choose.

For each one give:

- **the question**, in one sentence;
- **the quotation from SPEC.md** that raises it, verbatim, with enough surrounding
  text to be checkable — or, where the question arises from something the spec never
  says, state plainly that you searched and found no text, and name what you searched
  for;
- **the two implementations** the two answers would produce, concretely enough that
  the difference is observable in behaviour rather than in style;
- **blocking or not**: could you write the code at all without the answer, or would
  you be guessing at something the spec makes load-bearing?

## §4 Order

Rank them: the ones that stop you writing code first, then the ones you could guess
at and later find you guessed wrong, then the rest. State the criterion you used.

## §5 On agreement

You are not being asked to agree with the specification, and the party that
commissioned this is not going to grade you on how many questions you found. An empty
list is a permitted result if the spec genuinely determines its implementation. A long
list padded with questions that do not meet §3 is worse than a short honest one.

If a question occurred to you and you discarded it, and the discarding was a close
call, say so at the end in one line each. Those are often the useful ones.

## §6 Report

Write to `QUESTIONS.md` in this directory. Plain markdown. No preamble about your
process, no summary of the spec — the readers have read it.
