/**
 * Copy new records and markers from the live store into its copy in git.
 *
 *   PE_STORE_ROOT=/path/to/store bun run relay-sync [--mirror <dir>] [--dry-run]
 *
 * The store is `PE_STORE_ROOT` and nothing else: without it, the only default
 * available is the `relay/` beside this source, which is the copy, and reading a
 * copy as the store proves nothing. The copy defaults to that same `relay/`. The
 * store must be outside every git working tree and the copy inside one.
 *
 * Run it in a `git worktree`, not in a checkout anyone switches — the failure
 * this exists after (`relay-1159`) was a checkout deleting files under a store —
 * then commit what it copied, by name, in a PR.
 *
 * EXIT CODES, per `refusal.ts`. 0 the copy now holds everything the store does
 * that may be copied (or would, with --dry-run). 1 the two disagree about a file,
 * and nothing was copied. 2 a directory could not be read. 4 the directories were
 * not named as a sync needs. 5 a copy failed partway; what was copied is listed.
 */
import { applySync, planSync, roleProblem } from "../src/relay/mirror.js";
import {
  REFUSED_INCOMPLETE,
  REFUSED_UNREADABLE,
  REFUSED_WRONG_ROLE,
  refuse,
} from "../src/relay/refusal.js";
import { storeRootFrom } from "../src/relay/store.js";

function wrongRole(message: string): never {
  console.error(`refusing to sync: ${message}. Nothing was copied.`);
  process.exit(REFUSED_WRONG_ROLE);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const at = args.indexOf("--mirror");
const flagged = at === -1 ? undefined : args[at + 1];
if (at !== -1 && (flagged === undefined || flagged.startsWith("--")))
  wrongRole("--mirror needs a value");

let store: string;
let mirror: string;
try {
  const configured = process.env.PE_STORE_ROOT;
  if (configured === undefined || configured === "") {
    wrongRole("PE_STORE_ROOT is required: it names the live store to copy from");
  }
  store = storeRootFrom(configured);
  mirror = flagged ?? storeRootFrom(undefined);
} catch (error) {
  wrongRole(error instanceof Error ? error.message : String(error));
}

const wrong = roleProblem(store, mirror);
if (wrong !== null) wrongRole(wrong);

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

for (const path of plan.differ) console.log(`DIFFERS           ${path}`);
for (const path of plan.onlyInMirror) console.log(`ONLY IN COPY      ${path}`);
for (const path of plan.deletedInStore) {
  console.log(`DELETED IN STORE  ${path}  (its marker remains; git keeps the record)`);
}
for (const path of plan.waiting) {
  console.log(`WAITING           ${path}  (marker with no record on either side)`);
}

if (plan.differ.length > 0 || plan.onlyInMirror.length > 0) {
  console.log(
    `\nthe store and its copy disagree about ${plan.differ.length + plan.onlyInMirror.length} file(s); nothing was copied. Resolve each by hand — relay-1159 is what one looks like.`,
  );
  process.exit(1);
}

if (dryRun) {
  for (const path of plan.copy) console.log(`would copy        ${path}`);
  console.log(`\n${plan.copy.length} file(s) to copy from ${store} into ${mirror}`);
  process.exit(0);
}

let done = 0;
try {
  await applySync(store, mirror, plan, (path) => {
    console.log(`copied            ${path}`);
    done++;
  });
} catch (error) {
  console.error(
    `\nstopped after ${done} of ${plan.copy.length} file(s): ${error instanceof Error ? error.message : String(error)}. Everything listed as copied is in place; rerun to continue.`,
  );
  process.exit(REFUSED_INCOMPLETE);
}
console.log(`\n${done} file(s) copied from ${store} into ${mirror}`);
