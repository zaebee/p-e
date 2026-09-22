import { decodeAbiParameters, encodeAbiParameters } from "viem";
import { describe, expect, it } from "vitest";
import { parseHivemark } from "../src/adapters/hivemark.js";
import { CLAIM_TYPES, FIELD, decodeClaimData } from "../src/checks/claim-schema.js";
import { loadCorpus } from "../src/manifest.js";

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

  it("matches viem decodeAbiParameters output exactly on corpus records and fuzzed inputs", async () => {
    const files = await loadCorpus(".");
    const raw = parseHivemark(files, "hivemark/attestations.json") as Array<{
      attestation: { message: { data: `0x${string}` } };
    }>;

    for (const e of raw) {
      const data = e.attestation.message.data;
      const expected = decodeAbiParameters(CLAIM_TYPES, data);
      const actual = decodeClaimData(data);
      expect(JSON.stringify(actual)).toBe(JSON.stringify(expected));
    }

    // Fuzz inputs with edge cases (unicode, newlines, empty strings, boundary numbers)
    for (let i = 0; i < 100; i++) {
      const fuzzed = encodeAbiParameters(CLAIM_TYPES, [
        `0x${(i % 256).toString(16).padStart(2, "0").repeat(32)}`,
        `repo_${i}_\n\r\t_⚡_🚀`,
        i * 1000,
        "a".repeat(40),
        `src/path_${i}/file.ts`,
        i + 1,
        i % 2 === 0 ? "correctness" : "security",
        i % 3 === 0 ? "high" : "low",
        i % 100,
        i % 4,
        i % 10,
        `0x${((i + 1) % 256).toString(16).padStart(2, "0").repeat(32)}`,
      ]);
      const expected = decodeAbiParameters(CLAIM_TYPES, fuzzed);
      const actual = decodeClaimData(fuzzed);
      expect(JSON.stringify(actual)).toBe(JSON.stringify(expected));
    }
  });
});
