import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertFreeToWrite, parseRunId, reportPath } from "../src/run.js";

describe("parseRunId", () => {
  it("takes a two-digit run id", () => {
    expect(parseRunId(["--run", "02"])).toBe("02");
  });

  it("refuses a missing run id, because the run number is the identity", () => {
    expect(() => parseRunId([])).toThrow(/--run/);
  });

  it("refuses a run id that is not two digits", () => {
    expect(() => parseRunId(["--run", "2"])).toThrow(/two digits/);
    expect(() => parseRunId(["--run", "abc"])).toThrow(/two digits/);
  });
});

describe("reportPath", () => {
  it("names the file by the extraction date and the run", () => {
    expect(reportPath("02", "2026-08-28T14:18:43.751Z")).toBe(
      "docs/reports/2026-08-28-conformance-02.md",
    );
  });
});

describe("assertFreeToWrite", () => {
  it("passes when nothing is there", async () => {
    await expect(
      assertFreeToWrite(join(mkdtempSync(join(tmpdir(), "p-e-")), "r.md")),
    ).resolves.toBeUndefined();
  });

  it("fails hard rather than overwriting an existing run", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "p-e-")), "r.md");
    writeFileSync(path, "run 01");
    await expect(assertFreeToWrite(path)).rejects.toThrow(/already exists/);
  });
});
