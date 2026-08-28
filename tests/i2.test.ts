import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { checkI2 } from "../src/checks/i2.js";
import { type Manifest, loadCorpus } from "../src/manifest.js";

const meta = async (): Promise<Manifest> =>
  JSON.parse(await readFile("corpus/manifest.json", "utf8"));

describe("I-2", () => {
  it("holds every occurrence time before the extraction time", async () => {
    const findings = checkI2(await loadCorpus("."), (await meta()).extracted_at);
    expect(findings.some((f) => f.verdict === "VIOLATES")).toBe(false);
  });

  it("does not claim more than artifacts can settle", async () => {
    const findings = checkI2(await loadCorpus("."), (await meta()).extracted_at);
    expect(findings.every((f) => f.reason.includes("occurrence"))).toBe(true);
  });

  it("will not conclude occurrence semantics from a timestamp spread", async () => {
    const h = checkI2(await loadCorpus("."), (await meta()).extracted_at).find(
      (f) => f.producer === "hivemark",
    );
    expect(h?.verdict).toBe("UNDECIDABLE");
  });
});
