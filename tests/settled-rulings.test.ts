import { describe, expect, it } from "vitest";
import { NOT_YET_IMPLEMENTED, RULINGS } from "../src/conformance/settled.js";
import { loadCorpus } from "../src/manifest.js";
import { runAll } from "../src/report.js";

/**
 * Does the reader agree with what the catalogue has ruled?
 *
 * A settled ruling and the reader's current behaviour are different things. Until
 * this file existed, nothing here could tell them apart: I-3 / hivemark was ruled
 * `VIOLATES` at relay-0174 while `src/checks/i3.ts` returned `UNDECIDABLE`, and the
 * only record of the disagreement was prose in a relay record and a closing report.
 *
 * These tests do not repair anything and no run consults the table. They make the
 * gap a measurement, and they make closing it mechanical — repair the check and the
 * pinned divergence fails, saying so.
 */

const findings = async () => {
  const files = await loadCorpus(".");
  return runAll(files, "2026-08-28T14:18:43.751Z");
};

describe("the reader against what the catalogue has settled", () => {
  for (const ruling of RULINGS) {
    const key = `${ruling.invariant}/${ruling.producer}`;
    const pending = NOT_YET_IMPLEMENTED[key];

    it(`${key} — ruled ${ruling.verdict} at ${ruling.ruledAt}`, async () => {
      const found = (await findings()).find(
        (f) => f.invariant === ruling.invariant && f.producer === ruling.producer,
      );
      expect(found, `${key} produced no finding`).toBeDefined();

      if (pending) {
        // Pinned as diverging. When the check is repaired this fails, and the
        // NOT_YET_IMPLEMENTED entry must be removed in the same change — which is
        // the only way the gap closes without someone remembering to.
        expect(
          found?.verdict,
          `${key} now matches the ruling; remove its NOT_YET_IMPLEMENTED entry`,
        ).not.toBe(ruling.verdict);
      } else {
        expect(found?.verdict).toBe(ruling.verdict);
      }
    });
  }

  it("every pending entry names a ruling that exists", () => {
    for (const key of Object.keys(NOT_YET_IMPLEMENTED)) {
      const [invariant, producer] = key.split("/");
      expect(
        RULINGS.some((r) => r.invariant === invariant && r.producer === producer),
        `${key} is pending against no ruling`,
      ).toBe(true);
    }
  });

  it("a ruling records who decided it, since a ruling is not a reading", () => {
    for (const r of RULINGS) {
      expect(r.ruledBy.length, `${r.invariant}/${r.producer} names no decider`).toBeGreaterThan(0);
      expect(r.ruledAt).toMatch(/^relay-\d{4}$/);
      expect(r.grounds.length).toBeGreaterThan(40);
    }
  });
});
