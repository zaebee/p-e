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
export const ID = new RegExp(`^${ID_PREFIX}\\d{${ID_DIGITS}}$`);

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
  for (const r of store.values()) {
    if (r.parent) named.add(r.parent);
    if (r.ref) named.add(r.ref);
  }
  return [...named].filter((id) => !store.has(id)).sort();
}

export function exists(store: Map<string, RelayRecord>, id: string): Presence {
  if (store.has(id)) return "PRESENT";
  return knownMissing(store).includes(id) ? "KNOWN_MISSING" : "UNKNOWN";
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
