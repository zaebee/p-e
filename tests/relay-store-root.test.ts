import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appendRelay, depositLocal } from "../src/relay/deposit.js";
import { serveHttp } from "../src/relay/mcp-http.js";
import { MIRROR_MARKER, isMirror, storeRootFrom } from "../src/relay/store.js";

/**
 * Where the store is, and what refuses to write where it is not.
 *
 * The live store sat inside a git working tree until a checkout deleted
 * `relay-1157` and its marker under a running service, and the id was bound
 * twice (`relay-1159`). `PE_STORE_ROOT` moves it out; `MIRROR` keeps the copy
 * left behind in the repository from being written to as though it were the
 * store.
 */

const store = join(import.meta.dirname, "..", "src", "relay", "store.ts");
const body = "@p-e/x0\nfrom: a\nkind: note\n\nbody\n";

function scratch(mirror: boolean): string {
  const root = join(mkdtempSync(join(tmpdir(), "p-e-root-")), "relay");
  mkdirSync(root, { recursive: true });
  if (mirror) writeFileSync(join(root, MIRROR_MARKER), "a mirror\n");
  return root;
}

/**
 * `STORE_ROOT` as a fresh process computes it. `--no-env-file` and a scratch
 * working directory both, so a `PE_STORE_ROOT` in this repository's `.env` can
 * neither supply the value under test nor mask its absence.
 */
function rootInChild(value: string | undefined) {
  const env: NodeJS.ProcessEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key !== "PE_STORE_ROOT"),
  );
  if (value !== undefined) env.PE_STORE_ROOT = value;
  return spawnSync(
    "bun",
    [
      "--no-env-file",
      "-e",
      `const m = await import(${JSON.stringify(store)}); console.log(m.STORE_ROOT)`,
    ],
    { cwd: mkdtempSync(join(tmpdir(), "p-e-cwd-")), env, encoding: "utf8" },
  );
}

describe("PE_STORE_ROOT", () => {
  const beside = join(import.meta.dirname, "..", "relay");

  it("defaults to the relay/ beside the source when unset or empty", () => {
    expect(storeRootFrom(undefined)).toBe(beside);
    expect(storeRootFrom("")).toBe(beside);
  });

  it("takes an absolute path as given", () => {
    expect(storeRootFrom("/srv/p-e/relay")).toBe("/srv/p-e/relay");
  });

  it("refuses a relative path rather than resolving it against the working directory", () => {
    expect(() => storeRootFrom("relay")).toThrow(/must be an absolute path/);
    expect(() => storeRootFrom("./relay")).toThrow(/must be an absolute path/);
  });

  it("is what a process started with it actually uses", () => {
    const set = rootInChild("/srv/p-e/relay");
    expect(set.status).toBe(0);
    expect(set.stdout.trim()).toBe("/srv/p-e/relay");

    const unset = rootInChild(undefined);
    expect(unset.stdout.trim()).toBe(beside);
  });

  it("stops a process started with a relative one", () => {
    const relative = rootInChild("relay");
    expect(relative.status).not.toBe(0);
    expect(relative.stderr).toContain("must be an absolute path");
  });
});

describe("a git mirror of the store", () => {
  it("is recognised by its marker, and a store is not", () => {
    expect(isMirror(scratch(true))).toBe(true);
    expect(isMirror(scratch(false))).toBe(false);
  });

  it("refuses a deposit, and binds nothing", async () => {
    const root = scratch(true);
    await expect(appendRelay(body, undefined, root)).rejects.toThrow(/git mirror/);
    await expect(depositLocal(body, "a", undefined, root)).rejects.toThrow(/git mirror/);
    expect(readdirSync(root)).toEqual([MIRROR_MARKER]);
    expect(existsSync(join(root, "history"))).toBe(false);
  });

  it("still takes a deposit when the marker is absent", async () => {
    const root = scratch(false);
    await expect(appendRelay(body, undefined, root)).resolves.toMatchObject({ id: "relay-0001" });
  });

  it("stops the HTTP service before it reads a credential", async () => {
    await expect(serveHttp(0, scratch(true))).rejects.toThrow(/refusing to serve .*git mirror/);
  });
});
