import { apexHistory } from "../adapters/apex.js";
import { parseHivemark } from "../adapters/hivemark.js";
import type { Verdict } from "../verdict.js";

/**
 * The clause, re-implemented from its own text, to be compared against the check.
 *
 * Two of the five observed failure modes turn out to have one mechanism, and
 * saying so is better than inventing a second one to match a list of four:
 *
 *   **too lax** — the falsifier's condition holds and the check does not fire it.
 *   I-3 / hivemark stated the condition in its own reason for seven runs and
 *   returned UNDECIDABLE (settled at relay-0174, repaired in run 08).
 *
 *   **too strict** — the check demands something its clause does not ask for.
 *   I-5 / apex requires a non-zero gap before it will CONFORM, which is the
 *   amended I-9 standard; the I-5 clause asks only that periods be valid,
 *   non-overlapping and never merged, and it was never amended.
 *
 * Both are the same question — *does the check agree with its clause?* — and the
 * only way to ask it is to implement the clause a second time, from the text,
 * without looking at the check. That is what this file is.
 *
 * ## What it is not
 *
 * It is not an oracle. It is a second reading by the same party, which is weaker
 * than the two blind readings that produced these findings and is why those
 * happened first. Its value is that it is *mechanical and repeated*: a blind
 * reader is a one-off, and this runs on every commit.
 *
 * Each predicate below cites the clause text it implements. Where the clause is
 * ambiguous the ambiguity belongs in a record, not in a silent choice here —
 * relay-0140 is the worked example, where one sentence carried two standards.
 */

export interface ClauseVerdict {
  /** What the clause alone yields on this corpus. */
  readonly verdict: Verdict;
  /** The clause text this implements, quoted. */
  readonly from: string;
  /** What was computed, so a disagreement can be checked rather than argued. */
  readonly observed: string;
}

type Clause = (files: Map<string, Uint8Array>) => ClauseVerdict;

interface ProvenanceManifest {
  files: Array<{ path: string; sha256: string }>;
}

const CLAUSES: Record<string, Clause> = {
  /**
   * falsifier: a producer publishes a conclusion whose input is not in the corpus
   *
   * watch: "dist/provenance.json pins corpus.json by digest, but corpus.json may
   * not itself be published. if so H fails its own I-3 at the artifact level, and
   * that is a finding, not a bug in the reader"
   */
  "I-3/hivemark": (files) => {
    const provenance = parseHivemark(files, "hivemark/provenance.json") as ProvenanceManifest;
    const absent = provenance.files.filter((f) => !files.has(`hivemark/${f.path}`));
    return {
      verdict: absent.length > 0 ? "VIOLATES" : "CONFORMS",
      from: "a producer publishes a conclusion whose input is not in the corpus",
      observed: `${provenance.files.length} inputs pinned, ${absent.length} absent from the corpus`,
    };
  },

  /**
   * falsifier: a period covers days outside its own name, or a gap is absorbed
   *            into an adjacent period
   * reader:    A — since never precedes first observation; gaps counted
   *
   * The clause asks that `since` be no later than the fold and that a gaps count
   * exist. It does not ask that a gap have occurred. Requiring one is the amended
   * I-9 standard, and I-5's clause is byte-identical between 580c01d and the
   * current specification — it was never amended.
   */
  "I-5/apex": (files) => {
    const history = apexHistory(files);
    const records = Object.values(history.hosts);
    const uncounted = records.filter((r) => typeof r.gaps !== "number");
    const impossible = records.filter((r) => Date.parse(r.since) > Date.parse(history.updatedAt));
    const broken = uncounted.length + impossible.length;
    return {
      verdict: broken > 0 ? "VIOLATES" : "CONFORMS",
      from: "since never precedes first observation; gaps counted",
      observed: `${records.length} records, ${uncounted.length} without a gaps count, ${impossible.length} with a since after the fold`,
    };
  },
};

export function clauseVerdict(
  invariant: string,
  producer: string,
  files: Map<string, Uint8Array>,
): ClauseVerdict | undefined {
  return CLAUSES[`${invariant}/${producer}`]?.(files);
}

export const CLAUSE_KEYS = Object.keys(CLAUSES);
