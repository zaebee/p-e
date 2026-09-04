# Contract — which obligations can a fix break?

You are given a draft protocol specification and a defect in it.

## §1 Read nothing else

Work only from `input/`. Do not fetch anything, do not look for the project, and do not use
knowledge you may have of it. If you recognise it, set that aside.

`input/` holds three files: the whole draft, an extract of every line in it carrying `[MUST]` or
`[MUST NOT]` (produced by grep, not by selection), and a statement of the defect.

## §2 The task

**For each of the twelve normative clauses, say whether a change to the specification that
resolves the defect could violate it, and how.**

Not which change. Not which is best. For each clause: could a resolution break this, and by what
mechanism.

Three answers are available per clause, and say which:

- **Cannot** — no resolution to this defect can violate it, and why not.
- **Could** — a resolution could violate it; describe the mechanism in one or two sentences.
- **Depends** — it turns on something the draft does not settle; say what.

## §3 The sourcing rule, which binds every statement you make

**Every claim about what the specification requires quotes a line and gives its number.**

If the ground for a claim is *not* a normative clause — if it is explanatory prose, a code
comment, a cited external work, or an inference — **the claim must say so in itself**:

> "sourced in prose at line 119, not normative"
> "sourced outside the specification: RFC 8785"
> "inferred from the rules in §3.3; not stated"

A claim that can do neither is not a finding. Mark it as an opinion and keep it separate.

This rule is the point of the exercise. A previous attempt at this question quoted a note *about*
the specification as though it were the specification, and nobody noticed until the quotations
were checked one by one.

## §4 Beyond the twelve

**Is there anything a resolution to this defect could break that is NOT among the twelve?**

The draft contains more than its normative clauses. If a property the protocol appears to rely on
is stated somewhere other than a `[MUST]`, name it, quote it, and say where it lives and what its
status is. If a property is relied on and stated *nowhere*, say that too — that is a finding, not
a gap in your answer.

## §5 State your rule before you apply it

Before the clause-by-clause list, say what you counted as "could violate". A resolution that makes
a clause harder to satisfy is not the same as one that violates it; say where you drew that line.

## §6 What you are not told

You are not told what resolutions have been proposed, which anyone prefers, what has already been
decided about this protocol, or why the question is being asked.

**Do not propose a resolution. Do not rank anything. Do not recommend.** If you find yourself
concluding that the specification should be changed in a particular way, stop — that is outside
this contract.

## §7 Confidence

One line per clause: how sure you are, and of what.

## §8 One shot

Produce the whole answer once, in a single document. Do not ask questions first.
