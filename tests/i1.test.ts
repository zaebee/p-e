import { describe, expect, it } from "vitest";
import { checkI1 } from "../src/checks/i1.js";
import { loadCorpus } from "../src/manifest.js";

describe("I-1", () => {
  it("reports one finding per producer", async () => {
    const findings = checkI1(await loadCorpus("."));
    expect(findings.map((f) => f.producer).sort()).toEqual(["apex", "hivemark"]);
  });

  it("does not collapse a not-observed value onto a negative one", async () => {
    for (const f of checkI1(await loadCorpus("."))) {
      expect(["CONFORMS", "UNDECIDABLE"]).toContain(f.verdict);
      expect(f.reason.length).toBeGreaterThan(0);
    }
  });
});
