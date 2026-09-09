import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { type AddressInfo, connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appendRelay } from "../src/relay/deposit.js";
import {
  MAX_BODY_BYTES,
  type TokenTable,
  createHttpServer,
  describeCredential,
  loadTokens,
  parseTokens,
} from "../src/relay/mcp-http.js";
import { handle } from "../src/relay/mcp.js";

const TOKEN = "0123456789abcdef0123456789abcdef";
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
  it("maps a token to mcp/<agent> and keeps no plaintext", () => {
    const table = parseTokens(`# a comment\n\n${TOKEN} zcode\n`);
    expect([...table.byHash.values()]).toEqual([{ channel: "mcp/zcode", expiresAt: undefined }]);
    expect(JSON.stringify([...table.byHash])).not.toContain(TOKEN);
  });

  it("takes an optional expiry and refuses a date it cannot read", () => {
    const dated = parseTokens(`${TOKEN} zcode 2026-12-31T23:59:59Z\n`);
    expect([...dated.byHash.values()][0]?.expiresAt).toBe(Date.parse("2026-12-31T23:59:59Z"));
    expect(() => parseTokens(`${TOKEN} zcode soon\n`)).toThrow(/field 3/);
    expect(() => parseTokens(`${TOKEN} zcode 2026-12-31 extra\n`)).toThrow(/line 1/);
  });

  it("refuses a malformed line rather than skipping it", () => {
    // A file that drops the line it could not read leaves its owner believing
    // an agent can write, and the discovery happens at someone's deposit.
    expect(() => parseTokens(`${TOKEN}\n`)).toThrow(/line 1/);
    expect(() => parseTokens(`${TOKEN} zcode 2026-12-31 one-too-many\n`)).toThrow(/line 1/);
  });

  it("refuses a short token, a bad agent, and a repeat of either", () => {
    expect(() => parseTokens("short zcode\n")).toThrow(/at least 32/);
    expect(() => parseTokens(`${TOKEN} Zcode\n`)).toThrow(/field 2/);
    expect(() => parseTokens(`${TOKEN} bee..ok\n`)).not.toThrow();
    expect(() => parseTokens(`${TOKEN} zcode\n${OTHER} zcode\n`)).toThrow(/twice/);
    expect(() => parseTokens(`${TOKEN} zcode\n${TOKEN} grok\n`)).toThrow(/duplicate token/);
  });

  it("refuses a line written in the wrong order instead of swapping the columns", () => {
    // A reviewer's finding on #157, reproduced before fixing: `openssl rand
    // -hex 16` is 32 lowercase hex characters, which the old agent pattern
    // accepted, so `<agent> <token>` parsed and THE TOKEN BECAME THE CHANNEL
    // LABEL — stderr at startup, and `deposited-by` in every record it wrote.
    const secret = "4e9fa61a5fe7d6ad1239afe73c3d644d";
    expect(() => parseTokens(`claude-code-agent ${secret}\n`)).toThrow();
    // The lengths are disjoint, so the swap cannot pass either column.
    expect(secret.length).toBeLessThan(33);
    expect("claude-code-agent".length).toBeLessThan(32);
  });

  it("never quotes the field it refuses, because a swapped line puts a secret there", () => {
    const secret = "649bb7fb1234567890abcdef1234567890abcdef1234567890abcdeff313b412";
    for (const line of [`claude-code-agent ${secret}`, `${TOKEN} zcode ${secret}`]) {
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

  it("takes only a plain date or a full instant with its zone", () => {
    // Date.parse reads a zone-less time in the server's local zone — the same
    // string is 8 hours later in Los Angeles than in UTC — and it answers March
    // 2 for 2026-02-30, 1999 for 99, and January for a bare 2026.
    expect(() => parseTokens(`${TOKEN} a 2026-12-31\n`)).not.toThrow();
    expect(() => parseTokens(`${TOKEN} a 2026-12-31T23:59:59Z\n`)).not.toThrow();
    expect(() => parseTokens(`${TOKEN} a 2026-12-31T23:59:59+02:00\n`)).not.toThrow();
    for (const bad of ["2026-12-31T23:59:59", "12/31/2026", "2026", "99", "2026-02-30"]) {
      expect(() => parseTokens(`${TOKEN} a ${bad}\n`)).toThrow();
    }
  });

  it("refuses a table in which every credential has already expired", () => {
    expect(() => parseTokens(`${TOKEN} zcode 2020-01-01\n`)).toThrow(/has not expired/);
    expect(() => parseTokens(`${TOKEN} zcode 2020-01-01\n${OTHER} grok\n`)).not.toThrow();
  });

  it("refuses a file with no tokens, which would serve an open endpoint", () => {
    expect(() => parseTokens("# nothing here\n")).toThrow(/no tokens/);
  });
});

describe("describeCredential", () => {
  const now = Date.parse("2026-06-01T00:00:00Z");

  it("says nothing about a credential with no end, and says which end otherwise", () => {
    expect(describeCredential({ channel: "mcp/zcode" }, { now })).toBe("mcp/zcode");
    expect(describeCredential({ channel: "mcp/grok", expiresAt: now + 1000 }, { now })).toBe(
      `mcp/grok(until ${new Date(now + 1000).toISOString()})`,
    );
    expect(describeCredential({ channel: "mcp/old", expiresAt: now - 1000 }, { now })).toBe(
      "mcp/old(EXPIRED)",
    );
  });

  it("survives being mapped over", () => {
    // The runtime assertion that `.map(describeCredential)` misbehaves cannot be
    // written any more — it is a type error now, which is the better guard. What
    // is left worth testing is that the correct form still works over a list.
    const credentials = [
      { channel: "mcp/old", expiresAt: Date.parse("2020-01-01T00:00:00Z") },
      { channel: "mcp/live" },
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
    writeFileSync(path, `${TOKEN} grok\n`);
    expect([...loadTokens(path).byHash.values()].map((c) => c.channel)).toEqual(["mcp/grok"]);
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
  const url = serving(parseTokens(`${TOKEN} zcode\n`));

  const post = (init: RequestInit) => fetch(url(), { method: "POST", ...init });
  const authed = (payload: unknown) =>
    post({
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

  it("refuses anything but POST", async () => {
    const res = await fetch(url(), { method: "GET" });
    expect(res.status).toBe(405);
  });

  it("refuses an absent, malformed or unknown credential with the same sentence", async () => {
    const none = await post({ body: "{}" });
    const wrong = await post({ headers: { authorization: `Bearer ${OTHER}` }, body: "{}" });
    const malformed = await post({ headers: { authorization: TOKEN }, body: "{}" });
    expect([none.status, wrong.status, malformed.status]).toEqual([401, 401, 401]);
    const bodies = await Promise.all([none.json(), wrong.json(), malformed.json()]);
    for (const b of bodies) expect(b.error.message).toBe("unauthorized");
    // RFC 6750: the refusal names its scheme, and names nothing else — the same
    // sentence and the same header whichever half failed.
    for (const res of [none, wrong, malformed]) {
      expect(res.headers.get("www-authenticate")).toBe('Bearer realm="p-e relay"');
    }
  });

  it("serves tools/list to a credential it knows", async () => {
    const res = await authed({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { result: { tools: { name: string }[] } };
    expect(json.result.tools.map((t) => t.name)).toContain("append_relay");
  });

  it("answers a notification with 204 and no body", async () => {
    const res = await authed({ jsonrpc: "2.0", method: "notifications/initialized" });
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
  });

  it("refuses a body over the cap before parsing it", async () => {
    const res = await post({
      headers: { authorization: `Bearer ${TOKEN}` },
      body: "x".repeat(MAX_BODY_BYTES + 1),
    });
    expect(res.status).toBe(413);
  });

  it("names a parse error without echoing the body", async () => {
    const res = await post({ headers: { authorization: `Bearer ${TOKEN}` }, body: "{not json" });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error: { code: number; message: string } };
    expect(json.error.code).toBe(-32700);
    expect(json.error.message).toBe("parse error");
  });

  it("refuses a request carrying two Authorization headers", async () => {
    // Node keeps the first and Bun's compat layer keeps the last, so a proxy
    // that adds its own would decide the credential differently depending on
    // what is underneath. Raw socket, because fetch will not send two.
    const { port } = new URL(url());
    const reply = await new Promise<string>((resolve, reject) => {
      const socket = connect(Number(port), "127.0.0.1", () => {
        const request = [
          "POST / HTTP/1.1",
          "Host: localhost",
          `Authorization: Bearer ${TOKEN}`,
          `Authorization: Bearer ${OTHER}`,
          "Content-Type: application/json",
          "Content-Length: 2",
          "Connection: close",
          "",
          "{}",
        ].join("\r\n");
        socket.write(request);
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

  it("refuses a batch, which this transport does not serve", async () => {
    const res = await authed([{ jsonrpc: "2.0", id: 1, method: "tools/list" }]);
    expect(res.status).toBe(400);
  });
});

describe("an expired credential", () => {
  const EXPIRED = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const url = serving(parseTokens(`${TOKEN} zcode 2999-01-01\n${EXPIRED} grok 2020-01-01\n`));

  const call = (token: string) =>
    fetch(url(), {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });

  it("is refused while a live one is served, and the refusal is the same one", async () => {
    // Expiry is decided per request, not at load: a server that ran through the
    // date and kept serving would make the third column decorative.
    const live = await call(TOKEN);
    const dead = await call(EXPIRED);
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
