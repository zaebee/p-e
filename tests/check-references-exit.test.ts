import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TEST_AUTHORITY, runScript, stackTraceLines } from "./spawn-script.js";

/**
 * `check-references` says it exits 0 whatever it finds, because an unreferenced
 * record is not a defect. Nothing tested that, and when the script was made
 * authority-aware two calls broke it in one edit: `storeIdentity()` and, one
 * line above, `loadStore` — each exiting 1 with a raw stack trace under a
 * docstring promising 0. gemini-code-assist found them by reading, in two
 * rounds. This is so the next one is found by running.
 */
const NO_SUCH_STORE = join(tmpdir(), "cr-no-such-store-7b2e4d");

const run = (options?: Parameters<typeof runScript>[1]) =>
  runScript("check-references.ts", options);

describe("check-references exit codes", () => {
  it("exits 0 on the live store, whatever it finds", () => {
    const out = run();
    expect(out.status).toBe(0);
    // And it produced the report, rather than exiting 0 by doing nothing.
    expect(out.stdout).toContain("REFERENCED");
  });

  it("exits 3, not 1, when this store's identity is not configured", () => {
    const out = run({ identity: null });
    expect(out.status).toBe(3);
    expect(out.stderr).toContain("identity is not configured");
    expect(out.stderr).toContain("P_E_STORE_IDENTITY");
    expect(out.stderr).toContain("not a finding");
    // No half-report: a scoped report could not be produced, so none is.
    expect(out.stdout).toBe("");
  });

  it("exits 2, not 1, when the store cannot be read at all", () => {
    // The same distinction the sibling script draws, and it matters more here:
    // this script documents 0 as its answer whatever it finds, so 1 would
    // contradict its own docstring rather than merely overloading a code.
    const out = run({ root: NO_SUCH_STORE, identity: TEST_AUTHORITY });
    expect(out.status).toBe(2);
    expect(out.stderr).toContain("REFUSED");
    expect(out.stderr).toContain("not a finding");
    expect(out.stdout).toBe("");
  });

  it("refuses without a stack trace, which is what it did before", () => {
    // A refusal reads as a decision; a stack trace reads as a crash, and the
    // difference is this script's whole subject.
    for (const out of [run({ identity: null }), run({ root: NO_SUCH_STORE })]) {
      expect(stackTraceLines(out.stderr)).toEqual([]);
      // The refusal did say something, so an empty stderr cannot pass either.
      expect(out.stderr).toContain("REFUSED");
    }
  });
});
