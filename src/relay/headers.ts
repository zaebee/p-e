import { type RelayRecord, byRecordId, firstBlankLine } from "./store.js";

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

/**
 * Pre-computed line prefixes for each header name (e.g. "kind:", "\nkind:").
 * Avoids dynamically creating prefix strings during header scanning.
 */
const HEADER_PREFIXES = READ_FROM_BLOCK.map((name) => [name, `${name}:`, `\n${name}:`] as const);

/**
 * Finds the end index of the first `maxLines` lines in `text` starting from `start`.
 * Avoids `.split("\n").slice(0, maxLines)` string array allocations per record.
 */
function getStrandWindowEnd(text: string, start: number, maxLines: number): number {
  let pos = start;
  let lines = 0;
  while (lines < maxLines && pos < text.length) {
    const next = text.indexOf("\n", pos);
    if (next === -1) return text.length;
    pos = next + 1;
    lines++;
  }
  return pos;
}

/** Records whose headers fell below the blank line. Reads, changes nothing. */
export function strandedHeaders(store: ReadonlyMap<string, RelayRecord>): StrandedHeader[] {
  const out: StrandedHeader[] = [];
  for (const r of [...store.values()].sort(byRecordId)) {
    const blank = firstBlankLine(r.bytes);
    if (blank === null) continue;

    // Line prefixes still work on CRLF: every line after the first follows an LF.
    const block = r.bytes.slice(0, blank.start);
    const belowEnd = getStrandWindowEnd(r.bytes, blank.end, STRAND_WINDOW);
    const below = r.bytes.slice(blank.end, belowEnd);

    const stranded: string[] = [];
    for (const [name, prefix, nlPrefix] of HEADER_PREFIXES) {
      // Both halves are compared by line prefix matching using startsWith/includes.
      // A line starts with `${name}:` iff the section starts with `name:` or contains `\nname:`.
      const inBlock = block.startsWith(prefix) || block.includes(nlPrefix);
      if (!inBlock) {
        const inBelow = below.startsWith(prefix) || below.includes(nlPrefix);
        if (inBelow) stranded.push(name);
      }
    }
    if (stranded.length > 0) out.push({ id: r.id, stranded });
  }
  return out;
}
