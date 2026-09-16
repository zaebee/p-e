import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applySync, planSync, roleProblem } from "../src/relay/mirror.js";
import { MIRROR_MARKER } from "../src/relay/store.js";

/**
 * The sync that carries the live store into git, and what makes it stop.
 *
 * Every directory here is scratch. The script is run with `PE_STORE_ROOT` and
 * `--mirror` both pointing at scratch and `--no-env-file`, so neither a `.env`
 * nor a default can aim it at a real store or at this repository's `relay/`.
 */

const script = join(import.meta.dirname, "..", "scripts", "relay-sync.ts");
const rec = (id: string, text = "body") =>
  `deposited-by: t\nprovenance: authored\nassigned-id: ${id}\n---\n@p-e/x0\nfrom: a\n\n${text}\n`;

function dir(files: Record<string, string>, mirror = false): string {
  const root = join(mkdtempSync(join(tmpdir(), "p-e-sync-")), "relay");
  mkdirSync(join(root, "history"), { recursive: true });
  for (const [path, text] of Object.entries(files)) writeFileSync(join(root, path), text);
  if (mirror) writeFileSync(join(root, MIRROR_MARKER), "a git mirror\n");
  return root;
}

function sync(store: string, mirror: string, ...extra: string[]) {
  const env: NodeJS.ProcessEnv = { ...process.env, PE_STORE_ROOT: store };
  return spawnSync("bun", ["--no-env-file", "run", script, "--mirror", mirror, ...extra], {
    cwd: mkdtempSync(join(tmpdir(), "p-e-sync-cwd-")),
    env,
    encoding: "utf8",
  });
}

const both = { "relay-0001.txt": rec("relay-0001"), "history/relay-0001": "" };

describe("planSync", () => {
  it("copies what the store holds and the mirror lacks, records and markers", async () => {
    const store = dir({ ...both, "relay-0002.txt": rec("relay-0002"), "history/relay-0002": "" });
    const mirror = dir(both, true);
    const plan = await planSync(store, mirror);
    expect(plan.copy).toEqual(["history/relay-0002", "relay-0002.txt"]);
    expect([plan.differ, plan.onlyInMirror, plan.waiting]).toEqual([[], [], []]);
  });

  it("names a file both hold with different bytes — relay-1157's shape", async () => {
    const store = dir({ ...both, "relay-0001.txt": rec("relay-0001", "the store's") });
    const mirror = dir({ ...both, "relay-0001.txt": rec("relay-0001", "git's") }, true);
    expect((await planSync(store, mirror)).differ).toEqual(["relay-0001.txt"]);
  });

  it("names what the mirror holds and the store does not", async () => {
    const store = dir({ "history/relay-0001": "" });
    const mirror = dir(both, true);
    const plan = await planSync(store, mirror);
    expect(plan.onlyInMirror).toEqual(["relay-0001.txt"]);
    expect(plan.copy).toEqual([]);
  });

  it("holds back a marker whose record neither side has yet", async () => {
    // A deposit claims the marker before it writes the record.
    const store = dir({ ...both, "history/relay-0002": "" });
    const plan = await planSync(store, dir(both, true));
    expect(plan.waiting).toEqual(["history/relay-0002"]);
    expect(plan.copy).toEqual([]);
  });

  it("copies a deletion's marker when the mirror already has the record's history", async () => {
    // relay-0683 and relay-0876 are markers without records in the live store.
    const store = dir({ "history/relay-0001": "" });
    const mirror = dir({ "relay-0001.txt": rec("relay-0001") }, true);
    const plan = await planSync(store, mirror);
    expect(plan.copy).toEqual(["history/relay-0001"]);
    expect(plan.onlyInMirror).toEqual(["relay-0001.txt"]);
  });

  it("ignores files that are not records or markers", async () => {
    const store = dir({ ...both, ".relay-0002.tmp": "x", "notes.md": "x" });
    const plan = await planSync(store, dir(both, true));
    expect(plan).toEqual({ copy: [], differ: [], onlyInMirror: [], waiting: [] });
  });
});

describe("roleProblem", () => {
  it("refuses a mirror without its marker, a store with one, and one directory twice", () => {
    const store = dir(both);
    const mirror = dir(both, true);
    expect(roleProblem(store, mirror)).toBeNull();
    expect(roleProblem(store, dir(both))).toMatch(/not marked MIRROR/);
    expect(roleProblem(mirror, dir(both, true))).toMatch(/marked MIRROR, so it is a copy/);
    expect(roleProblem(mirror, `${mirror}/`)).toMatch(/same directory/);
    const link = join(mkdtempSync(join(tmpdir(), "p-e-link-")), "relay");
    symlinkSync(mirror, link);
    expect(roleProblem(link, mirror)).toMatch(/same directory|marked MIRROR/);
  });
});

describe("applySync", () => {
  it("never overwrites a file that appeared after planning", async () => {
    const store = dir({ ...both, "relay-0002.txt": rec("relay-0002"), "history/relay-0002": "" });
    const mirror = dir(both, true);
    const plan = await planSync(store, mirror);
    writeFileSync(join(mirror, "relay-0002.txt"), "arrived meanwhile");
    await expect(applySync(store, mirror, plan)).rejects.toThrow(/EEXIST|exists/);
    expect(readFileSync(join(mirror, "relay-0002.txt"), "utf8")).toBe("arrived meanwhile");
  });
});

describe("relay-sync", () => {
  it("copies and exits 0", () => {
    const store = dir({ ...both, "relay-0002.txt": rec("relay-0002"), "history/relay-0002": "" });
    const mirror = dir(both, true);
    const out = sync(store, mirror);
    expect(out.status).toBe(0);
    expect(readFileSync(join(mirror, "relay-0002.txt"), "utf8")).toBe(rec("relay-0002"));
    expect(readdirSync(join(mirror, "history")).sort()).toEqual(["relay-0001", "relay-0002"]);
  });

  it("copies nothing with --dry-run", () => {
    const store = dir({ ...both, "relay-0002.txt": rec("relay-0002") });
    const mirror = dir(both, true);
    const out = sync(store, mirror, "--dry-run");
    expect(out.status).toBe(0);
    expect(out.stdout).toContain("would copy");
    expect(readdirSync(mirror)).not.toContain("relay-0002.txt");
  });

  it("exits 1 and copies nothing when any file disagrees", () => {
    const store = dir({
      ...both,
      "relay-0001.txt": rec("relay-0001", "the store's"),
      "relay-0002.txt": rec("relay-0002"),
    });
    const mirror = dir({ ...both, "relay-0001.txt": rec("relay-0001", "git's") }, true);
    const out = sync(store, mirror);
    expect(out.status).toBe(1);
    expect(out.stdout).toContain("DIFFERS         relay-0001.txt");
    expect(readdirSync(mirror)).not.toContain("relay-0002.txt");
  });

  it("exits 4 when the mirror is not marked, and writes nothing into it", () => {
    const store = dir({ ...both, "relay-0002.txt": rec("relay-0002") });
    const notMirror = dir(both);
    const out = sync(store, notMirror);
    expect(out.status).toBe(4);
    expect(readdirSync(notMirror)).not.toContain("relay-0002.txt");
  });

  it("exits 4 without PE_STORE_ROOT rather than syncing a mirror onto itself", () => {
    const env: NodeJS.ProcessEnv = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key !== "PE_STORE_ROOT"),
    );
    const out = spawnSync("bun", ["--no-env-file", "run", script, "--mirror", dir(both, true)], {
      cwd: mkdtempSync(join(tmpdir(), "p-e-sync-cwd-")),
      env,
      encoding: "utf8",
    });
    expect(out.status).toBe(4);
    expect(out.stderr).toContain("PE_STORE_ROOT is required");
  });
});
