import { describe, expect, it } from "vitest";
import {
  READ_ONLY_TOOLS,
  TOOL_NAMES,
  UNSIGNED_OVER_HTTP,
  handle,
  loadStoreOrRefuse,
} from "../src/relay/mcp.js";

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

  it("lists the operations it has, and no more", async () => {
    const r = (await call("tools/list")) as { result: { tools: Array<{ name: string }> } };
    expect(r.result.tools.map((t) => t.name).sort()).toEqual([
      "append_relay",
      "exists",
      "get_relay",
      "list_relays",
      "list_replies",
      "wait_for_relay",
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

  it("has no operation that modifies or removes a held record", async () => {
    // This asserted read-only until relay-0075. The append was added
    // deliberately; what must still hold is that nothing can change or delete
    // what is already stored, which is the append-only property itself.
    const r = (await call("tools/list")) as { result: { tools: Array<{ name: string }> } };
    expect(
      r.result.tools.some((t) => /update|edit|delete|remove|replace|overwrite/i.test(t.name)),
    ).toBe(false);
  });
});

describe("a slow call must not hold the server", () => {
  it("answers initialize while a wait is outstanding", async () => {
    // The 502 at 20:07 was this: one awaited wait_for_relay stopped every
    // later line, including the handshake, so the host saw no response at all.
    const slow = call("tools/call", { name: "wait_for_relay", arguments: { timeout_ms: 2_000 } });
    const handshake = (await call("initialize")) as { result: { serverInfo: { name: string } } };
    expect(handshake.result.serverInfo.name).toBe("p-e-relay");
    await slow;
  });
});

describe("the append_relay description", () => {
  it("carries the two lines a caller has to copy, exactly", async () => {
    // The description is how an agent learns to sign: every MCP client reads it
    // and shows it to whatever is driving. So it is data with a contract, and
    // the contract is these two lines — the header a caller sends and the
    // string it signs. It was one long source line until #161 split it into
    // paragraphs; the split must not have moved a character of either.
    const listed = (await handle({ jsonrpc: "2.0", id: 1, method: "tools/list" })) as {
      result: { tools: Array<{ name: string; description: string }> };
    };
    const description =
      listed.result.tools.find((tool) => tool.name === "append_relay")?.description ?? "";
    expect(description).toContain(
      "  Authorization: PE-HMAC agent=<name>, ts=<unix seconds>, sig=<hex>\n",
    );
    expect(description).toContain(
      '  sig = HMAC-SHA256(key, "POST" + "\\n" + ts + "\\n" + sha256hex(raw request body))',
    );
    // And the reason the write is signed at all, which is the part a reader
    // skips at their peril.
    expect(description).toMatch(/replayed deposit is a second permanent record/);
  });
});

describe("a store that cannot be read", () => {
  it("says so without saying where it is", async () => {
    // Reproduced against a real store before this existed: chmod 000 on the
    // directory, and a public unauthenticated read came back 200 with
    // "relay store not readable at /…/relay: EACCES: permission denied,
    // scandir '/…/relay'". A 200 carrying isError, so #165's sanitising of the
    // 500 branch never saw it — handle() turns a tool's throw into a result.
    const errors: unknown[] = [];
    const spy = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };
    try {
      await expect(
        loadStoreOrRefuse(() => {
          throw new Error("relay store not readable at /srv/p-e/relay: EACCES: permission denied");
        }),
      ).rejects.toThrow("the relay store is not readable from this process");
    } finally {
      console.error = spy;
    }
    // The detail is not lost — it goes where an operator looks and a caller
    // does not. Read the captured Error rather than stringifying it: an Error
    // JSON-serialises to `{}`, so the first version of this assertion was
    // checking an empty object for the substring and would have passed on a
    // change that dropped the logging entirely.
    const logged = errors.map((args) => (args as unknown[]).map(String).join(" ")).join("\n");
    expect(logged).toContain("EACCES");
    expect(logged).toContain("/srv/p-e/relay");
  });
});

describe("the read/write classification", () => {
  it("classifies every tool, because the HTTP transport serves reads to anyone", () => {
    // The transport asks whether a tool is a named read and demands a signature
    // for everything else. A tool added to TOOLS and left out of
    // READ_ONLY_TOOLS is therefore protected — but a tool added and wrongly
    // called a read would be served to the world, so the list is pinned here.
    expect([...READ_ONLY_TOOLS].sort()).toEqual([
      "exists",
      "get_relay",
      "list_relays",
      "list_replies",
      "wait_for_relay",
    ]);
    // Every name is a real tool, and the one that is not a read is the writer.
    for (const name of READ_ONLY_TOOLS) expect(TOOL_NAMES).toContain(name);
    expect(TOOL_NAMES.filter((name) => !READ_ONLY_TOOLS.has(name))).toEqual(["append_relay"]);
  });
});

/**
 * Structured results, for the four tools whose answer is data.
 *
 * `get_relay` and `append_relay` are deliberately not among them: the text a
 * caller gets from `get_relay` is the record's own bytes, and a schema over
 * them would be this store describing a payload it refuses to parse.
 *
 * The spec (2025-06-18) says a tool returning structured content SHOULD also
 * put the serialized JSON in its text block. These do not, and the assertions
 * below pin that: the text is what six agents already read, and structure is
 * added beside it rather than over it.
 */
const structuredOf = (r: unknown): unknown =>
  (r as { result: { structuredContent?: unknown } }).result.structuredContent;

describe("structured results", () => {
  it("lets an unsigned HTTP caller reach every read but the one that holds a socket", async () => {
    // Two questions, two sets. READ_ONLY_TOOLS answers "what changes the
    // store"; UNSIGNED_OVER_HTTP answers "what may be called without a
    // credential over HTTP", and its boundary is spending the server's time.
    const held = [...READ_ONLY_TOOLS].filter((name) => !UNSIGNED_OVER_HTTP.has(name));
    expect(held).toEqual(["wait_for_relay"]);
    for (const name of UNSIGNED_OVER_HTTP) expect(READ_ONLY_TOOLS.has(name)).toBe(true);
  });

  it("gives every parameter a description, because the schema's type is not its meaning", async () => {
    const r = (await call("tools/list")) as {
      result: {
        tools: Array<{
          name: string;
          inputSchema: { properties?: Record<string, { description?: string }> };
        }>;
      };
    };
    for (const tool of r.result.tools) {
      for (const [param, schema] of Object.entries(tool.inputSchema.properties ?? {})) {
        expect(schema.description, `${tool.name}.${param}`).toBeTruthy();
      }
    }
  });

  it("declares an output schema for the four data tools and for no others", async () => {
    const r = (await call("tools/list")) as {
      result: { tools: Array<{ name: string; outputSchema?: object }> };
    };
    const withSchema = r.result.tools.filter((t) => t.outputSchema).map((t) => t.name);
    expect(withSchema.sort()).toEqual(["exists", "list_relays", "list_replies", "wait_for_relay"]);
  });

  it("every declared output schema is an object schema naming its required fields", async () => {
    const r = (await call("tools/list")) as {
      result: {
        tools: Array<{
          name: string;
          outputSchema?: { type?: string; properties?: object; required?: string[] };
        }>;
      };
    };
    for (const tool of r.result.tools.filter((t) => t.outputSchema)) {
      expect(tool.outputSchema?.type, tool.name).toBe("object");
      expect(Object.keys(tool.outputSchema?.properties ?? {}).length, tool.name).toBeGreaterThan(0);
      expect(tool.outputSchema?.required?.length, tool.name).toBeGreaterThan(0);
    }
  });

  it("exists answers a state beside the line it already answered", async () => {
    const r = await call("tools/call", { name: "exists", arguments: { id: "relay-0033" } });
    expect(textOf(r)).toBe("relay-0033: PRESENT");
    expect(structuredOf(r)).toEqual({ id: "relay-0033", state: "PRESENT" });
  });

  it("exists structures UNKNOWN, which is not a weaker KNOWN_MISSING", async () => {
    const r = await call("tools/call", { name: "exists", arguments: { id: "relay-9999" } });
    expect(structuredOf(r)).toEqual({ id: "relay-9999", state: "UNKNOWN" });
  });

  it("list_relays structures both lists, and says what it was asked after", async () => {
    const r = await call("tools/call", {
      name: "list_relays",
      arguments: { after: "relay-1160" },
    });
    const out = structuredOf(r) as { present: string[]; knownMissing: string[]; after: string };
    expect(out.after).toBe("relay-1160");
    expect(out.present).toContain("relay-1161");
    expect(out.present.every((id) => id > "relay-1160")).toBe(true);
    expect(Array.isArray(out.knownMissing)).toBe(true);
    expect(textOf(r)).toMatch(/^present \(\d+\): /);
  });

  it("list_relays says after: null when it was asked for the whole store", async () => {
    const r = await call("tools/call", { name: "list_relays", arguments: {} });
    expect((structuredOf(r) as { after: unknown }).after).toBeNull();
  });

  it("list_replies names the parent asked about, and the records naming it", async () => {
    const r = await call("tools/call", { name: "list_replies", arguments: { id: "relay-1161" } });
    const out = structuredOf(r) as {
      parent: string;
      replies: Array<{ id: string; kind: string | null }>;
    };
    expect(out.parent).toBe("relay-1161");
    expect(out.replies.map((x) => x.id)).toContain("relay-1162");
  });

  it("list_replies structures an empty answer rather than omitting it", async () => {
    const r = await call("tools/call", { name: "list_replies", arguments: { id: "relay-9999" } });
    expect(structuredOf(r)).toEqual({ parent: "relay-9999", replies: [] });
    expect(textOf(r)).toBe("no held record names relay-9999 as parent or ref");
  });

  it("wait_for_relay structures a timeout as a fact about the window", async () => {
    const r = await call("tools/call", {
      name: "wait_for_relay",
      arguments: { after: "relay-9999", timeout_ms: 1_000 },
    });
    const out = structuredOf(r) as { timedOut: boolean; waitedMs: number; appeared: unknown[] };
    expect(out.timedOut).toBe(true);
    expect(out.waitedMs).toBeGreaterThan(0);
    expect(out.appeared).toEqual([]);
  });

  it("carries nothing structured on a refusal, because a refusal is not a result", async () => {
    const r = await call("tools/call", { name: "no_such_tool", arguments: {} });
    expect((r as { result: { isError?: boolean } }).result.isError).toBe(true);
    expect(structuredOf(r)).toBeUndefined();
  });
});
