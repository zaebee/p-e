import { describe, expect, it } from "vitest";
import { handle } from "../src/relay/mcp.js";

/** Drives the server the way a client would, over the JSON-RPC shapes. */
const call = (method: string, params?: Record<string, unknown>) =>
  handle({ jsonrpc: "2.0", id: 1, method, params });

const textOf = (r: unknown): string =>
  (r as { result: { content: Array<{ text: string }> } }).result.content[0]?.text ?? "";

describe("relay MCP server", () => {
  it("initializes with tools capability", async () => {
    const r = (await call("initialize")) as {
      result: { protocolVersion: string; capabilities: object };
    };
    expect(r.result.protocolVersion).toBe("2024-11-05");
    expect(r.result.capabilities).toHaveProperty("tools");
  });

  it("answers no response to a notification", async () => {
    expect(await handle({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
  });

  it("lists exactly the four read operations", async () => {
    const r = (await call("tools/list")) as { result: { tools: Array<{ name: string }> } };
    expect(r.result.tools.map((t) => t.name).sort()).toEqual([
      "exists",
      "get_relay",
      "list_relays",
      "list_replies",
    ]);
  });

  it("returns exact bytes with provenance travelling beside them", async () => {
    const out = textOf(
      await call("tools/call", { name: "get_relay", arguments: { id: "relay-0033" } }),
    );
    expect(out).toContain("provenance: authored");
    expect(out).toContain("integrity-sha256:");
    expect(out).toContain("I DO NOT HAVE relay-0029, 0030, 0031");
  });

  it("refuses to reconstruct, and names the state instead", async () => {
    const out = textOf(
      await call("tools/call", { name: "get_relay", arguments: { id: "relay-0030" } }),
    );
    expect(out).toBe("relay-0030: UNKNOWN — not reconstructed");
  });

  it("keeps KNOWN_MISSING apart from UNKNOWN over the wire", async () => {
    expect(
      textOf(await call("tools/call", { name: "exists", arguments: { id: "relay-0026" } })),
    ).toBe("relay-0026: KNOWN_MISSING");
    expect(
      textOf(await call("tools/call", { name: "exists", arguments: { id: "relay-0031" } })),
    ).toBe("relay-0031: UNKNOWN");
  });

  it("reports gaps in a listing rather than closing them", async () => {
    const out = textOf(await call("tools/call", { name: "list_relays", arguments: {} }));
    // Asserts the behaviour, not a tally. An earlier version pinned
    // "known missing (1): relay-0026" and went red the moment a record was
    // deposited that named another absent id — a test that fails when the
    // store does its job correctly.
    const missing = /known missing \((\d+)\): (.*)/.exec(out);
    expect(missing).not.toBeNull();
    const [, count, ids] = missing as RegExpExecArray;
    expect(Number(count)).toBeGreaterThan(0);
    const present = /present \(\d+\): (.*)/.exec(out)?.[1]?.split(" ") ?? [];
    for (const id of (ids ?? "").split(" ")) expect(present).not.toContain(id);
  });

  it("has no write operation", async () => {
    const r = (await call("tools/list")) as { result: { tools: Array<{ name: string }> } };
    expect(r.result.tools.some((t) => /deposit|append|write|put/i.test(t.name))).toBe(false);
  });
});
