import type { RelayRecord } from "./store.js";

/**
 * Check what each record claims about its parent's bytes, and change nothing.
 *
 * `parent-sha256` is the store's only continuity claim, and it is the one field
 * a stranger can settle without a key: it names bytes rather than a label. It is
 * also unenforced — the store accepts any value, including `PLACEHOLDER`. This
 * module reads.
 *
 * It deliberately does not refuse a deposit. A record may name a parent the
 * depositor does not hold, and records arrive out of order, so a store that
 * rejected an unverifiable claim would reject legitimate ones. Whether the
 * deposit path should ever refuse is a protocol change, not a reading.
 */

/**
 * Six states, and the two that look alike are the point.
 *
 *   MATCHES      the declared digest is the parent's store digest
 *   DIVERGES     both are known and they differ — a defect in the record
 *   UNCHECKABLE  a digest is claimed for a parent whose bytes are not held.
 *                A fact about this store's access, not about the record: the
 *                author may have computed it perfectly. Folding this into
 *                DIVERGES would report our own missing bytes as someone else's
 *                error, which is the substitution I-1 exists to refuse.
 *   LABEL_ONLY   a parent is named and nothing binds it to bytes. Not a defect
 *                — but a claim about a label, which the store itself assigns,
 *                and therefore not the claim `parent-sha256` was added to make.
 *   NO_CLAIM     the record names no predecessor
 *   UNANCHORED   a digest is claimed and no parent is named, so nothing says
 *                whose bytes it is. No record in the live store does this; the
 *                state exists because representable-and-unexercised and
 *                unrepresentable are different, which is the same distinction
 *                one level up.
 *
 * UNCHECKABLE IS NOT OURS AND IS NOT NEW, and the next reader should not have to
 * discover that the way I did. It is SMT-LIB's `unknown`: a solver that cannot
 * decide answers `unknown`, never `unsat`, because failing to prove a thing false
 * is not proving it true. Three-valued outcomes are canon in verification and
 * predate this project entirely — recorded in relay-0731, with relay-0732 as the
 * erratum for having treated the distinction as something found here.
 *
 * What is ours is only which six situations a citation in THIS store falls into,
 * and two blind readers given the data model and no state names returned nine and
 * eight rather than six (docs/experiments/citation-set). So the partition below is
 * this store's, not a law.
 */
export type Continuity =
  | "MATCHES"
  | "DIVERGES"
  | "UNCHECKABLE"
  | "LABEL_ONLY"
  | "NO_CLAIM"
  | "UNANCHORED";

export interface ContinuityFinding {
  /**
   * The authority this record and its parent were both resolved within.
   *
   * `parent:` is a bare locator, and issue-1 makes a within-store citation the
   * pair `(locator, digest)` — sufficient only "within one identified store".
   * Resolution below is a lookup in one map, so it is already scoped to one
   * authority; carrying the name says which, so a finding cannot be read as a
   * verdict about `relay-NNNN` anywhere.
   *
   * This does NOT detect a foreign parent. ADR-2 settles that: a bare locator
   * carries no authority, so `is_parent_foreign` is not computable before
   * reading the parent, and a store that guessed would refuse legitimate
   * references. The name is recorded, never inferred.
   */
  readonly authority: string;
  readonly id: string;
  readonly parent: string | null;
  /** What the record says its parent's bytes digest to. */
  readonly declared: string | null;
  /** What they actually digest to, or null where there was nothing to compute. */
  readonly actual: string | null;
  readonly state: Continuity;
}

/**
 * The six states, from the three facts that decide them.
 *
 * Exported because the deposit path needs the same classification and
 * reimplementing it there drifted immediately: a first attempt returned
 * `UNCHECKABLE` for `parent: none` — reporting a missing parent as one we do not
 * hold, which is the substitution this vocabulary exists to refuse — and
 * collapsed `LABEL_ONLY` into `NO_CLAIM`. Two callers, one function.
 */
export function stateOf(
  parent: string | null,
  declared: string | null,
  actual: string | null,
): Continuity {
  if (declared === null) return parent === null ? "NO_CLAIM" : "LABEL_ONLY";
  if (parent === null) return "UNANCHORED";
  if (actual === null) return "UNCHECKABLE";
  return declared === actual ? "MATCHES" : "DIVERGES";
}

/**
 * One finding per record held, in id order. Never omits a record.
 *
 * `authority` is the store identity these records belong to — supplied, never
 * derived from the path, because "a copy of this store under another path is the
 * same authority" (issue-1, via `authority.ts`). Every record in one store has
 * one authority today, so naming it changes no verdict; what it changes is that
 * a caller merging two stores' findings has to say which authority the merged
 * list is about, instead of producing a list of bare ids that reads as global.
 */
export function checkContinuity(
  store: ReadonlyMap<string, RelayRecord>,
  authority: string,
): ContinuityFinding[] {
  return [...store.values()]
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((r) => {
      // Resolved within this authority alone. The map holds one store, so a
      // locator that names another authority's record does not resolve here and
      // reports UNCHECKABLE — "a fact about this store's access" — which is the
      // honest answer and the one ADR-2 leaves available.
      const actual = r.parent === null ? null : (store.get(r.parent)?.sha256 ?? null);
      return {
        authority,
        id: r.id,
        parent: r.parent,
        declared: r.parentSha256,
        actual,
        state: stateOf(r.parent, r.parentSha256, actual),
      };
    });
}

/**
 * Counts per state, with every state present.
 *
 * A state nobody exercises reads as `0` rather than being absent from the
 * object. An absent key and a zero would answer "does this happen here" with
 * the same silence, and they are different answers.
 */
export function tally(findings: readonly ContinuityFinding[]): Record<Continuity, number> {
  const counts: Record<Continuity, number> = {
    MATCHES: 0,
    DIVERGES: 0,
    UNCHECKABLE: 0,
    LABEL_ONLY: 0,
    NO_CLAIM: 0,
    UNANCHORED: 0,
  };
  for (const f of findings) counts[f.state]++;
  return counts;
}
