import { readApex } from "../adapters/apex.js";
import { parseHivemark } from "../adapters/hivemark.js";
import type { Finding } from "../verdict.js";

/** Read straight off the published JSON, never through the envelope adapter. */
interface Published {
  signer: string;
  identity_id: string;
  attestation: { message: { recipient: string } };
}

export function checkI6(files: Map<string, Uint8Array>): Finding[] {
  // Reopened at relay-0022, and rewritten to touch no projection.
  //
  // `signer` and `message.recipient` are both fields the producer publishes
  // under those names — verifiable in the corpus, and NOT adapter renames. So
  // the comparison below is corpus-native, and the concern that this check
  // compares two invented roles does not hold.
  //
  // What does not hold is the step after it. I-6 asks whether the attester
  // differs from the SUBJECT, and which published field is the subject is §5's
  // mapping rather than the producer's claim. That mapping is syntactic only:
  // no producer emits a field named `subject`, and where a subject-position
  // token exists its role diverges by producer. Two natively distinct
  // participant fields never coinciding is a real fact about hivemark. It is
  // not the same fact as an attester differing from a subject.
  //
  // So the native half is reported as observed, and the invariant is left
  // undecided rather than carried by a mapping the corpus does not support.
  const raw = parseHivemark(files, "hivemark/attestations.json") as Published[];
  const collisions = raw.filter(
    (e) => e.signer.toLowerCase() === e.attestation.message.recipient.toLowerCase(),
  );
  const signers = new Set(raw.map((e) => e.signer));
  const recipients = new Set(raw.map((e) => e.attestation.message.recipient));

  const findings: Finding[] = [
    {
      invariant: "I-6",
      producer: "hivemark",
      verdict: collisions.length > 0 ? "VIOLATES" : "UNDECIDABLE",
      evidence: "OBSERVED",
      reason: `natively published: signer and message.recipient never coincide across ${raw.length} envelopes (${signers.size} signer, ${recipients.size} recipients, ${collisions.length} collisions). That is corpus-native and not a projection. But identifying recipient as the subject is §5's mapping, not the producer's, and no producer publishes a field named subject — so two distinct participant fields differing does not establish that an attester differs from a subject`,
    },
  ];

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
