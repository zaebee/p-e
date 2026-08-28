/**
 * An MCP server over the relay store. Read-only, and no dependencies.
 *
 * Written by hand against the JSON-RPC stdio transport rather than pulled from
 * an SDK: this repository has one runtime dependency, `viem`, justified where it
 * is used, and an experimental tool is a poor reason to add a second to a public
 * tree.
 *
 * It exposes relay retrieval and one append. It does not parse a payload, does
 * not know what a p-e event is, and cannot promote anything. A retrieval
 * mechanism must not define what an event is, and the append does not either:
 * it stores bytes under an id and records how they arrived.
 */
import { appendRelay } from "./deposit.js";
import { exists, getRelay, listRelays, listReplies, loadStore } from "./store.js";
import { MAX_WAIT_MS, waitForRelay } from "./wait.js";

const PROTOCOL = "2024-11-05";

const TOOLS = [
  {
    name: "wait_for_relay",
    description:
      "Block until a record appears with an id greater than `after`, or until the timeout. Returns the metadata of what landed — fetch bytes with get_relay if you want them. THIS DOES NOT WAKE YOU: you must already be running to call it. It exists so one turn can carry several exchanges instead of one, because a caller blocked here receives the next record when it lands rather than at its next turn.",
    inputSchema: {
      type: "object",
      properties: {
        after: {
          type: "string",
          description:
            "the last id you saw, e.g. relay-0079. Omit to wait for anything not already held",
        },
        timeout_ms: { type: "number", description: `default 30000, capped at ${MAX_WAIT_MS}` },
      },
    },
  },
  {
    name: "append_relay",
    description:
      "Append one record. Never overwrites: a proposed id already held is refused. Stored as provenance: as-received and deposited-by: mcp, because this path cannot observe emission and cannot authenticate its caller — those are facts about the channel, not claims about who wrote the bytes. Omit id and the store assigns the next free one.",
    inputSchema: {
      type: "object",
      properties: {
        bytes: { type: "string", description: "the record, beginning @p-e/x0" },
        id: { type: "string", description: "optional; e.g. relay-0076. Refused if already held" },
      },
      required: ["bytes"],
    },
  },
  {
    name: "get_relay",
    description:
      "Exact bytes of one relay record, or a refusal naming its state. Never a summary and never a reconstruction.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "e.g. relay-0033" } },
      required: ["id"],
    },
  },
  {
    name: "exists",
    description:
      "PRESENT, KNOWN_MISSING (a held record names this id and the bytes are absent), or UNKNOWN (nothing here mentions it). UNKNOWN is not a weaker KNOWN_MISSING.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "list_relays",
    description:
      "Ids held and ids known to be missing, optionally after a given id. Gaps are reported, never closed.",
    inputSchema: {
      type: "object",
      properties: {
        after: { type: "string", description: "optional; return ids greater than this" },
      },
    },
  },
  {
    name: "list_replies",
    description:
      "Records whose parent or ref is the given id. The reply graph is not a line and this does not flatten it.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
];

const text = (s: string) => ({ content: [{ type: "text", text: s }] });

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const store = await loadStore();
  const id = typeof args.id === "string" ? args.id : "";

  switch (name) {
    case "get_relay": {
      const record = getRelay(store, id);
      if (!record) return text(`${id}: ${exists(store, id)} — not reconstructed`);
      // Provenance travels with the bytes. A reader that does not know how they
      // arrived cannot weigh them, and this store never claims fidelity.
      return text(
        `provenance: ${record.provenance}\ndeposited-by: ${record.depositedBy}\nintegrity-sha256: ${record.sha256}\n---\n${record.bytes}`,
      );
    }
    case "exists":
      return text(`${id}: ${exists(store, id)}`);
    case "list_relays": {
      const after = typeof args.after === "string" ? args.after : undefined;
      const { present, missing } = listRelays(store, after);
      return text(
        `present (${present.length}): ${present.join(" ") || "—"}\nknown missing (${missing.length}): ${missing.join(" ") || "—"}`,
      );
    }
    case "wait_for_relay": {
      const after = typeof args.after === "string" ? args.after : undefined;
      const ms = typeof args.timeout_ms === "number" ? args.timeout_ms : 30_000;
      const r = await waitForRelay(after, ms);
      if (r.timedOut) {
        return text(
          `nothing appeared in ${r.waitedMs}ms. That is a fact about this window, not about whether anything was sent.`,
        );
      }
      return text(
        `${r.appeared.length} record(s) after ${r.waitedMs}ms:\n` +
          r.appeared
            .map(
              (x) =>
                `${x.id}  ${x.kind ?? "?"}  from ${x.from ?? "?"} to ${x.to ?? "?"}  via ${x.depositedBy} ${x.provenance}`,
            )
            .join("\n"),
      );
    }
    case "append_relay": {
      const bytes = typeof args.bytes === "string" ? args.bytes : "";
      if (bytes.trim() === "") return text("refused: bytes is empty");
      const proposed = typeof args.id === "string" ? args.id : undefined;
      const r = await appendRelay(bytes, proposed);
      return text(
        `stored ${r.id}\nid chosen by: ${r.idSource}\nprovenance: as-received\ndeposited-by: mcp\nintegrity-sha256: ${r.sha256}\n\nThis store recorded that a call arrived over this transport carrying these bytes. It did not observe who sent them, and does not assert it.`,
      );
    }
    case "list_replies": {
      const replies = listReplies(store, id);
      if (replies.length === 0) return text(`no held record names ${id} as parent or ref`);
      return text(replies.map((r) => `${r.id}  ${r.kind}  ${r.from}>${r.to}`).join("\n"));
    }
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

interface Request {
  jsonrpc: "2.0";
  id?: number | string;
  method: string;
  params?: Record<string, unknown>;
}

export async function handle(request: Request): Promise<object | null> {
  const reply = (result: unknown) => ({ jsonrpc: "2.0" as const, id: request.id, result });

  switch (request.method) {
    case "initialize":
      return reply({
        protocolVersion: PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: { name: "p-e-relay", version: "0.1.0" },
      });
    // Notifications carry no id and get no response.
    case "notifications/initialized":
      return null;
    case "tools/list":
      return reply({ tools: TOOLS });
    case "tools/call": {
      const params = (request.params ?? {}) as {
        name?: string;
        arguments?: Record<string, unknown>;
      };
      try {
        return reply(await callTool(params.name ?? "", params.arguments ?? {}));
      } catch (error) {
        return reply({
          content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
          isError: true,
        });
      }
    }
    default:
      return {
        jsonrpc: "2.0" as const,
        id: request.id,
        error: { code: -32601, message: `method not found: ${request.method}` },
      };
  }
}

/** Newline-delimited JSON-RPC over stdin/stdout. */
export async function serve(): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of Bun.stdin.stream()) {
    buffer += decoder.decode(chunk as Uint8Array);
    let cut = buffer.indexOf("\n");
    while (cut !== -1) {
      const line = buffer.slice(0, cut).trim();
      buffer = buffer.slice(cut + 1);
      if (line) {
        // Dispatched, never awaited in the read loop.
        //
        // This used to `await handle(...)` per line, so ONE slow call held the
        // whole server: a blocked `wait_for_relay` stopped every later line
        // including `initialize`, and the host saw 502 with
        // `upstream_response_received: false`. The single-threaded limitation
        // was documented as "a blocked wait will not serve another call" —
        // understating it, because it did not serve the handshake either, so
        // the server looked dead rather than busy.
        //
        // JSON-RPC carries an id on every request, so responses may return in
        // any order. A malformed line must not take the loop down with it.
        void (async () => {
          try {
            const response = await handle(JSON.parse(line) as Request);
            if (response) console.log(JSON.stringify(response));
          } catch (error) {
            console.log(
              JSON.stringify({
                jsonrpc: "2.0",
                id: null,
                error: {
                  code: -32700,
                  message: error instanceof Error ? error.message : String(error),
                },
              }),
            );
          }
        })();
      }
      cut = buffer.indexOf("\n");
    }
  }
}

if (import.meta.main) await serve();
