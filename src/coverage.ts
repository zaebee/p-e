import type { Manifest } from "./manifest.js";
import type { Verdict } from "./verdict.js";

/**
 * A corpus that records what was read from it.
 *
 * Coverage is observed rather than declared. A hand-written table of "which
 * check reads which artifact" is a claim about the code that drifts from it
 * silently — the same defect as a report restating a verdict in prose. This
 * wrapper watches the reads instead, so the matrix below is a measurement.
 */
export class RecordingCorpus extends Map<string, Uint8Array> {
  /** Paths whose bytes were actually taken. */
  readonly reads = new Set<string>();
  /**
   * Paths a check asked about without taking the bytes.
   *
   * Kept apart from `reads` because a probe is not a reading. I-3 asks whether
   * five `martian-*.jsonl` inputs are present — they are not in the corpus at
   * all — and counting those as reads would have said a check examined an
   * artifact it established the absence of. The same distinction the rest of
   * this project keeps: looking is not seeing.
   */
  readonly probes = new Set<string>();

  override get(key: string): Uint8Array | undefined {
    this.reads.add(key);
    return super.get(key);
  }

  override has(key: string): boolean {
    this.probes.add(key);
    return super.has(key);
  }
}

/** One artifact class. `apex/log/*.md` is four files and one class. */
export function classOf(path: string): string {
  return path.startsWith("apex/log/") ? "apex/log/*.md" : path;
}

export interface ClassCoverage {
  readonly cls: string;
  readonly files: number;
  /**
   * How many files of the class a check actually opened.
   *
   * `EXAMINED` used to mean *some check touched one file of this class*, so
   * reading one of the four log entries marked all four examined. A class is
   * examined in part or in whole, and the matrix now says which.
   */
  readonly filesRead: number;
  readonly invariants: readonly string[];
  readonly disposition: Verdict | "EXAMINED";
  readonly reason: string;
}

/**
 * Why a class carries no invariant finding.
 *
 * Authored, not computed — the read/not-read fact above is measured, and this
 * is the part a person has to answer for. A class missing from here and from
 * the findings fails the coverage test rather than passing quietly.
 */
const EXCLUSIONS: Record<string, string> = {
  "hivemark/births.json":
    "three onchain birth announcements carrying identity_id, entity, first_seen, tx_hash and attestation_uid. No check reads it. It bears on I-1 (is first_seen an occurrence or an announcement time?) and on M1 (identity_id is content-derived here), and neither has been written. Excluded because unexamined, not because inapplicable",
  "hivemark/corpus.json":
    "a 1.6KB manifest naming which .jsonl files make up hivemark's input corpus. It is an input to a derivation whose inputs are not published (see I-3), so it can be read but nothing in it can be checked against anything present. Excluded with reason rather than examined",
  "hivemark/anchors.json":
    "read by I-5, which checks period naming and uid counts. It is NOT projected into an envelope by any adapter: it is a set aggregate — one root over 1,864 uids — with no per-record subject, so §5's required subject cannot be filled from producer-native data. Classifying it would mean inventing one, which relay-0023 forbids",
};

export function coverageOf(
  manifest: Manifest,
  reads: ReadonlySet<string>,
  byInvariant: ReadonlyMap<string, ReadonlySet<string>>,
): ClassCoverage[] {
  const classes = new Map<string, number>();
  for (const entry of manifest.entries) {
    const cls = classOf(entry.path);
    classes.set(cls, (classes.get(cls) ?? 0) + 1);
  }

  return [...classes.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([cls, files]) => {
      const filesRead = new Set(
        [...byInvariant.values()].flatMap((paths) => [...paths].filter((p) => classOf(p) === cls)),
      ).size;
      const invariants = [...byInvariant.entries()]
        .filter(([, paths]) => [...paths].some((p) => classOf(p) === cls))
        .map(([id]) => id)
        .sort();
      const reason = EXCLUSIONS[cls] ?? "";
      return {
        cls,
        files,
        filesRead,
        invariants,
        disposition:
          invariants.length > 0 ? ("EXAMINED" as const) : ("EXCLUDED_WITH_REASON" as const),
        reason,
      };
    });
}
