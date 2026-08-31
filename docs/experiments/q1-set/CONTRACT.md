# Contract — which text in this document is normative?

`SPEC.md` is a specification. Some of it states requirements an implementer must satisfy. Some
of it is commentary, history, measurement, argument, or prose *about* requirements. **Your task
is to determine which is which, and to state the rule you used.**

You are not being asked whether the requirements are good, whether they are satisfied, or what
they mean. Only which text carries normative force.

## §1 Read nothing else
Do not read, list, or search outside this directory. No network. You may write and run your own
scripts against files here. Verify `sha256sum SPEC.md` against `PIN.txt` and report whether it
matched; if not, stop and report that.

## §2 State your rule first
Before listing anything, write the rule you will apply, in one or two sentences. Then apply it.
If applying it forces you to refine the rule, say so and show both versions — do not silently
rewrite the rule to fit the outcome.

## §3 The list
Every passage you find normative, **by line number**, with the first few words. And every
passage you considered and **excluded**, with the reason.

## §4 Borderline cases — report all of them
This document was written by hand and is not uniform. Report **every** case where your rule did
not decide cleanly, and how you resolved it. Among the structural questions you may or may not
find relevant — decide each on the evidence, and do not assume any of them is the interesting
one:

- Does a passage need to contain a keyword such as MUST or SHALL to bind, or can a provision
  bind because of where it sits and what the document calls it elsewhere?
- Do sub-bullets, tables, and parenthetical clauses inside a numbered provision inherit its
  force?
- Does a sentence that mentions a requirement by number state a requirement, or refer to one?
- Does the document anywhere declare part of itself non-binding, and if so, exactly which lines
  does that declaration cover?
- Do headings bind?
- Is there normative text outside the sections that look normative?

For each borderline case, say which resolution you chose, what the alternative was, and
**what would change if the alternative were chosen**.

## §5 What this is not
Not an audit. Not a conformance check. Do not evaluate whether anything is satisfied, do not
say what any requirement ought to be, and do not propose changes to the document.

## §6 Report
Write `RESULT.md` in this directory. Plain markdown, no process narration. Quote exactly and
cite line numbers throughout.
