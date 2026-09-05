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
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { depositLocal } from "../src/relay/deposit.js";
import { ID } from "../src/relay/store.js";

/**
 * The digest a record's `parent-sha256` must carry is over the parent's BODY —
 * what follows the block the store prepends on deposit (`deposited-by`,
 * `provenance`, `assigned-id`, then a `---`). Hashing the file as stored
 * includes three lines of the store's own bookkeeping and produces a value that
 * matches nothing.
 *
 * Six records have made exactly that mistake: relay-0119 and relay-0123
 * (OBS-048), relay-0138 and relay-0141 (OBS-055), and relay-0800, relay-0802,
 * relay-0803 and relay-0805 in one session by an author who had read the table
 * listing the first four (relay-0807).
 *
 * Each was caught afterwards by a separate audit and repaired one erratum at a
 * time, while this tool held both strings at write time and compared neither. A
 * mistake that recurs across parties after two errata is a missing guard rather
 * than a lapse, so the guard goes here.
 */
function bodyOf(stored: string): string {
  const end = stored.indexOf("\n---\n");
  return end === -1 ? stored : stored.slice(end + 5);
}

async function checkParentDigest(record: string, relayRoot: string): Promise<void> {
  const parent = /^parent:[ \t]*(\S+)[ \t]*$/m.exec(record)?.[1];
  const declared = /^parent-sha256:[ \t]*(\S+)[ \t]*$/m.exec(record)?.[1];
  // No parent, no declaration, or the deliberate `unknown` placeholder: nothing
  // to compare. Absence is a separate question and not this check's business.
  if (!parent || !declared || declared === "unknown") return;

  // Validate parent ID format to prevent path traversal vulnerabilities.
  if (!ID.test(parent)) {
    console.error(`parent ${JSON.stringify(parent)} is not a valid relay ID`);
    process.exit(1);
  }

  let parentBytes: string;
  try {
    parentBytes = await readFile(join(relayRoot, `${parent}.txt`), "utf8");
  } catch {
    console.error(`parent ${parent} is not in ${relayRoot} — cannot check parent-sha256`);
    process.exit(1);
  }

  const actual = createHash("sha256").update(bodyOf(parentBytes), "utf8").digest("hex");
  if (actual !== declared) {
    console.error(
      `parent-sha256 does not match ${parent}
  declared ${declared}
  actual   ${actual}
Records are immutable, so this cannot be fixed after the deposit — only corrected
beside it. Fix the header and deposit again; \`bun run relay-digest ${parent}\`
prints the value this field wants.`,
    );
    process.exit(1);
  }
}

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
await checkParentDigest(bytes, root ?? "relay");
const r = await depositLocal(bytes, depositor, id, root);
console.log(
  `stored ${r.id}  id chosen by ${r.idSource}  deposited-by ${depositor}  sha256 ${r.sha256}`,
);
