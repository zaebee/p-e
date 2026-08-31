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
