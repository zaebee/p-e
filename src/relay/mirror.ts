import { constants, existsSync, realpathSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { gitWorkTreeOf } from "./store.js";

/**
 * Bring a git mirror of the store up to date with the store, by adding only.
 *
 * The live store left the repository after a checkout deleted `relay-1157` and
 * its marker under a running service, and the id was bound twice (`relay-1159`).
 * What reaches git now is a copy, and this is the only thing that should write
 * it. It copies records and markers the mirror lacks and **nothing else**: it
 * never overwrites, never deletes, and refuses outright when the two disagree
 * about a file both hold — the check that would have caught `relay-1157` the day
 * it happened instead of when relay-grok's record said "UNKNOWN".
 *
 * A disagreement is reported, not repaired. Which side is right is a question
 * about somebody's record, and `relay-1159` shows it can go either way.
 */

/** Paths relative to a store root: `relay-NNNN.txt` and `history/relay-NNNN`. */
export interface SyncPlan {
  /** In the store and not the mirror. These are what a sync copies. */
  readonly copy: readonly string[];
  /** In both, with different bytes. Any of these stops the sync. */
  readonly differ: readonly string[];
  /** In the mirror and not the store — a deletion, or a record the store never held. */
  readonly onlyInMirror: readonly string[];
  /**
   * Markers in the store whose record the store does not hold, and the mirror
   * does not either.
   *
   * A deposit claims its marker before it writes the record, so a sync running
   * between the two would otherwise copy a marker with no record into git. A
   * failed deposit releases its marker; one that is left is either in flight or
   * a deletion, and a deletion's marker is already in the mirror. Left for the
   * next run, and reported so a stuck one is visible.
   */
  readonly waiting: readonly string[];
}

/** Records and markers under a root, by relative path. A missing `history/` holds none. */
async function held(root: string): Promise<Set<string>> {
  const out = new Set<string>();
  for (const name of await readdir(root)) if (/^relay-\d+\.txt$/.test(name)) out.add(name);
  let markers: string[] = [];
  try {
    markers = await readdir(join(root, "history"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  for (const name of markers) if (/^relay-\d+$/.test(name)) out.add(`history/${name}`);
  return out;
}

/** What a sync from `store` into `mirror` would do. Reads both; writes nothing. */
export async function planSync(store: string, mirror: string): Promise<SyncPlan> {
  const [inStore, inMirror] = await Promise.all([held(store), held(mirror)]);
  const copy: string[] = [];
  const differ: string[] = [];
  const waiting: string[] = [];
  for (const path of [...inStore].sort()) {
    if (!inMirror.has(path)) {
      const record = path.startsWith("history/") ? `${path.slice("history/".length)}.txt` : null;
      if (record !== null && !inStore.has(record) && !inMirror.has(record)) waiting.push(path);
      else copy.push(path);
      continue;
    }
    const [a, b] = await Promise.all([readFile(join(store, path)), readFile(join(mirror, path))]);
    if (!a.equals(b)) differ.push(path);
  }
  const onlyInMirror = [...inMirror].filter((path) => !inStore.has(path)).sort();
  return { copy, differ, onlyInMirror, waiting };
}

/**
 * Why a sync will not run, or null when it may. Names are the caller's to print.
 *
 * The roles follow the rule `writeProblem` enforces: a store is outside every
 * git working tree, and its copy for review is inside one. Both directions
 * matter. Syncing into a directory outside git could be syncing into a store
 * from outside it; syncing out of one inside git is reading a copy, and a copy
 * synced onto another copy reports agreement and proves nothing.
 */
export function roleProblem(store: string, mirror: string): string | null {
  // By real path, so a trailing slash or a symlink cannot make one directory two.
  if (existsSync(store) && existsSync(mirror) && realpathSync(store) === realpathSync(mirror)) {
    return `the store and the mirror are the same directory, ${realpathSync(store)}`;
  }
  const storeTree = gitWorkTreeOf(store);
  if (storeTree !== null) {
    return `${store} is inside the git working tree ${storeTree}, so it is a copy and not the store`;
  }
  if (gitWorkTreeOf(mirror) === null) {
    return `${mirror} is not inside a git working tree, so it is not the store's copy for review. A sync writes only into a copy under git, so that a store is never written from outside itself`;
  }
  return null;
}

/**
 * Copy what `plan.copy` names. Each copy is exclusive: a file that appeared in
 * the mirror since planning makes it throw rather than overwrite, so a race can
 * stop a sync but cannot turn it into an edit.
 */
export async function applySync(store: string, mirror: string, plan: SyncPlan): Promise<void> {
  if (plan.copy.some((path) => path.startsWith("history/"))) {
    await mkdir(join(mirror, "history"), { recursive: true });
  }
  for (const path of plan.copy) {
    await copyFile(join(store, path), join(mirror, path), constants.COPYFILE_EXCL);
  }
}
