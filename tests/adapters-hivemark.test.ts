import { describe, expect, it } from "vitest";
import { readHivemark } from "../src/adapters/hivemark.js";
import { loadCorpus } from "../src/manifest.js";

describe("readHivemark", () => {
  it("projects every published attestation into an envelope", async () => {
    const envelopes = readHivemark(await loadCorpus("."));
    expect(envelopes.length).toBe(932);
  });

  it("takes subject from recipient, which is the claimant in this producer", async () => {
    const [first] = readHivemark(await loadCorpus("."));
    expect(first?.subject).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(first?.attester).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(first?.subject).not.toBe(first?.attester);
  });

  it("converts the occurrence time to ISO without inventing precision", async () => {
    const [first] = readHivemark(await loadCorpus("."));
    expect(first?.occurred_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/);
  });
});
