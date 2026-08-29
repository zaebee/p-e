/**
 * Which corpus fields bear on which invariant.
 *
 * The conformance rule this table serves: **a check may not report a limit of
 * the corpus without having opened every field that could lift it.** A verdict
 * of `UNDECIDABLE` or `NOT_APPLICABLE` says the evidence does not settle the
 * question; if a field that would settle it was never read, the verdict is a
 * statement about the reader's search and the report says it is a statement
 * about the corpus.
 *
 * Two live instances, both found by outside readers rather than by this project:
 *
 *   I-1 / apex   said "never exercised" without opening `entries[*].code`,
 *                where `null` occurs four times beside `502` twice and `200`
 *                twice — the third state, exercised
 *   I-9 / apex   said "has never recorded a failure" without opening health at
 *                all, while six of eight entries carry `ok: false`
 *
 * ## What this table is not
 *
 * It is authored, by the party whose reader it audits, which is the curation
 * problem this project has recorded five times. Its honesty is not that it was
 * derived — it was not — but that it is explicit, small, and checkable against
 * the clause text by anyone who disagrees.
 *
 * A field belongs here when the invariant's own `falsifier:` or `reader:` clause
 * would be settled differently depending on its value. Where that is arguable,
 * the argument belongs in a record, not in a silent omission.
 */

export interface Bearing {
  readonly invariant: string;
  readonly producer: string;
  /** Fields whose values could settle the question this invariant asks. */
  readonly fields: readonly string[];
  /** Why these and not others. One sentence, checkable against the clause. */
  readonly because: string;
}

export const BEARING: readonly Bearing[] = [
  {
    invariant: "I-1",
    producer: "apex",
    fields: ["history.hosts[*].state", "history.hosts[*].gaps", "health.entries[*].code"],
    because:
      "the clause asks whether not-observed is kept apart from a negative; `state` and `gaps` carry one vocabulary and `code` carries another, where null is no status obtained and 502 is a status that was",
  },
  {
    invariant: "I-9",
    producer: "apex",
    fields: ["history.hosts[*].gaps", "health.entries[*].ok", "health.entries[*].code"],
    because:
      "the clause asks whether failures are counted; `gaps` is the count, and `ok`/`code` are where the corpus records whether any failure occurred to be counted",
  },
  {
    invariant: "I-5",
    producer: "apex",
    fields: ["history.hosts[*].since", "history.hosts[*].gaps"],
    because:
      "the clause asks that `since` not precede the first observation and that gaps be counted; it names no other field, and importing one is the cross-invariant leakage that made I-5 stricter than its own clause",
  },
  {
    invariant: "I-3",
    producer: "apex",
    fields: ["health.entries[*].offSite", "health.entries[*].finalUrl"],
    because:
      "the clause requires the finalUrl beside every offSite conclusion, and names those two fields only",
  },
];

export function bearingFor(invariant: string, producer: string): Bearing | undefined {
  return BEARING.find((b) => b.invariant === invariant && b.producer === producer);
}
