import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The check computes MATCHES / DIVERGES / UNCHECKABLE and then has to hand one
 * answer to a caller. Until relay-0731 it handed `1` both for a divergence and
 * for a store it could not open, so CI could not tell "this store has a defect"
 * from "I could not read this store" — the substitution the check exists to
 * refuse, performed on the way out.
 *
 * Three outcomes, so three tests. Without these the collapse can return silently.
 */
const script = join(import.meta.dirname, "..", "scripts", "check-continuity.ts");

function run(root?: string) {
  const args = ["run", script, ...(root === undefined ? [] : ["--root", root])];
  return spawnSync("bun", args, { encoding: "utf8" });
}

const header = (id: string) =>
  `deposited-by: local\nprovenance: as-received\nassigned-id: ${id}\n---\n`;

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
      const out = run(dir);
      expect(out.status).toBe(1);
      expect(out.stdout).toContain("unaccounted divergence");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("exits 2, not 1, when the store cannot be read at all", () => {
    const gone = join(tmpdir(), "cc-no-such-store-3f8a1c");
    const out = run(gone);
    expect(out.status).toBe(2);
    expect(out.stderr).toContain("REFUSED");
    // The refusal must not read as a finding about anybody's record.
    expect(out.stdout).not.toContain("divergence");
  });
});
