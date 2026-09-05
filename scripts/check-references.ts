/**
 * Report which records nothing has ever referred to. Changes nothing.
 *
 *   bun run check-references          summary, then every record nothing points at
 *   bun run check-references --all    one line per record
 *   bun run check-references --root <path>
 *
 * Written for the question in relay-0132: whether a `short` class of coordination
 * traffic exists that should not have become durable evidence. It does not answer
 * that question and cannot. It answers what the store can be asked — what nothing
 * has pointed at — so that such a class, if there is one, is discovered rather
 * than declared at emission.
 *
 * Exits 0 whatever it finds. There is no failure here to report: an unreferenced
 * record is not a defect, and a script that treated it as one would be asserting
 * the very classification the report exists to avoid making.
 *
 * Two non-zero codes, and neither is a finding: 2 when the store cannot be read
 * at all, and 3 when this store's identity is
 * not configured, so no report can be scoped to an authority and none is
 * produced. Both share their codes with `check-continuity` because they are the same
 * event — "the records read fine and we cannot say whose they are" — and it must
 * not be 1, which in the sibling script means a divergence in somebody's record.
 * gemini-code-assist on PR #93 caught that this call was uncaught; reproduced
 * before fixing, and it exited 1 with a raw stack trace while the line above
 * promised 0.
 */
import { storeIdentity } from "../src/relay/authority.js";
import { checkReferences, tallyReferences } from "../src/relay/reference.js";
import { REFUSED_UNIDENTIFIED, REFUSED_UNREADABLE, refuse } from "../src/relay/refusal.js";
import { ID, STORE_ROOT, loadStore, markerAgreement } from "../src/relay/store.js";

const all = process.argv.includes("--all");
const at = process.argv.indexOf("--root");
const root = at === -1 ? undefined : process.argv[at + 1];

/**
 * Exit 2, and it is the sibling's reasoning, not a new one.
 *
 * A store this script cannot read and a store it read fine are different
 * answers, and an uncaught throw gives 1 with a stack trace — reproduced before
 * fixing. That is worse here than in `check-continuity`, because this script
 * documents 0 as its answer whatever it finds, so 1 contradicts the line above
 * rather than merely overloading it.
 *
 * gemini-code-assist on PR #93, second round. The first round caught the same
 * omission around `storeIdentity()` one line below this one, and fixing that
 * walked straight past this — the neighbouring call, the same shape, in the
 * same edit.
 */
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
// The marker set, so a deleted record still counts as a possible referrer.
const { lost, deleted } = await markerAgreement(store, root ?? STORE_ROOT);
// Filtered by id shape, as `markerAgreement` filters both its sides. Without it
// a `.txt` in the store whose name is not an id counts as a successor and can
// flip the record below it out of NO_SUCCESSORS. Pre-existing on main; the first
// version of this change passed the place where it could be closed without
// closing it — gemini-code-assist and the fable review both walked past it too.
const everBound = new Set([...store.keys(), ...lost, ...deleted].filter((id) => ID.test(id)));
// The set is paired with whose ids it holds. Unioning it with another store's
// markers now requires saying which authority the result is for, which is the
// merge issue-1's Migration section names and nothing could previously refuse.
let authority: string;
try {
  authority = storeIdentity();
} catch (error) {
  refuse(
    REFUSED_UNIDENTIFIED,
    "this store's identity is not configured.",
    error,
    "No report is produced. This is not a finding about any record.",
  );
}
const findings = checkReferences(store, { authority, ids: everBound });
const counts = tallyReferences(findings);

for (const [state, n] of Object.entries(counts)) {
  console.log(`  ${state.padEnd(14)} ${String(n).padStart(4)}`);
}

const shown = all
  ? findings
  : findings.filter((f) => f.state === "UNREFERENCED" || f.state === "PROSE_ONLY");
if (shown.length > 0) console.log();
for (const f of shown) {
  const by =
    f.referencedBy.length > 0
      ? `by ${f.referencedBy.join(", ")}`
      : f.mentionedBy.length > 0
        ? `prose in ${f.mentionedBy.join(", ")}`
        : `${f.successors} record(s) came after and none did`;
  console.log(`  ${f.id}  ${f.state.padEnd(14)} ${by}`);
}

// The reading rule, printed with the numbers rather than left in a doc, because
// a bare count invites exactly the misreading it cannot survive.
console.log(
  `
This is a snapshot. A record nothing has referenced yet and a record nothing will
ever reference are the same value today, and only the population that stays
UNREFERENCED across weeks means anything. NO_SUCCESSORS (${counts.NO_SUCCESSORS}) is the newest
record, about which the store has no evidence either way.`,
);
