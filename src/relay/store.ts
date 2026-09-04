import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * A read-only store over relay records. Relay state only.
 *
 * It does not parse a payload, does not know what an event is, and cannot
 * promote anything. Everything it derives — a parent link, a gap — comes from
 * the header lines of a record it holds, never from anywhere else.
 */

/**
 * Resolved against this module, never against the process working directory.
 *
 * A relative path was wrong for the one deployment that matters: a tunnel
 * launches the MCP server from a directory of its choosing, and the store then
 * found nothing and reported an empty exchange. An absence of access rendered as
 * a fact about the world — which is the defect this whole project is about,
 * appearing in its own code.
 */
export const STORE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "relay");

/**
 * Three states, and the third is not a variant of the second.
 *
 *   PRESENT        the bytes are here
 *   KNOWN_MISSING  another record names this id as a parent or a ref, so it
 *                  exists and we do not have it
 *   UNKNOWN        nothing here mentions this id at all
 *
 * The distinction is I-1's, which neither producer in the conformance corpus
 * could exercise. It is exercised here: relay-0026 and relay-0045 are named as
 * parents by records this store holds and their bytes are not in it, which is a
 * different fact from an id nobody has mentioned.
 *
 * An earlier version of this comment cited relay-0029 through relay-0031 as the
 * example. They are UNKNOWN, not KNOWN_MISSING: they appear only in prose inside
 * relay-0033's body, and `knownMissing` derives solely from `parent:` and `ref:`
 * headers. So the file whose subject is this distinction made a false claim
 * about it — written in the same commit that recorded the store catching its
 * author making exactly that inference. Corrected after a review measured it.
 */
export type Presence = "PRESENT" | "KNOWN_MISSING" | "UNKNOWN";

export interface RelayRecord {
  readonly id: string;
  /** The record exactly as deposited. Never re-serialised. */
  readonly bytes: string;
  readonly sha256: string;
  readonly parent: string | null;
  /**
   * The digest the record claims for its parent's bytes.
   *
   * `parent` names a label; this names bytes, which is the whole reason
   * `ownima-94` proposed it — a label is whatever the store calls a record, and
   * a digest is checkable by anyone holding both without any key. Parsed here
   * so `header` refuses the malformed cases the same way it does for `parent`.
   *
   * The bytes it must equal are `sha256` above, taken over the record body
   * after the deposit header. Not the whole file: `deposited-by:` and
   * `provenance:` are written by the *receiving* store and differ by delivery
   * channel, so a whole-file digest names bytes the sender never wrote. Two of
   * my own records got this wrong — OBS-048, corrected in relay-0124.
   */
  readonly parentSha256: string | null;
  readonly ref: string | null;
  readonly from: string | null;
  readonly to: string | null;
  readonly kind: string | null;
  /**
   * How these bytes reached the store.
   *
   * `authored` — the depositor wrote them.
   * `as-received` — they arrived through a transport, currently a person
   *   pasting text, and may differ from what the sender emitted. A store that
   *   did not distinguish these would claim a fidelity it cannot support.
   */
  readonly provenance: "authored" | "as-received";
  readonly depositedBy: string;
}

/**
 * The header block: everything above the first blank line.
 *
 * `header()` used to search the whole record, so a record quoting another's
 * headers could adopt its values — and records in this store already quote
 * header-like lines at column 0 (`relay-0060`'s body contains
 * `status: provisional is in every record...`). Present headers were protected
 * only by first-match-wins and the convention that headers come first. A record
 * that omitted one would have taken someone else's.
 */
export function headerBlock(bytes: string): string {
  const blank = bytes.indexOf("\n\n");
  return blank === -1 ? bytes : bytes.slice(0, blank);
}

/**
 * One header, or null when the line is absent.
 *
 * A malformed line **throws** rather than reading as absent. The old regex
 * required a single token and returned `undefined` otherwise, so
 * `parent: relay-0001 relay-0002` parsed as no parent at all — and the two ids
 * it names dropped out of `knownMissing`, becoming `UNKNOWN` ("nobody mentioned
 * this") instead of `KNOWN_MISSING` ("named, and we do not hold it").
 *
 * That is this store's central distinction, lost to a regex. Header-absent and
 * header-present-but-unparseable are different facts and now produce different
 * outcomes.
 *
 * `none` is a deliberate vocabulary: `ref: none` means the writer said there is
 * no reference, which this returns as null alongside an absent line. The two are
 * not distinguished, and nothing currently depends on distinguishing them.
 */
function header(head: string, field: string): string | null {
  const line = new RegExp(`^${field}:(.*)$`, "m").exec(head);
  if (!line) return null;
  const value = (line[1] ?? "").trim();
  if (value === "") throw new Error(`header \`${field}:\` is present and empty`);
  if (/\s/.test(value)) {
    throw new Error(`header \`${field}:\` is present and unparseable: ${JSON.stringify(value)}`);
  }
  return value === "none" ? null : value;
}

/**
 * The id format, and everything that follows from it.
 *
 * Here rather than in `deposit.ts` because the format is a property of the store
 * and not of the write path: `reference.ts` needs it to find ids quoted in prose,
 * and a reader importing from the writer to learn what an id looks like has the
 * dependency backwards. Both already import this file.
 *
 * Widening the format is one edit. Before this it was four, three of which said
 * nothing about being consequences — a literal `9999`, two `slice(6)` calls, and
 * `/relay-\d{4}/g` in a file that never mentions the others.
 */
export const ID_PREFIX = "relay-";
export const ID_DIGITS = 4;
export const ID = new RegExp(String.raw`^${ID_PREFIX}\d{${ID_DIGITS}}$`);

/**
 * MUST 1's allocation marker: an empty file per id, created `wx`, kept forever.
 *
 * What it replaces: `nextFree` was `max(present) + 1`, which the clause names as
 * its own counterexample — allocation "MUST be settled by an atomic exclusive
 * commit, **never by reading the current maximum**". Reading the maximum has two
 * defects and the marker closes both.
 *
 * - **A deleted id was freed.** `max(present)` sees files on disk, so deleting
 *   the highest record handed its id to the next deposit. That is `relay-0183`,
 *   the failure this whole document exists for, and the record `wx` did not stop
 *   it because deleting the record removed that guard. The marker persists
 *   beyond deletion, so a bound id is never offered again.
 * - **Two allocators could read the same maximum.** The read and the write were
 *   separate steps with a window between them; the legacy authority has three
 *   writers and two collided twice inside two hours (`relay-0225`, `relay-0232`).
 *   `wx` is `O_CREAT|O_EXCL`: the claim is the atomic step, there is no shared
 *   race point, and exactly one writer wins.
 *
 * The marker guards allocation; the record's own `link` still guards content.
 * They are separate guards over separate things and neither replaces the other.
 */
/**
 * Where they live, and why the directory is described here.
 *
 * Here rather than in `deposit.ts` for the same reason the id format is: it is a
 * fact about the store's layout, and a reader wanting to know which ids were
 * bound should not import the write path to find out. Until today nothing read
 * it except the writer, which is why the state below went unnoticed — and the
 * rationale above travelled with the function rather than being left behind it,
 * which the first version of this move got wrong.
 */
export function markerDir(root = STORE_ROOT): string {
  return join(root, "history");
}

/**
 * Id order, stated rather than left to the default.
 *
 * A bare `.sort()` here is correct and only by accident of the format: ids are
 * fixed-width and zero-padded, so lexicographic and numeric order coincide. That
 * is a property of `ID_DIGITS` being constant within a store, not a fact about
 * strings, and the default comparator says neither. Sonar flags the bare form as
 * a reliability bug and is right to for the general case.
 *
 * Written out rather than as a nested ternary, which Sonar also flags. And not
 * as `a.localeCompare(b)`, which is the tempting one-liner and would be a real
 * defect here: collation is locale-dependent, and these are identifiers rather
 * than text.
 */
function bySeq(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Markers and records disagreeing, which nothing compared until 2026-08-31.
 *
 * `checkContinuity` reads records and their declared parents. It cannot see an
 * id that was bound and has no record, because there is no record to report it
 * on — the id is simply absent, and absent is what an id never used looks like
 * too. THE MARKER IS THE ONLY THING THAT TELLS THEM APART, and nothing was
 * asking it.
 *
 * Found by following an outside audit of the specification, which predicted that
 * a marker created before its record survives a crash and burns the id.
 * `relay-0683` is that state in the live store, and `relay-0684` next to it lost
 * both — the second is visible as `relay-0685`'s `UNCHECKABLE`, the first was
 * visible to nothing.
 *
 * ## Three outcomes, not two
 *
 * A first version of this said the delete and the crash were "indistinguishable
 * here". THEY ARE NOT, and this file already exported what separates them. A
 * crash between the claim and the write leaves no record, so nothing can name
 * it: it is necessarily `UNKNOWN`. A deleted record leaves its `parent:` and
 * `ref:` trace in whatever named it, which is `KNOWN_MISSING` — and that is the
 * state MUST 1's marker is *designed* to produce.
 *
 * - **lost** — a marker with no record and nothing naming the id. The id is
 *   spent, nothing occupies it, and nothing remembers it. `relay-0683`.
 * - **deleted** — a marker with no record, named by a surviving record. The
 *   ordinary post-delete state, and not a defect.
 * - **unmarked** — a record with no marker. Every store written before MUST 1,
 *   healed on the next deposit by `survey`'s backfill.
 *
 * The `deleted` inference is strong rather than certain: `KNOWN_MISSING` proves
 * a surviving record NAMES the id, not that a record ever landed there. A sender
 * naming an id before it exists would look the same. That is pathological and it
 * is the gap, so this reports the distinction and does not treat it as proof.
 */
export interface MarkerAgreement {
  /** Bound, empty, and unremembered: nothing names the id. */
  readonly lost: readonly string[];
  /** Bound, empty, and named by a survivor: the designed post-delete state. */
  readonly deleted: readonly string[];
  /** Held with no marker: a store written before MUST 1. */
  readonly unmarked: readonly string[];
}

export async function markerAgreement(
  store: Map<string, RelayRecord>,
  root: string,
): Promise<MarkerAgreement> {
  let names: string[];
  try {
    names = await readdir(markerDir(root));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    names = [];
  }
  const markers = new Set(names.filter((n) => ID.test(n)));
  // `store.has` is O(1), so a second Set of the map's keys was a copy for no
  // reason — gemini-code-assist on PR #10.
  const orphaned = [...markers].filter((id) => !store.has(id)).sort(bySeq);
  return {
    lost: orphaned.filter((id) => exists(store, id) === "UNKNOWN"),
    deleted: orphaned.filter((id) => exists(store, id) === "KNOWN_MISSING"),
    unmarked: [...store.keys()].filter((id) => ID.test(id) && !markers.has(id)).sort(bySeq),
  };
}

/** What divides the store's own deposit header from the record as it arrived. */
const DEPOSIT_SEPARATOR = "\n---\n";

function parse(id: string, raw: string): RelayRecord {
  // The first line is a deposit header this store writes; the rest is the
  // record as it was given, byte for byte.
  const split = raw.indexOf(DEPOSIT_SEPARATOR);
  if (split === -1) throw new Error(`${id}: no deposit header`);
  const meta = raw.slice(0, split);
  const bytes = raw.slice(split + DEPOSIT_SEPARATOR.length);
  // Absence must not read as a claim. A meta block with no `provenance:` line
  // used to parse as `as-received` — turning "the depositor did not say" into
  // "these bytes came through a transport and may differ from what the sender
  // emitted", a specific fidelity claim invented out of silence.
  const declared = /^provenance:\s*(\S+)\s*$/m.exec(meta)?.[1];
  if (declared !== "authored" && declared !== "as-received") {
    throw new Error(
      `${id}: deposit header must declare provenance as authored or as-received, got ${JSON.stringify(declared)}`,
    );
  }
  const provenance = declared;
  const depositedBy = /^deposited-by:\s*(\S+)/m.exec(meta)?.[1] ?? "unknown";
  // The id lives in the filename and, since relay-0141, in the deposit header
  // too. Where both exist they must agree: a file renamed after deposit would
  // otherwise silently change which record these bytes are. Absent on the ~90
  // records deposited before the header existed, which is why disagreement is
  // an error and absence is not.
  const assigned = /^assigned-id:\s*(\S+)\s*$/m.exec(meta)?.[1];
  if (assigned !== undefined && assigned !== id) {
    throw new Error(
      `${id}: the deposit header says this record is ${assigned}. One of the two is a rename.`,
    );
  }
  const head = headerBlock(bytes);
  return {
    id,
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    parent: header(head, "parent"),
    parentSha256: header(head, "parent-sha256"),
    ref: header(head, "ref"),
    from: header(head, "from"),
    to: header(head, "to"),
    kind: header(head, "kind"),
    provenance,
    depositedBy,
  };
}

export async function loadStore(root = STORE_ROOT): Promise<Map<string, RelayRecord>> {
  const out = new Map<string, RelayRecord>();
  let names: string[];
  try {
    names = await readdir(root);
  } catch (error) {
    // A missing directory is not an empty one. Returning an empty map here
    // would answer "how many relays are there" with a number, when the honest
    // answer is that the store could not be opened.
    throw new Error(
      `relay store not readable at ${root}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  for (const name of names.filter((n) => n.endsWith(".txt")).sort()) {
    const id = name.replace(/\.txt$/, "");
    out.set(id, parse(id, await readFile(join(root, name), "utf8")));
  }
  return out;
}

/** Exact bytes, or null. Never a summary, never a reconstruction. */
export function getRelay(store: Map<string, RelayRecord>, id: string): RelayRecord | null {
  return store.get(id) ?? null;
}

/** Every id this store's records name but does not hold. */
export function knownMissing(store: Map<string, RelayRecord>): string[] {
  const named = new Set<string>();
  // Filter out held IDs early to avoid allocating and sorting them
  for (const r of store.values()) {
    if (r.parent && !store.has(r.parent)) named.add(r.parent);
    if (r.ref && !store.has(r.ref)) named.add(r.ref);
  }
  return [...named].sort(bySeq);
}

export function exists(store: Map<string, RelayRecord>, id: string): Presence {
  if (store.has(id)) return "PRESENT";
  // Correct only below the early return: `knownMissing` filters out held ids and
  // this does not, so the two agree exactly when `id` is already known absent.
  for (const r of store.values()) {
    if (r.parent === id || r.ref === id) return "KNOWN_MISSING";
  }
  return "UNKNOWN";
}

/** Records whose parent or ref is `id`. The reply graph is not a line. */
export function listReplies(store: Map<string, RelayRecord>, id: string): RelayRecord[] {
  return [...store.values()]
    .filter((r) => r.parent === id || r.ref === id)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}

/**
 * Ids in order, optionally after one. Gaps are reported, never closed: a caller
 * that receives a list with holes in it has been told about the holes.
 */
export function listRelays(
  store: Map<string, RelayRecord>,
  after?: string,
): { present: string[]; missing: string[] } {
  const present = [...store.keys()].sort().filter((id) => (after ? id > after : true));
  const missing = knownMissing(store).filter((id) => (after ? id > after : true));
  return { present, missing };
}
