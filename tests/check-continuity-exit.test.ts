import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runScript, stackTraceLines } from "./spawn-script.js";

/**
 * The check computes MATCHES / DIVERGES / UNCHECKABLE and then has to hand one
 * answer to a caller. Until relay-0731 it handed `1` both for a divergence and
 * for a store it could not open, so CI could not tell "this store has a defect"
 * from "I could not read this store" — the substitution the check exists to
 * refuse, performed on the way out.
 *
 * Four outcomes now, so four tests. Without these the collapse can return
 * silently — and it nearly did: making the script authority-aware gave an
 * unconfigured `P_E_STORE_IDENTITY` an uncaught throw, which exits 1, so a
 * missing environment variable would have been reported as a divergence in
 * somebody's record.
 */
const header = (id: string) =>
  `deposited-by: local\nprovenance: as-received\nassigned-id: ${id}\n---\n`;

const run = (options?: Parameters<typeof runScript>[1]) =>
  runScript("check-continuity.ts", options);

describe("check-continuity exit codes", () => {
  it("exits 0 on the live store, which carries only accounted divergences", () => {
    expect(run().status).toBe(0);
  });

  it("exits 1 on a divergence nobody has accounted for", () => {
    const dir = mkdtempSync(join(tmpdir(), "cc-diverge-"));
    try {
      writeFileSync(
        join(dir, "relay-0001.txt"),
        `${header("relay-0001")}@p-e/x0\nfrom: probe\nkind: probe\n\nparent\n`,
      );
      writeFileSync(
        join(dir, "relay-0002.txt"),
        `${header("relay-0002")}@p-e/x0\nfrom: probe\nparent: relay-0001\nparent-sha256: ${"0".repeat(64)}\nkind: probe\n\nchild\n`,
      );
      const out = run({ root: dir });
      expect(out.status).toBe(1);
      expect(out.stdout).toContain("unaccounted divergence");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("exits 3, not 1, when this store's identity is not configured", () => {
    // 1 is a finding about somebody's record. A missing environment variable is
    // a fact about how this process was started, and the two must not share a
    // door. 3 rather than 2 because the records here read perfectly well — what
    // is missing is whose they are.
    const out = run({ identity: null });
    expect(out.status).toBe(3);
    expect(out.stderr).toContain("identity is not configured");
    expect(out.stderr).toContain("P_E_STORE_IDENTITY");
    expect(out.stderr).toContain("This is not a finding");
    // And it must not be mistaken for a verdict on the corpus.
    expect(out.stdout).not.toContain("divergence");
    // A refusal reads as a decision; a stack trace reads as a crash.
    expect(stackTraceLines(out.stderr)).toEqual([]);
  });

  it("exits 2, not 1, when the store cannot be read at all", () => {
    const gone = join(tmpdir(), "cc-no-such-store-3f8a1c");
    const out = run({ root: gone });
    expect(out.status).toBe(2);
    expect(out.stderr).toContain("REFUSED");
    // The refusal must not read as a finding about anybody's record.
    expect(out.stdout).not.toContain("divergence");
    expect(stackTraceLines(out.stderr)).toEqual([]);
  });
});
