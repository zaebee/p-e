# Contract — apply the unitization rule

Two documents in this directory contain the normative text of a protocol. `RULE.md`
states a rule for cutting that text into **normative units**. Apply the rule and produce
the unit list it yields.

## §1 Read nothing else

Only `SPEC.md`, `AMENDMENT.md`, `RULE.md` and this file. Do not search the filesystem, do
not use the network. There are other readings of these documents in existence; you do not
have them and must not look for them.

## §2 What you are doing

Applying a stated rule to a stated text, and reporting what falls out.

You are **not** being asked whether the rule is a good one, whether the documents are
good, or how you would have cut them. If the rule is unclear at some point, that is a
finding — record it as an ambiguity in the rule and say which reading you took and why.
Do not silently pick one.

## §3 The output

`UNITS.md`, containing:

- **the unit list**, in document order, each with the id the rule assigns, the section it
  came from, and enough of its text to identify it — a quoted phrase, not the whole clause;
- **a count per section and a total**, and the total must equal the sum of the per-section
  counts. Check that arithmetic before you write it down;
- **every place the rule did not determine the cut**, with the reading you took. This
  section is as important as the list. A rule that determines everything produces an empty
  one, and that is a result; a rule that does not, and a reader who hides where, produces
  a number nobody can trust.

## §4 On judgement calls

Where the rule is silent you must still produce a unit list, so you will make judgement
calls. Make them, mark them, and state the alternative you rejected. Do not resolve
silence by picking whatever seems natural and moving on — the whole value of this run is
in knowing which parts of the output the rule produced and which parts you did.

## §5 What this is not

Not an audit of the rule, not a proposal to improve it, not a coverage report, not an
assessment of any implementation. One artifact: the unit list plus the record of where the
rule ran out.

## §6 Report

`UNITS.md` in this directory. Plain markdown.
