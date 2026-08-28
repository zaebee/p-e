import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  exists,
  getRelay,
  knownMissing,
  listRelays,
  listReplies,
  loadStore,
} from "../src/relay/store.js";

const store = await loadStore();

/** Writes a scratch store so the three collapse defects can be demonstrated. */
function scratch(records: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "p-e-store-"));
  mkdirSync(join(root, "relay"), { recursive: true });
  for (const [name, body] of Object.entries(records)) {
    writeFileSync(join(root, "relay", `${name}.txt`), body);
  }
  return join(root, "relay");
}

const record = (headers: string, body = "text") =>
  `deposited-by: tester\nprovenance: authored\n---\n@p-e/x0\n${headers}\n\n${body}\n`;

describe("the three ways this store could lose its own distinction", () => {
  it("does not read a malformed header as an absent one", async () => {
    // `parent: a b` used to parse as null, so two explicitly named, not-held
    // ids became UNKNOWN instead of KNOWN_MISSING.
    const root = scratch({ "relay-0001": record("id: relay-0001\nparent: relay-0000 relay-9999") });
    await expect(loadStore(root)).rejects.toThrow(/present and unparseable/);
  });

  it("does not read an absent provenance as a claim about transport", async () => {
    // A missing provenance line used to parse as `as-received` - inventing a
    // fidelity claim out of silence.
    const root = scratch({
      "relay-0001": "deposited-by: tester\n---\n@p-e/x0\nid: relay-0001\n\ntext\n",
    });
    await expect(loadStore(root)).rejects.toThrow(/must declare provenance/);
  });

  it("does not let a record adopt a header quoted in its own body", async () => {
    // relay-0060 really does carry `status: provisional is in every record...`
    // at column 0. A record lacking its own header used to take the quoted one.
    const root = scratch({
      "relay-0001": record(
        "id: relay-0001\nfrom: alice",
        "quoting another record:\nkind: decision\nparent: relay-0000",
      ),
    });
    const held = await loadStore(root);
    expect(held.get("relay-0001")?.kind).toBeNull();
    expect(held.get("relay-0001")?.parent).toBeNull();
  });
});

describe("relay store", () => {
  it("works from any working directory, because the tunnel picks one", async () => {
    const cwd = process.cwd();
    try {
      process.chdir("/tmp");
      expect((await loadStore()).size).toBeGreaterThan(0);
    } finally {
      process.chdir(cwd);
    }
  });

  it("refuses to report a missing store as an empty one", async () => {
    await expect(loadStore("/nonexistent/relay")).rejects.toThrow(/not readable/);
  });

  it("returns exact bytes, never a summary", async () => {
    const r = getRelay(store, "relay-0033");
    expect(r?.bytes).toContain("I DO NOT HAVE relay-0029, 0030, 0031");
    expect(r?.bytes.startsWith("@p-e/x0")).toBe(true);
    // The deposit header is not part of the record.
    expect(r?.bytes).not.toContain("deposited-by");
  });

  it("distinguishes three states, and the third is not a variant of the second", () => {
    expect(exists(store, "relay-0033")).toBe("PRESENT");
    expect(exists(store, "relay-0026")).toBe("KNOWN_MISSING");
    expect(exists(store, "relay-9999")).toBe("UNKNOWN");
  });

  it("reports the gap rather than closing it", () => {
    const { present, missing } = listRelays(store);
    expect(present).toContain("relay-0036");
    // relay-0026 is named as relay-0032's parent and is not held.
    expect(missing).toContain("relay-0026");
    expect(missing.every((id) => !present.includes(id))).toBe(true);
  });

  it("finds replies through a graph, not a line", () => {
    // relay-0032's parent is relay-0026, not relay-0031: the reply graph forks.
    expect(getRelay(store, "relay-0032")?.parent).toBe("relay-0026");
    expect(listReplies(store, "relay-0035").map((r) => r.id)).toEqual(["relay-0036"]);
  });

  it("records how bytes reached it, and does not claim fidelity it lacks", () => {
    expect(getRelay(store, "relay-0033")?.provenance).toBe("authored");
    expect(getRelay(store, "relay-0034")?.provenance).toBe("as-received");
  });

  it("never invents a record for an id it does not hold", () => {
    expect(getRelay(store, "relay-0030")).toBeNull();
    expect(knownMissing(store)).not.toContain("relay-0036");
  });
});
