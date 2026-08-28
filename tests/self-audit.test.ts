import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { classOf, coverageOf } from "../src/coverage.js";
import { type Manifest, loadCorpus } from "../src/manifest.js";
import { runAllWithCoverage } from "../src/report.js";

const meta = async (): Promise<Manifest> =>
  JSON.parse(await readFile("corpus/manifest.json", "utf8"));

async function run() {
  const manifest = await meta();
  const { findings, byInvariant } = runAllWithCoverage(
    await loadCorpus("."),
    manifest.extracted_at,
  );
  return { manifest, findings, byInvariant };
}

/** The four criteria of relay-0025, each as a test rather than a claim. */
describe("reader self-audit", () => {
  it("1 — every corpus class is examined or excluded with a reason", async () => {
    const { manifest, byInvariant } = await run();
    const coverage = coverageOf(manifest, new Set(), byInvariant);
    expect(new Set(coverage.map((c) => c.cls))).toEqual(
      new Set(manifest.entries.map((e) => classOf(e.path))),
    );
    for (const c of coverage) {
      if (c.disposition === "EXCLUDED_WITH_REASON")
        expect(c.reason.trim().length).toBeGreaterThan(0);
      else expect(c.invariants.length).toBeGreaterThan(0);
    }
  });

  it("2 — every verdict cites artifact evidence, with a count or a named field", async () => {
    const { findings } = await run();
    for (const f of findings) {
      expect(f.reason.length).toBeGreaterThan(40);
      // A reason that cites nothing checkable is a claim, not evidence.
      expect(
        /\d|\b(signer|recipient|finalUrl|offSite|gaps|since|attested|genome|judge)\b/.test(
          f.reason,
        ),
      ).toBe(true);
    }
  });

  it("3 — every finding declares its projections, empty or not", async () => {
    const { findings } = await run();
    for (const f of findings) expect(Array.isArray(f.projections)).toBe(true);
    // At least one finding must admit a projection; a run declaring none across
    // the board would mean the field is decorative.
    expect(findings.some((f) => f.projections.length > 0)).toBe(true);
  });

  it("4 — no CONFORMS rests on a projection that carries it", async () => {
    const { findings } = await run();
    for (const f of findings.filter((x) => x.verdict === "CONFORMS")) {
      for (const p of f.projections) {
        // A conforming finding may name a projection only while saying the
        // conforming half does not depend on it.
        expect(p).toMatch(/native|does not depend/i);
      }
    }
  });
});
