import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { type AddressInfo, connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { appendRelay } from "../src/relay/deposit.js";
import {
  MAX_BODY_BYTES,
  SKEW_MS,
  type TokenTable,
  WRITES_PER_WINDOW,
  WRITE_WINDOW_MS,
  createHttpServer,
  describeCredential,
  forgetSignatures,
  forgetWriteCounts,
  loadTokens,
  parseTokens,
  replayed,
  sign,
} from "../src/relay/mcp-http.js";
import * as mcp from "../src/relay/mcp.js";
import { handle } from "../src/relay/mcp.js";

const KEY = "0123456789abcdef0123456789abcdef";
const OTHER = "fedcba9876543210fedcba9876543210";

/**
 * The HTTP transport is tested against `tools/list` and `initialize`, which
 * touch no store, plus one deposit at the `appendRelay` level with a scratch
 * root. A deposit driven through `handle()` would land in the live corpus:
 * `STORE_ROOT` is a fixed path, and `relay-0734` is the record that proves a
 * write probe with no root goes into the real store and cannot be taken out.
 */
function empty(): string {
  const root = join(mkdtempSync(join(tmpdir(), "p-e-http-")), "relay");
  mkdirSync(root, { recursive: true });
  return root;
}

const body = (id: string) => `@p-e/x0\nid: ${id}\nfrom: probe\nkind: probe\n\nscratch\n`;

describe("parseTokens", () => {
  it("maps a key to mcp/<agent> and keeps the key, which HMAC needs", () => {
    const table = parseTokens(`# a comment\n\n${KEY} zcode\n`);
    expect([...table.byAgent.keys()]).toEqual(["zcode"]);
    expect(table.byAgent.get("zcode")).toEqual({
      channel: "mcp/zcode",
      expiresAt: undefined,
      key: KEY,
    });
  });

  it("refuses a malformed line rather than skipping it", () => {
    // A file that drops the line it could not read leaves its owner believing
    // an agent can write, and the discovery happens at someone's deposit.
    expect(() => parseTokens(`${KEY}\n`)).toThrow(/line 1/);
    expect(() => parseTokens(`${KEY} zcode 2026-12-31 one-too-many\n`)).toThrow(/line 1/);
  });

  it("refuses a short key, a bad agent, and a repeat of either", () => {
    expect(() => parseTokens("short zcode\n")).toThrow(/at least 32/);
    expect(() => parseTokens(`${KEY} Zcode\n`)).toThrow(/field 2/);
    expect(() => parseTokens(`${KEY} bee..ok\n`)).not.toThrow();
    expect(() => parseTokens(`${KEY} zcode\n${OTHER} zcode\n`)).toThrow(
      /line 2: field 2 repeats the agent on line 1/,
    );
    expect(() => parseTokens(`${KEY} zcode\n${KEY} grok\n`)).toThrow(
      /line 2: field 1 repeats the token on line 1/,
    );
  });

  it("refuses a line written in the wrong order instead of swapping the columns", () => {
    // A reviewer's finding on #157, reproduced before fixing: `openssl rand
    // -hex 16` is 32 lowercase hex characters, which the old agent pattern
    // accepted, so `<agent> <key>` parsed and THE SECRET BECAME THE CHANNEL
    // LABEL — stderr at startup, and `deposited-by` in every record it wrote.
    const secret = "4e9fa61a5fe7d6ad1239afe73c3d644d";
    expect(() => parseTokens(`claude-code-agent ${secret}\n`)).toThrow();
    expect(secret.length).toBeLessThan(33);
    expect("claude-code-agent".length).toBeLessThan(32);
  });

  it("never quotes the field it refuses, because a swapped line puts a secret there", () => {
    const secret = "649bb7fb1234567890abcdef1234567890abcdef1234567890abcdeff313b412";
    for (const line of [`claude-code-agent ${secret}`, `${KEY} zcode ${secret}`]) {
      let message = "";
      try {
        parseTokens(`${line}\n`);
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      expect(message).not.toBe("");
      expect(message).not.toContain(secret);
    }
  });

  it("takes an optional expiry and refuses one it cannot read", () => {
    const dated = parseTokens(`${KEY} zcode 2026-12-31T23:59:59Z\n`);
    expect(dated.byAgent.get("zcode")?.expiresAt).toBe(Date.parse("2026-12-31T23:59:59Z"));
    expect(() => parseTokens(`${KEY} zcode soon\n`)).toThrow(/field 3/);
  });

  it("takes only a plain date or a full instant with its zone", () => {
    // Date.parse reads a zone-less time in the server's local zone — the same
    // string is 8 hours later in Los Angeles than in UTC — and it answers March
    // 2 for 2026-02-30, 1999 for 99, and January for a bare 2026.
    expect(() => parseTokens(`${KEY} a 2026-12-31\n`)).not.toThrow();
    expect(() => parseTokens(`${KEY} a 2026-12-31T23:59:59Z\n`)).not.toThrow();
    expect(() => parseTokens(`${KEY} a 2026-12-31T23:59:59+02:00\n`)).not.toThrow();
    for (const bad of ["2026-12-31T23:59:59", "12/31/2026", "2026", "99"]) {
      expect(() => parseTokens(`${KEY} a ${bad}\n`)).toThrow();
    }
  });

  it("refuses a day the calendar does not have, in either shape", () => {
    // Date.parse rolls these over instead of refusing: 2027-02-30T23:59:59Z is
    // March 2 and 2027-04-31 is May 1, on Bun and on node 22 alike. The check
    // used to run only for the day-only form, so every zoned instant walked
    // past it and a credential outlived its written date by two days.
    for (const bad of [
      "2027-02-30",
      "2027-02-30T23:59:59Z",
      "2027-04-31T00:00:00Z",
      "2027-02-30T23:59:59+02:00",
    ]) {
      expect(() => parseTokens(`${KEY} a ${bad}\n`)).toThrow(/real calendar date/);
    }
    // And a real day with an offset still passes, including one whose UTC
    // instant falls on the previous day.
    expect(() => parseTokens(`${KEY} a 2027-01-01T01:00:00+02:00\n`)).not.toThrow();
  });

  it("refuses a file with no credentials, which would serve an open endpoint", () => {
    expect(() => parseTokens("# nothing here\n")).toThrow(/no tokens/);
  });

  it("refuses a table in which every credential has already expired", () => {
    expect(() => parseTokens(`${KEY} zcode 2020-01-01\n`)).toThrow(/has not expired/);
    expect(() => parseTokens(`${KEY} zcode 2020-01-01\n${OTHER} grok\n`)).not.toThrow();
  });
});

describe("describeCredential", () => {
  const now = Date.parse("2026-06-01T00:00:00Z");
  const credential = (channel: string, expiresAt?: number) => ({ channel, expiresAt, key: KEY });

  it("says nothing about a credential with no end, and says which end otherwise", () => {
    expect(describeCredential(credential("mcp/zcode"), { now })).toBe("mcp/zcode");
    expect(describeCredential(credential("mcp/grok", now + 1000), { now })).toBe(
      `mcp/grok(until ${new Date(now + 1000).toISOString()})`,
    );
    expect(describeCredential(credential("mcp/old", now - 1000), { now })).toBe("mcp/old(EXPIRED)");
  });

  it("survives being mapped over", () => {
    // The runtime assertion that `.map(describeCredential)` misbehaves cannot be
    // written any more — it is a type error now, which is the better guard. What
    // is left worth testing is that the correct form still works over a list.
    const credentials = [
      credential("mcp/old", Date.parse("2020-01-01T00:00:00Z")),
      credential("mcp/live"),
    ];
    expect(credentials.map((c) => describeCredential(c))).toEqual(["mcp/old(EXPIRED)", "mcp/live"]);
  });
});

describe("loadTokens", () => {
  it("refuses to run without PE_MCP_TOKENS", () => {
    expect(() => loadTokens(undefined)).toThrow(/PE_MCP_TOKENS is required/);
  });

  it("reads the named file", () => {
    const path = join(mkdtempSync(join(tmpdir(), "p-e-tok-")), "tokens");
    writeFileSync(path, `${KEY} grok\n`);
    expect([...loadTokens(path).byAgent.values()].map((c) => c.channel)).toEqual(["mcp/grok"]);
  });
});

describe("the replay cache", () => {
  beforeEach(() => forgetSignatures());

  it("holds a signature for at least one window and lets it go after two", () => {
    const t0 = Date.parse("2026-06-01T00:00:00Z");
    expect(replayed("aaa", t0)).toBe(false);
    expect(replayed("aaa", t0)).toBe(true);
    // Still inside the window a signature is refused: this is the whole point.
    expect(replayed("aaa", t0 + SKEW_MS - 1)).toBe(true);
    // One rotation later it has moved to the older bucket and is still refused.
    expect(replayed("aaa", t0 + SKEW_MS + 1)).toBe(true);
    // Two rotations later the bucket holding it is gone. A signature that old
    // is refused by the skew check instead, which is what makes this safe.
    expect(replayed("aaa", t0 + 2 * SKEW_MS + 2)).toBe(false);
  });

  it("keeps refusing across a backwards clock jump, and starts rotating again", () => {
    // NTP, a VM resume, a hand on the system time. Rotation must resume — or
    // the buckets grow without bound — and the memory must survive, or a
    // signature captured just before the jump becomes usable again: the skew
    // check refuses only what is strictly further than SKEW_MS away.
    const t0 = Date.parse("2026-06-01T12:00:00Z");
    expect(replayed("bbb", t0)).toBe(false);
    const jumped = t0 - 10 * SKEW_MS;
    expect(replayed("bbb", jumped)).toBe(true);
    // Rotation resumes on the new clock rather than waiting for it to catch up.
    expect(replayed("ccc", jumped + SKEW_MS + 1)).toBe(false);
    expect(replayed("ccc", jumped + SKEW_MS + 2)).toBe(true);
  });

  it("costs the same per request whether it holds ten entries or twenty thousand", () => {
    // The swept-map version this replaced was quadratic under sustained load:
    // nothing in it was expired yet, so the sweep deleted nothing and ran again
    // on the next request. Filling 20,000 entries took 17.6 seconds against 8
    // milliseconds here, and each request after that cost 2.6 ms against 8.7 µs.
    const t0 = Date.now();
    const started = performance.now();
    for (let i = 0; i < 20_000; i++) replayed(`sig-${i}`, t0);
    expect(performance.now() - started).toBeLessThan(2000);
  });
});

/**
 * One server per describe, listening on a free port for the block's duration.
 * The listen/close pair is identical wherever it appears, and SonarCloud
 * counted the copies on #157 before this existed.
 */
function serving(table: TokenTable): () => string {
  const server = createHttpServer(table);
  let url = "";
  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
  });
  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
  return () => url;
}

describe("the HTTP transport", () => {
  const url = serving(parseTokens(`${KEY} zcode\n`));
  // The replay cache and the write counters are process-global, so one test's
  // accepted signature must not count as another's replay or spend its quota.
  beforeEach(() => {
    forgetSignatures();
    forgetWriteCounts();
  });

  const post = (init: RequestInit) => fetch(url(), { method: "POST", ...init });

  /** What a client does: serialise once, sign those exact bytes, send them. */
  function signed(payload: unknown, opts: { key?: string; agent?: string; ts?: number } = {}) {
    const bytes = JSON.stringify(payload);
    const key = opts.key ?? KEY;
    const agent = opts.agent ?? "zcode";
    const ts = opts.ts ?? Math.floor(Date.now() / 1000);
    return post({
      headers: {
        authorization: `PE-HMAC agent=${agent}, ts=${ts}, sig=${sign(key, "POST", ts, bytes)}`,
        "content-type": "application/json",
      },
      body: bytes,
    });
  }

  it("refuses anything but POST", async () => {
    const res = await fetch(url(), { method: "GET" });
    expect(res.status).toBe(405);
  });

  /**
   * A write whose bytes cannot become a record: the deposit refuses them before
   * touching the store, so the signature is consumed and the corpus is not.
   * `STORE_ROOT` is the live one — `relay-0734` is the record that proves a
   * write probe cannot be taken back out.
   */
  const writeCall = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "append_relay", arguments: { bytes: "not a record at all" } },
  };

  it("serves a read to anyone, signed or not", async () => {
    // Variant C: the corpus is already public over other routes, so a
    // credential on a read would cost compatibility and protect nothing.
    const open = await post({
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(open.status).toBe(200);
    expect(open.headers.get("x-content-type-options")).toBe("nosniff");
    expect(open.headers.get("cache-control")).toBe("no-store");
    const json = (await open.json()) as { result: { tools: { name: string }[] } };
    expect(json.result.tools.map((t) => t.name)).toContain("append_relay");

    const withCredential = await signed({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(withCredential.status).toBe(200);
  });

  it("treats an unknown tool as a write, because the default has to protect", async () => {
    // Fail-closed: the transport asks whether the tool is a NAMED READ, not
    // whether it is the one known writer. A tool added later — or a typo — is
    // protected rather than served.
    const res = await post({
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "append_relay_v2", arguments: {} },
      }),
    });
    expect(res.status).toBe(401);
  });

  it("refuses an unsigned write", async () => {
    const res = await post({
      headers: { "content-type": "application/json" },
      body: JSON.stringify(writeCall),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBe('PE-HMAC realm="p-e relay"');
  });

  it("refuses every way of failing a write with the same sentence and header", async () => {
    const stale = Math.floor((Date.now() - SKEW_MS - 5000) / 1000);
    const refusals = [
      await post({ body: JSON.stringify(writeCall) }),
      await post({
        headers: { authorization: `Bearer ${KEY}` },
        body: JSON.stringify(writeCall),
      }),
      await signed(writeCall, { key: OTHER }),
      await signed(writeCall, { agent: "nobody" }),
      await signed(writeCall, { ts: stale }),
    ];
    for (const res of refusals) {
      expect(res.status).toBe(401);
      expect(res.headers.get("www-authenticate")).toBe('PE-HMAC realm="p-e relay"');
      expect(((await res.json()) as { error: { message: string } }).error.message).toBe(
        "unauthorized",
      );
    }
  });

  it("refuses a signature it has already accepted", async () => {
    // The point of the scheme: a captured write cannot be sent twice, because a
    // second `append_relay` would be a second permanent record. The bytes here
    // are not a record, so the deposit refuses them and nothing is stored —
    // what is being tested is the second request, not the first.
    const bytes = JSON.stringify(writeCall);
    const ts = Math.floor(Date.now() / 1000);
    const sig = sign(KEY, "POST", ts, bytes);
    const send = () =>
      post({
        headers: {
          authorization: `PE-HMAC agent=zcode, ts=${ts}, sig=${sig}`,
          "content-type": "application/json",
        },
        body: bytes,
      });
    expect((await send()).status).toBe(200); // served, and the deposit refused the bytes
    expect((await send()).status).toBe(401); // the signature is spent
  });

  it("refuses a signature over different bytes than the ones sent", async () => {
    const ts = Math.floor(Date.now() / 1000);
    const sig = sign(KEY, "POST", ts, JSON.stringify({ ...writeCall, id: 99 }));
    const res = await post({
      headers: {
        authorization: `PE-HMAC agent=zcode, ts=${ts}, sig=${sig}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(writeCall),
    });
    expect(res.status).toBe(401);
  });

  it("answers a notification with 202 and no body", async () => {
    const res = await signed({ jsonrpc: "2.0", method: "notifications/initialized" });
    expect(res.status).toBe(202);
    expect(await res.text()).toBe("");
  });

  it("serves a read from a browser and still refuses the write it cannot sign", async () => {
    // Origin is not refused: a cross-origin page can drive the reads, which are
    // public anyway, and cannot produce a signature for the write. No CORS
    // header is sent, so such a page may send and may not see the answer.
    const read = await post({
      headers: { "content-type": "application/json", origin: "https://example.org" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(read.status).toBe(200);
    expect(read.headers.get("access-control-allow-origin")).toBeNull();

    const write = await post({
      headers: { "content-type": "application/json", origin: "https://example.org" },
      body: JSON.stringify(writeCall),
    });
    expect(write.status).toBe(401);
  });

  it("refuses a body over the cap before parsing it", async () => {
    const res = await post({ body: "x".repeat(MAX_BODY_BYTES + 1) });
    expect(res.status).toBe(413);
  });

  it("names a parse error without echoing the body", async () => {
    const res = await post({ body: "{not json" });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: number; message: string } };
    expect(json.error.code).toBe(-32700);
    expect(json.error.message).toBe("parse error");
  });

  it("refuses a batch, which this transport does not serve", async () => {
    const res = await post({ body: JSON.stringify([{ jsonrpc: "2.0", id: 1 }]) });
    expect(res.status).toBe(400);
  });

  it("sanitizes unexpected server errors to prevent internal details from leaking", async () => {
    const handleSpy = vi
      .spyOn(mcp, "handle")
      .mockRejectedValueOnce(new Error("Database connection failed: /var/db/secret.db"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const res = await signed({
        jsonrpc: "2.0",
        id: 42,
        method: "tools/call",
        params: { name: "get_relay", arguments: { id: "relay-0001" } },
      });
      expect(res.status).toBe(500);
      const json = (await res.json()) as { error: { code: number; message: string } };
      expect(json.error.code).toBe(-32603);
      expect(json.error.message).toBe("Internal error");
      expect(consoleSpy).toHaveBeenCalledWith("mcp-http server error:", expect.any(Error));
    } finally {
      handleSpy.mockRestore();
      consoleSpy.mockRestore();
    }
  });

  it("spends a per-agent write quota, and only on writes", async () => {
    // A stolen credential's flood costs permanent rows rather than CPU, and the
    // only limiter in front of this endpoint counts per IP — the wrong unit
    // when the harm is attributable to a key. relay-1014 named the gap.
    //
    // The bytes here cannot become a record, so the deposit refuses each one
    // and the corpus is untouched while the quota is spent.
    for (let i = 0; i < WRITES_PER_WINDOW; i++) {
      const res = await signed({ ...writeCall, id: i });
      expect(res.status).toBe(200);
    }
    const refused = await signed({ ...writeCall, id: 999 });
    expect(refused.status).toBe(429);
    // Retry-After is the time actually left in the window, so it is a range and
    // not a constant: a flat 600 would tell a caller with three seconds left to
    // sleep for ten minutes.
    const retryAfter = Number(refused.headers.get("retry-after"));
    expect(retryAfter).toBeGreaterThan(WRITE_WINDOW_MS / 1000 - 30);
    expect(retryAfter).toBeLessThanOrEqual(WRITE_WINDOW_MS / 1000);

    // Reads are not counted, so a throttled agent can still read — and the
    // corpus is public anyway, so counting them would cost compatibility and
    // protect nothing.
    const read = await post({
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(read.status).toBe(200);
  }, 15_000);

  it("refuses a request carrying two Authorization headers", async () => {
    // Node keeps the first and Bun's compat layer keeps the last, so a proxy
    // that adds its own would decide the credential differently depending on
    // what is underneath. Raw socket, because fetch will not send two.
    const { port } = new URL(url());
    const bytes = JSON.stringify(writeCall);
    const ts = Math.floor(Date.now() / 1000);
    const sig = sign(KEY, "POST", ts, bytes);
    const reply = await new Promise<string>((resolve, reject) => {
      const socket = connect(Number(port), "127.0.0.1", () => {
        socket.write(
          [
            "POST / HTTP/1.1",
            "Host: localhost",
            `Authorization: PE-HMAC agent=zcode, ts=${ts}, sig=${sig}`,
            `Authorization: PE-HMAC agent=zcode, ts=${ts}, sig=${sig}`,
            "Content-Type: application/json",
            `Content-Length: ${Buffer.byteLength(bytes)}`,
            "Connection: close",
            "",
            bytes,
          ].join("\r\n"),
        );
      });
      let out = "";
      socket.on("data", (chunk) => {
        out += chunk.toString();
      });
      socket.on("end", () => resolve(out));
      socket.on("error", reject);
    });
    expect(reply.split("\r\n")[0]).toContain("401");
  });
});

describe("an expired credential", () => {
  const EXPIRED_KEY = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const url = serving(parseTokens(`${KEY} zcode 2999-01-01\n${EXPIRED_KEY} grok 2020-01-01\n`));
  beforeEach(() => forgetSignatures());

  const call = (key: string, agent: string) => {
    const bytes = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "append_relay", arguments: { bytes: "not a record at all" } },
    });
    const ts = Math.floor(Date.now() / 1000);
    return fetch(url(), {
      method: "POST",
      headers: {
        authorization: `PE-HMAC agent=${agent}, ts=${ts}, sig=${sign(key, "POST", ts, bytes)}`,
        "content-type": "application/json",
      },
      body: bytes,
    });
  };

  it("is refused while a live one is served, and the refusal is the same one", async () => {
    // Expiry is decided per request, not at load: a server that ran through the
    // date and kept serving would make the third column decorative.
    const live = await call(KEY, "zcode");
    const dead = await call(EXPIRED_KEY, "grok");
    expect(live.status).toBe(200);
    expect(dead.status).toBe(401);
    expect(((await dead.json()) as { error: { message: string } }).error.message).toBe(
      "unauthorized",
    );
  });
});

describe("the channel reaches the deposit", () => {
  it("lands in deposited-by", async () => {
    const root = empty();
    const { id } = await appendRelay(body("relay-0001"), undefined, root, "mcp/zcode");
    const stored = readFileSync(join(root, `${id}.txt`), "utf8");
    expect(stored.startsWith("deposited-by: mcp/zcode\n")).toBe(true);
    expect(stored).toContain("provenance: as-received");
  });

  it("refuses to append when the transport says nothing about the channel", async () => {
    // The HTTP path decides what a write is from a list of tool names, and a
    // list can go stale. This is the floor underneath it: a transport that
    // cannot say how a call arrived cannot add to an append-only corpus. The
    // refusal happens before any write, so the live store is untouched.
    const response = (await handle({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "append_relay", arguments: { bytes: body("relay-0001") } },
    })) as { result: { isError?: boolean; content: { text: string }[] } };
    expect(response.result.isError).toBe(true);
    expect(response.result.content[0]?.text).toMatch(/did not establish a channel/);
  });

  it("refuses a channel the transport did not derive from a credential", async () => {
    // Guards the wiring: handle() must pass ctx.channel down, and appendRelay
    // must reject anything that is not `mcp` or `mcp/<agent>`. The refusal
    // happens before any write, so the live store is untouched by this call.
    const response = (await handle(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "append_relay", arguments: { bytes: body("relay-0001") } },
      },
      { channel: "somebody-on-the-internet" },
    )) as { result: { isError?: boolean; content: { text: string }[] } };
    expect(response.result.isError).toBe(true);
    expect(response.result.content[0]?.text).toMatch(/channel must be/);
  });

  it("defaults to mcp when a transport observed nothing", async () => {
    const root = empty();
    const { id } = await appendRelay(body("relay-0001"), undefined, root);
    expect(readFileSync(join(root, `${id}.txt`), "utf8").startsWith("deposited-by: mcp\n")).toBe(
      true,
    );
  });
});
