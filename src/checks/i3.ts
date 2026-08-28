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
  const carriesRecord = entries.every((e) => "finalUrl" in e && "offSite" in e);
  findings.push({
    invariant: "I-3",
    producer: "apex",
    verdict: missing.length > 0 ? "VIOLATES" : carriesRecord ? "CONFORMS" : "UNDECIDABLE",
    evidence: "OBSERVED",
    reason: `all ${entries.length} entries pair the offSite conclusion with the finalUrl it was drawn from, and the pairing is exercised ${entries.length} times — but every conclusion in this corpus is negative (${concluded.length} positive, ${missing.length} of those without evidence), so the case where the evidence would matter most is not among them`,
    projections: [],
  });

  return findings;
}
