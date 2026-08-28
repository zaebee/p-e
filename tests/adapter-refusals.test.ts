import { describe, expect, it } from "vitest";
import { apexLog } from "../src/adapters/apex.js";
import { readHivemark } from "../src/adapters/hivemark.js";
import { loadCorpus } from "../src/manifest.js";

/**
 * Five coercions that used to fail open — malformed input producing a value
 * that reads as valid. Each is demonstrated against a mutated copy of the real
 * corpus; none fires on the corpus itself.
 */
const decoder = new TextDecoder();
const encoder = new TextEncoder();

const withAttestation = async (mutate: (a: Record<string, unknown>) => void) => {
  const files = await loadCorpus(".");
  const raw = JSON.parse(decoder.decode(files.get("hivemark/attestations.json") as Uint8Array));
  mutate(raw[0]);
  files.set("hivemark/attestations.json", encoder.encode(JSON.stringify(raw)));
  return files;
};

describe("adapter coercions refuse rather than invent", () => {
  it("rejects a message.time that is not decimal seconds", async () => {
    // "1e12" would have parsed to an instant after the extraction time and
    // flipped I-2/hivemark from UNDECIDABLE to VIOLATES.
    for (const time of ["1e12", "0x2", "", " 1 "]) {
      const files = await withAttestation((a) => {
        (a.attestation as { message: { time: string } }).message.time = time;
      });
      expect(() => readHivemark(files)).toThrow(/not decimal seconds/);
    }
  });

  it("rejects an absent envelope_version rather than stringifying it", async () => {
    const files = await withAttestation((a) => {
      a.envelope_version = undefined;
    });
    expect(() => readHivemark(files)).toThrow(/not a number/);
  });

  it("rejects a frontmatter block scalar rather than returning its indicator", async () => {
    const files = await loadCorpus(".");
    const name = [...files.keys()].find((k) => k.startsWith("apex/log/")) as string;
    const gutted = decoder
      .decode(files.get(name) as Uint8Array)
      .replace(/^observed: ".*"$/m, "observed: >");
    files.set(name, encoder.encode(gutted));
    expect(() => apexLog(files)).toThrow(/block scalar/);
  });

  it("rejects an unbalanced frontmatter quote rather than collapsing it", async () => {
    const files = await loadCorpus(".");
    const name = [...files.keys()].find((k) => k.startsWith("apex/log/")) as string;
    const broken = decoder
      .decode(files.get(name) as Uint8Array)
      .replace(/^observed: "/m, 'observed: x"');
    files.set(name, encoder.encode(broken));
    expect(() => apexLog(files)).toThrow(/unbalanced quote|does not close/);
  });

  it("still reads the unmutated corpus", async () => {
    const files = await loadCorpus(".");
    expect(readHivemark(files).length).toBe(932);
    expect(apexLog(files).length).toBe(4);
  });
});
