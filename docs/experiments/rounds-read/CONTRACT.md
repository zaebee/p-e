# Contract — which of these 46 promises were kept?

You are given a protocol specification, the frozen proposal it descends from with its sixteen
review rounds, and a list of 46 numbered undertakings made during those rounds.

## §1 Read nothing else

Work only from `input/`. Do not fetch anything, do not look for the project online, do not use
knowledge you may have of it. If you recognise it, set that aside and say so.

## §2 The question

`input/ITEMS.md` lists 46 undertakings by line number into
`input/thread-v0.1-and-16-rounds.txt`. Each is a numbered item inside a response section, in
which its author states what will change in the draft.

**For each of the 46: did the draft receive it?**

The draft is `input/relay-lite-v0.12-draft.md`. Its three addenda are also in `input/` and count
as part of it.

## §3 The verdicts, which are fixed and not yours to extend

From `input/PREDICATE.md`, which was sealed before any of this was classified:

| verdict | meaning |
|---|---|
| `LANDED` | the draft carries what the item undertook, recognisably |
| `LANDED-ALTERED` | the draft carries something different, and a later round records the alteration |
| `SUPERSEDED` | a later response withdraws or replaces it, in writing |
| `PARTIAL` | part of the undertaking is in the draft and part is not |
| `NOT-LANDED` | the draft carries none of it, and no later round withdraws it |

**Use these five and no others.** If an item fits none, say so and say why rather than inventing
a sixth.

**Silence is not withdrawal.** An undertaking nobody mentions again has not been withdrawn; it
has been forgotten. That distinction is the whole point of this exercise.

## §4 How to read, which is not optional

**Do not decide by searching for the undertaking's words in the draft.**

A promise can arrive with its vocabulary intact and its force gone — a rule undertaken as a
`MUST` and delivered as a descriptive sentence has landed as prose, not as a rule. A word count
cannot see that. **Read each undertaking, then read the passage in the draft that answers it, and
compare what each obliges.**

This instruction is here because a previous pass on these same materials screened by term
presence and missed exactly that case, catching it once by luck. You are being told the method,
not the answer.

## §5 What each verdict must carry

1. The item's line number and a short quotation of what it undertook.
2. The draft's line number and a short quotation of what answers it, or "nothing answers this".
3. The verdict.
4. **If `LANDED`: does the draft carry the undertaking's normative force, or its content only?**
   State which. An undertaking that promised a `MUST` and arrived unmarked is `PARTIAL`, not
   `LANDED`.
5. One line of confidence: how sure you are, and of what.

## §6 The sourcing rule

Every claim quotes a line and gives its number, in whichever file. If your ground is your own
inference — that two differently worded passages mean the same thing, for instance — **the claim
must say so in itself**. A claim that can do neither is an opinion; mark it and keep it separate.

## §7 What you are not told

Which items anyone believes landed. What this count serves. Whether the draft is thought to have
a problem. **Some of these 46 have been classified already and you are not told which** — say
what you find.

**Do not propose a repair.** Do not say what the draft should have said. The question is what
arrived, not what ought to.

## §8 One shot

One document, produced once, written to `answer.md` in the directory above `input/`. Do not ask
questions first. If you cannot reach a verdict on an item, say `UNDECIDABLE` for that item and
say what you would need — that is a real answer and a guess is not.
