import { describe, expect, it } from "vitest";
import { checkI5, isoWeekOf } from "../src/checks/i5.js";
import { loadCorpus } from "../src/manifest.js";

describe("isoWeekOf", () => {
  it("puts a January date in the previous year's final week when the rule says so", () => {
    expect(isoWeekOf("2027-01-01T00:00:00.000Z")).toBe("2026-W53");
  });

  it("names the week of a mid-August date", () => {
    expect(isoWeekOf("2026-08-14T00:00:00.000Z")).toBe("2026-W33");
  });
});

describe("I-5", () => {
  it("cannot decide the no-backfill half from a single anchor", async () => {
    const h = checkI5(await loadCorpus(".")).find((f) => f.producer === "hivemark");
    expect(h?.verdict).toBe("UNDECIDABLE");
    expect(h?.reason).toMatch(/one period/);
  });
});
