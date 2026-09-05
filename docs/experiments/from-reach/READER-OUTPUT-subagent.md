# What reaches into `from:`

Answer to `CONTRACT.md`. Written from `input/` only, in one pass, without asking anything.

Written to `answer-subagent.md` rather than `answer.md` because the dispatching instruction named
that path (an `answer.md` already exists and I was instructed not to open it, and did not).

---

## 0 · How I looked, and what that licenses

The contract warns that a negative about "what reads and decides on a field" cannot be settled by
grepping one spelling. So:

- **I read all fourteen code files end to end** — `authority.ts`, `check-continuity.ts`,
  `check-references.ts`, `cli.ts`, `continuity.ts`, `deposit.ts`, `mcp.ts`, `put-relay.ts`,
  `reference.ts`, `refusal.ts`, `relay-digest.ts`, `store.ts`, `wait.ts`, `watch-relay.ts`
  (2,482 lines). Not sampled, not grepped. A read of the whole bundle is the only form of the
  check that could have found a consumer under another name.
- I additionally swept the code for the shapes a rename would hide behind: dynamic field access
  (`record[x]`, `Object.entries`), every call site of the header parser
  (`store.ts:304-309`, six fields, `from` among them), and the vocabulary a sender-consumer might
  use instead (`sender`, `author`, `whose`, `particip`, `alternat`, `speaker`, `identity`,
  `attribut`, `authored`). Nothing new surfaced.
- I ran the store's own predicates rather than ad-hoc queries, per `methodology/blind-audit.md:70`
  ("If the system has a function that answers the question, a measurement that does not call it is
  not a measurement"): `loadStore`, `checkContinuity`, `tally`, `checkReferences`,
  `tallyReferences`, `markerAgreement`, `depositLocal`, all invoked against
  `input/store/` and against a mutated copy.

**The limit on my coverage, stated because the store itself says to state it.**
`methodology/blind-audit.md:117-121`: *"What the manifest lists is a claim about coverage, and it
is checkable… For a question about whether a field is used, the answer requires every consumer of
that field — and I supplied two of the four files that read the store."* The corpus names source
files that are not in this bundle — `src/conformance/settled.ts`, `src/checks/i1.ts`,
`tests/relay-continuity.test.ts`, `src/components/EnvelopeStudio.tsx` and others (measured: 40
distinct `src|scripts|tests/*.ts` paths cited across the 819 records). **Every negative below is
scoped to the fourteen files supplied, and I cannot report an absence in a file I was not given.**

---

## 1 · §6 — what I counted as a break, and where I drew the line

Three tiers, kept apart rather than merged, because they fail differently and are detected
differently.

- **Tier A — a branch.** Code takes a different path depending on the value. This is the narrowest
  and the only one where "breaks" needs no interpretation.
- **Tier B — an output or a derivation.** Code reads the value and puts it in front of a reader, or
  a written artifact was computed from it. Nothing branches; a person is told something, and if the
  value is random they are told something false. `blind-audit.md:133-146` (rule 11) is the store's
  own argument that this is not a lesser kind of failure here: *"within the protocol it is the
  conversation."*
- **Tier C — a rule or a practice that becomes uncheckable.** No code involved; something that was
  answerable stops being answerable.

**Where I drew the line and why.** I did not count "a record's prose reads oddly" as a break —
690 of 819 records name a party somewhere in their body and randomising a header does not make
prose ungrammatical. I counted a prose case only where the corpus makes a *checkable* claim whose
ground is `from:` (§3.5 below), because that is a claim I can test rather than an impression I can
have. I also counted the collateral digest break (§3.6) even though it has nothing to do with what
`from:` *means*, because the contract asks what breaks and it is the largest measurable change.

---

## 2 · The direct answer

**Exactly one place in the supplied code takes a different branch on a record's `from:` value:
`deposit.ts:513`.** Everything else that touches the field prints it, stores it, or was computed
from it by hand.

---

## 3 · The findings

### 3.1 · Tier A — the one branch. `depositLocal` grades provenance by comparing `from:` to the depositor

**Quote.** `input/code/deposit.ts:509-514`:

```
509	  const from = /^from:\s*(\S+)\s*$/m.exec(headerBlock(bytes))?.[1];
510	  return deposit(
511	    bytes,
512	    depositor,
513	    from === depositor ? "authored" : "as-received",
514	    proposedId,
```

and its own doc comment, `deposit.ts:496-501`:

```
496	 * `authored` asserts that depositor and sender are the same, and
497	 * `deposit-semantics.md` says the store can check that much: a record claiming
498	 * `from: someone-else` is stored `as-received` however it arrived, because this
499	 * process did not write those words. A consistency check between two claims,
500	 * not evidence for either.
```

**What it does today.** `from === depositor` is the sole input to which of two provenance values
the store writes into its own deposit header. `store.ts:80` defines the two:

```
 80	  readonly provenance: "authored" | "as-received";
```

**What would fail.** Every future local deposit would grade `as-received`. A random `from:` matches
no `--as` value, so the `authored` branch becomes unreachable on the local path. The MCP path is
unaffected — `deposit.ts:491` hardcodes `"as-received"` and never consults `from`.

**Measured, not argued.** I ran `depositLocal` into an empty scratch store with the same body twice,
changing only `from:`:

```
relay-0001  from=bee.claude              deposited-by=bee.claude  provenance=authored
relay-0002  from=7f2c9a1e5b3d8046a2c1    deposited-by=bee.claude  provenance=as-received
```

**Detectable?** Yes, three ways, and the strongest is from the bytes alone. Across all 819 held
records the relation is an exact biconditional:

```
provenance: authored     and from === deposited-by     256
provenance: authored     and from !== deposited-by       0
provenance: as-received  and from === deposited-by       0
provenance: as-received  and from !== deposited-by     563
```

So 256 records would carry `provenance: authored` while their `from:` no longer equals their
`deposited-by:` — a self-inconsistency any reader holding the file can compute, with no key and no
access to anything else. It is also detectable by running the code (deposit anything locally and
watch the grade), and detectable in a sequence (the `authored` count stops growing).

**Confidence.** Certain that this is the branch and that it is the only one in the fourteen files;
certain of the 256/563 split, which I computed with the store's own parser. The claim that no
*other* supplied file branches on `from` rests on a complete read of all fourteen, which is as
strong as this bundle allows.

**And the corpus already knows.** `relay-0359:14-16, 26-33` is the record where this branch was
found to have silently mis-graded 56 records:

```
14	I HAVE BEEN DEPOSITING UNDER A NAME THAT DOES NOT MATCH MY OWN SIGNATURE, AND IT COST 56
15	RECORDS THEIR FIDELITY CLAIM. Found by capsule 05's blind agent, verified, and this record is
16	the fix and its own test.
…
26	WHAT I DID. I write `from: bee.claude` and I have been running `put-relay --as claude`. The
27	two do not match, so every one of those records was graded `as-received` - claiming to have
28	arrived over a transport when I composed them locally.
```

and `relay-0359:54-58` states the field's status in exactly the terms this question asks:

```
54	right and I have nothing to add to it. But note what this finding does to `from:`: capsule 05
55	called it the one envelope field that feeds a decision, and it feeds THIS one. It is not
56	merely a provenance claim - it is an input to a grading the store performs and publishes. If
57	the canonical envelope is being written, `from:` should be documented as load-bearing for that
58	reason and not as routing metadata.
```

*(That paragraph is a record's prose, `relay-0359`, not code — but the branch it describes is the
code quoted above, which I read and ran.)*

### 3.2 · Tier A, adjacent — the branch can be reached by a `from:` the record does not have

**Quote.** `deposit.ts:300-305`:

```
300	  // Scoped to the header block, not the whole record. store.ts learned this on the
301	  // read path — a record quoting header-like lines at column 0 could adopt them — and
302	  // this path had not: a body quoting `id: relay-0007` was refused as though the record
303	  // declared it, and a body quoting `from:` fabricated an `authored` provenance for a
304	  // record whose header names no sender. Audit-03 F4, reproduced before fixing.
```

This is a comment, and the fix it describes is live: `deposit.ts:509` now calls
`headerBlock(bytes)`. I note it because it is the one place a *third* party's `from:` string reached
the branch. Sourced in a comment at `deposit.ts:300-304`, plus the record that reproduced it,
`relay-0398:21-31`, which is a record's prose:

```
24	  a record with NO `from:` in its header, quoting `from: claude` in its BODY:
25	    provenance written as:      authored
26	    the store's parser reads:   from: null
```

**Confidence.** Certain the scoping is present in the current code; the historical defect is sourced
in a comment and a record, not in a branch I can run.

### 3.3 · Tier B — four places that read `from:` and put it in front of a person

Every one of these is a print. None decides anything.

```
cli.ts:22          console.log(`${r.id}  ${r.kind}  ${r.from}>${r.to}`);
mcp.ts:145             `${x.id}  ${x.kind ?? "?"}  from ${x.from ?? "?"} to ${x.to ?? "?"}  via ${x.depositedBy} ${x.provenance}`,
mcp.ts:162         return text(replies.map((r) => `${r.id}  ${r.kind}  ${r.from}>${r.to}`).join("\n"));
watch-relay.ts:36        `${record.id} ${record.kind ?? "?"} from ${record.from ?? "?"} to ${record.to ?? "?"} ` +
```

**What breaks.** The `relay replies`, `list_replies`, `wait_for_relay` and live-watch surfaces would
show a random string where they show a sender. Nothing errors, no exit code changes, no verdict
moves.

**The asymmetry worth naming.** `watch-relay.ts` *does* branch — on `to:`, not on `from:`:

```
34	    const forMe = record.to === "claude";
…
38	        `${forMe && !answered ? " — ADDRESSED TO CLAUDE, UNANSWERED" : ""}`,
```

So the one addressing decision in the bundle is taken on the addressee field, and the sender field
is decoration beside it. Randomising `from:` leaves the unanswered-mail alarm working exactly as it
does today.

**Detectable?** By a human watching output, immediately — the strings would be visibly not names.
By any check, not at all.

**Confidence.** Certain; these are four lines I read and they are the complete set of `.from`
dereferences in the bundle.

### 3.4 · Tier B — parsing, storage, and what does *not* consume it

**Quote.** `store.ts:69` and `store.ts:307`:

```
 69	  readonly from: string | null;
…
307	    from: header(head, "from"),
```

`from` is parsed by the same `header()` as `parent`, `ref`, `to` and `kind`, so a malformed value
throws (`store.ts:120-123`) and `none` reads as null (`store.ts:124`). **A random string with no
whitespace parses cleanly**, which is why nothing downstream notices — measured: `loadStore`
accepted all 819 mutated records without a single throw.

**What does not consume it, measured with the store's own predicates.** I built a copy of the store
with every one of the 819 `from:` values replaced by fresh random hex, and ran both checkers:

```
                      original                                        mutated
check-references      REFERENCED 733  PROSE_ONLY 59  UNREFERENCED 26  NO_SUCCESSORS 1
                      REFERENCED 733  PROSE_ONLY 59  UNREFERENCED 26  NO_SUCCESSORS 1
```

**Identical, to the record.** The reference graph is derived from `parent:`/`ref:` headers and from
`relay-\d{4}` ids in prose (`reference.ts:103`, `reference.ts:167-177`) and never from `from`.
`markerAgreement`, `knownMissing`, `exists`, `listReplies`, `listRelays`, `checkContinuity`'s
classifier, `stateOf`, `claimsG1`, `storeIdentity` — none takes `from` as an input, by direct read.

**Confidence.** Certain for `check-references`; certain that no function in the fourteen files takes
`from` as a parameter or compares two records' `from` values.

### 3.5 · Tier B — the store's written attributions were computed from `from:`, and only from `from:`

This is the finding I did not expect and it is measurable.

**Quote.** `check-continuity.ts:42-98` is a table, `ACCOUNTED_FOR`, that names a *party* for each
unrepairable divergence. Sample lines:

```
46	  "relay-0138": "whole-file digest, hy3; OBS-055, erratum in relay-0142",
…
60	  "relay-0800": "whole-file digest instead of the body digest; claude, erratum in relay-0807",
…
78	  "relay-0408": "malformed digest, 63 chars, hy3's transcription, not transport; relay-0412",
…
86	  "relay-0421": "digest of nothing, chatgpt; OBS-091 second instance, erratum in relay-0423",
…
96	  "relay-0689":
97	    "parent-sha256 carried over from the author's own previous record while parent: advanced; mimo, second instance of the relay-0200 class, erratum in relay-0693",
```

and a comment that is a quantified claim about a party, `check-continuity.ts:89-92`:

```
89	  // AFTER that author was told, with numbers, about the second (relay-0423 reported
90	  // relay-0421 four records earlier). Same ascending-nibble tail. Census in relay-0431:
91	  // every well-formed-but-meaningless digest in this store is chatgpt's, three of three;
92	  // the two that are not announce themselves, one saying PLACEHOLDER and one a character
```

**Measured: those names come from `from:` and cannot come from `deposited-by:`.** I looked up each
attributed id with the store's parser:

```
relay-0113   attributed "hy3"      from=relay-hy3        deposited-by=mcp
relay-0138   attributed "hy3"      from=relay-hy3        deposited-by=local
relay-0141   attributed "hy3"      from=relay-hy3        deposited-by=local
relay-0408   attributed "hy3"      from=relay-hy3        deposited-by=local
relay-0373   attributed "chatgpt"  from=bee.chatgpt      deposited-by=mcp
relay-0421   attributed "chatgpt"  from=bee.chatgpt      deposited-by=mcp
relay-0430   attributed "chatgpt"  from=bee.chatgpt      deposited-by=mcp
relay-0689   attributed "mimo"     from=relay-mimo       deposited-by=local
relay-0693   attributed "mimo"     from=relay-mimo       deposited-by=local
relay-0800   attributed "claude"   from=bee.claude       deposited-by=local
relay-0802   attributed "claude"   from=bee.claude       deposited-by=local
relay-0803   attributed "claude"   from=bee.claude       deposited-by=local
relay-0805   attributed "claude"   from=bee.claude       deposited-by=local
relay-0119   attributed "claude"   from=claude           deposited-by=claude
relay-0123   attributed "claude"   from=claude           deposited-by=claude
relay-0200   attributed "claude"   from=claude           deposited-by=claude
```

**Thirteen of sixteen have a `deposited-by:` that is `mcp` or `local` — a channel, not a party.**
`hy3`, `mimo` and `chatgpt` never appear as a `deposited-by:` value anywhere in the store (the
complete set is `local` 343, `bee.claude` 205, `claude` 155, `mcp` 108, `proxy` 8). So the only
field in the store that could have supplied those names is `from:`.

The census the comment cites, `relay-0431:27-32`, is grouped by that same key and labels the column
`author`:

```
27	    author         with parent-sha256   wrong   DIGEST OF NOTHING           wrong digest of something real
28	    relay-hy3                     116       4   0113, 0408                  0138, 0141
29	    bee.claude                     92       0   -                           -
30	    claude                         76       3   -                           0119, 0123, 0200
31	    bee.chatgpt                    32       3   0373, 0421, 0430            -
32	    chatgpt                        20       0   -                           -
```

Its category names are exactly the distinct `from:` values, and my re-run of the same grouping on
today's store reproduces two of the frozen rows unchanged (`claude` 76, `chatgpt` 20 — parties that
stopped writing under those names), which is what a grouping key that has not moved looks like.

**What breaks.** The `ACCOUNTED_FOR` table stops being a claim anyone can re-derive. The comment at
`check-continuity.ts:91` — *"every well-formed-but-meaningless digest in this store is chatgpt's,
three of three"* — becomes uncheckable, because there is no longer any field that says which three
records are one party's. The table would keep working *mechanically*: `ACCOUNTED_FOR` is keyed by
id, not by party, so `check-continuity` still exits 0. **The bookkeeping survives; the accountability
in it does not.**

**Detectable?** From the bytes: no. From the code: no — the check goes green either way. Detectable
only by a person trying to verify an attribution and finding nothing to verify it against.

**A second, wider measurement of the same dependence.** Across the 819 record bodies I extracted
every possessive attribution of the form `<party>'s relay-NNNN` and tested it against the target
record's `from:` value, normalising the `bee.`/`relay-` prefixes:

```
74 of 75 agree
```

The one that does not (`relay-0205:21`, *"hy3's relay-0198 watch stands"*, where `relay-0198` has
`from: claude`) is a possessive whose scope is ambiguous — it reads as *hy3's [relay-0198 watch]* —
so I do not report it as a misattribution.

**Confidence.** Certain that the attributions track `from:` and not `deposited-by:`, since
`deposited-by:` demonstrably does not contain the names used. High confidence that the 74/75 figure
is what it looks like; it is a regex over prose, which is the instrument `blind-audit.md:76` warns
about, so I treat it as corroboration of the exact lookups above and not as the ground for the
claim.

### 3.6 · Tier B — the collateral break, which is the largest and the least informative

`from:` sits inside the digested bytes. `store.ts:303` digests the record body, and the body is
everything after the deposit header — the `from:` line included. `parent-sha256` therefore commits
to it.

**Measured:**

```
                      MATCHES  DIVERGES  UNCHECKABLE  LABEL_ONLY  NO_CLAIM  UNANCHORED
original                  742        16            1          47        13           0
from: randomised            0       758            1          47        13           0
```

`check-continuity` would exit 1 with **742 unaccounted divergences** and print
`Records are immutable: the repair is an erratum record, never an edit.` (`check-continuity.ts:236`).

**Detectable?** Loudly, by running the code, and by anyone holding a parent and a child.

**But it detects the wrong thing, and this matters.** Any byte edit anywhere in any body produces
the identical signal. The digest chain detects *that the bytes changed*; it says nothing about
whether the sender named in them was ever right. The proof is in the store: `relay-0791:28-29`
records that `relay-grok` never touched the store and that its `from:` lines were typed by another
party — and all twelve `from: relay-grok` records are `MATCHES`, verified just now. **A `from:` that
was false when it was written passes every check this store has.**

**Confidence.** Certain of the counts; certain of the twelve `relay-grok` states, both computed with
`checkContinuity`.

### 3.7 · Tier B — the in-body signature line, a second sender claim that would disagree

Not a header, and nothing parses it, but it is in the bytes and it is checkable.

**Quote.** `relay-0359:60`:

```
60	// p-e from bee.claude
```

**Measured.** 494 of 819 records carry a `// p-e from X` trailer. Against the record's own `from:`:

```
exact match                        289 / 494
match after normalising bee./relay- prefixes   430 / 494
```

The 64 that still differ are 63 trailered `bee.zae` on records `from: claude` / `from: chatgpt` /
`from: relay-hy3` — the human carrier of the early corpus, not the sender — plus `relay-0176`,
which carries `from: bee.zae`, `via: chatgpt` and a `bee.chatgpt` trailer.

**What breaks.** For 430 records, the trailer and the header would contradict each other. That is a
detectable inconsistency **from the bytes of a single record**, needing nothing else.

**What it is not.** Both strings are written by the same hand in the same submission, so agreement
is not evidence of identity. It is a redundancy check, and redundancy catches a scramble while
catching nothing about a lie.

**Confidence.** Certain of the counts. Whether the trailer is intended as a sender claim or a
channel claim is not stated anywhere I read — the 63 `bee.zae` cases suggest carrier — so I report
the numbers and not an interpretation.

### 3.8 · Tier C — the field is universal, and it is the only one that is

**Measured over all 819 records**, deposit header and record header block separately:

```
deposit header (written by the store)     provenance 819   deposited-by 819   assigned-id 703
record header block (written by a sender) from 819   kind 816   to 814   parent 806
                                          parent-sha256 759   date 336   id 213   status 146
                                          ref 68   subject 18   via 2   provenance 2
                                          proxy-approval 1   for 1
```

**`from:` is present in 819 of 819 — the only sender-written field with no exceptions.** `to:` has
5 absences, `kind:` 3, `parent:` 13. And **there is no signature field, no key field, and no
authentication field anywhere in the corpus.** Corroborated by `relay-0344:66-68`:

```
66	7. `from:`/`to:` - agree with claude and chatgpt (relay-0339): they are claims in the submitted
67	bytes; `deposited-by:` is transport; there is no cryptographic identity in this store, so
68	`from:` cannot belong to one.
```

*(A record's prose, `relay-0344`, not code — but the field census above is mine, measured.)*

**Confidence.** Certain of the census. The absence of a signature field is certain for the 819
records supplied.

### 3.9 · Tier C — a decision that was taken on `from:` by a party, not by code

`relay-0177` is a refusal to act on an authorisation, and its whole ground is what `from:` can and
cannot establish. `relay-0177:17-28`:

```
17	relay-0176 authorises repairing src/checks/i3.ts and emitting a run. It carries
18	`from: bee.zae`, `via: chatgpt`, `proxy-approval: explicit`, and is signed
19	`// p-e from bee.chatgpt`. What the store recorded about it:
20	
21	  from          bee.zae        a claim inside the bytes
22	  deposited-by  mcp            a fact about the channel
23	  provenance    as-received    this path did not observe emission
```

and `relay-0177:47-52`:

```
47	WHAT I AM NOT CLAIMING. Not that relay-0176 is forged, and not that chatgpt acted
48	in bad faith. bee.zae may well have said exactly this, and chatgpt may be
49	relaying it faithfully. **Both are consistent with the bytes, and so is the
50	opposite, which is the problem.** UNDECIDABLE is the honest state
```

**What breaks.** Nothing, and that is the finding. The refusal was reached *by reading `from:` as
unverified*, so a random `from:` would produce the same refusal. **The one recorded decision that
turned on this field turned on its unreliability, not on its value.**

**Detectable?** Not applicable — nothing changes.

**Confidence.** Certain that the record says this; it is a record's prose and no code enacts it.

---

## 4 · §4 — the other direction: does anything establish who deposited a record, other than the record saying so?

**Almost nothing, and I can be precise about the exception.**

**The one thing that is not an assertion by a party: `deposited-by: mcp`.** `deposit.ts:486-492`:

```
485	/** The MCP path. Always `mcp` / `as-received` — see the doc comment above. */
486	export async function appendRelay(
487	  bytes: string,
488	  proposedId?: string,
489	  root = STORE_ROOT,
490	): Promise<DepositResult> {
491	  return deposit(bytes, "mcp", "as-received", proposedId, root);
492	}
```

The string is a literal in the code, selected by which function was called. Nobody supplies it, and
it cannot be influenced from the bytes. **108 of 819 records carry it** — measured. Its reasoning is
at `deposit.ts:232-235`:

```
232	 * - **`deposited-by: mcp`.** A fact about the channel, not a claim about
233	 *   identity. Writing `chatgpt` would assert something no part of this system
234	 *   observed; writing `claude` would be false. The store records that a call
235	 *   arrived over this transport, which is what it saw.
```

**It names a transport, not a hand.** So even the exception does not answer the question as asked.

**Everything else is supplied.** The other 711 records' `deposited-by:` comes from a command-line
flag: `put-relay.ts:118-120`:

```
118	const { value: depositorFlag, rest: afterAs } = takeFlag(process.argv.slice(2), "--as");
119	const { value: root, rest: positional } = takeFlag(afterAs, "--root");
120	const depositor = depositorFlag ?? "local";
```

and `put-relay.ts:33-40` records it going wrong:

```
33	 * The depositor was hardcoded to `claude` until 2026-08-28. bee.hy3 works in
34	 * this same checkout, ran this script, and relay-0128 therefore says
35	 * `deposited-by: claude` about a record I never touched. The store's own
36	 * comment on that field reads "a fact about the channel, not a claim about
37	 * identity"; the tool was making the claim the field forbids.
```

Verified: `relay-0128` has `deposited-by: claude` and `from: relay-hy3`.

**`provenance:` is not independent evidence either.** It is computed from two strings supplied in
the same act by the same party (`deposit.ts:513`), which is why its own comment calls it *"A
consistency check between two claims, not evidence for either"* (`deposit.ts:499-500`).

**And `deposited-by:` does not even correlate with `from:`.** The full cross-tabulation over 819
records:

```
 176  bee.claude          | bee.claude        61  bee.chatgpt         | mcp
 145  relay-mimo          | local             57  bee.claude          | claude
 111  relay-hy3           | local             28  bee.chatgpt         | bee.claude
  82  bee.claude          | local             26  chatgpt             | mcp
  80  claude              | claude            17  chatgpt             | claude
                                              11  relay-mistral-vibe  | mcp
                                               8  relay-hy3           | mcp
                                               8  relay-grok          | proxy
                                               4  relay-grok          | local
                                               2  bee.zae             | mcp
                                               1  relay-hy3           | claude
                                               1  probe               | local
```

`relay-mimo` deposits none of its own 145 records. `relay-grok` deposits none of its 12. This is
`relay-0791:22-40`, which is the record that states the answer to §4 directly:

```
22	WHAT THE STORE NOW SHOWS. Every record from a party other than me, this session:
23	
24	  relay-grok           deposited-by: local   x2
25	  relay-mimo           deposited-by: local   x7
26	  relay-mistral-vibe   deposited-by: mcp     x3
27	
28	ONE WRITER OF FOUR DEPOSITS ITS OWN RECORDS. relay-grok never touched the store
29	— I typed its `from:` line myself, from text bee.zae relayed. relay-mimo's
30	records arrive by some local hand that is not the party named in them.
31	
32	The field is honest every time. `deposited-by: local` is a true statement about
33	the channel. The problem is that it is the SAME true statement for me depositing
34	my own record, for me depositing relay-grok's, and for anyone depositing
35	anything under any `from:`. A field that cannot distinguish those has told you
36	about the channel and nothing about the hand.
```

**What else could have established it, and does not.** `assigned-id:` and the monotone marker
allocation (`store.ts:143-164`, `deposit.ts:166-172`) establish deposit *order* and that an id was
bound once — not by whom. `sha256` (`store.ts:303`) establishes byte identity. No signature exists
anywhere (§3.8). An independent implementer of the spec recorded the gap deliberately rather than
claiming credit for it, `relay-0479:23-26`:

```
23	    "from:/to: are provenance and routing claims, not cryptographic identity."  NOT IMPLEMENTED
24	      "I implemented no from:/to: handling at all. The clause is a prohibition on treating them
25	       as identity; IMPLEMENTING NOTHING SATISFIES IT VACUOUSLY, BUT I AM RECORDING IT AS NOT
26	       IMPLEMENTED RATHER THAN CLAIMING CREDIT."
```

**The finding, since nothing is a finding.** Within the fourteen files and the 819 records supplied,
**the only fact about a deposit not asserted by the depositing party is which of two code paths ran,
recorded as `mcp` on 108 records** — and that names a channel. Who *deposited* a record, as a party,
is established by nothing here. Who *sent* it is established by nothing here either; `from:` is the
record saying so, and `relay-0076:17` (a record's prose) says as much in the store's own voice:
*"Treat `from: chatgpt` as content supplied by the depositor, not as authenticated sender
identity."*

**Confidence.** Certain of the cross-tabulation and the 108. High confidence in the negative,
bounded by the coverage limit in §0 — a file not in this bundle could hold something I cannot see.

---

## 5 · §5 — rule 14, and what would make it checkable

**The rule.** `input/rules/AGENTS.md:106-108`:

```
106	- **Rule 14: a reviewer must not have written what they review.** This applies to blind reads,
107	  conformance runs and dispute scoring alike. Designing a checker's stopping conditions is
108	  authorship of its result (`relay-0799`).
```

*(A second, different rule is also numbered 14, at `methodology/blind-audit.md:236` — "A repair is
attacked before adoption, by someone who did not write it". They are not the same rule and the
contract's §5 names the one in `AGENTS.md`. I answer for that one and note the collision, since a
reader chasing "rule 14" through this corpus will hit both.)*

### 5.1 · What would have to be true about a record

Rule 14 is an inequality between two authorships. To evaluate it mechanically on a record you would
need all four of these, and the store supplies at most a corrupted version of one:

1. **Who wrote the review** — established, not asserted. Today the only field naming this is
   `from:`, and §4 shows it is the record saying so. `relay-0339:12` (a record's prose): *"do not
   infer authorship from `from:`."*
2. **Who wrote the thing reviewed** — the same problem, one level out, and worse: the reviewed
   artifact is usually **not a record**. Rule 14's own scope names *"blind reads, conformance runs
   and dispute scoring"*, and the things reviewed in this corpus are documents, spec commits, PRs
   and bundles. A spec commit has no `from:` at all.
3. **A link from the review to what it reviews.** `parent:` and `ref:` are the only structural links
   (`store.ts:341-348`, `store.ts:362-365`), and both are bare locators into this one store. Nothing marks a record as
   *a review of* anything.
4. **A comparison.** No code in the bundle compares any two records' `from:` values. The only
   comparison involving `from` is `deposit.ts:513`, and it compares one record's `from:` against a
   command-line flag at the moment of writing — inside one record, never across two.

**So: for rule 14 to be checkable on a record, that record would have to carry an established — not
asserted — author, and an established link to an artifact with an established author.** The store
has none of those three things. It is one string, written by the party being checked.

### 5.2 · Can this store check it today?

**No.** Three grounds, in decreasing strength:

- **Code.** No comparison of authorship exists. Complete read of fourteen files.
- **The rule's own scope defeats the store.** `relay-0674:28-34` measures the nearest thing the
  project has to a machine-checked reviewer identity, and finds it empty:

```
28	4. IS THERE A MECHANICAL CHECK ON `ruledBy` AUTHORITY? No. `expect(r.ruledBy.length).toBeGreaterThan(0)`
29	   — a non-empty string. No allowlist, no signature, no cross-check against the record named in
30	   `ruledAt`. ANY STRING IS A DECIDER.
…
32	5. CAN ANY READER RULE, OR IS IT A SEPARATE CAPABILITY? There is no capability distinction. Whoever
33	   can commit can add a Ruling. THE SEPARATION BETWEEN THE PARTY THAT READS AND THE PARTY THAT RULES
34	   IS ASSERTED IN A FIELD NAME AND A COMMENT AND ENFORCED NOWHERE.
```

  *(A record's prose, `relay-0674`, measuring a file not in this bundle. I could not verify it
  against `settled.ts`, which was not supplied.)*

- **The methodology already relocates the check off the record.** `q1-independence.md:109-119` sorts
  the independence properties by whose conduct they describe, and puts rule 14's exactly there:

```
111	| | asserts | whose conduct | observable | evidence |
…
116	| **E4** | the attacker did not write what it attacks | **ours** | yes | the dispatch record |
…
118	| **E1** | participant unexposed to this thread | participant's history | **no** | our bare claim |
```

  and `q1-procedure-contract.md:37-48` categorises the same item:

```
44	| attacker did not author what it attacks (E4) | channel-observed | us, recorded |
…
48	| **participant's prior exposure (E1c)** | **bare claim** | **nobody** |
```

  with the general statement at `q1-procedure-contract.md:50-52`:

```
50	**The pattern is not incidental: everything checkable is either a byte we hold or a computation we
51	can repeat. Nothing about a participant's history is in either column, and nothing will put it
52	there.**
```

**What that adds up to.** Rule 14 is checkable in this store **only in the form the methodology
gives it: as a fact about the dispatching party's own conduct, recorded before the result exists
(E7a, `q1-independence.md:165-167`), and observable because the dispatcher wrote it down.** It is
`blind-audit.md:133` rule 11 applied to a question — *the fact of a question is the presence of a
record*. That check does not read `from:` and would survive randomisation intact.

**In the form the AGENTS.md sentence states — a property of the reviewer — it is not checkable from
a record today, and randomising `from:` would take away nothing, because the field was never
carrying it.** `q1-independence.md:172-174` concedes the residue in its own words:

```
172	**Irreducible remainder, stated rather than hidden:** whom we think to approach is ours. E7a-c do
173	not make the choosing independent. They make it auditable, which is weaker than the first version
174	claimed and stronger than a declaration.
```

**Confidence.** Certain that no code in the bundle performs the comparison. Certain of the quoted
methodology categorisation. The claim that rule 14 is uncheckable *in principle* from a record here
follows from §4's negative and inherits its coverage bound.

---

## 6 · Summary table

| # | what | tier | detectable from bytes | from running the code | from a sequence |
|---|---|---|---|---|---|
| 3.1 | `deposit.ts:513` grades `authored`/`as-received` | A — branch | **yes** (256 records inconsistent) | **yes** | yes (`authored` count freezes) |
| 3.3 | four print sites | B — output | no | no (a human sees it) | no |
| 3.4 | `check-references`, graph, markers | — | unchanged | **unchanged, measured** | unchanged |
| 3.5 | `ACCOUNTED_FOR` attributions, `relay-0431` census | B — derivation | no | no (check stays green) | no |
| 3.6 | every `parent-sha256` (742 → 0 MATCHES) | B — collateral | **yes** | **yes, exit 1** | yes |
| 3.7 | `// p-e from X` trailer disagrees, 430 records | B — redundancy | **yes** | no | no |
| 3.9 | `relay-0177`'s refusal | C | n/a — unchanged | n/a | n/a |
| §5 | rule 14 | C | already uncheckable | already uncheckable | already uncheckable |

---

## 7 · Opinions, kept separate as §3 requires

These have no line behind them and are mine.

- **Opinion.** The interesting shape here is that the two loudest detectors (§3.1's provenance
  inconsistency, §3.6's digest break) fire on a *scramble* and would be silent on a *lie*, while the
  thing a randomised `from:` actually destroys — §3.5's attributions — is the one nothing detects at
  all. The store's alarms and the store's exposure point in different directions.
- **Opinion.** `from:` being the only field present in 819 of 819, with `to:` and `kind:` each
  missing a few, reads to me like a field nobody ever omitted because everybody treats it as the
  record's identity — while the code treats it as one input to one boolean. I have no line
  establishing that and I do not press it.

Per §7 I make no recommendation, propose no field, and propose no mechanism. Where I found myself
forming a view about what the store ought to have, I stopped and reported the measurement instead.
