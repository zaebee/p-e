import type { Envelope } from "../envelope.js";

const decoder = new TextDecoder();

/** The published envelope's shape, as far as this reader needs it. */
interface StoredEnvelope {
  envelope_version: number;
  signer: string;
  identity_id: string;
  claim_hash: string;
  attestation: {
    uid: string;
    message: { schema: string; recipient: string; time: string; data: string; refUID: string };
  };
}

export function parseHivemark(files: Map<string, Uint8Array>, name: string): unknown {
  const bytes = files.get(name);
  if (!bytes) throw new Error(`not in corpus: ${name}`);
  return JSON.parse(decoder.decode(bytes));
}

/**
 * Project published attestations into envelopes.
 *
 * `subject` comes from `message.recipient`, which in this producer is the
 * reviewer that made the claim — the claimant, not the thing reviewed. That is
 * recorded, not corrected: correcting it here would be the reader inventing the
 * semantics M2 leaves unresolved.
 */
export function readHivemark(files: Map<string, Uint8Array>): Envelope[] {
  const raw = parseHivemark(files, "hivemark/attestations.json") as StoredEnvelope[];
  return raw.map((e, index) => ({
    subject: e.attestation.message.recipient,
    occurred_at: new Date(Number(e.attestation.message.time) * 1000).toISOString(),
    payload: {
      data: e.attestation.message.data,
      claim_hash: e.claim_hash,
      identity_id: e.identity_id,
    },
    id: e.attestation.uid,
    type: e.attestation.message.schema,
    version: String(e.envelope_version),
    attester: e.signer,
    origin: { file: "hivemark/attestations.json", index },
  }));
}
