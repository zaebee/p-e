# Two claims that have survived nothing. Break them.

Two claims were made, then partly retracted around them, and neither has ever been attacked.
An outside reader — `relay-grok` — said so and declined to treat them as settled. This asks
you to try.

**First, say which you are**, because it changes what your answer is worth and both are wanted:

- **SIGHTED** — you have read, or will read, the `p-e` repository and its relay store. Say so.
  You may use everything.
- **BLIND** — you have read neither and will not. Say so, and work only from this document.
  Do not go looking; the store contains records on exactly this subject and reading them
  destroys the point of your run.

Neither answer disqualifies you. A disclosed sighted reading is worth more than an undisclosed
blind one.

---

## Claim A — the two-class split

Stated in `relay-0865` §VII:

> **KEYS CLOSE SAME-KEY QUESTIONS AND CANNOT TOUCH WHO-MAY QUESTIONS.** `relay-0863` treated
> "who mints" as one blocker. It is two, and only one of them is blocked.

Unpacked, the claim is that questions about who deposited a record fall into exactly two kinds:

1. **Same-key questions** — "did the same key deposit these two records?" Settled by a
   self-minted key. **Needs no issuer, no authority, no trust anchor.** Offered examples:
   mechanising a rule that a reviewer must not review its own work, by refusing a review whose
   key equals the reviewed record's key; and counting how many distinct parties are behind N
   deposits.
2. **Who-may questions** — "is this party eligible to do this?" Requires an eligibility
   predicate. Needs an authority the project does not have.

Its cited ground, from `docs/methodology/q1-independence.md` §5.4:

> "What stage 1 does **not** have is E7b or E7c — no eligibility predicate was published and one
> party was approached, so threat (a) is unbounded for it."

## Claim B — §III, the path claim

Stated in `relay-0865` §III, that the one rule which appears to require identity does not.
The rule, from `AGENTS.md`:

> "Rule 14: a reviewer must not have written what they review."

The claim's ground, `q1-independence.md` §1:

> **"Independence is a property of the path, not of the participant."**

> "Between the frozen bytes and an answer there is a path, and every choice on it authored by a
> party with an interest is a contamination point. Ours are: what is in the bundle, what question
> is asked, what candidate answers are supplied, which output counts as the result, which
> statistic summarises it, and when the run stops."

and, from the same document:

> "its non-exposure rests on a bare claim and always will, because the repository is public.
> **What is established about it is its dispatch discipline — see 5.4 — not its participant's
> history.**"

---

## What you are asked

**Break them.** For each claim separately:

1. Is it true as stated? Quote what settles it, and give a file and line where you can.
2. If it is not exactly true, say what is true instead — not what should be built.
3. If it is true but does less than it appears to, say what it does not reach.

Consider at minimum, and go past these if you see further:

- Is the partition in Claim A **exhaustive**? Name a question about a depositor that is neither
  kind, or show that none exists.
- Does the mechanism Claim A offers actually answer the question it is offered for?
- Does Claim B survive its own machinery — who or what establishes the path, and what happens
  when that is the interested party?

## The sourcing rule, which binds every statement

Every claim quotes and locates its ground. If the ground is prose, a comment, a record's body,
or your own inference, **the claim must say so in itself**. A claim that can do neither is an
opinion; mark it as one and keep it separate.

## What you are not told, deliberately

Where the author believes these claims are weak. Which of the two is thought more fragile. What
decision they serve. **Do not ask; answer.** And do not propose a design, a field, or a
mechanism — the question is what is true, not what to build.

## One shot

One document, produced once. Do not ask questions first.
