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

const HEX_DIGITS = /^[0-9a-fA-F]*$/;

function parseHexWord(clean: string, byteOffset: number): number {
  const hexOffset = byteOffset * 2;
  return Number.parseInt(clean.slice(hexOffset, hexOffset + 64), 16);
}

function decodeClaimDataFast(hex: string): readonly unknown[] {
  if (typeof hex !== "string") throw new Error("Invalid input");
  const clean = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (clean.length < 768 || (clean.length & 1) !== 0 || !HEX_DIGITS.test(clean)) {
    throw new Error("Invalid hex data");
  }
  const totalBytes = clean.length >> 1;

  const identityId = `0x${clean.slice(0, 64)}`;
  const repoOff = parseHexWord(clean, 32);
  const prVal = parseHexWord(clean, 64);
  const commitShaOff = parseHexWord(clean, 96);
  const fileOff = parseHexWord(clean, 128);
  const lineVal = parseHexWord(clean, 160);
  const categoryOff = parseHexWord(clean, 192);
  const severityOff = parseHexWord(clean, 224);
  const confidenceVal = parseHexWord(clean, 256);
  const verdictVal = parseHexWord(clean, 288);
  const impactScoreVal = parseHexWord(clean, 320);
  const claimHash = `0x${clean.slice(704, 768)}`;

  if (prVal > 4294967295 || lineVal > 4294967295) throw new Error("uint32 overflow");
  if (confidenceVal > 255 || verdictVal > 255 || impactScoreVal > 255) {
    throw new Error("uint8 overflow");
  }

  function readAbiString(offBytes: number): string {
    if (offBytes > totalBytes || offBytes + 32 > totalBytes) {
      throw new Error("offset out of bounds");
    }
    const len = parseHexWord(clean, offBytes);
    if (len > totalBytes || offBytes + 32 + len > totalBytes) {
      throw new Error("string truncated");
    }
    const strHex = clean.slice(offBytes * 2 + 64, offBytes * 2 + 64 + len * 2);
    return Buffer.from(strHex, "hex").toString("utf8");
  }

  const repo = readAbiString(repoOff);
  const commitSha = readAbiString(commitShaOff);
  const file = readAbiString(fileOff);
  const category = readAbiString(categoryOff);
  const severity = readAbiString(severityOff);

  return [
    identityId,
    repo,
    prVal,
    commitSha,
    file,
    lineVal,
    category,
    severity,
    confidenceVal,
    verdictVal,
    impactScoreVal,
    claimHash,
  ];
}

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

export function decodeClaimData(data: `0x${string}`): readonly unknown[] {
  let decoded = claimDataCache.get(data);
  if (decoded === undefined) {
    decoded = Object.freeze(decodeClaimDataFast(data));
    claimDataCache.set(data, decoded);
  }
  return decoded;
}
