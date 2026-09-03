import type { RelayAct } from "./act.js";
import { assertNameable, isNameable } from "./names.js";
import { isUuidV7 } from "./uuid.js";

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
 * 3600 because that is what the protocol specified before v0.12 lost it. The
 * proposal v0.12 descends from gives `ttl` as OPTIONAL with a default of 3600
 * seconds, and gives the sweep an origin — `created_time(uuidv7) + ttl < now()`
 * — and neither survived into the draft this store implements. Both strings
 * occur exactly twice in the sixteen-round review thread, both times in the
 * original body; no round records their removal. Restored beside the draft in
 * `docs/specs/relay-lite-v0.12-addendum-ttl.md`, and #37 has the evidence.
 *
 * This was 0, taken from the plan and kept because the plan wrote it. Under the
 * restored formula that is not one of two readings: `created_time + 0 < now()`
 * holds at any instant after creation — at any scale, so the open unit question
 * below does not touch it — which makes zero *already expired* and made this
 * constant the one value that moves every delivery to `errata/` on the first
 * sweep.
 *
 * Zero is still a legal value to pass, and now means what it says. What is still
 * unsettled is the unit the comparison runs in: RFC 9562 puts milliseconds in a
 * UUIDv7 and `<seconds>` is seconds, so a literal reading of the restored
 * formula gives this default a lifetime of 3.6 seconds rather than an hour. That
 * is a defect in the rule, not in this number, and it stays in #37 rather than
 * being answered here.
 */
export const DEFAULT_TTL = 3600;

/** §2.1's field sequence. The grammar is an order, not a set. */
const FIELDS = ["to", "from", "thread", "ttl", "id"] as const;

/** `<seconds>`: decimal digits, no sign, no exponent, no leading zero. */
const SECONDS = /^(0|[1-9][0-9]*)$/;

export function formatCns(act: RelayAct, recipient: string, ttlSeconds = DEFAULT_TTL): string {
  if (act === null || typeof act !== "object") {
    throw new Error(`act must be an object, got ${String(act)}`);
  }
  // The recipient is this function's own argument and reaches no other check.
  // The act's fields were validated at minting, and are re-checked because an
  // act can also arrive from the wire, where nothing minted it.
  assertNameable(recipient, "recipient");
  assertNameable(act.from, "act.from");
  assertNameable(act.thread_id, "act.thread_id");
  // Against the parser's grammar, not merely the alphabet. `assertNameable`
  // admits `not-a-uuid` — letters and hyphens — so this function wrote
  // `…;id=not-a-uuid.json` and `parseCns` returned null for it. The invariant
  // above was stated for `ttlSeconds` and enforced for `ttlSeconds` only.
  if (!isUuidV7(act.id)) {
    throw new Error(`act.id must be a uuidv7, got ${JSON.stringify(act.id)}`);
  }
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

export function parseCns(filename: unknown): CnsName | null {
  // `null`, not a throw. This reads a name off a disk, so its argument is
  // whatever `readdir` handed the caller, and the function already has a way to
  // say "not a delivery name". Throwing a TypeError from `.endsWith` says the
  // same thing in a form a directory scan cannot act on.
  if (typeof filename !== "string") return null;
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
  if (!isUuidV7(id)) return null;

  return { to, from, thread, ttl: seconds, id };
}

export type DeliveryCheck =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason:
        | "recipient-not-in-audience"
        | "id-mismatch"
        | "from-mismatch"
        | "thread-mismatch"
        | "malformed-audience"
        | "malformed-name";
    };

export function checkDelivery(cns: CnsName, act: RelayAct): DeliveryCheck {
  // Both checked before their fields are read, for the reason `act.to` is:
  // this function is handed an act it did not mint and a name it did not
  // write, and reading a field off `null` reports the failure as a TypeError
  // from inside rather than as a verdict the caller can act on.
  if (cns === null || typeof cns !== "object") return { ok: false, reason: "malformed-name" };
  if (act === null || typeof act !== "object") return { ok: false, reason: "malformed-audience" };
  if (cns.id !== act.id) return { ok: false, reason: "id-mismatch" };

  // §2 makes only `CNS.to ∈ act.to[]` and `CNS.id == act.id` normative, and
  // these two are beyond that enumeration. They are here on the test this store
  // uses elsewhere: no conforming publisher can produce such a name, because
  // `formatCns` writes the act's own `from` and `thread_id` and nothing else.
  //
  // Without them a delivery file could say `from=agent:impostor` over a body
  // saying `agent:claude`, and anything scanning `in/` by name — which is what
  // §2.1 puts these fields in the name for — would read the sender the file
  // claims rather than the one the act attests.
  if (cns.from !== act.from) return { ok: false, reason: "from-mismatch" };
  if (cns.thread !== act.thread_id) return { ok: false, reason: "thread-mismatch" };

  // `to` is checked for being a list before it is read as one. A string has
  // `.includes`, and it is a *substring* search: against an audience of
  // `"agent:mimo"` the name `to=gen` was admitted, because "gen" sits inside
  // "agent". §2's MUST is that `CNS.to` is an *element* of `to[]`, and
  // substring containment is not element membership. `undefined` threw a raw
  // TypeError from `.length` instead.
  //
  // Its own reason rather than `recipient-not-in-audience`, which would be a
  // true refusal explaining itself wrongly: the audience did not exclude this
  // recipient, there was no audience to consult.
  if (!Array.isArray(act.to)) return { ok: false, reason: "malformed-audience" };

  const open = act.to.length === 1 && act.to[0] === "all";
  if (!open && !act.to.includes(cns.to)) {
    return { ok: false, reason: "recipient-not-in-audience" };
  }
  return { ok: true };
}
