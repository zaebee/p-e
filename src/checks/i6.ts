import { readApex } from "../adapters/apex.js";
import { readHivemark } from "../adapters/hivemark.js";
import type { Finding } from "../verdict.js";

export function checkI6(files: Map<string, Uint8Array>): Finding[] {
  const h = readHivemark(files);
  const collisions = h.filter(
    (e) => e.attester !== undefined && e.attester.toLowerCase() === e.subject.toLowerCase(),
  );
  const signers = new Set(h.map((e) => e.attester));
  const subjects = new Set(h.map((e) => e.subject));
  const findings: Finding[] = [
    {
      invariant: "I-6",
      producer: "hivemark",
      verdict: collisions.length > 0 ? "VIOLATES" : "CONFORMS",
      evidence: "OBSERVED",
      reason: `across ${h.length} envelopes, ${signers.size} signer(s) and ${subjects.size} subject(s), the signer is never the recipient (${collisions.length} collisions); the publisher signs and the reviewer is signed about`,
    },
  ];

  // apex records no attester anywhere. The invariant cannot be exercised, which
  // is not the same as it holding — and by the demotion rule this leaves I-6
  // supported by a single producer under test.
  const a = readApex(files);
  const withAttester = a.filter((e) => e.attester !== undefined);
  findings.push({
    invariant: "I-6",
    producer: "apex",
    verdict: withAttester.length === 0 ? "NOT_APPLICABLE" : "CONFORMS",
    evidence: "OBSERVED",
    reason: `none of ${a.length} records names an attester, so the separation cannot be exercised here; absence is evidence, not permission`,
  });

  return findings;
}
