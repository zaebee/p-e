# Pre-registered key — the `seq` census

**Sealed 2026-09-04, before the run.** Input pinned at
`33b8661eced117a5f31505816779f1b9c318fb9b183a2cca8f39a471832ecb31`; stand at
`~/projects/seq-census/`, contract in `CONTRACT.md`.

## Why this run exists

`relay-0811` measured `seq` by counting reads in `relay-ui`'s `src/` and concluded that removing
it would be cheap. `relay-0812` showed the quantity was wrong — `seq` is in the wire format, and
counting frontend reads says nothing about what the protocol promises. `relay-0814` added that the
choice of quantity was the move that made the cheap option look cheap.

**So the measurer is disqualified, and this run hands the counting to a reader who is not told
what hangs on it.** The contract asks for a census and forbids assessment. It does not mention
relay-lite, capabilities, cost, or that a decision is pending.

## What I already know, and did not withhold from myself

Measured before sealing, in `relay-ui/src/` only: **13 lines** match `\.seq\b|\bseq:`. Of the
reads of an envelope's `seq`, five carry a `|| 0` fallback; of those that do not, four are log or
display strings and two are pass-through into a local type. The one read that carries content is
`src/utils/causalGraph.ts:163`, a tiebreak within a depth that already came from the causal graph.

The server side I have **not** measured. That is deliberate: the predictions below are worth
something only where I did not look first.

## Predictions

| # | prediction | how it is scored |
|---|---|---|
| Q1 | Total occurrences across `input/`: **28–38**. `src/` contributes 13. | exact count |
| Q2 | Exactly **two** producers: one that allocates a number, one that *derives* it from a locator string. | count and kind |
| Q3 | **At least three** boundary crossings: the records listing, a deposit response, and a server-sent event. | count and identity |
| Q4 | **Zero** reads throw. Most fall in **(c)** — proceed and produce a different result with no signal. `causalGraph.ts:163` is (c). | per-site agreement |
| Q5 | **Nothing found.** No consumer outside the tree is named in it. | found / not found |

## What each outcome means

**Q5 is the one that decides something.** `relay-0812` argued that consumers outside this tree may
depend on `seq` in the JSON. If the reader finds such a consumer named in the input, that argument
gains evidence it did not have. If it finds none, the argument stands as a possibility rather than
a demonstrated dependency — which is weaker than it was stated, and I should say so.

**Q4 is the one that tests my own error.** I classified `|| 0` sites as "already defensive".
`relay-0814` answered that a fallback proves a fallback exists, not that the value takes no part
in ordering. If the reader independently puts those sites in **(c)** — proceeds, different result,
no signal — then "defensive" was the wrong word for them and `relay-0814` is confirmed by a party
that never saw it.

**Q1 tests nothing but my arithmetic.** It is here so that a wildly wrong count invalidates the
rest before I read it.

## What is deliberately in the input, and what is not

**In:** the whole of `src/` including `src/data/`, all of `server/`, `server.ts`, `package.json`.

`src/data/` was removed while assembling the stand and then restored, because it contains `seq`
in scenario text. Curating the input is the same fault this run exists to correct, and it was
caught inside a minute — recorded here so the near-miss is not lost.

**Out:** the p-e corpus, the relay-lite implementation, this key, the specification, and every
record in this argument. The reader has the code and the questions and nothing else.

## Carrier rules

The reader's output goes into `READER-OUTPUT.md` verbatim, including any formatting damage. My
scoring goes into `RESULT.md` and cites this file. The input is re-hashed after the run and the
result records whether it matched.

## The standing risk in this run

I wrote the contract. A reader steered by its questions is steered by me, and questions 1–5 are my
choice of what to count — the same fault at one remove. The mitigations are that the questions ask
for facts rather than judgements, that §6 forbids inferring the purpose, and that these predictions
are sealed before the answers exist.

That is not the same as neutrality and I am not claiming it is.
