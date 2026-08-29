import { apexHistory } from "../adapters/apex.js";
import { parseHivemark } from "../adapters/hivemark.js";
import type { Finding } from "../verdict.js";

export function checkI9(files: Map<string, Uint8Array>): Finding[] {
  const records = Object.values(apexHistory(files).hosts);
  const uncounted = records.filter((r) => typeof r.gaps !== "number");
  // Amended at relay-0056, after a review found this confirming on
  // [0,0,0,0,0,0,0,0]. Eight zeroes show that `uncounted` was empty; they do
  // not show that failures are counted. The reader was turning an absence of
  // detected failures into evidence of correct accounting.
  //
  // The same report called this field unexercised twice — i1 counts `gaps > 0`
  // among its "exercised" signals and i5 requires `anyGap`, both landing
  // UNDECIDABLE on this corpus. This check now applies the standard its
  // siblings already applied to the same field.
  const anyGap = records.some((r) => r.gaps > 0);
  const findings: Finding[] = [
    {
      invariant: "I-9",
      producer: "apex",
      verdict: uncounted.length > 0 ? "VIOLATES" : anyGap ? "CONFORMS" : "UNDECIDABLE",
      evidence: "OBSERVED",
      reason: anyGap
        ? `all ${records.length} host records publish a gaps count and ${records.filter((r) => r.gaps > 0).length} are non-zero, so runs that could not observe are visible in the artifact rather than folded into the checks total`
        : `all ${records.length} host records publish a gaps count and every one is zero: the mechanism exists and has never recorded a failure, so whether failures would be counted cannot be observed here`,
      projections: [],
    },
  ];

  const raw = parseHivemark(files, "hivemark/attestations.json") as Array<Record<string, unknown>>;
  const carries = raw.some((e) => "undecodable" in e);
  findings.push({
    invariant: "I-9",
    producer: "hivemark",
    verdict: carries ? "CONFORMS" : "UNDECIDABLE",
    evidence: "OBSERVED",
    reason: `none of the ${raw.length} published envelopes carries an undecodable count, checked one by one. Whether unreadable input was counted or silently dropped is therefore not decidable from the artifacts; that it is counted somewhere is a claim about source this reader does not read`,
    projections: [],
  });

  return findings;
}
