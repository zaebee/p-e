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
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "relay");

/**
 * Three states, and the third is not a variant of the second.
 *
 *   PRESENT        the bytes are here
 *   KNOWN_MISSING  another record names this id as a parent or a ref, so it
 *                  exists and we do not have it
 *   UNKNOWN        nothing here mentions this id at all
 *
 * The distinction is I-1's, which neither producer in the conformance corpus
 * could exercise. It is exercised here on the first query: relay-0029 through
 * relay-0031 are named by records this store holds and their bytes are not in
 * it, which is a different fact from an id nobody has ever mentioned.
 */
export type Presence = "PRESENT" | "KNOWN_MISSING" | "UNKNOWN";

export interface RelayRecord {
  readonly id: string;
  /** The record exactly as deposited. Never re-serialised. */
  readonly bytes: string;
  readonly sha256: string;
  readonly parent: string | null;
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

const header = (bytes: string, field: string): string | null => {
  const m = new RegExp(`^${field}:\\s*(\\S+)\\s*$`, "m").exec(bytes);
  const value = m?.[1];
  return value === undefined || value === "none" ? null : value;
};

function parse(id: string, raw: string): RelayRecord {
  // The first line is a deposit header this store writes; the rest is the
  // record as it was given, byte for byte.
  const split = raw.indexOf("\n---\n");
  if (split === -1) throw new Error(`${id}: no deposit header`);
  const meta = raw.slice(0, split);
  const bytes = raw.slice(split + 5);
  const provenance = /^provenance: authored$/m.test(meta) ? "authored" : "as-received";
  const depositedBy = /^deposited-by:\s*(\S+)/m.exec(meta)?.[1] ?? "unknown";
  return {
    id,
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    parent: header(bytes, "parent"),
    ref: header(bytes, "ref"),
    from: header(bytes, "from"),
    to: header(bytes, "to"),
    kind: header(bytes, "kind"),
    provenance,
    depositedBy,
  };
}

export async function loadStore(root = ROOT): Promise<Map<string, RelayRecord>> {
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
