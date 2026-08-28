import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { waitForRelay } from "../src/relay/wait.js";

function scratch(): string {
  const root = join(mkdtempSync(join(tmpdir(), "p-e-wait-")), "relay");
  mkdirSync(root, { recursive: true });
  return root;
}

const write = (root: string, id: string) =>
  writeFileSync(
    join(root, `${id}.txt`),
    `deposited-by: tester\nprovenance: authored\n---\n@p-e/x0\nid: ${id}\nfrom: alice\nto: claude\nkind: report\n\nbody\n`,
  );

describe("waitForRelay", () => {
  it("returns immediately when the record is already there", async () => {
    const root = scratch();
    write(root, "relay-0002");
    const r = await waitForRelay("relay-0001", 5_000, root);
    expect(r.timedOut).toBe(false);
    expect(r.waitedMs).toBe(0);
    expect(r.appeared.map((x) => x.id)).toEqual(["relay-0002"]);
  });

  it("blocks and returns when one lands", async () => {
    const root = scratch();
    write(root, "relay-0001");
    setTimeout(() => write(root, "relay-0002"), 200);
    const r = await waitForRelay("relay-0001", 5_000, root);
    expect(r.timedOut).toBe(false);
    expect(r.appeared.map((x) => x.id)).toEqual(["relay-0002"]);
    expect(r.waitedMs).toBeGreaterThan(100);
  });

  it("times out without claiming nothing was sent", async () => {
    const r = await waitForRelay("relay-0001", 1_000, scratch());
    expect(r.timedOut).toBe(true);
    expect(r.appeared).toEqual([]);
  });

  it("ignores a record that does not sort after the marker", async () => {
    const root = scratch();
    write(root, "relay-0001");
    setTimeout(() => write(root, "relay-0000"), 150);
    const r = await waitForRelay("relay-0001", 1_200, root);
    expect(r.timedOut).toBe(true);
  });
});
