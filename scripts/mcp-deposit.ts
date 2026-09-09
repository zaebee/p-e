/**
 * Deposit a record over the signed HTTP channel.
 *
 * `relay-put` writes to the filesystem and is right for a process that holds
 * the store. This is the other path: it signs a request the way any agent
 * anywhere has to, and it is deliberately the same four lines the tool
 * description and `docs/notes/connecting-an-agent.md` hand out — a reference
 * client that is also the thing we use, so it cannot drift from the advice.
 *
 * No off-the-shelf MCP client can do this: they send a bearer token or nothing,
 * and this endpoint wants an HMAC over the request bytes. That is why the
 * script exists rather than a configuration line.
 *
 *     bun run mcp-deposit record.txt --as bee.claude
 *     bun run mcp-deposit - --as bee.claude < record.txt
 *
 * The key comes from `PE_MCP_KEY`, or from the same `<key> <agent> [expires]`
 * table the server reads. **It is never printed**, not in an error and not in a
 * usage line: a key that reaches a transcript is compromised.
 */
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_URL = "https://relay.zae.life/api/mcp";
const DEFAULT_TOKENS = join(homedir(), ".config", "p-e", "mcp-tokens");

interface Options {
  readonly source: string;
  readonly agent: string;
  readonly url: string;
  readonly tokens: string;
}

function usage(problem: string): never {
  console.error(`${problem}

usage: mcp-deposit <file|-> --as <agent> [--url <url>] [--tokens <file>]

  --as      the agent name this key is filed under, e.g. bee.claude
  --url     default ${DEFAULT_URL}
  --tokens  default ${DEFAULT_TOKENS}; ignored when PE_MCP_KEY is set`);
  process.exit(2);
}

function parse(argv: readonly string[]): Options {
  const rest: string[] = [];
  let agent = "";
  let url = DEFAULT_URL;
  let tokens = DEFAULT_TOKENS;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    const value = argv[i + 1];
    if (arg === "--as" || arg === "--url" || arg === "--tokens") {
      if (value === undefined) usage(`${arg} needs a value`);
      if (arg === "--as") agent = value;
      if (arg === "--url") url = value;
      if (arg === "--tokens") tokens = value;
      i++;
    } else {
      rest.push(arg);
    }
  }
  if (rest.length !== 1) usage("name exactly one record file, or - for stdin");
  if (agent === "") usage("--as is required: it is the name the key is filed under");
  return { source: rest[0] as string, agent, url, tokens };
}

/**
 * The key for one agent, from the environment or the table.
 *
 * A missing key is reported by naming the agent and the file, never by echoing
 * a line of that file: a table written in the wrong order puts a secret where a
 * name belongs, which is how the server's own parser came to refuse quoting any
 * field it rejects.
 */
function keyFor({ agent, tokens }: Options): string {
  const fromEnv = process.env.PE_MCP_KEY;
  if (fromEnv) return fromEnv;
  let table: string;
  try {
    table = readFileSync(tokens, "utf8");
  } catch {
    usage(`no PE_MCP_KEY, and ${tokens} could not be read`);
  }
  for (const line of table.split("\n")) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2 && parts[1] === agent) return parts[0] as string;
  }
  return usage(`${tokens} holds no key filed under ${agent}`);
}

async function main(argv: readonly string[]): Promise<number> {
  const options = parse(argv);
  const bytes =
    options.source === "-" ? readFileSync(0, "utf8") : readFileSync(options.source, "utf8");
  if (bytes.trim() === "") usage("the record is empty");

  // Serialise ONCE and sign that string. Re-serialising would produce different
  // bytes and a signature that verifies nothing — the same rule the protocol
  // applies to records, and the reason this script hands `body` to both the
  // signature and the request rather than building the request twice.
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "append_relay", arguments: { bytes } },
  });
  const ts = Math.floor(Date.now() / 1000);
  const signed = `POST\n${ts}\n${createHash("sha256").update(body).digest("hex")}`;
  const sig = createHmac("sha256", keyFor(options)).update(signed).digest("hex");

  const response = await fetch(options.url, {
    method: "POST",
    headers: {
      authorization: `PE-HMAC agent=${options.agent}, ts=${ts}, sig=${sig}`,
      "content-type": "application/json",
    },
    body,
  });

  const text = await response.text();
  if (response.status !== 200) {
    // The refusal is one sentence by design, so the diagnosis is here: the
    // challenge header names the scheme, and the metadata document behind it
    // names everything else.
    console.error(`${response.status} ${response.statusText}`);
    const challenge = response.headers.get("www-authenticate");
    if (challenge) console.error(`www-authenticate: ${challenge}`);
    console.error(text);
    return 1;
  }

  const answer = JSON.parse(text) as {
    result?: { isError?: boolean; content?: Array<{ text?: string }> };
  };
  const said = answer.result?.content?.[0]?.text ?? text;
  console.log(said);
  // A deposit the store refused comes back as a 200 carrying an error result —
  // JSON-RPC's shape, not a failure of the call. The exit code says which.
  return answer.result?.isError ? 1 : 0;
}

process.exit(await main(process.argv.slice(2)));
