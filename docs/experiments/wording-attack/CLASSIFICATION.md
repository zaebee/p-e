# The 15 findings, classified

Per chatgpt's instruction: classify before repairing, so the result is not "15 problems"
but a picture of which kinds of hole this drafting produces.

Four types, as given: **contradiction** — two MUSTs require incompatible behaviour;
**ambiguity** — two admissible readings produce different behaviour; **implementation
leakage** — wording ties the protocol to one store; **proposal dependency** — a resolution
with a single source, not yet an independent result.

Findings are assigned by their **root**, not their symptom. Several present as ambiguity
and are caused by something else; where that is so, the symptom is noted in brackets.

## Contradiction — 2

| | |
|---|---|
| **10.1 × 10.4** | Verification "on every read" against a class that "cannot acquire" a recorded digest. Flat, and the draft half-knows it: 10.4 delegates the contradiction rather than repairing it. Finding 10 is the survivable half — the draft constrains that the store *define* something, never what. |
| **9.3 × a store's 10.3 policy** | Conditional, not flat. A record both invalid UTF-8 and digest-disagreeing is obliged to proceed by a permitted 10.3 policy and not to proceed by 9.3. The draft permits the policy that creates the collision without saying 9.3 overrides. Finding 14. |

The second exists **because** 10.3 is open. An undefined verdict is not inert: it is a hole
other clauses can contradict.

## Implementation leakage — 2

| | |
|---|---|
| **Where a record ends** (finding 4) | The start is grammar (`@p-e/x0`); the end is "its last octet", circular. It is answerable only in a store that holds one record per file — ours. The delimiter sentence I wrote to *remove* leakage put the extent in the store's hands instead. Composes into finding 11 and finding 5. |
| **What "read" and "candidate" denote** (findings 5, 8) | Both are defined by what our store does, not by the protocol. "Candidate" splits on whether framing is stripped; "read" splits on whether a listing counts — and a listing is a store operation, not a protocol one. |

Both are the same error: **I removed the field names and the delimiter and left the
protocol depending on the shape of the object anyway.** Naming fewer implementation details
is not the same as depending on none.

## Ambiguity — 11

Grouped by cause, because they are not eleven independent problems.

**Undefined terms doing load-bearing work — 6.** `envelope` (3), `binding` (7, and composed
into 11, 12, 15), `valid UTF-8` (6), `refuse` (its form is unspecified — silent drop and
typed error are both conformant), `content identity`, `digest domain`. The rules turn on
words the draft never fixes.

**One word in two senses — 3.** `id` as allocated identity and as declared content (2, 15);
`record` as the wire object that arrived and the object the store reconstructs (4, 5);
`metadata` as receipt-metadata and as store-metadata generally.

**Rules with no stated consequence — 2.** 9.2 in full, and the MUST 3 amendment's derivation
rule. Contrast 9.1 and 9.3, which say "MUST be refused". Worse, the amendment's rule may have
no observable test at all: a store cannot detect that a submitted id was computed from bytes.

## Proposal dependency — 1

**Two-phase reservation/commit.** chatgpt relay-0434, restated by me in 0441, restated by
chatgpt in its architecture note as "a real architectural conclusion from the experiment".
One origin, three appearances, no independent result. hy3 has not addressed it.

For contrast, what a non-dependency looks like: **octets rather than decoded text** was
reached by the Q1 attacker from the spec and code, reproduced independently by hy3 against
the source, and reproduced again here against `src/`. Three parties, three methods.

## What the shape says

Two counts matter more than the total.

**Eleven of fifteen are ambiguity, and nine of those eleven reduce to terms.** Undefined
words, or one word in two senses. The draft legislates confidently about objects it never
defines — `envelope`, `binding`, `read`, `candidate`, `record`. This is not fifteen problems;
it is one habit, visible fifteen times.

**Every composed finding (11–15) has a local root above it.** 11 and 12 are the extent
leakage; 13 and 14 are the ordering the draft never states; 15 is finding 2 from the timing
side. The composition constraint did not find a new *class* of hole — it found where the
existing holes become observable. That is worth knowing about the method: composed attacks
surface consequences, local attacks surface causes, and repairing causes should be expected
to close composed findings without addressing them individually.

**And the one contradiction that is conditional exists because a verdict is open.** Leaving
10.3 undefined was deliberate and correct; the finding is that an open verdict must be
*declared open in a way other clauses can see*, or a neighbouring MUST will contradict the
policies it permits.

## What this does not classify

10.3 itself. It is not a defect in the draft — it is the question the draft declines to
answer, marked as such. It stays open, as do Q8b and the two-phase proposal.
