import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { classOf, coverageOf } from "../src/coverage.js";
import { type Manifest, loadCorpus } from "../src/manifest.js";
import { runAllWithCoverage } from "../src/report.js";

const meta = async (): Promise<Manifest> =>
  JSON.parse(await readFile("corpus/manifest.json", "utf8"));

describe("corpus coverage", () => {
  it("groups the four log files into one class", () => {
    expect(classOf("apex/log/a.md")).toBe("apex/log/*.md");
    expect(classOf("apex/health.json")).toBe("apex/health.json");
  });

  it("gives every artifact class in the manifest a disposition", async () => {
    const manifest = await meta();
    const { byInvariant } = runAllWithCoverage(await loadCorpus("."), manifest.extracted_at);
    const coverage = coverageOf(manifest, new Set(), byInvariant);

    const classes = new Set(manifest.entries.map((e) => classOf(e.path)));
    expect(new Set(coverage.map((c) => c.cls))).toEqual(classes);
    // Omission from the matrix is not a disposition — relay-0023.
    expect(coverage.every((c) => c.disposition.length > 0)).toBe(true);
  });

  it("requires a stated reason from every excluded class", async () => {
    const manifest = await meta();
    const { byInvariant } = runAllWithCoverage(await loadCorpus("."), manifest.extracted_at);
    const unexplained = coverageOf(manifest, new Set(), byInvariant)
      .filter((c) => c.disposition === "EXCLUDED_WITH_REASON" && c.reason.trim().length === 0)
      .map((c) => c.cls);
    expect(unexplained).toEqual([]);
  });

  it("attributes by measurement: attestations.json is opened by several checks", async () => {
    const manifest = await meta();
    const { byInvariant } = runAllWithCoverage(await loadCorpus("."), manifest.extracted_at);
    const examined = coverageOf(manifest, new Set(), byInvariant).find(
      (c) => c.cls === "hivemark/attestations.json",
    );
    expect(examined?.invariants.length).toBeGreaterThan(3);
  });
});
