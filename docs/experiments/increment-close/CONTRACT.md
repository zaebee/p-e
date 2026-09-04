# Contract — what can a specification do about this?

You are given one extract from a draft protocol specification, in `input/spec-extract.md`.
Three of its sections: the canonical serialization rules, the clock update rules, and the
verification pipeline. Section numbers are the source's.

## §1 Read nothing else

Work only from `input/`. Do not fetch anything, do not look for the project, and do not use
knowledge you may have of it. If you recognise it, set that aside.

## §2 The problem, stated as fact

§3.1 requires integers to lie within `[-(2^53 - 1), 2^53 - 1]`.

§3.3's ingest rule computes, for a message `M` arriving at a node whose last clock was
`(last_l, last_c)`:

```
c' = max(last_c, M.hlc.c) + 1     when l' == last_l == M.hlc.l
```

A message carrying `M.hlc.c = 2^53 - 1` satisfies §3.1 and so must be accepted by §7.1's
stage 2. The ingest rule then computes `c' = 2^53`, which §3.1 forbids.

Verified by running it: the message is accepted, the resulting clock cannot be serialized.

**The domain is not closed under the operation the protocol performs on it.** For any interval
`[0, M]`, taking `last_c = M.hlc.c = M` gives `M + 1`, outside it. So no ceiling alone resolves
this — any resolution must say what happens at the top.

## §3 The question

**Enumerate what a specification could do about this.** Every distinct resolution you can
construct, not the ones you would recommend.

For each, state:

1. **The rule**, precisely enough that two implementers would write the same code.
2. **Which part of the specification it changes** — §3.1, §3.3, §7.1, or the act's type.
3. **What it costs.** What a conforming implementation can no longer do, what a conforming
   message can no longer be, or what a node must now do that it did not.
4. **What property it preserves that the others do not**, if any.

## §4 State your rule before you apply it

Before the list, say what you counted as *distinct*. Two resolutions differing only in a
constant are one; two differing in which section they touch are probably two. Say where you drew
that line and apply it consistently.

## §5 Completeness

After the list, argue about its completeness. Is there a resolution you can see the shape of but
could not state precisely? Is there a class of resolution your rule in §4 excluded? Say so.

## §6 What you are not told

You are not told which resolution anyone prefers, whether any has been chosen, what else has been
decided about this protocol, or why the question is being asked. Those are withheld deliberately.

**Do not recommend one.** Do not rank them. Do not say which is best, cheapest, or most likely.
If you find yourself concluding that one should be adopted, stop: that is outside this contract.

## §7 Confidence

One line per item: how sure you are that it is a real resolution rather than a restatement of
another.

## §8 One shot

Produce the whole enumeration once, in a single document. Do not ask questions first.
