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
 *   bun run relay-put <file> [id] --root <dir>
 *
 * `--root` names the store to write into. It exists because a *write* probe had
 * no safe target: `check-continuity` has taken `--root` from the start, with the
 * reason in its own comment — "the alternative, proving the guard fires by
 * putting a bad record into the append-only store, cannot be undone" — and this
 * script had no equivalent. On 2026-09-01 a probe checking allocator behaviour
 * went into the live corpus as `relay-0734`, which is not deletable: removing it
 * would leave a marker with no record. `relay-0735` is the erratum, issue #24 the
 * report.
 *
 * The source file must not sit inside the named root. `loadStore` reads every
 * `.txt` in the store directory as a record, so a scratch input placed there is
 * parsed as one and the deposit fails with "no deposit header" — met on the first
 * attempt at using this flag.
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

/**
 * Pull one `--name <value>` out and return what is left.
 *
 * One function rather than the same index arithmetic per flag, because that
 * arithmetic already had a bug: `argv.filter((_, i) => i !== at + 1)` with the
 * flag absent has `at === -1`, so `at + 1 === 0` and it silently drops index 0,
 * which is the source file. Absent must drop nothing, and writing that twice is
 * how it comes back.
 */
function takeFlag(args: readonly string[], name: string): { value?: string; rest: string[] } {
  const at = args.indexOf(name);
  if (at === -1) return { rest: [...args] };
  const value = args[at + 1];
  if (value === undefined || value.startsWith("--")) {
    console.error(`${name} needs a value`);
    process.exit(1);
  }
  return { value, rest: args.filter((_, i) => i !== at && i !== at + 1) };
}

const { value: depositorFlag, rest: afterAs } = takeFlag(process.argv.slice(2), "--as");
const { value: root, rest: positional } = takeFlag(afterAs, "--root");
const depositor = depositorFlag ?? "local";

const [source, id] = positional;
if (!source) {
  console.error("usage: relay-put <file|-> [id] [--as <depositor>] [--root <dir>]");
  process.exit(1);
}

const bytes = source === "-" ? await Bun.stdin.text() : await readFile(source, "utf8");
const r = await depositLocal(bytes, depositor, id, root);
console.log(
  `stored ${r.id}  id chosen by ${r.idSource}  deposited-by ${depositor}  sha256 ${r.sha256}`,
);
