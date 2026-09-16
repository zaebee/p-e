/**
 * Copy new records and markers from the live store into its git mirror.
 *
 *   PE_STORE_ROOT=/path/to/store bun run relay-sync [--mirror <dir>] [--dry-run]
 *
 * The store is `PE_STORE_ROOT` and nothing else: without it, the only default
 * available is the `relay/` beside this source, which is the mirror, and a sync
 * from a directory onto itself proves nothing. The mirror defaults to that same
 * `relay/`, and must carry `MIRROR`.
 *
 * Run it in a `git worktree`, not in a checkout anyone switches — the failure
 * this exists after (`relay-1159`) was a checkout deleting files under a store —
 * then commit what it copied, by name, in a PR.
 *
 * EXIT CODES. 0 the mirror now holds everything the store does (or would, with
 * --dry-run). 1 the two disagree about a file both hold, or the mirror holds
 * something the store does not; nothing was copied. 2 a directory could not be
 * read. 4 the roles are wrong: see `REFUSED_WRONG_ROLE`.
 */
import { applySync, planSync, roleProblem } from "../src/relay/mirror.js";
import { REFUSED_UNREADABLE, REFUSED_WRONG_ROLE, refuse } from "../src/relay/refusal.js";
import { storeRootFrom } from "../src/relay/store.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const at = args.indexOf("--mirror");
const mirror = at === -1 ? storeRootFrom(undefined) : args[at + 1];
if (mirror === undefined || mirror.startsWith("--")) {
  console.error("--mirror needs a value");
  process.exit(REFUSED_WRONG_ROLE);
}

const configured = process.env.PE_STORE_ROOT;
if (configured === undefined || configured === "") {
  console.error(
    "PE_STORE_ROOT is required: it names the live store to copy from. Nothing was read or copied.",
  );
  process.exit(REFUSED_WRONG_ROLE);
}
const store = storeRootFrom(configured);

const wrong = roleProblem(store, mirror);
if (wrong !== null) {
  console.error(`refusing to sync: ${wrong}. Nothing was copied.`);
  process.exit(REFUSED_WRONG_ROLE);
}

let plan: Awaited<ReturnType<typeof planSync>>;
try {
  plan = await planSync(store, mirror);
} catch (error) {
  refuse(
    REFUSED_UNREADABLE,
    `cannot read ${store} or ${mirror}`,
    error,
    "Nothing was copied. This is not a finding about any record.",
  );
}

for (const path of plan.differ) console.log(`DIFFERS         ${path}`);
for (const path of plan.onlyInMirror) console.log(`ONLY IN MIRROR  ${path}`);
for (const path of plan.waiting)
  console.log(`WAITING         ${path}  (marker without its record yet)`);

if (plan.differ.length > 0 || plan.onlyInMirror.length > 0) {
  console.log(
    `\nthe store and the mirror disagree about ${plan.differ.length + plan.onlyInMirror.length} file(s); nothing was copied. Resolve each by hand — relay-1159 is what one looks like.`,
  );
  process.exit(1);
}

for (const path of plan.copy) console.log(`${dryRun ? "would copy" : "copied"}      ${path}`);
if (!dryRun) await applySync(store, mirror, plan);
console.log(
  `\n${plan.copy.length} file(s) ${dryRun ? "to copy" : "copied"} from ${store} into ${mirror}`,
);
