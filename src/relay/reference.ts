import { ID_DIGITS, ID_PREFIX, type RelayRecord } from "./store.js";

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
 *   UNREFERENCED   nothing names it, and ids were bound after it whose records
 *                  could have
 *   NO_SUCCESSORS  nothing was bound after it, so nothing could have referenced
 *                  it.
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
   * How many ids this authority bound after this one — held or since gone.
   *
   * Reported rather than thresholded. Any cutoff for "recent enough to judge"
   * would be invented here and would then look like a finding, so the number is
   * handed to the reader instead.
   */
  readonly successors: number;
  readonly state: Reference;
}

/**
 * Ids as they appear inside prose, built from the format rather than repeating
 * it. This was `/relay-\d{4}/g`, and widening the format would have left it
 * silently matching nothing — gemini-code-assist on PR #8.
 */
const ID_IN_TEXT = new RegExp(String.raw`${ID_PREFIX}\d{${ID_DIGITS}}`, "g");

/** What ends the header block. */
const BLANK_LINE = "\n\n";

/** Everything below the header block — the part a sender wrote as prose. */
function prose(bytes: string): string {
  const at = bytes.indexOf(BLANK_LINE);
  return at === -1 ? "" : bytes.slice(at + BLANK_LINE.length);
}

/**
 * The index of the first entry strictly greater than `id`, by binary search.
 *
 * Both sides are fixed-width zero-padded ids, so lexicographic order is the
 * numeric one — the same property `store.ts`'s comparator rests on, and the same
 * caveat: a fact about the format rather than about strings.
 */
function firstAbove(sorted: readonly string[], id: string): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    // `mid < hi <= sorted.length`, so this is always present. The check is for
    // the compiler's index strictness rather than for a case that occurs.
    const at = sorted[mid];
    if (at !== undefined && at > id) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

/** Id order, written out for the reasons `store.ts` gives beside its own. */
function bySeq(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * `bound` is every id this authority has ever bound — the marker set, which
 * survives deletion.
 *
 * Required rather than optional. It was optional and fell back to counting held
 * records, which is the behaviour this change exists to remove, and a caller who
 * forgot got it silently. A caller that genuinely wants the old count passes an
 * empty set and says so. The same shape was removed from `markerAgreement` one
 * review earlier and kept here by inattention.
 */
export function checkReferences(
  store: ReadonlyMap<string, RelayRecord>,
  bound: ReadonlySet<string>,
): ReferenceFinding[] {
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
    // `matchAll`, not `exec`. Sonar asks for `exec` here and it would be wrong:
    // `ID_IN_TEXT` is a module constant carrying `g`, so `exec` advances its
    // `lastIndex` and the next record starts scanning from wherever the last one
    // stopped. Measured — two `exec` calls on one string return different hits,
    // while two `matchAll` calls return the same and leave `lastIndex` at 0.
    for (const hit of new Set([...prose(r.bytes).matchAll(ID_IN_TEXT)].map((m) => m[0]))) {
      if (hit !== r.id) add(mentionedBy, hit, r.id);
    }
  }

  // Sorted once, searched per record. gemini-code-assist on PR #11 caught that
  // `[...bound].filter(...)` inside the loop allocated an array per record; its
  // fix removed the allocation and kept the quadratic walk. Measured on synthetic
  // stores, counting by walking the whole set each time against a binary search:
  //
  //       664 records      12ms     0.2ms
  //      5000 records     443ms     1.7ms
  //     20000 records   10207ms     7.3ms
  //
  // The store is 664 today, where both are free. The difference is what happens
  // to a check that is meant to keep running.
  const boundSorted = [...bound].sort(bySeq);

  return ids.map((id, i) => {
    const refs = referencedBy.get(id) ?? [];
    const mentions = mentionedBy.get(id) ?? [];
    // Ids ever bound above this one, not records still held above it.
    //
    // MEASURED BEFORE FIXING: in a store of three, deleting relay-0003 moved
    // relay-0002 from UNREFERENCED to NO_SUCCESSORS. A record that existed and
    // could have referenced it was removed, and the removal EXCUSED A DIFFERENT
    // RECORD FROM A FINDING. That is `issue-1`'s "flips a record from excused to
    // a finding with the subject unchanged", running the other way, and it needs
    // no second authority — the Migration section reaches for one and the defect
    // is nearer than that.
    //
    // AND THIS COUNT IS NOT EXACT, WHICH AN EARLIER VERSION OF THIS COMMENT
    // CLAIMED IT WAS. A marker with no record and nothing naming it is either a
    // deleted record — a real past referrer — or a crash between the claim and
    // the write, which never was one. MEASURED: THE TWO PRODUCE IDENTICAL STORE
    // STATE, so nothing here can separate them. `relay-0683` is the second kind
    // and is counted as the first.
    //
    // Kept as an over-count rather than an under-count on purpose. Excluding
    // them would restore the defect above, since a deleted record nobody named
    // lands in exactly the same bucket. The error that reports too much is the
    // one this store already prefers: absence must not read as a claim.
    const successors = boundSorted.length - firstAbove(boundSorted, id);
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
