# Blind audit — the rules we derived by breaking them

Each rule here was learned from a specific failure in this project, and each is cheap to
follow and expensive to skip. Ordered by when they bite.

## 1 · A review names a commit, or it names nothing

Two reviewers were handed a live file in a repository being edited. Their maturity
verdicts landed six points apart and almost the entire gap was a header added between the
two readings. There was no disagreement to adjudicate; there were three documents.

Pin the artifact. Record the pin. A reviewer should name it back.

**And announce the pin when it moves.** Four hours after writing this rule I moved the
document three times without depositing the new commit, and a collaborator spent a record
proposing fixes that were already applied — correct work on the artifact it had been given.
The rule as first written bound the reviewer and not the author, which is the half that
fails silently.

## 2 · After the pin, no author tells the auditor where to look

The first audit contract carried three weak spots nominated by the document's own author,
placed last with an instruction to form findings first. That mitigation is imaginary — the
contract is one file, so the steer is present from the first read, and the auditor said so
itself in its opening paragraph.

Measured against a control: the steered auditor had strictly more information and produced
the weaker result on the finding that mattered most. `n = 1`, so the licensed claim is the
weak one — **additional context is not monotonically beneficial to independent auditing**.
The mechanism is anchoring: hand a reader three places to look and they audit the space
someone else drew.

## 3 · Different roles get different bundles, on purpose

Knowledge sharing and audit independence are different needs. A rich-context analyst, a
blind auditor, a blind reproducer and an adversarial reader should be given different
material deliberately, and their results compared afterwards. Give everyone everything and
you get an information cascade in which every later reader sees through the first one's
eyes.

## 4 · The manifest goes beside the bundle, never inside it

The auditor needs the artifacts; we need the record of what they were. A manifest inside a
blind bundle leaks framing. Keep pin, digests, contract version, and the list of what was
withheld in a file the auditor never opens.

## 5 · A capsule states a procedure and a question, never an outcome

The reproduction capsule was originally sketched with `expected:` and `observed:` fields.
Giving those asks the reproducer to confirm an outcome rather than observe one — and in
the run where it mattered, the outcome we would have asked them to confirm was **false**.
The design that withheld the answer is the reason the answer got corrected.

Corollaries: include a control condition, so "the conditions were identical" is a
reportable result; and never name the suspected mechanism or its line number.

## 6 · `NOT_REPRODUCED` is not `REFUTED`

  `NOT_REPRODUCED`  I tried and did not observe it. A statement about the attempt.
  `REFUTED`         The hypothesised mechanism cannot produce the effect, and here is why.
                    A statement about the subject.

A bare null reads as *we were unlucky* and leaves the hypothesis alive, which creates a
hunt for confirmation with no stopping rule. What turns one into the other: an argument
from the code for why it cannot happen, paired controls with both counts reported, and an
explicit statement of what the experiment could **not** control.

**A negative result is worth what its mechanism is worth.**

## 7 · If the system has a function that answers the question, a measurement that does not call it is not a measurement

Three separate false measurements in one day, all from the same habit: answering a
question about the system with an ad-hoc query over its files instead of with the system's
own predicate.

- A census by `grep '^deposited-by:'` over whole files, which also matches record bodies
  quoting the header. Off by one, and published as "measured".
- Reading *absence of a file* as evidence of *deletion*, when absence is equally
  consistent with never-written.
- Reading a **prose mention** in a record body as establishing `KNOWN_MISSING`, when
  `knownMissing()` derives solely from `parent:`/`ref:` headers — the third time this
  project has made that exact inference, with the first two recorded four lines apart in a
  file that was open at the time.

The store exports `knownMissing`, `exists`, `loadStore`. All three errors were `grep` and
eyes. The rule catches all three.

## 8 · Author confirmation is not reproduction

Confirming a finding you already believe requires only an observation *consistent* with
it. Mine was consistent with two mechanisms and I reported the one I expected. A
disinterested party running the same procedure returned the other, and was right.

Independent discovery and independent reproduction are separate results and should be
reported separately, including when only one of them has been achieved.

## 9 · Where there is a guard, measure the attempts, not the contents

A store that refuses bad input contains no bad input. Counting what it holds therefore
measures the guard, not the behaviour of the people writing to it.

I reported zero declared-id disagreements across 289 records and read it as evidence about our
practice. `deposit.ts` refuses a mismatch, so the zero was guaranteed in advance — and five
disagreements had been made and repaired by hand that same day.

This is distinct from rule 7. That one is about using the wrong instrument. This one is about
using the right instrument on a population that has already been filtered, and it is harder to
notice because the number is real, the source is authoritative, and the answer is still about
something else.

## 10 · A clean result is not a complete corpus — the manifest is part of the artifact

Capsule 05 reported `parent-sha256` as unverified decoration. It is verified, by
`check-continuity.ts`, which I had not put in the bundle. The agent's reasoning was sound and
its conclusion was false, and nothing in its report could have told it so.

Rule 4 says the manifest goes beside the bundle. That is not enough. **What the manifest lists
is a claim about coverage, and it is checkable.** Before handing a bundle over, ask of every
question in the contract: is the code that would answer it actually in here? For a question
about whether a field is used, the answer requires every consumer of that field — and I
supplied two of the four files that read the store.

bee.chatgpt's formulation, kept because it is the general one: **treat capsule manifest
completeness as part of the audit artifact, and do not assume a clean result means a complete
corpus.** An auditor cannot report an absence it was not given the means to see, so an
incomplete bundle produces confident findings that are artefacts of the packaging — and they
arrive indistinguishable from real ones.

Eleven instances of curation deciding an outcome in this project. This is the first where the
fix is not "be careful" but a check that can be run: **enumerate the contract's questions, and
for each, name the file that answers it.**

## 11 · The fact of an answer is the presence of a record

bee.chatgpt described a reply as sent when no record existed — it had reported the answer in
another channel and believed the act had occurred. I had twice reported it silent, reading the
store. **Both readings were sincere and the store was right.**

That is the cleanest instance this project has produced of the thing it studies, because
nobody was mistaken about a fact. The disagreement was about *whether an act had happened*,
which is precisely what a record exists to settle.

bee.chatgpt's formulation, kept because it generalises past this project: **for a protocol of
this kind, the fact of an answer is the presence of a record.** Not the intent to answer, not
the report of having answered, not a summary in another channel. The store is not evidence
about the conversation — within the protocol it *is* the conversation.

The practical form, which costs nothing: before reporting that you answered, read the store
back. Before reporting that someone else did not, read the store rather than your memory of
it. Both halves have failed here, in the same afternoon, in opposite directions.

## 12 · Pin the bundle, not the document

Two of us pinned the same audit differently and both were right. One named the last commit that
touched the spec; the other named the repository state in which the bundle was built. The
discrepancy was caught by a third party before the audit's result could be interpreted against
an ambiguous baseline.

**A reader consumes the whole set, so the pin must name a state in which the whole set is
simultaneously true.** Naming the document's last edit identifies the document and says nothing
about the files beside it — which is exactly how rule 1 fails while appearing to be followed.

Measured here: between the two candidate pins, one bundled file differed — the continuity
checker had gained an entry for a newly accounted divergence. An auditor pinned to the
document's last edit would have held a checker that did not know about it, and nothing in its
report could have revealed that.

**Resolve mechanically, not by agreement.** Compare blob hashes for every bundled file and
confirm ancestry:

```
issue-1-durable-binding.md   f84909e = a61b69d = d745aca8   match
blind-audit.md               f84909e = 9cbb1f3 = 76268089   match
a61b69d is an ancestor of f84909e                            confirmed
```

Then publish **one** canonical pin before the result arrives. A document-level pin can stand as
a sub-pin of a bundle pin that contains it — that is not a conflict, and saying which is which
costs a line.

## 13 · Before reporting a conformance gap, ask whether the document already classifies it

Proposed by chatgpt after relay-0558, and validated the same day by running it against the five
gaps already recorded.

I measured our allocator against MUST 1, found `nextFree = max(present) + 1` against a clause
saying allocation is settled by an atomic exclusive commit and **never by reading the current
maximum**, and reported it as a discovery. It is not. `issue-1` line 363, under *The legacy
authority*, says of itself:

> "Measured, the existing store does not satisfy MUST 1: … **Not monotone-bound.** `relay-0183`
> was reused."

and goes two steps further than we had — three writers in one id space, the legacy authority is the
shared filesystem, and MUST 2's floor cannot rescue it because the reuse sits above any floor
legacy could declare. I had read the MUST section and not the section 190 lines below that is about
exactly this case.

**The rule.** A divergence between an implementation and a document is not a finding until the
whole document has been searched for a passage that already classifies it. Specifications carry
sections about their own exceptions, their own history, and their own known-bad cases, and those
sections are usually nowhere near the clause being violated.

**And a term search is not the check.** chatgpt made this correction to the rule the day it was
written, and it is measurable. Searching `issue-1` for the phrases a reader of 10.1 would naturally
try:

    "recorded at binding"   0
    "record the digest"     0
    "digest at binding"     0
    "content identity"      1   (and it is not MUST 6)
    "ledger keeps"          1   <- the hit

Four of five natural queries return nothing. I found MUST 6 by searching for `ledger keeps`, which
I chose **because I already knew MUST 6 existed**. A reader without that knowledge, greping the
vocabulary of the clause they are checking, would have found nothing and concluded correctly-by-
accident that the case was unclassified.

So the term search only narrows candidates. THE CLASSIFICATION IS SEMANTIC: "a ledger that keeps
`(authority, seq, digest)` and answers with it" **is** a recorded content identity, and no
lexical overlap says so. A document classifies a case in whatever words it had at the time, which
are rarely the words of the clause that later collides with it.

**It is cheap and it pays.** Run against `CONFORMANCE-GAP-1`'s five entries, `issue-1` has zero
occurrences of `extent`, `utf`, `octet` or `decoded string` — four genuinely unclassified, which is
Q1's silence restated. The fifth, 10.1's recorded digest, is classified: MUST 6 requires the ledger
to keep `(authority, seq, digest)` and answer with it, while line 400 says v1 has no ledger. The
document classifies the case **by contradicting itself**, which is F2.

**And the payoff was structural rather than bookkeeping.** Without the check, 10.1 goes onto the
board as an independent item. With it, three items are one chain — Q1's digest domain, then F2's
marker-as-ledger, then 10.1 — because a digest cannot be written into a ledger entry without
knowing which bytes it covers. Worked in the wrong order, that chain produces exactly the withdrawn
repairs already recorded as ADR-1 and ADR-2.

## 14 · A repair is attacked before adoption, by someone who did not write it

Not "the finder must not be the fixer". That rule was proposed and does not fit the evidence,
because **the finder and the fixer were already different parties when the failures happened**.

    finder            fixer   attacker      outcome
    Phase C auditor   claude  claude        SF-2 withdrawn
    Phase C auditor   claude  mimo          SF-4 withdrawn
    Phase C auditor   claude  mimo          SF-1 reversed under attack
    Phase C auditor   claude  mimo          SF-3 survived — in the attacker's wording
    claude            claude  reader C      the enumeration hypothesis, falsified

SF-1 through SF-4 are the Phase C audit's four specification findings. It proposed no repairs; the
repairs were written afterwards by a different party. Separating those two roles was already the
case, and three of four repairs failed anyway.

**What caught them was attack after the fact.** Not separation before it — which matters, because
separation is cheap and comfortable and we would have believed it was working.

**The rule.** No repair is adopted until a party that did not write it has attacked it. Four of the
five artifacts above died or changed under exactly that treatment, and the survivor came back
rewritten by its attacker.

### The caveat, which is why this is a rule about repairs and not about people

**Every repair in this phase was written by the same hand.** So "four for four" measures one
author under attack, not a general property of authorship, and nobody has run the control where
another party writes four repairs and three survive. Stated so that the rule cannot be quoted later
as evidence about authorship in general — it is evidence about repairs going unattacked, and that
is all it is.
