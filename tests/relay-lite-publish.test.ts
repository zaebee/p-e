import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { type MintInput, mint, mintContext } from "../src/relay-lite/act.js";
import { formatCns } from "../src/relay-lite/cns.js";
import { publish, publishAll } from "../src/relay-lite/publish.js";

const input: MintInput = {
  thread_id: "t-1",
  type: "message",
  from: "agent:claude",
  to: ["agent:mimo", "agent:mistral"],
  payload: { text: "x" },
};
/**
 * A relay root with its two directories already made.
 *
 * `publish` creates them itself, but three tests below write into `in/` before
 * calling it — to stage a collision — and `mkdtempSync` makes only the root, so
 * they failed with ENOENT against the implementation rather than against the
 * behaviour they were testing.
 */
const roots: string[] = [];
const root = () => {
  const dir = mkdtempSync(join(tmpdir(), "relay-lite-"));
  mkdirSync(join(dir, "in"), { recursive: true });
  mkdirSync(join(dir, "tmp"), { recursive: true });
  roots.push(dir);
  return dir;
};

// Each test that publishes leaves a directory tree behind, and the suite runs
// on every commit. Without this the machine's temp directory accumulates one
// per test per run.
afterEach(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
  roots.length = 0;
});

describe("publish — §4.1", () => {
  it("writes the act under its delivery name", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    expect(await publish(sealed, "agent:mimo", dir)).toEqual({ status: "PUBLISHED" });
    const name = formatCns(sealed.act, "agent:mimo");
    expect(readFileSync(join(dir, "in", name), "utf8")).toBe(sealed.bytes);
  });

  it("leaves no temp file behind", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    await publish(sealed, "agent:mimo", dir);
    expect(readdirSync(join(dir, "tmp"))).toEqual([]);
  });

  // "EEXIST alone does not say whose name it is."
  it("reports the same act as already published, not as a collision", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    await publish(sealed, "agent:mimo", dir);
    expect(await publish(sealed, "agent:mimo", dir)).toEqual({ status: "ALREADY_PUBLISHED" });
  });

  it("reports a different act at the same name as a collision", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    const name = formatCns(sealed.act, "agent:mimo");
    writeFileSync(join(dir, "in", name), '{"different":true}');
    expect(await publish(sealed, "agent:mimo", dir)).toEqual({ status: "COLLISION_REFUSED" });
  });

  // "Loop exhaustion is reachable only via the vanished-target path, which means
  // every attempt found the name free. Reporting that as a collision is the
  // same error one level out."
  it("reports exhaustion, not a collision, when the target keeps vanishing", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    writeFileSync(join(dir, "in", formatCns(sealed.act, "agent:mimo")), '{"other":1}');
    const result = await publish(sealed, "agent:mimo", dir, {
      maxRetries: 3,
      readTarget: async () => {
        const e: NodeJS.ErrnoException = new Error("vanished");
        e.code = "ENOENT";
        throw e;
      },
    });
    expect(result).toEqual({ status: "RETRY_EXHAUSTED" });
  });

  // Check 11 of the design: the implementation's claim, not the kernel's.
  it("calls fsync on the directory, not only on the file", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    const synced: string[] = [];
    await publish(sealed, "agent:mimo", dir, { onSync: (p) => synced.push(p) });
    expect(synced).toContain(join(dir, "in"));
    expect(synced.length).toBeGreaterThanOrEqual(2);
  });

  it("completes the durability guarantee on the recovered path too", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    await publish(sealed, "agent:mimo", dir);
    const synced: string[] = [];
    const again = await publish(sealed, "agent:mimo", dir, { onSync: (p) => synced.push(p) });
    expect(again).toEqual({ status: "ALREADY_PUBLISHED" });
    expect(synced).toContain(join(dir, "in"));
  });
});

describe("publishAll — fan-out", () => {
  it("returns one result per recipient", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    const results = await publishAll(sealed, dir);
    expect(results.map((r) => r.recipient)).toEqual(["agent:mimo", "agent:mistral"]);
    expect(results.every((r) => r.result.status === "PUBLISHED")).toBe(true);
  });

  it("shows a partial fan-out as partial", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    writeFileSync(join(dir, "in", formatCns(sealed.act, "agent:mistral")), '{"other":1}');
    const results = await publishAll(sealed, dir);
    expect(results.map((r) => r.result.status)).toEqual(["PUBLISHED", "COLLISION_REFUSED"]);
  });

  it("writes bytes identical across every delivery leg", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    await publishAll(sealed, dir);
    const bodies = readdirSync(join(dir, "in")).map((n) =>
      readFileSync(join(dir, "in", n), "utf8"),
    );
    expect(new Set(bodies).size).toBe(1);
  });
});

describe("what the publisher is handed, and does not mint", () => {
  it("refuses to fan out over an audience that is not a list", async () => {
    // A string iterates by character. `to: "agent:mimo"` fanned out to nine
    // recipients — a, g, e, n, t, :, m, i, o — and wrote nine durable delivery
    // files to nine agents that do not exist. Third occurrence of that shape in
    // this store, after minting (#34) and checkDelivery (#36), and the first
    // where it reached the disk.
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    for (const to of ["agent:mimo", undefined, null, 7]) {
      const wire = { ...sealed, act: { ...sealed.act, to: to as never } };
      await expect(publishAll(wire, dir)).rejects.toThrow(/act\.to must be an array/);
    }
    expect(readdirSync(join(dir, "in"))).toEqual([]);
  });

  it("refuses an act whose fields cannot be a delivery name", async () => {
    // These reach `formatCns`, which is where the alphabet lives. The point is
    // that the publisher does not have its own weaker path to disk.
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    for (const act of [
      { ...sealed.act, thread_id: "../../../tmp/x" },
      { ...sealed.act, from: "b;to=victim" },
      { ...sealed.act, id: "not-a-uuid" },
    ]) {
      await expect(publish({ ...sealed, act }, "agent:mimo", dir)).rejects.toThrow();
    }
    expect(readdirSync(join(dir, "in"))).toEqual([]);
    expect(readdirSync(join(dir, "tmp"))).toEqual([]);
  });

  it("refuses a recipient the caller supplies directly", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    for (const recipient of ["../../../tmp/x", "a;to=victim", ""]) {
      await expect(publish(sealed, recipient, dir)).rejects.toThrow();
    }
    expect(readdirSync(join(dir, "in"))).toEqual([]);
  });
});
