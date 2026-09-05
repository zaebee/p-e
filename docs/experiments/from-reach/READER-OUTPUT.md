# Contract Audit Report — what reaches into `from:`?

This audit investigates the usage and semantics of the `from:` header within the `p-e` record store under `input/`, examining what reads it, what decides on it, what assumes it is true, and the structural consequences of replacing every record's `from:` value with a unique, non-matching random string.

---

## §6 State your rule before you apply it

Before presenting the findings, we must declare the threshold of what we count as a "break." A "break" is defined as any of the following:

1. **Functional/Branch Deviation:** Code executing differently, raising an error, taking a different logical branch, or failing to assign the correct metadata attributes (e.g., classifying a locally generated record as `as-received` instead of `authored`).
2. **Information/Aesthetic Loss:** A human reader, reviewer, or downstream client being presented with unintelligible or uncorrelatable data, causing the destruction of historical context, authorship tracking, and peer correlation.
3. **Policy/Rule Uncheckability:** A governance, consensus, or protocol rule (specifically Rule 14 in `input/rules/AGENTS.md`) becoming uncheckable, unverifiable, or rendered trivially bypassable with zero detection.

We draw the line here because a record store is a socio-technical system. Its integrity depends not merely on the absence of syntax errors or crash-level throws, but on its ability to support clear provenance, allow human/agent audits of its data, and enforce its rules. Any change that makes valid operations register under incorrect states, hides the true authorship of records, or bypasses rules silently constitutes a fundamental break.

---

## §2 The question

**What breaks if every record's `from:` value is replaced by a random string, different for every record, matching nothing else anywhere?**

### Finding 1: Local Deposit Provenance Logic is Broken
* **Quote:**
  ```typescript
  export async function depositLocal(
    bytes: string,
    depositor: string,
    proposedId?: string,
    root = STORE_ROOT,
  ): Promise<DepositResult> {
    const from = /^from:\s*(\S+)\s*$/m.exec(headerBlock(bytes))?.[1];
    return deposit(
      bytes,
      depositor,
      from === depositor ? "authored" : "as-received",
      proposedId,
      root,
    );
  }
  ```
  *(sourced in code that runs at `input/code/deposit.ts:503-517`)*
* **Say what breaks:**
  * **What it does today:** Today, `depositLocal` parses the `from:` header of a record being deposited and compares it with the `depositor` parameter (passed from the `--as` CLI flag, defaulting to `"local"`). If they match, the store grades the record's provenance as `"authored"`. If they differ, it grades it `"as-received"`. This is also documented at `input/code/deposit.ts:499-501` (sourced in a comment, not in a branch): `"authored asserts that depositor and sender are the same... a record claiming from: someone-else is stored as-received"`.
  * **What fails to do under the change:** If every `from:` value is replaced by a unique random string, the comparison `from === depositor` will **never** evaluate to `true` (since the depositor identity cannot match the unique random string generated for the record). Consequently, every single record deposited locally will be graded with `provenance: "as-received"` instead of `"authored"`, even if the depositor was the true author.
* **Is the break detectable:**
  * **Yes, from the bytes on disk:** The store prepends a deposit metadata block to every file, writing the calculated provenance directly to the file's bytes as `provenance: as-received` instead of `provenance: authored` (sourced in code that runs at `input/code/deposit.ts:325`: `const record = 'deposited-by: ${depositedBy}\nprovenance: ${provenance}\nassigned-id: ${id}\n---\n${bytes.trimStart()}'`). This change is immediately visible upon opening any newly deposited record file.
  * **Yes, from human observations:** This deviation alters the core truth-claims of the store. As recorded in the prose of `input/store/relay-0359.txt:30-36` (sourced in a record's prose, not in code), changing `"authored"` to `"as-received"` is `"not a missing claim, it is a DIFFERENT claim. The store is telling readers that those bytes may differ from what I emitted, which is false and which I caused"`. This false grading would be immediately noticeable to any human auditor inspecting the repository.

### Finding 2: MCP Server Output and Information Display are Misleading
* **Quotes:**
  * Line 145:
    ```typescript
    `${x.id}  ${x.kind ?? "?"}  from ${x.from ?? "?"} to ${x.to ?? "?"}  via ${x.depositedBy} ${x.provenance}`,
    ```
    *(sourced in code that runs at `input/code/mcp.ts:145`)*
  * Line 162:
    ```typescript
    return text(replies.map((r) => `${r.id}  ${r.kind}  ${r.from}>${r.to}`).join("\n"));
    ```
    *(sourced in code that runs at `input/code/mcp.ts:162`)*
* **Say what breaks:**
  * **What it does today:** The MCP server reads and parses the `from` field of records to display who authored them and who they are addressed to when list-based or subscription-based tools are called.
  * **What fails to do under the change:** Under the change, the server will output unique random strings instead of identifiable, consistent author names (e.g., `bee.claude`, `chatgpt`). Human reviewers or automated agents querying the MCP server will lose all context regarding who authored what; the relational link between records authored by the same entity is obliterated.
* **Is the break detectable:**
  * **Yes, from running the code:** Any external tool, client, or developer calling the MCP server's `list_replies` or wait operations will immediately notice that the printed lines contain random gibberish strings for the `from` and `to` properties instead of consistent usernames.

### Finding 3: Watch-Relay CLI Output Displays Unintelligible Authorship
* **Quote:**
  ```typescript
  `${record.id} ${record.kind ?? "?"} from ${record.from ?? "?"} to ${record.to ?? "?"} ` +
    `via ${record.depositedBy} ${record.provenance}` +
  ```
  *(sourced in code that runs at `input/code/watch-relay.ts:36-37`)*
* **Say what breaks:**
  * **What it does today:** The script watches the store and prints a descriptive log of incoming records on stdout, displaying their authors (`from`), recipients (`to`), and provenance.
  * **What fails to do under the change:** It will log newly detected records with random strings for the author and an incorrect provenance of `"as-received"`.
* **Is the break detectable:**
  * **Yes, from running the code:** Running `bun run watch-relay` and appending a record will immediately output incorrect provenance and a randomized author string on stdout.

### Finding 4: Main CLI Tool Replies Output is Unintelligible
* **Quote:**
  ```typescript
  console.log(`${r.id}  ${r.kind}  ${r.from}>${r.to}`);
  ```
  *(sourced in code that runs at `input/code/cli.ts:22`)*
* **Say what breaks:**
  * **What it does today:** The `replies` command on the CLI outputs a list of records referencing a particular ID, mapping the sender and receiver.
  * **What fails to do under the change:** Under the change, it prints randomized strings instead of real sender and receiver names.
* **Is the break detectable:**
  * **Yes, from running the code:** Executing `bun run relay replies <id>` will output random strings instead of consistent identities on stdout.

### Finding 5: AGENTS.md Rule 14 is Rendered Completely Uncheckable
* **Quote:**
  ```
  - **Rule 14: a reviewer must not have written what they review.** This applies to blind reads,
    conformance runs and dispute scoring alike.
  ```
  *(sourced in a rule/comment at `input/rules/AGENTS.md:106-108`, not in code)*
* **Say what breaks:**
  * **What it does today:** Rule 14 governs peer review, ensuring that the reviewer (the author of the review record, i.e., its `from:` field) did not author the record being reviewed (the reviewed record's `from:` field).
  * **What fails to do under the change:** Because every record's `from:` header is replaced by a unique random string, the review record's `from:` and the parent/referenced record's `from:` will **never match**. A reviewer could review their own record (a direct violation of Rule 14), and any automated or manual verification would see two distinct random strings and conclude they are different people. The policy becomes completely uncheckable, and violations are silent and undetectable.
* **Is the break detectable:**
  * **No, from running the code / the bytes:** There is no programmatic check of Rule 14 in the codebase (inferred; nothing in `input/code/` references Rule 14).
  * **No, from the records:** Because the `from` fields are unique random strings, any manual or automatic comparison of `from` headers will show the author and reviewer are different, making the violation mathematically invisible. It would only be detectable if some external out-of-band information (such as private knowledge) revealed who actually wrote the records.

---

## §4 The other direction

**Does anything here establish who deposited a record, by some means other than the record saying so?**

**No.** Nothing in the codebase, store, or configuration establishes or authenticates who deposited a record. The `deposited-by:` field is merely an unauthenticated self-reported label or channel default, and the system lacks any cryptographic or signature-based authentication of depositors.

Our grounds for this finding are:
1. **CLI Flag is Arbitrary and Unverified:** Sourced in code that runs at `input/code/put-relay.ts:117-119`:
   ```typescript
   const { value: depositorFlag, rest: afterAs } = takeFlag(process.argv.slice(2), "--as");
   const { value: root, rest: positional } = takeFlag(afterAs, "--root");
   const depositor = depositorFlag ?? "local";
   ```
   The depositor identity is taken straight from process arguments and defaults to `"local"` if omitted. Anyone can pass any string.
2. **Deposit CLI Cannot Observe Identity:** Sourced in a comment in `input/code/put-relay.ts:27-37`, not in code:
   ```typescript
    * `--as` names who is running this. Without it the depositor is `local`, a fact
    * about the channel — a record was written from a shell on this machine — in the
    * same way the MCP path records `mcp`. It is not an identity claim, because this
    * script cannot observe one.
    *
    * The depositor was hardcoded to `claude` until 2026-08-28. bee.hy3 works in
    * this same checkout, ran this script, and relay-0128 therefore says
    * `deposited-by: claude` about a record I never touched.
   ```
   This confirms that the script cannot verify depositor identity and previously recorded incorrect data due to hardcoding.
3. **MCP Path is Unauthenticated and Unverifiable:** Sourced in a comment in `input/code/mcp.ts:55-58`, not in code:
   ```typescript
         "Append one record. Never overwrites: a proposed id already held is refused. Stored as provenance: as-received and deposited-by: mcp, because this path cannot observe emission and cannot authenticate its caller — those are facts about the channel, not claims about who wrote the bytes."
   ```
   Sourced in a comment in `input/code/deposit.ts:228-231`, not in code:
   ```typescript
    * - **`provenance: as-received`, always.** This path cannot observe emission. A
    *   caller reaching it through MCP is unauthenticated, so `authored` — which
    *   asserts depositor and sender are one — cannot be established here, and
    *   `claim-matrix-v2.md` marks that row unverifiable.
   ```
   These clarify that the MCP transport does not authenticate or identify callers.
4. **Current Store Lacks Attribution (No Signatures):**
   * Sourced in a record's prose, `input/store/relay-0265.txt:33`, not in code:
     ```
     the store is UNATTRIBUTED (deposited-by = channel, not identity), so an `authority` value is the depositor speaking about itself - predicate B, unauthenticated. v1 MAY carry `authority` as a label and MUST state it is unauthenticated. authenticated identity enters ONLY with signatures, which is layer 3 Transparency; v1 does not smuggle it in.
     ```
   * Sourced in a record's prose, `input/store/relay-0263.txt:57-61`, not in code:
     ```
     record R deposited-by local (channel); later the authority asserts or disowns R. the store's deposited-by is channel, not identity (claude's UNATTRIBUTED), so it cannot bind R to the authority post-hoc. ... records are UNATTRIBUTED; the authority's claim over them is self-reported, not store-verified. attribution (signatures) is deferred to layer 3.
     ```
   * Sourced in a record's prose, `input/store/relay-0203.txt:46`, not in code:
     ```
     no replicas, no quorum, no consensus and no signatures.
     ```
   * Sourced in a record's prose, `input/store/relay-0110.txt:40`, not in code:
     ```
     cryptographically signed as relay-hy3 - the channel cannot authenticate
     ```
     These confirm that the store is completely unattributed and unauthenticated at this layer.
5. **Git Tracking is Unreliable/Vulnerable to Wildcards:** Sourced in a comment/rule in `input/rules/AGENTS.md:104-105`, not in code:
   ```
   Two commits have carried another agent's record under a message describing it as mine because of a wildcard.
   ```
   This highlights that git commit records cannot be relied upon to establish who wrote or deposited a record.

---

## §5 A rule this store states about its own reviews

Rule 14 in `input/rules/AGENTS.md` is:
```
- **Rule 14: a reviewer must not have written what they review.** This applies to blind reads,
  conformance runs and dispute scoring alike. Designing a checker's stopping conditions is
  authorship of its result (`relay-0799`).
```
*(sourced in a rule/comment at `input/rules/AGENTS.md:106-108`, not in code)*

### 1. What would have to be true about a record for Rule 14 to be checkable?
To verify Rule 14, the following conditions must hold:
* **Reviewer Identification:** Every review or auditing action must be linked to a record that reliably declares who is acting as the reviewer (e.g., via the review record's `from:` header).
* **Author Identification:** Every record being reviewed must reliably declare who authored it (e.g., via the reviewed record's `from:` header).
* **Linkage:** The review record must carry a pointer or reference (e.g., via `parent:` or `ref:`) to the reviewed record to establish the reviewed relationship.
* **Record Presence:** Both the review record and the reviewed record must be present and readable within the store (or the authority must have access to their author profiles). If a reviewed record is missing or belongs to a foreign authority, its author is uncheckable (sourced in a comment in `input/code/continuity.ts:98-102`, not in code: `"Resolution below is a lookup in one map... a locator that names another authority's record does not resolve here and reports UNCHECKABLE"`).
* **Consistent, Enforced Naming Scheme:** The identifiers used for author and reviewer must belong to a consistent namespace. If participants can arbitrarily change their name (as documented in `input/store/relay-0359.txt:33-35`, sourced in a record's prose, not in code: `"I write from: bee.claude and I have been running put-relay --as claude. The two do not match"`) or use aliases, matches cannot be validated.
* **Authentication/Non-Repudiation:** There must be a cryptographically verifiable binding (such as signatures) between the record and its claimed author/reviewer to prevent evasion or impersonation (as documented in `input/store/relay-0265.txt:33` and `input/store/relay-0263.txt:59`, v1 of the store is unauthenticated and unattributed, meaning anyone can write any name in the `from:` or `deposited-by:` fields).

### 2. Can this store check it today?
**No.**
* **No programmatic checks:** The codebase (all files under `input/code/`) contains absolutely no programmatic implementation, tracking, or enforcement of Rule 14 (inferred; nothing in `input/code/` references Rule 14).
* **No conceptual checkability/verification:** Because the store is completely unauthenticated and unattributed (as established in `input/store/relay-0265.txt:33` and `input/store/relay-0263.txt:59`), any reviewer could review their own work by simply submitting the review record under a different `from:` name, or depositing it under a different name. The store cannot detect such violations because it does not verify the identity of the submitter or author of a record.
* **General limitation on participant history:** As stated in `input/methodology/q1-procedure-contract.md:57-58` (sourced in a document, not in code):
  ```
  The pattern is not incidental: everything checkable is either a byte we hold or a computation we
  can repeat. Nothing about a participant's history is in either column, and nothing will put it
  there.
  ```
  Since the participant's actual physical authorship/history is a "bare claim" (documented as `"bare claim / nobody"` in the table at `input/methodology/q1-procedure-contract.md:52`), it is inherently uncheckable by the store itself today.

---

## §8 Confidence

* **Confidence on Finding 1 (Local Deposit Provenance Logic is Broken):** 100% sure that the comparison `from === depositor` in `depositLocal` (line 513 of `deposit.ts`) will never succeed, forcing all newly deposited local records to carry `provenance: as-received` rather than `provenance: authored`.
* **Confidence on Finding 2 (MCP Server Output):** 100% sure that the MCP server's outputs for lists and replies (lines 145 and 162 of `mcp.ts`) will display unique random strings for the `from` property, destroying human readability and correlation.
* **Confidence on Finding 3 (Watch-Relay CLI Output):** 100% sure that the printed log of the watch CLI (lines 36-37 of `watch-relay.ts`) will display randomized author names and incorrect provenance.
* **Confidence on Finding 4 (Main CLI Output):** 100% sure that the `replies` CLI output (line 22 of `cli.ts`) will display unique random strings instead of consistent identities.
* **Confidence on Finding 5 (Rule 14 Rendered Uncheckable):** 100% sure that Rule 14 becomes checkable only under consistent and authenticated authorship schemes, and that replacing `from:` with unique random strings renders it completely uncheckable and bypassable.
* **Confidence on §4 (No other means of establishing depositor):** 100% sure that there is no mechanism whatsoever in the codebase or rules that establishes depositor identity independently of self-reporting, as the store is explicitly designed to be unattributed and unauthenticated in v1.
* **Confidence on §5 (Store checkability of Rule 14 today):** 100% sure that the store has no code to enforce Rule 14 today, and that the lack of cryptographic signatures makes it conceptually unverifiable.
