import { decodeAbiParameters } from "viem";
import { describe, expect, it } from "vitest";
import { parseHivemark } from "../src/adapters/hivemark.js";
import { CLAIM_TYPES, decodeClaimData } from "../src/checks/claim-schema.js";
import { loadCorpus } from "../src/manifest.js";

interface Stored {
  attestation: { uid: string; message: { data: string; time: string } };
}

describe("Fast ABI claim decoding differential tests", () => {
  it("agrees exactly with viem decodeAbiParameters on all corpus records", async () => {
    const corpus = await loadCorpus(".");
    const raw = parseHivemark(corpus, "hivemark/attestations.json") as Stored[];
    expect(raw.length).toBeGreaterThan(0);

    for (const e of raw) {
      const hex = e.attestation.message.data;
      const viemDecoded = decodeAbiParameters(CLAIM_TYPES, hex as `0x${string}`);
      const fastDecoded = decodeClaimData(hex as `0x${string}`);

      expect(fastDecoded).toEqual(viemDecoded);
    }
  });
});
