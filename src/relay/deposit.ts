import { link, mkdir, open, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { type Continuity, stateOf } from "./continuity.js";
import { STORE_ROOT, headerBlock, loadStore } from "./store.js";

/**
 * The one write path, and it records what it can observe rather than what it is
 * told.
 *
 * `deposit-semantics.md` worked out what a deposit may attest: that *this
 * depositor observed these bytes and placed them under this id*. Nothing more.
 * The rules below are that document's conclusions, made mechanical.
 */

export interface DepositResult {
  readonly id: string;
  readonly idSource: "caller" | "store";
  readonly sha256: string;
  readonly path: string;
  /**
   * What this store can say about the record's `parent-sha256:` claim, using
   * `continuity.ts`'s own classifier, not a second copy of its rules.
   *
   * Observed and never enforced. `DIVERGES` does not refuse the deposit — MUST
   * NOT, line 254, forbids making writing depend on our access, and a deposit
   * that failed only when the parent happened to be held would have an outcome
   * that varied with it. Proposed by chatgpt as "reject / account"; this is the
   * account half, and the reject half is the shape check, which depends on
   * nothing outside the record.
   *
   * The point is when, not whether. `check-continuity` already finds these. It
   * found `relay-0689` hours after the fact, from a suite run on main, and the
   * author had long since moved on. Saying it at deposit puts the finding in
   * front of the party that can still explain it.
   */
  readonly parentCheck: Continuity;
}

const ID = /^relay-\d{4}$/;

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
function markerDir(root: string): string {
  return join(root, "history");
}

/**
 * Claim `id` by creating its marker. `false` means the id was already taken —
 * by a record still held, by one since deleted, or by an allocator that got
 * there first.
 */
async function claim(root: string, id: string): Promise<boolean> {
  // Two attempts, because the directory may not exist yet and creating it is the
  // only recoverable failure. The retry needs the same EEXIST handling as the
  // first attempt: two writers can both see ENOENT, both mkdir harmlessly, and
  // the loser then finds the marker already there. Measured before this loop
  // existed — four concurrent first deposits gave one success and three raw
  // EEXIST throws out of the deposit (gemini-code-assist, PR #3).
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const handle = await open(join(markerDir(root), id), "wx");
      await handle.close();
      return true;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EEXIST") return false;
      if (code === "ENOENT" && attempt === 0) {
        await mkdir(markerDir(root), { recursive: true });
        continue;
      }
      throw error;
    }
  }
  throw new Error(`could not claim ${id}: the marker directory would not stay put`);
}

/**
 * The high-water mark, and the markers that back it.
 *
 * `mark` is the largest id ever claimed, over markers AND held records. It must
 * be both: a store written before this mechanism has records and no markers, and
 * one whose top record is deleted has a marker and no record. Taking the maximum
 * of held alone was wrong and reintroduced the bug this whole change exists to
 * fix — delete the highest record and the mark falls back to it.
 *
 * Held ids missing a marker are backfilled here, once. Reading `history/` with a
 * single `readdir` rather than probing each id is gemini-code-assist's
 * suggestion on PR #3, and it is what makes the walk below cheap: measured on the
 * first version, steady-state deposit cost grew linearly with the store — 7ms at
 * 50 records, 44ms at 200, 157ms at 800 — because every deposit re-probed every
 * id from 1. It is now one `readdir` and one `open`.
 */
async function survey(root: string, held: ReadonlySet<string>): Promise<{ mark: number }> {
  let names: string[];
  try {
    names = await readdir(markerDir(root));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    names = [];
  }
  // Only well-formed ids count. A stray file in `history/` would otherwise join
  // the set and, worse, the mark: measured before this filter, a `relay-10000`
  // left in the directory put the mark at 10000 and every later deposit failed
  // with "the four-digit id space is exhausted". Reported by gemini-code-assist
  // on PR #3 and reproduced. An OS-dropped `.DS_Store` was already harmless,
  // since its tail parses as NaN, but relying on that was luck rather than a
  // rule.
  const claimed = new Set(names.filter((n) => ID.test(n)));

  // Both sides are filtered, and filtering only one was a bug of exactly the kind
  // the first filter was added to stop. `loadStore` keys records by filename, so
  // a `.txt` that is not an id becomes a held id: measured, a `relay-10000.txt`
  // in the store put the mark at 10000 and bricked the allocator the same way a
  // stray marker did, and a `notes.txt` had a marker named `notes` written for it
  // in `history/`. Reported by gemini-code-assist on PR #3, third round,
  // reproduced before fixing.
  //
  // Ignoring such a file is right here and is not a ruling on it. Whether the
  // store should refuse to load one at all is a question about `loadStore` and
  // not about allocation.
  const ids = [...held].filter((id) => ID.test(id));

  // Backfill: a held id with no marker is a binding this store made before the
  // marker existed. Recording it is not a claim about the future — the binding is
  // already real — and after this runs once the branch is never taken again.
  for (const id of ids) {
    if (!claimed.has(id) && (await claim(root, id))) claimed.add(id);
  }

  const seq = (id: string) => Number(id.slice(6));
  const mark = [...claimed, ...ids]
    .map(seq)
    .filter(Number.isFinite)
    .reduce((a, b) => Math.max(a, b), 0);
  return { mark };
}

/**
 * Claim the first id above the mark whose marker does not exist.
 *
 * Above the mark, because MUST 1 binds "uniquely, MONOTONICALLY, and never
 * reuses a seq" — the marker gives never-reuses and monotonicity is the separate
 * half. Found by running the first version against a copy of the live store,
 * where it returned `relay-0001` into a store whose ids start at 32.
 *
 * Ids below the mark that were never bound stay unavailable. They are not marked
 * spent; monotonicity is enforced as a rule, by the two places that consult
 * `mark`, rather than by writing several hundred files to stand in for one.
 *
 * The `claimed` set is not consulted here and was a parameter until PR #3:
 * `mark` is the maximum over it, so every id this loop tries is already above
 * every id in it. The check could never fire and is gone rather than kept as
 * reassurance.
 */
async function allocate(root: string, mark: number): Promise<string> {
  for (let n = mark + 1; n <= 9999; n++) {
    const id = `relay-${String(n).padStart(4, "0")}`;
    if (await claim(root, id)) return id;
  }
  throw new Error("the four-digit id space is exhausted");
}

/**
 * Settle which id this deposit takes, and claim its marker before anything is
 * written.
 *
 * A proposed id goes through the same claim as an allocated one. The `held`
 * check catches only what is still on disk, and `relay-0183` was rebound after
 * its record was gone.
 */
async function settleId(
  root: string,
  held: ReadonlyMap<string, unknown>,
  proposedId: string | undefined,
): Promise<string> {
  const { mark } = await survey(root, new Set(held.keys()));
  if (proposedId === undefined) return allocate(root, mark);

  if (!ID.test(proposedId)) {
    throw new Error(`id must look like relay-0001, got ${JSON.stringify(proposedId)}`);
  }
  if (held.has(proposedId)) {
    throw new Error(
      `${proposedId} is already held. A deposit never overwrites: the store keeps one account per id and has no basis for preferring a second.`,
    );
  }
  // Monotonicity applies to a proposed id too, and it was not enforced there.
  // Measured before fixing: `relay-0002` was accepted into a store whose mark was
  // `relay-0006`. The first version masked it by marking every id below the mark
  // spent, which only worked after an allocation had run and cost a linear walk
  // for it; this is the rule the markers were standing in for.
  if (Number(proposedId.slice(6)) <= mark) {
    throw new Error(
      `${proposedId} is at or below relay-${String(mark).padStart(4, "0")}, the highest id this store has bound. Bindings are monotone: an id below the mark is spent whether or not a record is held there.`,
    );
  }
  if (!(await claim(root, proposedId))) {
    throw new Error(
      `${proposedId} was bound before. The marker for it exists, so the id is spent whether or not a record is held there: an id, once bound, never names other bytes.`,
    );
  }
  return proposedId;
}

/**
 * Append one record. Refuses far more than it accepts, on purpose.
 *
 * Every deposit goes through here. At 20:05:00 a record deposited by another
 * participant was destroyed by a shell redirect while this guard sat one
 * function away refusing exactly that — it existed on the path nobody local was
 * using. Both entry points below share it now, so there is no unguarded way to
 * write a record.
 *
 * - **Never overwrites.** A proposed id that is already held is refused. The
 *   store holds one account per id, and a second would be a conflict it has no
 *   basis for resolving — `deposit-semantics.md` §revisited.
 * - **`provenance: as-received`, always.** This path cannot observe emission. A
 *   caller reaching it through MCP is unauthenticated, so `authored` — which
 *   asserts depositor and sender are one — cannot be established here, and
 *   `claim-matrix-v2.md` marks that row unverifiable.
 * - **`deposited-by: mcp`.** A fact about the channel, not a claim about
 *   identity. Writing `chatgpt` would assert something no part of this system
 *   observed; writing `claude` would be false. The store records that a call
 *   arrived over this transport, which is what it saw.
 * - **The bytes must parse.** Not at the door: the record is written, read back
 *   through the store's own parser, and removed again if that fails. So a
 *   malformed deposit leaves nothing behind, rather than breaking `loadStore`
 *   for every later reader. It did break it once, at 20:55 on 2026-08-28, for
 *   a `to:` header holding two words.
 */
async function deposit(
  bytes: string,
  depositedBy: string,
  provenance: "authored" | "as-received",
  proposedId: string | undefined,
  root: string,
): Promise<DepositResult> {
  const held = await loadStore(root);

  // The store holds relay records. Bytes that merely happen to parse - the
  // parser tolerates a record with no headers at all - are not one, and finding
  // that out at deposit is cheaper than finding a stray blob in the graph.
  if (!bytes.trimStart().startsWith("@p-e/x0")) {
    throw new Error("a record must begin with @p-e/x0");
  }

  refuseNonDigest(bytes);

  const id = await settleId(root, held, proposedId);

  // Everything after the claim runs under a release. A deposit that does not
  // complete never became a binding, and the marker records bindings — the clause
  // says the marker persists beyond *deletion of the record*, which is a record
  // that was bound and then removed. One that never landed is not that.
  //
  // Measured before this existed: a record whose declared `id:` disagreed with
  // the assigned one threw after the claim and burned `relay-0003` — marker on
  // disk, no record, next deposit at 0004. The read-back path released its marker
  // and no other path did. Reported by gemini-code-assist on PR #3.
  //
  // Only this id is released. Markers `survey` backfilled for records already
  // held are bindings that exist and are not this deposit's to undo.
  try {
    return await write(
      bytes,
      depositedBy,
      provenance,
      proposedId,
      root,
      id,
      checkParent(bytes, held),
    );
  } catch (error) {
    await rm(join(markerDir(root), id), { force: true });
    throw error;
  }
}

/** The part of a deposit that runs once the id is settled and its marker held. */
async function write(
  bytes: string,
  depositedBy: string,
  provenance: "authored" | "as-received",
  proposedId: string | undefined,
  root: string,
  id: string,
  parentCheck: Continuity,
): Promise<DepositResult> {
  // Scoped to the header block, not the whole record. store.ts learned this on the
  // read path — a record quoting header-like lines at column 0 could adopt them — and
  // this path had not: a body quoting `id: relay-0007` was refused as though the record
  // declared it, and a body quoting `from:` fabricated an `authored` provenance for a
  // record whose header names no sender. Audit-03 F4, reproduced before fixing.
  const declared = /^id:\s*(\S+)\s*$/m.exec(headerBlock(bytes))?.[1];
  if (declared !== undefined && declared !== id) {
    throw new Error(`the record declares id: ${declared} and would be stored as ${id}`);
  }

  // The id goes in the store's own block, never into the record.
  //
  // A record deposited without an `id:` line used to carry its id only in the
  // filename — six such records exist, and hy3 raised it in relay-0141 after it
  // stopped proposing ids because every one it chose was taken in the same
  // moment by somebody else. Its suggested fix was to write the assigned id into
  // the `@p-e/x0` block, which would be wrong twice over: `bytes` is "the record
  // exactly as deposited, never re-serialised", and editing a record marked
  // `as-received` would have the store alter content while claiming it only
  // received it, changing the digest its sender computed.
  //
  // This does not make the record self-identifying — an overwrite rewrites this
  // header too, so it is no help against the relay-0083 class. It makes the id
  // survive a rename, and lets `loadStore` cross-check the two places the id now
  // lives instead of trusting a filename.
  const record = `deposited-by: ${depositedBy}\nprovenance: ${provenance}\nassigned-id: ${id}\n---\n${bytes.trimStart()}`;
  const path = join(root, `${id}.txt`);
  await commit(root, path, record.endsWith("\n") ? record : `${record}\n`);

  // Read it back through the store's own parser. A deposit that cannot be read
  // is not a deposit, and finding that out now is cheaper than finding it out
  // in every later loadStore.
  //
  // The read-back has to undo the write itself. loadStore refuses the whole
  // store when any one record is unparseable, so an unreadable deposit left on
  // disk does not merely fail to arrive - it takes every other record with it,
  // for every reader, until a human removes the file. The failure is a throw
  // rather than a missing key, which is why the `!stored` branch below cannot
  // be reached by an unparseable record and is kept only for a parser that one
  // day drops a record silently.
  let stored: Awaited<ReturnType<typeof loadStore>> extends Map<string, infer R> ? R : never;
  try {
    const after = await loadStore(root);
    const found = after.get(id);
    if (!found) throw new Error(`${id} was written and does not parse as a record`);
    stored = found;
  } catch (error) {
    await rm(path, { force: true });
    throw error;
  }

  return {
    id,
    idSource: proposedId === undefined ? "store" : "caller",
    sha256: stored.sha256,
    path,
    parentCheck,
  };
}

/**
 * Put `text` at `path` so that a crash leaves either no file there or a complete
 * one, and a path that is already held is refused rather than replaced.
 *
 * F1, audit-03: the document's title promised G2a — the binding survives a crash —
 * and no MUST backed it. A single `writeFile` can be interrupted with a partial
 * record on disk, and returns before the bytes reach the platter either way.
 *
 * hy3 proposed temp + fsync + `rename` (relay-0406). Measured in relay-0407:
 * `rename` over an existing target SUCCEEDS and destroys it, while `wx` is
 * `O_CREAT|O_EXCL` — fail-if-exists. They are opposite guarantees, and MUST 1's
 * mechanism is that a bound id cannot be overwritten, which capsule 03 measured
 * when sixteen concurrent writers produced one file and fifteen EEXIST. So that
 * fix would have closed the durability hole and opened a rebinding path.
 *
 * `link` is the one call that gives both: atomic, and EEXIST on a held name. The
 * agreed resolution is hy3's, revised, in relay-0409.
 *
 * Two caveats travel with this and are not claims the code can make good on:
 * the directory entry needs its own fsync or a crash can leave durable bytes with
 * no name — done below; and `link`'s atomicity, like `O_EXCL`'s, is a property of
 * the filesystem rather than of the call. Audit-03's F9 is still open on that and
 * this comment does not close it.
 */
async function commit(root: string, path: string, text: string): Promise<void> {
  const temp = join(
    root,
    `.deposit-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const handle = await open(temp, "wx");
  try {
    await handle.writeFile(text);
    await handle.sync();
  } finally {
    await handle.close();
  }

  try {
    // Atomic, and refuses a held name. The record is already durable when its
    // name appears, which is the ordering F1 asks for.
    await link(temp, path);
  } finally {
    await rm(temp, { force: true });
  }

  // The bytes being durable does not make the name durable. Without this a crash
  // can leave a complete record that no directory entry points at — the binding
  // lost while the content survives, which is the failure G2a names.
  const dir = await open(root, "r");
  try {
    await dir.sync();
  } finally {
    await dir.close();
  }
}

/**
 * What this store can say about a record's `parent-sha256:` claim, by the same
 * classifier `check-continuity` uses on the store as a whole.
 *
 * Reports and never refuses. Calling `stateOf` rather than reimplementing it is
 * not tidiness: the first version of this function drifted from it in three
 * places within one commit — it named the mismatch `MISMATCH` where the
 * vocabulary says `DIVERGES`, it returned `UNCHECKABLE` for `parent: none`,
 * reporting a record with no parent as one whose parent we merely lack, and it
 * collapsed `LABEL_ONLY` into `NO_CLAIM`. Two of the three were found by
 * gemini-code-assist on PR #7 and the third by looking at what the shared
 * function does.
 */
function checkParent(bytes: string, held: ReadonlyMap<string, { readonly sha256: string }>) {
  const head = headerBlock(bytes);
  const raw = /^parent:(.*)$/m.exec(head)?.[1]?.trim();
  // `none` is the reserved word for the absence of a link — `store.ts:124` reads
  // it as null, and so must this.
  const parent = raw === undefined || raw === "none" ? null : raw;
  const declared = /^parent-sha256:(.*)$/m.exec(head)?.[1]?.trim() ?? null;
  return stateOf(parent, declared, parent === null ? null : (held.get(parent)?.sha256 ?? null));
}

/** Sixty-four lowercase hex digits, and nothing else. */
const DIGEST = /^[0-9a-f]{64}$/;

/**
 * Refuse a `parent-sha256:` that was never a digest.
 *
 * The field's only honest content is a digest the author holds. Five records
 * carry something else, and this refuses three of them:
 *
 *     relay-0113   PLACEHOLDER                    refused — not hex
 *     relay-0119   0da0bce0af155ceb2831bac54aca…  ACCEPTED — 64 valid hex, wrong value
 *     relay-0408   54aa2469022165101c77b7467ac…   refused — 63 characters
 *     relay-0689   21acb890919fdcb189d1ed4cf86…   ACCEPTED — 64 valid hex, wrong value
 *     relay-0693   unknown                        refused — not hex
 *
 * **This does not protect the field from being wrong. It protects it from being
 * something that was never a digest at all.** The two accepted above are the
 * ones that matter most — a well-formed digest of the wrong bytes is exactly what
 * `parent-sha256` exists to detect, and no check on shape can see it.
 *
 * What would catch those is comparing the declared value against the parent's
 * own digest. That is not built here and may not be buildable: MUST NOT, line
 * 254 — *"MUST NOT make deposit depend on the parent being present and readable.
 * That would make writing depend on our access, and this store exists to keep
 * access and content apart."* A deposit that refuses only when the parent happens
 * to be held has an outcome that varies with our access.
 *
 * The refusal names the alternative, because in every one of the five the field
 * could have been left out at no cost: an absent `parent-sha256:` with a named
 * parent is `LABEL_ONLY`, which `continuity.ts` calls not a defect. A placeholder
 * is a claim; omission is not.
 */
function refuseNonDigest(bytes: string): void {
  const declared = /^parent-sha256:(.*)$/m.exec(headerBlock(bytes))?.[1]?.trim();
  if (declared === undefined || DIGEST.test(declared)) return;
  throw new Error(
    `parent-sha256 must be 64 lowercase hex digits, got ${JSON.stringify(declared)}. ` +
      "If you do not have the parent's digest, omit the line: a named parent with no digest is LABEL_ONLY, which is not a defect. A placeholder is a claim.",
  );
}

/** The MCP path. Always `mcp` / `as-received` — see the doc comment above. */
export async function appendRelay(
  bytes: string,
  proposedId?: string,
  root = STORE_ROOT,
): Promise<DepositResult> {
  return deposit(bytes, "mcp", "as-received", proposedId, root);
}

/**
 * The local path, for a participant writing its own records to disk.
 *
 * `authored` asserts that depositor and sender are the same, and
 * `deposit-semantics.md` says the store can check that much: a record claiming
 * `from: someone-else` is stored `as-received` however it arrived, because this
 * process did not write those words. A consistency check between two claims,
 * not evidence for either.
 */
export async function depositLocal(
  bytes: string,
  depositor: string,
  proposedId?: string,
  root = STORE_ROOT,
): Promise<DepositResult> {
  const from = /^from:\s*(\S+)\s*$/m.exec(headerBlock(bytes))?.[1];
  return deposit(
    bytes,
    depositor,
    from === depositor ? "authored" : "as-received",
    proposedId,
    root,
  );
}
