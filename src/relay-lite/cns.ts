import type { RelayAct } from "./act.js";
import { assertNameable, isNameable } from "./names.js";

/**
 * The delivery filename, and the two things it must agree with.
 *
 * §2.1: `to=<agent>;from=<agent>;thread=<thread_id>;ttl=<seconds>;id=<uuidv7>.json`
 *
 * §2: *"`CNS.to` is an element of the act's `to[]`, or `to[] == ["all"]`"*, and
 * *"`CNS.id == act.id`."*
 *
 * The name carries delivery and the sealed body carries the act, so the two can
 * disagree — a validly sealed act can be linked under a name naming someone the
 * author never addressed. `checkDelivery` is what makes the attested audience
 * mean something rather than merely being recorded.
 *
 * ## The name is a filename, and this module is where that is handled
 *
 * §2.1 gives the grammar and no alphabet, which leaves both of the string's
 * jobs unguarded. Task 4 validates what it seals, but `formatCns` is handed the
 * recipient separately and minting never saw it, so the hole was open here:
 * `formatCns(act, "../../../tmp/x")` produced a name whose `join(inDir, name)`
 * resolves outside `in/`, and `formatCns(act, "a;to=someone")` produced a name
 * a parser reads as addressed to someone else. Both are refused now.
 *
 * `parseCns` is strict in the other direction, because it reads a disk nobody
 * in this process wrote. §2.1's grammar names five fields in an order; anything
 * else is not a delivery name, and returning `null` says so. Issue #35 carries
 * what the spec should settle.
 */

export interface CnsName {
  readonly to: string;
  readonly from: string;
  readonly thread: string;
  readonly ttl: number;
  readonly id: string;
}

/**
 * The value written when a caller does not choose one.
 *
 * Zero because that is what the plan wrote, and it is not obviously right. §2.1
 * puts `ttl=<seconds>` in the name and §4.1 says a sweeper *"moves `.relay/in/`
 * entries past their TTL to `.relay/errata/`"*. That is the whole of what the
 * spec says about it, and it leaves two things open: what the seconds are
 * counted from, and whether `0` means *never expires* or *already expired*.
 * Under the second reading every delivery is past its TTL the moment it is
 * written and the sweeper takes the lot.
 *
 * So the value is a parameter now rather than a constant nobody chose. Filed as
 * #37. Until it is settled, a caller passing nothing gets the plan's zero and
 * this comment.
 */
export const DEFAULT_TTL = 0;

/** §2.1's field sequence. The grammar is an order, not a set. */
const FIELDS = ["to", "from", "thread", "ttl", "id"] as const;

/** `<seconds>`: decimal digits, no sign, no exponent, no leading zero. */
const SECONDS = /^(0|[1-9][0-9]*)$/;

/** `<uuidv7>`: the shape task 2 mints. */
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function formatCns(act: RelayAct, recipient: string, ttlSeconds = DEFAULT_TTL): string {
  // The recipient is this function's own argument and reaches no other check.
  // The act's fields were validated at minting, and are re-checked because an
  // act can also arrive from the wire, where nothing minted it.
  assertNameable(recipient, "recipient");
  assertNameable(act.from, "act.from");
  assertNameable(act.thread_id, "act.thread_id");
  assertNameable(act.id, "act.id");
  // Checked against the same grammar `parseCns` reads, so this function cannot
  // write a name it would then refuse.
  // Safe-integer rather than the regex alone: `String(2**53)` is all digits and
  // passes `SECONDS`, so the regex would admit a value that is no longer the
  // number it was written from. Two readers of that name disagree about it, and
  // `parseCns` refuses it — which would make this function able to write a name
  // it would then reject.
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 0) {
    throw new Error(`ttlSeconds must be a non-negative safe integer, got ${String(ttlSeconds)}`);
  }
  return `to=${recipient};from=${act.from};thread=${act.thread_id};ttl=${ttlSeconds};id=${act.id}.json`;
}

export function parseCns(filename: string): CnsName | null {
  if (!filename.endsWith(".json")) return null;

  const parts = filename.slice(0, -".json".length).split(";");
  // Exactly §2.1's five, in §2.1's order. A `Map` would have accepted a
  // duplicate and silently kept the last, so `to=a;to=b;…` parsed as `to=b` —
  // which is how a name can claim a recipient its writer did not put first.
  // Extra fields were accepted and ignored, which admits names §2.1 does not
  // define. Neither is a resolution the spec asks for.
  if (parts.length !== FIELDS.length) return null;

  const values: string[] = [];
  for (const [i, part] of parts.entries()) {
    const at = part.indexOf("=");
    if (at === -1 || part.slice(0, at) !== FIELDS[i]) return null;
    values.push(part.slice(at + 1));
  }
  const [to, from, thread, ttl, id] = values as [string, string, string, string, string];

  // The alphabet, on the way in as well as out: a file in `in/` was put there by
  // something, and this module is not entitled to assume it was us.
  if (!isNameable(to) || !isNameable(from) || !isNameable(thread)) return null;

  // `Number` accepted `0x10` as 16, `1e3` as 1000 and `" 5"` as 5, none of which
  // §2.1's `<seconds>` admits, and each of which lets two readers of one name
  // disagree about when it expires.
  if (!SECONDS.test(ttl)) return null;
  // The grammar admits any run of digits, so a thirty-digit ttl passes it and
  // then loses precision — or reaches Infinity — on the way to a number. A name
  // whose ttl cannot be read back as the value written is not one this store
  // can act on.
  const seconds = Number(ttl);
  if (!Number.isSafeInteger(seconds)) return null;
  if (!UUID_V7.test(id)) return null;

  return { to, from, thread, ttl: seconds, id };
}

export type DeliveryCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "recipient-not-in-audience" | "id-mismatch" };

export function checkDelivery(cns: CnsName, act: RelayAct): DeliveryCheck {
  if (cns.id !== act.id) return { ok: false, reason: "id-mismatch" };
  const open = act.to.length === 1 && act.to[0] === "all";
  if (!open && !act.to.includes(cns.to)) {
    return { ok: false, reason: "recipient-not-in-audience" };
  }
  return { ok: true };
}
