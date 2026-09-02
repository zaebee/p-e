/**
 * The alphabet a delivery name is written in.
 *
 * §2.1 gives the name a grammar —
 * `to=<agent>;from=<agent>;thread=<thread_id>;ttl=<seconds>;id=<uuidv7>.json`
 * — and never an alphabet, which leaves the two things that string has to be
 * unguarded. It is a delimited record, so a value containing `;` or `=` adds a
 * field; and it is a POSIX filename, so a value containing `/` moves the file.
 *
 * Lives here rather than in `act.ts` or `cns.ts` because both need exactly the
 * same answer. Minting validates what it seals, formatting validates the
 * recipient it is handed — which minting never saw — and parsing validates what
 * it reads off a disk nobody in this process wrote. One copy, so the three
 * cannot drift into disagreeing about what a name may contain.
 *
 * `assertNameable` takes `unknown` rather than `string` because every one of
 * its callers is guarding a value that came from somewhere else — a caller's
 * argument, an act off the wire, a filename off a disk. Declaring `string` made
 * the `typeof` check inside look redundant while the whole reason for the check
 * is that the type is a claim rather than a fact.
 *
 * See issue #35. Widening this set is a deliberate act: every character admitted
 * has to be inert in §2.1's grammar and safe in a filename on every platform
 * that will hold the store.
 */

/** Letters, digits, and the punctuation this corpus's identities already use. */
export const NAMEABLE = /^[A-Za-z0-9._:@-]+$/;

export function isNameable(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && NAMEABLE.test(value);
}

export function assertNameable(value: unknown, what: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${what} must be a non-empty string, got ${JSON.stringify(value)}`);
  }
  if (!NAMEABLE.test(value)) {
    throw new Error(
      `${what} may only contain letters, digits and ._:@- , got ${JSON.stringify(value)}`,
    );
  }
}
