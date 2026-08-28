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
