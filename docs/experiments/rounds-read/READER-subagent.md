# Which of the 46 promises were kept — a blind census

## 0. Preconditions

**Pin.** Run in `/home/zaebee/projects/rounds-read`:

```
find input -type f | sort | xargs sha256sum | sha256sum
→ be77df58707710ba6aacfe657bdc1be3608e3fccb226a859fcbfc1eba92f053e
```

`PIN.txt:2-3` records `be77df58707710ba6aacfe657bdc1be3608e3fccb226a859fcbfc1eba92f053e`.
**The pin matched.** Nothing under `input/` was touched before or during the run.

**Scope.** I read only the seven files under `input/` plus `CONTRACT.md` and `PIN.txt`. I did not
read `/home/zaebee/projects/p-e`, its store, or its history; I did not fetch anything; I did not
read `answer.md`.

**Recognition, declared as §1 requires.** I do recognise this material: the draft names
`github.com/zaebee/p-e`, and that repository is present on this machine as my working directory's
sibling. I have set that aside — every claim below is sourced to a line in `input/`, and where my
ground is inference rather than a line, the claim says so.

**File shorthand.** `T:n` = `thread-v0.1-and-16-rounds.txt` line n. `D:n` =
`relay-lite-v0.12-draft.md` line n. `Ac:n`, `Ai:n`, `At:n` = the clock, identifiers and TTL addenda.

**A tie-break rule, declared before the verdicts.** The spec evolved for sixteen rounds, so almost
every early item was touched by a later one. Applying `LANDED-ALTERED` to every such touch would
make the verdict meaningless, since the later item is itself in this census and gets its own
verdict. So: where a later round **refines** an earlier item (adds precision, adds a field, tightens
a rule) I classify the earlier item `LANDED` and name the refinement. Where a later round
**contradicts** what the earlier item said the draft would carry, I classify it `LANDED-ALTERED`.
This rule is my own; it is not in `PREDICATE.md`, and I state it so the reader can re-derive any
verdict without it.

**The document's own normative convention.** The draft marks obligations with bracketed
`**[MUST]**` / `**[MUST NOT]**` at exactly 12 places (`D:42, 46, 75, 79, 90, 93, 124, 126, 264,
276, 338, 341`) plus two in the clock addendum (`Ac:66, Ac:71`). Because the draft has a visible
convention, an undertaking that promised a `MUST` and arrives outside that convention is visibly
unmarked, not merely unfashionably phrased. That is the test I applied for §5.4, and it is what
produced three of the six `PARTIAL` verdicts.

---

## 1. Response section at T:220 — v0.2 patch, findings 1–5

### Item 1 — T:226, "Fix Publish-or-Fail via `link()` (§4.1)"

**Undertook** (T:227-228): *"Replace `rename(tmp, in/name)` with POSIX `link(tmp, in/name)`
followed by `unlink(tmp)`"*, giving *"true atomic create-or-fail (`EEXIST` on collision) without
silent clobbering"*.

**Draft answers** at D:186 `await fs.link(tmpPath, targetPath);`, D:216 `if (tmpCreated) await
fs.unlink(tmpPath).catch(() => {});`, and D:226-227: *"**`link`, not `rename`** — `rename`
overwrites an existing name silently; `link` fails with `EEXIST`, which is what a create-or-fail
publish needs."*

**Verdict: LANDED.** *Force:* the item stated a change of mechanism, not a `MUST`. The draft carries
the mechanism as executable code in the normative §4.1 listing plus a rationale bullet — the same
force the item claimed, not less.

*Confidence:* high, on both the mechanism and the reasoning being present.

### Item 2 — T:230, "Decouple Deposit from Parent Availability (§7 & §3)"

**Undertook** (T:231-232): *"Downgrade §7's `parent_digest` MUST from 'must point to a valid/held
predecessor' to 'must record the asserted predecessor digest'"*; *"deposit never rejects due to
unheld parents"*; the evaluation layer reports *"`MATCHES | DIVERGES | UNCHECKABLE | LABEL_ONLY`"*.

**Draft answers** at D:276 *"**[MUST]** A citation carries both handles — the locator and the
digest"* — an obligation to *record*, not to *validate*. The old validity MUST appears nowhere: no
line in the draft requires a parent to be held or valid. All four named states are in the D:278-285
table (with two more). D:285: *"`UNCHECKABLE` | parent not held — **reader gap, not a defect**"*.

**Verdict: LANDED.** *Force:* the undertaking's force was "downgrade a MUST", and the draft carries
the downgraded MUST as a bracketed `[MUST]` at D:276. Full force.

*This is my inference, stated as §6 requires:* the clause *"deposit never rejects due to unheld
parents"* is carried **structurally, not as a rule** — `publishMessage` (D:154-159) takes only
`payloadBytes`, `targetName`, `relayRoot`, `maxRetries` and never consults a parent, so the write
path cannot reject on one. No sentence in the draft states the prohibition. The verifier-side
prohibition that this item foreshadowed was promised separately, at item 28, and did not land.

*Confidence:* high that the MUST-downgrade landed; medium that "deposit never rejects" counts as
landed, since it is true of the draft rather than said by it.

### Item 3 — T:234, "Separation of Aggregated Finding from Sovereign Ruling (§5)"

**Undertook** (T:235-236), three things: *"We remove the automated `ruled_by: \"consensus-v1\"`
procedural ruling"*; *"A procedure (e.g., 2 independent PASSes) produces an `AGGREGATED_FINDING`
(Measurement / Reading)"*; *"A `RULING` is an explicit, attributed act signed by a designated
Authority (`ruled_by: \"authority:<id>\"`)"*, keeping *"a ruling is not a reading"*.

**Draft answers** at D:250-252: *"`ruled_by` records **attribution of epistemic responsibility**,
not a delegated mandate. It does not assert that anyone conferred authority; it names who made the
judgment call, so a later reader knows whom to distrust. A ruling is not a reading."*

- `consensus-v1`: **gone** — `grep -i consensus` over the draft returns nothing. Landed.
- *"a ruling is not a reading"*: D:252, verbatim. Landed.
- `AGGREGATED_FINDING`: **nothing answers this.** `grep -i aggregated` over the draft and all three
  addenda returns nothing. The act's `type` union (D:65) is still
  `"message" | "claim" | "challenge" | "ruling" | "erratum"` — the same five as the v0.1 proposal at
  T:61 — so no record kind for an aggregated finding exists either. No later round withdraws it: the
  next round's discussion of §5 (T:289-299) argues about *authority*, not about aggregated findings.
- *"signed by a designated Authority (`ruled_by: \"authority:<id>\"`)"*: the draft carries the
  **opposite** — D:251 *"It does not assert that anyone conferred authority"*. That reversal is
  recorded in writing at T:293 (*"naming an authority is not conferring one"*) and enacted by item 8.

**Verdict: PARTIAL.** Two components in, one component (the `AGGREGATED_FINDING` half of the
distinction) out and never withdrawn, one component reversed-with-record.

*Confidence:* high that `AGGREGATED_FINDING` is absent and unwithdrawn. Medium on the verdict label:
a reader who treated the whole item as one promise superseded by item 8 could argue
`LANDED-ALTERED`. I chose `PARTIAL` because the aggregated-finding half was never mentioned again by
anyone — it is the forgotten case `PREDICATE.md` line 37-38 exists to catch, and folding it into
item 8's alteration would hide it.

### Item 4 — T:238, "Deprecate `logical_seq` in Favor of Pure Causal DAG (§3)"

**Undertook** (T:239-240): *"`relay-lite` eliminates `logical_seq` entirely"*; *"Total order within
a thread is derived exclusively via topological sort over the immutable causal graph"*.

**Draft answers**: `logical_seq` appears nowhere (`grep` returns nothing); the field is gone.
But D:21-22 says *"The causal graph is a **partial order**. Concurrent replies fork; there is no
single true linearisation"*, and D:124 makes it a `[MUST]`.

**Verdict: LANDED-ALTERED.** The elimination landed exactly. The *total order* claim did not — the
draft asserts the contrary — and the alteration is recorded in writing in the very next round at
T:263 (*"A topological sort of a DAG with branches yields many valid linearisations, not one"*) and
enacted by item 6 at T:316.

*Confidence:* high. Both halves are verifiable by direct quotation.

### Item 5 — T:242, "Explicit Dual-Order Model (§1.2 & §2.2)"

**Undertook** (T:243-245): *"We explicitly distinguish: — **Arrival/Queue Order:** Lexicographical
order of UUIDv7 in `.relay/in/` (used solely by workers for transport draining). — **Causal/Semantic
Order:** Directed Acyclic Graph formed by `parent_digest`… No causality is derived from filename
timestamps."*

**Draft answers**, for the causal leg only, at D:20 *"Order comes from the citation graph, not from
absolute system clocks"* and D:21-22, D:124.

For the arrival leg: **nothing answers this.** `grep -i` over the draft and all three addenda for
`arrival`, `queue`, `lexicograph`, `drain`, `worker` returns **zero hits in every file**. The draft
never says that `.relay/in/` sorts by filename, never says that ordering is arrival order, and never
says workers use it to drain. The distinction the item undertook to make *explicit* is made on one
side only.

**Verdict: PARTIAL.**

*My inference, flagged:* D:20's *"not from absolute system clocks"* covers the prohibition
*"no causality is derived from filename timestamps"* in substance, because the UUIDv7 filename
timestamp is a system clock — but the draft never connects the two, so the connection is mine and
not the document's. That inference is why this is `PARTIAL` and not weaker.

*Confidence:* high that the arrival-order leg is wholly absent (five greps, seven files, zero hits);
high on `PARTIAL` as the label.

---

## 2. Response section at T:309 — v0.2 lock-in

### Item 6 — T:315, "Partial Order Primary, Deterministic Tie-Break as Presentation Convention"

**Undertook** three numbered rules (T:318-321):
1. *"The underlying protocol and storage model MUST be treated as a Directed Acyclic Graph (Partial
   Order)."*
2. *"Consumers requiring a flat linear presentation… **MUST use** a deterministic presentation
   convention: Sort by: Topological Depth → HLC Wall Time → lexicographical(digest)"*.
3. *"**[MUST NOT]** Consumers MUST NOT present any linear projection as *the* singular causal
   history, nor make protocol assertions based on a linearized sequence."*

**Draft answers**:
- Rule 1 → D:124 *"**[MUST]** The protocol and storage model treat the graph as a DAG — a partial
  order."* Marked. Landed.
- Rule 3 → D:126-127 *"**[MUST NOT]** A consumer presents any linear projection as *the* causal
  history, or makes protocol assertions from a linearized sequence."* Marked. Landed.
- Rule 2 → D:129 *"A consumer needing a flat presentation deduplicates first, then sorts:"* followed
  by the comparator at D:132-134. **The `MUST` is gone.** The sentence is indicative: it describes
  what such a consumer does, not what it is obliged to do. Its two neighbours five lines above carry
  bracketed markers, so the omission is visible against the draft's own convention.

**Verdict: PARTIAL.** Two of three rules arrive with their force; the third arrives as prose.
`CONTRACT.md:59-60` is explicit: *"An undertaking that promised a `MUST` and arrived unmarked is
`PARTIAL`, not `LANDED`."*

*Separately:* the comparator's terminal key is `id`, not `digest` — altered, and recorded at
T:362-397 and enacted by item 9. That alteration is not why this is `PARTIAL`; the missing `MUST`
is.

*Confidence:* high. This is a word-level comparison of an obligation against a description, and the
draft's twelve bracketed markers make the convention unambiguous.

### Item 7 — T:325, "Full G2a Crash-Durable Publish Sequence (§4.1)"

**Undertook** (T:326-339) a nine-step sequence: `O_CREAT|O_EXCL` temp open, write, `fsync(fd)`,
close, `link`, open dir `O_RDONLY|O_DIRECTORY`, `fsync(dir_fd)`, close, `unlink`.

**Draft answers** at D:178-216: `fs.open(tmpPath, "wx")` (D:178, `wx` = `O_CREAT|O_EXCL`),
`writeFile` (D:180), `tmpHandle.sync()` (D:181), `close` (D:182), `fs.link` (D:186),
`fs.open(inDir, "r")` (D:210), `dirHandle.sync()` (D:211), close and unlink in the `finally`
(D:214-216). Plus D:231-232: *"**Directory `fsync`** — durable bytes do not make a durable name.
Without it a crash can leave a complete record that no directory entry points at."*

**Verdict: LANDED.** *Force:* the item said the sequence *"is strictly defined as"* the nine steps;
the draft carries all nine as the normative §4.1 listing. Equal force.

*Refinements, recorded, not contradictions:* the temp name became randomized (item 13, recorded at
T:519-531) and the `unlink` moved into a `finally` (item 10, recorded at T:399-413). Both preserve
the sequence; neither reverses it.

*Confidence:* high — the nine steps are individually checkable and all nine are present in order.

### Item 8 — T:343, "Attribution of Responsibility over Conferral of Authority (§5)"

**Undertook** (T:344-346): *"`ruled_by: \"<identity>\"` does not assert a cryptographically
delegated sovereign mandate; it records **Attribution of Epistemic Responsibility**"*, adopting
*"Authorisation is not what protects fidelity. Attribution is... It names whom to distrust."*

**Draft answers** at D:250-252, quoted in full under item 3. Every clause has a counterpart:
"attribution of epistemic responsibility" verbatim; "not a delegated mandate" for "not a
cryptographically delegated sovereign mandate"; "knows whom to distrust" for "names whom to
distrust"; "names who made the judgment call" for "identifies which entity made the judgment call".

**Verdict: LANDED.** *Force:* the item labelled it a "Normative Rule" but its content is
definitional — it says what a field *means*. The draft states the same definition declaratively.
Same force; nothing was downgraded, because there was no obligation to downgrade.

*Confidence:* high. This is the closest paraphrase-match in the census.

---

## 3. Response section at T:419 — v0.2.1

### Item 9 — T:427, "Terminal Unique Tie-Break by Construction (§4)"

**Undertook** (T:429-437): *"The comparator replaces `digest` with the envelope/locator **`id`**
(UUIDv7), which is unique by construction"*, with the HLC middle key given as
*"(wall_time_iso, logical_seq, node_id)"* and the claim that the sort is *"strictly total and stable
across all independent readers"*.

**Draft answers** at D:134: `Comparator:  TopologicalDepth  →  HLC (l, c, node_id)  →  id`, and
D:138-139 *"Terminating on `id` is sound only after dedup, because `id` is what dedup keys on."*

**Verdict: LANDED.** *Force:* the item defined the comparator ("strictly defined as"); the draft
carries the definition. The comparator's *use* was the thing item 6 promised as a `MUST`, and that
is where the force was lost — not here.

*Refinements, recorded:* `logical_seq` → `c` (item 12, recorded at T:509-513); the "strictly total"
claim required the dedup step, which the reviewer showed at T:484-507 and the draft states at
D:138-139.

*Confidence:* high that the terminal `id` key landed. Medium on the label — a reader treating the
`(wall_time_iso, logical_seq, node_id)` tuple as part of the promise could say `LANDED-ALTERED`;
under my declared tie-break rule that change is a refinement, not a contradiction.

### Item 10 — T:441, "Guaranteed Temp Cleanup on `EEXIST` Refusal Path (§4.1)"

**Undertook** (T:443): *"Formalize the publish sequence in strict `try...finally` semantics ensuring
descriptor and temp cleanup on *every* exit path (success, refusal, or I/O crash)."*

**Draft answers** at D:213-217:

```
} finally {
  if (tmpHandle) await tmpHandle.close().catch(() => {});
  if (dirHandle) await dirHandle.close().catch(() => {});
  if (tmpCreated) await fs.unlink(tmpPath).catch(() => {});
}
```

The `COLLISION_REFUSED` return at D:205 and the `continue` at D:193 both sit inside that `try`, so
the refusal and retry paths unwind through it.

**Verdict: LANDED.** *Force:* mechanism promised, mechanism delivered in the normative listing.

*Refinement, recorded:* the `tmpCreated` guard was added later (item 18, recorded at T:722-730) — it
narrows *which* temp is deleted, and does not weaken the cleanup guarantee for temps this process
created.

*Confidence:* high.

---

## 4. Response section at T:562 — v0.3-final

### Item 11 — T:570, "Normative Pre-Sort Deduplication by `id` (§4)"

**Undertook** (T:573-575): *"**Normative Rule:** Consumers **MUST** deduplicate the candidate record
set by `id` prior to executing the sorting comparator: ProjectThread(E) = Sort(DeduplicateByID(E),
Comparator)"*.

**Draft answers** at D:129-139:

> *"A consumer needing a flat presentation deduplicates first, then sorts:"*
> `ProjectThread(E) = Sort(DeduplicateByID(E), Comparator)`
> *"Deduplication is not an optimisation. Fan-out delivers N copies of one act, and the comparator
> would otherwise be asked to order records that are copies rather than siblings."*

The formula arrived verbatim. The obligation did not. *"A consumer needing a flat presentation
deduplicates first, then sorts"* is a sentence in the indicative mood — it reports a practice.
*"Consumers MUST deduplicate… prior to executing the sorting comparator"* binds one. The paragraph
that follows argues *why* dedup matters, which is persuasion, not obligation; and the draft's own
`[MUST]` and `[MUST NOT]` sit five and eleven lines above, so the marker was available and was not
used.

**Verdict: PARTIAL.** Content landed; normative force did not. `CONTRACT.md:44-47` describes this
case exactly — *"a rule undertaken as a `MUST` and delivered as a descriptive sentence has landed as
prose, not as a rule"* — and `CONTRACT.md:59-60` fixes the verdict.

*Confidence:* high. This is the clearest instance in the census of vocabulary surviving and force
not: every noun of the undertaking (`ProjectThread`, `DeduplicateByID`, `Comparator`, `id`) is
present, and a term-presence sweep would score it a perfect match.

### Item 12 — T:581, "Standard Local HLC Tuple (§3)"

**Undertook** (T:583-588): *"Replace `logical_seq` with a canonical **Hybrid Logical Clock (HLC)
local counter** per Kulkarni et al."*, `HLC = (wall_time_iso, logical_counter, node_id)`, counter
`0` if wall advances and `last_counter + 1` if equal — *"Zero shared state, zero thread-level
allocation races."*

**Draft answers** at D:54-58 (`interface HLC { readonly l; readonly c; readonly node_id }`) and
D:103-107 (emission rule). `logical_seq` is absent from the draft entirely.

**Verdict: LANDED.** *Force:* the item promised a replacement of one field by another and gave the
update rule; the draft carries both, as an interface and as a normative formula block. Same force.

*Refinements, recorded:* `wall_time_iso` (an ISO string) became `l: number` in milliseconds — first
written at T:813 and visible in the interface at T:1381; and the counter rule gained
`l' = max(physical_now_ms, last_l)`, which is item 17, recorded at T:759-768. Both are refinements
of the same node-local counter, so under my tie-break rule this stays `LANDED`.

*Confidence:* high on the substance; medium on the label, since a reader weighting the tuple's
declared type would reach `LANDED-ALTERED`.

### Item 13 — T:592, "Ephemeral Randomized Temp Files (§4.1)"

**Undertook** (T:594-596): temp files *"ephemeral and non-meaningful"*; format
`.relay/tmp/.dep-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
*"the background sweeper reaps files in `.relay/tmp/` older than 10 minutes."*

**Draft answers** on all three:
- D:28 — `.relay/tmp/     ephemeral temp files, randomized names`
- D:168-171 — the format, character for character
- D:245-246 — *"**GC:** a sweeper reaps `.relay/tmp/` entries older than 10 minutes…"*
- D:228-230 — the reasoning: *"A deterministic `<id>.tmp` would survive as an uncollectable file
  that blocks republication of exactly the message that was interrupted."*

**Verdict: LANDED.** *Force:* a format and a GC policy, both delivered as such.

*Confidence:* high — three independent locations, all matching.

### Item 14 — T:600, "Idempotent Retry & Crash-Recovery on `EEXIST` (§4.1)"

**Undertook** (T:602-604): on `EEXIST`, read the target and compare;
`sha256(existing) == sha256(payload)` ⟹ `ALREADY_PUBLISHED`, else `COLLISION_REFUSED`.

**Draft answers** at D:197-205 — the two digests computed and compared, `ALREADY_PUBLISHED` on
equality (after the directory `fsync` at D:201-202), `COLLISION_REFUSED` otherwise. Plus D:238-240:
*"**Digest comparison on `EEXIST`** — `EEXIST` alone does not say *whose* name it is."*

**Verdict: LANDED.** *Force:* mechanism for mechanism.

*Confidence:* high.

### Item 15 — T:608, "Self-Contained, Complete Publish Implementation (§4.1)"

**Undertook** (T:610-677) that §4.1 carry a complete, self-contained, runnable publish
implementation, and gave one.

**Draft answers** at D:143-222 with a complete self-contained implementation: imports at D:144-146,
`PublishResult` at D:148-152, the function at D:154-221.

**Verdict: LANDED.** *Force:* the undertaking was that the section carry such a listing, and it does.
The listing was independently confirmed to compile as published (T:2174-2180: *"tsc --strict
--noEmit → 141 lines, no errors, no stubs added"*), which is the property "self-contained" names.

*Refinements, recorded:* every difference between the v0.3 listing and the draft's — the retry loop,
`mkdir -p`, the `tmpCreated` flag, `EEXIST` scoped to `link`, `ENOENT` scoped to `readFile`, and the
fourth `RETRY_EXHAUSTED` state — is a later item in this census (18, 21) and each is recorded in a
round of review.

*Confidence:* medium-high on the label. `LANDED-ALTERED` is defensible here, since the specific
listing the item published is not the listing the draft carries; I chose `LANDED` because what the
item's heading undertook — a self-contained complete implementation in §4.1 — is what arrived, and
the alterations are each separately classified below.

---

## 5. Response section at T:779 — v0.4

### Item 16 — T:787, "Separation of Canonical Act (Payload) and Delivery Routing (§2 & §3)"

**Undertook** (T:790-792): *"**Delivery Metadata (CNS Path):** `to=<agent>` lives strictly in the
transport filename"*; *"**Canonical Act (Hashed Body):** The message body contains only
recipient-invariant truths"*; *"N delivery files of a single broadcast are **byte-identical** with
identical SHA-256 digests."*

**Draft answers** at D:50-51: *"The hashed body carries only what is true regardless of who receives
it. Per-recipient delivery metadata lives in the filename and is never hashed."* And D:39-40:
*"`to=<agent>` names **one** delivery leg. A message addressed to N agents produces N delivery files
carrying identical bytes."*

**Verdict: LANDED.** *Force:* an architectural principle plus a guarantee; the draft states both, the
principle as the opening sentence of §3 and the guarantee in §2.1.

*The enumeration changed, and the change is recorded.* The item listed the body as
`(id, thread_id, type, from, hlc, payload)`; the draft's body (D:60-70) also carries `parent_id`,
`parent_digest` and `to`. Each addition is recorded: `parent_digest` at T:930-968 (item 19),
`parent_id` at T:1598-1627 (item 33), and `to[]` at T:1313-1327, where the reviewer withdraws his own
prescription — *"This one corrects my own earlier prescription. I said `to` must leave the digested
body, and that was too broad"* — a withdrawal the draft itself records at D:370-371. All three are
recipient-invariant, so the *principle* the item stated survives every addition; only its snapshot
list did not.

*Confidence:* high on the principle and the guarantee; the enumeration question is settled by the
draft's own D:370-371.

### Item 17 — T:808, "Standard Kulkarni HLC with Clock-Skew / Backward-Jump Handling (§3)"

**Undertook** (T:812-820): `l' = max(physical_now_ms, last_wall_ms)`; `c' = last_c + 1` if
`l' == last_wall_ms`, `0` if `l' > last_wall_ms`; *"strictly monotonic per node regardless of
physical clock regressions."*

**Draft answers** at D:103-107 with that formula, and D:119-120: *"`max` folds a regressing physical
clock into the equal case, so the tuple stays monotonic per node across NTP steps, VM restore, and
suspend."*

**Verdict: LANDED.** *Force:* the item asserted a property of the rule; the draft asserts the same
property — and the clock addendum **raises** it to a marked obligation at `Ac:66-69`:
*"**[MUST]** An implementation claims, and a consumer may rely on, exactly this: The tuple
`(l, c, node_id)` is **strictly monotonic per node**, regardless of physical clock regressions."*
More force than the item asked for, not less.

*Confidence:* high.

### Item 18 — T:824, "Hardened, Leak-Free, Idempotent POSIX Publish Protocol (§4.1)"

**Undertook** five bullets (T:825-829): `EEXIST` interpreted only on `fs.link()`; `unlink` in
`finally` only if `tmpCreated`; `ENOENT` on `readFile` means the name is free, so retry; the
`ALREADY_PUBLISHED` branch executes `dir.sync()` before returning; `mkdir -p` for `tmp/` and `in/`.

**Draft answers**, each to its bullet:
- D:185-208 — the `EEXIST` catch is an inner `try` wrapping `fs.link` alone; D:233-235 gives the
  reason.
- D:216 — `if (tmpCreated) await fs.unlink(tmpPath)`.
- D:193 — `if (readErr.code === "ENOENT") continue;   // target vanished; the name is free`; D:236-237
  gives the reason.
- D:201-203 — `dirHandle.sync()` inside the `ALREADY_PUBLISHED` branch, before the return.
- D:164-165 — `await fs.mkdir(tmpDir, { recursive: true }); await fs.mkdir(inDir, ...)`.

**Verdict: LANDED.** *Force:* five mechanisms promised, five delivered, four of them with a rationale
bullet the item did not even promise.

*Confidence:* high — each of the five is a single checkable line.

---

## 6. Response section at T:1023 — v0.5-locked

### Item 19 — T:1031, "Canonical Act Interface with Explicit `parent_digest` (§3)"

**Undertook** (T:1032): *"**Normative Rule:** The `parent_digest` field is a first-class property of
the canonical act. It **MUST** record the SHA-256 digest of the parent's **Canonical Act body**
(which is recipient-invariant and stable across all inboxes)."*

**Draft answers** at D:64: `readonly parent_digest: string | null;  // SHA-256 of parent's wire
octets`.

**Verdict: LANDED-ALTERED.** The field is first-class, as promised. What it records is *not* what
was promised: **"the parent's Canonical Act body"** and **"the parent's wire octets"** are the same
bytes only when the producer was canonical, and the whole point of the later wire-octet rule is that
a non-canonical producer must not be silently repaired. The alteration is recorded in writing at
T:1285-1290 (*"hash the bytes as received… parse, re-canonicalize with JCS, hash that"* — the
reviewer names both readings and rules for the first) and enacted by item 24 at T:1345-1347.

*On force, since it bears on the reading:* the promised `MUST` does not appear as a bracketed marker
beside the field; the field's content is given in a code comment. But the obligation is carried
elsewhere and distributed — D:264-266 `**[MUST NOT]**` forbids parsing or re-serializing *"when
computing a digest or verifying `parent_digest`"*, and D:338 `**[MUST]**` obliges the store's
`digest === SHA-256(octets)`. Between them a conforming implementation has no freedom about what
`parent_digest` holds. *That last sentence is my inference from two separate rules, not a quotation.*

*Confidence:* high that the field landed and that its definition changed with a record; medium on
`LANDED-ALTERED` over `PARTIAL` — I judged the recorded change to be the more important fact than
the unbracketed comment, because the obligation survives at D:264 and D:338.

### Item 20 — T:1048, "Complete Kulkarni HLC Specification (Emission & Ingest Rules) (§3)"

**Undertook** (T:1051-1069) the emission rule and the four-case ingest rule:
`l' = max(physical_now_ms, last_l, M.hlc.l)`; `c' = max(last_c, M.hlc.c) + 1` on the three-way tie,
`last_c + 1`, `M.hlc.c + 1`, else `0`.

**Draft answers** at D:109-117 with all four ingest cases in that order, and D:101-107 with the
emission rule.

**Verdict: LANDED.** *Force:* a normative formula block promised, the same block delivered.

*Not part of the undertaking, but recorded for the reader:* `Ac:110-112` notes that §3.3 *"says
nothing about persistence, so per-node monotonicity rests on state the specification does not
require anyone to keep."* The item did not promise persistence, so this does not bear on the verdict.

*Confidence:* high — the four cases are individually comparable and all four match.

### Item 21 — T:1073, "Strictly Scoped, Four-State POSIX Publisher (§4.1)"

**Undertook** (T:1074-1075): *"**Scoped `ENOENT`:** Only `fs.readFile(targetPath)` is wrapped in the
target-existence check. Directory `open()` and `sync()` run outside it."* and *"**Honest Exit
State:** If loop exhausts via vanishing target, returns `RETRY_EXHAUSTED`"*; plus the four-variant
`PublishResult`.

**Draft answers**:
- D:148-152 — `PublishResult` as a four-variant union including `{ status: "RETRY_EXHAUSTED" }`.
- D:190-195 — the inner `try` contains `existingBytes = await fs.readFile(targetPath);` and nothing
  else; the digest computation (D:197-198) and `fs.open(inDir, "r")` (D:201) are outside it.
- D:220 — `return { status: "RETRY_EXHAUSTED" };` at loop exit.
- D:236-237 and D:241-243 give the reasons for both.

**Verdict: LANDED.** *Force:* mechanism and state-set both delivered.

*Confidence:* high.

---

## 7. Response section at T:1229 — v0.6-complete

### Item 22 — T:1237, "Normative Canonical Serialization: RFC 8785 (JCS) (§3)"

**Undertook** three rules (T:1240-1246):
1. *"The canonical byte representation of a `RelayAct` **MUST** be generated according to **RFC 8785
   (JSON Canonicalization Scheme / JCS)** encoded as raw **UTF-8**."*
2. *"All cryptographic hashes (`parent_digest`, `target_digest`, and idempotency comparisons)
   **MUST** be computed over this JCS byte slice."*
3. Key order by UTF-16 code units, ECMAScript numbers, non-ASCII as literal UTF-8.

**Draft answers** at D:75-77: *"**[MUST]** Producers mint canonical wire bytes per **RFC 8785 (JCS)**
encoded as raw UTF-8. JCS fixes key order (UTF-16 code units), number formatting (ECMAScript), and
string escaping (non-ASCII emitted as literal UTF-8)."*

Rule 1 landed with its `[MUST]` marker intact (narrowed to *Producers*). Rule 3 landed. **Rule 2 is
contradicted**: D:261-266 requires the opposite for verification —
*"`act_digest = SHA-256(raw_received_bytes)`. No parsing, no normalization."* plus
*"**[MUST NOT]** A verifier parses, normalizes, or re-serializes bytes when computing a digest or
verifying `parent_digest`."*

**Verdict: LANDED-ALTERED.** The alteration is recorded at T:1281-1290 (*"Sealing binds the
producer; nothing binds the verifier"*) and enacted by item 24 at T:1344-1348.

*Confidence:* high. Both the landing of rules 1/3 and the reversal of rule 2 are direct quotations,
and the reversal is explicitly argued in a named later round.

### Item 23 — T:1250, "The 'Sealed Act' Invariant & Lifecycle (§3 & §4.1)"

**Undertook** (T:1252-1255): *"**Sealing:** An act is minted once: `id` is generated, `hlc` is
stamped via `HLC.tick()`, and the payload is canonicalized to JCS bytes."*; *"**Immutability:** Once
sealed, the canonical byte buffer is immutable."*; *"**[MUST NOT]** Publishers MUST NOT re-tick HLC
or re-mint timestamps when retrying an existing `id`. Retries and multi-recipient fan-out broadcasts
MUST transmit the identical sealed byte buffer."*

**Draft answers** at D:90-94:

> *"**[MUST]** An act is sealed at creation: `id` minted, `hlc` stamped once, bytes canonicalized
> once."*
> *"**[MUST NOT]** Publishers re-tick the HLC or re-mint timestamps when retrying an existing `id`.
> Retries and fan-out transmit the identical sealed byte buffer."*

**Verdict: LANDED.** *Force:* fully carried, and one clause **strengthened** — the sealing rule was
offered without a marker and arrived as a bracketed `[MUST]` at D:90. The `[MUST NOT]` arrived as a
bracketed `[MUST NOT]` at D:93, with the fan-out clause intact. The immutability clause is carried
by *"bytes canonicalized once"* and *"transmit the identical sealed byte buffer"*, and reinforced by
the `readonly` interface at D:60-70.

*Confidence:* high. This is the item where the draft's normative marking is strictest.

---

## 8. Response section at T:1333 — v0.7

### Item 24 — T:1341, "Verifier Wire-Octet Hashing Rule (§3 & §7)"

**Undertook** four rules (T:1344-1348): producers `MUST` mint JCS bytes and seal them; verifiers
`MUST` compute digests over *"the **exact received wire octets**"*; verifiers `MUST NOT` parse,
normalize or re-serialize when computing a digest or verifying `parent_digest`; *"Non-canonical
producers are rejected at the digest verification boundary."*

**Draft answers**:
- Producer rule → D:75 `**[MUST]** Producers mint canonical wire bytes per **RFC 8785 (JCS)**…`
- Verifier prohibition → D:264-266 `**[MUST NOT]** A verifier parses, normalizes, or re-serializes
  bytes when computing a digest or verifying `parent_digest`.` — marked, and with the item's
  rationale carried at D:265-266.
- Verifier positive rule → D:261-262 *"**Stage 1 — wire-octet hashing.** `act_digest =
  SHA-256(raw_received_bytes)`. No parsing, no normalization."*
- Rule 4 → the draft does not say non-canonical producers are rejected at the digest boundary. That
  clause was overtaken by the tri-state work: T:1401-1409 shows a binary boundary *"charges a writer
  for the reader's gap"*, and item 28 replaced it.

**Verdict: LANDED.** *Force:* the prohibition arrived bracketed. The positive obligation arrived as a
stage definition rather than a marked `MUST` — but *this is my inference and I flag it as such*: a
verifier that did anything other than hash the received bytes would have to parse, normalize or
re-serialize, which D:264 forbids under a marked `[MUST NOT]`. The prohibition is the operative form
of the same rule, so no force is lost.

*Confidence:* medium-high. High that rules 1-3 are present; medium that rule 4's disappearance does
not warrant `LANDED-ALTERED` — I treated rule 4 as a claim about a boundary that item 28 then
redrew, with the redrawing recorded.

### Item 25 — T:1352, "I-JSON (RFC 7493) Data Domain Constraints (§3)"

**Undertook** (T:1354-1357): all act bodies and payloads `MUST` conform to I-JSON — integers within
the safe range with larger values `MUST` be encoded as strings; producers `MUST NOT` emit duplicate
keys and verifiers encountering them `MUST` reject; strings `MUST` be valid UTF-8 without overlong
sequences or unpaired surrogates.

**Draft answers** at D:79-81: *"**[MUST]** Acts conform to **I-JSON (RFC 7493)**: no duplicate keys;
integers within `[-(2^53 - 1), 2^53 - 1]`, larger values encoded as strings; strings valid UTF-8
without overlong sequences or unpaired surrogates."* Every clause, under one marker. The verifier
half is at D:268-269: *"Parse; reject on duplicate keys, on numbers outside the safe range…"*. The
rationale the item gave is carried at D:83-86.

**Verdict: LANDED.** *Force:* the `[MUST]` marker covers all three producer constraints; the
verifier's rejection duty arrives as an imperative in the pipeline whose *"ordering is normative"*
(D:258). Full force.

*Confidence:* high — a clause-by-clause match.

### Item 26 — T:1361, "Audience Attestation: Invariant `to: string[]` (§2 & §3)"

**Undertook** (T:1364-1366): *"**The Canonical Act** contains the author's invariant intended
audience list: `to: string[]`"*; *"**The CNS Filename** carries the single delivery recipient leg:
`to=<agent>`"*; *"All N delivery files… contain the **identical `to: string[]` list**"*.

**Draft answers** at D:67 `readonly to: readonly string[];  // Invariant attested audience list`,
and D:39-40 *"`to=<agent>` names **one** delivery leg. A message addressed to N agents produces N
delivery files carrying identical bytes."* The draft also records why this reversed the earlier
prescription, at D:370-371.

**Verdict: LANDED.** *Force:* a structural resolution and a guarantee; both delivered.

*One clause reads more strongly in the item than the draft can support, and I note it without
altering the verdict:* the item says *"cryptographic audience attestation"*. The draft has no
signature layer — `Ac:96-98` records that *"`signature` left the envelope without a record"* — so the
attestation is by digest inclusion, not by signature. The item's own mechanism was digest inclusion,
so nothing was lost; only the adjective was ambitious.

*Confidence:* high.

### Item 27 — T:1370, "Canonical `RelayAct` Interface (v0.7 Final)"

**Undertook** (T:1373-1386) the interface with `id`, `thread_id`, `parent_digest`, `type`, `from`,
`to: string[]`, an inline `hlc: { l; c; node_id }`, and `payload: T`.

**Draft answers** at D:60-70 with every one of those fields, the same types and the same comments,
plus `parent_id` (item 33, recorded T:1598-1627), `hlc: HLC` naming a declared interface (item 43,
recorded T:2104-2112), and `readonly` throughout (item 45, recorded T:2186-2202).

**Verdict: LANDED.** *Force:* an interface declaration promised and delivered.

*Under my declared tie-break rule this is a refinement, not a contradiction:* all three later changes
are additions or tightenings, and no field the item promised was removed or redefined.

*Confidence:* high.

---

## 9. Response section at T:1447 — v0.8

### Item 28 — T:1455, "Tri-State Causal Link Evaluation (§3 & §7)"

**Undertook** two things (T:1457-1461):
1. *"**Normative Rule:** Evaluating `parent_digest` against the local store **MUST** yield one of
   three distinct states"* — `MATCHES`, `DIVERGES`, `UNCHECKABLE`, with `UNCHECKABLE` defined as
   *"(Visibility limitation, NOT an author defect)"*.
2. *"**[MUST NOT]:** Verifiers MUST NOT reject or discard a well-formed act solely because its
   causal link evaluates to `UNCHECKABLE`."*

**Draft answers**, for the first: the D:278-285 table carries all three states (inside a six-state
partition — the expansion is recorded at T:1742-1775 and enacted by items 35 and 38), and
`evaluateCausalLink` at D:301-318 returns them. D:285 reads *"`UNCHECKABLE` | parent not held —
**reader gap, not a defect**"*. Landed.

For the second: **nothing in the draft or the three addenda forbids rejecting on `UNCHECKABLE`.**
I checked every occurrence of both terms:

- `UNCHECKABLE` appears at D:285, D:291, D:299, D:317 and nowhere else in any file.
- `reject` appears at D:43, D:268, D:294, D:321-322 and nowhere else in the draft; in the addenda
  only at `Ac:58` and `Ac:74`, neither about causal links.
- The draft's twelve `[MUST]` / `[MUST NOT]` markers (D:42, 46, 75, 79, 90, 93, 124, 126, 264, 276,
  338, 341) contain no prohibition on rejection.

What the draft has instead, at D:291-294:

> *"`UNCHECKABLE` is a consequence of this protocol's own transport, not an import… Partial
> visibility is the normal case, and **a verifier that rejects on an unheld parent rejects correct
> acts routinely.**"*

That sentence states a *consequence*. It tells an implementer what will happen if they reject. It
does not forbid rejecting. Nor does §7.1's Stage 2 reject-list (D:268-270), which enumerates five
grounds for rejection and is silent on `UNCHECKABLE` — silence that permits, since the pipeline
nowhere says its reject-list is exhaustive.

**No later round withdraws the prohibition.** Every subsequent response section (T:1556, 1644, 1785,
1921, 2027, 2122, 2212) either extends the state partition or addresses other layers; none reverses
or replaces the `MUST NOT`. Per `PREDICATE.md` line 37-38, silence is not withdrawal.

**Verdict: PARTIAL.** The state partition landed with force. The prohibition that made the partition
*binding* — the one clause that stops a conforming verifier from doing exactly what the tri-state
was introduced to prevent — arrives as an observation about consequences.

*Confidence:* high. I searched for the rule four ways (by term, by marker, by the reject-list, and by
reading §7 end to end) and it is not there in any form; and I read all seven later response sections
for a withdrawal and found none.

### Item 29 — T:1465, "Audience Membership Constraint (§2.2 & §3)"

**Undertook** (T:1467-1470): *"**Normative Rule [MUST]:** The delivery recipient named in the CNS
filename (`to=<agent>`) **MUST** be an element of the sealed canonical audience array… (or
`Act.to == [\"all\"]`)"*, and *"Any delivery leg naming an agent outside the attested `to[]` array
is non-conformant and MUST be rejected by the receiver."*

**Draft answers** at D:42-44: *"**[MUST]** `CNS.to` is an element of the act's `to[]`, or
`to[] == [\"all\"]`. A delivery leg naming a recipient outside the attested audience is
non-conformant and is rejected by the receiver."* And at D:269, among Stage 2's grounds for
rejection: *"on `CNS.to ∉ act.to[]`"*.

**Verdict: LANDED.** *Force:* the membership constraint arrived bracketed `[MUST]`. The receiver's
duty arrived in the indicative (*"is rejected by the receiver"* for *"MUST be rejected by the
receiver"*) — but the obligation survives at D:269, where the same condition is an explicit ground
for rejection inside a pipeline the draft calls normative (D:258). *That the indicative sentence and
the Stage 2 entry together carry the promised obligation is my inference, stated as §6 requires.*

*Confidence:* medium-high. High that both halves are present; medium that the indicative phrasing in
§2.1 is fully repaired by §7.1's reject-list. Unlike item 28, the obligation here has somewhere else
to live, and it lives there.

### Item 30 — T:1474, "Deterministic Three-Stage Verification Pipeline (§3 & §7)"

**Undertook** (T:1475): *"verifiers MUST process incoming delivery files in a strict, sequential
three-stage pipeline"* — Stage 1 wire-octet hashing with no parsing; Stage 2 structural and I-JSON
conformance with four named checks; Stage 3 causal link evaluation.

**Draft answers** at D:256-272. D:258: *"Three stages, in order. **The ordering is normative:** stage
1 must not parse, and stage 2's conformance checks require parsing."* Then Stage 1 (D:261-266), Stage
2 with all four of the item's checks plus the unanchored-citation check added later (D:268-270), and
Stage 3 (D:272).

**Verdict: LANDED.** *Force:* the `MUST` on the pipeline arrives as an explicit normativity
declaration — *"The ordering is normative"* — rather than as the draft's bracketed marker. That is a
different form, not a weaker one: it asserts obligation outright, which is what distinguishes it from
the item-11 and item-6 cases, where the draft asserts nothing and merely reports.

*Confidence:* medium-high. The distinction between *"the ordering is normative"* and a bracketed
`[MUST]` is a judgement, and I have stated the ground for it rather than assuming it. I do note the
narrower point that the draft obliges the *ordering* explicitly and the *running of the pipeline*
only by implication.

---

## 10. Response section at T:1556 — holding v0.8

### Item 31 — T:1564, "Retraction of Premature 'Logical Completeness'"

**Undertook** (T:1565-1566): *"The claim that v0.8 is 'logically complete' is retracted"*; status
becomes *"**Working Draft for Empirical Multi-Agent Implementation (Open for Fuzzing & Independent
Verification)**"*.

**Draft answers** at D:1 (`# relay-lite — Working Draft v0.12`) and D:3: *"**Status:** Working draft.
Not verified. Not adopted by this project."* And D:6-8: *"A single-reviewer trajectory is not a
verified one; see **Provenance and standing** below before treating any part of this as
established."*

**Verdict: LANDED.** *Force:* a status designation promised and carried, in the document's title and
first status line. If anything the draft claims less than the item did.

*One divergence, noted:* the item designated the draft *"Open for Fuzzing"*; the draft at D:361-364
says of the six-state partition *"**Fuzzing will not do it:** a fuzzer emitting well-formed acts sees
every state returned correctly and records a pass."* That is a narrower claim about one falsification
route for one component, and it is grounded in the thread at T:1640-1642. It does not reverse the
working-draft status, which is what the item undertook.

*Confidence:* high.

### Item 32 — T:1570, "Intrinsic Derivation of `UNCHECKABLE` (§3 & §7)"

**Undertook** (T:1572-1578) a five-step derivation grounding `UNCHECKABLE` in §2.2's selective
delivery, concluding it is *"an intrinsic mathematical necessity of **selective delivery under
partial visibility**, independent of filesystem failures or external store history."*

**Draft answers** at D:291-294: *"`UNCHECKABLE` is a consequence of this protocol's own transport,
not an import: under §2.1's single-leg delivery an act addressed to one agent is never written into
another's inbox, so a node holding a child that cites it *cannot* hold the parent."*

**Verdict: LANDED.** *Force:* a derivation promised, the derivation delivered — compressed from five
numbered steps to two clauses, but with every load-bearing premise (single-leg delivery, non-delivery
to non-addressees, the impossibility of holding the parent) and the same conclusion, and with the
grounding cited to the draft's own §2.1.

*Confidence:* high. That the compressed form carries the same argument is my reading of two passages
side by side, and I say so.

---

## 11. Response section at T:1644 — v0.9

### Item 33 — T:1654, "The Explicit (Locator, Digest) Causal Citation Pair (§3)"

**Undertook** (T:1656): *"**Normative Rule:** Every causal link **MUST** explicitly carry both the
**Locator** (`parent_id`) and the **Digest** (`parent_digest`)"*, with the interface adding
`parent_id: string | null`.

**Draft answers** at D:276: *"**[MUST]** A citation carries both handles — the locator and the
digest:"*, and D:63: `readonly parent_id: string | null;      // Predecessor locator (null for
roots)`. The reason is carried at D:287-289: *"Without the locator, 'the parent is not held' and 'the
parent is held and disagrees' are the same miss — so `DIVERGES` is unreachable and author defects
launder into honest gaps."*

**Verdict: LANDED.** *Force:* the promised `MUST` arrived as a bracketed `[MUST]`. Full force.

*Confidence:* high.

### Item 34 — T:1674, "Observable Three-State Causal Evaluation Logic (§3 & §7)"

**Undertook** (T:1675-1703): with both handles present, Stage 3 becomes *"fully observable and
deterministic"*; the `evaluateCausalLink` implementation resolving the parent by locator lookup and
returning `MATCHES` / `DIVERGES` / `UNCHECKABLE`; the proof matrix at T:1709-1713.

**Draft answers** at D:301-318 — the function resolves `localStore.get(parent_id)` (D:313) and
returns `parentRecord.digest === parent_digest ? "MATCHES" : "DIVERGES"` (D:315) or `"UNCHECKABLE"`
(D:317). The matrix is the D:278-285 table.

**Verdict: LANDED.** *Force:* an implementation and a matrix promised; both delivered, the matrix
expanded from three rows to six.

*Under my tie-break rule this is a refinement:* the v0.9 function's two null-matrix bugs were fixed
by items 35/37/39, all recorded at T:1742-1775 and T:1875-1919, and the corrected function still
reaches all three of the states this item made observable.

*Confidence:* high.

---

## 12. Response section at T:1785 — v0.10

### Item 35 — T:1795, "Complete Causal Link 2x2 Truth Table (§3 & §7)"

**Undertook** (T:1797-1802) a four-row table: `(null,null)` → `NO_PARENT`; `(set,set)` →
`MATCHES`/`DIVERGES`/`UNCHECKABLE`; `(set,null)` → `LABEL_ONLY`, *"Valid, not a defect"*;
`(null,set)` → `UNANCHORED`, *"Malformed Citation… Rejected at Stage 2."*

**Draft answers** at D:278-285 with all four combinations expanded to six rows:

> `| null | set | UNANCHORED | bytes claimed for nobody — malformed |`
> `| set | null | LABEL_ONLY | predecessor named, no byte commitment — **not a defect** |`

plus `NO_PARENT`, `MATCHES`, `DIVERGES`, `UNCHECKABLE`. The Stage 2 rejection of `UNANCHORED` is at
D:269-270 and D:321-322.

**Verdict: LANDED.** *Force:* a table promised and delivered, with each cell's normative
characterisation — *"not a defect"*, *"malformed"* — carried across verbatim in sense.

*Confidence:* high — a row-by-row match.

### Item 36 — T:1806, "Stage 2 Structural Enforcement (§3)"

**Undertook** (T:1807-1812): *"In **Stage 2**… the verifier explicitly rejects unanchored
citations"*, with the predicate `act.parent_id === null && act.parent_digest !== null`.

**Draft answers** at D:268-270: *"**Stage 2 — structural and I-JSON conformance.** Parse; reject on
duplicate keys, … and **on an unanchored citation (`parent_id == null && parent_digest != null`)**."*
Reinforced at D:321-322: *"Stage 2 rejects `UNANCHORED` at ingest, where rejection belongs"*.

**Verdict: LANDED.** *Force:* the item gave a `throw` inside Stage 2; the draft gives the same
predicate as an explicit ground for rejection in Stage 2's normative list. Same obligation, prose
instead of code.

*Confidence:* high — the predicate is reproduced character-for-character in substance.

### Item 37 — T:1816, "Exhaustive, Deterministic `evaluateCausalLink` Implementation (§3 & §7)"

**Undertook** (T:1820-1862): a five-member `CausalStatus` union, all four corners covered, the unsafe
`!` eliminated, and corner 2 handled by
`throw new Error("UNANCHORED_CITATION: Illegal state…")` (T:1841).

**Draft answers** at D:296-318: a **six**-member union including `"UNANCHORED"` (D:297-299), and
corner 2 handled by `return "UNANCHORED";` — not a throw. D:321 states the consequence:
*"Evaluation is **total** — every input returns a state, none throws."* The control flow is also
restructured to branch on `parent_id` alone first (D:307-311), with the reason at D:325-327.

**Verdict: LANDED-ALTERED.** The exhaustive four-corner coverage landed and the `!` is gone, as
promised. But throwing and returning are different functions — the item's version is not total, and
the draft's is — and both alterations are recorded in writing at T:1875-1919 (*"v0.10 does not
compile under `strict`"* and *"The `UNANCHORED` throw is dead where it is safe and live where it
hurts"*), then enacted by items 38 and 39.

*Confidence:* high. The throw/return difference is a direct quotation on each side and the record of
the change is an entire review round.

---

## 13. Response section at T:1921 — v0.11

### Item 38 — T:1929, "`CausalStatus` as a Total 6-State Union Type (§3 & §7)"

**Undertook** (T:1930-1940): *"**Normative Rule:** Causal evaluation is a **total, pure function**
mapping any historical record state to an explicit variant with zero unhandled exceptions"*, with the
six-member union.

**Draft answers** at D:297-299:

```
export type CausalStatus =
  | "NO_PARENT" | "UNANCHORED" | "LABEL_ONLY"
  | "MATCHES"   | "DIVERGES"   | "UNCHECKABLE";
```

and D:321: *"Evaluation is **total** — every input returns a state, none throws."*

**Verdict: LANDED.** *Force:* the item's "Normative Rule" asserts a property of a function; the draft
asserts the same property and supplies the function that has it (D:301-318 contains no `throw`). The
property is not the kind of thing a `MUST` binds — it is either true of the code or not — so no force
was available to lose.

*Confidence:* high.

### Item 39 — T:1944, "Verified, Strict-Compliant `evaluateCausalLink` Implementation (§3 & §7)"

**Undertook** (T:1947-1974) the hierarchical-narrowing implementation: branch on `parent_id === null`
first, then `parent_digest === null`, then the store lookup.

**Draft answers** at D:301-318 with the identical structure and identical returns, plus D:325-327
explaining why: *"Three conjunctive guards exhaust the null cases logically, but TypeScript's
control-flow analysis does not narrow across them, and the version that reads as exhaustive fails
`tsc --strict` at `localStore.get(parent_id)`."*

**Verdict: LANDED.** *Force:* an implementation promised and delivered, with the reasoning added.

*One refinement, recorded:* the `localStore` parameter's type moved from the inline
`Map<string, { octets: Buffer; digest: string }>` to `Map<string, StoredRecord>` — item 41, recorded
at T:2006-2023. That change strengthens the function's guarantee and does not alter its behaviour.

*Confidence:* high — a line-by-line match of the body.

### Item 40 — T:1979, "Pipeline Separation of Enforcement vs. Classification (§3)"

**Undertook** (T:1980-1981): *"**Stage 2 (Ingest Gate):** Enforces write-time validity. Drops/rejects
acts if `act.parent_id === null && act.parent_digest !== null`. **Stage 3 (Causal Evaluator):** Total
evaluator. If an unanchored legacy record is audited, it returns `\"UNANCHORED\"` safely without
crashing the evaluation loop."*

**Draft answers** at D:321-323: *"Stage 2 rejects `UNANCHORED` at ingest, where rejection belongs;
stage 3 still classifies it, so an auditor sweeping records written under older rules gets a report
instead of an aborted sweep."* Stage 2's predicate is at D:269-270; Stage 3's return is at D:310.

**Verdict: LANDED.** *Force:* a division of labour between two stages, promised and stated, with the
reason for it stated too.

*Confidence:* high.

---

## 14. Response section at T:2027 — v0.12

### Item 41 — T:2035, "The Store Integrity Invariant (§3 & §4)"

**Undertook** three rules (T:2038-2049):
1. *"`record.digest` **MUST** be an exact, immutable mirror of the payload bytes:
   `record.digest ≡ SHA-256(record.octets)`"*
2. *"Stores **MUST** guarantee this invariant by either: Deriving the digest directly at
   load/evaluation time from `octets`, OR Verifying the hash upon ingestion before committing"*
3. *"If an internal store discrepancy is detected at runtime, the store **MUST** flag an internal
   `STORE_CORRUPTION` fault; it **MUST NOT** emit `DIVERGES` against subsequent child records."*
   Plus the `StoredRecord` interface with `readonly` fields.

**Draft answers** at D:331-343:

```
export interface StoredRecord {
  readonly octets: Buffer;
  readonly digest: string;   // INVARIANT: digest === SHA-256(octets)
}
```
> *"**[MUST]** A store guarantees the invariant, by deriving the digest at load or by verifying it
> before committing the record."*
> *"**[MUST]** A detected discrepancy raises `STORE_CORRUPTION`. It **MUST NOT** surface as
> `DIVERGES` against a child record — the tri-state stops a reader's *visibility* gap from becoming
> an author's defect, and this stops the reader's *staleness* from doing the same."*

**Verdict: LANDED.** *Force:* all three rules arrived, two of them under bracketed `[MUST]` markers
and the third under a bracketed `MUST NOT` inside the second. The invariant itself is carried in the
interface comment *and* obliged at D:338. Full force.

*One difference that is not a loss:* the item said §3 and §4; the draft puts it in a new §7.3. The
substance is identical.

*Confidence:* high. This is the best-marked item in the census.

---

## 15. Response section at T:2122 — v0.12 corrections

### Item 42 — T:2134, "Epistemic Status of the 6-State Causal Partition"

**Undertook** (T:2135): the partition is recorded *"not as an independently verified universal law,
but as a **formal hypothesis derived from `continuity.ts`**, subject to falsification during
multi-agent implementation and fuzz testing."*

**Draft answers** at D:356-359: *"It is recorded here as a **formal hypothesis derived from
`continuity.ts`, subject to falsification** — not as an independently discovered invariant. The
reviewer initially described the agreement between the two systems as evidence and later retracted
that: one system was copied into a specification and then observed arriving there."* The whole *"What
is imported"* section (D:349-364) carries the timeline the item's rationale rested on.

**Verdict: LANDED.** *Force:* a status declaration about a claim; declared, in nearly the item's own
words, and with more supporting record than the item promised.

*One narrowing, noted:* the item named fuzz testing as a falsification route; D:361-364 says
*"**Fuzzing will not do it**"* and names a reader that has not seen `continuity.ts` instead. That
sharpens the falsification condition rather than withdrawing the hypothesis status, which is what the
item undertook — and the reviewer had already made that point in the thread (T:1640-1642, T:2120).

*Confidence:* high on the landing; medium on treating the fuzzing narrowing as immaterial, which is
my reading.

### Item 43 — T:2139, "Standalone `HLC` Interface Declaration (§3)"

**Undertook** (T:2140-2147): *"the explicit `HLC` interface declaration is added to §3"* so the
listings compile standalone, with `readonly l`, `readonly c`, `readonly node_id`.

**Draft answers** at D:54-58:

```
export interface HLC {
  readonly l: number;         // Physical/wall timestamp in milliseconds UTC
  readonly c: number;         // Monotonic logical counter per node
  readonly node_id: string;   // Unique node/process identifier
}
```

Character-identical to the item's block, including comments. `RelayAct.hlc` at D:68 references it.

**Verdict: LANDED.** *Force:* a declaration promised, the declaration delivered; and the property it
was for — that the listings compile standalone — was independently checked at T:2174-2180.

*Confidence:* high — this is a verbatim match.

### Item 44 — T:2164, "Re-affirmation of Status: Working Draft (v0.12-draft)"

**Undertook** (T:2165-2166): *"The claim of 'Complete & Ready for Baseline Merge' is retracted.
**Formal Status:** **Working Draft for Reference Implementation & Multi-Agent Fuzzing
(v0.12-draft)**."*

**Draft answers** at D:1 and D:3: *"# relay-lite — Working Draft v0.12"* / *"**Status:** Working
draft. Not verified. Not adopted by this project."* No claim of completeness or merge-readiness
appears anywhere in the draft.

**Verdict: LANDED.** *Force:* a status designation, carried in the title and the first status line;
and made stronger, since *"Not verified. Not adopted"* claims less than *"for Reference
Implementation & Multi-Agent Fuzzing"*.

*Confidence:* high.

---

## 16. Response section at T:2212 — final response

### Item 45 — T:2218, "Compile-Time Immutable `RelayAct` Interface (§3)"

**Undertook** (T:2220-2237) `HLC` and `RelayAct` with `readonly` on every field and
`readonly to: readonly string[]`.

**Draft answers** at D:54-70 — the same two interfaces, every field `readonly`, `readonly to:
readonly string[]` at D:67, and the same trailing comments. I compared the two blocks field by field;
they differ only in the comment on `hlc` (*"Explicit immutable HLC tuple"* in both) and not at all in
substance.

**Verdict: LANDED.** *Force:* a type-level enforcement promised and delivered. The item's own point
was *"make the illegal state unrepresentable rather than forbidden in prose"* (T:2202), and the draft
carries it in the type where the compiler can see it.

*Confidence:* very high — this is a verbatim block match, the most exact in the census.

### Item 46 — T:2242, "Archival Summary of the 14-Round Review Record"

**Undertook** (T:2244-2249): *"This review thread produced four hardened subsystems **verified
against empirical corpus measurements**"*, then four numbered summaries — POSIX Transport Protocol;
Cryptographic Wire & Verification Layer; Causal Topology & Graph Adjudication; Epistemic Invariants &
Retractions.

**Draft answers**, partly, with a review record of a different shape:
- D:5-8 — *"**Origin:** Proposed in issue #5 and revised across sixteen review rounds between one
  proposer and one reviewer (`bee.claude`). Contest language across all fifteen replies: zero."*
- D:349-364 — *"What is imported"*.
- D:366-379 — *"What was withdrawn during review: Four reviewer findings did not survive"*, listing
  the `to`-out-of-body prescription, the byte-first claim, the recurring-pattern claim, and the
  convergence claim.
- D:381-384 — *"What this project has not decided"*.

So the draft carries an archival record of the review. It is not the record this item undertook. The
draft's record is of **what was withdrawn**; the item's was of **what was produced**. And on the
item's characterisation the draft is directly opposed: item 46 says the four subsystems were
*"verified against empirical corpus measurements"*, while D:3 says *"Not verified"* and D:7 says *"A
single-reviewer trajectory is not a verified one"*. The item's *"14-Round"* count is also at odds
with D:6's *"sixteen review rounds"* and *"fifteen replies"*.

**Nothing withdraws item 46 in writing.** It is the final numbered item of the final response; the
thread ends 20 lines later at T:2262. The contradiction comes from the draft, not from a later round,
and `PREDICATE.md` requires a *later response* for `SUPERSEDED`.

**Verdict: PARTIAL**, with the ambiguity named as `PREDICATE.md` (lines 62-65) directs. The
ambiguity is this: item 46 is the one item in the 46 that does not clearly state *a change to the
draft* — it summarises what the thread produced. Read as "the draft will carry an archival record of
this review", a record is there and the verdict is `PARTIAL` because the record's content differs.
Read as "the draft will carry this four-subsystem summary", nothing answers it and the verdict is
`NOT-LANDED`. I have not resolved that silently; I have taken the reading that credits the draft with
what it does carry, and named the alternative.

*Confidence:* high that the four-subsystem summary is absent and that the *"verified"*
characterisation is contradicted by the draft's own status line. Medium on `PARTIAL` over
`NOT-LANDED`, for the reason just given.

---

## 17. Tally

| verdict | count | items |
|---|---:|---|
| `LANDED` | 36 | 1, 2, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 20, 21, 23, 24, 25, 26, 27, 29, 30, 31, 32, 33, 34, 35, 36, 38, 39, 40, 41, 42, 43, 44, 45 |
| `LANDED-ALTERED` | 4 | 4, 19, 22, 37 |
| `SUPERSEDED` | 0 | — |
| `PARTIAL` | 6 | 3, 5, 6, 11, 28, 46 |
| `NOT-LANDED` | 0 | — |
| `UNDECIDABLE` | 0 | — |
| **total** | **46** | |

**Nothing was classified `SUPERSEDED`.** Every alteration I found was recorded by a later round that
also put something in the draft, which is `LANDED-ALTERED`; I found no case where a later response
withdrew an undertaking and left nothing behind. That is a finding about this thread, not a gap in
the instrument: the participants revised constantly and abandoned almost nothing outright.

**Nothing was classified `NOT-LANDED`.** No item of the 46 is wholly absent. But four items contain a
component that is wholly absent and unwithdrawn, which is what the `PARTIAL` verdicts record.

### The six `PARTIAL` items, and what is missing from each

| item | what landed | what did not | withdrawn? |
|---|---|---|---|
| **3** (T:234) | `consensus-v1` removed; *"a ruling is not a reading"* (D:252) | `AGGREGATED_FINDING` — the named record kind for what a procedure produces. Zero occurrences in the draft or any addendum; the `type` union at D:65 is unchanged from v0.1 | no |
| **5** (T:242) | the causal-order leg (D:20-22, D:124) | the **Arrival/Queue Order** leg. `arrival`, `queue`, `lexicograph`, `drain`, `worker` — zero hits across all seven input files | no |
| **6** (T:315) | rules 1 and 3, both bracketed (D:124, D:126) | rule 2's `MUST`: *"Consumers… MUST use a deterministic presentation convention"* arrives as D:129 *"A consumer needing a flat presentation deduplicates first, then sorts"* | no |
| **11** (T:570) | `ProjectThread(E) = Sort(DeduplicateByID(E), Comparator)` verbatim (D:132) | the `MUST`. *"Consumers MUST deduplicate…"* arrives as the same indicative sentence at D:129 | no |
| **28** (T:1455) | the state partition (D:278-285, D:301-318) | *"**[MUST NOT]:** Verifiers MUST NOT reject or discard a well-formed act solely because its causal link evaluates to `UNCHECKABLE`."* Arrives as D:294, a sentence about consequences | no |
| **46** (T:2242) | an archival record of the review, of different content (D:5-8, D:349-384) | the four-subsystem summary, and its *"verified against empirical corpus measurements"* framing — which D:3 and D:7 contradict | no (nothing follows it) |

### The four `LANDED-ALTERED` items, and where the alteration is recorded

| item | promised | draft carries | record of the change |
|---|---|---|---|
| **4** (T:238) | *"Total order… derived exclusively via topological sort"* | *"The causal graph is a **partial order**"* (D:21), `[MUST]` at D:124 | T:263-273; enacted by item 6 (T:316) |
| **19** (T:1031) | `parent_digest` = SHA-256 of *"the parent's **Canonical Act body**"* | *"SHA-256 of parent's **wire octets**"* (D:64) | T:1285-1290; enacted by item 24 (T:1345) |
| **22** (T:1237) | *"**All** cryptographic hashes MUST be computed over this JCS byte slice"* | JCS binds producers only (D:75); verifiers hash received octets, `[MUST NOT]` re-serialize (D:261-266) | T:1281-1290; enacted by item 24 |
| **37** (T:1816) | corner 2 handled by `throw new Error("UNANCHORED_CITATION…")` | `return "UNANCHORED";` (D:310); *"Evaluation is **total** — … none throws"* (D:321) | T:1909-1919; enacted by items 38, 39 |

---

## 18. On the method

Three things are worth reporting about how the reading went, since §4 said the method was the point.

**First — the warning in §4 was not hypothetical, and it fired three times.** Items 6, 11 and 28 each
undertook a `MUST` or `MUST NOT` and each arrives in the draft with its vocabulary complete. Item 11
is the sharpest case: the undertaking was *"Consumers MUST deduplicate the candidate record set by
`id` prior to executing the sorting comparator"*, and the draft has `DeduplicateByID`,
`ProjectThread`, `Comparator`, `id`, three sentences of argument for why dedup matters, and the exact
formula. Every noun matched. The one word that did not survive was `MUST`, and the sentence that
replaced it — *"A consumer needing a flat presentation deduplicates first, then sorts"* — describes a
practice rather than binding one. Any sweep by term presence scores that item a full match. Reading
the two sentences side by side scores it a rule that became prose.

**Second — item 28 is the one I would flag if I were flagging anything, and I am not permitted to, so
I will only describe what I found.** The `MUST NOT` that did not land is the clause that makes the
tri-state binding: without it, a verifier may reject an act whose parent it merely does not hold, and
nothing in the draft forbids it. The draft argues at length that such a verifier *"rejects correct
acts routinely"* (D:294) — it explains the consequence thoroughly and never prohibits the act. It is
also the only case in the census where the missing obligation has nowhere else to live: item 29's
indicative *"is rejected by the receiver"* is repaired by Stage 2's reject-list at D:269, and item
24's unmarked positive rule is repaired by the `[MUST NOT]` at D:264. Item 28's has no second home.
I checked Stage 2's list (D:268-270), all twelve bracketed markers, every occurrence of `UNCHECKABLE`
and of `reject` in all seven files, and all seven later response sections.

**Third — what surprised me was the shape of the misses, not their number.** Forty of forty-six
landed, most of them exactly, several of them strengthened beyond what was promised: item 23's
sealing rule arrived with a `[MUST]` it was not given, item 17's monotonicity claim arrived as a
`[MUST]` in the clock addendum, and item 41 arrived with all three of its obligations marked. The
draft is not careless about normative marking — it uses the convention twelve times, precisely. That
is exactly why the three unmarked cases are legible as omissions rather than as house style, and it
is why a fourth pattern shows up: **the two things that fell out cleanly (item 3's
`AGGREGATED_FINDING`, item 5's arrival-order leg) are both the *second half of a distinction*.** Each
undertaking promised to separate two things; the draft carries the half that had a section to live in
and drops the half that would have needed a new one. Neither was ever mentioned again by anyone. That
is the forgotten-not-withdrawn case `PREDICATE.md` was written to catch, and in this thread it took
the same shape twice.

**Recognition, restated.** I recognise the project the draft names. I did not consult it, and no
verdict above rests on anything but a quoted line from `input/`.
