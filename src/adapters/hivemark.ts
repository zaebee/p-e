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
/**
 * Seconds since the epoch, as the producer publishes them.
 *
 * `Number()` accepted `"0x2"`, `"1e9"` and `""`, each yielding a valid-looking
 * instant — 1970-01-01T00:00:02Z, 2001-09-09, and the epoch itself. `"1e12"`
 * would have landed after the corpus extraction time and flipped I-2/hivemark
 * from UNDECIDABLE to VIOLATES on a malformed string. The i2 `Date.parse` shape,
 * one layer down.
 */
function epochSeconds(value: string, index: number): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(
      `attestations.json[${index}]: message.time is not decimal seconds: ${JSON.stringify(value)}`,
    );
  }
  return Number(value);
}

/** Absent must not stringify into the word "undefined", which reads as a version. */
function requiredVersion(value: unknown, index: number): string {
  if (typeof value !== "number") {
    throw new Error(
      `attestations.json[${index}]: envelope_version is ${JSON.stringify(value)}, not a number`,
    );
  }
  return String(value);
}

export function readHivemark(files: Map<string, Uint8Array>): Envelope[] {
  const raw = parseHivemark(files, "hivemark/attestations.json") as StoredEnvelope[];
  return raw.map((e, index) => ({
    subject: e.attestation.message.recipient,
    occurred_at: new Date(epochSeconds(e.attestation.message.time, index) * 1000).toISOString(),
    payload: {
      data: e.attestation.message.data,
      claim_hash: e.claim_hash,
      identity_id: e.identity_id,
    },
    id: e.attestation.uid,
    type: e.attestation.message.schema,
    version: requiredVersion(e.envelope_version, index),
    attester: e.signer,
    origin: { file: "hivemark/attestations.json", index },
  }));
}
