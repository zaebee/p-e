/**
 * A reason may not assert a corpus-wide negative about a field it never opened.
 *
 * The first suite rule constrains *verdicts*: `UNDECIDABLE` and `NOT_APPLICABLE`
 * say the evidence does not settle a question, and a field that would settle it
 * must have been read. This rule constrains *reasons*, and it applies whatever
 * the verdict is — because a correct verdict can rest on a false statement of
 * fact, and nothing in a tally will ever show it.
 *
 * The worked case is I-9 / apex (OBS-061). Verdict `UNDECIDABLE`, which is right:
 * the falsifier asks whether failures are dropped with no count *anywhere*, and
 * apex records them per entry. The reason attached to it reads:
 *
 *     "the mechanism exists and has never recorded a failure"
 *
 * In the same corpus, six of eight entries carry `ok: false` and four carry
 * `code: null`. The check never opens `health.json`. The verdict survived seven
 * runs and three reviewers because a verdict is what gets tallied and a reason is
 * what gets skimmed.
 *
 * ## What this can and cannot do
 *
 * It matches phrasing, not meaning. A reason that asserts a universal negative —
 * *never*, *none*, *no …*, *every one is*, *not exercised* — is required to have
 * opened every field the bearing table says could falsify it. That is a blunt
 * instrument and it is honest about being one: it catches the shape of the I-9
 * sentence, not its semantics.
 *
 * On the current corpus it flags the same two checks the verdict rule flags,
 * because we have no third instance — no case yet of `CONFORMS` with a false
 * reason. The rules separate the moment one appears, which is the point of
 * writing it now rather than after.
 */

/**
 * Phrases that make a claim about the whole corpus rather than about what was
 * read. Deliberately short: every entry here has to be defensible as "this
 * sentence asserts something no partial reading can establish".
 */
const UNIVERSAL_NEGATIVE = [
  /\bnever\b/i,
  /\bnone\b/i,
  /\bno \w+ (?:is|are|was|were|occurs?|carries|carry)\b/i,
  /\bnot exercised\b/i,
  /\bevery one is\b/i,
  /\bdoes not (?:occur|exist)\b/i,
  /\bzero\b/i,
];

export interface RationaleFinding {
  readonly invariant: string;
  readonly producer: string;
  /** The phrase that triggered the rule, so a reader can judge the match. */
  readonly phrase: string;
  /** Bearing fields the reason's claim depends on and the check never opened. */
  readonly unread: readonly string[];
}

/** The phrase a reason uses to assert a corpus-wide negative, if it does. */
export function universalNegative(reason: string): string | null {
  for (const pattern of UNIVERSAL_NEGATIVE) {
    const hit = pattern.exec(reason);
    if (hit) return hit[0];
  }
  return null;
}

/**
 * Whether a reason claims more than the reading behind it supports.
 *
 * Returns null when the reason makes no universal claim, or when every bearing
 * field was opened. A finding means the sentence asserts something about the
 * corpus that this reading could not have established.
 */
export function checkRationale(
  invariant: string,
  producer: string,
  reason: string,
  bearing: readonly string[],
  fieldsRead: ReadonlySet<string>,
): RationaleFinding | null {
  const phrase = universalNegative(reason);
  if (!phrase) return null;
  const unread = bearing.filter((f) => !fieldsRead.has(f));
  if (unread.length === 0) return null;
  return { invariant, producer, phrase, unread };
}
