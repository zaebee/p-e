import { spawnSync } from "node:child_process";
import { constants, accessSync } from "node:fs";
import { delimiter, isAbsolute, join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadRecord } from "../src/relay/store.js";

function resolveBun(): string {
  if (process.versions.bun !== undefined) return process.execPath;
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (dir === "" || !isAbsolute(dir)) continue;
    const candidate = join(dir, "bun");
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Keep looking
    }
  }
  throw new Error("bun was not found on PATH.");
}

const BUN = resolveBun();
const CLI = "src/relay/cli.ts";

function runRelay(args: string[]) {
  return spawnSync(BUN, ["--no-env-file", "run", CLI, ...args], {
    encoding: "utf8",
    env: { ...process.env, P_E_STORE_IDENTITY: "p-e/relay" },
  });
}

describe("relay CLI (src/relay/cli.ts)", () => {
  it("prints Usage on empty or unknown command", () => {
    const res1 = runRelay([]);
    expect(res1.status).toBe(0);
    expect(res1.stdout).toContain("usage: relay <get|exists|replies|list> [id|after]");

    const res2 = runRelay(["help"]);
    expect(res2.status).toBe(0);
    expect(res2.stdout).toContain("usage: relay <get|exists|replies|list> [id|after]");
  });

  it("fetches record bytes with relay get <id>", async () => {
    const rec = await loadRecord("relay-0808");
    expect(rec).not.toBeNull();
    const res = runRelay(["get", "relay-0808"]);
    expect(res.status).toBe(0);
    expect(res.stdout).toBe(`${rec?.bytes}\n`);
  });

  it("handles missing record with relay get <missing>", () => {
    const res = runRelay(["get", "relay-9999"]);
    expect(res.status).toBe(0);
    expect(res.stdout.trim()).toBe("relay-9999: UNKNOWN — not reconstructed");
  });

  it("handles get without id", () => {
    const res = runRelay(["get"]);
    expect(res.status).toBe(0);
    expect(res.stdout.trim()).toBe("undefined: no id given — not reconstructed");
  });

  it("checks existence with relay exists <id>", () => {
    const res1 = runRelay(["exists", "relay-0808"]);
    expect(res1.status).toBe(0);
    expect(res1.stdout.trim()).toBe("relay-0808: PRESENT");

    const res2 = runRelay(["exists", "relay-9999"]);
    expect(res2.status).toBe(0);
    expect(res2.stdout.trim()).toBe("relay-9999: UNKNOWN");

    const res3 = runRelay(["exists", "relay-0026"]);
    expect(res3.status).toBe(0);
    expect(res3.stdout.trim()).toBe("relay-0026: KNOWN_MISSING");

    const res4 = runRelay(["exists"]);
    expect(res4.status).toBe(0);
    expect(res4.stdout.trim()).toBe("undefined: no id given");
  });

  it("lists replies with relay replies <id>", () => {
    const res = runRelay(["replies", "relay-0119"]);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("relay-0120");
  });

  it("lists relays with relay list", () => {
    const res = runRelay(["list"]);
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("present (");
    expect(res.stdout).toContain("known missing (");
  });
});
