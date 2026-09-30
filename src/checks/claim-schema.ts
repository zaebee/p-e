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

function decodeStringAt(hex: string, offsetInBytes: number): string {
  const start = 2 + offsetInBytes * 2;
  const len = Number.parseInt(hex.slice(start, start + 64), 16);
  return Buffer.from(hex.slice(start + 64, start + 64 + len * 2), "hex").toString("utf8");
}

function fastDecodeClaimData(data: `0x${string}`): readonly unknown[] {
  if (typeof data !== "string" || !data.startsWith("0x") || data.length < 770) {
    throw new Error("data does not match claim ABI schema");
  }
  try {
    const identityId = `0x${data.slice(2, 66)}`;
    const repoOffset = Number.parseInt(data.slice(66, 130), 16);
    const pr = Number.parseInt(data.slice(130, 194), 16);
    const commitShaOffset = Number.parseInt(data.slice(194, 258), 16);
    const fileOffset = Number.parseInt(data.slice(258, 322), 16);
    const line = Number.parseInt(data.slice(322, 386), 16);
    const categoryOffset = Number.parseInt(data.slice(386, 450), 16);
    const severityOffset = Number.parseInt(data.slice(450, 514), 16);
    const confidence = Number.parseInt(data.slice(514, 578), 16);
    const verdict = Number.parseInt(data.slice(578, 642), 16);
    const impactScore = Number.parseInt(data.slice(642, 706), 16);
    const claimHash = `0x${data.slice(706, 770)}`;

    const repo = decodeStringAt(data, repoOffset);
    const commitSha = decodeStringAt(data, commitShaOffset);
    const file = decodeStringAt(data, fileOffset);
    const category = decodeStringAt(data, categoryOffset);
    const severity = decodeStringAt(data, severityOffset);

    return [
      identityId,
      repo,
      pr,
      commitSha,
      file,
      line,
      category,
      severity,
      confidence,
      verdict,
      impactScore,
      claimHash,
    ];
  } catch {
    throw new Error("fast ABI decode failed");
  }
}

export function decodeClaimData(data: `0x${string}`): readonly unknown[] {
  let decoded = claimDataCache.get(data);
  if (decoded === undefined) {
    decoded = Object.freeze(fastDecodeClaimData(data));
    claimDataCache.set(data, decoded);
  }
  return decoded;
}
