/**
 * Missing-evidence semantics: when may a reader say it did not look?
 *
 * `EXCLUDED_WITH_REASON` means *the reader did not look, and says why*. It is a
 * statement about the reader, and it is the right answer when an artifact was
 * withheld — the blind readings used it correctly for `attestations.json`, which
 * did not fit in a chat context.
 *
 * It is the wrong answer when the clause itself says the value never reaches an
 * artifact. Blind reader #2 marked I-8 and I-9 for hivemark
 * `EXCLUDED_WITH_REASON` on the withheld file, and blind reader #1 marked both
 * `UNDECIDABLE`. #1 was right: both clauses state that the value is computed at
 * runtime and does not survive into what is published, so the withheld file would
 * not have settled either. A reader can be too generous with *"I did not look"*,
 * and that generosity reads as modesty while quietly disclaiming a question the
 * evidence could have answered.
 *
 * Three states, and the ordering between them is what this checks:
 *
 *   EXCLUDED_WITH_REASON   the artifact is absent from the corpus, and the clause
 *                          does not already say the value is unpublished
 *   UNDECIDABLE            the artifact is present, or the clause says the value
 *                          never reaches an artifact — either way the question is
 *                          open on the evidence rather than on the reading
 *   VIOLATES               the falsifier's condition holds; absence of evidence
 *                          is never this
 */

export interface EvidenceRule {
  readonly invariant: string;
  readonly producer: string;
  /** Artifacts this finding would need. Absent ones justify EXCLUDED_WITH_REASON. */
  readonly needs: readonly string[];
  /**
   * True when the clause itself says the value is computed at runtime and never
   * reaches a published artifact. Then no artifact can settle it, and withholding
   * one changes nothing — the honest verdict is UNDECIDABLE.
   */
  readonly unpublishedByClause: boolean;
  readonly because: string;
}

export const EVIDENCE: readonly EvidenceRule[] = [
  {
    invariant: "I-8",
    producer: "hivemark",
    needs: ["hivemark/attestations.json"],
    unpublishedByClause: true,
    because:
      "the clause reads 'the unverifiable list is produced by verifyEnvelope at runtime and does not appear in attestations.json' — so the file being withheld does not change the answer",
  },
  {
    invariant: "I-9",
    producer: "hivemark",
    needs: ["hivemark/attestations.json"],
    unpublishedByClause: true,
    because:
      'the clause reads "supersede\'s undecodable count is computed but not published" — the count is absent from the artifact whether or not the artifact is supplied',
  },
  {
    invariant: "I-4",
    producer: "hivemark",
    needs: ["hivemark/attestations.json"],
    unpublishedByClause: false,
    because:
      "the clause asks for a recomputation over the published envelopes, which the file supplies; withholding it genuinely prevents the reading",
  },
];

export interface EvidenceFinding {
  readonly invariant: string;
  readonly producer: string;
  readonly verdict: string;
  readonly should: string;
  readonly why: string;
}

/**
 * Whether a verdict of `EXCLUDED_WITH_REASON` is licensed by what was withheld.
 *
 * Returns null when the verdict is something else, or when exclusion is
 * justified. A finding means the reader disclaimed a question that the missing
 * artifact was never going to answer.
 */
export function checkEvidence(
  rule: EvidenceRule,
  verdict: string,
  present: (path: string) => boolean,
): EvidenceFinding | null {
  if (verdict !== "EXCLUDED_WITH_REASON") return null;

  if (rule.unpublishedByClause) {
    return {
      invariant: rule.invariant,
      producer: rule.producer,
      verdict,
      should: "UNDECIDABLE",
      why: `the clause says the value never reaches an artifact, so withholding one settles nothing: ${rule.because}`,
    };
  }

  const missing = rule.needs.filter((p) => !present(p));
  if (missing.length > 0) return null;

  return {
    invariant: rule.invariant,
    producer: rule.producer,
    verdict,
    should: "UNDECIDABLE",
    why: `every artifact this finding needs is in the corpus (${rule.needs.join(", ")}), so nothing was withheld to exclude`,
  };
}
