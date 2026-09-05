/**
 * A refusal is not a finding, and the two must never share an exit code.
 *
 * `check-continuity` answers 1 when a record's declared parent digest is wrong.
 * That is a claim about somebody's record. Everything else these scripts can
 * fail on — an unreadable store, an unconfigured identity — is a fact about our
 * own access or our own configuration, and reporting it as 1 would be the
 * substitution the whole corpus exists to refuse, performed on the way out.
 *
 * ## Why this is a module rather than the same block twice
 *
 * It was the same block twice, and both copies arrived in one change. The first
 * round of review on PR #93 found `storeIdentity()` uncaught in
 * `check-references`; fixing it walked straight past `loadStore` on the line
 * above, which the second round then found — the same pattern, eight lines
 * apart, in the file being edited to fix it.
 *
 * The thing being duplicated is a CONTRACT: which number means which kind of
 * silence. `continuity.ts` already made this argument about `stateOf` — "a first
 * attempt returned UNCHECKABLE for parent: none ... Two callers, one function" —
 * and a drifted exit code is worse than a drifted state name, because CI reads
 * the number and nobody reads it twice.
 */

/** The store could not be read. Nothing is claimed about any record. */
export const REFUSED_UNREADABLE = 2;

/**
 * This store's identity is not configured, so no verdict can be scoped to an
 * authority. The records read fine; what is missing is whose they are.
 *
 * Distinct from `REFUSED_UNREADABLE` on purpose. Both mean nothing is claimed,
 * and they are different events — collapsing them is the same substitution one
 * level out.
 */
export const REFUSED_UNIDENTIFIED = 3;

/**
 * Print a refusal and leave, without ever looking like a finding.
 *
 * `closing` is the caller's because the scripts differ in what they were about
 * to produce — one claims nothing about records, the other produces no report at
 * all. What does not vary is that it says so: every call site's closing states
 * that this is not a finding, and that sentence is the module's whole subject.
 *
 * The cause is rendered with `instanceof` rather than a cast. A non-`Error`
 * reaching a `(error as Error).message` would throw inside the handler and die
 * unhandled with exit 1 — the exact outcome this function exists to prevent, so
 * the guarantee has to survive its own error path.
 *
 * Returns `never`: `process.exit` does not come back, and saying so lets a
 * caller assign to a `let` above the try without the compiler thinking it may
 * be unassigned afterwards.
 */
export function refuse(code: number, headline: string, cause: unknown, closing: string): never {
  console.error(`REFUSED: ${headline}`);
  console.error(`  ${cause instanceof Error ? cause.message : String(cause)}`);
  console.error(closing);
  process.exit(code);
}
