# Contract — what normative content changed between two versions of one specification?

You have two documents. `A-v0.1.md` is the first draft of a specification. `B-v0.12.md` is a
later draft of the same specification, produced from it through a series of revisions you have
not been shown.

**Your task: determine what normative content is in one and not the other, in both directions.**

You are not being asked whether either document is good, whether the changes were improvements,
or what anything means. Only what is present in one and absent from the other.

## §1 Read nothing else

Do not read, list, or search outside this directory. No network. You may write and run your own
scripts against the files here.

Verify `sha256sum A-v0.1.md B-v0.12.md` against `PIN.txt` and report whether it matched. If it
did not, stop and report that.

## §2 State your rule first

Before listing anything, write the rule you will use to decide what counts as **normative
content**, in one or two sentences. Then apply it.

If applying it forces you to refine the rule, say so and show both versions. **Do not silently
rewrite the rule to fit the outcome.** A rule adjusted after seeing which results it produces is
a different rule, and the adjustment is itself a finding.

## §3 The two lists, by line number

**Present in A, absent from B.** Every item, with its line number in A and the first few words.

**Present in B, absent from A.** Every item, with its line number in B and the first few words.

For each item state what kind of thing it is — a field, a default value, a formula, a constraint,
a permitted value, a procedure — and quote enough to be checkable.

## §4 Changed rather than removed

Some content will be present in both but say different things: a renamed field, a restructured
type, a different value. **Report these separately from removals.** A thing that moved is not a
thing that left, and conflating the two is the most likely way to get this wrong.

## §5 Borderline cases — report all of them

The two documents are not written in the same language, are not the same length, and do not use
the same structure. A does not mark its requirements; B marks some with `**[MUST]**` and
`**[MUST NOT]**`. Report **every** case where your rule did not decide cleanly, and say which way
you called it and why.

Do not resolve a borderline case by picking the reading that produces a tidier list.

## §6 What you are not told

You are not told how many items there are in either direction, whether the number is large or
small, or whether anyone has done this before. Do not calibrate your output to a guess about
what is expected. If your rule finds nothing in one direction, report nothing in that direction.

## §7 Confidence

For each item, say whether you are certain it is absent or whether you may have missed it
elsewhere in the document. Searching a 384-line document for the absence of a thing is harder
than searching for its presence, and an item you are unsure about is more useful reported with
that doubt than omitted.
