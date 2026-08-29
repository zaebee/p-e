import { apexLog } from "../adapters/apex.js";
import { parseHivemark } from "../adapters/hivemark.js";
import type { Finding } from "../verdict.js";

export function checkI8(files: Map<string, Uint8Array>): Finding[] {
  const entries = apexLog(files);
  const unbounded = entries.filter((e) => e.attested.trim().length === 0);
  const findings: Finding[] = [
    {
      invariant: "I-8",
      producer: "apex",
      verdict:
        entries.length === 0 ? "UNDECIDABLE" : unbounded.length > 0 ? "VIOLATES" : "CONFORMS",
      evidence: "OBSERVED",
      reason: `${entries.length} log entries, each naming what it does not establish (${unbounded.length} without); the field is required by the collection schema, so an entry that could not fill it would not build`,
      projections: [],
    },
  ];

  // hivemark states the limit of a signature in prose and in verifyEnvelope's
  // return value. Neither reaches the published artifacts.
  const raw = parseHivemark(files, "hivemark/attestations.json") as Array<Record<string, unknown>>;
  const carries = raw.some((e) => "unverifiable" in e || "limits" in e);
  findings.push({
    invariant: "I-8",
    producer: "hivemark",
    verdict: carries ? "CONFORMS" : "UNDECIDABLE",
    evidence: "OBSERVED",
    reason: `none of the ${raw.length} published envelopes carries an unverifiable or limits key, checked one by one. The producer's README says a signature does not assert a finding is correct; that sentence is not in the corpus, and this reader does not read source, so a holder of the artifacts alone is not told the limit`,
    projections: [],
  });

  return findings;
}
