import { randomBytes } from "node:crypto";
import { link, mkdir, open, readFile, unlink } from "node:fs/promises";
import { basename, join } from "node:path";
import type { SealedAct } from "./act.js";
import { sha256Hex } from "./canonical.js";
import { formatCns } from "./cns.js";

/**
 * The publish sequence from §4.1.
 *
 * Every element closes a failure found during review of issue #5, and the
 * comments say which, because a reader who does not know what each guards will
 * eventually simplify one away.
 *
 * ## This module requires POSIX, and says so rather than degrading
 *
 * §4.1 is built from `link` refusing a held name with `EEXIST`, `O_CREAT |
 * O_EXCL` on the temp, and `fsync` on a directory file descriptor. Windows has
 * none of those semantics, and `open()` on a directory there raises `EISDIR`.
 *
 * Review proposed catching and ignoring that. It is not done, because a
 * publisher that skipped the directory fsync and still returned `PUBLISHED`
 * would be asserting a durability it did not obtain — *"durable bytes are not a
 * durable name"* is the whole reason the step exists. An error propagating is a
 * caller learning the platform cannot give what this returns; a swallowed one is
 * a caller told the name is safe when it may not be.
 *
 * If this ever needs to run where a directory cannot be synced, the honest shape
 * is a fourth `PublishResult` naming the weaker guarantee, not a silent one.
 */

export type PublishResult =
  | { readonly status: "PUBLISHED" }
  | { readonly status: "ALREADY_PUBLISHED" }
  | { readonly status: "COLLISION_REFUSED" }
  | { readonly status: "RETRY_EXHAUSTED" };

export interface PublishOptions {
  /**
   * How many times the sequence may be attempted, not how many retries follow
   * a first try.
   *
   * It was `maxRetries` and counted attempts: `maxRetries: 3` ran three, and
   * `maxRetries: 0` ran none and returned `RETRY_EXHAUSTED` — a status
   * asserting that no attempt established the name, when no attempt was made.
   * `-1` did the same and `1.5` worked by accident.
   */
  readonly maxAttempts?: number;
  /** Every path `fsync` is issued against, so a test can assert the directory. */
  readonly onSync?: (path: string) => void;
  /** Seam for the vanished-target path, which a race alone cannot be made to take. */
  readonly readTarget?: (path: string) => Promise<string>;
}

async function syncPath(path: string, flags: string, onSync?: (p: string) => void): Promise<void> {
  const handle = await open(path, flags);
  try {
    await handle.sync();
    onSync?.(path);
  } finally {
    await handle.close();
  }
}

/**
 * The errno of a thrown value, when it has one.
 *
 * `readTarget` is a caller-supplied seam, so what it throws is not necessarily
 * an `Error` — reading `.code` off `null` throws from inside the catch and
 * loses the original. Node's own `link` always throws a SystemError, so this
 * costs nothing there and is the only honest reader for the other.
 */
function errnoOf(value: unknown): string | undefined {
  return value instanceof Error ? (value as NodeJS.ErrnoException).code : undefined;
}

/**
 * What to do about a name `link` refused with EEXIST.
 *
 * Split out because §4.1's sequence nests two error paths inside a retry, and
 * a reader tracing the retry should not have to hold the collision rules at the
 * same time.
 */
async function resolveExisting(
  target: string,
  inDir: string,
  sealed: SealedAct,
  readOne: (p: string) => Promise<string>,
  onSync?: (p: string) => void,
): Promise<PublishResult | "retry"> {
  let existing: string;
  try {
    existing = await readOne(target);
  } catch (readError) {
    // ENOENT is interpreted only for reading the target. The directory fsync
    // below produces ENOENT too, and the two are indistinguishable by code.
    if (errnoOf(readError) === "ENOENT") return "retry";
    throw readError;
  }

  if (sha256Hex(existing) === sealed.digest) {
    // The recovery path completes the guarantee it is recovering: the first
    // attempt may have linked and failed before its directory fsync, leaving a
    // name visible in page cache and never persisted.
    await syncPath(inDir, "r", onSync);
    return { status: "ALREADY_PUBLISHED" };
  }
  return { status: "COLLISION_REFUSED" };
}

/**
 * Everything `publish` is handed, checked before any of it reaches the disk.
 *
 * Gathered into one function for two reasons. Sonar counts the sequence's
 * nested error paths at the complexity limit already, so guards inline push it
 * over — and a reader asking "what does this refuse" should find the answer in
 * one place rather than threaded through the retry.
 *
 * Returns the attempt budget because validating it and reading it are the same
 * act.
 */
function checkArguments(sealed: SealedAct, root: string, options: PublishOptions): number {
  // `sealed` is not necessarily what `mint` returned: this module accepts an
  // act off the wire and several tests feed it one.
  if (sealed === null || typeof sealed !== "object") {
    throw new TypeError(`sealed must be an object, got ${String(sealed)}`);
  }
  if (sealed.act === null || typeof sealed.act !== "object") {
    throw new TypeError(`sealed.act must be an object, got ${String(sealed.act)}`);
  }

  // An empty root is the one that matters. `join("", "in")` is `"in"` — a
  // relative path — so the publisher created `in/` and `tmp/` in whatever
  // directory the process happened to be running from and reported PUBLISHED.
  // A relative root a caller *chose* is their business; an empty one is an
  // unset value that happened to work.
  if (typeof root !== "string" || root === "") {
    throw new TypeError(`root must be a non-empty path, got ${JSON.stringify(root)}`);
  }

  if (options === null || typeof options !== "object") {
    throw new TypeError(`options must be an object, got ${String(options)}`);
  }
  if (options.onSync !== undefined && typeof options.onSync !== "function") {
    throw new TypeError("options.onSync must be a function");
  }
  if (options.readTarget !== undefined && typeof options.readTarget !== "function") {
    throw new TypeError("options.readTarget must be a function");
  }

  const maxAttempts = options.maxAttempts ?? 3;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new TypeError(`maxAttempts must be a positive integer, got ${String(maxAttempts)}`);
  }
  return maxAttempts;
}

export async function publish(
  sealed: SealedAct,
  recipient: string,
  root: string,
  options: PublishOptions = {},
): Promise<PublishResult> {
  const maxAttempts = checkArguments(sealed, root, options);
  const inDir = join(root, "in");
  const tmpDir = join(root, "tmp");
  await mkdir(inDir, { recursive: true });
  await mkdir(tmpDir, { recursive: true });

  const target = join(inDir, formatCns(sealed.act, recipient));
  // The name is built here and `formatCns` refuses a component that could
  // escape, so this holds today by composition rather than by its own effort.
  // It is kept because that is the composition changing under it: a publisher
  // that writes wherever a name it was handed resolves has no defence of its
  // own, and this is one comparison in front of a durable write. Issue #35.
  if (target !== join(inDir, basename(target))) {
    throw new Error(`delivery name escapes in/: ${JSON.stringify(target)}`);
  }
  const readOne = options.readTarget ?? ((p: string) => readFile(p, "utf8"));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Randomised, not `<id>.tmp`. A crash leaves no `finally` to run, and a
    // deterministic name would survive as an uncollectable file blocking
    // republication of exactly the message that was interrupted.
    const tmp = join(
      tmpDir,
      // `randomBytes`, not `Math.random`: `O_EXCL` below already refuses to
      // follow a symlink planted at this path, so the classic attack is closed
      // either way — but a predictable name in a directory other processes can
      // reach is a weakness with no upside, and this costs nothing.
      `.dep-${process.pid}-${Date.now()}-${randomBytes(8).toString("hex")}`,
    );
    let created = false;

    try {
      // EEXIST here is a temp-name collision, not a publish collision, and the
      // two must not share a verdict — that distinction is why the `link` catch
      // below tests for EEXIST at its own level rather than around the whole
      // block. With 64 bits from `randomBytes` this is not reachable in
      // practice; retrying it costs four lines and turns an exception out of a
      // publish that did nothing into a publish that completes.
      let handle: Awaited<ReturnType<typeof open>>;
      try {
        handle = await open(tmp, "wx");
      } catch (error) {
        if (errnoOf(error) === "EEXIST") continue;
        throw error;
      }
      created = true;
      try {
        await handle.writeFile(sealed.bytes, "utf8");
        await handle.sync();
        options.onSync?.(tmp);
      } finally {
        await handle.close();
      }

      try {
        // `link`, not `rename`: rename overwrites a held name silently, and a
        // create-or-fail publish needs the EEXIST.
        await link(tmp, target);
      } catch (error) {
        // EEXIST is interpreted only for `link`. The temp `open` above uses
        // O_EXCL and produces EEXIST too, and catching it at this level would
        // report a temp-name collision as a publish collision.
        if (errnoOf(error) !== "EEXIST") throw error;

        const verdict = await resolveExisting(target, inDir, sealed, readOne, options.onSync);
        if (verdict !== "retry") return verdict;
        continue;
      }

      // Durable bytes are not a durable name.
      await syncPath(inDir, "r", options.onSync);
      return { status: "PUBLISHED" };
    } finally {
      if (created) await unlink(tmp).catch(() => {});
    }
  }

  // Reached when no attempt established the name: the target vanished between
  // `link` and the read, or the temp name was taken. Neither says another
  // writer holds the target — the vanished path found it free and the temp path
  // never reached it — so reporting this as a collision would assert something
  // nobody observed.
  //
  // The second path was added with the temp-collision retry above. Before that
  // this comment said "reachable only through the vanished-target path", which
  // stopped being true the moment a second `continue` existed.
  return { status: "RETRY_EXHAUSTED" };
}

/**
 * One result per recipient.
 *
 * The specification is silent on partial fan-out, there is no atomicity across
 * delivery legs and none available, so collapsing three outcomes into one would
 * assert a guarantee the mechanism does not provide.
 */
export async function publishAll(
  sealed: SealedAct,
  root: string,
  options: PublishOptions = {},
): Promise<ReadonlyArray<{ readonly recipient: string; readonly result: PublishResult }>> {
  // Checked for being a list before it is read as one. An act off the wire can
  // carry a string, and a string iterates by character: `to: "agent:mimo"`
  // fanned out to nine recipients named `a`, `g`, `e`, `n`, `t`, `:`, `m`, `i`,
  // `o`, and wrote nine durable delivery files to nine agents that do not
  // exist. Third occurrence of that shape in this store, after minting (#34)
  // and `checkDelivery` (#36), and the first where it reached the disk.
  //
  // Thrown rather than returned: this function's answer is one result per
  // recipient, and an audience that is not a list has no recipients to return
  // a result for.
  if (
    sealed === null ||
    typeof sealed !== "object" ||
    sealed.act === null ||
    typeof sealed.act !== "object"
  ) {
    throw new TypeError("sealed must be an object containing an act");
  }
  if (!Array.isArray(sealed.act.to)) {
    throw new TypeError(`act.to must be an array, got ${typeof sealed.act.to}`);
  }
  const out: { recipient: string; result: PublishResult }[] = [];
  for (const recipient of sealed.act.to) {
    out.push({ recipient, result: await publish(sealed, recipient, root, options) });
  }
  return out;
}
