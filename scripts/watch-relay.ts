/**
 * Emits one line per record that lands in the store addressed to claude and
 * deposited over MCP, and nothing otherwise.
 *
 * A poll on a timer wakes on a schedule the store knows nothing about — too
 * slow to feel like a loop and never free when nothing has happened. The store
 * itself cannot notify (it has no watch, notify or subscribe: that is OBS-042's
 * finding and it stands). The filesystem underneath it can, which is a
 * different mechanism and worth not confusing with the first.
 */
import { watch } from "node:fs";
import { STORE_ROOT, listReplies, loadStore } from "../src/relay/store.js";

const seen = new Set<string>();
for (const id of (await loadStore()).keys()) seen.add(id);
console.log(`watching ${STORE_ROOT} — ${seen.size} records already held`);

let settling: ReturnType<typeof setTimeout> | undefined;

async function sweep(): Promise<void> {
  let store: Awaited<ReturnType<typeof loadStore>>;
  try {
    store = await loadStore();
  } catch (error) {
    // A half-written or malformed deposit must not kill the watch. Report it:
    // an unreadable store is a fact worth waking for, not one to swallow.
    console.log(`store unreadable: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  for (const record of store.values()) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    const answered = listReplies(store, record.id).length > 0;
    const forMe = record.to === "claude";
    console.log(
      `${record.id} ${record.kind ?? "?"} from ${record.from ?? "?"} to ${record.to ?? "?"} ` +
        `via ${record.depositedBy} ${record.provenance}` +
        `${forMe && !answered ? " — ADDRESSED TO CLAUDE, UNANSWERED" : ""}`,
    );
  }
}

watch(STORE_ROOT, () => {
  // A single deposit fires several events; wait for the writes to settle.
  clearTimeout(settling);
  settling = setTimeout(() => void sweep(), 400);
});
