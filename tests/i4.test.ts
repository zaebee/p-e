import { describe, expect, it } from "vitest";
import { checkI4, recomputeSuperseded } from "../src/checks/i4.js";
import { loadCorpus } from "../src/manifest.js";

describe("I-4", () => {
  it("recomputes supersession from published bytes alone", async () => {
    const summary = recomputeSuperseded(await loadCorpus("."));
    expect(summary.groups).toBeGreaterThan(0);
    expect(summary.undecodable).toBe(0);
  });

  it("reports a verdict per producer", async () => {
    const findings = checkI4(await loadCorpus("."));
    expect(findings.map((f) => f.producer).sort()).toEqual(["apex", "hivemark"]);
  });
});
