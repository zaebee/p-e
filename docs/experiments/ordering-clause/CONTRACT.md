# Contract — who does this clause bind, and is this store bound by it?

You have three documents. They come from two different projects.

- **`A-spec.md`** — a specification for a message protocol called relay-lite. Verbatim, unedited.
- **`B-store-interface.ts`** — a TypeScript interface from a different project: a web
  application's storage layer, with several possible backends. Verbatim.
- **`C-tool-descriptions.txt`** — quotations from that web application's running server, each
  with its source line number.

Someone proposes to write a new backend for the interface in **B**, holding records that follow
the protocol in **A**.

## §1 Read nothing else

No network. Do not search for these projects or their discussion. Everything needed is in this
directory; everything outside it is out of scope, including anything you may recall about either
project.

Verify `sha256sum A-spec.md B-store-interface.ts C-tool-descriptions.txt` against `PIN.txt` and
report whether it matched. If it did not, stop and report that.

## §2 The question

`A-spec.md` §4 contains this:

> **[MUST NOT]** A consumer presents any linear projection as *the* causal history, or makes
> protocol assertions from a linearized sequence.

**Does a backend that satisfies `B-store-interface.ts` violate that clause?**

Answer in three parts, in this order, and do not merge them:

1. **Who does the clause bind?** Quote what in `A-spec.md` decides it. If the document does not
   define the term, say so — that is an answer, not a failure.
2. **Is such a backend one of those?** Reason from what `B` requires it to do, quoting the
   members that matter.
3. **If the clause is violated, by whom, and at which line of which file?** If by more than one
   party, say so. If by nobody, say that.

## §3 State your rule before you apply it

Before answering, write in one or two sentences how you will decide whether something is bound by
a clause addressed to a named role. Then apply it.

If applying it forces you to change the rule, show both versions and say what forced the change.
Do not silently rewrite it to fit the answer.

## §4 Two readings, if there are two

If the clause admits more than one reading, give **both**, say which you find better supported,
and name the words in `A-spec.md` that decide between them. Do not pick one and present it as the
only reading.

## §5 The parts of B that do not fit A

`B` was designed around a different storage model. Where a member of `B` has no counterpart in
`A`, say so and name it. Do not invent a mapping to make them fit, and do not treat an awkward
fit as a violation unless §2's clause makes it one — those are different findings and this
document wants them apart.

## §6 What you are not told

You are not told what anyone else concluded, whether a violation exists, or whether the proposal
went ahead. If your reading finds no violation, report that. An answer shaped to what seems
expected is worth less than an honest one either way.

## §7 Confidence

Mark each of the three parts as certain or uncertain, and say what would settle an uncertain one.
