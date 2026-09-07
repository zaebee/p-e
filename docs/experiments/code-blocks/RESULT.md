# Result — the code blocks

Predicates and `extract.py` sealed at `e270fca` before any unit was read, and applied by a reader
who had not seen this session. Both pins re-verified by that reader, and `ITEMS.txt` regenerated
byte-identical from the committed script.

## The finding

**One unit in 120 has no review-round origin: line 30, `.relay/errata/  expired records`.**

Its only supporting thread line is **101** — *inside the v0.1 specification the rounds were
convened to review*, not inside any round:

> Демон очистки сканирует `.relay/in/`. Если `created_time(uuidv7) + ttl < now()`, файл
> перемещается в `.relay/errata/` с пометкой `EXPIRED`.

And round 1 struck it, at thread **250**:

> **Unify Errata into History:** **Eliminate the separate `.relay/errata/` directory.** An
> `erratum` is an ordinary, first-class immutable record deposited into `.relay/history/`.

Endorsed at thread 305. After 305 the directory never appears again in 1,957 remaining lines.

**And the draft drops the other half.** `history/` occurs **zero** times in v0.12. Both halves of
round 1's resolution are inverted: the directory that was to go is back, carrying a **new**
meaning, and the directory errata were to move *into* is gone.

This is `#67` stated harder than the deletion log states it. Row 6 records `errata/` as
`REDEFINED`; row 5 records `history/` as `ABSENT`. **Neither says the pair inverts an agreed
resolution, and neither says the reinstatement has no round behind it.**

### The reader disagreed with the sheet, and said so

The sheet's predicate is *"a constraint with a thread line stating it"*, and 101 is a thread line,
so it coded `AGREED` — and reported that it believes `NO-ORIGIN` correct. The sheet's own gloss
for `NO-ORIGIN` is *"it entered at drafting"* and the other class is called *agreed*, while 101 is
text the review struck. **The sheet has no predicate for *stated, then withdrawn*,** and this
population contains exactly one instance of it.

## Counts

| class | sheet-literal | rounds-only |
|---|---|---|
| `AGREED` | 70 | 69 |
| `NO-ORIGIN` | **0** | **1** |
| `NOT-AN-OBLIGATION` | 10 | 10 |
| `MULTI` | 2 | 2 |
| `CONTINUATION` | 38 | 38 |

72 lines carrying 74 constraints. The single row that moves between the two readings is line 30.

**100 of the 120 units are verbatim thread lines.** Of the 19 without an exact match: ten are the
HLC and comparator formulas rendered from LaTeX, three are `node:`-prefixed imports, three are
reflows, three are the §2 directory listing.

## All four predictions failed

| # | predicted | result |
|---|---|---|
| **C1** | line 65, the `type` union, is a constraint and codes `AGREED` | ✅ verbatim thread 2232, unchanged from thread 61 through sixteen rounds |
| **C2** | line 30 is a constraint | ✅ |
| **P1** | `NO-ORIGIN` between 2 and 10 | ❌ **0**, or 1 under the reading most favourable to it |
| **P2** | a `NO-ORIGIN` in §4.1's publisher | ❌ **the least-changed region in the population** |
| **P3** | 25-60 constraints | ❌ **72 lines carrying 74** |
| **P4** | `NOT-AN-OBLIGATION` largest | ❌ `AGREED` is, 70 to 10 — under all three codings the reader ran |

**`P1` is the third consecutive zero.** The seal said a third zero would be a finding about this
corpus rather than about my expectations, and it is: the fenced part of v0.12 is very nearly cut
and paste.

**`P2` failed instructively.** Lines 144-221 differ from the thread's v0.5 listing by two things,
neither an obligation — a `node:` prefix on three imports, and one braced block collapsed onto a
line. The reviewer had traced that listing path by path (thread 1177). **The place I predicted a
drafter works details out is the place the drafter changed least.**

## Where the sheet blinded its own run

Its comment rule — *"a comment describing a constraint is not a second instance of it"* — hides
the two obligations that code blocks carry **only** in comments:

- line 69, `readonly payload: T;  // I-JSON (RFC 7493) compliant payload` — `T = any` constrains
  nothing, and the I-JSON restriction cost a whole round;
- line 334, `readonly digest: string;  // INVARIANT: digest === SHA-256(octets)` — §7.3's whole
  point.

**A run that exists to find obligations carried only inside code blocks is blind to the two that
code blocks carry only in comments.** Both survive in prose, so the two populations together still
cover them: the partition holds and the gap is inside one half of it.

## An operational fault, and it was mine

The reader reports the working tree was switched under it twice mid-run. **That was me**, doing
other work on other branches while it read. It recovered by working from the sealed commit through
`git show` and re-verifying both hashes, and says it cannot vouch for the tree's state at any
other moment.

**A shared working tree is not a safe place to run a cold reader**, and I did not think of it when
I promised not to touch its files.

Finding: `relay-0921`.
