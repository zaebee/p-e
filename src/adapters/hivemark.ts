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

/**
 * Parsed corpus files, keyed by the buffer they were read from.
 *
 * Every check that reads the same file now gets the same object graph rather
 * than its own parse, which is where this run's time went. The value is
 * `unknown` and each check casts it to a mutable array, so nothing in the types
 * holds the invariant: a check that normalises `raw` in place — sorting it by
 * time is the obvious thing to write — would silently change what every later
 * check in `CHECKS` sees, while the per-check tests, each running alone, stay
 * green.
 *
 * `Object.freeze` here would make that throw instead, and it was tried: the
 * reader-conformance harness wraps a parse in a recording `Proxy` to measure
 * which fields a check actually opened, and a proxy over a frozen target must
 * return the target's own object for a non-configurable property. The
 * recording wrapper cannot, so four I-1/I-3 apex cases die with `'get' on
 * proxy: property '0' is a read-only and non-configurable data property`.
 * Measuring what a check read and freezing what it reads are exclusive, and
 * this corpus measures. So the invariant is stated and not enforced: read from
 * the value, copy before changing anything.
 */
const parseCache = new WeakMap<Uint8Array, unknown>();

export function parseHivemark(files: Map<string, Uint8Array>, name: string): unknown {
  const bytes = files.get(name);
  if (!bytes) throw new Error(`not in corpus: ${name}`);
  let cached = parseCache.get(bytes);
  if (cached === undefined) {
    cached = JSON.parse(decoder.decode(bytes));
    parseCache.set(bytes, cached);
  }
  return cached;
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
