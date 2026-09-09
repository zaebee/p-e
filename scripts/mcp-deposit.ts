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

const FLAGS = ["--as", "--url", "--tokens"] as const;
type Flag = (typeof FLAGS)[number];

/** `--as x --url y file` → the flags that were given and what is left over. */
function split(argv: readonly string[]): { flags: Map<Flag, string>; rest: string[] } {
  const flags = new Map<Flag, string>();
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (!(FLAGS as readonly string[]).includes(arg)) {
      rest.push(arg);
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined) usage(`${arg} needs a value`);
    flags.set(arg as Flag, value);
    i++;
  }
  return { flags, rest };
}

function parse(argv: readonly string[]): Options {
  const { flags, rest } = split(argv);
  if (rest.length !== 1) usage("name exactly one record file, or - for stdin");
  const agent = flags.get("--as") ?? "";
  if (agent === "") usage("--as is required: it is the name the key is filed under");
  return {
    source: rest[0] as string,
    agent,
    url: flags.get("--url") ?? DEFAULT_URL,
    tokens: flags.get("--tokens") ?? DEFAULT_TOKENS,
  };
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
    // Blanks and comments are skipped exactly as the server skips them.
    // Without this, `# bee.claude key is here` matches on its second word and
    // the script signs with "#" — reproduced before fixing: a 401 that looks
    // like a bad key rather than a misread file.
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2 && parts[1] === agent) return parts[0] as string;
  }
  return usage(`${tokens} holds no key filed under ${agent}`);
}

/**
 * Whatever came back, with control characters made visible.
 *
 * The store guards `deposited-by` against control characters because they are a
 * DISPLAY risk — a terminal reading them can be made to show something other
 * than what arrived (`#146`). A client that prints a server's answer raw
 * reopens that at the other end of the wire, and SonarCloud's S5145 says the
 * same thing in its own vocabulary.
 */
function printable(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    out +=
      code === 10 || code === 9 || (code >= 32 && code !== 127)
        ? ch
        : `\\x${code.toString(16).padStart(2, "0")}`;
  }
  return out;
}

async function main(argv: readonly string[]): Promise<number> {
  const options = parse(argv);
  let bytes: string;
  try {
    bytes = options.source === "-" ? readFileSync(0, "utf8") : readFileSync(options.source, "utf8");
  } catch (error) {
    // A stack trace is a poor first impression for the reference client other
    // agents copy, and a missing file is the ordinary mistake.
    usage(`could not read ${options.source}: ${error instanceof Error ? error.message : error}`);
  }
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
    if (challenge) console.error(printable(challenge));
    console.error(printable(text));
    return 1;
  }

  let answer: { result?: { isError?: boolean; content?: Array<{ text?: string }> } };
  try {
    answer = JSON.parse(text) as typeof answer;
  } catch {
    // A 200 that is not JSON is what a proxy returns when it answers instead of
    // forwarding — this project served exactly that for an hour, an HTML page
    // under a 200, from a catch-all route in front of the endpoint.
    console.error("the endpoint answered 200 with something that is not JSON:");
    console.error(printable(text));
    return 1;
  }
  const said = answer.result?.content?.[0]?.text ?? text;
  console.log(printable(said));
  // A deposit the store refused comes back as a 200 carrying an error result —
  // JSON-RPC's shape, not a failure of the call. The exit code says which.
  return answer.result?.isError ? 1 : 0;
}

process.exit(await main(process.argv.slice(2)));
