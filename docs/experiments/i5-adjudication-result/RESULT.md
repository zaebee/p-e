# I-5 adjudication — three readings

2026-08-29. The same bundle and the same prompt to three readers, separately:
Grok (never previously exposed to the catalogue), Gemini (had read it twice in
earlier blind runs), Mistral (had read it twice, including once as the independent
clause reader).

The question: does I-5's `expect:` line constrain the verdict for A, or only for H?

| reader | ruling | ambiguous? |
|---|---|---|
| Grok | **only H** | no |
| Gemini | **only H** on strict reading | **yes** — states both readings and what would settle each |
| Mistral | **both** | no |

**This is not a vote and is not reported as one.** relay-0196 recorded that
convergence does not show what parties converged on; counting three readers would
be the same error one level up. What follows is an examination of the grounds.

---

## Mistral's ruling rests on two false statements about the document

Its third ground:

> When the catalogue intends a constraint for only one producer, it names that
> producer explicitly inside the `expect:` line. **The only such example is I-4.**

There are four. Verified against the frozen text:

```
I-4:  A's half may return UNDECIDABLE
I-6:  if A can never exercise this, the invariant is under test a single source
I-8:  H's half is likely UNDECIDABLE from artifacts
I-9:  likely UNDECIDABLE for H, same reason as I-8
```

Its argument was that an unnamed producer implies an unscoped constraint, with I-4
as the lone counterexample. With four, the pattern runs the other way: naming the
producer is the document's norm in four of five `expect:` lines, and I-5 is the
exception.

Its second ground cites *"I-1's `expect:` block"* as precedent for a global
constraint in passive voice. **I-1 has no `expect:` line** — it has a `note:` line.
The cited precedent does not exist.

Discounted for factual error, not for being outnumbered. Had it been the only
reader, the same errors would be the same errors.

## Grok's grounds check out

- `anchors.json` appears only for H; A's artifacts are `health.json`,
  `history.json` and the log entries. Verified.
- The `reader:` block is producer-bifurcated in seven of nine invariants. Verified.
- The sentence opens with an H-specific fact and the conclusion is joined by *"so"*,
  inheriting that scope.

It found the pattern in I-4 and I-6 and cited it correctly.

## Gemini did what the question asked, and found the evidence unaided

It ruled narrow on the strict reading, then reported — separately, as the prompt
asked — that a genuine ambiguity survives, and gave the two rewordings that would
settle it either way.

Its strongest point is one **deliberately withheld from the bundle**: across the
catalogue, `half` appears three times — `A's half`, `H's half`, and `the
no-backfill half`. Twice producer-qualified, once not, and in I-5 the word shifts
from denoting a producer's share to denoting a conjunct of the invariant's title.
That was gathered before the adjudication and kept out precisely so that finding it
would mean something. It found it.

Its second point is also substantive and was not in anything we assembled: apex's
`history.json` is likewise a single folded snapshot, so *"a gap cannot be observed
in a single period"* transfers to A as an epistemic principle even though A has no
anchors.

---

## Where the grounds leave it

Both readings have real textual support, and the support is not symmetric.

**Narrow**: anchors are H-only, the causal premise is H-specific, `reader:` is
producer-bifurcated. Three grounds, all verified against the text.

**Wide**: `half` is producer-qualified twice and unqualified here; the
single-snapshot reasoning transfers to A on its own merits. Two grounds, both
verified, and **both supplied by a reader that ruled narrow**.

The one reader that ruled wide argued from two errors.

That is the state of the evidence. Which reading governs is a ruling, of the same
class as I-3's title-versus-falsifier at relay-0153, and it belongs to bee.zae
rather than to any reader here — including this one.

## What follows from each

**Narrow.** `clause.ts`'s CONFORMS is correct. Our check is over-strict, which
reinstates bee.hy3's original diagnosis withdrawn in relay-0193, restores the
`ACCOUNTED_CLAUSES` pin's original reason, and reverses my corrections in OBS-060,
OBS-069, relay-0192 and this experiment's predecessor. Run 08's verdict does not
move — the check still returns UNDECIDABLE — but its ground becomes a reader's
judgement rather than a requirement of the clause.

**Wide.** Everything as currently corrected stands, and `clause.ts` is defective
and may be repaired.

**Ambiguous, ruled as such.** Gemini's answer names what would have to be added to
the sentence to settle it. The catalogue is frozen, so that is a §11-class
amendment rather than an edit, and the honest state until then is that neither
implementation is established as wrong.
