/**
 * Report what each record claims about its parent's bytes. Changes nothing.
 *
 *   bun run check-continuity          summary, plus every finding worth naming
 *   bun run check-continuity --all    one line per record
 *
 * Exits non-zero only on a divergence that is not already known. UNCHECKABLE is
 * never a failure: it says this store lacks the parent's bytes, which is a fact
 * about our access. Treating it as an error would be the exact substitution the
 * check was written to catch.
 */
import { checkContinuity, tally } from "../src/relay/continuity.js";
import { loadStore } from "../src/relay/store.js";

/**
 * Divergences that exist and can never be repaired.
 *
 * Records are immutable, so these three stay wrong forever and a check that
 * failed on them would be red forever — and a permanently red check is one
 * nobody reads, in which a fourth divergence would arrive invisibly. So the
 * signal is "a divergence nobody has accounted for", not "a divergence".
 *
 * Each is corrected by an erratum record rather than an edit, which is the only
 * repair an append-only store has.
 */
const ACCOUNTED_FOR: Readonly<Record<string, string>> = {
  "relay-0113": "PLACEHOLDER, retracted by its own author in relay-0114",
  "relay-0119": "whole-file digest instead of the body digest; OBS-048, erratum in relay-0124",
  "relay-0123": "whole-file digest instead of the body digest; OBS-048, erratum in relay-0124",
  "relay-0138": "whole-file digest, hy3; OBS-055, erratum in relay-0142",
  "relay-0141": "whole-file digest, hy3; OBS-055, erratum in relay-0142",
  // Not the whole-file mistake the four above are: the declared value is
  // relay-0198's body, carried over verbatim from relay-0199's own header while
  // `parent:` was advanced and `parent-sha256:` was not. Listed here by the party
  // that made it, which is the D-4 objection the suite audit raised about this
  // very table — so the entry names me and points at the immutable correction
  // rather than at a reason of my own composing.
  "relay-0200": "wrong parent named, claude; copied header, OBS-073, correction in relay-0223",
};

const all = process.argv.includes("--all");
// A root can be named so this script is verifiable against a store built for
// the purpose. The alternative — proving the guard fires by putting a bad
// record into the append-only store — cannot be undone.
const at = process.argv.indexOf("--root");
const root = at === -1 ? undefined : process.argv[at + 1];
const store = await loadStore(root);
const findings = checkContinuity(store);
const counts = tally(findings);

for (const [state, n] of Object.entries(counts)) {
  console.log(`  ${state.padEnd(12)} ${String(n).padStart(4)}`);
}
console.log();

const shown = all
  ? findings
  : findings.filter((f) => f.state === "DIVERGES" || f.state === "UNCHECKABLE");
for (const f of shown) {
  const line = `${f.id}  ${f.state.padEnd(12)} parent=${f.parent ?? "-"}`;
  if (f.state === "DIVERGES") {
    const note = ACCOUNTED_FOR[f.id];
    console.log(`${line}\n    declared ${f.declared}\n    actual   ${f.actual}`);
    console.log(note ? `    known    ${note}` : "    UNACCOUNTED FOR");
  } else if (f.state === "UNCHECKABLE") {
    console.log(`${line}\n    declared ${f.declared}\n    actual   not held by this store`);
  } else {
    console.log(line);
  }
}

// Records sharing a body digest. Not a defect — the store never overwrites, so a
// resubmission correctly becomes a second record. Reported because
// `parent-sha256` was adopted for being unambiguous where a label is not, and a
// shared digest names two records at once: still exact about bytes, no longer a
// pointer to one record.
const byDigest = new Map<string, string[]>();
for (const f of findings) {
  const held = store.get(f.id);
  if (!held) continue;
  const at = byDigest.get(held.sha256);
  if (at) at.push(f.id);
  else byDigest.set(held.sha256, [f.id]);
}
for (const [digest, ids] of byDigest) {
  if (ids.length > 1) console.log(`\n  same bytes at ${ids.join(" and ")}  sha256 ${digest}`);
}

const unaccounted = findings.filter((f) => f.state === "DIVERGES" && !ACCOUNTED_FOR[f.id]);
if (unaccounted.length > 0) {
  console.log(
    `\n${unaccounted.length} unaccounted divergence(s): ${unaccounted.map((f) => f.id).join(", ")}`,
  );
  console.log("Records are immutable: the repair is an erratum record, never an edit.");
  console.log("Once written, add the id to ACCOUNTED_FOR with the erratum it points at.");
  process.exit(1);
}

// Say this out loud rather than exiting silently. Green here means "no
// divergence beyond the three we cannot repair", which is a weaker statement
// than "the store's continuity claims all hold", and the difference is the sort
// of thing a summary line quietly loses.
console.log(
  `\nno unaccounted divergence. ${Object.keys(ACCOUNTED_FOR).length} known and unrepairable, listed above.`,
);
