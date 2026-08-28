import { apexHealth, apexHistory } from "../adapters/apex.js";
import { readHivemark } from "../adapters/hivemark.js";
import type { Finding } from "../verdict.js";

const HOUR = 3_600_000;

export function checkI2(files: Map<string, Uint8Array>, extractedAt: string): Finding[] {
  const cutoff = Date.parse(extractedAt);
  const findings: Finding[] = [];

  const times = readHivemark(files).map((e) => Date.parse(e.occurred_at));
  const future = times.filter((t) => t > cutoff).length;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const t of times) {
    if (t < min) min = t;
    if (t > max) max = t;
  }
  const spanHours = (max - min) / HOUR;
  // A publication timestamp would put every attestation inside one run's window.
  // A wider spread is consistent with an occurrence time and does not establish
  // it — the strong evidence is in the source, which this reader does not read.
  findings.push({
    invariant: "I-2",
    producer: "hivemark",
    verdict: future > 0 ? "VIOLATES" : spanHours > 1 ? "CONFORMS" : "UNDECIDABLE",
    evidence: "INFERRED",
    reason: `${times.length} occurrence times spread over ${spanHours.toFixed(1)}h, ${future} of them after extraction; a spread wider than one pipeline run is consistent with occurrence rather than publication, and does not prove it`,
  });

  const health = apexHealth(files);
  const history = apexHistory(files);
  const checkedAt = Date.parse(health.checkedAt);
  const badSince = Object.entries(history.hosts).filter(([, r]) => Date.parse(r.since) > checkedAt);
  findings.push({
    invariant: "I-2",
    producer: "apex",
    verdict: checkedAt > cutoff || badSince.length > 0 ? "VIOLATES" : "CONFORMS",
    evidence: "OBSERVED",
    reason: `the snapshot's occurrence ${health.checkedAt} precedes extraction, and every host's since precedes that snapshot (${badSince.length} exceptions); updatedAt is a write time and is not used as one`,
  });

  return findings;
}
