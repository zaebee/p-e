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
  // by digest, and publishes the derived conclusions. The inputs are not in the
  // corpus — they live in another repository entirely.
  //
  // This branch returned UNDECIDABLE for runs 01 through 07, on the reasoning
  // that the record is "pinned but not presented" and so settles nothing. That
  // was wrong, and the catalogue said so before the reader existed. I-3's own
  // `watch:` line reads:
  //
  //   "dist/provenance.json pins corpus.json by digest, but corpus.json may not
  //    itself be published. if so H fails its own I-3 at the artifact level, and
  //    that is a finding, not a bug in the reader"
  //
  // H fails. The falsifier is `a producer publishes a conclusion whose input is
  // not in the corpus`, and this branch established that condition in its own
  // reason — five inputs pinned, zero published — and then declined to fire it.
  // Two independent blind readers fired it on a byte-identical clause, and
  // bee.zae settled I-3/hivemark as VIOLATES at relay-0174.
  //
  // The falsifier governs and the title is a description, ruled at relay-0153,
  // so the vaguer word "beside" offers no route back.
  const provenance = parseHivemark(files, "hivemark/provenance.json") as ProvenanceManifest;
  const present = provenance.files.filter((f) => files.has(`hivemark/${f.path}`));
  const absent = provenance.files.length - present.length;
  findings.push({
    invariant: "I-3",
    producer: "hivemark",
    verdict: absent > 0 ? "VIOLATES" : "CONFORMS",
    evidence: "OBSERVED",
    reason:
      absent > 0
        ? `provenance.json pins ${provenance.files.length} derivation inputs by digest and ${absent} of them are absent from the published corpus, so the producer publishes a conclusion whose input is not in the corpus — the falsifier's condition, stated`
        : `provenance.json pins ${provenance.files.length} derivation inputs by digest and every one is in the published corpus, so each conclusion is accompanied by what it was drawn from`,
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
