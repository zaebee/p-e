import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appendRelay, depositLocal } from "../src/relay/deposit.js";
import { gitWorkTreeOf, storeRootFrom, writeProblem } from "../src/relay/store.js";

/**
 * Where the store is, and where it may not be written.
 *
 * The live store sat inside a git working tree until a checkout deleted
 * `relay-1157` and its marker under a running service, and the id was bound
 * twice (`relay-1159`). `PE_STORE_ROOT` moves it out; `writeProblem` refuses any
 * store inside a working tree, which is also what keeps the copy left in the
 * repository from being deposited into.
 *
 * Every child process here runs with `--no-env-file` from a scratch working
 * directory, so a `PE_STORE_ROOT` in this repository's `.env` can neither supply
 * a value under test nor mask its absence.
 */

const src = join(import.meta.dirname, "..", "src", "relay");
const body = "@p-e/x0\nfrom: a\nkind: note\n\nbody\n";

/** A scratch store, optionally inside a scratch git working tree of either kind. */
function scratch(git: "none" | "clone" | "worktree" = "none"): string {
  const top = mkdtempSync(join(tmpdir(), "p-e-root-"));
  if (git === "clone") mkdirSync(join(top, ".git"));
  if (git === "worktree") writeFileSync(join(top, ".git"), "gitdir: /elsewhere/.git/worktrees/x\n");
  const root = join(top, "relay");
  mkdirSync(root, { recursive: true });
  return root;
}

function child(code: string, storeRoot: string | undefined, extraEnv: NodeJS.ProcessEnv = {}) {
  const env: NodeJS.ProcessEnv = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => k !== "PE_STORE_ROOT" && k !== "PE_MCP_TOKENS"),
  );
  if (storeRoot !== undefined) env.PE_STORE_ROOT = storeRoot;
  return spawnSync("bun", ["--no-env-file", "-e", code], {
    cwd: mkdtempSync(join(tmpdir(), "p-e-cwd-")),
    env: { ...env, ...extraEnv },
    encoding: "utf8",
  });
}

const importStore = `const m = await import(${JSON.stringify(join(src, "store.ts"))});`;

describe("PE_STORE_ROOT", () => {
  const beside = join(import.meta.dirname, "..", "relay");

  it("defaults to the relay/ beside the source when unset or empty", () => {
    expect(storeRootFrom(undefined)).toBe(beside);
    expect(storeRootFrom("")).toBe(beside);
  });

  it("takes an absolute path, normalised", () => {
    expect(storeRootFrom("/srv/p-e/relay")).toBe("/srv/p-e/relay");
    expect(storeRootFrom("/srv/p-e/relay/")).toBe("/srv/p-e/relay");
    expect(storeRootFrom("/srv/../srv/p-e//relay")).toBe("/srv/p-e/relay");
  });

  it("refuses relative paths, ~, and surrounding whitespace", () => {
    for (const bad of ["relay", "./relay", "~/relay", "$HOME/relay"]) {
      expect(() => storeRootFrom(bad)).toThrow(/must be an absolute path/);
    }
    expect(() => storeRootFrom("~/relay")).toThrow(/Nothing here expands `~`/);
    for (const bad of [" /srv/relay", "/srv/relay ", "   "]) {
      expect(() => storeRootFrom(bad)).toThrow(/whitespace/);
    }
  });

  it("is what a process started with it uses, read when asked rather than at import", () => {
    const set = child(`${importStore} console.log(m.storeRoot())`, "/srv/p-e/relay");
    expect(set.stdout.trim()).toBe("/srv/p-e/relay");
    expect(child(`${importStore} console.log(m.storeRoot())`, undefined).stdout.trim()).toBe(
      beside,
    );

    // A bad value fails the call that uses it, not the import.
    const bad = child(`${importStore} console.log("imported"); m.storeRoot();`, "relay");
    expect(bad.stdout).toContain("imported");
    expect(bad.status).not.toBe(0);
    expect(bad.stderr).toContain("must be an absolute path");
  });

  it("does not stop a script given --root when the variable is bad", () => {
    const script = join(import.meta.dirname, "..", "scripts", "check-headers.ts");
    const out = spawnSync("bun", ["--no-env-file", "run", script, "--root", scratch()], {
      cwd: mkdtempSync(join(tmpdir(), "p-e-cwd-")),
      env: { ...process.env, PE_STORE_ROOT: "relay" },
      encoding: "utf8",
    });
    expect(out.status).toBe(0);
    expect(out.stdout).toContain("0 records");
  });
});

describe("a store inside a git working tree", () => {
  it("is found through a clone's .git directory, a worktree's .git file, and a symlink", () => {
    expect(gitWorkTreeOf(scratch("none"))).toBeNull();
    expect(gitWorkTreeOf(scratch("clone"))).not.toBeNull();
    expect(gitWorkTreeOf(scratch("worktree"))).not.toBeNull();
    const link = join(mkdtempSync(join(tmpdir(), "p-e-link-")), "relay");
    symlinkSync(scratch("clone"), link);
    expect(gitWorkTreeOf(link)).not.toBeNull();
  });

  it("is this repository's own relay/", () => {
    expect(writeProblem(join(import.meta.dirname, "..", "relay"))).toMatch(
      /inside the git working tree/,
    );
  });

  it("refuses a deposit and binds nothing — with no file in the store to delete", async () => {
    for (const kind of ["clone", "worktree"] as const) {
      const root = scratch(kind);
      await expect(appendRelay(body, undefined, root)).rejects.toThrow(
        /inside the git working tree/,
      );
      await expect(depositLocal(body, "a", undefined, root)).rejects.toThrow(
        /inside the git working tree/,
      );
      expect(readdirSync(root)).toEqual([]);
      expect(existsSync(join(root, "history"))).toBe(false);
    }
  });

  it("still takes a deposit outside one", async () => {
    await expect(appendRelay(body, undefined, scratch())).resolves.toMatchObject({
      id: "relay-0001",
    });
  });

  it("stops the HTTP service on the store it would actually serve, before credentials", () => {
    const serve = `const { serveHttp } = await import(${JSON.stringify(join(src, "mcp-http.ts"))}); await serveHttp(0);`;
    const inGit = child(serve, scratch("clone"));
    expect(inGit.status).not.toBe(0);
    expect(inGit.stderr).toMatch(/refusing to serve: .*inside the git working tree/);

    // Outside git the check passes, and the next thing to fail is the missing table.
    const outside = child(serve, scratch());
    expect(outside.status).not.toBe(0);
    expect(outside.stderr).toContain("PE_MCP_TOKENS is required");
  });

  it("stops the stdio server too", () => {
    const out = spawnSync("bun", ["--no-env-file", "run", join(src, "mcp.ts")], {
      cwd: mkdtempSync(join(tmpdir(), "p-e-cwd-")),
      env: { ...process.env, PE_STORE_ROOT: scratch("clone") },
      input: "",
      encoding: "utf8",
    });
    expect(out.status).toBe(1);
    expect(out.stderr).toMatch(/refusing to serve: .*inside the git working tree/);
  });
});
