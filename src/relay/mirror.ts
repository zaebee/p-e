import { constants, type Stats, lstatSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { byCodeUnit } from "../order.js";
import { ID, gitWorkTreeOf } from "./store.js";

/**
 * Bring the git copy of the store up to date with the store, by adding only.
 *
 * The live store left the repository after a checkout deleted `relay-1157` and
 * its marker under a running service, and the id was bound twice (`relay-1159`).
 * What reaches git now is a copy, and this is the only thing that should write
 * it. It copies records and markers the copy lacks and **nothing else**: it never
 * overwrites, never deletes, and refuses outright when the two disagree about a
 * file both hold — the check that would have caught `relay-1157` the day it
 * happened instead of when relay-grok's record said "UNKNOWN".
 *
 * A disagreement is reported, not repaired. Which side is right is a question
 * about somebody's record, and `relay-1159` shows it can go either way.
 */

/** Paths relative to a store root: `relay-NNNN.txt` and `history/relay-NNNN`. */
export interface SyncPlan {
  /**
   * In the store and not the copy, in the order a sync copies them: by id, and
   * for each id the record before its marker. An interrupted sync can then leave
   * a record without its marker — which the next run completes, and which
   * `markerAgreement` reads as a store from before markers — but never a marker
   * without its record, which it would read as a record that was lost.
   */
  readonly copy: readonly string[];
  /** In both, with different bytes. Any of these stops the sync. */
  readonly differ: readonly string[];
  /**
   * In the copy and not the store, with nothing in the store to explain it: a
   * record whose id the store has no marker for, or a marker the store lacks.
   * Any of these stops the sync.
   */
  readonly onlyInMirror: readonly string[];
  /**
   * Records the copy holds, whose record the store no longer has but whose marker
   * it keeps: a deletion from the store. Markers outlive deletions by design
   * (`relay-0683` and `relay-0876` are two), so this is a normal state of a store
   * rather than a disagreement. Reported, and the sync goes on; git keeps the
   * record, as git keeps everything.
   */
  readonly deletedInStore: readonly string[];
  /**
   * Markers in the store with no record on either side. A deposit claims its
   * marker before it writes its record, so this is a deposit in flight — or one
   * that crashed between the two, or a record deleted before any sync copied it.
   * Not copied, because a marker without its record in git reads as a lost
   * record; reported on every run, so one that never resolves is visible.
   */
  readonly waiting: readonly string[];
}

/** Ids with a record, and ids with a marker, under a root. Names that are not store ids are ignored. */
async function held(root: string): Promise<{ records: Set<string>; markers: Set<string> }> {
  const records = new Set<string>();
  for (const name of await readdir(root)) {
    const id = name.endsWith(".txt") ? name.slice(0, -".txt".length) : "";
    if (ID.test(id)) records.add(id);
  }
  const markers = new Set<string>();
  let names: string[] = [];
  try {
    names = await readdir(join(root, "history"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  for (const name of names) if (ID.test(name)) markers.add(name);
  return { records, markers };
}

const recordPath = (id: string) => `${id}.txt`;
const markerPath = (id: string) => `history/${id}`;

/** Ids held on one side, as `held` returns them. */
type Held = Awaited<ReturnType<typeof held>>;

/** The buckets `planSync` fills, before `differ` is decided by reading bytes. */
interface Sorted {
  readonly copy: string[];
  readonly onlyInMirror: string[];
  readonly deletedInStore: string[];
  readonly waiting: string[];
  /** Held by both sides: a candidate for `differ`, decided by `differing`. */
  readonly compare: string[];
}

/** Where one id's record belongs, by which side holds it. Reads no bytes. */
function sortRecord(id: string, s: Held, m: Held, out: Sorted): void {
  if (s.records.has(id)) {
    if (m.records.has(id)) out.compare.push(recordPath(id));
    else out.copy.push(recordPath(id));
    return;
  }
  if (!m.records.has(id)) return;
  if (s.markers.has(id)) out.deletedInStore.push(recordPath(id));
  else out.onlyInMirror.push(recordPath(id));
}

/** Where one id's marker belongs. Reads no bytes. A marker is copied only behind its record. */
function sortMarker(id: string, s: Held, m: Held, out: Sorted): void {
  if (!s.markers.has(id)) {
    if (m.markers.has(id)) out.onlyInMirror.push(markerPath(id));
    return;
  }
  if (m.markers.has(id)) out.compare.push(markerPath(id));
  else if (s.records.has(id) || m.records.has(id)) out.copy.push(markerPath(id));
  else out.waiting.push(markerPath(id));
}

/**
 * Concurrent reads, bounded, the way `loadStore` reads a store: a sync compares
 * every file both sides hold — two reads per record, twice again for its marker
 * — and one round trip at a time made planning the slowest part of a run over a
 * store of a thousand records. The bound is what keeps a large store from
 * opening a thousand files at once.
 *
 * Order is the caller's: `paths` arrives in id order and the result keeps it,
 * because a batch is awaited whole before the next one is read.
 */
const COMPARE_FAN_OUT = 32;

async function differing(store: string, mirror: string, paths: string[]): Promise<string[]> {
  const differ: string[] = [];
  for (let i = 0; i < paths.length; i += COMPARE_FAN_OUT) {
    const batch = await Promise.all(
      paths.slice(i, i + COMPARE_FAN_OUT).map(async (path) => {
        const [a, b] = await Promise.all([
          readFile(join(store, path)),
          readFile(join(mirror, path)),
        ]);
        return a.equals(b) ? null : path;
      }),
    );
    for (const path of batch) if (path !== null) differ.push(path);
  }
  return differ;
}

/** What a sync from `store` into `mirror` would do. Reads both; writes nothing. */
export async function planSync(store: string, mirror: string): Promise<SyncPlan> {
  const [s, m] = await Promise.all([held(store), held(mirror)]);
  const out: Sorted = { copy: [], onlyInMirror: [], deletedInStore: [], waiting: [], compare: [] };

  const ids = [...new Set([...s.records, ...s.markers, ...m.records, ...m.markers])].sort(
    byCodeUnit,
  );
  for (const id of ids) {
    sortRecord(id, s, m, out);
    sortMarker(id, s, m, out);
  }

  return {
    copy: out.copy,
    differ: await differing(store, mirror, out.compare),
    onlyInMirror: out.onlyInMirror,
    deletedInStore: out.deletedInStore,
    waiting: out.waiting,
  };
}

/**
 * Why a sync will not run, or null when it may. Names are the caller's to print.
 *
 * The roles follow the rule `writeProblem` enforces: a store is outside every
 * git working tree, and its copy for review is inside one. Both directions
 * matter. Syncing into a directory outside git could be syncing into a store
 * from outside it; syncing out of one inside git is reading a copy.
 *
 * And neither side's `history/` may be a symlink: the checks above are on each
 * root's real path, and a linked `history/` would carry markers — which allocate
 * ids — into whatever directory it points at. An attack did exactly that into a
 * second store and burned two of its ids.
 *
 * A symlink is the case this catches, and not the only way two roots can share
 * one directory: a bind mount is not a link, `lstat` reports an ordinary
 * directory, and this check passes while both roots write the same inodes
 * (relay-1163, F7). Nothing here can see that from the path alone, so it is a
 * standing limit of the role check rather than something it enforces.
 */
export function roleProblem(store: string, mirror: string): string | null {
  const storeTree = gitWorkTreeOf(store);
  if (storeTree !== null) {
    return `${store} is inside the git working tree ${storeTree}, so it is a copy and not the store`;
  }
  if (gitWorkTreeOf(mirror) === null) {
    return `${mirror} is not inside a git working tree, so it is not the store's copy for review. A sync writes only into a copy under git, so that a store is never written from outside itself`;
  }
  for (const root of [store, mirror]) {
    const history = join(root, "history");
    // lstat and not existsSync-then-lstat: existsSync FOLLOWS the link, so a
    // link pointing at nothing yet read as absent and was never asked whether
    // it was a link. The dangling case is not harmless — `mkdir` through it
    // fails today, but the target can be created between this check and the
    // write, and then markers land wherever it points. gemini-code-assist
    // found this on #236; the reproduction is in the tests.
    let entry: Stats;
    try {
      entry = lstatSync(history);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    if (entry.isSymbolicLink()) {
      return `${history} is a symlink. Markers allocate ids, and a sync would write them wherever it points`;
    }
  }
  return null;
}

/**
 * Copy what `plan.copy` names, in its order, reporting each file once it is
 * copied. Each copy is exclusive: a file that appeared in the copy since planning
 * makes it throw rather than overwrite. A throw leaves every file already
 * reported in place and names the one that failed; the caller says so.
 *
 * A crash between two copies is the case this order is built for: the next run
 * copies what is missing. A crash **inside** one is not repaired here — an
 * exclusive copy interrupted partway can leave a short file, and the next plan
 * reads it as a disagreement and refuses (exit 1) until someone deletes it.
 * That is the intended end: a partial record in the copy is exactly the thing
 * this script must never paper over (relay-1163, F5).
 */
export async function applySync(
  store: string,
  mirror: string,
  plan: SyncPlan,
  copied: (path: string) => void = () => {},
): Promise<void> {
  if (plan.copy.some((path) => path.startsWith("history/"))) {
    await mkdir(join(mirror, "history"), { recursive: true });
  }
  for (const path of plan.copy) {
    try {
      await copyFile(join(store, path), join(mirror, path), constants.COPYFILE_EXCL);
    } catch (error) {
      throw new Error(`copying ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
    copied(path);
  }
}
