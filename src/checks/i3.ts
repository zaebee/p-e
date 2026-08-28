import { apexHealth } from "../adapters/apex.js";
import { parseHivemark } from "../adapters/hivemark.js";
import type { Finding } from "../verdict.js";

interface ProvenanceManifest {
  source: string;
  sha256: string;
  files: Array<{ path: string; sha256: string }>;
}

export function checkI3(files: Map<string, Uint8Array>): Finding[] {
  const findings: Finding[] = [];

  // hivemark publishes provenance.json, which pins each input of the derivation
  // by digest. The inputs themselves are not in the corpus — they live in
  // another repository entirely. So integrity is checkable given the files, and
  // the derivation is not checkable without them. That is neither conformance
  // nor violation: the published record does not settle it. A third state,
  // between "kept beside" and "absent": pinned but not presented.
  const provenance = parseHivemark(files, "hivemark/provenance.json") as ProvenanceManifest;
  const present = provenance.files.filter((f) => files.has(`hivemark/${f.path}`));
  findings.push({
    invariant: "I-3",
    producer: "hivemark",
    verdict: present.length === provenance.files.length ? "CONFORMS" : "UNDECIDABLE",
    evidence: "OBSERVED",
    reason: `provenance.json pins ${provenance.files.length} derivation inputs by digest; ${present.length} of them are in the published corpus, so the conclusion cannot be recomputed from what is published — the observation is pinned but not presented`,
    projections: [],
  });

  const health = apexHealth(files);
  const entries = Object.values(health.entries);
  const concluded = entries.filter((e) => e.offSite === true);
  const missing = concluded.filter((e) => e.finalUrl === null || e.finalUrl === undefined);
  // Found by a peer session reviewing this file, and standing in runs 01-05.
  //
  // The old test was `entries.every(e => "finalUrl" in e && "offSite" in e)` —
  // key presence. On this corpus `offSite === true` occurs zero times and
  // `finalUrl` is null in all eight entries, so a CONFORMS was being carried
  // entirely by two keys existing over empty values. `field exists` is not
  // `claim demonstrated`, which is the heading of this project's own matrix.
  //
  // i1 and i5 already apply the opposite standard to the same producer, and
  // i1 carries a comment about having been corrected for exactly this: a
  // present-but-zero mechanism accepted here while an occurring value is
  // demanded there. This check was that uncorrected draft.
  //
  // The pairing must be exercised. On this corpus it is not.
  const exercised = concluded.length > 0;
  findings.push({
    invariant: "I-3",
    producer: "apex",
    verdict: missing.length > 0 ? "VIOLATES" : exercised ? "CONFORMS" : "UNDECIDABLE",
    evidence: "OBSERVED",
    reason: `all ${entries.length} entries carry both the offSite conclusion and the finalUrl field, but ${concluded.length} conclusions are positive and finalUrl is null in ${entries.filter((e) => e.finalUrl === null).length} of ${entries.length}: the pairing is never exercised, so keeping evidence beside a conclusion cannot be observed here. Two keys existing over empty values is not the invariant`,
    projections: [],
  });

  return findings;
}
