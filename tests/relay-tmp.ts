import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "vitest";

/**
 * A relay root that cleans itself up.
 *
 * Two test files were each creating temp directories and neither removed them:
 * `relay-lite-publish` leaked one per test until #38, and `relay-lite-roundtrip`
 * leaked four per run. The suite runs on every commit, so the system temp
 * directory accumulates one tree per test per run — 86 had built up before the
 * first of these was noticed.
 *
 * One helper rather than the same ten lines in both files. That is the argument
 * this store has already made five times about protocol rules, and it costs
 * less here: two copies of a cleanup hook do not break anything when they
 * drift, they just stop being the same thing a reader has to check twice.
 *
 * Not named `*.test.ts`, so vitest's `tests/**\/*.test.ts` include does not
 * collect it as a suite.
 */
const roots: string[] = [];

afterEach(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  roots.length = 0;
});

/**
 * Make a relay root, with `in/` and `tmp/` already present.
 *
 * `publish` creates them itself, but a test staging a collision writes into
 * `in/` before calling it, and `mkdtempSync` makes only the root.
 */
export function relayRoot(prefix = "relay-lite-"): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(dir, "in"), { recursive: true });
  mkdirSync(join(dir, "tmp"), { recursive: true });
  roots.push(dir);
  return dir;
}
