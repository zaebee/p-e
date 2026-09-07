# Sealed predicates — the reverse pass

**Sealed before any row was read.** At sealing time I knew only the population's *size and
word counts*, never its content. v0.12 pinned in `PIN.txt`; thread pinned at
`d8cf3fdf08a90b9bf48dfc0eb4a34f5847bc9cabe9cb8a63a525dfbe7b62b00f`.

## The question

`relay-0903` claimed "the drafting invented no obligations; losses run one direction only".
`relay-0905` withdrew it: the `[MUST]` census ran **thread → draft** and can only find what
*left*. **This pass runs draft → thread and asks what arrived.**

## Population, extracted before judgement

`grep -nE` over v0.12 for a fixed word list — `MUST SHOULD MAY must never cannot normative
invariant required obliged guarantee guarantees rejects refuses "is not" "are not"` — giving
**28 lines** (`ITEMS.txt`). Plus, as a structural sub-population, **§1's four numbered
invariants**, which are labelled invariants and carry no brackets.

## The counting rule, sealed this time

The `[MUST]` census failed to score `P1` because the subject filter was sealed and the counting
rule was not. Fixing that here:

1. **Unit = one obligation, keyed by the draft line of its *first* statement.** A later line
   saying the same thing is `RESTATEMENT` and is not a second unit.
2. **A line matching several words is one line.**
3. **The twelve bracketed clauses are excluded from the subject.** `P3` already mapped all
   twelve to thread rounds. They are marked `BRACKETED-KNOWN` and not reclassified.
4. Every row cites a draft line and either a thread line or the word `nothing`.

## Classification

| state | meaning |
|---|---|
| `AGREED` | a thread line states the same obligation |
| `NO-ORIGIN` | no thread line states it — **it entered at drafting** |
| `EXTERNAL` | imported from a named external work (RFC 8785, RFC 7493) |
| `DESCRIPTIVE` | not an obligation; the word matched a non-normative sentence |

## Predictions

| # | prediction | scored by |
|---|---|---|
| **C1** | *Control.* Line 258, *"The ordering is normative"*, comes back `AGREED` — the forward pass found it at thread 1445/1475. `NO-ORIGIN` here means the method is broken. | identity |
| **C2** | *Control.* Line 23, invariant 4, comes back `AGREED` at thread 1449. | identity |
| **P1** | `NO-ORIGIN` count is between **1 and 5**. | count |
| **P2** | At least one of §1's four invariants comes back `NO-ORIGIN`. | count |
| **P3** | `NO-ORIGIN` rows concentrate in **§1 and §7**, not in §2-§4. | ordering |
| **P4** | `DESCRIPTIVE` is the **largest** class in the 28-line population. | ordering |

## What this pass cannot reach, stated before it runs

v0.12 states requirements in the declarative present — *"Producers mint canonical wire
bytes"*, *"a consumer needing a flat presentation deduplicates first"*. **An obligation phrased
with none of the sixteen words is invisible to this extraction.** That residual is named here
and is not claimed to be covered; the pass reports on the population it can see, and the
population rule is mechanical rather than complete.
