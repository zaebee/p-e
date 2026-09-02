import { randomBytes } from "node:crypto";

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
  const ms = Math.max(nowMs, state.lastMs);

  let counter: number;
  if (ms === state.lastMs) {
    counter = state.counter + 1;
    if (counter > COUNTER_MAX) {
      // The millisecond is full. Advancing rather than blocking keeps ids
      // unique and ordered; the cost is a timestamp one ahead of the clock,
      // which the next real millisecond absorbs.
      return uuidV7({ lastMs: ms + 1, counter: -1 }, ms + 1);
    }
  } else {
    // Seeded randomly rather than at zero, so two nodes starting in the same
    // millisecond do not walk the same sequence.
    counter = randomBytes(2).readUInt16BE(0) & (COUNTER_MAX >> 1);
  }

  const bytes = Buffer.alloc(16);
  bytes.writeUIntBE(ms, 0, 6);
  bytes.writeUInt16BE(((0x7 << 12) | counter) & 0xffff, 6);
  const rest = randomBytes(8);
  // RFC 4122 variant, in the top two bits of the ninth byte. Read and written
  // through the typed accessors rather than by index: `randomBytes(8)` always
  // returns eight bytes, and indexing types the read as possibly absent, which
  // would need a fallback value standing for a case that cannot arise.
  rest.writeUInt8((rest.readUInt8(0) & 0x3f) | 0x80, 0);
  rest.copy(bytes, 8);

  const hex = bytes.toString("hex");
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return { id, state: { lastMs: ms, counter } };
}
