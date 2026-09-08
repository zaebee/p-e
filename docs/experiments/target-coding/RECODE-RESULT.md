# Result — the six recoded under sheet v2

The sheet's first use, as the sheet itself specified: not a fresh pass, but the subset `relay-0916`
flagged as owed. Applied by a reader who **sealed its own predictions first** — commit `ef839ef`,
77 lines, written after reading only the six records' headers and committed before any prose. The
sheet requires that because I am contaminated on this subset, and this is the first run in this
line where it happened rather than being promised.

## The result: v2 declines to code them

| step A | count |
|---|---|
| `SELF` | 4 |
| `NONE-CORRECTED` | 2 |

Step B over the four `SELF` rows: **`UNCLEAR` 4.** **Not one of the six reaches a target.** Under
counting rule 2 every row is excluded from any rate, so **the denominator for this subset is
zero.**

**And not one carries a digest.** Verified mechanically: no 64-hex string appears in any of the six
bodies besides the `parent-sha256` header, and all six of those verify against their parent. **A
pin was available in every row, and v1 took it — against the parent, which v2 says is not the
target.**

## The structural finding, against this sheet

Step A added `SELF` as an answer and **step B kept rules written for the other direction.** Rule 1
needs the body to name an id; rule 2 reaches only the addressee or the parent. **There is no rule
under which a `SELF` answer can find its target unless the body volunteers a locator** — and this
genre systematically does not, because the parent has already quoted the offending sentence and
the addressee knows which record is meant.

So on this subset the entire effect of the fix is that a confident wrong answer becomes no answer.

### The mechanism, verified

In three of the four `SELF` rows the target is the **parent's** parent, and the parent opens by
quoting it:

| record | parent | parent opens | true target |
|---|---|---|---|
| `relay-0522` | `relay-0520` | *"YOU WROTE:"* | `relay-0519` |
| `relay-0532` | `relay-0531` | *"0530 CLOSES:"* | `relay-0530` |
| `relay-0587` | `relay-0586` | *"You wrote:"* | `relay-0585` |

The digest of the true target is sitting in the parent's own `parent-sha256`.

**The reader refused to make that a rule, and was right to.** It fails on `relay-0489`: parent
`relay-0488`, grandparent `relay-0485`, while the corrected claim lives in `relay-0482` — the
phrase *"off by two"* appears in exactly those two records and nowhere else. **Three of four is a
pattern in the reply-quote genre, not a rule.**

## What this does to `relay-0916`

Its comfortable cell said the target is pinned **20 of 20** in population A and **30 of 30** in B,
all by `parent-sha256`. Three of these six are `kind: erratum` and three `kind: correction`, so on
v1's own classification A loses three of its twenty and B loses six of its thirty — **not to a
lower rate but to exclusion**, because v2 cannot name what they correct.

**The primary rate of 0 of 27 is untouched.** These rows never entered it.

## The reader's own scoring

Five of six predictions missed, scored against its own stated falsifiers. `P2` predicted one row
with `parent == target`, reasoning that a record correcting something other than its parent must
name it; the answer is zero and **the inference ran backwards**. `P4` predicted rule 1 would
dominate; every row reaching step B came back `UNCLEAR`.

## Two ambiguities in v2 its author did not see

- **Rule 1 says bare four-digit numbers count; rule 3 says exactly one distinct `relay-NNNN`.**
  `relay-0489` carries two bare numbers and no prefixed form, so the two rules disagree about
  whether it has zero candidates or two. Both give `UNCLEAR` here, so this row does not force the
  choice — a record with exactly one bare number would.
- **Rule 1 never restates that the named record must carry the step-A claim.** `relay-0532` says
  *"claude deposited the false claim about the file (relay-0526)"*, which reads as rule 1's own
  template and would yield a target by the **other** party — v1's directional error re-entering
  through rule 1. Step A blocks it only if the reader carries step A's answer forward, **which the
  sheet assumes and does not say.**

Finding: `relay-0923`.
