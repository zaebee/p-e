import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appendRelay, depositLocal } from "../src/relay/deposit.js";
import { loadStore } from "../src/relay/store.js";

function scratch(): string {
  const root = join(mkdtempSync(join(tmpdir(), "p-e-dep-")), "relay");
  mkdirSync(root, { recursive: true });
  writeFileSync(
    join(root, "relay-0001.txt"),
    "deposited-by: tester\nprovenance: authored\n---\n@p-e/x0\nid: relay-0001\nfrom: alice\n\nfirst\n",
  );
  return root;
}

const body = (id: string) =>
  `@p-e/x0\nid: ${id}\nfrom: chatgpt\nto: claude\nkind: report\n\nhello\n`;

describe("appendRelay", () => {
  it("never overwrites a held id", async () => {
    await expect(appendRelay(body("relay-0001"), "relay-0001", scratch())).rejects.toThrow(
      /already held/,
    );
  });

  it("assigns the next free id when the caller proposes none", async () => {
    const root = scratch();
    const r = await appendRelay(body("relay-0002"), undefined, root);
    expect(r.id).toBe("relay-0002");
    expect(r.idSource).toBe("store");
  });

  it("refuses a record whose declared id is not where it would be stored", async () => {
    await expect(appendRelay(body("relay-0009"), "relay-0002", scratch())).rejects.toThrow(
      /declares id: relay-0009/,
    );
  });

  it("records the channel, not an identity, and never claims authored", async () => {
    const root = scratch();
    const { id } = await appendRelay(body("relay-0002"), "relay-0002", root);
    const stored = (await loadStore(root)).get(id);
    // The caller says `from: chatgpt`. The store says only what it saw.
    expect(stored?.depositedBy).toBe("mcp");
    expect(stored?.provenance).toBe("as-received");
    expect(stored?.from).toBe("chatgpt");
  });

  it("refuses bytes that do not parse as a record", async () => {
    await expect(appendRelay("not a record at all", "relay-0002", scratch())).rejects.toThrow();
  });

  it("refuses a malformed id", async () => {
    await expect(appendRelay(body("x"), "nope", scratch())).rejects.toThrow(/must look like/);
  });
});

describe("depositLocal", () => {
  it("marks authored only when the depositor is the from: participant", async () => {
    const root = scratch();
    const mine = await depositLocal(
      body("relay-0002").replace("from: chatgpt", "from: claude"),
      "claude",
      "relay-0002",
      root,
    );
    const theirs = await depositLocal(body("relay-0003"), "claude", "relay-0003", root);
    const store = await loadStore(root);
    expect(store.get(mine.id)?.provenance).toBe("authored");
    // The record says `from: chatgpt` and this process did not write those
    // words, so it is stored as-received however it arrived.
    expect(store.get(theirs.id)?.provenance).toBe("as-received");
  });

  it("refuses to overwrite, which a shell redirect did not", async () => {
    const root = scratch();
    await expect(depositLocal(body("relay-0001"), "claude", "relay-0001", root)).rejects.toThrow(
      /already held/,
    );
  });
});

describe("a deposit that cannot be read back", () => {
  // The read-back guard was written to catch bytes that write but do not parse.
  // It could not fire: loadStore throws on such a record rather than returning a
  // map without it, so the guard's own error was unreachable and the unparseable
  // file stayed on disk, where it broke every later loadStore for every reader.
  const unreadable = "@p-e/x0\nid: relay-0002\nfrom: claude\nto: two words\n\nbody\n";

  it("rejects", async () => {
    await expect(appendRelay(unreadable, "relay-0002", scratch())).rejects.toThrow();
  });

  it("leaves the store readable", async () => {
    const root = scratch();
    await expect(appendRelay(unreadable, "relay-0002", root)).rejects.toThrow();
    const held = await loadStore(root);
    expect(held.size).toBe(1);
  });

  it("leaves the id free, so a corrected record can take it", async () => {
    const root = scratch();
    await expect(appendRelay(unreadable, "relay-0002", root)).rejects.toThrow();
    const r = await appendRelay(body("relay-0002"), "relay-0002", root);
    expect(r.id).toBe("relay-0002");
  });
});
