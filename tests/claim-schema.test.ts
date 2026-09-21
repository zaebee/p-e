import { encodeAbiParameters } from "viem";
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
    // i1 and i4 each walk the attestations in the same order, so an evicting
    // cache smaller than the scan drops every entry just before the second
    // walk wants it: 100% hits become 0%, and nothing else in the run changes
    // to say so. 3000 is past the 2048-entry cap this cache used to carry.
    const first = decodeClaimData(claim(100_000));
    for (let pr = 100_001; pr < 103_000; pr++) decodeClaimData(claim(pr));
    expect(decodeClaimData(claim(100_000))).toBe(first);
  });
});
