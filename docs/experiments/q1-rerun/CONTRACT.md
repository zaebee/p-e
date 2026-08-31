# Contract — eliminate candidates against binding text

A specification identifies record content by `sha256(bytes)` and never defines `bytes`. Five
axes of that ambiguity are listed in `CANDIDATES.md`. Your task is **not** to choose the right
answer. It is to determine, for each axis, **which candidates the specification's binding text
contradicts**.

## §1 Read nothing else
Do not read, list, or search outside this directory. No network. You may run code you write
yourself against files here. Verify `sha256sum SPEC.md` equals the value in `PIN.txt` and say in
your report whether it matched; if not, stop and report that.

## §2 Which text binds — apply this criterion yourself, do not take my word
The binding set is **every clause in `SPEC.md` using an RFC-2119 keyword** (MUST, MUST NOT,
SHALL, REQUIRED), **except**:
- prose that *refers to* a clause rather than stating one (e.g. "MUST 2 exists for the third
  row", "the existing store does not satisfy MUST 1");
- any section the document itself declares non-binding. **The document does declare one.** Find
  it and say which lines you excluded and why.

Report the full list of binding clauses you admitted, by line number, **before** you evaluate
anything. If your list differs from what you would have guessed, say so.

## §3 What counts as a rejection
A candidate is rejected **only** where a quoted binding clause is **contradicted**, and the
quote must appear in your report. Weaker relations are **not** rejections and must be recorded
as NOT REJECTED however unattractive the candidate:
- "only this candidate serves a purpose the spec states" — not a rejection;
- "this candidate makes some clause awkward, or harder to satisfy" — not a rejection;
- "no conforming implementation would do this" — not a rejection.

Where you judge a contradiction **arguable in both directions**, record it as NOT REJECTED and
state both readings. Do not resolve it.

## §4 Outcome per axis
Report, for each of the five axes, the surviving candidates and the quoted clause that
eliminated each rejected one. Then state the count: 0, 1, or more than 1.

**More than one survivor is an expected and correct outcome, not a failure.** A run that
returns "more than one" on every axis is a valid result. Do not reach for an answer.

## §5 What this is not
You are not choosing a digest domain, not recommending one, and not saying which candidate is
better. If you find yourself arguing that a survivor is the right answer, that is outside this
contract. Report eliminations and counts.

You are also not auditing the specification. If you find a defect that does not bear on the
five axes, one line at the end.

## §6 Report
Write `RESULT.md` in this directory. Plain markdown, no process narration.
