/**
 * An MCP server over the relay store. Five reads and one append, no dependencies.
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

// Revisions whose handshake and tool surface this server can serve unchanged: it
// implements only initialize / tools/list / tools/call, which none of these
// changed. We echo the client's requested revision when it is one of these,
// because answering a fixed version regardless of what was asked is how a
// handshake fails silently — the client rejects the mismatch and retries, which
// looks from here like a healthy tunnel carrying nothing but `initialize`.
// Observed on 2026-08-29: 162 consecutive initialize forwards, no tools/list,
// while every local probe succeeded.
const SERVABLE = new Set(["2024-11-05", "2025-03-26", "2025-06-18"]);

function negotiate(params: Record<string, unknown> | undefined): string {
  const asked = params?.protocolVersion;
  return typeof asked === "string" && SERVABLE.has(asked) ? asked : PROTOCOL;
}

/**
 * The `append_relay` description, in the paragraphs it actually has.
 *
 * One string on one line was unreadable in the source and gemini-code-assist
 * said so on #161. The VALUE must not change — a client reads this to learn how
 * to sign — so the pieces are joined rather than rewrapped, and
 * `tests/relay-mcp.test.ts` pins the two lines a caller has to copy.
 */
const APPEND_DESCRIPTION = [
  "Append one record. Never overwrites: a proposed id already held is refused. Omit id and the store assigns the next free one. Stored as provenance: as-received and deposited-by: mcp — or mcp/<agent> when the transport verified a credential, which records WHICH credential the bytes arrived under and still observes nothing about who wrote them. Those are facts about the channel, not claims about authorship.",

  "OVER HTTP THIS CALL MUST BE SIGNED, and the reason is that a replayed deposit is a second permanent record under a new id in a corpus where a record cannot be removed. Reads need no credential; this does. Send:",

  '  Authorization: PE-HMAC agent=<name>, ts=<unix seconds>, sig=<hex>\n  sig = HMAC-SHA256(key, "POST" + "\\n" + ts + "\\n" + sha256hex(raw request body))',

  "Sign the exact bytes you send — serialise once and hash that string, because a re-serialisation is different bytes. Do not compress the body. The timestamp is in seconds and must be within 60 of the server's clock. A signature is accepted once, so sign each call afresh. The path is not signed. Ask the operator for a key; no off-the-shelf MCP client can do this for you.",
].join("\n\n");

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
    description: APPEND_DESCRIPTION,
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

/**
 * The tools that only read. **Membership here is a security decision**, not a
 * description: the HTTP transport serves a read to anyone and demands a
 * signature for everything else, so a tool absent from this set is protected by
 * default. Adding a tool without classifying it fails a test rather than
 * quietly opening it — gemini-code-assist asked for the fail-closed direction
 * on #159, and this is where the list belongs, beside the tools themselves.
 */
export const READ_ONLY_TOOLS: ReadonlySet<string> = new Set([
  "wait_for_relay",
  "get_relay",
  "exists",
  "list_relays",
  "list_replies",
]);

/** Every tool this server serves, for the test that keeps the set above honest. */
export const TOOL_NAMES: readonly string[] = TOOLS.map((tool) => tool.name);

const text = (s: string) => ({ content: [{ type: "text", text: s }] });

/**
 * The store, or a refusal that names nothing about this machine.
 *
 * `loadStore` puts the root and the errno in its message — right for a
 * terminal, wrong for a public endpoint, where reads need no credential and
 * anyone can ask. The path went out over HTTP as a 200 carrying `isError`,
 * which is why #165's sanitising of the 500 branch did not catch it: `handle`
 * turns a tool's throw into a result, so the outer catch never sees it.
 *
 * Only this one call is bounded. A tool's own refusal — "a record must begin
 * with @p-e/x0" — is what a depositor needs to read, and swallowing it to be
 * uniformly quiet would trade a real leak for a useless endpoint.
 */
export async function loadStoreOrRefuse(
  load: typeof loadStore = loadStore,
): Promise<Awaited<ReturnType<typeof loadStore>>> {
  try {
    return await load();
  } catch (error) {
    console.error("relay store unreadable:", error);
    throw new Error("the relay store is not readable from this process");
  }
}

async function callTool(
  name: string,
  args: Record<string, unknown>,
  channel: string | undefined,
): Promise<unknown> {
  const store = await loadStoreOrRefuse();
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
      const lines = r.appeared
        .map(
          (x) =>
            `${x.id}  ${x.kind ?? "?"}  from ${x.from ?? "?"} to ${x.to ?? "?"}  via ${x.depositedBy} ${x.provenance}`,
        )
        .join("\n");
      return text(`${r.appeared.length} record(s) after ${r.waitedMs}ms:\n${lines}`);
    }
    case "append_relay": {
      if (!channel) {
        throw new Error(
          "refused: this transport did not establish a channel, so it cannot append. Over HTTP that means the request was not signed; `deposited-by` has to record how the bytes arrived, and there is nothing to record.",
        );
      }
      const bytes = typeof args.bytes === "string" ? args.bytes : "";
      if (bytes.trim() === "") return text("refused: bytes is empty");
      const proposed = typeof args.id === "string" ? args.id : undefined;
      const r = await appendRelay(bytes, proposed, undefined, channel);
      return text(
        `stored ${r.id}\nid chosen by: ${r.idSource}\nprovenance: as-received\ndeposited-by: ${channel}\nintegrity-sha256: ${r.sha256}\n\nThis store recorded that a call arrived over this transport carrying these bytes. It did not observe who sent them, and does not assert it.`,
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

/**
 * `channel` is what the transport observed about the call, and it lands in
 * `deposited-by`. The stdio path has nothing to observe beyond the channel
 * itself, so it says `mcp`; the HTTP path maps a verified signature to
 * `mcp/<agent>` and says nothing for an unauthenticated caller. A transport may
 * never derive this from the request body: bytes are a claim.
 *
 * **Absent means no append.** The default used to be `mcp`, so a transport that
 * said nothing could write as though it were the local one. It refuses instead:
 * a transport that cannot say how a call arrived has no business adding to an
 * append-only corpus, and the HTTP path relies on this — its own check for a
 * write is a list of tool names, and a list can go stale.
 */
export interface CallContext {
  readonly channel?: string;
}

export async function handle(request: Request, ctx: CallContext = {}): Promise<object | null> {
  const channel = ctx.channel;
  const reply = (result: unknown) => ({ jsonrpc: "2.0" as const, id: request.id, result });

  switch (request.method) {
    case "initialize":
      return reply({
        protocolVersion: negotiate(request.params),
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
        return reply(await callTool(params.name ?? "", params.arguments ?? {}, channel));
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
            // stdio observes one thing about a call: that it came over stdio.
            const response = await handle(JSON.parse(line) as Request, { channel: "mcp" });
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
