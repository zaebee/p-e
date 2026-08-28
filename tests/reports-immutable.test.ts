import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * A committed report must equal its bytes at the commit that introduced it.
 *
 * The CLI already refuses to write over a report that exists. That guard is
 * defeated by deleting the file first, which is what happened to run 02 in
 * d651fae — the run was regenerated under a corrected methodology and kept its
 * old number, so the record said one thing and the artifact said another for
 * three commits.
 *
 * A guard on the filesystem cannot see that. Git can, so the check lives here.
 */
const DIR = "docs/reports";
const git = (...args: string[]): string =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

describe("reports are immutable", () => {
  const reports = readdirSync(DIR).filter((n) => n.endsWith(".md"));

  it("finds reports to check", () => {
    expect(reports.length).toBeGreaterThan(0);
  });

  for (const name of reports) {
    it(`${name} matches the commit that introduced it`, () => {
      const path = `${DIR}/${name}`;
      const commits = git("log", "--format=%H", "--no-renames", "--", path).trim().split("\n");
      const introduced = commits.at(-1);
      // A report not yet committed has nothing to be compared against.
      if (!introduced) return;
      expect(readFileSync(path, "utf8")).toBe(git("show", `${introduced}:${path}`));
    });
  }
});
