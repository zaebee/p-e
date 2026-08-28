import { apexHistory } from "../adapters/apex.js";
import { parseHivemark } from "../adapters/hivemark.js";
import type { Finding } from "../verdict.js";

export function checkI9(files: Map<string, Uint8Array>): Finding[] {
  const records = Object.values(apexHistory(files).hosts);
  const uncounted = records.filter((r) => typeof r.gaps !== "number");
  const findings: Finding[] = [
    {
      invariant: "I-9",
      producer: "apex",
      verdict: uncounted.length > 0 ? "VIOLATES" : "CONFORMS",
      evidence: "OBSERVED",
      reason: `all ${records.length} host records publish a gaps count, so runs that could not observe are visible in the artifact rather than folded into the checks total`,
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
