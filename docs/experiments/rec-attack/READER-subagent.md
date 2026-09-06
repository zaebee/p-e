<!--
Verbatim output of one reader, preserved as evidence. Not edited.

Renamed on copy: the reader was told to write `answer-*.md` in its own working
directory, so self-references and absolute paths inside are the reader's own and
are correct in its frame. Rewriting them — to a placeholder, a relative path, or
this file's name — would change the record of what a reader said in order to tidy
a repository it never saw.

The stand it ran in was ~/projects/rec-attack, sealed at 11:43:34 UTC with input
pin a998df279c10ac82dac8dc2bbc6867d4ba310a718b6528e140edda7bc36b2d1a. The pin is
what makes the run reproducible; the path is not.
-->

# Attack on `input/RECOMMENDATIONS.md`

**Pin.** `cd /home/zaebee/projects/rec-attack && find input -type f | sort | xargs sha256sum | sha256sum`
returns `a998df279c10ac82dac8dc2bbc6867d4ba310a718b6528e140edda7bc36b2d1a`, which is the value in
`PIN.txt` line 2. **Matched.**

**Recognition, declared and set aside (§1).** The corpus names a repository (`zaebee/p-e`), issue
numbers, and source paths (`src/relay-lite/cns.ts`, `src/relay/continuity.ts`). I have some prior
exposure to a project of that name. I read nothing outside `input/`, fetched nothing, and every
claim below is anchored to a supplied file and line. Where a claim of the note points outside
`input/`, I say that it cannot be checked rather than checking it.

**Line references.** `R` = `RECOMMENDATIONS.md`, `D` = `relay-lite-v0.12-draft.md`,
`Dec` = `relay-lite-v0.13-decisions.md`, `Del` = `relay-lite-deletion-log.md`,
`Aid` = `addendum-identifiers`, `Att` = `addendum-ttl`, `Acl` = `addendum-clock`.

---

## Summary

| # | question | verdict | mode |
|---|---|---|---|
| 1 | `#81`+`#67` — `history/`, `expired/`, deletion ban | **FAILS** | 3, with 1 |
| 2 | `#81` form — `target_id`/`target_digest`, refusing `superseded_by` | **FAILS** | 2, with 4 |
| 3 | `#103` — normalize the property, not the mechanism | **FAILS** | 1 and 4 |
| 4 | `#104` — filename conformance in Stage 2 | **FAILS** | 5, with 4 |
| 5 | `#63` — restore the `UNCHECKABLE` `MUST NOT` | **SURVIVES** | — |
| 6 | `#106` — four epistemic acts to methodology | **FAILS** | 2, with 4 |
| 7 | `#107` — shrink `type`, delete §5 | **FAILS** | 2 and 3 |
| 8 | `#51` — no inline `signature` | **FAILS** | 4 |

One survives. Nothing is `UNDECIDABLE`: every verdict rests on text in `input/`.

---

## 1 · `#81` + `#67` — **FAILS (mode 3, with mode 1)**

**Quoted** (`R:13`): *"Вернуть append-only `history/`; устранить двусмысленность `errata/`: для
истёкших доставок использовать `expired/`, а `erratum` сделать обычной записью истории. Запретить
`unlink` и overwrite опубликованных исторических записей."* With `R:30-31`: *"`history/`
становится единственным домом опубликованных записей, включая errata."*

### Mode 3 — it decides the Settle stage without admitting to it

`history/` does not exist in v0.12. Confirmed by grep: the only occurrence of the string in the
draft is `D:126`, *"the causal history"*, unrelated; `Dec:92` states it independently —
*"`history/` occurs **zero** times"*.

Under v0.1, `history/` was reached by a lifecycle stage. `Del:65` (row 18):

> `| 18 | the Settle stage — move to `history/YYYY-MM/` | line 96 | nothing | ABSENT | |`

The reason cell is **blank**, and `Dec:219-221` puts that row expressly out of scope:

> *"**Seven rows of the deletion log have no issue** — `out/`, `active/`, the Claim-or-Fail and
> Settle stages, the dedup `MUST`, the tie-break convention `MUST`, and the arrival-order half of
> dual-order. They are losses with evidence and no argument yet, and filing issues to make this
> document symmetrical would be manufacturing the argument."*

The recommendation makes `history/` *"единственным домом опубликованных записей"*. Published
records enter the store at `.relay/in/` (`D:29`, *"published delivery files"*). For `history/` to
be their single home, something must move them there — which is exactly the Settle stage, a
blank-reason row the decisions document declines to open. The note names no such mechanism and
does not say it is deciding one. That is §3's third mode: *"It decides something it does not admit
to deciding."*

The same paragraph silently decides a second thing: `Del:52` (row 5) records the lost archive as
`.relay/history/YYYY-MM/` — month-partitioned. The recommendation restores `history/` unpartitioned
and does not say the partitioning is being dropped.

### Mode 1 — the repair it prices is one the corpus forbids

`R:49-54` names the rename's cost and says accepting `expired/` *"требует согласованно поменять эти
ссылки"* — change these references consistently — having just named *"Текущий draft и TTL
addendum"* (`R:50-51`) as two of the places carrying them. Both documents forbid exactly that.
`Att:3-5`:

> *"**Status:** Addendum, not an amendment. `relay-lite-v0.12-draft.md` is committed as a record of
> what was proposed and is not edited — corrections are new documents, never edits, the same rule
> this store applies to its own records. Nothing here changes that file."*

`Aid:3-5` and `Acl:3-5` repeat it verbatim for themselves. Under the corpus's own rule the
references in `D:30`, `D:246`, `Att:23` and `Att:38` cannot be changed; a rename can only be
recorded in a new document, leaving four frozen documents permanently pointing at `errata/`. The
note prices a consistency edit the corpus does not permit and does not price the alternative —
a corpus in which the authoritative spelling and every restoration record disagree.

*(This is the weaker of the two findings: one can read "поменять эти ссылки" as applying only to a
future v0.13 and to code. But the note itself names the draft and the TTL addendum as the carriers,
and those are the two it cannot touch.)*

### An observation, not a mode: the provenance is stated backwards

`R:27-29` reasons *"Нынешний `.relay/errata/` означает истёкшую доставку; давать этому же имени
значение коррекции создаёт две несовместимые семантики"* — treating the expired-delivery meaning as
incumbent and the correction meaning as the intruder. `Del:53` (row 6) records the opposite
direction:

> `| 6 | `.relay/errata/` as recorded errors, disputes and claims | line 29 | line 30, "expired records" | REDEFINED | #81 |`

The correction sense is v0.1's original; the expired sense is v0.12's redefinition. The
recommendation's outcome (abolish the name, split the two senses) is not damaged by this, which is
why I do not call it a failure — but the stated history is inverted, and a reader checking the
argument against `Del` will find the shape of the loss reversed.

### Confidence

High on mode 3: `Dec:219-221` and `Del:65` are explicit and the recommendation's own words
(*"единственным домом"*) require the excluded row. Moderate on mode 1, for the reading above.

### What would still have to be true

That the Settle stage is opened as its own question with its own attacker, before `history/` is
declared the home of anything.

---

## 2 · `#81`, the form — **FAILS (mode 2, with mode 4)**

*One of the two paragraphs written under objection (`R:36-43`), given §4's treatment.*

**Quoted** (`R:14`): *"Явно **не** возвращать `superseded_by`: последующий erratum ссылается назад
на предшественника, и читатель выводит цепочку по этим ссылкам."* With `R:39-42`: *"Цепочка
строится без потери информации в обратном направлении… **Читатель может вывести всех преемников
запросом по этим парным ссылкам**."*

### Mode 2 — the reason is true; the conclusion does not follow

The premise is sound. A forward pointer names a successor that may not exist at issue time
(`R:37-38`), and adding one later would edit a published record, which `D:19` forbids: *"A record,
once published, is immutable. Corrections are new records, never edits."* All true.

The conclusion — that the reader can therefore derive all successors — does not follow, and the
specification says why in its own words. `D:291-294`:

> *"`UNCHECKABLE` is a consequence of this protocol's own transport, not an import: under §2.1's
> single-leg delivery an act addressed to one agent is never written into another's inbox, so a
> node holding a child that cites it **cannot** hold the parent. Partial visibility is the normal
> case…"*

A backward-only chain is derivable **only by a party that holds the citing records**. The
specification establishes that not holding a related record is the *normal* case, not the edge
case. So a reader holding the corrected record and not the erratum learns nothing — and, unlike the
`UNCHECKABLE` case where the gap is visible as a state, there is no state at all: an uncorrected
record and a corrected-but-uncontradicted record are byte-identical and indistinguishable. The
asymmetry the note dismisses as a duplicated relation (`R:41-43`, *"отдельный forward pointer
дублировал бы отношение"*) is not a duplicate: forward and backward pointers are visible to
*different* parties, and under §2.1 those parties routinely do not overlap.

`D:24` (invariant 4) — *"A reader's inability to see a record is not a defect in that record"* —
protects the erratum from being called defective. It does not make the correction observable.

### Mode 4 — the cost is not named as a cost

The note poses the matter as an open question in its attack list (`R:103-105`) but asserts the
opposite in its body: *"без потери информации"* (`R:39`). Naming a question is not naming a cost.
The unnamed cost is precise: under this form, **a holder of a corrected record can never learn that
it was corrected**, and `Dec:118-119` says this is the case the whole exercise exists to serve —
*"This is the one that blocks the cutover most directly. This session deposited roughly eighteen
errata. Under v0.12 none of them could say what it corrected."* The recommendation lets an erratum
say what it corrected. It does not let a corrected record say it was corrected, and does not say so.

### A supporting defect: the field's direction is assumed, not sourced

`R:37`, *"Это forward pointer"*, is stated as fact. No supplied document says which way
`superseded_by` points. `Del:54` (row 7) and `Dec:107-108` list it only as one of four fields
alongside `target_id`, `target_digest`, `reason`. The English name makes the forward reading
natural — **that is my inference, and I mark it as mine (§6)** — but the note's central refusal
rests on a reading of a field neither it nor any supplied document sources.

### Also: the criterion it applies to others it exempts itself from

`R:45-47` rejects the v0.1 client obligation as *"уже политикой интерпретации, а не минимальным
транспортным контрактом"*, then imposes its own reader obligation in the same breath (`R:14`,
*"Читатель обязан уметь показать отношение исправления"*). Both are reader-side policy. The note
does not say why one crosses the transport boundary and the other does not.

### Confidence

High that the "reader can derive all successors" step is unsupported — `D:291-294` is the
specification's own sentence, in the same document. Moderate on how much this matters in practice,
which depends on whether readers are expected to hold whole threads; no supplied document says.

### What would still have to be true

Either that every reader of a corrected record also holds its errata — which `D:291-294` denies —
or that discovery of corrections is explicitly declared out of transport scope, which the note does
not declare.

---

## 3 · `#103` — **FAILS (mode 1 and mode 4)**

**Quoted** (`R:15`): *"Нормировать свойство: публикация **MUST** быть crash-atomic и
create-or-fail. `link`, временный файл и `fsync` оставить описанной POSIX-реализацией, а не
единственным механизмом."* Reason (`R:59-60`): *"Нормировать только `link` сделало бы POSIX-приём
единственным способом соответствия."*

This matches `Dec:142` closure 2 exactly, and the choice of closure is not the problem.

### Mode 1 — the reason contradicts an addendum that already closed that door

`Aid:151-153`:

> *"**relay-lite requires a POSIX filesystem.** §4.1 already mandates `link` with `EEXIST`
> semantics, `O_EXCL` for the temporary file, and a directory `fsync`, and every implementation
> that exists runs on POSIX."*

`Aid:157-159`: *"Declaring POSIX makes the existing assumption explicit and **closes the door on an
unbuilt port** — it does not report that the door was already bricked up."*

The recommendation's entire stated motive is avoiding a POSIX-only conformance path. An addendum in
the same corpus has already decided, deliberately and with its reasoning recorded, that
conformance *is* POSIX-only. The recommendation reverses that without citing it, arguing against
it, or acknowledging that it exists. §3's first mode: *"It contradicts the specification or an
addendum."* It is also mode 3 — reopening a closed platform decision is a decision, and it is not
admitted.

The reversal has a second edge the note does not see. `Aid:151` grounds the POSIX requirement in
§4.1's supposed mandate of the three primitives. If the property is normalized and the mechanism
demoted to *"описанной POSIX-реализацией"*, `Aid:151`'s ground evaporates: the POSIX declaration
would then cite a clause requiring none of `link`, `O_EXCL`, or directory `fsync`.

*(A pre-existing inconsistency in the corpus, which I note under §6 rather than charge to the note:
`Aid:151` says §4.1 "already mandates" those primitives, but §4.1 contains no `[MUST]` at all —
grep gives markers at `D:42,46,75,79,90,93,124,126,264,276,338,341` and none in §4.1 — and
`Dec:138` states it: "None of v0.12's nine `[MUST]` clauses requires atomic publication." `Del:60`
row 13 marks the mechanism `DEMOTED`, "unmarked". Both statements cannot be true. The note relies
on the second and contradicts the first without noticing either.)*

### Mode 4 — the property pair is incomplete, and the omission is load-bearing

`R:58`: *"Для публикации важны два независимых свойства: crash-atomic и create-or-fail."* The
draft's own enumeration names a third. `D:238-240`:

> *"**Digest comparison on `EEXIST`** — `EEXIST` alone does not say *whose* name it is. A publish
> whose `link` succeeded and whose `fsync` then failed is retried and would otherwise be reported
> as another writer's collision."*

That behaviour returns `ALREADY_PUBLISHED` (`D:150`, `D:200-203`), and §3.2 depends on it. `D:93-97`:

> *"**[MUST NOT]** Publishers re-tick the HLC or re-mint timestamps when retrying an existing `id`.
> Retries and fan-out transmit the identical sealed byte buffer. … Without this, a crash-recovery
> retry rebuilds the act with a later HLC, the digest changes, and the publisher's own retry is
> reported as a foreign collision."*

Read literally, **"create-or-fail" forbids `ALREADY_PUBLISHED`**: the second create must fail. The
draft's mechanism is create-or-fail-*unless-byte-identical*. An implementation normalized only
against the note's two properties may return `COLLISION_REFUSED` on a publisher's own byte-identical
retry and conform — breaking the retry model `D:93-97` marks `[MUST NOT]` and defeating the reason
`D:238-240` gives for the digest comparison existing at all. The note names two properties, calls
them the ones that matter, and does not name the third or the cost of dropping it.

The same applies more weakly to the randomized temp name (`D:227-230`: a deterministic name
*"would survive as an uncollectable file that blocks republication of exactly the message that was
interrupted"*), which is a liveness property neither "crash-atomic" nor "create-or-fail" implies.

### Confidence

High on mode 4: the gap between "create-or-fail" and `ALREADY_PUBLISHED` is visible in the draft's
own result type. High on mode 1 as a contradiction with `Aid:151`; moderate on how much weight
`Aid`'s POSIX clause carries, since `Aid:3` calls itself *"Addendum, not an amendment"* and
`Aid:171` says *"It does not amend v0.12"* — but the contract lists addenda as part of the
specification the note must be consistent with, and the note engages neither.

### What would still have to be true

That the property list is completed with idempotent republication of byte-identical content, and
that the platform reversal is taken as its own question against `Aid:§6` rather than as a by-product.

---

## 4 · `#104` — **FAILS (mode 5, with mode 4)**

**Quoted** (`R:16`): *"Включить проверку имени в Stage 2: имя доставки **MUST** соответствовать
грамматике §2.1 и алфавиту addendum."*

The Stage 2 placement is `Dec:163` closure 2 and is well grounded — `D:268-270` already rejects on
`CNS.id != act.id` and `CNS.to ∉ act.to[]`, so the CNS name is already Stage 2 business. That half
is fine. The failure is in the second conjunct.

### Mode 5 — it answers `#35` under `#104`'s citation

`Dec:157-160` separates the two questions explicitly:

> *"The addendum merged in **`#65`**, answering issue **`#35`** — *"CNS names are interpolated
> unescaped"* — settled the **alphabet**. **It did not restore an obligation to conform.**"*

`#104` is the obligation. The alphabet is `#35`/`#65`. And `#35` is expressly *not closed* —
`Aid:171`:

> *"It does not amend v0.12, **it does not close [#35] — that is bee.zae's call** — and it does not
> touch `src/relay-lite/names.ts`, whose `NAMEABLE` currently admits uppercase, admits `.` and
> `..`, and bounds no length. **The gap between this document and that predicate is stated here
> rather than quietly closed, so that the decision and its implementation can be reviewed
> separately.**"*

By binding *"алфавиту addendum"* into a `MUST` under `#104`'s heading, the recommendation closes
`#35` — the one thing the addendum reserved to someone else and asked to be reviewed separately.
That is §3's fifth mode, and the third as well: nowhere does the note say it is closing `#35`.

### Mode 4 — it makes normative a grammar the addendum says is broken

`Aid:88-93`:

> *"**A related bound the grammar still lacks.** §2.1's `<seconds>` is `(0|[1-9][0-9]*)` — unbounded
> digits. A TTL of a hundred digits is grammatically legal today, and it breaks both the length
> budget above and I-JSON's safe-integer range. **Not fixed here:** it belongs with [#50] … and
> **the two should be settled in one edit.**"*

`MUST соответствовать грамматике §2.1` makes a hundred-digit `ttl` *conformant*, in a name the
filesystem then refuses — `Aid:81` reproduces the refusal, `ОТКАЗ ФС: File name too long`. The
addendum asked for one edit settling grammar and units together; this is the other half, taken
alone. Unnamed cost.

### A further defect: §2.1 has no grammar to conform to

Grep of the draft for the nonterminals returns one line — `D:36`, the template itself. §2.1 gives
`<agent>`, `<thread_id>`, `<seconds>` and `<uuidv7>` and defines **none** of them. `Aid:45-46`
supplies productions for the first two only. Nothing in the entire supplied corpus defines
`<uuidv7>`; and `Aid:88`'s `(0|[1-9][0-9]*)` is attributed to *"§2.1's `<seconds>`"*, a production
§2.1 does not contain. So *"грамматике §2.1"* is a template with two of five components undefined,
and a `MUST` to conform to it is normatively empty for `ttl` and `id`. **This is my own reading of
the grep result and I mark it as mine (§6)**; the grep output is reproducible from `input/`.

### Confidence

High on mode 5 — `Aid:171` names the reservation in as many words. High on the undefined
nonterminals, which are mechanically checkable.

### What would still have to be true

That `#35` is closed on its own terms first, and that `<seconds>` and `<uuidv7>` acquire productions
in the same edit that makes conformance to them mandatory.

---

## 5 · `#63` — **SURVIVES**

**Quoted** (`R:17`): *"Вернуть **MUST NOT**: well-formed act нельзя отвергать или отбрасывать
только из-за `UNCHECKABLE`."*

Checked against all five:

1. **No contradiction.** It restores the agreed text verbatim (`Dec:55-56`) and is consistent with
   `D:285` (*"parent not held — **reader gap, not a defect**"*), `D:24` (invariant 4), and
   `D:321-322` (*"Stage 2 rejects `UNANCHORED` at ingest, where rejection belongs"* — a different
   state, so the two rejection regimes do not collide).
2. **The reason supports it.** `R:68-70`: *"`UNCHECKABLE` — нормальный результат selective
   delivery… узел может держать ребёнка и не держать его родителя."* That is `D:291-294` almost
   word for word.
3. **Nothing undeclared is decided.** It picks `Dec:71` closure 1 as written, and `Dec:60-61`
   confirms the gap it fills: *"Every occurrence of 'reject' in the draft is at lines 43, 268, 294
   and 321, and none prohibits it."* Verified — those are the four.
4. **The cost is stated.** `Dec:72` names the narrower closure (rejection at ingest but not at
   classification). Adopting the full form forecloses it; but `D:294`, *"a verifier that rejects on
   an unheld parent rejects correct acts routinely"*, already prices that, and the note's `R:70-71`
   points at it — *"даже если текст уже описывает такое следствие в прозе."*
5. **Right question.** `Dec:§2` is `#63`; the note answers `#63`.

One imprecision that does not rise to a failure: `R:70` says permitting rejection *"противоречит
транспортной модели"* while `Dec:68` says *"a verifier may reject on it and violate nothing."*
These are compatible — model versus marked clause — and the whole point of restoring the `MUST NOT`
is to make the second track the first. The note does not distinguish them, but it does not need to.

**Confidence.** High that it fails none of the five. The wording is the agreed wording and the
change is the smallest of the eight.

**What would still have to be true for it to be right.** Three things, none of which the note
supplies and none of which are its job under `#63`:

- **"well-formed" must be defined.** Grep: the draft never uses the term normatively — the sole
  occurrence is `D:362`, prose about fuzzing. The draft's nearest concept is `D:268`, *"structural
  and I-JSON conformance"*. Until "well-formed" is pinned, the prohibition's antecedent is
  undefined; and if recommendation 4 is adopted, its extension changes silently, because a
  non-conforming filename would then make an act not-well-formed and so freely rejectable.
- **"solely" must be operable.** A verifier that rejects on `UNCHECKABLE` conjoined with any second
  ground — however vacuous — satisfies the rule. The draft supplies no conformance test for
  *solely*, and none of the supplied documents notices this.
- **It must not be read as a retention rule.** "Discard" is broader than "reject". `D:245-246`
  sweeps `in/` entries past TTL out of the inbox; that survives only because it is not *solely*
  because of `UNCHECKABLE`.

---

## 6 · `#106` — **FAILS (mode 2, with mode 4)**

**Quoted** (`R:18`): *"Перенести разделение Witnessing / Examination / Criterion / Ruling в
методологию, не в транспорт."* Reason (`R:74-77`): *"транспорт не способен гарантировать
независимость наблюдателя, проверки, критерия или вердикта. Его место — методология."*

### Mode 2 — the criterion, applied honestly, deletes the draft's own invariants

"The transport cannot guarantee it" is true. It is also true of every invariant §1 already carries.
`D:19-24`:

> 1. *"A record, once published, is immutable. Corrections are new records, never edits."*
> 2. *"Order comes from the citation graph, not from absolute system clocks."*
> 3. *"The causal graph is a **partial order**. Concurrent replies fork…"*
> 4. *"A reader's inability to see a record is not a defect in that record."*

The transport cannot guarantee (1) — a filesystem permits `unlink` and overwrite, which is the
whole of `#67`. It cannot guarantee (2) — nothing stops a producer stamping whatever it likes; the
clock addendum says so at `Acl:88-92`: *"A single peer can move a node's `l` arbitrarily far
forward, permanently … Nothing in the protocol detects this."* §1's invariants are stated
obligations, not enforced guarantees. So unenforceability cannot be the criterion for what belongs
in §1, because it excludes what is already there. The stated reason is true and the conclusion does
not follow. §3's second mode.

The note also never distinguishes *guaranteeing* the separation from *expressing* it — and v0.12
does express an approximation, in the `type` enum at `D:65` and in `D:252`, *"A ruling is not a
reading."*

### Mode 4 — moving it to *this project's* methodology unwrites it for everyone else

`Dec:184` closure 2 is precise about the destination: *"Record it in **this project's own**
methodology, where it is already practised, and leave the transport spec silent."* relay-lite is a
specification other parties may implement. An invariant recorded in one project's methodology binds
no other implementation — and the corpus has already named that exact failure. `Aid:161-164`:

> *"v0.12 contains **zero** occurrences of `posix`, `windows`, `portable` or `platform`. **A
> requirement that binds every implementation and is written nowhere is the same defect this
> project has spent three days cataloguing** — see [#60] and [#63] — and this clause exists so that
> one instance of it is no longer true."*

Moving invariant 3 to methodology manufactures a fresh instance of the defect `Aid:§6` exists to
remove. The note does not name this. It also does not name what `Dec:176-177` records as the
evidential cost: *"This project practises it daily and rediscovered it by failing without it —
`relay-0799`, `defect1-criteria.md`, and five errata in this session about an author examining
their own work."*

### And it does not address the narrower closure

`Dec:185` offers *"Restore a narrower form — that a record and its review are distinct acts —
without the four-way separation."* That form is transport-expressible and is not touched by the
unenforceability argument, since it asks the transport to *mark* a distinction, not to *police*
one. The note argues against the four-way form and treats the narrower one as disposed of with it.

### Confidence

High on mode 2 — `D:19-24` is four lines away from the reasoning it defeats. High on mode 4;
`Aid:161-164` names the pattern in the corpus's own vocabulary.

### What would still have to be true

That someone states a criterion for §1 membership that admits invariants 1, 2 and 4 and excludes
invariant 3. The note's criterion does not.

---

## 7 · `#107` — **FAILS (mode 2 and mode 3)**

*The second paragraph written under objection (`R:79-84`), given §4's treatment.*

**Quoted** (`R:19`): *"Сократить core `type` до определённых семантик: `message` и исправленного
`erratum`; одновременно удалить нынешний §5 из core и перенести его единственное содержательное
утверждение — «a ruling is not a reading» — в методологию."* And `R:80-84`: *"Это решение не может
молча оставить §5: сейчас он говорит о `ruled_by`, которого нет в `RelayAct`, и заканчивается фразой
«A ruling is not a reading». При сокращении enum §5 следует убрать из core… Иначе раздел описывал бы
поле несуществующего типа, не объявленное схемой."*

### Mode 2 — the §5 removal is not a consequence of the enum reduction

Both facts check out. Grep for `ruled_by` in the draft returns exactly one line, `D:250`, and the
`RelayAct` interface at `D:60-70` does not declare it; §5 does end *"A ruling is not a reading"*
(`D:252`).

But the defect the note offers as the *consequence* of shrinking the enum — *"раздел описывал бы
поле… не объявленное схемой"* — **is already true in v0.12, with the full enum intact**. `ruled_by`
is undeclared today. `Dec:201` and `Del:56` both record §5 as it stands without noticing any
dependence on the enum. Shrinking `type` changes only the second half of the note's clause
(*"поле несуществующего типа"*), and that half is a consequence of removing `ruling`, not a reason
to remove §5 — §5's subject was already a field no schema declares.

So the reason is true in part and the conclusion does not follow: the removal of §5 is an
independent repair of an independent defect, presented as compelled by a change that did not cause
it. §3's second mode, and this is precisely the shape §4 warns about — the correction made under
objection is doing more work than the objection required, and it says the extra work is forced.

### Mode 3 — "единственное содержательное утверждение" decides what is not substantive

`D:250-252` in full:

> *"`ruled_by` records **attribution of epistemic responsibility**, not a delegated mandate. It does
> not assert that anyone conferred authority; it names who made the judgment call, so a later reader
> knows whom to distrust. A ruling is not a reading."*

The note carries the last sentence to methodology and discards the other three, calling them not
substantive. They are not decorative: *"not a delegated mandate"*, *"does not assert that anyone
conferred authority"*, and *"so a later reader knows whom to distrust"* are the attribution
semantics — and `Del:56` records §5 as already the surviving residue of what left, `ABSENT` against
v0.1's four-act protocol. Discarding the residue is a decision about the last trace of a logged
loss, taken as an editorial trim. Not admitted.

The same mode-4 objection as recommendation 6 applies to the destination: *"в методологию"* moves
the sentence out of what any other implementer adopts.

### Mode 5, secondarily — it imports `#81`'s answer under `#107`'s heading

`Dec:210` closure 3 reads *"Reduce `type` to what the draft defines"*, and `Dec:204` says what that
is: *"Only `message` is defined."* The recommendation reduces to `message` **and** *"исправленного
`erratum`"* — the erratum as repaired by recommendation 2. `#107` cannot be evaluated against this
row without first accepting recommendation 2, and the row cites `#107` alone. It also departs from
all three of `Dec:207-210`'s closures without saying so.

### Confidence

High that §5's `ruled_by` gap predates the enum change — one grep, one interface. Moderate on
whether removing §5 is *wrong*; my finding is about the reason given, not the outcome, per §7.

### What would still have to be true

That §5's removal is argued on its own ground (a section describing an undeclared field), not as a
consequence; and that `Dec:108`'s question — whether existing users need an adjudication profile
before three types leave core, which the note itself raises at `R:108-109` and does not answer — is
settled before, not after.

---

## 8 · `#51` — **FAILS (mode 4)**

**Quoted** (`R:20`): *"Не возвращать inline `signature` в хешируемое тело. Явно зафиксировать
причину и отложить detached signature в профиль аутентификации."*

The circularity argument is sound and correctly sourced. `D:264` says *"**[MUST NOT]** A verifier
parses, normalizes, or re-serializes bytes when computing a digest or verifying `parent_digest`"*,
and `Dec:42-44` makes the same argument. Excluding a field from a digest computed over raw received
octets does require a canonicalization model the draft forbids. No mode 1, 2, 3 or 5 finding.

### Mode 4 — an addendum has already priced this absence, and the note does not repeat the price

`Acl:94-98`:

> *"**The mitigation is out of scope for the protocol and belongs to deployment**: a store that
> accepts acts only from parties it has reason to trust does not meet a hostile `l`. relay-lite has
> no authentication layer and does not pretend to one — `signature` left the envelope without a
> record ([#51]), **and this is one of the things that absence costs.**"*

What it costs is set out at `Acl:88-92`:

> - *"A single peer can move a node's `l` arbitrarily far forward, permanently."*
> - *"Every act that node seals afterwards carries the moved value."*
> - *"Every peer that ingests one of those acts inherits it."*
> - *"Nothing in the protocol detects this, and no honest node can distinguish it from a peer whose
>   clock is simply wrong."*

The note's treatment of the same absence runs the other way. `R:95-96`: *"core не определяет
доверенный слой идентичности. Поэтому inline-поле не следует возвращать."* The missing identity
layer is offered as a *reason* to keep the field out; an adopted addendum, citing `#51` by number,
records that same absence as an unmitigated, propagating, undetectable *cost* whose only named
mitigation is deployment-level trust. Deferring the repair *"в профиль аутентификации"* — a profile
with no owner, no schedule and no reference in any supplied document — extends that cost
indefinitely, and the note does not say so. §3's fourth mode.

The asymmetry matters because `Acl:100-101` states its purpose: *"Recording it here so that a later
reader meets the cost in the specification rather than in production."* A note answering `#51`
without carrying that cost forward undoes what the addendum was written to do.

### A secondary point: it declines a live proposal without saying it is declining one

`Dec:48` closure 2: *"Restore it **detached** — a sibling artifact, not a field in the hashed body —
**which is what `#53`'s §3.4 checklist item proposes**."* The detached form is not a hypothetical
future; it is on `#53`'s checklist now. `R:96-97` converts it into *"возможный будущий механизм"*.
Declining a standing checklist item is a decision, and it is not admitted (mode 3, weakly).

### Confidence

Moderate-to-high. The `Acl:94-98` sentence names `#51` explicitly and calls the absence a cost, so
the omission is not a matter of interpretation. Moderate on severity: the note does not *foreclose*
authentication, and one may argue the clock addendum's cost belongs to `#32`, not `#51` — but the
addendum's own sentence files it under `#51`.

### What would still have to be true

That the deferral names a holder and a condition — and that the deletion log's reason cell for row 1
records incoherence with `D:264` *and* the clock addendum's cost, since `Dec:47` asks only for the
first.

---

## What the five modes do not cover

Five findings that are real and that none of §3's five modes names.

**1 · An unverifiable citation, precise enough to look verified.** `R:52` cites
*"`src/relay-lite/cns.ts:65`"* with a line number, for the claim that the `errata/` reference
appears in a comment on `DEFAULT_TTL`. That file is not in `input/`. `Att:113` cites the same file
for `DEFAULT_TTL = 0` **without** a line number. A blind reader cannot check the line, and the
precision of the citation invites the reader not to try. Under §6 this is a claim that can neither
quote nor locate its ground within what a reviewer has. Not a contradiction, not a missing cost —
a provenance defect the five modes have no slot for.

**2 · Defects that live only in the combination.** The five modes are per-recommendation. Two
combinations produce something neither member contains:

- Recommendations 6 and 7 together remove **every** trace of the record/review distinction from the
  transport: 6 moves invariant 3 out, 7 deletes `claim`/`challenge`/`ruling` from `D:65` and §5
  from core. Recommendation 6's justification is only that the transport cannot *guarantee*
  independence — never that it should not *express* the distinction. The joint effect exceeds the
  joint justification, and no single row can be charged with it.
- Recommendation 7 is not evaluable without recommendation 2 (*"исправленного `erratum`"*, `R:19`).
  If 2 fails and 7 is adopted, `type` reduces to `message` and a repaired erratum that does not
  exist.

**3 · Four of eight leave the enumerated closures without saying so.** `Dec:21-22` warns:
*"Enumerating three closures for a question frames it as a three-way choice; a fourth may exist
that nobody has named."* Recommendations 3, 4, 5 and 6 take a named closure exactly. Recommendations
1, 2, 7 and 8 are blends or fourth options. Naming a fourth option is legitimate and invited — but
the note never flags which rows are inside the enumerated sets and which are new, and a reader
comparing the note against `Dec` will not see the boundary. Neither a contradiction nor an unnamed
cost; an unmarked change of kind.

**4 · The sourcing rule that binds this review does not bind the note.** The note cites §5, §2.1 and
Stage 2 by section, and cites one implementation file by line. It gives no line anchor for any
claim about the draft or the addenda. Every one of its claims that I could check turned out true
(`ruled_by` at `D:250` and absent from `RelayAct`; `errata/` as expired records at `D:30`; Stage 2
as the structural-rejection point at `D:268-270`) — but the checking had to be reconstructed, and
two of the eight failures above turn on text in an addendum the note never cites at all
(`Aid:151`, `Acl:94-98`).

**5 · An inconsistency the note inherits rather than creates.** `Aid:151` asserts §4.1 *"already
mandates"* `link`, `O_EXCL` and a directory `fsync`; `Dec:138` asserts *"None of v0.12's nine
`[MUST]` clauses requires atomic publication"*; `Del:60` row 13 marks the mechanism `DEMOTED`,
*"unmarked"*. Grep confirms `Dec` and `Del`: the twelve normative markers in the draft are at
`D:42,46,75,79,90,93,124,126,264,276,338,341`, of which nine are `[MUST]`, and none is in §4.1. So
the identifiers addendum's platform declaration rests on a mandate that does not exist. This is a
defect in the corpus, not in the note — but it is load-bearing for recommendation 3 in both
directions, and the note neither uses it nor reports it.

---

## Standing of this document

Written blind: `input/` only, no repository, no network, no history. `answer-subagent.md` is the
only file produced. Every verdict above is anchored to a supplied line; the three places where the
ground is my own inference — the direction of `superseded_by`, the incompleteness of §2.1's grammar
from the grep result, and the literal reading of "create-or-fail" as excluding `ALREADY_PUBLISHED`
— say so in themselves, per §6.

Per §3: **one of eight survives all five modes, and surviving is not being right.** The conditions
under which recommendation 5 would be right are stated with it, and they are not satisfied by
anything in `input/`.
