# Contract — what does this document say about a field it does not declare?

`SPEC.md` is a specification for a message protocol. Verbatim, unedited.

## §1 Read nothing else

No network. Do not search for this protocol or its discussion, and do not draw on anything you
may recall about it. Everything in scope is in this directory.

Run `sha256sum SPEC.md` and compare with `PIN.txt`. Report whether it matched; if it did not,
stop and say so.

## §2 The question

An act arrives. It carries every field the document declares, well formed, and **one more** that
the document does not mention — call it `surprise`.

**What does this document say happens to that act?**

Answer in three parts, in this order, and keep them apart:

1. **Does the document answer directly?** If a passage settles it, quote that passage. If none
   does, say so — that is an answer, not a failure.
2. **Does anything in the document imply an answer?** Reason from what is written, quoting it.
   Mark clearly where you are inferring rather than quoting.
3. **Could two implementations, both following this document, disagree about whether that act is
   admissible?** If yes, say what each would point at.

## §3 State your rule before you apply it

Write, in one or two sentences, how you will decide what a specification says about a case it
does not name. Then apply it. If applying it forces you to change the rule, show both versions
and say what forced the change.

## §4 Both readings, if there are two

If the document supports more than one answer, give **both**, say which is better supported, and
name the words that decide between them. Do not pick one and present it as the only reading.

## §5 Evidence against your own answer

Whatever you conclude, look for the strongest thing in the document that cuts the other way, and
report it. If you find nothing, say that you looked.

## §6 What you are not told

You are not told what anyone else concluded, whether this is a known problem, or whether the
question has been settled elsewhere. Do not shape the answer to what seems expected.

## §7 Confidence

Mark each of the three parts certain or uncertain, and say what would settle an uncertain one.
