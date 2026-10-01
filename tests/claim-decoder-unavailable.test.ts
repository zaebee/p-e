import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCorpus } from "../src/manifest.js";

const ATTESTATIONS = "hivemark/attestations.json";

/** The corpus with one claim in upper case: valid, and declined by the fast path. */
async function corpusNeedingViem(): Promise<Map<string, Uint8Array>> {
  const files = await loadCorpus(".");
  const held = files.get(ATTESTATIONS);
  if (held === undefined) throw new Error(`${ATTESTATIONS} is not in the corpus`);
  const entries = JSON.parse(new TextDecoder().decode(held)) as {
    attestation: { message: { data: string } };
  }[];
  const first = entries[0];
  if (first === undefined) throw new Error("the corpus holds no attestation");
  first.attestation.message.data = `0x${first.attestation.message.data.slice(2).toUpperCase()}`;
  files.set(ATTESTATIONS, new TextEncoder().encode(JSON.stringify(entries)));
  return files;
}

afterEach(() => {
  vi.doUnmock("node:module");
  vi.resetModules();
});

describe("a decoder that cannot be loaded", () => {
  it("decodes the whole corpus while viem is there to load", async () => {
    // The control. With viem present the same corpus decodes completely, so
    // whatever the next test sees is the loader and not the upper-case claim.
    const { recomputeSuperseded } = await import("../src/checks/i4.js");
    expect(recomputeSuperseded(await corpusNeedingViem()).undecodable).toBe(0);
  });

  it("stops the run instead of being counted as an undecodable record", async () => {
    vi.resetModules();
    vi.doMock("node:module", () => ({
      createRequire: () => () => {
        throw new Error("Cannot find package 'viem'");
      },
    }));
    const { DecoderUnavailableError } = await import("../src/checks/claim-schema.js");
    const { checkI1 } = await import("../src/checks/i1.js");
    const { checkI4 } = await import("../src/checks/i4.js");
    const files = await corpusNeedingViem();

    // Before the callers rethrew, both returned findings: "1 undecodable" and
    // UNDECIDABLE, about a claim that decodes — an installation fault
    // published as a verdict on the producer.
    expect(() => checkI1(files)).toThrow(DecoderUnavailableError);
    expect(() => checkI4(files)).toThrow(DecoderUnavailableError);
  });
});
