import { createRequire } from "node:module";

/**
 * The claim schema's field types, in the order the published data encodes them.
 *
 * Written out here rather than imported from hivemark. Importing the producer's
 * own copy would make every check that decodes agree with the producer by
 * construction, which is the one thing an external reader must not do.
 *
 * bytes32 identityId, string repo, uint32 pr, string commitSha, string file,
 * uint32 line, string category, string severity, uint8 confidence,
 * uint8 verdict, uint8 impactScore, bytes32 claimHash
 */
export const CLAIM_TYPES = [
  { type: "bytes32" },
  { type: "string" },
  { type: "uint32" },
  { type: "string" },
  { type: "string" },
  { type: "uint32" },
  { type: "string" },
  { type: "string" },
  { type: "uint8" },
  { type: "uint8" },
  { type: "uint8" },
  { type: "bytes32" },
] as const;

/** Field positions, named so a check never indexes by a bare number. */
export const FIELD = {
  identityId: 0,
  repo: 1,
  pr: 2,
  commitSha: 3,
  file: 4,
  line: 5,
  category: 6,
  severity: 7,
  confidence: 8,
  verdict: 9,
  impactScore: 10,
  claimHash: 11,
} as const;

/**
 * Verdict codes as published. Read off the encoding rather than imported: 0 is
 * `unresolved` and must never share a code with `confirmed`, which is the whole
 * point of I-1 in this producer.
 */
export const VERDICT_NAMES: Record<number, string> = {
  0: "unresolved",
  1: "confirmed",
  2: "refuted",
  3: "uncertain",
};

/**
 * Decoded claims, by the encoded data they came from.
 *
 * Unbounded on purpose. The cache was first written with a 2048-entry cap
 * evicting the oldest key, against a corpus of 932 distinct `data` values —
 * 2.2x headroom against a snapshot of a producer that grows. The cap does not
 * degrade at the edge, it falls off it: i1 scans the attestations in order and
 * would leave the cache holding entries 2..2049, i4 then rescans from entry 1
 * and misses on every lookup, evicting each entry just before it is wanted.
 * The hit rate goes 100% to 0%, the end-to-end win disappears, and no test and
 * no line of the report changes to say so. LRU behaves the same way — a
 * sequential scan longer than the cache thrashes under any eviction policy.
 *
 * Nothing needs the bound: `decodeClaimData` has two callers, `i1` and `i4`,
 * both inside one CLI process reading one corpus, which exits when the report
 * is written. The long-running service the cap was sized for does not exist.
 *
 * The returned array is shared with every later caller for the same `data`, so
 * a caller that writes to it — say `decoded[FIELD.verdict]` — would poison
 * every subsequent decode in the run. `readonly` is erased at runtime and would
 * not stop that, so the array is frozen instead: the write throws where it is
 * made rather than surfacing as a wrong verdict somewhere downstream. Every
 * decoded field is a primitive, so a shallow freeze covers the whole value.
 */
const claimDataCache = new Map<string, readonly unknown[]>();

/** Hex characters in one 32-byte ABI word. */
const WORD = 64;

/** The head: one word per field, a value for a static type and an offset for a string. */
const HEAD_BYTES = CLAIM_TYPES.length * 32;

/** Whole bytes in lower case, and at least one. Anything else is viem's to judge. */
const CANONICAL_HEX = /^0x[0-9a-f]+$/;

/**
 * Longer than this and the fast path does not look. Published claims run to
 * about 3,500 characters. The bound is written down because the regex has one
 * of its own that is not: under Bun it stops matching a little past two
 * million bytes and takes 180 ms to say so at one, where Node matches at any
 * length. A decline that depends on the runtime should be one this file makes.
 */
const MAX_FAST_CHARS = 1 << 16;

/** The top 52 of a word's 64 characters: zero when the value is below 2^48. */
const HIGH_ZEROS = "0".repeat(WORD - 12);

const utf8 = new TextDecoder();

/** The word starting at character `at`, or nothing if it is too large to read exactly here. */
function smallWordAt(data: string, at: number): number | undefined {
  if (!data.startsWith(HIGH_ZEROS, at)) return undefined;
  return Number.parseInt(data.slice(at + HIGH_ZEROS.length, at + WORD), 16);
}

/** The string whose length word sits `offset` bytes in, or nothing if any of it lies outside the data. */
function stringAt(data: string, bytes: number, offset: number): string | undefined {
  if (offset + 32 > bytes) return undefined;
  const at = 2 + offset * 2;
  const length = smallWordAt(data, at);
  if (length === undefined) return undefined;
  if (length === 0) return "";
  if (offset + 32 + length > bytes) return undefined;
  // TextDecoder and not Buffer#toString: it is what viem decodes with, and the
  // two differ on a leading byte-order mark.
  return utf8.decode(Buffer.from(data.slice(at + WORD, at + WORD + length * 2), "hex"));
}

/**
 * The claim, read straight off the hex — or `undefined`, which is not a
 * verdict on the data but a refusal to be the one who gives it.
 *
 * The first version of this decoded whatever it was handed. A claim cut short
 * came back with empty strings, a verdict word that was not hex came back as
 * `NaN`, and a string longer than the data came back holding the rest of the
 * record. `i1` and `i4` learn that a record is undecodable from a throw and
 * from nothing else, so each of those would have been counted as a judged
 * claim and the run reported CONFORMS over data it could not read.
 *
 * So this accepts only what it can show it reads as viem does — lower-case
 * whole bytes, every number below 2^48, every string inside the data — and
 * declines the rest without an opinion. The caller hands what is declined to
 * viem, which then accepts or refuses it in its own words. The two decoders
 * therefore cannot disagree about a damaged record, because only one of them
 * is ever asked.
 *
 * What it does accept it reads as viem 2.55.4 and later read it. Before that,
 * viem stripped leading NUL bytes from a decoded string and this does not, so
 * under an older viem the same claim would decode one way in lower case and
 * another in upper. `package.json` holds the floor there; the BOM and NUL
 * cases in the test are what fail if it is lowered.
 *
 * The positions come from `CLAIM_TYPES`, so the order is stated once. The
 * reading of each type is not derived from anything: three types are read
 * here, and a fourth added to the schema is declined like any other thing
 * this does not know, rather than read as a number because it was not a
 * string.
 *
 * Exported for the test that every published claim is taken here. Declining
 * is always correct, which is exactly why it has to be watched: a producer
 * that began publishing upper-case hex would send every record to the
 * fallback, the speed would be gone, and no verdict would change to say so.
 */
export function fastDecodeClaimData(data: string): readonly unknown[] | undefined {
  // `typeof` first: a String object satisfies everything below and viem refuses it.
  if (typeof data !== "string" || data.length > MAX_FAST_CHARS) return undefined;
  if (data.length % 2 !== 0 || data.length < 4 || !CANONICAL_HEX.test(data)) return undefined;
  const bytes = (data.length - 2) / 2;
  if (bytes < HEAD_BYTES) return undefined;

  const decoded: unknown[] = [];
  for (const [i, { type }] of CLAIM_TYPES.entries()) {
    const at = 2 + i * WORD;
    if (type === "bytes32") {
      decoded.push(`0x${data.slice(at, at + WORD)}`);
      continue;
    }
    if (type !== "string" && type !== "uint8" && type !== "uint32") return undefined;
    const value = smallWordAt(data, at);
    if (value === undefined) return undefined;
    if (type === "string") {
      const text = stringAt(data, bytes, value);
      if (text === undefined) return undefined;
      decoded.push(text);
    } else {
      decoded.push(value);
    }
  }
  return decoded;
}

/**
 * The decoder could not be loaded. Not a fact about any record.
 *
 * `i1` and `i4` count a record as undecodable when its decode throws, and the
 * verdict turns on that count. A missing or broken `viem` throws from the same
 * call, and caught the same way it would be published as a finding about the
 * producer's data: a run with no `viem` installed reported "1 undecodable" and
 * UNDECIDABLE for a claim that decodes. Both callers rethrow this.
 *
 * While the import was static this could not happen — the process died before
 * the first check. Loading late is what made it possible.
 */
export class DecoderUnavailableError extends Error {
  constructor(cause: unknown) {
    super("viem could not be loaded, so nothing can be said about a claim the fast path declined", {
      cause,
    });
    this.name = "DecoderUnavailableError";
  }
}

/**
 * viem, loaded on the first claim the fast path declines and not before.
 *
 * A static import costs its module graph on every run, including the run that
 * never needs it — on the published corpus, all of them. `require` is the one
 * way to load it late and still return synchronously to `i1` and `i4`.
 */
const requireLate = createRequire(import.meta.url);

function decodeWithViem(data: `0x${string}`): readonly unknown[] {
  let viem: typeof import("viem");
  try {
    viem = requireLate("viem");
  } catch (cause) {
    throw new DecoderUnavailableError(cause);
  }
  return viem.decodeAbiParameters(CLAIM_TYPES, data);
}

export function decodeClaimData(data: `0x${string}`): readonly unknown[] {
  let decoded = claimDataCache.get(data);
  if (decoded === undefined) {
    decoded = Object.freeze(fastDecodeClaimData(data) ?? decodeWithViem(data));
    claimDataCache.set(data, decoded);
  }
  return decoded;
}
