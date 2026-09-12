import { strandedHeaders } from "../src/relay/headers.js";
/**
 * Report records whose headers fell into the prose. Changes nothing.
 *
 *   bun run check-headers
 *   bun run check-headers --root <path>
 *
 * Written for `relay-1152`, which measured 21 records this store reads as having
 * no `kind` at all, because a blank line before `kind:` ends the header block and
 * strands the field below it. Seventeen of them are one party's attacks in one
 * thread, so the failure is not rare and it is not random — it follows whatever
 * a party's template does.
 *
 * EXITS 0 WHATEVER IT FINDS, and the reason is `check-references`': a stranded
 * header is not a defect in what a record SAYS. The record is valid, its digest
 * is right, its citation resolves. What is wrong is that a reader asking the
 * store for its kind gets nothing, and that is a fact worth printing rather than
 * a verdict worth failing on. If a gate is ever wanted, it is an envelope
 * decision and belongs to whoever owns the ingest rules, not to a report.
 *
 * 2 when the store cannot be read, sharing the code and the reasoning with its
 * two siblings.
 *
 * AND NO IDENTITY IS REQUIRED, which is the one place this differs from them
 * deliberately. `check-continuity` exits 3 unconfigured because its verdicts are
 * claims scoped to an authority. A header in the wrong half of a file is a fact
 * about bytes; it is the same fact in any store, under any name, and refusing to
 * report it until somebody says whose records these are would be ceremony.
 */
import { REFUSED_UNREADABLE, refuse } from "../src/relay/refusal.js";
import { STORE_ROOT, loadStore } from "../src/relay/store.js";

const at = process.argv.indexOf("--root");
const root = at === -1 ? undefined : process.argv[at + 1];

let store: Awaited<ReturnType<typeof loadStore>>;
try {
  store = await loadStore(root);
} catch (error) {
  refuse(
    REFUSED_UNREADABLE,
    `cannot read the store at ${root ?? STORE_ROOT}`,
    error,
    "No report is produced. This is not a finding about any record.",
  );
}

const found = strandedHeaders(store);
console.log(`${store.size} records, ${found.length} with a header below the blank line\n`);
for (const { id, stranded } of found) {
  console.log(`  ${id}  ${stranded.join(" ")}`);
}
if (found.length > 0) {
  console.log(
    "\nThese records are valid and say what they say. The store reads the named" +
      "\nheaders as absent, so anything asking for them gets nothing. Records are" +
      "\nimmutable: this is a report, not a repair, and there is no gate behind it.",
  );
}
