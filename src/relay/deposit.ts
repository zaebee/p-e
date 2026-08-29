import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
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
}

const ID = /^relay-\d{4}$/;

/** The next unused four-digit id, for a caller that proposes none. */
function nextFree(held: ReadonlySet<string>): string {
  const numbers = [...held].map((k) => Number(k.slice(6))).filter(Number.isFinite);
  const next = (numbers.length === 0 ? 0 : Math.max(...numbers)) + 1;
  return `relay-${String(next).padStart(4, "0")}`;
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

  if (proposedId !== undefined && !ID.test(proposedId)) {
    throw new Error(`id must look like relay-0001, got ${JSON.stringify(proposedId)}`);
  }
  if (proposedId !== undefined && held.has(proposedId)) {
    throw new Error(
      `${proposedId} is already held. A deposit never overwrites: the store keeps one account per id and has no basis for preferring a second.`,
    );
  }

  // The store holds relay records. Bytes that merely happen to parse - the
  // parser tolerates a record with no headers at all - are not one, and finding
  // that out at deposit is cheaper than finding a stray blob in the graph.
  if (!bytes.trimStart().startsWith("@p-e/x0")) {
    throw new Error("a record must begin with @p-e/x0");
  }

  const id = proposedId ?? nextFree(new Set(held.keys()));
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
  await writeFile(path, record.endsWith("\n") ? record : `${record}\n`, { flag: "wx" });

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
  };
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
