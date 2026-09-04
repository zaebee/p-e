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
 * Four outcomes now, so four tests. Without these the collapse can return
 * silently — and it nearly did: making the script authority-aware gave an
 * unconfigured `P_E_STORE_IDENTITY` an uncaught throw, which exits 1, so a
 * missing environment variable would have been reported as a divergence in
 * somebody's record.
 */
const script = join(import.meta.dirname, "..", "scripts", "check-continuity.ts");

/**
 * The identity is supplied here because the script now requires one.
 *
 * RUN FROM OUTSIDE THE REPOSITORY, and that is not tidiness. `bun` loads `.env`
 * from the working directory automatically, so deleting a variable from the
 * spawned environment does not run the script without it — bun re-reads the file
 * from disk. The exit-3 case below would then pass or fail on what happens to be
 * in `.env`, and would stop testing anything the day somebody adds the key
 * there. Changing directory is what makes the absence real; changing the
 * environment is what looks like it does. AGENTS.md carries the rule, learned in
 * ../hivemark from a key that reached a transcript exactly this way.
 *
 * `STORE_ROOT` is resolved against its own module rather than the working
 * directory, so the live-store case still finds the corpus from anywhere.
 */
const TEST_AUTHORITY = "p-e/relay-under-test";

/** A directory with no `.env` in it, and none above it that bun will find. */
const OUTSIDE = mkdtempSync(join(tmpdir(), "cc-cwd-"));

/**
 * `null` means "configure nothing", and it is `null` rather than `undefined`
 * because an explicitly passed `undefined` selects the default parameter — so
 * `run(undefined, undefined)` supplied an identity while reading as though it
 * withheld one, and the exit-3 case passed through the configured path and
 * returned 0. The distinction this whole file is about, in its own harness.
 */
function run(root?: string, identity: string | null = TEST_AUTHORITY) {
  const args = ["run", script, ...(root === undefined ? [] : ["--root", root])];
  // Built by filtering rather than by deleting or by assigning `undefined`:
  // `delete` is refused by lint, and an explicit `undefined` value reaches
  // `spawnSync` as a property that is present, which is the opposite of absent.
  const env: NodeJS.ProcessEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key !== "P_E_STORE_IDENTITY"),
  );
  if (identity !== null) env.P_E_STORE_IDENTITY = identity;
  return spawnSync("bun", args, { encoding: "utf8", env, cwd: OUTSIDE });
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

  it("exits 3, not 1, when this store's identity is not configured", () => {
    // 1 is a finding about somebody's record. A missing environment variable is
    // a fact about how this process was started, and the two must not share a
    // door. 3 rather than 2 because the records here read perfectly well — what
    // is missing is whose they are.
    const out = run(undefined, null);
    expect(out.status).toBe(3);
    expect(out.stderr).toContain("identity is not configured");
    expect(out.stderr).toContain("P_E_STORE_IDENTITY");
    expect(out.stderr).toContain("This is not a finding");
    // And it must not be mistaken for a verdict on the corpus.
    expect(out.stdout).not.toContain("divergence");
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
