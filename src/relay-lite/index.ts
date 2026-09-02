import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { sha256Hex } from "./canonical.js";
import { parseCns } from "./cns.js";
import { StoreCorruption, type StoredAct } from "./verify.js";

export * from "./act.js";
export * from "./cns.js";
export * from "./hlc.js";
export * from "./publish.js";
export * from "./uuid.js";
export * from "./verify.js";

// `canonical.js` is deliberately not re-exported. `mint()` is then the only
// producer of bytes a consumer of this package has, which is what makes §3.2's
// MUST NOT against re-ticking a retry hold by construction rather than by
// convention: through this surface a caller cannot assemble bytes for
// {...act, hlc: other}. verify.ts imports it directly, and so do the tests.

/**
 * Every act delivered under this root, keyed by act id.
 *
 * Fan-out means N delivery files carry one act, and §4 requires a consumer to
 * deduplicate by `id` before doing anything else — so this returns one entry per
 * act rather than one per file. The copies are byte-identical, which is what
 * moving `to` out of the hashed body bought.
 */
export async function readDelivered(root: string): Promise<ReadonlyMap<string, StoredAct>> {
  const inDir = join(root, "in");
  let names: string[];
  try {
    names = await readdir(inDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Map();
    throw error;
  }

  const out = new Map<string, StoredAct>();
  for (const name of names) {
    const cns = parseCns(name);
    if (!cns) continue;

    let bytes: string;
    try {
      bytes = await readFile(join(inDir, name), "utf8");
    } catch (error) {
      // A file deleted between the readdir and this read is a gap in what this
      // reader holds, not a fault in the store. Failing the whole sweep for it
      // would make one racing delete look like a broken store.
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }

    const digest = sha256Hex(bytes);
    const seen = out.get(cns.id);
    if (seen !== undefined && seen.digest !== digest) {
      // Fan-out means N delivery files carry one act and the copies are
      // byte-identical — that is what moving `to` out of the hashed body bought.
      // Two copies under one id that disagree is therefore a discrepancy inside
      // this store, and §7.3 says a store must not let its own discrepancy reach
      // a record as a verdict. Taking whichever `readdir` returned last would do
      // exactly that, silently and non-deterministically.
      throw new StoreCorruption(cns.id);
    }
    out.set(cns.id, { bytes, digest });
  }
  return out;
}
