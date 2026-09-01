# Contract — what is the content digest of each record?

`SPEC.md` is a specification for a record store. It identifies record content by
`sha256(bytes)`.

`payloads/` holds record files. **For each one, report the value the specification identifies as
that record's content digest**, as 64 lowercase hex characters.

You are not asked whether the specification is good, whether the records conform, or what should
be changed. Only what the digest of each is, under this specification.

## §1 Read nothing else

Do not read, list, or search outside this directory, and do not search the filesystem for related
material. No network. You may write and run your own scripts against files here.

Verify `sha256sum SPEC.md payloads/p1.txt payloads/p2.txt payloads/p3.txt payloads/p4.txt
payloads/p5.txt payloads/p6.txt payloads/p3.wire payloads/p4.wire` against `PIN.txt` and report
whether every line matched. If any did not, stop and report that instead.

## §2 What the files are

- `payloads/pN.txt` — a record as the store holds it on disk.
- `payloads/pN.wire` — present for some payloads only. It records the byte sequence the **sender
  emitted** for that same record. Where there is no `.wire` file, no such record was kept.
- `payloads/control.bin` — not a record. See §5.

Read the payload files as bytes. Do not assume they are valid text.

## §3 State your basis before you answer

Before the table, write which text in `SPEC.md` determines what `bytes` denotes — quoted, with
line numbers. If the specification does not determine it, say so plainly and state what you
used instead and why. **Do not silently pick a reading and present the result as the
specification's.**

If more than one reading is available to you, say how many, say which you used for the table, and
give the table only for that one.

## §4 The table

One row per payload, in order `p1 … p6`:

    p1  <64 lowercase hex>
    p2  <64 lowercase hex>
    ...

Nothing else in the table. No commentary between rows, no ranges, no alternatives. If you cannot
produce a value for a payload, write `p3  NO VALUE` and give the reason below the table, not
inside it.

## §5 The control

Report `sha256(payloads/control.bin)` as 64 lowercase hex characters. Its expected value is not
given to you anywhere in this directory.

## §6 One shot

There is no clarification channel. If something is ambiguous, resolve it, record how you resolved
it under §3, and answer. Do not ask.

## §7 What this is not

Not a conformance check, not an audit, not a design review. Do not propose changes to `SPEC.md`
and do not evaluate the records.

## §8 Report

Write `RESULT.md` in this directory: the hash-check outcome, then §3, then the table, then the
control, then anything you must say about §4 exceptions. Plain markdown, no process narration.
