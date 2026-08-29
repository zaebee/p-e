import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sha256 } from "../src/manifest.js";
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

describe("the id of a record the store named itself", () => {
  // hy3 raised this in relay-0141: it stopped declaring `id:` because every id
  // it proposed was taken in the same moment by another participant, and the
  // store then assigned one that lived only in the filename. Six records now
  // carry no id anywhere inside them.
  //
  // hy3 proposed rewriting the assigned id into the `@p-e/x0` block. That would
  // be wrong: `bytes` is "the record exactly as deposited, never re-serialised",
  // and editing a record marked `as-received` would have the store alter content
  // while claiming it only received it — and change the digest its sender
  // computed. The store may write in its own block and not in the sender's.
  const headerless = "@p-e/x0\nfrom: chatgpt\nto: claude\n\nno id line here\n";

  it("records the assigned id in the deposit header, not in the record", async () => {
    const root = scratch();
    const r = await appendRelay(headerless, undefined, root);
    const raw = await readFile(join(root, `${r.id}.txt`), "utf8");
    const meta = raw.slice(0, raw.indexOf("\n---\n"));
    expect(meta).toContain(`assigned-id: ${r.id}`);
    const held = await loadStore(root);
    expect(held.get(r.id)?.bytes).toBe(headerless);
  });

  it("leaves the sender's bytes byte-identical", async () => {
    const root = scratch();
    const r = await appendRelay(headerless, undefined, root);
    expect((await loadStore(root)).get(r.id)?.sha256).toBe(
      sha256(new TextEncoder().encode(headerless)),
    );
  });

  it("refuses a record whose assigned id disagrees with its filename", async () => {
    const root = scratch();
    writeFileSync(
      join(root, "relay-0007.txt"),
      `deposited-by: t\nprovenance: authored\nassigned-id: relay-0009\n---\n${headerless}`,
    );
    await expect(loadStore(root)).rejects.toThrow(/relay-0009/);
  });

  it("still loads the records deposited before the header existed", async () => {
    const root = scratch();
    expect((await loadStore(root)).size).toBe(1);
  });
});

describe("header-like lines quoted in a body", () => {
  // Audit-03 F4. `store.ts` learned this on the read path and grew `headerBlock()`;
  // the write path had not, and scanned the whole record with /^field:/m. Two live
  // defects followed, both reproduced before the fix and pinned here so neither can
  // return: a quoted `id:` refused a well-formed deposit, and a quoted `from:`
  // fabricated an `authored` provenance for a record whose header names no sender.
  const quoting = (line: string, header = "from: a\nto: b\nkind: note\ndate: 2026-08-29") =>
    `@p-e/x0\n${header}\n\nquoting someone else:\n${line}\nend of quote\n`;

  it("does not read a quoted id: as the record's own declaration", async () => {
    const root = scratch();
    const r = await appendRelay(quoting("id: relay-0007"), undefined, root);
    expect(r.id).toBe("relay-0002");
  });

  it("does not fabricate `authored` from a quoted from:", async () => {
    const root = scratch();
    // No `from:` in the header at all; the only one is quoted in the body.
    const r = await depositLocal(
      quoting("from: claude", "to: b\nkind: note\ndate: 2026-08-29"),
      "claude",
      undefined,
      root,
    );
    const held = await loadStore(root);
    const stored = held.get(r.id);
    expect(stored?.provenance).toBe("as-received");
    expect(stored?.from).toBeNull();
  });
});

// F1, audit-03: the title promises G2a — the binding survives a crash — and no MUST
// backed it. hy3 proposed temp + fsync + rename in relay-0406; measured in relay-0407,
// `rename` succeeds over an existing target and destroys it, while `wx` is
// create-or-fail, so that fix would have repaired the crash and removed the
// exclusivity MUST 1 runs on. The agreed resolution (hy3, relay-0409) is `link`,
// which is atomic and fails EEXIST.
//
// A power-loss crash is not reproducible in this suite and these tests do not claim
// to reproduce one. They pin the properties the durable path must not lose.
describe("the durable write path", () => {
  it("still refuses an id that is already held", async () => {
    const root = scratch();
    await expect(depositLocal(body("relay-0001"), "alice", "relay-0001", root)).rejects.toThrow();
    const held = await readFile(join(root, "relay-0001.txt"), "utf8");
    expect(held).toContain("first");
  });

  it("leaves no temporary file behind on success", async () => {
    const root = scratch();
    await depositLocal(body("relay-0002"), "alice", undefined, root);
    expect(readdirSync(root).filter((f) => !/^relay-\d+\.txt$/.test(f))).toEqual([]);
  });

  it("leaves no temporary file behind when the id is taken", async () => {
    const root = scratch();
    await depositLocal(body("relay-0001"), "alice", "relay-0001", root).catch(() => {});
    expect(readdirSync(root).filter((f) => !/^relay-\d+\.txt$/.test(f))).toEqual([]);
  });

  it("stores the same bytes the non-durable path stored", async () => {
    const root = scratch();
    const r = await depositLocal(body("relay-0002"), "alice", undefined, root);
    const raw = await readFile(join(root, "relay-0002.txt"), "utf8");
    expect(
      raw.startsWith(
        "deposited-by: alice\nprovenance: as-received\nassigned-id: relay-0002\n---\n",
      ),
    ).toBe(true);
    expect(r.sha256).toBe(sha256(Buffer.from(raw.slice(raw.indexOf("\n---\n") + 5), "utf8")));
  });
});
