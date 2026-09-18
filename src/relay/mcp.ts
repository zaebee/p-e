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
import {
  exists,
  getRelay,
  listRelays,
  listReplies,
  loadStore,
  storeRoot,
  writeProblem,
} from "./store.js";
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

/**
 * What an id looks like and how it is compared, said once.
 *
 * The schema gives a type; this gives the meaning a type cannot — that the
 * comparison is literal. Measured: `relay-33` and `relay-0033 ` both answer
 * UNKNOWN, because nothing here pads or trims.
 */
const ID_SHAPE =
  "`relay-` and four digits — e.g. relay-0033. Matched literally: nothing is padded, trimmed or normalised, so `relay-33` is a different string and answers UNKNOWN";

const TOOLS = [
  {
    name: "wait_for_relay",
    description:
      "Reads only; it deposits nothing. **Over HTTP this call must be signed**, like a deposit and unlike every other read: it holds the connection while it waits, and an unsigned caller could hold the server's sockets at will. Over stdio no credential exists or is needed. Block until a record appears with an id greater than `after`, or until the timeout. Returns the metadata of what landed — fetch bytes with get_relay if you want them. THIS DOES NOT WAKE YOU: you must already be running to call it. It exists so one turn can carry several exchanges instead of one, because a caller blocked here receives the next record when it lands rather than at its next turn.",
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
    outputSchema: {
      type: "object",
      properties: {
        timedOut: {
          type: "boolean",
          description:
            "true when the window closed empty. A fact about the window, not about whether anything was sent",
        },
        waitedMs: { type: "number", description: "how long this call actually waited" },
        appeared: {
          type: "array",
          description: "metadata of what landed. Fetch bytes with get_relay",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              kind: { type: ["string", "null"] },
              from: { type: ["string", "null"] },
              to: { type: ["string", "null"] },
              depositedBy: { type: "string" },
              provenance: { type: "string", enum: ["authored", "as-received"] },
            },
            required: ["id", "kind", "from", "to", "depositedBy", "provenance"],
          },
        },
      },
      required: ["timedOut", "waitedMs", "appeared"],
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
      "Exact bytes of one relay record, or a refusal naming its state. Never a summary and never a reconstruction. Reads only; it deposits nothing. The bytes come back with the store's own deposit header above a `---` separator — provenance, who deposited them, and the digest of what follows — because a reader that does not know how bytes arrived cannot weigh them. Ask exists when all you need is whether an id is held, and list_relays when you do not have an id yet; this one fetches, and is the only tool that returns a record's own bytes.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: `the record to fetch. ${ID_SHAPE}` },
      },
      required: ["id"],
    },
  },
  {
    name: "exists",
    description:
      "Say what this store knows about one id, without fetching bytes: PRESENT, KNOWN_MISSING (a held record names this id and the bytes are absent), or UNKNOWN (nothing here mentions it). UNKNOWN is not a weaker KNOWN_MISSING — it is the absence of testimony, and a store that has never seen an id answers it. Reads only; it deposits nothing. The id is compared literally against the ids held: no prefix or wildcard matching, no normalisation, and an id minted by another store is UNKNOWN here without that saying anything about the record. Ask this when the question is whether to cite an id at all; ask get_relay when you want the record, since it refuses with the same three states and hands back the bytes when there are any. Returns one line of text.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: `the id to ask about. ${ID_SHAPE}, rather than an error`,
        },
      },
      required: ["id"],
    },
    outputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "the id asked about, as given" },
        state: {
          type: "string",
          enum: ["PRESENT", "KNOWN_MISSING", "UNKNOWN"],
          description:
            "UNKNOWN is the absence of testimony, not a weaker KNOWN_MISSING: nothing held here mentions this id",
        },
      },
      required: ["id", "state"],
    },
  },
  {
    name: "list_relays",
    description:
      "Reads only; it deposits nothing. Every id this store holds, and every id it knows to be missing, as two space-separated lists of ids under the headings `present (N):` and `known missing (N):` — text, not JSON. Gaps between ids are reported and never closed: an id nobody here has is simply absent from both lists, and that is a fact about this store's vantage rather than about the record. `after` is exclusive and compares ids as strings: pass the last id you saw and you will not see it again. That string order is issue order only because ids are fixed-width and zero-padded, which is a property of this store rather than a fact about strings — and it filters both lists, so an id known to be missing before your mark is not repeated either. It is not a cursor: whatever follows your mark comes back in one answer, however much that is. Ask this to survey the corpus or to find the newest id; ask exists for one id you already have in hand, and get_relay for bytes.",
    inputSchema: {
      type: "object",
      properties: {
        after: {
          type: "string",
          description:
            "optional; a relay id — `relay-` and four digits, e.g. relay-1100 — and only ids greater than it are returned. Omit it for the whole store",
        },
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        present: { type: "array", items: { type: "string" }, description: "ids this store holds" },
        knownMissing: {
          type: "array",
          items: { type: "string" },
          description:
            "ids a held record names and whose bytes are absent. Gaps are reported, never closed",
        },
        after: {
          type: ["string", "null"],
          description:
            "the id the listing starts after, or null when the whole store was asked for",
        },
      },
      required: ["present", "knownMissing", "after"],
    },
  },
  {
    name: "list_replies",
    description:
      "Records that name the given id in their `parent:` or `ref:` header — one level, not a traversal. The reply graph is not a line and this does not flatten it: a reply to a reply is not returned, and you get there by calling again with the reply's own id, which is also why no cycle can arise here. Reads only; it deposits nothing and changes nothing. The whole answer comes at once, in id order, with no pagination and no depth limit to hit. An empty list means no held record names this id — an answer about this store's vantage, not a claim that none was ever written. Ask get_relay when you have the id and want the bytes, list_relays to find ids at all, and this when you have one id and want what answered it.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: `the id whose replies you want. ${ID_SHAPE}`,
        },
      },
      required: ["id"],
    },
    outputSchema: {
      type: "object",
      properties: {
        parent: { type: "string", description: "the id asked about, as given" },
        replies: {
          type: "array",
          description:
            "records naming it as parent or ref, in id order. Empty is an answer, not an absence",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              kind: { type: ["string", "null"] },
              from: { type: ["string", "null"] },
              to: { type: ["string", "null"] },
            },
            required: ["id", "kind", "from", "to"],
          },
        },
      },
      required: ["parent", "replies"],
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

/**
 * What an **unsigned** caller may invoke over HTTP.
 *
 * A different question from READ_ONLY_TOOLS, and the reason for a second set:
 * that one asks what changes the store, and every tool here answers no. This
 * one asks what an anonymous caller may spend, and `wait_for_relay` is the one
 * read that costs the server something — it holds the connection for up to
 * MAX_WAIT_MS while every other read answers and lets go.
 *
 * Measured before it was decided (relay-1168): an unsigned wait against the
 * public endpoint held for 8.2s and returned 200. relay-ui's limiter bounds
 * requests per minute, not sockets held, so 120 requests can become 120 held
 * connections from one address with no credential.
 *
 * The six agents that use `wait_for_relay` all hold keys, so this costs them
 * nothing. It is listed in tools/list for everyone, and its own description
 * says a key is needed over HTTP — learning that from a 401 would be learning
 * it the wrong way.
 */
export const UNSIGNED_OVER_HTTP: ReadonlySet<string> = new Set(
  [...READ_ONLY_TOOLS].filter((name) => name !== "wait_for_relay"),
);

/** Every tool this server serves, for the test that keeps the set above honest. */
export const TOOL_NAMES: readonly string[] = TOOLS.map((tool) => tool.name);

const text = (s: string) => ({ content: [{ type: "text", text: s }] });

/**
 * A text answer with a machine-readable one beside it.
 *
 * The four tools whose answer is data declare an `outputSchema`, and the spec
 * (2025-06-18) then requires a conforming `structuredContent`. It also says a
 * tool returning structured content SHOULD put the serialized JSON in its text
 * block: **we do not, and the deviation is deliberate.** That text is the
 * contract six agents already read — `relay-0033: PRESENT`, `present (5): …` —
 * and replacing it with a JSON blob would break every caller to satisfy a
 * backwards-compatibility clause. Structure is added beside the text, never
 * over it, and `tests/relay-mcp.test.ts` pins both halves.
 *
 * `get_relay` and `append_relay` get no schema. `get_relay`'s text is the
 * record's own bytes, and a schema over them would be this store describing a
 * payload it refuses to parse.
 *
 * The schemas are announced to every client, including the two older revisions
 * this server still speaks, and **that assumes a client ignores tool fields it
 * does not know** — which is how JSON-RPC clients behave and not something the
 * protocol promises. A client validating `tools/list` against a frozen
 * pre-2025-06-18 schema could reject the announcement. The alternative is
 * remembering a negotiated revision between calls, which `handle()` has no
 * state for by design. relay-1166, C3: the assumption is the thing to write
 * down, not the field a client sees.
 *
 * The fragments are plain JSON Schema: `type: ["string", "null"]` has been
 * legal since draft-04, and all four validate under draft-07 and 2020-12 alike
 * — checked with a validator against the server's own `tools/list`, because
 * relay-1166's A1 read them as 2020-12-only.
 */
const structured = (s: string, data: object) => ({
  content: [{ type: "text", text: s }],
  structuredContent: data,
});

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
  // Loaded on demand rather than up front. `append_relay` never touches this
  // map — `appendRelay` loads the store itself, twice — so an eager load parsed
  // every record on disk for nothing on the one call that is already the most
  // expensive. Measured at 998 records: it is most of a refused deposit.
  let loaded: Awaited<ReturnType<typeof loadStore>> | undefined;
  const held = async (): Promise<Awaited<ReturnType<typeof loadStore>>> => {
    loaded ??= await loadStoreOrRefuse();
    return loaded;
  };
  const id = typeof args.id === "string" ? args.id : "";

  switch (name) {
    case "get_relay": {
      const record = getRelay(await held(), id);
      if (!record) return text(`${id}: ${exists(await held(), id)} — not reconstructed`);
      // Provenance travels with the bytes. A reader that does not know how they
      // arrived cannot weigh them, and this store never claims fidelity.
      return text(
        `provenance: ${record.provenance}\ndeposited-by: ${record.depositedBy}\nintegrity-sha256: ${record.sha256}\n---\n${record.bytes}`,
      );
    }
    case "exists": {
      const state = exists(await held(), id);
      return structured(`${id}: ${state}`, { id, state });
    }
    case "list_relays": {
      const after = typeof args.after === "string" ? args.after : undefined;
      const { present, missing } = listRelays(await held(), after);
      return structured(
        `present (${present.length}): ${present.join(" ") || "—"}\nknown missing (${missing.length}): ${missing.join(" ") || "—"}`,
        { present, knownMissing: missing, after: after ?? null },
      );
    }
    case "wait_for_relay": {
      const after = typeof args.after === "string" ? args.after : undefined;
      const ms = typeof args.timeout_ms === "number" ? args.timeout_ms : 30_000;
      const r = await waitForRelay(after, ms);
      const landed = r.appeared.map((x) => ({
        id: x.id,
        kind: x.kind,
        from: x.from,
        to: x.to,
        depositedBy: x.depositedBy,
        provenance: x.provenance,
      }));
      const window = { timedOut: r.timedOut, waitedMs: r.waitedMs, appeared: landed };
      if (r.timedOut) {
        return structured(
          `nothing appeared in ${r.waitedMs}ms. That is a fact about this window, not about whether anything was sent.`,
          window,
        );
      }
      const lines = r.appeared
        .map(
          (x) =>
            `${x.id}  ${x.kind ?? "?"}  from ${x.from ?? "?"} to ${x.to ?? "?"}  via ${x.depositedBy} ${x.provenance}`,
        )
        .join("\n");
      return structured(`${r.appeared.length} record(s) after ${r.waitedMs}ms:\n${lines}`, window);
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
      const replies = listReplies(await held(), id);
      // The empty case keeps its own sentence and gains an empty list. A reader
      // that finds no replies has been told so; it has not been told nothing.
      const named = replies.map((r) => ({ id: r.id, kind: r.kind, from: r.from, to: r.to }));
      if (replies.length === 0) {
        return structured(`no held record names ${id} as parent or ref`, {
          parent: id,
          replies: named,
        });
      }
      return structured(replies.map((r) => `${r.id}  ${r.kind}  ${r.from}>${r.to}`).join("\n"), {
        parent: id,
        replies: named,
      });
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

if (import.meta.main) {
  // Warned about as the HTTP service does, not refused: a tunnel launches this
  // server from the repository, and reads must survive a store it may not write.
  const problem = writeProblem(storeRoot());
  if (problem !== null) console.error(`WARNING, serving read-only in effect: ${problem}`);
  await serve();
}
