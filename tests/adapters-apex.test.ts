import { describe, expect, it } from "vitest";
import { apexHealth, apexHistory, apexLog, readApex } from "../src/adapters/apex.js";
import { loadCorpus } from "../src/manifest.js";

describe("readApex", () => {
  it("reads the snapshot, the folded history and every log entry", async () => {
    const files = await loadCorpus(".");
    expect(Object.keys(apexHealth(files).entries).length).toBe(8);
    expect(Object.keys(apexHistory(files).hosts).length).toBe(8);
    expect(apexLog(files).length).toBe(4);
  });

  it("takes subject from the host, which is the observed in this producer", async () => {
    const envelopes = readApex(await loadCorpus("."));
    const health = envelopes.filter((e) => e.origin.file === "apex/health.json");
    expect(health.every((e) => e.subject.endsWith(".zae.life"))).toBe(true);
    expect(health.every((e) => e.attester === undefined)).toBe(true);
  });

  it("refuses a log entry missing a frontmatter field rather than reading it as empty", async () => {
    const files = await loadCorpus(".");
    const name = [...files.keys()].find((k) => k.startsWith("apex/log/")) as string;
    const bytes = files.get(name) as Uint8Array;
    const gutted = new TextDecoder()
      .decode(bytes)
      .replace(/^attested:.*$/m, "")
      .replace(/^attested:[\s\S]*?(?=^---$)/m, "");
    files.set(name, new TextEncoder().encode(gutted));
    // An absent field and an empty one must not produce the same value.
    expect(() => apexLog(files)).toThrow(/no attested field/);
  });

  it("gives every log entry a non-empty attested field", async () => {
    for (const entry of apexLog(await loadCorpus("."))) {
      expect(entry.attested.length).toBeGreaterThan(0);
    }
  });
});
