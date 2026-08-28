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
  // Demoted at relay-0012, and the demotion is the point.
  //
  // A publication timestamp would put every attestation inside one run's
  // window, so a wider spread is *compatible with* an occurrence time. It does
  // not establish one, and this project exists to forbid exactly that step —
  // from "consistent with" to "confirmed". An earlier version of this check
  // returned CONFORMS on an 11.6h spread and carried half of the report's only
  // admission on it.
  //
  // A time after extraction would still be a contradiction, so VIOLATES is
  // reachable. Conformance is not: no arrangement of timestamps, read alone,
  // distinguishes when something happened from when it was written down. That
  // evidence is in the producer's source, which this reader does not read.
  findings.push({
    invariant: "I-2",
    producer: "hivemark",
    verdict: future > 0 ? "VIOLATES" : "UNDECIDABLE",
    evidence: "OBSERVED",
    reason: `${times.length} occurrence times spread over ${spanHours.toFixed(1)}h, ${future} of them after extraction — compatible with occurrence rather than publication, and no arrangement of timestamps read alone can establish which of the two a field means`,
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
