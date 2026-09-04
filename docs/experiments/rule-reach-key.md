# Pre-registered key — what reaches into §3.3?

**Sealed 2026-09-04, before the run.** Input pinned at
`afd46fa45d4efc8fd1ee27c72e8bf86788ea8b6b02e90de0b2afc010a29e6bda`; stand at
`~/projects/rule-reach/`, contract in `CONTRACT.md`.

## Why this run exists

[#88](https://github.com/zaebee/p-e/issues/88) asks whether §3.3's rules bind. That decision
gates v0.13's clock sections and, through them, [#32](https://github.com/zaebee/p-e/issues/32)'s
defect 1 — if the rules are normative, §3.3 and §3.1 genuinely conflict and the conflict must be
resolved before the section can be written; if they are description, there is no conflict, only a
description nobody is obliged to follow.

**The decision is not what is being asked.** The contract forbids recommending a status. What is
asked is the fact the decision needs: **what does the rest of the draft lose if an implementation
ignores §3.3?**

## What the last run taught, applied here

`docs/experiments/norm-census/RESULT.md` records a census that could not find what it was run to
find, because it asked *"what could a fix violate?"* — a question that structurally excludes what
is relied on but not required.

**So this contract does not ask what can be violated.** It asks what *breaks*, which admits
answers of the form "nothing formally, and here is what stops working anyway". §4 asks the
converse directly: is any property §3.3 exists to produce stated as an obligation anywhere?

The sourcing rule from `relay-0860` is in the contract again. It held on first application in the
previous run and is the only instrument in this argument with a clean record.

## What I already know, and did not withhold from myself

One grep before sealing, and it is in the key so the predictions below are worth only what they
are worth. `hlc` or `HLC` appears outside §3.3 at lines 54, 68, 90, 93 and 134. Two of those —
90 and 93 — are among the twelve normative clauses.

I have not traced what any of them would lose. That is the run's subject.

## Predictions

| # | prediction | scored by |
|---|---|---|
| **P1** | The reader finds **line 90** — *"an act is sealed at creation: `id` minted, `hlc` stamped once"* — and reports that a `[MUST]` clause names an operation §3.3 defines. | identity |
| **P2** | It finds **line 93** — *"publishers MUST NOT re-tick the HLC"* — likewise: a prohibition on re-doing something only §3.3 says how to do. | identity |
| **P3** | It finds **line 134**, §4's comparator over `(l, c, node_id)`, and reports that ordering consumes the values without constraining how they are made. | identity |
| **P4** | It finds **between 4 and 7** dependent sites in total. | count |
| **P5** | §4 comes back **nothing found** — no obligation states the properties §3.3 produces. | identity |
| **P6** | At least one break is reported as **not detectable from the bytes**: an act carrying an arbitrary `(l, c)` is structurally indistinguishable from one produced by the rules. | presence |

**P5 and P6 are the two that decide anything.** P5 is #88's claim reached by a party that has not
seen it — twice now would make it two independent readings plus this one. P6 is the practical
consequence: if a departure from §3.3 cannot be seen, then making the rules normative buys an
obligation nobody can enforce, and leaving them descriptive costs nothing that was ever checkable.

I want to lose P6. If a departure *is* detectable, the decision is easier than I think it is.

## What is deliberately in the input, and what is not

**In:** the whole draft, and one paragraph naming §3.3 and saying explicitly that its status is
not asserted either way.

**Out:** #88, the criteria that failed, decision D, the addenda, defect 1, every resolution
proposed, and every record in this argument.

## The standing risk

I wrote the contract, and §2's three sub-questions — quote, what breaks, is it detectable — are my
choice of what to ask about each site. The third is the one I care about, and putting it in the
list is a choice that shapes the answer.

That is smaller than the last two runs' risks and it is not zero. `relay-grok` should be asked
after the run, not before.
