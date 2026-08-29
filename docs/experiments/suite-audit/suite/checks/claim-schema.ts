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
