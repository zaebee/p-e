/**
 * Four verdicts, because two would collapse "not observed" into "false" — the
 * exact defect I-1 exists to prevent, applied to this reader itself.
 *
 * NOT_APPLICABLE: the producer has no such construct, so the invariant cannot be
 * exercised. UNDECIDABLE: it applies, but the published artifacts do not settle
 * it. Neither is a failure, and neither is support.
 */
export type Verdict =
  | "CONFORMS"
  | "VIOLATES"
  | "NOT_APPLICABLE"
  | "UNDECIDABLE"
  /**
   * A corpus class the reader deliberately does not examine, with the reason
   * stated. Added at relay-0023, where omission from the matrix was ruled out
   * as a disposition: a class the reader never opened must say so, rather than
   * be absent and look considered.
   */
  | "EXCLUDED_WITH_REASON";

/**
 * `NOT_APPLICABLE` and `EXCLUDED_WITH_REASON` are not variants of each other,
 * and relay-0025 asks that the difference stay explicit.
 *
 *   NOT_APPLICABLE        the reader LOOKED. the producer has no such
 *                         construct, so the invariant cannot be exercised.
 *                         a statement about the producer.
 *
 *   EXCLUDED_WITH_REASON  the reader DID NOT LOOK, and says why.
 *                         a statement about the reader.
 *
 * Collapsing them would let unexamined ground read as cleared ground, which is
 * the defect OBS-010 records — and neither counts as support.
 */

/**
 * How a verdict was reached, which is a different question from what it was.
 *
 * OBSERVED: the property was read directly out of the artifact.
 * INFERRED: a proxy consistent with the property was used, which does not
 * establish it — I-2 at the artifact level is the clearest case.
 *
 * relay-0009 also proposed UNDECIDABLE and FALSIFIED here. Both are already
 * carried by the verdict, and a finding reading `evidence: UNDECIDABLE,
 * verdict: CONFORMS` would be incoherent, so only the non-redundant half of that
 * proposal is implemented.
 */
export type Evidence = "OBSERVED" | "INFERRED";

export interface Finding {
  readonly invariant: string;
  readonly producer: string;
  readonly verdict: Verdict;
  readonly evidence: Evidence;
  /** Why, in a sentence a reader of the report can check against the corpus. */
  readonly reason: string;
  /**
   * Meaning this finding supplied that no producer publishes.
   *
   * Required at relay-0025: every semantic projection explicitly marked, and no
   * adapter-derived meaning counted as producer evidence. An empty array is a
   * claim — that the finding rests on published bytes alone — and it is a claim
   * the self-audit checks rather than trusts.
   *
   * A finding may still CONFORM while listing projections, provided the
   * conforming half is native. Where a projection carries the verdict, the
   * verdict is not CONFORMS.
   */
  readonly projections: readonly string[];
}

/**
 * The demotion rule, applied mechanically rather than by judgement.
 *
 * Two distinct producers must CONFORM. A NOT_APPLICABLE never counts as support
 * — a producer that cannot exercise an invariant has told us nothing about it —
 * and neither does an UNDECIDABLE. One VIOLATES sinks it outright.
 */
export function admits(findings: readonly Finding[]): "ADMITTED" | "DEMOTED" {
  if (findings.some((f) => f.verdict === "VIOLATES")) return "DEMOTED";
  const confirming = new Set(
    findings.filter((f) => f.verdict === "CONFORMS").map((f) => f.producer),
  );
  return confirming.size >= 2 ? "ADMITTED" : "DEMOTED";
}
