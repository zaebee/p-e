import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `check-continuity` has taken `--root` from the start so a read probe has a
 * safe target. `put-relay` had no equivalent, so a *write* probe had none — and
 * on 2026-09-01 one went into the live corpus as `relay-0734`, which cannot be
 * removed without leaving a marker with no record. Issue #24, erratum in
 * `relay-0735`.
 *
 * The property under test is not "the flag parses". It is that a deposit named
 * elsewhere lands elsewhere, and that the live store is untouched by it.
 */
const script = join(import.meta.dirname, "..", "scripts", "put-relay.ts");
const liveStore = join(import.meta.dirname, "..", "relay");
const record = "@p-e/x0\nfrom: probe\nkind: probe\n\nscratch\n";

function put(args: readonly string[]) {
  return spawnSync("bun", ["run", script, ...args], { encoding: "utf8" });
}

describe("relay-put --root", () => {
  // This is also what pins the absent-flag arithmetic, which is worth stating
  // because it is not obvious from the assertions. The arguments are
  // `[input, "--root", root]` with no `--as`, so the first `takeFlag` call runs
  // with `at === -1` and must drop nothing. Under the old form —
  // `filter((_, i) => i !== at + 1)` — `at + 1` is 0, the source file is dropped,
  // and this test fails. Measured by reintroducing the bug and running it.
  it("writes the record and its marker into the named store, not the live one", () => {
    // The source must live outside the root: loadStore reads every .txt in the
    // store directory as a record, so an input placed there is parsed as one.
    const root = mkdtempSync(join(tmpdir(), "pr-root-"));
    const src = mkdtempSync(join(tmpdir(), "pr-src-"));
    const before = readdirSync(liveStore).length;
    try {
      const input = join(src, "in.txt");
      writeFileSync(input, record);

      const out = put([input, "--root", root]);
      expect(out.status).toBe(0);
      expect(out.stdout).toContain("stored relay-0001");

      expect(existsSync(join(root, "relay-0001.txt"))).toBe(true);
      expect(existsSync(join(root, "history", "relay-0001"))).toBe(true);
      expect(readFileSync(join(root, "relay-0001.txt"), "utf8")).toContain(
        "assigned-id: relay-0001",
      );

      expect(readdirSync(liveStore)).toHaveLength(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(src, { recursive: true, force: true });
    }
  });

  it("refuses a flag with no value rather than taking the next argument", () => {
    const out = put(["--root"]);
    expect(out.status).toBe(1);
    expect(out.stderr).toContain("--root needs a value");
  });

  it("takes both flags at once without either eating the other's argument", () => {
    const root = mkdtempSync(join(tmpdir(), "pr-root-"));
    const src = mkdtempSync(join(tmpdir(), "pr-src-"));
    const before = readdirSync(liveStore).length;
    try {
      const input = join(src, "in.txt");
      writeFileSync(input, record);

      const out = put([input, "--as", "probe-agent", "--root", root]);
      expect(out.status).toBe(0);
      expect(readFileSync(join(root, "relay-0001.txt"), "utf8")).toContain(
        "deposited-by: probe-agent",
      );
      expect(readdirSync(liveStore)).toHaveLength(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(src, { recursive: true, force: true });
    }
  });

  // The second `takeFlag` call — `--root` absent — is deliberately not covered.
  // Exercising it means a deposit with no root, which writes to the live corpus,
  // and that is the thing this whole change exists to prevent. Both calls go
  // through one helper, so the arithmetic is pinned once by the test above; a
  // test that wrote a record to prove a flag was parsed would cost more than it
  // establishes.
});
