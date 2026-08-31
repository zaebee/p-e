import type { RelayRecord } from "./store.js";

/**
 * Which records nothing ever referred to. Reads, changes nothing.
 *
 * Written for relay-0132, where ChatGPT proposed splitting the traffic into
 * `short` (coordination) and `relay` (durable evidence), and asked us to first
 * observe which messages we wish had not become durable.
 *
 * relay-0134 argued the split cannot be made by the sender: three records that
 * were coordination when written — an ack of an ack, a handoff ack, a wake-test
 * its own author called "deliberately boring" — later carried the evidence for
 * the continuity check, OBS-051, and the wake-loop finding. Whether a message is
 * coordination or evidence is settled afterwards, by what goes wrong.
 *
 * So this does not classify anything at emission. It answers the narrower
 * question the store can actually answer: what has nothing ever pointed at. That
 * is a fact about the graph rather than a prediction by an author, and a `short`
 * class, if one exists, should be discovered here rather than declared.
 *
 * One reading rule, which is the whole reason the report is not a single number:
 * a snapshot cannot tell you anything. A record nothing has referenced *yet* and
 * a record nothing will ever reference look identical today. Only the population
 * that stays unreferenced across weeks means anything.
 */

/**
 * Four states, and the fourth is about us rather than about the record.
 *
 *   REFERENCED     another record names it in `parent:` or `ref:`
 *   PROSE_ONLY     no header names it; its id appears in another record's body.
 *                  Kept separate rather than merged into REFERENCED: the store
 *                  derives its graph from headers alone, deliberately. A comment
 *                  in store.ts once called relay-0029..0031 KNOWN_MISSING
 *                  because they are named in relay-0033's prose, and that
 *                  inference was false. Prose is evidence that a human or agent
 *                  used the record, and it is not a link.
 *   UNREFERENCED   nothing names it, and records exist after it that could have
 *   NO_SUCCESSORS  nothing exists after it, so nothing could have referenced it.
 *                  Calling the newest record unreferenced would report our
 *                  position in time as a property of the record — the same
 *                  substitution `cold`/`unknown` refuses.
 */
export type Reference = "REFERENCED" | "PROSE_ONLY" | "UNREFERENCED" | "NO_SUCCESSORS";

export interface ReferenceFinding {
  readonly id: string;
  /** Records naming it in `parent:` or `ref:`. */
  readonly referencedBy: readonly string[];
  /** Records whose body mentions its id, excluding the record itself. */
  readonly mentionedBy: readonly string[];
  /**
   * How many records the store holds after this one.
   *
   * Reported rather than thresholded. Any cutoff for "recent enough to judge"
   * would be invented here and would then look like a finding, so the number is
   * handed to the reader instead.
   */
  readonly successors: number;
  readonly state: Reference;
}

const ID_IN_TEXT = /relay-\d{4}/g;

/** What ends the header block. */
const BLANK_LINE = "\n\n";

/** Everything below the header block — the part a sender wrote as prose. */
function prose(bytes: string): string {
  const at = bytes.indexOf(BLANK_LINE);
  return at === -1 ? "" : bytes.slice(at + BLANK_LINE.length);
}

export function checkReferences(store: ReadonlyMap<string, RelayRecord>): ReferenceFinding[] {
  const ids = [...store.keys()].sort();
  const referencedBy = new Map<string, string[]>();
  const mentionedBy = new Map<string, string[]>();

  const add = (into: Map<string, string[]>, key: string, value: string): void => {
    const held = into.get(key);
    if (held) held.push(value);
    else into.set(key, [value]);
  };

  for (const r of [...store.values()].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    for (const target of [r.parent, r.ref]) {
      if (target) add(referencedBy, target, r.id);
    }
    for (const hit of new Set(prose(r.bytes).match(ID_IN_TEXT) ?? [])) {
      if (hit !== r.id) add(mentionedBy, hit, r.id);
    }
  }

  return ids.map((id, i) => {
    const refs = referencedBy.get(id) ?? [];
    const mentions = mentionedBy.get(id) ?? [];
    const successors = ids.length - 1 - i;
    return {
      id,
      referencedBy: refs,
      mentionedBy: mentions,
      successors,
      state:
        refs.length > 0
          ? "REFERENCED"
          : mentions.length > 0
            ? "PROSE_ONLY"
            : successors === 0
              ? "NO_SUCCESSORS"
              : "UNREFERENCED",
    };
  });
}

/** Counts per state, with every state present. A state at zero says so. */
export function tallyReferences(findings: readonly ReferenceFinding[]): Record<Reference, number> {
  const counts: Record<Reference, number> = {
    REFERENCED: 0,
    PROSE_ONLY: 0,
    UNREFERENCED: 0,
    NO_SUCCESSORS: 0,
  };
  for (const f of findings) counts[f.state]++;
  return counts;
}
