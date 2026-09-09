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

/**
 * `mcp/<agent>`: what a credential is allowed to become in `deposited-by`.
 *
 * The lengths of the two columns are deliberately **disjoint** — an agent is at
 * most 24 characters, a token at least 32 — so that a line written in the wrong
 * order fails instead of being accepted with the fields swapped. Found by a
 * reviewer on #157 and reproduced here: `openssl rand -hex 16` is 32 lowercase
 * hex characters, which matched this pattern, so `<agent> <token>` parsed
 * cleanly and made THE SECRET the channel label — printed to stderr at startup
 * and written into `deposited-by` of every record deposited under it, in a
 * corpus where a record cannot be removed.
 */
const AGENT = /^[a-z0-9][a-z0-9._-]{0,23}$/;
const MIN_TOKEN = 32;

/**
 * The two shapes an expiry may take: a calendar day, or a full ISO-8601 instant
 * carrying its zone. Two patterns rather than one with an optional tail —
 * SonarCloud counted the combined form at complexity 27 against a limit of 20,
 * and the split also gives the round-trip check below the day-only test it was
 * doing by string length.
 *
 * `Date.parse` accepts far more and reads some of it in the server's LOCAL
 * zone: `2026-12-31T23:59:59` is 8 hours later in Los Angeles than in UTC and
 * 14 hours earlier in Kiritimati — measured. It also accepts `12/31/2026`,
 * turns `2026-02-30` into March 2 without complaint, and reads `99` as 1999.
 * A credential's end is not a place to be generous.
 */
const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

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
  // Agent → the line that first used it, and hash → likewise. A repeat is
  // reported by naming both lines, which is more useful than naming the value
  // and does not quote a field: an operator with two line numbers can see the
  // pair, and a message that echoes the field would print a secret whenever
  // the line it rejects is one with the columns swapped.
  const agentLine = new Map<string, number>();
  const tokenLine = new Map<string, number>();
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
    // No refusal below quotes the field it rejects. A line written in the wrong
    // order puts a secret where a name belongs, and a message that echoes it
    // writes the secret to stderr — the same reviewer's finding, one step on.
    if (token.length < MIN_TOKEN) {
      throw new Error(
        `token file line ${i + 1}: field 1 is the token and must be at least ${MIN_TOKEN} characters`,
      );
    }
    if (!AGENT.test(agent)) {
      throw new Error(
        `token file line ${i + 1}: field 2 is the agent and must match [a-z0-9][a-z0-9._-]{0,23} — note the columns are <token> <agent>, in that order`,
      );
    }
    const earlierAgent = agentLine.get(agent);
    if (earlierAgent !== undefined) {
      throw new Error(
        `token file line ${i + 1}: field 2 repeats the agent on line ${earlierAgent}`,
      );
    }
    agentLine.set(agent, i + 1);
    let expiresAt: number | undefined;
    if (expires !== undefined) {
      if (!CALENDAR_DAY.test(expires) && !INSTANT.test(expires)) {
        throw new RangeError(
          `token file line ${i + 1}: field 3 is the expiry and must be YYYY-MM-DD or a full ISO-8601 instant with its zone`,
        );
      }
      // `Date.parse` accepts a day the calendar does not have and rolls it
      // over: `2027-02-30T23:59:59Z` becomes March 2, `2027-04-31` becomes May
      // 1 — measured on both Bun and node 22, so this is not a runtime quirk.
      // The day is therefore checked on its own, from the string's first ten
      // characters, rather than by round-tripping the parsed instant: an
      // instant carrying an offset legitimately lands on a different UTC day
      // than the one written, and a round trip cannot tell that from a typo.
      // gemini-code-assist found the hole on #157 — the check was there and
      // ran only for the day-only form, so every zoned instant walked past it.
      const year = Number(expires.slice(0, 4));
      const month = Number(expires.slice(5, 7));
      const day = Number(expires.slice(8, 10));
      // `Date.UTC` maps years 0-99 onto 1900-1999, so a four-digit `0026`
      // fails this comparison. A credential expiring in the year 26 is a typo
      // either way, and refusing it names the field rather than the century.
      const asWritten = new Date(Date.UTC(year, month - 1, day));
      if (
        asWritten.getUTCFullYear() !== year ||
        asWritten.getUTCMonth() !== month - 1 ||
        asWritten.getUTCDate() !== day
      ) {
        throw new RangeError(`token file line ${i + 1}: field 3 is not a real calendar date`);
      }
      expiresAt = Date.parse(expires);
      if (Number.isNaN(expiresAt)) {
        // `RangeError`, not the `TypeError` SonarCloud's S7786 asks for and not
        // the bare `Error` this was: a string that is not a date is well-typed
        // and out of domain, which is what the language itself says —
        // `new Date("soon").toISOString()` throws `RangeError: Invalid Date`.
        // The sibling refusals here stay `Error`: a duplicate agent or a short
        // token is neither a type nor a range.
        throw new RangeError(`token file line ${i + 1}: field 3 is not a date`);
      }
    }
    const hash = sha256Hex(token);
    const earlierToken = tokenLine.get(hash);
    if (earlierToken !== undefined) {
      throw new Error(
        `token file line ${i + 1}: field 1 repeats the token on line ${earlierToken}`,
      );
    }
    tokenLine.set(hash, i + 1);
    byHash.set(hash, { channel: `mcp/${agent}`, expiresAt });
  });
  if (byHash.size === 0) throw new Error("token file holds no tokens");
  // A table whose every credential has already expired serves nobody, which is
  // the state an empty file is refused for. Refusing here too means the failure
  // is a startup error naming the file rather than four agents each getting 401
  // from a file that looks correct.
  const now = Date.now();
  if ([...byHash.values()].every((c) => c.expiresAt !== undefined && c.expiresAt <= now)) {
    throw new Error("token file holds no credential that has not expired");
  }
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
  // More than one Authorization header is refused rather than resolved. Node
  // keeps the first and Bun's compatibility layer keeps the last — measured on
  // #157 — so a proxy that adds its own would produce a different credential
  // depending on the runtime underneath. There is no reading of two credentials
  // that this server should pick between.
  let seen = 0;
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    if (req.rawHeaders[i]?.toLowerCase() === "authorization") seen++;
  }
  if (seen > 1) return undefined;

  const header = req.headers.authorization;
  if (typeof header !== "string") return undefined;
  // A single space and printable ASCII, per RFC 6750. `\s` also matched tabs and
  // a non-breaking space, which no client should be sending and which this has
  // no reason to accept.
  const m = /^Bearer ([\x21-\x7e]+)$/.exec(header.trim());
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

/**
 * `mcp/zcode`, `mcp/grok(until 2026-12-31T00:00:00.000Z)`, `mcp/old(EXPIRED)`.
 *
 * The clock arrives in an options object so that `.map(describeCredential)` is a
 * **compile error** rather than a bug: `map` supplies the index as the second
 * argument, and with a bare `now = Date.now()` every expiry compared against 0,
 * 1, 2… so an expired credential printed `until <a past date>` — the exact
 * opposite of this line's job. SonarCloud caught the live instance on #157 and a
 * test pinned it; gemini-code-assist then pointed out that the type system can
 * refuse it outright, which beats detecting it.
 */
export function describeCredential(credential: Credential, options: { now?: number } = {}): string {
  const now = options.now ?? Date.now();
  if (credential.expiresAt === undefined) return credential.channel;
  const when =
    credential.expiresAt <= now
      ? "EXPIRED"
      : `until ${new Date(credential.expiresAt).toISOString()}`;
  return `${credential.channel}(${when})`;
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
  const described = [...tokens.byHash.values()].map((c) => describeCredential(c));
  console.error(
    `p-e mcp over http on ${HOST}:${port}, ${tokens.byHash.size} credential(s): ${described.join(" ")}`,
  );
  return server;
}

if (import.meta.main) await serveHttp();
