/**
 * What this authority claims about G1, stated where a reader can check it.
 *
 * MUST 2: *"An authority MUST declare the seq from which it claims G1, and MUST
 * NOT claim G1 below it."* The clause binds an authority that claims G1. This
 * one does not, and until now nothing in `src/relay/` said so — the position was
 * prose in `issue-1` and invisible to anyone reading the code.
 *
 * ## Why this store claims nothing, which is not a decision made here
 *
 * `issue-1` settles it and this file only transcribes it. Measured, the store
 * does not satisfy MUST 1: `relay-0183` was bound, freed by deletion, and rebound
 * to different bytes. And 183 is above any floor legacy could plausibly declare —
 * ids run from 32 — so the reuse sits *inside* every candidate claim:
 *
 * > "Letting authority `relay` claim G1 from seq 32 with the violation at 183
 * > recorded inside the claim would be an exception, exercised, in a document
 * > that forbids them. And 183 ≥ 32, so the reuse sits *above* any floor legacy
 * > could plausibly declare: under the ban, a reuse anywhere means legacy cannot
 * > claim from 32 or from anywhere at all."
 *
 * The document's table is explicit — legacy `relay` **makes no G1 claim**, and
 * MUST 2 "exists for the third row… not a mechanism for excusing an authority
 * that cannot" claim. So the honest gap was never a missing floor. It was a
 * missing declaration of the absence of a claim.
 *
 * ## What this file does not do
 *
 * It does not detect the reuse. `relay-0183`'s first occupant is gone and the
 * store holds its second; that an id was rebound is established by the relay
 * record of it, not by anything derivable from the bytes on disk today. The
 * position is therefore **declared and grounded**, not computed — which is F3,
 * the standing UNDECIDABLE limit: a single authority's G1 claim is self-asserted
 * and not checkable by a reader who was not present for every allocation.
 *
 * Nor does it verify a future authority's floor. Checking that v1's rules hold
 * above a declared floor needs the ledger v1 does not have.
 */

/** An authority either claims G1 from some seq, or claims none. */
export type G1Claim =
  | { readonly claims: "none"; readonly because: string }
  | { readonly claims: "from"; readonly seq: number; readonly declaredAt: string };

/**
 * This store's declaration. Transcribed from `issue-1`'s *The legacy authority*,
 * which reasons it out and records the position in its own table.
 */
export const AUTHORITY: G1Claim = {
  claims: "none",
  because:
    "relay-0183 was bound, freed by deletion, and rebound to other bytes. Ids run from 32, so the reuse sits above any floor this authority could declare, and v1 forbids exceptions — a reuse anywhere means it cannot claim from 32 or from anywhere at all. issue-1, The legacy authority.",
};

/**
 * Does `claim` cover `seq`?
 *
 * The MUST NOT half of the clause, made mechanical: a claim never reaches below
 * its own floor, and a claim of none never reaches anything. This is the whole
 * of what the code can enforce — that a declared claim is not exceeded. Whether
 * the claim was *entitled* to be made is F3 and is not decidable here.
 */
export function claimsG1(claim: G1Claim, seq: number): boolean {
  return claim.claims === "from" && seq >= claim.seq;
}

/** The seq a claim starts from, or `undefined` where there is no claim. */
export function floorOf(claim: G1Claim): number | undefined {
  return claim.claims === "from" ? claim.seq : undefined;
}

/**
 * Who this authority is, as distinct from what it claims.
 *
 * The citation contract requires it and nothing supplies it. `issue-1`:
 *
 * > "crossing an authority or store boundary the citation MUST be `(store
 * > identity, locator, content digest)`, where *store identity* is the
 * > **configured** authority/store identifier (not a filesystem path)."
 *
 * Two words in that sentence do the work. **Configured** — so it is not derived
 * from where the files happen to sit, and a copy of this store under another path
 * is the same authority. And **not a filesystem path** — which rules out the one
 * thing that was available for free.
 *
 * ## Why this throws rather than defaulting
 *
 * A default would be a name I chose. `issue-1` says what this authority is not —
 * "**the legacy authority is the shared filesystem**, not any participant" — and
 * never what it is called, so there is nothing to transcribe the way
 * `AUTHORITY`'s grounds were transcribed. Picking one inside a mechanism is how a
 * decision gets hidden in a refactor, which this branch has spent a day
 * recording. So: configure it, or this refuses.
 *
 * Nothing calls it yet. It exists because keying records by `(authority, seq)` —
 * the Migration item, and what `relay-0699` measured as the real defect behind
 * "chain rather than a DAG" — needs something to put in the first slot, and there
 * was nothing.
 */
export function storeIdentity(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.P_E_STORE_IDENTITY?.trim();
  if (configured === undefined || configured === "") {
    throw new Error(
      "no store identity is configured. Set P_E_STORE_IDENTITY to this authority's identifier — " +
        "the citation contract requires one for any citation crossing a store boundary, and it must " +
        "be a configured name rather than a filesystem path. This refuses instead of inventing one.",
    );
  }
  if (configured.includes("/") && !configured.includes("://") && configured.startsWith("/")) {
    throw new Error(
      `store identity ${JSON.stringify(configured)} looks like a filesystem path. The contract says the identifier is not one: a copy of this store elsewhere is the same authority, and a path would make it a different one.`,
    );
  }
  return configured;
}
