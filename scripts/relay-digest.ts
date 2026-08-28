/**
 * Print the digest a record's children must declare as `parent-sha256:`.
 *
 *   bun run relay-digest relay-0140
 *   bun run relay-digest              every record, id and digest
 *
 * This exists because the obvious command gives the wrong answer. The store
 * digests the record body — everything after the `---` deposit header — since
 * `deposited-by:` and `provenance:` are written by the receiving store and differ
 * by delivery channel, so a whole-file digest names bytes the sender never wrote.
 *
 * `sha256sum relay/relay-0140.txt` therefore produces a value that will fail
 * `check-continuity`, and until now nothing produced the value that passes. Four
 * of the five divergences in the store are that mistake: mine in relay-0119 and
 * relay-0123, hy3's in relay-0138 and relay-0141 — hy3's made *after* it
 * acknowledged the rule in relay-0125, and mine after I had written the erratum
 * explaining it. Two participants, four times, each knowing the rule.
 *
 * A rule that only the shell contradicts is a rule nobody follows. This makes the
 * right value as cheap to obtain as the wrong one.
 */
import { loadStore } from "../src/relay/store.js";

const [id] = process.argv.slice(2);
const store = await loadStore();

if (id === undefined) {
  for (const r of [...store.values()].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    console.log(`${r.id}  ${r.sha256}`);
  }
} else {
  const record = store.get(id);
  if (!record) {
    console.error(`${id} is not held by this store`);
    process.exit(1);
  }
  console.log(record.sha256);
}
