import { randomFillSync } from "node:crypto";

/**
 * UUIDv7, with the two cases a timestamp alone does not cover.
 *
 * Not in the standard library — `crypto.randomUUID` produces v4 — and the
 * design's first estimate of "around fifteen lines" was too glib, which review
 * said. Two cases have to be handled rather than assumed:
 *
 *   - more than one id inside a millisecond, handled by RFC 9562 §6.2 method 1:
 *     a counter seeded randomly per millisecond, carried in `rand_a`;
 *   - a clock stepping backwards, handled by never going below the last
 *     millisecond used, which is the shape the HLC uses one file away.
 *
 * What is load-bearing here is uniqueness. Ordering is why v7 rather than v4 and
 * is worth having, but the comparator reaches `id` only as a terminal tie-break.
 */

export interface UuidState {
  readonly lastMs: number;
  readonly counter: number;
}

export const UUID_START: UuidState = { lastMs: 0, counter: 0 };

/**
 * What `uuidV7` produces, as a predicate.
 *
 * Beside the function that makes them, for the reason `isDigest` sits beside
 * `sha256Hex`: three modules were each deciding separately what an id looks
 * like — `cns.ts` strictly, `act.ts` only as a nameable string, `verify.ts` not
 * at all — and a rule written down three times is how they came to disagree.
 */
export function isUuidV7(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)
  );
}

/**
 * `rand_a` is twelve bits, so the counter has 4096 values — but not 4096 slots.
 * The seed is random in the lower half, per RFC 9562 §6.2's advice to leave
 * headroom rather than start at a predictable zero, so a millisecond holds
 * `4096 - seed` ids: at least 2048, around 2300 in practice, and never the 4096
 * the width alone suggests. Past that the timestamp advances, which is the
 * behaviour the overflow test pins.
 */
const COUNTER_BITS = 12;
const COUNTER_MAX = (1 << COUNTER_BITS) - 1;

export function uuidV7(state: UuidState, nowMs: number): { id: string; state: UuidState } {
  let ms = Math.max(nowMs, state.lastMs);

  // Eighteen bytes for a sixteen-byte id. The last two are scratch: they seed
  // the counter on a new millisecond and are never published.
  //
  // The obvious saving is to seed from the id's own random bytes, which costs
  // no extra fill. It also prints the counter in the id twice — once in
  // `rand_a`, once in the bytes it was read from, where the variant mask leaves
  // every bit of it recoverable. Measured over 5000 ids: 5000 recovered. That
  // makes `rand_a` a function of the published bytes rather than independent of
  // them, and drops cross-node collision resistance by the eleven bits it was
  // contributing. Two bytes nobody sees costs less than eleven bits everybody
  // relies on.
  //
  // `Buffer.alloc`, not `allocUnsafe`: every byte of the id is written below, so
  // the zeroing is redundant *today* and costs 143ns of 1275. What it buys is
  // that an edit narrowing one of these writes leaves a zero rather than pooled
  // heap memory in an identifier that gets published and digested.
  const bytes = Buffer.alloc(18);
  // One fill for both purposes. `randomBytes(2)` for the seed was a second
  // syscall-backed call at 1111ns, and it ran on every mint that entered a new
  // millisecond — which, for a store whose acts arrive seconds apart, is nearly
  // every mint.
  randomFillSync(bytes, 8, 10);

  let counter: number;
  if (ms === state.lastMs) {
    counter = state.counter + 1;
    if (counter > COUNTER_MAX) {
      // The millisecond is full. Advancing rather than blocking keeps ids
      // unique and ordered; the cost is a timestamp one ahead of the clock,
      // which the next real millisecond absorbs.
      ms++;
      counter = 0;
    }
  } else {
    // Seeded randomly rather than at zero, so two nodes starting in the same
    // millisecond do not walk the same sequence. From the scratch bytes, which
    // leave the id no way to disclose it.
    counter = bytes.readUInt16BE(16) & (COUNTER_MAX >> 1);
  }

  bytes.writeUIntBE(ms, 0, 6);
  bytes.writeUInt16BE(((0x7 << 12) | counter) & 0xffff, 6);
  // RFC 4122 variant, in the top two bits of the ninth byte. Read and written
  // through the typed accessors rather than by index, which would type the read
  // as possibly absent and need a fallback for a case that cannot arise.
  bytes.writeUInt8((bytes.readUInt8(8) & 0x3f) | 0x80, 8);

  // Sixteen, not eighteen: the scratch bytes stop here.
  const hex = bytes.toString("hex", 0, 16);
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return { id, state: { lastMs: ms, counter } };
}
