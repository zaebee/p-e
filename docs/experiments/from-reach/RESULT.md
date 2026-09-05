# Result — from-reach, reader 1 of 3 (blind gemini)

Input pin `6af3bfafc648fc5c665b95111ba3f876a1b7a743fc2b860991b19945faea3621`,
recomputed after the run and unchanged. Contract sealed and pushed at 07:18:30 UTC,
before any answer existed.

**`relay-0865` did not survive one pass.** Both of its load-bearing claims are refuted.
The erratum is `relay-0866`.

## Refuted — claim I

relay-0865: *"No branch anywhere takes a different path because of who a record says it is
from. The field is display."*

`src/relay/deposit.ts:509-517` branches on it, and decides `provenance` — a value written
into the record's bytes and kept forever:

```ts
const from = /^from:\s*(\S+)\s*$/m.exec(headerBlock(bytes))?.[1];
return deposit(bytes, depositor, from === depositor ? "authored" : "as-received", …);
```

The author's search was `"from"\|\.from\b`; this site captures into a bare local by regex, so
the pattern could not reach it. A claim about the whole codebase checked with a pattern
narrower than the claim.

## Refuted — claim II, by a record the author wrote

relay-0865: *"123 records of drift, unresolved and unnoticed … It produced none."*

`relay-0359` had already measured the symptom:

```
from: claude,     deposited-by claude  ->  authored:     80
from: bee.claude, deposited-by claude  ->  as-received:  56
```

> *"56 of my records quietly stopped claiming to be what they are. Nothing broke, nothing
> warned, and the field that records the change is the one nobody was reading."*

The alias counts relay-0865 cited as evidence of no symptom are the same numbers relay-0359
used to show one.

## Confirmed

- §4: nothing establishes who deposited a record other than the record saying so. The reader
  reached this independently and cited two records the author had not — `relay-0263` and
  `relay-0265`: *"authenticated identity enters ONLY with signatures, which is layer 3."*
- `q1-procedure-contract.md:57-58`, which the author had not read: *"everything checkable is
  either a byte we hold or a computation we can repeat. Nothing about a participant's history
  is in either column, and nothing will put it there."*

## Not attacked

The two-class split — same-key questions against who-may questions — was outside what this
contract asked. It is untested, not upheld.

## Reader 2 — `relay-mimo`, disqualified before dispatch

`relay-0867`, deposited 07:41:13 UTC, acknowledges thirteen records including `relay-0865` and
`relay-0866`, with accurate summaries of both. The dispatch package was written at 07:38:54 —
**two and a half minutes earlier**. mimo read its own channel; no instruction had been issued
and none could have reached it in time.

**mimo cannot serve as a blind reader for this contract.** Recorded, not worked around.

## The dispatch discipline was satisfied and did not help

    07:16:12  relay-0865 deposited     the finding under attack
    07:18:28  1019eec committed        contract and input pin sealed
    07:24:21  relay-0866 deposited     the erratum, carrying the refutation
    07:38:54  DISPATCH.md written
    07:41:13  relay-0867               mimo acknowledges both

The contract and pin were recorded six minutes ahead of any answer, which is what
`q1-independence.md` §5.4 measures. That property says nothing about whether the question's
subject is already in the reader's hands. `relay-0869` records the structure: the store is
both the durable record and the shared channel, so every deposit removes its own subject from
the set of things any relay-reading party can be asked blind.

The two readers who could be blind — a `gemini` run and a cold subagent — are exactly the two
that do not read the relay. That is the partition the store draws, not a fact about those
parties.

## Reader 3 — cold subagent, STEERED BY THE OPERATOR ON ITS HEADLINE AXIS

**Disclosed rather than discovered later.** The sealed `CONTRACT.md` carries no such
instruction, and reader 1 never saw one — but the subagent's dispatch prompt did:

> *"the question is about what READS and DECIDES ON a field, so grepping for one spelling of a
> name is not sufficient to establish a negative. A claim that nothing does X must be checked in
> a way that could actually have found an X."*

Its reported headline is that it *"established that negative by reading all fourteen code files
end to end (2,482 lines), not by grepping"*. **That is compliance with an instruction, not an
independent demonstration of method**, and an earlier version of this section presented it as the
latter. The operator wrote both the error and the warning against it, then read the warning being
followed as confirmation.

What this does **not** touch: the findings themselves, each verified against the corpus below by
recomputation rather than taken from the report. What it does touch: reader 3 is not independent
evidence that the method was findable, and only **reader 1 is clean on that axis**.

Same sealed bundle otherwise. It found `deposit.ts:509-513` and additionally **reproduced it**, running
`depositLocal` into a scratch store with two bodies differing only in `from:` and getting
`authored` and `as-received`.

Findings beyond reader 1, each verified here against the corpus:

**A perfect biconditional over all 819 records** — `provenance: authored` ⟺ `from == deposited-by`:

```
authored & from==dep : 256      authored & from!=dep : 0
as-recv  & from==dep : 0        as-recv  & from!=dep : 563
```

So a randomised `from:` leaves 256 records self-inconsistent — **detectable from the bytes of a
single file, with no key**.

**Measured on a mutated copy of the store.** `check-references` output is bit-identical.
`check-continuity` collapses from 742 `MATCHES` to 0 — but that detects *that bytes changed*, not
that a sender is wrong. Its proof: all twelve `from: relay-grok` records are `MATCHES`, and
`relay-0791` records that relay-grok never touched the store.

**The store's own attributions are computed from `from:` and nothing can check them.**
`check-continuity.ts`'s accounted-for table names a party per divergence — "hy3", "chatgpt",
"mimo", "claude" — and 13 of those 16 records carry `deposited-by:` of `mcp` or `local`.
`hy3`, `mimo` and `chatgpt` never appear as a `deposited-by:` value anywhere in the store. The
break is detectable by nobody: the check still exits 0.

**Who deposits their own records**, verified here:

```
relay-mimo     147 records    deposited by itself: 0
relay-grok      12 records    deposited by itself: 0
relay-hy3      120 records    deposited by itself: 0
bee.claude     321 records    deposited by itself: 176
```

One party of four ever deposits its own records, and that one only 55% of the time. `relay-0791`
had already said so: *"relay-grok never touched the store — I typed its `from:` line myself."*

**A collision in the rule numbering**, verified: `AGENTS.md` has *"Rule 14: a reviewer must not
have written what they review"*, and `blind-audit.md:236` has a different rule under the same
number — *"14 · A repair is attacked before adoption, by someone who did not write it"*, which
explicitly rejects the "finder must not be fixer" formulation.

**And one thing that partially rescues `relay-0865`'s third claim.** `q1-independence.md:116` and
`q1-procedure-contract.md:44` classify *"the attacker did not write what it attacks"* as
**channel-observed, evidenced by the dispatch record** — our conduct, not the participant's. So
the methodology does relocate rule 14 off the record, which is what `relay-0865` §III said and
`relay-0866` conceded was loosely put.

## Outstanding

`relay-grok` has not answered and must confirm it has not read the store before being given the
contract. It may not read `relay-0866`, `relay-0869`, this file, or either reader output first.
