import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface CorpusEntry {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly producer: string;
  readonly sourceRepo: string;
  /** null where the artifact is build output its producer does not track. */
  readonly sourceRev: string | null;
  readonly tracked: boolean;
  /** Why there is no revision, where there is none. Absent when tracked. */
  readonly reason?: string;
}

export interface Manifest {
  /**
   * When this corpus was copied. Deliberately named unlike every occurrence
   * timestamp inside the artifacts: I-2 says a recorded time is the time of the
   * occurrence, and this one is the time of the extraction. Confusing the two
   * here would repeat, in this project's own record, the defect the invariant
   * was extracted to describe.
   */
  readonly extracted_at: string;
  readonly entries: readonly CorpusEntry[];
}

export const sha256 = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

/** Load every pinned artifact, refusing any whose bytes no longer match. */
export async function loadCorpus(root: string): Promise<Map<string, Uint8Array>> {
  const manifest: Manifest = JSON.parse(
    await readFile(join(root, "corpus", "manifest.json"), "utf8"),
  );
  const files = new Map<string, Uint8Array>();
  // Two entries under one path used to collapse silently when their digests
  // agreed, leaving `entries.length` disagreeing with `files.size` and nothing
  // saying so. A manifest that names an artifact twice is malformed.
  const seen = new Set<string>();
  for (const entry of manifest.entries) {
    if (seen.has(entry.path)) throw new Error(`manifest names ${entry.path} more than once`);
    seen.add(entry.path);
    const bytes = new Uint8Array(await readFile(join(root, "corpus", entry.path)));
    const got = sha256(bytes);
    if (got !== entry.sha256) {
      throw new Error(`digest mismatch for ${entry.path}: manifest ${entry.sha256}, file ${got}`);
    }
    files.set(entry.path, bytes);
  }
  return files;
}
