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
    projections: [],
  });

  const health = apexHealth(files);
  const history = apexHistory(files);
  const checkedAt = Date.parse(health.checkedAt);
  // Every comparison against NaN is false, so an unparseable timestamp counted
  // as neither future nor out of order and the branch landed on CONFORMS.
  // Malformed input must not be able to produce a conformance: the failure
  // direction was the wrong one. Latent on this corpus, where all timestamps
  // parse.
  const unparseable = [
    ...(Number.isNaN(checkedAt) ? [`checkedAt=${health.checkedAt}`] : []),
    ...Object.entries(history.hosts)
      .filter(([, r]) => Number.isNaN(Date.parse(r.since)))
      .map(([host, r]) => `${host}.since=${r.since}`),
  ];
  const badSince = Object.entries(history.hosts).filter(([, r]) => Date.parse(r.since) > checkedAt);
  findings.push({
    invariant: "I-2",
    producer: "apex",
    // Amended at relay-0056. This branch confirmed on ordering, and the whole
    // evidence base is two distinct instants: all eight `since` are identical
    // and checkedAt == updatedAt == lastOkAt. Ordering is not occurrence.
    //
    // It is the step the hivemark branch thirty lines above was demoted for at
    // relay-0012, taken on thinner data. VIOLATES stays reachable — a time
    // after extraction, or out of order, is still a contradiction. CONFORMS
    // does not: no arrangement of timestamps read alone says what they mean.
    verdict:
      unparseable.length > 0
        ? "UNDECIDABLE"
        : checkedAt > cutoff || badSince.length > 0
          ? "VIOLATES"
          : "UNDECIDABLE",
    evidence: "OBSERVED",
    reason:
      unparseable.length > 0
        ? `${unparseable.length} timestamp(s) do not parse (${unparseable.join(", ")}); an unreadable time settles nothing, and must not be counted as ordered correctly`
        : `${new Set([...Object.values(history.hosts).map((r) => r.since), health.checkedAt]).size} distinct instants in the whole evidence base; ordering holds (${badSince.length} exceptions) and ordering is not occurrence — no arrangement of timestamps read alone says which of the two a field means`,
    projections: [],
  });

  return findings;
}
