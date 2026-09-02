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
  readonly maxRetries?: number;
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

export async function publish(
  sealed: SealedAct,
  recipient: string,
  root: string,
  options: PublishOptions = {},
): Promise<PublishResult> {
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
  const maxRetries = options.maxRetries ?? 3;
  const readOne = options.readTarget ?? ((p: string) => readFile(p, "utf8"));

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Randomised, not `<id>.tmp`. A crash leaves no `finally` to run, and a
    // deterministic name would survive as an uncollectable file blocking
    // republication of exactly the message that was interrupted.
    const tmp = join(
      tmpDir,
      `.dep-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    let created = false;

    try {
      const handle = await open(tmp, "wx");
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
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;

        let existing: string;
        try {
          existing = await readOne(target);
        } catch (readError) {
          // ENOENT is interpreted only for reading the target. The directory
          // fsync below produces ENOENT too, and the two are indistinguishable
          // by code.
          if ((readError as NodeJS.ErrnoException).code === "ENOENT") continue;
          throw readError;
        }

        if (sha256Hex(existing) === sealed.digest) {
          // The recovery path completes the guarantee it is recovering: the
          // first attempt may have linked and failed before its directory
          // fsync, leaving a name visible in page cache and never persisted.
          await syncPath(inDir, "r", options.onSync);
          return { status: "ALREADY_PUBLISHED" };
        }
        return { status: "COLLISION_REFUSED" };
      }

      // Durable bytes are not a durable name.
      await syncPath(inDir, "r", options.onSync);
      return { status: "PUBLISHED" };
    } finally {
      if (created) await unlink(tmp).catch(() => {});
    }
  }

  // Reachable only through the vanished-target path, which means every attempt
  // found the name free. Reporting that as a collision would assert another
  // writer holds a name nobody holds.
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
  if (!Array.isArray(sealed.act.to)) {
    throw new Error(`act.to must be an array, got ${typeof sealed.act.to}`);
  }
  const out: { recipient: string; result: PublishResult }[] = [];
  for (const recipient of sealed.act.to) {
    out.push({ recipient, result: await publish(sealed, recipient, root, options) });
  }
  return out;
}
