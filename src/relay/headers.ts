import type { RelayRecord } from "./store.js";

/**
 * Headers that fell into the prose, and the reason a checker exists for them.
 *
 * `store.ts` splits a record at its first blank line: above is the header block,
 * below is what the sender wrote. A blank line before `kind:` therefore ends the
 * block early and the field becomes prose. The record stays valid — its digest
 * is right, its citation is right, `check-continuity` reports nothing — and every
 * reader that asks for `kind` gets nothing. `relay-1152` measured 21 records in
 * this state, 17 of them one party's attacks in a single thread.
 *
 * This reports. It does not refuse, and there is deliberately no gate behind it:
 * requiring a header at deposit is a decision about the envelope, and
 * `relay-0023` forbids inventing a subject for the sender. What a checker may do
 * is make the state visible the day it happens instead of a week later by
 * accident.
 */

/**
 * The headers this store reads out of the block, from `parse()`.
 *
 * `provenance`, `deposited-by` and `assigned-id` are the store's own and are
 * written above the separator by the store itself, so they cannot strand.
 */
const READ_FROM_BLOCK = ["to", "from", "parent", "parent-sha256", "ref", "kind"] as const;

/**
 * How far into the prose a stranded header is still a stranded header.
 *
 * Records quote each other's headers constantly — half this corpus contains the
 * string `kind:` inside a quotation — so a scan of the whole body reports the
 * citation habit rather than the defect. A header that fell out of the block
 * lands immediately after it, because the blank line that stranded it is the one
 * that ended the block. Eight lines is slack for a stray blank or two, and it is
 * a threshold rather than a fact: it is here to be argued with.
 */
const STRAND_WINDOW = 8;

export interface StrandedHeader {
  readonly id: string;
  /** Header names absent from the block and present just below it. */
  readonly stranded: readonly string[];
}

/** What divides a record's own header block from its prose. */
const BLANK_LINE = "\n\n";

/** Records whose headers fell below the blank line. Reads, changes nothing. */
export function strandedHeaders(store: ReadonlyMap<string, RelayRecord>): StrandedHeader[] {
  const out: StrandedHeader[] = [];
  for (const r of [...store.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const at = r.bytes.indexOf(BLANK_LINE);
    if (at === -1) continue;
    const block = r.bytes.slice(0, at);
    const below = r.bytes
      .slice(at + BLANK_LINE.length)
      .split("\n")
      .slice(0, STRAND_WINDOW);
    const stranded = READ_FROM_BLOCK.filter((name) => {
      const inBlock = new RegExp(String.raw`^${name}:`, "m").test(block);
      if (inBlock) return false;
      return below.some((line) => line.startsWith(`${name}:`));
    });
    if (stranded.length > 0) out.push({ id: r.id, stranded });
  }
  return out;
}
