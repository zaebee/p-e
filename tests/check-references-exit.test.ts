import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

/**
 * `check-references` says it exits 0 whatever it finds, because an unreferenced
 * record is not a defect. Nothing tested that, and when the script was made
 * authority-aware the uncaught `storeIdentity()` broke it: exit 1 with a raw
 * stack trace, under a docstring promising 0. gemini-code-assist on PR #93
 * found it by reading; this is so the next one is found by running.
 *
 * The sibling file `check-continuity-exit.test.ts` carries the same shape for
 * the same reasons, including why the child runs from outside the repository.
 */
const script = join(import.meta.dirname, "..", "scripts", "check-references.ts");

/**
 * Two independent guards against the child seeing a `.env`, and both are here
 * because this test's failure mode is silent — it would pass while testing
 * nothing.
 *
 * `--no-env-file` turns off bun's automatic loading; `cwd` outside the
 * repository removes the file it would load. Measured in this repo with a probe
 * key written into `.env`: plain `bun run` saw it, `env -u KEY bun run` STILL
 * saw it — the trap, reproduced here rather than cited — and `--no-env-file` did
 * not, in either flag position. `--no-env-file` is the precise mechanism and
 * only works where the bun command line is ours; the directory is what survives
 * anything spawning bun on its own. gemini-code-assist on PR #91 asked for the
 * flag (naming it `--no-env`, which does not exist).
 */
const OUTSIDE = mkdtempSync(join(tmpdir(), "cr-cwd-"));

/** `null` withholds the identity; an explicit `undefined` would select the default. */
function run(identity: string | null = "p-e/relay-under-test", root?: string) {
  const env: NodeJS.ProcessEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key !== "P_E_STORE_IDENTITY"),
  );
  if (identity !== null) env.P_E_STORE_IDENTITY = identity;
  const args = ["--no-env-file", "run", script, ...(root === undefined ? [] : ["--root", root])];
  return spawnSync("bun", args, { encoding: "utf8", env, cwd: OUTSIDE });
}

// The directory is this file's, so this file removes it. Left behind, every run
// of the suite deposits another empty `cr-cwd-` in the system temp directory.
afterAll(() => rmSync(OUTSIDE, { recursive: true, force: true }));

describe("check-references exit codes", () => {
  it("exits 0 on the live store, whatever it finds", () => {
    const out = run();
    expect(out.status).toBe(0);
    // And it did produce the report, rather than exiting 0 by doing nothing.
    expect(out.stdout).toContain("REFERENCED");
  });

  it("exits 3, not 1, when this store's identity is not configured", () => {
    const out = run(null);
    expect(out.status).toBe(3);
    expect(out.stderr).toContain("identity is not configured");
    expect(out.stderr).toContain("P_E_STORE_IDENTITY");
    expect(out.stderr).toContain("not a finding");
    // No half-report: a scoped report could not be produced, so none is.
    expect(out.stdout).toBe("");
  });

  it("exits 2, not 1, when the store cannot be read at all", () => {
    // Same distinction the sibling script draws, and it matters more here: this
    // script documents 0 as its answer whatever it finds, so 1 would contradict
    // its own docstring rather than merely overloading a code.
    const out = run(undefined, join(tmpdir(), "cr-no-such-store-7b2e4d"));
    expect(out.status).toBe(2);
    expect(out.stderr).toContain("REFUSED");
    expect(out.stderr).toContain("not a finding");
    expect(out.stdout).toBe("");
  });

  it("refuses without a stack trace, which is what it did before", () => {
    // The uncaught version printed source lines from authority.ts. A refusal
    // reads as a decision; a stack trace reads as a crash, and this script's
    // whole subject is the difference between the two.
    // Matched by SHAPE, not by substring. A first version asserted the absence
    // of "at " and failed on the refusal's own prose — "cannot read the store at
    // /tmp/…" — which would equally have passed the identity case for no reason.
    // A bun stack trace is numbered source lines and indented `at` frames; both
    // are line shapes, so that is what this looks for.
    const SOURCE_LINE = /^\s*\d+\s*\|/;
    const STACK_FRAME = /^\s+at\s/;
    for (const out of [run(null), run(undefined, join(tmpdir(), "cr-no-such-store-7b2e4d"))]) {
      const lines = out.stderr.split("\n");
      expect(lines.filter((l) => SOURCE_LINE.test(l))).toEqual([]);
      expect(lines.filter((l) => STACK_FRAME.test(l))).toEqual([]);
      // And the refusal did say something, so an empty stderr cannot pass this.
      expect(out.stderr).toContain("REFUSED");
    }
  });
});
