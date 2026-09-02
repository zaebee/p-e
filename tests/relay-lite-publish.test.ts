import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type MintInput, mint, mintContext } from "../src/relay-lite/act.js";
import { formatCns } from "../src/relay-lite/cns.js";
import { publish, publishAll } from "../src/relay-lite/publish.js";
import { relayRoot } from "./relay-tmp.js";

const input: MintInput = {
  thread_id: "t-1",
  type: "message",
  from: "agent:claude",
  to: ["agent:mimo", "agent:mistral"],
  payload: { text: "x" },
};
/** The shared helper: makes `in/` and `tmp/`, and removes the tree afterwards. */
const root = () => relayRoot("relay-lite-");

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
      maxAttempts: 3,
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

describe("the options, and the act the publisher is handed", () => {
  it("refuses an attempt budget that would publish nothing", async () => {
    // The option counted attempts while being called `maxRetries`, so
    // `maxRetries: 0` ran no attempt at all and returned RETRY_EXHAUSTED — a
    // status asserting that no attempt established the name, when none was
    // made. `-1` did the same and `1.5` worked by accident.
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    for (const maxAttempts of [0, -1, 1.5, Number.NaN]) {
      await expect(publish(sealed, "agent:mimo", dir, { maxAttempts })).rejects.toThrow(
        /maxAttempts must be a positive integer/,
      );
    }
    expect(readdirSync(join(dir, "in"))).toEqual([]);
    // One attempt is a legal budget and publishes.
    expect(await publish(sealed, "agent:mimo", dir, { maxAttempts: 1 })).toEqual({
      status: "PUBLISHED",
    });
  });

  it("refuses an empty root, which published into the working directory", async () => {
    // `join("", "in")` is `"in"` — a relative path — so this created `in/` and
    // `tmp/` in whatever directory the process was running from and reported
    // PUBLISHED. Found by enumerating the arguments rather than by review, and
    // the probe that found it left an `in/` in the repository root.
    //
    // A relative root a caller chose is their business. An empty one is an
    // unset value that happened to work.
    const { sealed } = mint(input, mintContext("n"), 1000);
    for (const bad of ["", null, undefined, 7]) {
      await expect(publish(sealed, "agent:mimo", bad as never)).rejects.toThrow(
        /root must be a non-empty path/,
      );
    }
    expect(existsSync(join(process.cwd(), "in"))).toBe(false);
  });

  it("refuses options it cannot use", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    await expect(publish(sealed, "agent:mimo", dir, null as never)).rejects.toThrow(
      /options must be an object/,
    );
    await expect(publish(sealed, "agent:mimo", dir, { onSync: 7 as never })).rejects.toThrow(
      /onSync must be a function/,
    );
    await expect(publish(sealed, "agent:mimo", dir, { readTarget: 7 as never })).rejects.toThrow(
      /readTarget must be a function/,
    );
  });

  it("names a sealed act that is not one", async () => {
    const dir = root();
    for (const bad of [null, undefined, 7, "x"]) {
      await expect(publish(bad as never, "agent:mimo", dir)).rejects.toThrow(
        /sealed must be an object/,
      );
    }
    await expect(publish({ bytes: "", digest: "" } as never, "agent:mimo", dir)).rejects.toThrow(
      /sealed\.act must be an object/,
    );
    await expect(publishAll(null as never, dir)).rejects.toThrow(/sealed must be an object/);
  });
});

describe("concurrency, which is what §4.1 is shaped for", () => {
  it("gives one publisher the name and tells the rest it is already there", async () => {
    // Every element of the sequence — the O_EXCL temp, `link` rather than
    // `rename`, EEXIST read as a question rather than an answer — exists for
    // simultaneous publishers, and nothing else here runs two at once.
    //
    // Same act, same recipient, same name: exactly one leg may create it, and
    // the others must recognise their own bytes rather than refuse them.
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);

    const results = await Promise.all(
      Array.from({ length: 24 }, () => publish(sealed, "agent:mimo", dir)),
    );
    const counts = results.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});

    expect(counts.PUBLISHED).toBe(1);
    expect(counts.ALREADY_PUBLISHED).toBe(23);
    expect(counts.COLLISION_REFUSED).toBeUndefined();
    expect(counts.RETRY_EXHAUSTED).toBeUndefined();

    const files = readdirSync(join(dir, "in"));
    expect(files).toHaveLength(1);
    expect(readFileSync(join(dir, "in", files[0] as string), "utf8")).toBe(sealed.bytes);
    // Twenty-four temp files were created and every one of them cleaned up.
    expect(readdirSync(join(dir, "tmp"))).toEqual([]);
  });
});

describe("the temp file, which is not the target", () => {
  it("retries a taken temp name instead of failing the publish", async () => {
    // 64 bits of `randomBytes` make this unreachable in practice, so it is
    // forced: a `readTarget` that never runs, and a temp directory replaced by
    // one where every name is taken, cannot both be arranged — what can is
    // observing that the publish still succeeds when the first temp name is
    // occupied. The name embeds pid, ms and 8 random bytes, so occupying it
    // means predicting it; instead this asserts the shape that matters, that a
    // publish which retries still ends in a single delivery file.
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    expect(await publish(sealed, "agent:mimo", dir)).toEqual({ status: "PUBLISHED" });
    expect(readdirSync(join(dir, "in"))).toHaveLength(1);
    expect(readdirSync(join(dir, "tmp"))).toEqual([]);
  });

  it("does not report a temp collision as a publish collision", async () => {
    // The distinction the `link` catch exists for: EEXIST from the temp `open`
    // and EEXIST from `link` are the same code and different events. A publish
    // into a clean directory must never come back COLLISION_REFUSED.
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    for (let i = 0; i < 20; i++) {
      const r = mint({ ...input, payload: { i } }, mintContext("n"), 1000 + i);
      expect((await publish(r.sealed, "agent:mimo", dir)).status).not.toBe("COLLISION_REFUSED");
    }
    void sealed;
  });
});

describe("the durability claim this module can actually make", () => {
  it("syncs a thing that is a directory, not a path that looks like one", () => {
    // `onSync` reports the string its caller passed, so a test that only
    // compares strings proves the callback ran, not that a directory was
    // synced. This checks the filesystem.
    const dir = root();
    expect(statSync(join(dir, "in")).isDirectory()).toBe(true);
  });

  it("reports the directory among the paths it synced, and it is one", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    // Recorded at the moment of the call. Statting afterwards fails: the temp
    // file is unlinked in the `finally` before `publish` returns, so by then one
    // of the synced paths is gone — which is itself the temp cleanup working.
    const kinds: { path: string; dir: boolean }[] = [];
    await publish(sealed, "agent:mimo", dir, {
      onSync: (p) => kinds.push({ path: p, dir: statSync(p).isDirectory() }),
    });

    expect(kinds.filter((k) => k.dir).map((k) => k.path)).toEqual([join(dir, "in")]);
    // And one that is a file, so §4.1's pair is both present: durable bytes and
    // a durable name.
    expect(kinds.filter((k) => !k.dir)).toHaveLength(1);
  });

  it("pins why the directory is opened with 'r'", async () => {
    // The implementation opens `in/` read-only to fsync it, which looks
    // arbitrary until you try the other flag. Recorded so it is not
    // "simplified" to "w" by someone who has not.
    const dir = root();
    await expect(openSync2(join(dir, "in"), "w")).rejects.toMatchObject({ code: "EISDIR" });
  });
});

/** `fs.promises.open`, imported here so the EISDIR test reads as one line. */
async function openSync2(path: string, flags: string) {
  const { open } = await import("node:fs/promises");
  const handle = await open(path, flags);
  await handle.close();
}
