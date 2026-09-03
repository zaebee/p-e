/**
 * The alphabets a delivery name is written in.
 *
 * §2.1 gives the name a grammar —
 * `to=<agent>;from=<agent>;thread=<thread_id>;ttl=<seconds>;id=<uuidv7>.json`
 * — and never an alphabet, which leaves the two things that string has to be
 * unguarded. It is a delimited record, so a value containing `;` or `=` adds a
 * field; and it is a POSIX filename, so a value containing `/` moves the file.
 *
 * The alphabet is now settled, in `docs/specs/relay-lite-v0.12-addendum-identifiers.md`
 * against issue #35. This file implements that document and nothing else; where
 * the two disagree the document is right and this is a bug.
 *
 * TWO ALPHABETS, NOT ONE. An earlier version of this file had a single
 * predicate for both positions. The addendum separates them: `:` and `@` are
 * admitted in an agent, where `agent:claude-code` is the protocol's own example
 * from v0.1, and excluded from a thread id, where nothing has ever used them and
 * a narrower set is free. Keeping one predicate would have widened the thread
 * alphabet to pay for the agent's.
 *
 * Lives here rather than in `act.ts` or `cns.ts` because both need exactly the
 * same answer. Minting validates what it seals, formatting validates the
 * recipient it is handed — which minting never saw — and parsing validates what
 * it reads off a disk nobody in this process wrote. One copy per position, so
 * the three cannot drift into disagreeing about what a name may contain.
 *
 * The assert forms take `unknown` rather than `string` because every one of
 * their callers is guarding a value that came from somewhere else — a caller's
 * argument, an act off the wire, a filename off a disk. Declaring `string` made
 * the `typeof` check inside look redundant while the whole reason for the check
 * is that the type is a claim rather than a fact.
 *
 * ON THE LENGTHS. 48 and 64 are not round numbers chosen for looks. `NAME_MAX`
 * is 255; the assembled name spends 31 bytes on fixed structure, 36 on the
 * UUID and up to 10 on the seconds, leaving 178 for two agents and a thread.
 * `48 + 48 + 64 = 160` fits with room. The addendum shows the arithmetic and the
 * filesystem refusing a name built to the wider limits that were proposed first.
 *
 * ON `.` AND `..`. Neither is excluded by a rule. Both are impossible because
 * the first character must be `[a-z0-9]`, and that is worth knowing here: a
 * special case for them added below would be a sign of having misread the
 * grammar, not extra safety.
 */

/**
 * An agent identity. `:` and `@` are admitted; see the addendum §5 for why the
 * case against `:` was declined, and note that the reason is cost rather than
 * the impossibility of a Windows port, which an earlier draft overstated.
 */
export const AGENT = /^[a-z0-9][a-z0-9._:@-]{0,47}$/;

/** A thread id. No `:` and no `@` — nothing has ever used them here. */
export const THREAD = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export function isAgent(value: unknown): value is string {
  return typeof value === "string" && AGENT.test(value);
}

export function isThread(value: unknown): value is string {
  return typeof value === "string" && THREAD.test(value);
}

/**
 * Shared so the two asserts cannot drift in what they report. The alphabet is
 * spelled into the message rather than the pattern printed, because a caller
 * reading `may only contain a-z, 0-9 and ._:@-` can act on it and a caller
 * reading a regexp source has to parse one first.
 */
/**
 * Render a rejected value for its error message without becoming a second
 * failure. Everything here is reachable: `mint` takes a caller's object, and a
 * validator that throws the wrong error while explaining a rejection tells the
 * caller nothing about what it actually refused.
 *
 *   JSON.stringify(10n)                     throws TypeError
 *   JSON.stringify(Symbol())                undefined
 *   JSON.stringify(() => {})                undefined
 *   String(Object.create(null))             throws TypeError
 *   String({ toString() { throw … } })      throws
 *
 * So `JSON.stringify` alone crashes on a BigInt and flattens a Symbol, a
 * function and `undefined` into one indistinguishable "undefined"; `String`
 * alone — the fix first proposed in review — handles those and still throws on
 * a null-prototype object, which is an ordinary way to build a dictionary.
 *
 * A string is shown with `JSON.stringify`, which is where it is informative:
 * `""` is legible and `"  "` shows its spaces. Anything else is named by type
 * first, so the three values that stringify to nothing stay distinguishable.
 */
function describe(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  try {
    return `${typeof value} ${String(value)}`;
  } catch {
    return typeof value;
  }
}

function assertAgainst(
  value: unknown,
  what: string,
  re: RegExp,
  alphabet: string,
  max: number,
): asserts value is string {
  if (typeof value !== "string" || value === "") {
    throw new Error(`${what} must be a non-empty string, got ${describe(value)}`);
  }
  if (!re.test(value)) {
    // Length is reported separately because it is the one failure whose cause
    // is not visible in the value, and the caller's next move differs: a bad
    // character is a mistake, an over-long name is a limit.
    if (value.length > max) {
      throw new Error(`${what} may be at most ${max} characters, got ${value.length}`);
    }
    throw new Error(
      `${what} must start with a-z or 0-9 and may only contain ${alphabet}, ` +
        `got ${JSON.stringify(value)}`,
    );
  }
}

export function assertAgent(value: unknown, what: string): asserts value is string {
  assertAgainst(value, what, AGENT, "a-z, 0-9 and ._:@-", 48);
}

export function assertThread(value: unknown, what: string): asserts value is string {
  assertAgainst(value, what, THREAD, "a-z, 0-9 and ._-", 64);
}
