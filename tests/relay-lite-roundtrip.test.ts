import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatCns } from "../src/relay-lite/cns.js";
import {
  StoreCorruption,
  mint,
  mintContext,
  publishAll,
  readDelivered,
  stage1,
  stage2,
  stage3,
} from "../src/relay-lite/index.js";

// §4: "The protocol and storage model treat the graph as a DAG — a partial
// order." A store discharges it by imposing no total order of its own.
describe("§4 — the store imposes no order", () => {
  it("returns acts keyed by id, with no sequence and no sort", async () => {
    const root = mkdtempSync(join(tmpdir(), "relay-lite-dag-"));
    let ctx = mintContext("n");
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const m = mint(
        { thread_id: "t", type: "message", from: "agent:a", to: ["agent:b"], payload: { i } },
        ctx,
        1000 + i,
      );
      ctx = m.ctx;
      ids.push(m.sealed.act.id);
      await publishAll(m.sealed, root);
    }
    const held = await readDelivered(root);
    // A Map keyed by id: no position, no rank, nothing a consumer could mistake
    // for the causal history. Every act is present and none is ordered.
    expect(new Set(held.keys())).toEqual(new Set(ids));
    for (const act of held.values()) {
      expect(Object.keys(act)).toEqual(["bytes", "digest"]);
    }
  });
});

describe("readDelivered", () => {
  it("skips a file deleted between the listing and the read", async () => {
    const root = mkdtempSync(join(tmpdir(), "relay-lite-gap-"));
    const { sealed } = mint(
      { thread_id: "t", type: "message", from: "agent:a", to: ["agent:b"], payload: { n: 1 } },
      mintContext("n"),
      1000,
    );
    await publishAll(sealed, root);
    // One delivery file, removed after publication: the sweep reports what it
    // holds rather than failing.
    rmSync(join(root, "in", formatCns(sealed.act, "agent:b")));
    expect((await readDelivered(root)).size).toBe(0);
  });

  it("refuses two copies of one id that disagree, rather than picking one", async () => {
    const root = mkdtempSync(join(tmpdir(), "relay-lite-dup-"));
    const { sealed } = mint(
      {
        thread_id: "t",
        type: "message",
        from: "agent:a",
        to: ["agent:b", "agent:c"],
        payload: { n: 1 },
      },
      mintContext("n"),
      1000,
    );
    await publishAll(sealed, root);
    // Same id under a second delivery name, different bytes: a discrepancy in
    // the store, not a defect in anyone's record.
    writeFileSync(join(root, "in", formatCns(sealed.act, "agent:c")), '{"forged":true}');
    await expect(readDelivered(root)).rejects.toThrow(StoreCorruption);
  });
});

describe("round trip — two agents and a citation between them", () => {
  it("mints, publishes, reads back, and verifies the citation", async () => {
    const root = mkdtempSync(join(tmpdir(), "relay-lite-rt-"));
    let ctx = mintContext("node-a");

    const first = mint(
      { thread_id: "t", type: "message", from: "agent:a", to: ["agent:b"], payload: { n: 1 } },
      ctx,
      1000,
    );
    ctx = first.ctx;
    await publishAll(first.sealed, root);

    const second = mint(
      {
        thread_id: "t",
        type: "message",
        from: "agent:a",
        to: ["agent:b"],
        payload: { n: 2 },
        parent: { id: first.sealed.act.id, digest: first.sealed.digest },
      },
      ctx,
      1001,
    );
    await publishAll(second.sealed, root);

    const held = await readDelivered(root);
    expect(held.size).toBe(2);

    const name = formatCns(second.sealed.act, "agent:b");
    const bytes = await readFile(join(root, "in", name), "utf8");

    expect(stage1(bytes).digest).toBe(second.sealed.digest);
    const parsed = stage2(bytes, name);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(stage3(parsed.act, held)).toBe("MATCHES");
  });
});
