# v0.13 — the decisions that have to be made first

Companion to [`relay-lite-deletion-log.md`](relay-lite-deletion-log.md). The log records **what
left**. This records **what has to be decided before v0.13 can be written**, and takes no position
on any of it.

`#53` is explicit about why:

> **Deciding open questions by writing them down.** … A candidate resolution adopted because the
> editor found it persuasive is still a decision that needs the scrutiny above. Being the editor
> makes it *possible* to close them; it does not make them closed.

`#114` is why they are urgent rather than academic: this corpus cannot cut over to a draft that
cannot express a correction, and several of these are exactly that.

## What this document is not

**The option sets below are mine, and that is not nothing.** Enumerating three closures for a
question frames it as a three-way choice; a fourth may exist that nobody has named. Each list ends
where my imagination did, not where the possibilities do.

No option is marked preferred, and none is ordered by preference — they are ordered by how much
they change.

---

## 1 · `signature?: string` — `#51`

**v0.1** (thread line 78) carried, in the envelope's verification block:

```typescript
signature?: string;      // Подпись автора (при наличии слоя аутентификации)
```

**v0.12** contains the string `signature` zero times. No round records the removal.

**What the corpus adds.** `relay-0863` and `relay-0873`: this project cannot establish `authored`
over any transport it has, `deposited-by` is a fact about a channel, and the two-class split
offered as a way through **did not survive attack**. An identity layer has no anchor here.

**And v0.12 already forbids one form of it.** Line 264: `[MUST NOT]` *"A verifier parses,
normalizes, or re-serializes bytes when computing a digest"* — an inline signature in the hashed
body requires exactly that normalization. `#53` records this: the field was incoherent against a
rule the document already carries.

**Closures I can name:**
- Leave it out, and record in the deletion log's reason column that it was incoherent with line 264 rather than merely absent.
- Restore it **detached** — a sibling artifact, not a field in the hashed body — which is what `#53`'s §3.4 checklist item proposes.
- Restore it as a field and change line 264 so the two are consistent.

---

## 2 · The `UNCHECKABLE` prohibition — `#63`

**Agreed** (thread line 1461): `[MUST NOT]` *"Verifiers MUST NOT reject or discard a well-formed
act solely because its causal link evaluates to `UNCHECKABLE`."*

**v0.12** carries the consequence and not the rule. Line 294: *"a verifier that rejects on an
unheld parent rejects correct acts routinely."* Every occurrence of "reject" in the draft is at
lines 43, 268, 294 and 321, and none prohibits it.

**Independently confirmed three times**: the blind reader in `docs/experiments/lineage-blind/`
classified that passage *"Rationale — Non-normative"* with no thread and no repository; and both
readers in `docs/experiments/rounds-read/` reached it unaided.

**Why it is load-bearing.** §7.2's own text says single-leg delivery means a node holding a child
*cannot* hold the parent. `UNCHECKABLE` is the **normal** state, not an edge case, and a verifier
may reject on it and violate nothing.

**Closures I can name:**
- Restore the `[MUST NOT]` as agreed.
- Restore it with a narrower scope — for instance permitting rejection at ingest but not at classification, which is where §7.1 already splits stages.
- Leave the prose and record that the obligation was deliberately not restored.

---

## 3 · The deletion ban, `history/`, and the erratum — `#67`

**One decision, not three.** `#67` supersedes `#60` and `#61` and says why: the prohibition cannot
be restored without deciding where `history/` is, and the erratum's home cannot be settled without
the prohibition that makes that directory append-only.

**Agreed in one round, three cleanups, one landed:**

The numbers are the round's own, and the rows are ordered by **outcome** rather than by number —
the one that landed first, then the two that did not. That is `#67`'s ordering and the shape of
its finding; sorting them 1, 2, 3 would file the answer under the question's numbering and lose it.

| | promised | in v0.12 |
|---|---|---|
| 2 | `MUST`: filename `id` equals envelope `id` | **landed**, line 46 |
| 1 | eliminate `errata/`; erratum is a record in `history/` | `errata/` survived; `history/` occurs **zero** times |
| 3 | `history/` append-only, absolute ban on `unlink`/`overwrite` | **absent entirely** |

**Note the direction.** v0.1's §6 was *weaker* — it banned overwriting, in `history/` only. The
review **strengthened** it. The result in v0.12 is no prohibition at all.

**Closures I can name:**
- Adopt the round's own conclusion: `history/` append-only with an absolute ban, `errata/` eliminated, erratum an ordinary record.
- Keep `errata/` with its v0.12 meaning (expired records) and give errata a different home.
- Restore v0.1's weaker form — ban overwriting in one directory — and record that the strengthening was not adopted.

---

## 4 · §6 and the erratum model — `#81`

**v0.1 §6** (thread line 123) held the delete/in-place-update prohibition **and** the erratum
record: `target_id`, `target_digest`, `reason`, `superseded_by`, plus the client obligation to
build materialized state along the errata chain.

**v0.12** has no §6 — its sections run 1, 2, 3, 4, 5, 7 — and `erratum` survives as one of five
`type` members with **no payload shape, no chain rule, and no obligation on readers**. The word
occurs once in the whole draft: in the enum.

**§1's first invariant still reads** *"Corrections are new records, never edits."* Nothing says how
a correction names what it corrects.

**This is the one that blocks the cutover most directly.** This session deposited roughly eighteen
errata. Under v0.12 none of them could say what it corrected.

**Closures I can name:**
- Restore §6's mechanism, renumbering or leaving the gap.
- Give `erratum` a payload shape in §3 without a section of its own.
- Drop `erratum` from the `type` enum and record that corrections are out of scope for relay-lite.

---

## 5 · Atomic publication — `#103`

**v0.1** (thread line 145): `[MUST] Запись сообщений обязана быть атомарной (через tmp/ + rename).`
— *"Writing messages MUST be atomic (via `tmp/` + `rename`)."*

**The mechanism was improved with a full record** — `rename` rejected for `link` because *"they
are opposite guarantees"* — and v0.12 carries the better mechanism at lines 224-232 with its
reasoning: `link` not `rename`, a randomized temp name, a directory `fsync`.

**None of v0.12's nine `[MUST]` clauses requires atomic publication.** A conforming implementation
may write directly into `.relay/in/` and violate no marked clause.

**Closures I can name:**
- Mark the existing mechanism `[MUST]`.
- Mark the *property* rather than the mechanism — publication is atomic and create-or-fail — leaving `link` as one way to achieve it.
- Leave it unmarked and record that conformance does not require atomicity.

---

## 6 · Filename conformance — `#104`

**v0.1** (thread line 144): `[MUST]` every incoming filename conforms to §2's scheme.

**v0.12** §2.1 shows the grammar and carries two `[MUST]`s about fields *inside* a name already
assumed to parse — `CNS.to ∈ act.to[]` at line 42, `CNS.id == act.id` at line 46. **Nothing
requires the name to parse at all.**

`src/relay-lite/names.ts` and `cns.ts` met this gap from the other side and read it as
never-specified: *"§2.1 gives the name a grammar … and never an alphabet, which leaves the two
things that string has to be unguarded."* The addendum merged in **`#65`**, answering issue
**`#35`** — *"CNS names are interpolated unescaped"* — settled the **alphabet**. It did not
restore an obligation to conform.

**Closures I can name:**
- Restore a `[MUST]` that a delivery name conforms to §2.1's grammar and the addendum's alphabet.
- Fold it into §7.1's Stage 2, which already rejects structurally malformed input.
- Leave the grammar descriptive and record that a non-conforming name is undefined rather than forbidden.

---

## 7 · Invariant 3 — the four epistemic acts — `#106`

**v0.1 §1** (thread line 15): *"Separation of the 4 epistemic acts: Witnessing, Examination,
Criterion and Verdict are separated and do not collapse into a single step."*

**All four terms occur zero times in v0.12.** In the 2262-line thread the phrase occurs **once**,
at its own statement. Not one of sixteen rounds argues it, keeps it, drops it, or notices it.

**This project practises it daily and rediscovered it by failing without it** — `relay-0799`,
`defect1-criteria.md`, and five errata in this session about an author examining their own work.

**But it is a methodology invariant, not a transport one.** Whether a *message transport*
specification is the place for it is a real question and not a rhetorical one.

**Closures I can name:**
- Restore it as an invariant of relay-lite.
- Record it in this project's own methodology, where it is already practised, and leave the transport spec silent.
- Restore a narrower form — that a record and its review are distinct acts — without the four-way separation.

---

## 8 · §5's adjudication protocol — `#107`

**v0.1 §5** (thread line 105) was `CLAIM → CHALLENGE → CRITERION-CHECK → RULING`, with three
payload shapes, the vocabulary `PASS` / `VIOLATES` / `UNDECIDABLE`, a criterion gate on rulings,
and an obligation that *"an independent agent — a different epistemic path — is obliged to supply
a counter-example."*

**One clause was objected to, correctly** (thread line 180): the criterion gate *"derives a norm
from a measurement, which the README forbids."*

**Everything else left with it.** In v0.12: `PASS` 0, `VIOLATES` 0, `UNDECIDABLE` 0,
`counter_evidence` 0, `target_digest` 0, `proposal` 0, `criterion` 0, `consensus-v1` 0. §5 is four
sentences on what `ruled_by` records.

**Consequence:** `claim`, `challenge`, `ruling` and `erratum` are all `type` members with no
semantics. Only `message` is defined.

**Closures I can name:**
- Restore the protocol without the criterion gate.
- Give the four undefined `type` members payload shapes without a protocol.
- Reduce `type` to what the draft defines, and record that the other four left.

---

## What is not here

**`#100`** — `check-continuity`'s attribution table — is about *this repository's* gate, not about
relay-lite. It is in `#114`'s list because it is open, not because v0.13 answers it.

**Seven rows of the deletion log have no issue** — `out/`, `active/`, the Claim-or-Fail and Settle
stages, the dedup `MUST`, the tie-break convention `MUST`, and the arrival-order half of
dual-order. They are losses with evidence and no argument yet, and filing issues to make this
document symmetrical would be manufacturing the argument.
