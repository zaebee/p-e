# Task

Read `SYSTEM.md`. Determine **what distinct outcomes the report described at the end of it must
be able to express**, and produce that set.

## §1 Read nothing else

Do not read, list, search, or open anything outside this directory, and do not search the
filesystem for related material. No network. You may write and run your own scripts against
files here. Verify `sha256sum SYSTEM.md CONTRACT.md` against `PIN.txt` and report whether they
matched; if not, stop and report that.

## §2 Method before result

Before listing anything, write in one or two sentences how you will decide that two situations
need separate outcomes rather than one shared outcome. Then apply it. If applying it forces you
to revise the method, say so and show both versions — do not silently rewrite the method to fit
the result.

## §3 The set

For each outcome:

- a name, and the situation it covers;
- what a person reading it is entitled to conclude;
- what it does **not** say;
- whether it indicates an error by the **author** of the record, an error by someone else, or no
  error at all — and how you decided.

## §4 Justify each boundary

For every pair of outcomes in your set, you do not need to argue at length — but for any pair a
reasonable person might merge, state **what is lost if they are merged**, concretely: name a
person or program that would be misled, and how.

If you considered a distinction and rejected it, list it with the reason.

## §5 Completeness

State how you know your set covers every situation a reader can encounter, or state that you
cannot know that and why. If your method leaves a case undecided, say so rather than assigning
it to the nearest outcome.

## §6 What this is not

Not a design proposal. Do not suggest changing the record format, adding fields, or improving
the system. Do not evaluate whether the system is good. Only determine what the report must be
able to express, given the system as described.

## §7 Report

Write `RESULT.md` in this directory. Plain markdown, no process narration.
