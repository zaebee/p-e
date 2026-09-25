import { decodeAbiParameters, encodeAbiParameters } from "viem";
import { describe, expect, it } from "vitest";
import { CLAIM_TYPES, FIELD, decodeClaimData } from "../src/checks/claim-schema.js";

/** A distinct encoded claim per `pr`, so every payload is a different key. */
function claim(pr: number): `0x${string}` {
  return encodeAbiParameters(CLAIM_TYPES, [
    `0x${"11".repeat(32)}`,
    "owner/repo",
    pr,
    "0".repeat(40),
    "src/file.ts",
    1,
    "correctness",
    "high",
    90,
    1,
    3,
    `0x${"22".repeat(32)}`,
  ]);
}

describe("decodeClaimData", () => {
  it("returns the same decode for the same data", () => {
    const data = claim(1);
    expect(decodeClaimData(data)).toBe(decodeClaimData(data));
  });

  it("refuses a write to the shared decode rather than poisoning the cache", () => {
    const decoded = decodeClaimData(claim(2)) as unknown[];
    expect(() => {
      decoded[FIELD.verdict] = 99;
    }).toThrow(TypeError);
    expect(decodeClaimData(claim(2))[FIELD.verdict]).toBe(1);
  });

  it("still holds the first payload after a scan longer than any cap", () => {
    const first = decodeClaimData(claim(100_000));
    for (let pr = 100_001; pr < 103_000; pr++) decodeClaimData(claim(pr));
    expect(decodeClaimData(claim(100_000))).toBe(first);
  });

  it("agrees with viem decodeAbiParameters on decoded values", () => {
    for (let pr = 1; pr <= 10; pr++) {
      const hex = claim(pr);
      expect(decodeClaimData(hex)).toEqual(decodeAbiParameters(CLAIM_TYPES, hex));
    }
  });
});
