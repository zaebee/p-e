import { createHash } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * A read-only store over relay records. Relay state only.
 *
 * It does not parse a payload, does not know what an event is, and cannot
 * promote anything. Everything it derives — a parent link, a gap — comes from
 * the header lines of a record it holds, never from anywhere else.
 */

/**
 * Where the store is: `PE_STORE_ROOT` when it is set, and otherwise the `relay/`
 * beside this source — never anything resolved against the working directory.
 *
 * A relative path was wrong for the one deployment that matters: a tunnel
 * launches the MCP server from a directory of its choosing, and the store then
 * found nothing and reported an empty exchange. An absence of access rendered as
 * a fact about the world — which is the defect this whole project is about,
 * appearing in its own code. So a configured root must be absolute. `~` is
 * refused with it: nothing here expands it, and relay-ui, which reads the same
 * variable name, does — a value written for one would silently mean something
 * else to the other.
 *
 * The variable exists to take the live store out of a git working tree, where a
 * checkout on 2026-09-16 deleted `relay-1157` and its marker under the running
 * service and the store bound the id twice (`relay-1159`).
 */
export function storeRootFrom(configured: string | undefined): string {
  if (configured === undefined || configured === "") {
    return join(dirname(fileURLToPath(import.meta.url)), "..", "..", "relay");
  }
  if (configured !== configured.trim()) {
    throw new Error(
      `PE_STORE_ROOT has leading or trailing whitespace: ${JSON.stringify(configured)}`,
    );
  }
  if (!isAbsolute(configured)) {
    throw new Error(
      `PE_STORE_ROOT must be an absolute path, got ${JSON.stringify(configured)}. Nothing here expands \`~\`, and a relative root would resolve against a working directory a service does not choose.`,
    );
  }
  return resolve(configured);
}

/**
 * The store root, read from the environment when it is asked for.
 *
 * A function and not a constant computed at import: a bad `PE_STORE_ROOT` then
 * fails the call that uses it, and not every module that merely imports this
 * one — so `--root` still works under a broken variable, and so do the pure
 * helpers `headers.ts` and `reference.ts` import from here.
 */
export function storeRoot(): string {
  return storeRootFrom(process.env.PE_STORE_ROOT);
}

/**
 * The git working tree `path` sits in, or null when it sits in none.
 *
 * A working tree is recognised by a `.git` entry in the directory or an ancestor
 * — a directory for a clone, a file for a `git worktree`. Found by walking up the
 * real path, so a symlink into a repository counts as the repository.
 */
export function gitWorkTreeOf(path: string): string | null {
  let dir = existsSync(path) ? realpathSync(path) : resolve(path);
  for (;;) {
    if (existsSync(join(dir, ".git"))) return dir;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

/**
 * Why a store may not be written at `root`, or null when it may.
 *
 * A store inside a git working tree is one checkout away from losing records and
 * markers while something is writing to it — `relay-1159` is that happening. A
 * copy of the store kept in git for review is exactly such a directory, so this
 * one rule also keeps anything from depositing into the copy and binding an id
 * the live store will allocate again.
 *
 * The rule is about where the directory is, not about a file in it. A marker that
 * permits or forbids writes would live in the same working tree, and the same
 * checkout could delete it; the working tree's own `.git` is the one thing a
 * checkout does not remove.
 */
export function writeProblem(root: string): string | null {
  const tree = gitWorkTreeOf(root);
  if (tree === null) return null;
  return `${root} is inside the git working tree ${tree}, and a checkout there can delete records and markers under a running store (relay-1159). The live store lives outside git: set PE_STORE_ROOT to it, or deposit over mcp-deposit.`;
}

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
  const blank = firstBlankLine(bytes);
  return blank === null ? bytes : bytes.slice(0, blank.start);
}

/**
 * A line ends at LF, and a CR immediately before that LF belongs to the ending
 * rather than to the line. So `\n\n`, `\r\n\r\n` and both mixed forms are a line
 * with nothing in it; a line carrying anything else — a space, a tab, a bare CR —
 * is not blank.
 *
 * This was `indexOf("\n\n")` in three files, which gave a CRLF record no blank
 * line at all: its whole body was header block, while `header()`'s `$` already
 * stopped before the `\r` and read quoted values back clean. A quoted `from:`
 * made a CRLF deposit `authored` — Audit-03 F4 again, by another route (Jules,
 * PR #225). The reading is a choice the amendment leaves open, and ADR-4 says
 * which one it sets aside.
 */
const BLANK_LINE = /\r?\n\r?\n/;

/**
 * The first blank line: `start` is where the header block ends, `end` where the
 * prose begins. Null when there is none. The one place the boundary is decided —
 * `headers.ts` and `reference.ts` ask here rather than each keeping a copy.
 */
export function firstBlankLine(
  bytes: string,
): { readonly start: number; readonly end: number } | null {
  const match = BLANK_LINE.exec(bytes);
  return match === null ? null : { start: match.index, end: match.index + match[0].length };
}

/**
 * What follows `name:` on the first header-block line that starts with it, or
 * undefined when no line does. Lines end where `firstBlankLine` says they do.
 *
 * Every field used to be read with `/^name:…$/m`, and under `m` a JavaScript
 * `^`/`$` also breaks at a bare CR and at U+2028/U+2029. So a record with no
 * blank line by the store's rule — its whole body header block — still had a
 * quoted `from:` read as a field, and a CR-only record could deposit as
 * `authored`. Found by attacking the CRLF repair; both are ADR-4's.
 */
export function fieldValue(head: string, name: string): string | undefined {
  // By index rather than `split("\n")`: `parse` asks six times per record, and a
  // split per ask cost ~7ms of a ~19ms `loadStore` over 1,113 records, measured.
  const prefix = `${name}:`;
  let at = 0;
  if (!head.startsWith(prefix)) {
    const lf = head.indexOf(`\n${prefix}`);
    if (lf === -1) return undefined;
    at = lf + 1;
  }
  const next = head.indexOf("\n", at);
  let end = next === -1 ? head.length : next;
  if (end > at && head[end - 1] === "\r") end -= 1;
  return head.slice(at + prefix.length, end);
}

/**
 * A field value that is one token, or undefined when it is absent or is not one.
 *
 * `\s` rather than `[ \t]`, so what counts as whitespace around the token is what
 * `header()`'s `trim()` strips. `relay-put`'s digest gate used `[ \t]` and, once
 * values ran to the real line ending, a digest followed by U+2028 or a second CR
 * read as no digest there while the store read it clean — a wrong digest stored.
 * Found by the second attack on PR #225's repair.
 */
export function oneToken(raw: string | undefined): string | undefined {
  return raw === undefined ? undefined : /^\s*(\S+)\s*$/.exec(raw)?.[1];
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
  const raw = fieldValue(head, field);
  if (raw === undefined) return null;
  const value = raw.trim();
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
export function markerDir(root = storeRoot()): string {
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
export function bySeq(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export function byRecordId(a: RelayRecord, b: RelayRecord): number {
  return bySeq(a.id, b.id);
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

export async function loadStore(root = storeRoot()): Promise<Map<string, RelayRecord>> {
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
  // Read concurrently, insert in sorted order. The sequential loop this replaced spent one
  // round trip per record; at 879 records that measured 68ms warm against 22ms here.
  // Insertion order is unchanged because the Map is filled from the sorted array after every
  // read settles, not from the read callbacks.
  //
  // The fan-out is bounded because an unbounded one is not portable. Measured on this store:
  // node 22 reading all 879 concurrently raises EMFILE at `ulimit -n 256`, the macOS default,
  // and again at 64. Bun survives both, so an unbounded version is safe under `bun run` and
  // breaks the `tests (node 22)` job wherever the descriptor limit is small.
  //
  // 32 was chosen by measurement, not by feel: it completes at limits of 256 and 64 and fails
  // at 32, where 16 fails too — below that the process's own descriptors dominate and no
  // constant helps. The bound costs about a millisecond against an unbounded read here.
  const READ_FAN_OUT = 32;
  const txtNames = names.filter((n) => n.endsWith(".txt")).sort(bySeq);
  for (let i = 0; i < txtNames.length; i += READ_FAN_OUT) {
    const batch = await Promise.all(
      txtNames.slice(i, i + READ_FAN_OUT).map(async (name) => {
        const id = name.replace(/\.txt$/, "");
        return [id, parse(id, await readFile(join(root, name), "utf8"))] as const;
      }),
    );
    for (const [id, record] of batch) out.set(id, record);
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
  return [...store.values()].filter((r) => r.parent === id || r.ref === id).sort(byRecordId);
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
