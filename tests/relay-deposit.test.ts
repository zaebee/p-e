import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sha256 } from "../src/manifest.js";
import { appendRelay, depositLocal } from "../src/relay/deposit.js";
import { loadStore } from "../src/relay/store.js";

/** An empty store directory. */
function empty(): string {
  const root = join(mkdtempSync(join(tmpdir(), "p-e-dep-")), "relay");
  mkdirSync(root, { recursive: true });
  return root;
}

/**
 * A record placed on disk directly, bypassing the write path — so it has no
 * allocation marker, which is the state of every store written before MUST 1.
 */
function put(root: string, id: string, text = "first"): void {
  writeFileSync(
    join(root, `${id}.txt`),
    `deposited-by: tester\nprovenance: authored\nassigned-id: ${id}\n---\n@p-e/x0\nid: ${id}\nfrom: alice\n\n${text}\n`,
  );
}

/** A store holding exactly these ids, none of them with an allocation marker. */
function storeOf(...ids: string[]): string {
  const root = empty();
  for (const id of ids) put(root, id);
  return root;
}

/** The common fixture: a store holding one record. */
function scratch(): string {
  return storeOf("relay-0001");
}

/** Deposit with no proposed id and report what the store allocated. */
async function allocated(root: string, expected: string): Promise<string> {
  const { id } = await appendRelay(body(expected), undefined, root);
  return id;
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
    // `history/` is MUST 1's marker directory and is a permanent part of the
    // store, not a leftover. Everything else must be gone.
    expect(readdirSync(root).filter((f) => !/^relay-\d+\.txt$/.test(f) && f !== "history")).toEqual(
      [],
    );
  });

  it("leaves no temporary file behind when the id is taken", async () => {
    const root = scratch();
    await depositLocal(body("relay-0001"), "alice", "relay-0001", root).catch(() => {});
    // `history/` is MUST 1's marker directory and is a permanent part of the
    // store, not a leftover. Everything else must be gone.
    expect(readdirSync(root).filter((f) => !/^relay-\d+\.txt$/.test(f) && f !== "history")).toEqual(
      [],
    );
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

/**
 * Allocation as it behaves today, pinned before MUST 1's marker is built.
 *
 * These tests describe the store we have, not the store the specification asks
 * for. `CONFORMANCE-GAP-1` records two MUST 1 failures — no `history/` directory
 * exists, and `nextFree` is `max(present) + 1`, which is the counterexample the
 * clause names in its own words: allocation "MUST be settled by an atomic
 * exclusive commit, **never by reading the current maximum**".
 *
 * The last test here reproduces `relay-0183`: the failure the whole document
 * exists for. It asserts the wrong behaviour on purpose. When the marker lands
 * that test must fail, and rewriting it is the proof the fix works — the same
 * device `settled-rulings.test.ts` uses to stop a gap closing silently.
 */
describe("allocation under the MUST 1 marker", () => {
  it("starts at relay-0001 in an empty store", async () => {
    const root = empty();
    const { id } = await appendRelay(body("relay-0001"), undefined, root);
    expect(id).toBe("relay-0001");
  });

  it("does not fill a gap below the high-water mark — MUST 1 says monotonically", async () => {
    const root = storeOf("relay-0001", "relay-0005");

    const { id } = await appendRelay(body("relay-0006"), undefined, root);

    // 0002 through 0004 are unbound and stay unavailable. The marker gives
    // "never reuses a seq"; monotonicity is the separate half of MUST 1 and is
    // what forbids going back for them. Measured on a copy of the live store:
    // without this, allocation returned relay-0001 into a store whose ids start
    // at 32.
    expect(id).toBe("relay-0006");
    // The skipped ids are NOT marked spent. Monotonicity is enforced as a rule by
    // the two places that consult the mark, rather than by writing a file per
    // unbound id — the first version did that and paid a linear walk for it on
    // every deposit.
    expect(readdirSync(join(root, "history")).sort()).toEqual([
      "relay-0001",
      "relay-0005",
      "relay-0006",
    ]);
  });

  it("refuses a proposed id at or below the mark, held or not", async () => {
    const root = storeOf("relay-0005", "relay-0006");

    // relay-0002 was never bound and no record sits there. It is still spent:
    // bindings are monotone. Measured before this check existed — it was accepted.
    await expect(appendRelay(body("relay-0002"), "relay-0002", root)).rejects.toThrow(
      /at or below relay-0006/,
    );
  });

  it("does not lower the mark when the top record is deleted", async () => {
    const root = empty();
    await appendRelay(body("relay-0001"), undefined, root);
    const second = await appendRelay(body("relay-0002"), undefined, root);
    expect(second.id).toBe("relay-0002");

    rmSync(join(root, "relay-0002.txt"));

    // The mark comes from markers as well as held records. Taking it from held
    // alone would hand relay-0002 straight back, which is the whole defect.
    const { id } = await appendRelay(body("relay-0003"), undefined, root);
    expect(id).toBe("relay-0003");
  });

  it("releases the id when a deposit fails after the marker is claimed", async () => {
    const root = storeOf("relay-0001");
    await appendRelay(body("relay-0002"), undefined, root);

    // Declares an id that cannot match the one allocated, so it throws after the
    // claim. Measured before the release existed: this burned relay-0003 — marker
    // on disk, no record, next deposit at 0004.
    await expect(
      appendRelay("@p-e/x0\nid: relay-9999\nfrom: t\n\nx\n", undefined, root),
    ).rejects.toThrow(/declares id/);

    expect(existsSync(join(root, "history", "relay-0003"))).toBe(false);
    const { id } = await appendRelay(body("relay-0003"), undefined, root);
    expect(id).toBe("relay-0003");
  });

  it("ignores a file in history/ that is not an id", async () => {
    const root = storeOf("relay-0001");
    mkdirSync(join(root, "history"), { recursive: true });
    writeFileSync(join(root, "history", "relay-10000"), "");
    writeFileSync(join(root, "history", ".DS_Store"), "");

    // Measured before the filter: relay-10000 put the mark at 10000 and every
    // later deposit failed with "the four-digit id space is exhausted".
    const { id } = await appendRelay(body("relay-0002"), undefined, root);
    expect(id).toBe("relay-0002");
  });

  it("survives concurrent first deposits into a store with no history/", async () => {
    const root = storeOf("relay-0001");

    // Four writers race to create history/ and claim an id. Before the retry
    // handled EEXIST this gave one success and three raw EEXIST throws out of
    // the deposit — gemini-code-assist on PR #3, reproduced before fixing.
    // No `id:` line: the record must not pin an id the store is choosing.
    const anonymous = "@p-e/x0\nfrom: chatgpt\nto: claude\nkind: report\n\nhello\n";
    const settled = await Promise.allSettled(
      [0, 1, 2, 3].map(() => appendRelay(anonymous, undefined, root)),
    );
    const ok = settled.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(4);
    expect(
      new Set(ok.map((r) => (r as PromiseFulfilledResult<{ id: string }>).value.id)).size,
    ).toBe(4);
  });

  it("adopts a held id whose marker is missing, and does not hand it out", async () => {
    const root = storeOf("relay-0001", "relay-0002");

    const { id } = await appendRelay(body("relay-0003"), undefined, root);

    // Neither held id had a marker — the state of every store written before
    // this mechanism. The walk created both markers, stepped over both, and
    // allocated the first id that was genuinely free.
    expect(id).toBe("relay-0003");
    expect(readdirSync(join(root, "history")).sort()).toEqual([
      "relay-0001",
      "relay-0002",
      "relay-0003",
    ]);
  });

  it("does not free a deleted id — relay-0183 cannot happen again", async () => {
    const root = empty();
    // Deposited through the write path, so the id gets its marker. This is the
    // difference that matters: a record placed on disk by other means has no
    // marker and is not protected, which the next test states outright.
    const first = await appendRelay(body("relay-0001"), undefined, root);
    expect(first.id).toBe("relay-0001");

    rmSync(join(root, "relay-0001.txt"));

    const { id } = await appendRelay(body("relay-0002"), undefined, root);

    // Was `relay-0001` before the marker existed — the delete handed the id
    // straight back. The marker survived the deletion and the walk stepped over
    // it. G1 holds: an id, once bound, never names other bytes.
    expect(id).toBe("relay-0002");
    expect(existsSync(join(root, "history", "relay-0001"))).toBe(true);
    expect(existsSync(join(root, "relay-0001.txt"))).toBe(false);
  });

  it("cannot protect an id deleted before any marker existed, and says so", async () => {
    const root = storeOf("relay-0001", "relay-0002");
    rmSync(join(root, "relay-0002.txt"));

    const { id } = await appendRelay(body("relay-0002"), undefined, root);

    // `relay-0002` WAS bound and IS handed out again. Not a defect in the
    // mechanism — a limit of what disk can tell it. The adoption in `allocate`
    // recovers markers for ids that are still held; an id bound and deleted
    // before markers existed leaves nothing that distinguishes it from an id
    // never used.
    //
    // This is the legacy authority's shape, and it is why `issue-1` says the
    // legacy store makes no G1 claim at all rather than claiming one from a
    // floor. Recovering these ids needs evidence outside the id space —
    // surviving `parent:` and `ref:` references — which is F7 and is not this
    // change.
    expect(id).toBe("relay-0002");
  });
});
