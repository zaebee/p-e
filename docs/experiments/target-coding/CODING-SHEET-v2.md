# Coding sheet v2 — successor to the sheet sealed at `5a4a0d6`

**This sheet was written after v1's result existed, and that is a hazard it cannot design away.**
Every fix below answers a defect the run exposed, which means every fix could have been chosen
to move the number. Three things bound that, and they are part of the sheet:

1. **v2 does not get a fresh headline.** Re-running it over the whole corpus and reporting a new
   rate would present a tuned instrument's output as a better measurement. Its output is a
   **re-reading**, and its value is the *pattern of disagreement* with v1.
2. **Its first use is a subset v1 itself named as owed** — the six acknowledgement-genre records
   whose recoding `relay-0916` flagged and `relay-0917` left undone. Not a new pass.
3. **Whoever runs it seals their own predictions.** Not me: I have read `relay-0916`'s account of
   what those six actually correct, so I am contaminated on exactly the subset this sheet is for.

## What v1 got wrong, and what changes

`relay-0916` §7-8, plus two review findings on #127.

### Defect 1 — rule 4 was directionally blind

v1 assigned the target to the parent whenever the body engaged the parent's content, **without
asking which way the correction runs.** This store has a standing genre: X corrects Y, then Y
deposits an acknowledgement whose `parent` is X and whose real subject is Y's *own* earlier
record. Six records fell that way and were counted `parent == target`, hence pinned.

**The fix is structural, not another rule.** v1 conflated two questions into one ordered list.
v2 separates them:

> **Step A — whose claim is corrected?** Answer before searching for any locator.
> **Step B — which record carries that claim?**

Direction is now an explicit judgement, recorded per row, rather than a side effect of which
locator happened to be findable.

### Defect 2 — rule 3's parent-exclusion misfired

v1 excluded the parent from rule 3's candidate set to stop it trivially returning the parent.
That blanked out the case where the parent **is** the subject and the body never used rule 1's
phrasing: `relay-0084` — **bee.claude's** admission, addressed to bee.chatgpt, of destroying
`relay-0083` — coded to `relay-0073` on a passing mention. (An earlier version of this file said
*bee.zae's*, carried from the v1 reader's report without opening the record; corrected per
`relay-0920`.)

**The exclusion is gone.** Step A already prevents the trivial case: a record whose corrected
claim is the parent's *should* code to the parent.

### Defect 3 — no rule covered a target that is a class

`relay-0359` corrects 56 records identified by a property — `from: bee.claude`, deposited-by
`claude` — and not by id. v1 had no rule and it fell to `UNCLEAR`, which reads as a gap in the
sheet rather than a fact about the record. **`CLASS` is now an answer to step A.**

### Defect 4 — the pin test was not injective

v1 called it *"mechanical and not a judgement call"*. Three digest collisions exist in the store —
`relay-0497` equals `relay-0521`, `relay-0537` equals `relay-0539`, `relay-0738` equals
`relay-0739` equals `relay-0740` — so one 64-hex string can pin two or three records. It never bit
in v1 because none of the seven was ever a target. **The test now names the case and refuses it**
rather than quietly resolving it.

### Two review findings on #127

`gemini-code-assist`: *"exactly one `relay-NNNN`"* is ambiguous when the same id appears several
times — **now "exactly one distinct"**; and a 64-hex string equals the **output** of
`bun run relay-digest <T>`, not the command — **now stated that way**. Neither could be applied to
v1, which was sealed and had already been run.

### Four ambiguities the reader hit in practice

- **Does rule 1 need a locator, or does *"YOU wrote X and that is wrong"* count?** (`relay-0157`,
  `relay-0558`, `relay-0596`.) **Sealed as addressee-inclusive**: step A asks whose claim, and a
  record addressing its parent's claim has answered it without naming an id.
- **A record correcting both a record and a document** (`relay-0543`, `relay-0064`). **Sealed as
  `MULTI` with a mixed list**, rather than resolved by rule order.
- **Rule 2 before rule 3** (`relay-0885`, whose referent is a withheld control document with one
  non-parent locator present). **Step A settles it** — the referent decides, not the search order.
- **What bar makes a record "named this way" for `MULTI`** (`relay-0431`, `relay-0872`,
  `relay-0888`). **Sealed below.**

## The sheet

### Step A — whose claim is corrected?

Answer from the body, before searching for locators. Exactly one:

| code | meaning |
|---|---|
| `SELF` | a claim this record's own author made in an earlier record |
| `OTHER` | a claim another party made in a record |
| `ARTIFACT` | a document, file, commit, spec section, plan — anything not a relay record |
| `CLASS` | a set of records identified by a property rather than by id |
| `MIXED` | more than one of the above |
| `NONE-CORRECTED` | the record corrects nothing — an acknowledgement, a scope note, a report |

`ARTIFACT`, `CLASS`, `NONE-CORRECTED` end the coding for that row. `MIXED` goes to step B for each
component and is coded `MULTI`.

### Step B — which record carries that claim?

For `SELF` and `OTHER`, in order, first match wins:

1. **Explicit.** The body names the record whose claim it corrects — *"corrects relay-NNNN"*,
   *"relay-NNNN said X and that is wrong"*, *"withdraws the claim in"*. Bare four-digit numbers
   count. If several are named this way, `MULTI`.
2. **Addressed.** The body corrects a claim it attributes to its addressee or its parent without
   naming an id — *"YOUR (2) is right about the reading and wrong about what follows"*. T is the
   record carrying that claim, which is normally the `parent`.
3. **Sole distinct locator.** Exactly one **distinct** `relay-NNNN` other than the record's own id
   appears below the header block. The parent is **not** excluded.
4. Otherwise `UNCLEAR`.

### The `MULTI` bar, sealed

A record is named *this way* when the body says of it that it **is wrong, withdrawn, overstated,
or superseded** — not merely that it contained an error someone else fixed, and not merely that it
is mentioned in a census or a list. `relay-0872` — *"relay-0869 OVERSTATED AND IS CORRECTED
HERE"* alongside a demolition of `relay-0865` — is `MULTI` under this bar. `relay-0431`, a census
table of five records with bad digests, is not.

### Is T pinned?

> T is **pinned** if any 64-hex string anywhere in the record's body equals **the output of**
> `bun run relay-digest <T>`.

**And if that digest is also the digest of another record in the store, the row is
`PIN-AMBIGUOUS`** — reported separately, never counted as pinned and never as unpinned. The
string does not name one record and the sheet does not pretend otherwise.

`parent-sha256` counts only when `parent == T`.

### Counting

1. One record is one unit, keyed to the first line of its statement.
2. `MULTI`, `UNCLEAR`, `ARTIFACT`, `CLASS`, `NONE-CORRECTED` and `PIN-AMBIGUOUS` are each excluded
   from any primary rate and reported as their own counts.
3. Every rate states its denominator.

## What v2 still cannot do

It does not make direction observable — step A is a judgement, now an explicit and recorded one
rather than an implicit one. Two readers may disagree, and the sheet's answer to that is that they
should both be asked, not that the rule will settle it.
