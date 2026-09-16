import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { applySync, planSync, roleProblem } from "../src/relay/mirror.js";

/**
 * The sync that carries the live store into its copy in git, and what makes it
 * stop.
 *
 * Every directory here is scratch, and removed at the end. The script runs with
 * `PE_STORE_ROOT` and `--mirror` both pointing at scratch and `--no-env-file`, so
 * neither a `.env` nor a default can aim it at a real store or at this
 * repository's `relay/`.
 */

const script = join(import.meta.dirname, "..", "scripts", "relay-sync.ts");
const rec = (id: string, text = "body") =>
  `deposited-by: t\nprovenance: authored\nassigned-id: ${id}\n---\n@p-e/x0\nfrom: a\n\n${text}\n`;

const made: string[] = [];
function temp(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  made.push(dir);
  return dir;
}
afterAll(() => {
  for (const dir of made) {
    // A test makes a directory read-only; give it back before removing.
    spawnSync("chmod", ["-R", "u+w", dir]);
    rmSync(dir, { recursive: true, force: true });
  }
});

/** A scratch store, or with `copy` a scratch copy inside a scratch git working tree. */
function dir(files: Record<string, string>, copy = false): string {
  const top = temp("p-e-sync-");
  if (copy) mkdirSync(join(top, ".git"));
  const root = join(top, "relay");
  mkdirSync(join(root, "history"), { recursive: true });
  for (const [path, text] of Object.entries(files)) writeFileSync(join(root, path), text);
  return root;
}

function sync(store: string | undefined, mirror: string, ...extra: string[]) {
  const env: NodeJS.ProcessEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key !== "PE_STORE_ROOT"),
  );
  if (store !== undefined) env.PE_STORE_ROOT = store;
  return spawnSync("bun", ["--no-env-file", "run", script, "--mirror", mirror, ...extra], {
    cwd: temp("p-e-sync-cwd-"),
    env,
    encoding: "utf8",
  });
}

const one = { "relay-0001.txt": rec("relay-0001"), "history/relay-0001": "" };
const two = { ...one, "relay-0002.txt": rec("relay-0002"), "history/relay-0002": "" };

describe("planSync", () => {
  it("copies what the store holds and the copy lacks, each record before its marker", async () => {
    const plan = await planSync(dir(two), dir(one, true));
    expect(plan.copy).toEqual(["relay-0002.txt", "history/relay-0002"]);
    expect([plan.differ, plan.onlyInMirror, plan.deletedInStore, plan.waiting]).toEqual([
      [],
      [],
      [],
      [],
    ]);
  });

  it("names a file both hold with different bytes — relay-1157's shape", async () => {
    const store = dir({ ...one, "relay-0001.txt": rec("relay-0001", "the store's") });
    const copy = dir({ ...one, "relay-0001.txt": rec("relay-0001", "git's") }, true);
    expect((await planSync(store, copy)).differ).toEqual(["relay-0001.txt"]);
  });

  it("names what the copy holds that nothing in the store explains", async () => {
    const plan = await planSync(dir({}), dir(one, true));
    expect(plan.onlyInMirror).toEqual(["relay-0001.txt", "history/relay-0001"]);
  });

  it("reports a deletion from the store without stopping, and copies the rest", async () => {
    // relay-0683 and relay-0876 are markers without records in the live store.
    const store = dir({
      "history/relay-0001": "",
      "relay-0002.txt": rec("relay-0002"),
      "history/relay-0002": "",
    });
    const plan = await planSync(store, dir(one, true));
    expect(plan.deletedInStore).toEqual(["relay-0001.txt"]);
    expect(plan.onlyInMirror).toEqual([]);
    expect(plan.copy).toEqual(["relay-0002.txt", "history/relay-0002"]);
  });

  it("copies a deletion's marker when the copy already has its record", async () => {
    const plan = await planSync(
      dir({ "history/relay-0001": "" }),
      dir({ "relay-0001.txt": rec("relay-0001") }, true),
    );
    expect(plan.copy).toEqual(["history/relay-0001"]);
    expect(plan.deletedInStore).toEqual(["relay-0001.txt"]);
  });

  it("holds back a marker with no record on either side", async () => {
    const plan = await planSync(dir({ ...one, "history/relay-0002": "" }), dir(one, true));
    expect(plan.waiting).toEqual(["history/relay-0002"]);
    expect(plan.copy).toEqual([]);
  });

  it("ignores names that are not store ids", async () => {
    const store = dir({
      ...one,
      "relay-1.txt": "x",
      ".relay-0002.tmp": "x",
      "notes.md": "x",
      "history/relay-12": "",
    });
    const plan = await planSync(store, dir(one, true));
    expect(plan).toEqual({
      copy: [],
      differ: [],
      onlyInMirror: [],
      deletedInStore: [],
      waiting: [],
    });
  });
});

describe("roleProblem", () => {
  it("refuses a copy outside git and a store inside it", () => {
    expect(roleProblem(dir(one), dir(one, true))).toBeNull();
    expect(roleProblem(dir(one), dir(one))).toMatch(/not inside a git working tree/);
    expect(roleProblem(dir(one, true), dir(one, true))).toMatch(/a copy and not the store/);
  });

  it("refuses a symlinked history/ on either side", () => {
    const elsewhere = dir({});
    const linked = (copy: boolean) => {
      const root = dir({}, copy);
      rmSync(join(root, "history"), { recursive: true });
      symlinkSync(join(elsewhere, "history"), join(root, "history"));
      return root;
    };
    expect(roleProblem(dir(one), linked(true))).toMatch(/history is a symlink/);
    expect(roleProblem(linked(false), dir(one, true))).toMatch(/history is a symlink/);
  });
});

describe("applySync", () => {
  it("never overwrites a file that appeared after planning", async () => {
    const store = dir(two);
    const copy = dir(one, true);
    const plan = await planSync(store, copy);
    writeFileSync(join(copy, "relay-0002.txt"), "arrived meanwhile");
    await expect(applySync(store, copy, plan)).rejects.toThrow(/copying relay-0002.txt/);
    expect(readFileSync(join(copy, "relay-0002.txt"), "utf8")).toBe("arrived meanwhile");
  });
});

describe("relay-sync", () => {
  it("copies, says so after each copy, and exits 0", () => {
    const copy = dir(one, true);
    const out = sync(dir(two), copy);
    expect(out.status).toBe(0);
    expect(out.stdout).toContain("copied            relay-0002.txt");
    expect(readFileSync(join(copy, "relay-0002.txt"), "utf8")).toBe(rec("relay-0002"));
    expect(readdirSync(join(copy, "history")).sort()).toEqual(["relay-0001", "relay-0002"]);
  });

  it("copies nothing with --dry-run", () => {
    const copy = dir(one, true);
    const out = sync(dir(two), copy, "--dry-run");
    expect(out.status).toBe(0);
    expect(out.stdout).toContain("would copy        relay-0002.txt");
    expect(readdirSync(copy)).not.toContain("relay-0002.txt");
  });

  it("exits 1 and copies nothing when any file disagrees", () => {
    const store = dir({ ...two, "relay-0001.txt": rec("relay-0001", "the store's") });
    const copy = dir({ ...one, "relay-0001.txt": rec("relay-0001", "git's") }, true);
    const out = sync(store, copy);
    expect(out.status).toBe(1);
    expect(out.stdout).toContain("DIFFERS           relay-0001.txt");
    expect(readdirSync(copy)).not.toContain("relay-0002.txt");
  });

  it("goes on past a deletion from the store", () => {
    const store = dir({
      "history/relay-0001": "",
      "relay-0002.txt": rec("relay-0002"),
      "history/relay-0002": "",
    });
    const copy = dir(one, true);
    const out = sync(store, copy);
    expect(out.status).toBe(0);
    expect(out.stdout).toContain("DELETED IN STORE  relay-0001.txt");
    expect(existsSync(join(copy, "relay-0002.txt"))).toBe(true);
  });

  it("exits 5 when a copy fails partway, listing only what was really copied", () => {
    const copy = dir(one, true);
    chmodSync(join(copy, "history"), 0o555);
    const out = sync(dir(two), copy);
    expect(out.status).toBe(5);
    expect(out.stdout).toContain("copied            relay-0002.txt");
    expect(out.stdout).not.toContain("copied            history/relay-0002");
    expect(out.stderr).toMatch(/stopped after 1 of 2 file\(s\): copying history\/relay-0002/);
    // The record landed before its marker, never the other way round.
    expect(existsSync(join(copy, "relay-0002.txt"))).toBe(true);
  });

  it("exits 4 when the copy is not under git, and writes nothing into it", () => {
    const notCopy = dir(one);
    const out = sync(dir(two), notCopy);
    expect(out.status).toBe(4);
    expect(readdirSync(notCopy)).not.toContain("relay-0002.txt");
  });

  it("exits 4 without PE_STORE_ROOT, and with a malformed one, without a stack trace", () => {
    const missing = sync(undefined, dir(one, true));
    expect(missing.status).toBe(4);
    expect(missing.stderr).toContain("PE_STORE_ROOT is required");

    const relative = sync("relay", dir(one, true));
    expect(relative.status).toBe(4);
    expect(relative.stderr).toContain("must be an absolute path");
    expect(relative.stderr).not.toMatch(/^\s+at\s/m);
  });
});
