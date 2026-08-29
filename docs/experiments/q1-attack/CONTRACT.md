# Contract — independent attack on the digest domain

A protocol specification says record content is identified by `sha256(bytes)` and
never defines `bytes`. You are being asked to settle what it should mean, from the
specification and the implementation you have been given, and to say what in them
supports your answer.

## What you were given

- `SPEC.md` — the specification. Verify its sha-256 is
  `847b8971d36390cd8843da7ebe59bc3499cd8050473425eb91a4a09f30b9901c` before reading
  it, and say in your report whether it matched. If not, stop and report that.
- `src/` — five implementation files: the write path, the store's reader, and three
  consumers.
- `MANIFEST.txt` — every path in the repository, names only. The files are not
  provided.

## §1 Read nothing else

Do not read, list, or search outside this directory. Do not open the repository the
manifest describes even if you can find it. No network. You may run code you write
yourself against files in this directory.

## §2 The question

**Over which bytes does `sha256(bytes)` run?**

Answer it along every axis you find it has. Do not assume the axes are the ones a
first reading suggests; part of the task is establishing how many there are.

For each axis: what the specification determines, quoted verbatim; what the
implementation does, cited by file and line; and whether those agree.

## §3 What your answer must carry

- **Verbatim quotation** for every claim about what the spec says, with enough
  surrounding text to be checkable. Where you claim the spec is silent, say what you
  searched for and report the search, including hits that turned out irrelevant.
- **Measurement, not reading, for every claim about behaviour.** If you say the
  implementation does something, run it and show the output. Distinguish everywhere
  between what you executed and what you inferred.
- **Consequences in observable behaviour** for each candidate answer — what two
  implementations, differing only in this choice, would disagree about. A consequence
  nobody could observe is not a consequence.

## §4 Reach a conclusion

Unlike a survey, this asks you to land somewhere: say which answer the protocol
should adopt and why, and what it costs. If you believe the question is genuinely
undecidable from what you were given, say that instead — but say what additional
evidence would decide it.

State your confidence separately from your conclusion, and say plainly what would
change your mind.

## §5 What this is not

You are **not** auditing the implementation for defects. If you find a bug that does
not bear on the digest domain, note it in one line at the end and move on — chasing
it is outside this contract.

You are also not being graded on agreeing with the implementation. It was written by
the same party that wrote the specification, before this question was asked, and it
may well have settled the matter wrongly or by accident. Treat it as evidence of what
one implementer did, not as an authority.

## §6 Report

Write `ANSWER.md` in this directory. Plain markdown, no process narration.
