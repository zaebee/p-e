import { watch } from "node:fs";
import { type RelayRecord, STORE_ROOT, loadStore } from "./store.js";

/**
 * Block until a record appears, or until the deadline.
 *
 * **This does not wake anybody.** A caller must already be running to reach it,
 * so it cannot solve what OBS-042 records: neither participant exists between
 * invocations, and a push has nowhere to land. What it changes is the constant —
 * one invocation can buy several exchanges instead of one, because a caller that
 * blocks here receives the next record the moment it lands rather than at its
 * next turn.
 *
 * Amortising a human invocation, not removing it.
 */

/** The store may be mid-write. An unreadable moment is not an answer. */
async function readable(root: string): Promise<Map<string, RelayRecord> | null> {
  try {
    return await loadStore(root);
  } catch {
    return null;
  }
}

export interface WaitResult {
  readonly appeared: readonly RelayRecord[];
  readonly timedOut: boolean;
  readonly waitedMs: number;
}

export const MAX_WAIT_MS = 120_000;

/**
 * @param after ids strictly greater than this are what we are waiting for. Omit
 *   to wait for anything not already held — the baseline is taken at entry, so a
 *   record that lands between the caller's last read and this call is missed by
 *   the omitted form and caught by the explicit one. Pass what you last saw.
 */
export async function waitForRelay(
  after?: string,
  timeoutMs = 30_000,
  root = STORE_ROOT,
): Promise<WaitResult> {
  const deadline = Math.min(Math.max(timeoutMs, 1_000), MAX_WAIT_MS);
  const started = Date.now();

  const baseline = await readable(root);
  const held = new Set(baseline ? baseline.keys() : []);
  const qualifies = (r: RelayRecord) => (after === undefined ? !held.has(r.id) : r.id > after);

  // Already there. Blocking would be a lie about when it arrived.
  const already = baseline ? [...baseline.values()].filter(qualifies) : [];
  if (already.length > 0) {
    return {
      appeared: already.sort((a, b) => (a.id < b.id ? -1 : 1)),
      timedOut: false,
      waitedMs: 0,
    };
  }

  return new Promise<WaitResult>((resolve) => {
    let settling: ReturnType<typeof setTimeout> | undefined;
    const done = (appeared: RelayRecord[], timedOut: boolean) => {
      clearTimeout(settling);
      clearTimeout(timer);
      watcher.close();
      resolve({ appeared, timedOut, waitedMs: Date.now() - started });
    };

    const timer = setTimeout(() => done([], true), deadline);

    const watcher = watch(root, () => {
      // A single deposit fires several filesystem events; let the write settle
      // before reading, or the store is caught half-written.
      clearTimeout(settling);
      settling = setTimeout(() => {
        void (async () => {
          const now = await readable(root);
          if (!now) return;
          const fresh = [...now.values()].filter(qualifies);
          if (fresh.length > 0)
            done(
              fresh.sort((a, b) => (a.id < b.id ? -1 : 1)),
              false,
            );
        })();
      }, 400);
    });
  });
}
