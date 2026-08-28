/**
 * Deposit a record from a file or stdin, through the guard.
 *
 * Exists so that writing a record locally cannot be done with `>`. On
 * 2026-08-28 a shell redirect destroyed another participant's deposit while the
 * guard that forbids it sat one function away, unused because the local path
 * did not go through it.
 *
 *   bun run relay-put <file> [id]
 *   … | bun run relay-put - [id]
 *   bun run relay-put <file> [id] --as <depositor>
 *
 * `--as` names who is running this. Without it the depositor is `local`, a fact
 * about the channel — a record was written from a shell on this machine — in the
 * same way the MCP path records `mcp`. It is not an identity claim, because this
 * script cannot observe one.
 *
 * The depositor was hardcoded to `claude` until 2026-08-28. bee.hy3 works in
 * this same checkout, ran this script, and relay-0128 therefore says
 * `deposited-by: claude` about a record I never touched. The store's own
 * comment on that field reads "a fact about the channel, not a claim about
 * identity"; the tool was making the claim the field forbids. Provenance still
 * came out `as-received` — `depositLocal` only writes `authored` when the
 * record's `from:` matches the depositor — so the consistency check contained
 * the damage without preventing it.
 */
import { readFile } from "node:fs/promises";
import { depositLocal } from "../src/relay/deposit.js";

const argv = process.argv.slice(2);
const at = argv.indexOf("--as");
const depositor = at === -1 ? "local" : argv[at + 1];
if (at !== -1 && (depositor === undefined || depositor.startsWith("--"))) {
  console.error("--as needs a name");
  process.exit(1);
}

// `at === -1` must drop nothing. Filtering on `i !== at + 1` would then drop
// index 0, which is the source file.
const positional = at === -1 ? argv : argv.filter((_, i) => i !== at && i !== at + 1);
const [source, id] = positional;
if (!source) {
  console.error("usage: relay-put <file|-> [id] [--as <depositor>]");
  process.exit(1);
}

const bytes = source === "-" ? await Bun.stdin.text() : await readFile(source, "utf8");
const r = await depositLocal(bytes, depositor as string, id);
console.log(
  `stored ${r.id}  id chosen by ${r.idSource}  deposited-by ${depositor}  sha256 ${r.sha256}`,
);
