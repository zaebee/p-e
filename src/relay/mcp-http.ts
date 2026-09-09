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
 * has, and a shared secret does not change that — a leaked key deposits as its
 * owner. What a credential gives is a genuine observation about the channel,
 * which is the job `deposited-by` already has. `from:` stays a claim.
 *
 * **Reads are open; a write is signed.** The corpus is already public — the
 * same records are served unauthenticated over `/api/relay/records` — so a
 * credential on a read would buy compatibility trouble and protect nothing. The
 * harm this transport can do is specific and one-sided: a replayed
 * `append_relay` is a SECOND PERMANENT RECORD under a new id, in a corpus where
 * a record cannot be removed. So the lock sits on the write, and every read
 * tool answers whoever asks.
 *
 * **The secret does not travel.** A write carries an agent name, a timestamp
 * and an HMAC over its own bytes:
 *
 *     Authorization: PE-HMAC agent=zcode, ts=1789000000, sig=<hex>
 *     sig = HMAC-SHA256(key, `${method}\n${ts}\n${sha256(raw body)}`)
 *
 * `#156` is why. Signing the bytes and the moment closes the replay — the
 * window is ±60 seconds and a signature already seen inside it is refused — and
 * it also keeps the secret off the wire, out of proxy logs and out of anything
 * that records a header. OAuth would not have supplied either property: its
 * tokens are plain bearer, verified against the spec in `#156`.
 *
 * **The path is deliberately NOT signed.** A reverse proxy rewrites it — the
 * public `/api/pe/mcp` arrives here as whatever the proxy forwards — and a
 * signature over a rewritten path fails as an opaque 401 that no operator can
 * diagnose. The bytes and the moment are what a replay would reuse; this server
 * has one route. A second route would need a label in the signed string, and
 * that is the moment to add one.
 *
 * **Bound to loopback, deliberately, and not by a flag.** There is no host
 * option. Publishing this endpoint means putting a reverse proxy in front of
 * it, which is a deliberate act by someone with access to the host — not a
 * variable somebody exports by accident. `settleId` claims ids with `link()`,
 * atomic on one filesystem and not across machines, so the writer must be the
 * process that holds the store.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { type IncomingMessage, type Server, type ServerResponse, createServer } from "node:http";
import { MAX_RECORD_BYTES } from "./deposit.js";
import { READ_ONLY_TOOLS, handle } from "./mcp.js";

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
  /**
   * The shared key, in plaintext, because HMAC needs the material rather than a
   * digest of it. The bearer version kept only `sha256(token)` and could
   * therefore not be dumped out of memory; this one can. That is the cost of
   * taking the secret off the wire, it is a real cost, and it is named here
   * rather than left for someone to discover.
   */
  readonly key: string;
}

export interface TokenTable {
  /** Agent name → the credential. The name is public; the key is not. */
  readonly byAgent: ReadonlyMap<string, Credential>;
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
  const byAgent = new Map<string, Credential>();
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
    byAgent.set(agent, { channel: `mcp/${agent}`, expiresAt, key: token });
  });
  if (byAgent.size === 0) throw new Error("token file holds no tokens");
  // A table whose every credential has already expired serves nobody, which is
  // the state an empty file is refused for. Refusing here too means the failure
  // is a startup error naming the file rather than four agents each getting 401
  // from a file that looks correct.
  const now = Date.now();
  if ([...byAgent.values()].every((c) => c.expiresAt !== undefined && c.expiresAt <= now)) {
    throw new Error("token file holds no credential that has not expired");
  }
  return { byAgent };
}

/**
 * The table named by `PE_MCP_TOKENS`.
 *
 * Absent, this throws rather than serving without credentials: a write
 * endpoint that came up open because a variable was unset is the failure this
 * whole file exists to avoid.
 */
export function loadTokens(path = process.env.PE_MCP_TOKENS): TokenTable {
  if (!path) throw new Error("PE_MCP_TOKENS is required: the path to a <key> <agent> table");
  return parseTokens(readFileSync(path, "utf8"));
}

/** How far a request's timestamp may sit from the server's clock. */
export const SKEW_MS = 60_000;

/** `PE-HMAC agent=zcode, ts=1789000000, sig=<64 hex>` */
const AUTHORIZATION =
  /^PE-HMAC agent=([a-z0-9][a-z0-9._-]{0,23}), ts=(\d{1,15}), sig=([0-9a-f]{64})$/;

interface Presented {
  readonly agent: string;
  readonly ts: number;
  readonly sig: string;
}

function presented(req: IncomingMessage): Presented | undefined {
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
  const m = AUTHORIZATION.exec(header.trim());
  if (!m) return undefined;
  return { agent: m[1] as string, ts: Number(m[2]), sig: m[3] as string };
}

/** What the client signed: the method, the moment, and the bytes. */
export function signingString(method: string, ts: number, body: string | Buffer): string {
  return `${method}\n${ts}\n${createHash("sha256").update(body).digest("hex")}`;
}

export function sign(key: string, method: string, ts: number, body: string | Buffer): string {
  return createHmac("sha256", key)
    .update(signingString(method, ts, body))
    .digest("hex");
}

/**
 * Signatures already accepted, in two buckets that rotate rather than a map that
 * is swept.
 *
 * The first version swept the map whenever it held more than 10,000 entries.
 * gemini-code-assist saw that under sustained load nothing in it is expired yet,
 * so the sweep deletes nothing and runs again on the next request. Measured
 * against a bucketed version: filling 20,000 live entries took **17.6 seconds**
 * against 8 milliseconds, and each request after that cost **2.6 ms** against
 * **8.7 µs**. Quadratic, and it never recovers while the load lasts.
 *
 * One qualification the report did not make: only a VERIFIED signature reaches
 * this cache — the check runs last, after the HMAC — so filling it requires a
 * credential. It is a credential holder degrading the server, not an anonymous
 * flood.
 *
 * Rotating buckets remove the scan entirely. An entry lives between one and two
 * windows, which covers the ±SKEW replay window, and expiry costs one dropped
 * `Set` rather than a walk. Memory is bounded by two windows of traffic.
 */
let currentBucket = new Set<string>();
let previousBucket = new Set<string>();
let rotatedAt = 0;

function alreadyUsed(sig: string, now: number): boolean {
  const since = now - rotatedAt;
  if (since < 0) {
    // The clock went backwards — NTP, a VM resume, a hand on the system time.
    // Without this, `since` stays negative until the clock catches up and the
    // buckets never rotate, which grows without bound. gemini-code-assist on
    // #158 found that.
    //
    // But the fix it proposed clears the buckets, and that would OPEN A REPLAY
    // WINDOW: a signature accepted moments before a backwards jump is still
    // inside the skew window afterwards — the skew check refuses only what is
    // strictly further than SKEW_MS away — so forgetting it makes the captured
    // request usable again. The memory is what refuses the replay. So the clock
    // moves and the memory stays; rotation resumes from the new clock.
    rotatedAt = now;
  } else if (since >= SKEW_MS) {
    // A gap of two windows or more means neither bucket can still hold anything
    // replayable, so both go rather than one sliding into the other.
    previousBucket = since >= 2 * SKEW_MS ? new Set() : currentBucket;
    currentBucket = new Set();
    rotatedAt = now;
  }
  if (currentBucket.has(sig) || previousBucket.has(sig)) return true;
  currentBucket.add(sig);
  return false;
}

/**
 * Exported for the test that proves a signature survives one rotation and not
 * two; the server never calls it with a clock of its own.
 */
export function replayed(sig: string, now: number): boolean {
  return alreadyUsed(sig, now);
}

/**
 * Writes accepted per agent, and when that count resets.
 *
 * A stolen credential's flood does not cost CPU here, it costs PERMANENT ROWS:
 * every accepted append is a record nobody can remove. relay-grok named the gap
 * in relay-1014 — the only limiter in front of this endpoint is relay-ui's, and
 * that one counts per IP, which is the wrong unit when the harm is attributable
 * to a key rather than to a socket.
 *
 * The number is a guess and is written here as one. Deposits in this corpus are
 * human-paced — the busiest hour of its busiest day was under forty — so thirty
 * per ten minutes leaves ordinary work untouched and turns a runaway into a
 * refusal rather than a hundred rows. Raise it when a legitimate caller hits it,
 * which is a better signal than a number chosen to never fire.
 */
export const WRITES_PER_WINDOW = 30;
export const WRITE_WINDOW_MS = 10 * 60_000;

const writeCounts = new Map<string, { count: number; resetAt: number }>();

/** Whether this agent has room to write, counting the attempt if it does. */
function withinQuota(channel: string, now: number): boolean {
  const bucket = writeCounts.get(channel);
  if (bucket === undefined || now >= bucket.resetAt) {
    // Swept on insert rather than on a timer: the work is proportional to
    // traffic and stops when it does, the shape relay-ui's limiter uses.
    if (writeCounts.size > 1_000) {
      for (const [agent, held] of writeCounts) if (now >= held.resetAt) writeCounts.delete(agent);
    }
    writeCounts.set(channel, { count: 1, resetAt: now + WRITE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= WRITES_PER_WINDOW) return false;
  bucket.count++;
  return true;
}

/** For tests: the counters are process-global, as the replay cache is. */
export function forgetWriteCounts(): void {
  writeCounts.clear();
}

/** For tests: the cache is process-global, and a test must not see another's. */
export function forgetSignatures(): void {
  currentBucket = new Set();
  previousBucket = new Set();
  rotatedAt = 0;
}

/**
 * The channel this request arrived on, or `undefined` for every way of failing.
 *
 * The agent name is public, so looking it up by name leaks nothing a caller did
 * not already send. What must not leak by timing is whether a NAME is known, so
 * an unknown agent is compared against a fixed dummy key and takes the same
 * path — and the comparison of the signature itself is `timingSafeEqual`.
 *
 * `now` is a parameter because expiry and skew are decided per request rather
 * than at load: a server that ran through an expiry date and kept serving would
 * make the third column decorative.
 */
function channelFor(
  tokens: TokenTable,
  req: IncomingMessage,
  body: string | Buffer,
  now = Date.now(),
): string | undefined {
  const claim = presented(req);
  if (!claim) return undefined;

  const credential = tokens.byAgent.get(claim.agent);
  const key = credential?.key ?? "no such agent, and this string is not one";
  const want = sign(key, req.method ?? "", claim.ts, body);
  const ok = timingSafeEqual(Buffer.from(want, "hex"), Buffer.from(claim.sig, "hex"));
  if (!ok || !credential) return undefined;

  if (Math.abs(now - claim.ts * 1000) > SKEW_MS) return undefined;
  if (credential.expiresAt !== undefined && credential.expiresAt <= now) return undefined;
  // Last, because a replay is only worth recording once the signature is known
  // to be genuine: otherwise anyone could fill the cache with invented ones.
  if (alreadyUsed(claim.sig, now)) return undefined;
  return credential.channel;
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(text),
    "x-content-type-options": "nosniff",
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

/**
 * Whether this request must be signed. Anything that is not a **named read** is
 * treated as a write, including a tool this server does not have.
 *
 * The first version asked whether the tool was `append_relay`, which is
 * fail-open: a write tool added later would serve unauthenticated until someone
 * remembered this line. gemini-code-assist named that on #159. Inverted, the
 * default protects, and `READ_ONLY_TOOLS` lives beside the tool definitions in
 * `mcp.ts` where a new tool is written, with a test that fails if one is added
 * and left unclassified.
 */
function isWrite(request: Parameters<typeof handle>[0]): boolean {
  if (request.method !== "tools/call") return false;
  const params = request.params as { name?: unknown } | undefined;
  return typeof params?.name !== "string" || !READ_ONLY_TOOLS.has(params.name);
}

/** Either a request to serve, or the refusal that ends the exchange. */
type Taken = { ok: true; request: Parameters<typeof handle>[0]; body: string } | { ok: false };

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
  return { ok: true, request: parsed as Parameters<typeof handle>[0], body };
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

      // The body is read BEFORE the credential is checked, because the
      // signature covers the body: there is no way to verify a caller without
      // the bytes they signed. An unauthenticated caller can therefore make
      // this process read up to MAX_BODY_BYTES, which the cap bounds and the
      // proxy in front should bound again.
      const taken = await take(req, res);
      if (!taken.ok) return;

      // A credential is examined only for a write. A read needs none, and
      // verifying one anyway would consume its signature in the replay cache —
      // so a client that retried a read after a dropped connection would be
      // refused for replaying something that never needed protecting.
      const write = isWrite(taken.request);
      const channel = write ? channelFor(tokens, req, taken.body) : undefined;

      // `Origin` is not refused, and that is a decision rather than an
      // oversight. The Streamable HTTP transport requires the check against DNS
      // rebinding — a page driving a server the browser can reach but the
      // attacker cannot. Here the page can drive only the reads, which are
      // public by design and served unauthenticated over other routes anyway;
      // the write needs a signature the page cannot produce without the key.
      // What keeps a rebinding attack from READING anything is the absence of
      // CORS headers: a cross-origin page may send, and may not see the answer.
      // Add a permissive `Access-Control-Allow-Origin` and this reasoning is
      // void.
      if (write && !channel) {
        // A 401 names its scheme, per RFC 6750's shape, so a client learns HOW
        // to authenticate instead of guessing. The MCP authorization spec would
        // have this header also carry `resource_metadata=` pointing at an RFC
        // 9728 document — which this server does not serve, because that
        // document MUST name an authorization server and there is none to name.
        // Half a metadata document is a worse answer than none.
        //
        // Nothing else is said. Absent, malformed, unknown agent, wrong
        // signature, stale timestamp, expired credential and a replayed
        // signature are one sentence — and so is "you did not sign a write".
        res.setHeader("www-authenticate", 'PE-HMAC realm="p-e relay"');
        return send(res, 401, rpcError(null, -32001, "unauthorized"));
      }

      // The quota is charged AFTER the signature verifies, so an unsigned
      // flood cannot spend a legitimate agent's allowance, and only writes are
      // counted — a read costs nothing permanent.
      if (write && channel !== undefined && !withinQuota(channel, Date.now())) {
        res.setHeader("retry-after", String(Math.ceil(WRITE_WINDOW_MS / 1000)));
        return send(
          res,
          429,
          rpcError(
            taken.request.id,
            -32002,
            `this credential has spent its ${WRITES_PER_WINDOW} writes for the window`,
          ),
        );
      }

      try {
        const response = await handle(taken.request, { channel });
        // A notification carries no id and gets no body. 202 rather than 204:
        // the Streamable HTTP transport says a server accepting a notification
        // MUST answer 202 Accepted with no body.
        if (response === null) return void res.writeHead(202).end();
        return send(res, 200, response);
      } catch (error) {
        // Log the full error internally to stderr for diagnostics, but do not leak
        // stack traces or filesystem paths to external clients.
        console.error("mcp-http server error:", error);
        send(res, 500, rpcError(taken.request.id, -32603, "Internal error"));
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
  const described = [...tokens.byAgent.values()].map((c) => describeCredential(c));
  console.error(
    `p-e mcp over http on ${HOST}:${port}, ${tokens.byAgent.size} credential(s): ${described.join(" ")}`,
  );
  return server;
}

if (import.meta.main) await serveHttp();
