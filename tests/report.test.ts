import { describe, expect, it } from "vitest";
import { loadCorpus } from "../src/manifest.js";
import { renderReport, runAll } from "../src/report.js";

const META = { extracted_at: "2026-08-28T00:00:00.000Z", artifacts: 11, runId: "02" };

describe("report", () => {
  it("produces a finding for every invariant and producer", async () => {
    const findings = runAll(await loadCorpus("."), META.extracted_at);
    expect(new Set(findings.map((f) => f.invariant)).size).toBe(9);
    expect(findings.length).toBe(18);
  });

  it("never reports an invariant as ADMITTED on a NOT_APPLICABLE", async () => {
    const findings = runAll(await loadCorpus("."), META.extracted_at);
    const line = renderReport(findings, META)
      .split("\n")
      .find((l) => l.startsWith("| I-6"));
    expect(line).toMatch(/DEMOTED/);
  });

  it("states the count of admitted invariants without rounding it up", async () => {
    const findings = runAll(await loadCorpus("."), META.extracted_at);
    expect(renderReport(findings, META)).toMatch(/ADMITTED: \d of 9/);
  });
});
