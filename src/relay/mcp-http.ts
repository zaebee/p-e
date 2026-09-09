/**
 * The MCP server over HTTP, so an agent on another machine can deposit.
 *
 * `handle()` in `mcp.ts` is transport-agnostic; this file is the second
 * transport and adds exactly one thing the stdio one cannot have: a per-caller
 * credential, so `deposited-by` can say **which** credential the bytes arrived
 * under rather than only that they arrived.
 *
 * `#143` states the reason. On the stdio path `deposited-by: mcp` means "over
 * the local stdio channel", a narrow fact with content. The same value on a
 * public endpoint would mean "somebody", and the field would keep its name
 * while carrying nothing. So a credential maps to a label — `mcp/zcode` — and
 * the narrowness is preserved.
 *
 * **This is not identity and must not be described as it.** `relay-0863` and
 * `relay-0873`: this project cannot establish `authored` over any transport it
 * has, and a shared secret does not change that — a leaked token deposits as
 * its owner. What a token gives is a genuine observation about the channel,
 * which is the job `deposited-by` already has. `from:` stays a claim.
 *
 * **Bound to loopback, deliberately, and not by a flag.** There is no host
 * option. Publishing this endpoint means putting a reverse proxy in front of
 * it, which is a deliberate act by someone with access to the host — not a
 * variable somebody exports by accident. `settleId` claims ids with `link()`,
 * atomic on one filesystem and not across machines, so the writer must be the
 * process that holds the store.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import { MAX_RECORD_BYTES } from "./deposit.js";
import { handle } from "./mcp.js";

/** Loopback only. Not configurable — see the file comment. */
const HOST = "127.0.0.1";
const DEFAULT_PORT = 8787;

/**
 * The JSON-RPC envelope around a record, plus room for the envelope itself.
 * `MAX_RECORD_BYTES` is the store's own limit (`#122`); a request carrying one
 * record cannot legitimately be much larger, and a body above this is refused
 * before it is parsed.
 */
export const MAX_BODY_BYTES = MAX_RECORD_BYTES + 64 * 1024;

/** `mcp/<agent>`: what a credential is allowed to become in `deposited-by`. */
const AGENT = /^[a-z0-9][a-z0-9._-]{0,31}$/;

/** One credential: what it becomes in `deposited-by`, and when it stops. */
export interface Credential {
  /** e.g. `mcp/zcode`. */
  readonly channel: string;
  /** Epoch ms, or undefined for a credential with no stated end. */
  readonly expiresAt?: number;
}

export interface TokenTable {
  /** sha256(token) in hex → the credential. Used to report and to detect repeats. */
  readonly byHash: ReadonlyMap<string, Credential>;
  /**
   * The same pairs with the hash already decoded, because the comparison wants
   * bytes and the table never changes after load. gemini-code-assist on #157
   * caught the decode sitting inside the per-request loop.
   */
  readonly probes: readonly (readonly [Buffer, Credential])[];
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/**
 * Parse a token table: one `<token> <agent> [expires]` per line, `#` comments,
 * blanks ignored. Tokens are hashed on load and the plaintext is not retained.
 *
 * `expires` is optional and is any date `Date` accepts — `2026-12-31` or
 * `2026-12-31T23:59:59Z`. The MCP authorization spec asks for short-lived
 * credentials and it is the only defence against a leaked one that works
 * without an authorization server; here it costs a third column. A credential
 * with no third field does not expire, which is a decision the file's owner
 * makes per line rather than a default that hides.
 *
 * Rejects rather than skips a malformed line. A token file that silently drops
 * the line it could not read is a file whose owner believes an agent can write
 * and finds out otherwise at the deposit.
 */
export function parseTokens(text: string): TokenTable {
  const byHash = new Map<string, Credential>();
  const seen = new Set<string>();
  text.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) return;
    const parts = line.split(/\s+/);
    if (parts.length < 2 || parts.length > 3) {
      throw new Error(
        `token file line ${i + 1}: expected "<token> <agent> [expires]", got ${parts.length} fields`,
      );
    }
    const [token, agent, expires] = parts as [string, string, string | undefined];
    if (token.length < 16) {
      throw new Error(`token file line ${i + 1}: token shorter than 16 characters`);
    }
    if (!AGENT.test(agent)) {
      throw new Error(
        `token file line ${i + 1}: agent ${JSON.stringify(agent)} is not [a-z0-9][a-z0-9._-]{0,31}`,
      );
    }
    if (seen.has(agent)) throw new Error(`token file line ${i + 1}: agent ${agent} appears twice`);
    seen.add(agent);
    let expiresAt: number | undefined;
    if (expires !== undefined) {
      expiresAt = Date.parse(expires);
      if (Number.isNaN(expiresAt)) {
        throw new Error(
          `token file line ${i + 1}: ${JSON.stringify(expires)} is not a date Date.parse accepts`,
        );
      }
    }
    const hash = sha256Hex(token);
    if (byHash.has(hash)) throw new Error(`token file line ${i + 1}: duplicate token`);
    byHash.set(hash, { channel: `mcp/${agent}`, expiresAt });
  });
  if (byHash.size === 0) throw new Error("token file holds no tokens");
  return {
    byHash,
    probes: [...byHash].map(
      ([hash, credential]) => [Buffer.from(hash, "hex"), credential] as const,
    ),
  };
}

/**
 * The table named by `PE_MCP_TOKENS`.
 *
 * Absent, this throws rather than serving without credentials: a write
 * endpoint that came up open because a variable was unset is the failure this
 * whole file exists to avoid.
 */
export function loadTokens(path = process.env.PE_MCP_TOKENS): TokenTable {
  if (!path) throw new Error("PE_MCP_TOKENS is required: the path to a <token> <agent> table");
  return parseTokens(readFileSync(path, "utf8"));
}

/**
 * Constant-time lookup: compare the presented hash against every known one, and
 * decide expiry only afterwards, so the loop takes the same path either way.
 *
 * `now` is a parameter because expiry is checked per request rather than at
 * load: a server that ran through an expiry date and kept serving would make
 * the third column decorative.
 */
function channelFor(tokens: TokenTable, presented: string, now = Date.now()): string | undefined {
  const want = Buffer.from(sha256Hex(presented), "hex");
  let found: Credential | undefined;
  for (const [hash, credential] of tokens.probes) {
    if (timingSafeEqual(want, hash)) found = credential;
  }
  if (!found) return undefined;
  return found.expiresAt !== undefined && found.expiresAt <= now ? undefined : found.channel;
}

function bearer(req: IncomingMessage): string | undefined {
  const header = req.headers.authorization;
  if (typeof header !== "string") return undefined;
  const m = /^Bearer\s+(\S+)$/.exec(header.trim());
  return m?.[1];
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(text),
  });
  res.end(text);
}

const rpcError = (id: unknown, code: number, message: string) => ({
  jsonrpc: "2.0" as const,
  id: id ?? null,
  error: { code, message },
});

/** Read the body, refusing above the cap without buffering the rest of it. */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        // Pause, do not destroy. Destroying here tears the socket down before
        // the refusal is written, and the caller sees a dropped connection
        // instead of a 413 — measured: `SocketError: other side closed`, with
        // the response never delivered. The socket is closed after the reply.
        req.pause();
        reject(new RangeError(`body exceeds ${MAX_BODY_BYTES} bytes`));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Either a request to serve, or the refusal that ends the exchange. */
type Taken = { ok: true; request: Parameters<typeof handle>[0] } | { ok: false };

/** Read and parse one request, answering every refusal itself. */
async function take(req: IncomingMessage, res: ServerResponse): Promise<Taken> {
  let body: string;
  try {
    body = await readBody(req);
  } catch (error) {
    const tooLarge = error instanceof RangeError;
    if (tooLarge) {
      // The rest of the body is never read, so the connection cannot be
      // reused: say so, answer, and close once the answer is out.
      res.setHeader("connection", "close");
      res.on("finish", () => req.destroy());
    }
    send(
      res,
      tooLarge ? 413 : 400,
      rpcError(null, -32600, tooLarge ? "body too large" : "read failed"),
    );
    return { ok: false };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    send(res, 400, rpcError(null, -32700, "parse error"));
    return { ok: false };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    send(res, 400, rpcError(null, -32600, "expected one JSON-RPC request object"));
    return { ok: false };
  }
  return { ok: true, request: parsed as Parameters<typeof handle>[0] };
}

/**
 * One JSON-RPC request per POST. No SSE, no session, no CORS: a browser is not
 * a depositor, and an endpoint that answers preflight is an endpoint someone
 * will call from a page.
 */
export function createHttpServer(tokens: TokenTable): Server {
  return createServer((req, res) => {
    void (async () => {
      if (req.method !== "POST") return send(res, 405, rpcError(null, -32600, "POST only"));

      const presented = bearer(req);
      const channel = presented ? channelFor(tokens, presented) : undefined;
      if (!channel) {
        // RFC 6750: a 401 from a bearer-protected resource names its scheme, so
        // a client learns HOW to authenticate instead of guessing. The MCP
        // authorization spec builds its whole discovery on this header, and
        // adds `resource_metadata=` pointing at an RFC 9728 document — which
        // this server does not serve, because that document MUST name an
        // authorization server and there is none to name. Half a metadata
        // document would be a worse answer than none.
        //
        // No `error="invalid_token"` either. The refusal never says which half
        // failed: absent, unknown, expired and malformed are one sentence.
        res.setHeader("www-authenticate", 'Bearer realm="p-e relay"');
        return send(res, 401, rpcError(null, -32001, "unauthorized"));
      }

      const taken = await take(req, res);
      if (!taken.ok) return;

      try {
        const response = await handle(taken.request, { channel });
        // A notification carries no id and gets no body, per JSON-RPC.
        if (response === null) return void res.writeHead(204).end();
        return send(res, 200, response);
      } catch (error) {
        send(
          res,
          500,
          rpcError(
            taken.request.id,
            -32603,
            error instanceof Error ? error.message : String(error),
          ),
        );
      }
    })();
  });
}

export async function serveHttp(
  port = Number(process.env.PE_MCP_HTTP_PORT ?? DEFAULT_PORT),
): Promise<Server> {
  const tokens = loadTokens();
  const server = createHttpServer(tokens);
  await new Promise<void>((resolve) => server.listen(port, HOST, resolve));
  // Agent labels, never tokens. The count is the useful part: a table that
  // silently lost a line is visible here before anyone's deposit fails — and so
  // is a credential that has already expired, which would otherwise present as
  // an agent mysteriously getting 401 from a file that looks right.
  const now = Date.now();
  const described = [...tokens.byHash.values()].map((c) =>
    c.expiresAt === undefined
      ? c.channel
      : `${c.channel}(${c.expiresAt <= now ? "EXPIRED" : `until ${new Date(c.expiresAt).toISOString()}`})`,
  );
  console.error(
    `p-e mcp over http on ${HOST}:${port}, ${tokens.byHash.size} credential(s): ${described.join(" ")}`,
  );
  return server;
}

if (import.meta.main) await serveHttp();
