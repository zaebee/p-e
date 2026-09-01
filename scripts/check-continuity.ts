/**
 * Report what each record claims about its parent's bytes. Changes nothing.
 *
 *   bun run check-continuity          summary, plus every finding worth naming
 *   bun run check-continuity --all    one line per record
 *
 * Exits 0 clean, 1 on a divergence that is not already known, and 2 when the
 * store cannot be read at all. UNCHECKABLE is never a failure: it says this
 * store lacks the parent's bytes, which is a fact about our access. Treating it
 * as an error would be the exact substitution the check was written to catch —
 * and so would answering 1 for a store nobody could open.
 */
import { checkContinuity, tally } from "../src/relay/continuity.js";
import { STORE_ROOT, loadStore, markerAgreement } from "../src/relay/store.js";

/**
 * Divergences that exist and can never be repaired.
 *
 * Records are immutable, so these stay wrong forever and a check that
 * failed on them would be red forever — and a permanently red check is one
 * nobody reads, in which a fourth divergence would arrive invisibly. So the
 * signal is "a divergence nobody has accounted for", not "a divergence".
 *
 * Each is corrected by an erratum record rather than an edit, which is the only
 * repair an append-only store has.
 */
/**
 * Markers whose record is gone, and why.
 *
 * The marker is never removed — removing it would free the id and reopen the
 * failure MUST 1 exists to prevent. So an orphan is permanent and the only repair
 * is to say what happened, which is the same shape as `ACCOUNTED_FOR` below.
 */
const ORPHANED_MARKERS: Readonly<Record<string, string>> = {
  "relay-0683":
    "mimo's observation, deposited and read on 2026-08-31 and never committed; the record is gone and the cause is unestablished — relay-0703. relay-0684 beside it lost record and marker both, which relay-0685 shows as UNCHECKABLE",
};

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
  // The seventh, and the first that is a digest of NOTHING. The other six are wrong
  // values of a real thing — four whole-file digests, one declared PLACEHOLDER, and
  // relay-0200's true digest of the wrong parent. This one matches no record's body
  // and no file, checked across the store. chatgpt emitted it "while trying to satisfy
  // the envelope convention" without deriving it (relay-0383, designated the erratum by
  // its author in relay-0389 rather than nominated by anyone else). A mandatory field
  // nothing can check at the door will sometimes be filled with something well-formed
  // and false — OBS-091, and the reason this is not repaired by checking at deposit.
  // The eighth, and the first that is MALFORMED rather than wrong. 63 hex characters
  // where a sha-256 has 64 — a single `2` missing from the middle of relay-0405's
  // digest. It cannot be any digest, which is decidable from the claim alone, without
  // the parent and before any comparison; DIVERGES is the right verdict here and a
  // weaker one than the evidence supports. Recorded as a question in relay-0410, not
  // as a change: the spec is frozen at f84909e for the questions-read.
  "relay-0408": "malformed digest, 63 chars, hy3's transcription, not transport; relay-0412",
  // The ninth, and the second digest of NOTHING — same author as the seventh, four
  // records after that author wrote "I will not pretend to know what it contains. If
  // anyone cites it, fetch its exact bytes first." 64 characters, syntactically
  // perfect, matching no body and no file in the store; the tail `…5c6d7e8f90123456`
  // is an ascending nibble run, the shape of a field filled rather than computed.
  // relay-0422, minutes later, declares its parent correctly, so the ability to
  // compute was intact — what differed is that 0421's parent had not been fetched.
  "relay-0421": "digest of nothing, chatgpt; OBS-091 second instance, erratum in relay-0423",
  // The tenth, and the third digest of nothing from one author — the first to arrive
  // AFTER that author was told, with numbers, about the second (relay-0423 reported
  // relay-0421 four records earlier). Same ascending-nibble tail. Census in relay-0431:
  // every well-formed-but-meaningless digest in this store is chatgpt's, three of three;
  // the two that are not announce themselves, one saying PLACEHOLDER and one a character
  // short. hy3's and claude's errors are all real digests of the wrong bytes.
  "relay-0693":
    "parent-sha256: unknown — a placeholder where the honest form is omission, which gives LABEL_ONLY and is not a defect; mimo, erratum in relay-0695",
  "relay-0689":
    "parent-sha256 carried over from the author's own previous record while parent: advanced; mimo, second instance of the relay-0200 class, erratum in relay-0693",
  "relay-0430": "digest of nothing, chatgpt; third instance, erratum in relay-0431",
  "relay-0373": "digest of nothing, chatgpt; OBS-091, erratum in relay-0383",
};

const all = process.argv.includes("--all");
// A root can be named so this script is verifiable against a store built for
// the purpose. The alternative — proving the guard fires by putting a bad
// record into the append-only store — cannot be undone.
const at = process.argv.indexOf("--root");
const root = at === -1 ? undefined : process.argv[at + 1];
// Exit 2, not 1. A store this script cannot read and a store carrying a
// divergence are different answers, and a caller that gets 1 for both cannot
// tell them apart — which is the substitution the whole check exists to refuse,
// performed on the way out. The distinction is computed all the way down to
// UNCHECKABLE and was then discarded at the exit code until relay-0731.
//
// The shape is borrowed: genesis-corpus's courts answer 0 clean, 1 finding,
// 2 refusal to judge, and refuse rather than report a silent zero.
let store: Awaited<ReturnType<typeof loadStore>>;
try {
  store = await loadStore(root);
} catch (error) {
  console.error(`REFUSED: cannot read the store at ${root ?? STORE_ROOT}`);
  // Not `(error as Error).message`. If a non-Error ever reached this catch, the
  // cast would throw inside the handler and the process would die unhandled —
  // with exit 1, which is the collapse three lines of this block exist to
  // prevent. The guarantee has to survive its own error path.
  console.error(`  ${error instanceof Error ? error.message : String(error)}`);
  console.error("Nothing is claimed about the records. This is not a finding.");
  process.exit(2);
}
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

// Markers against records, which nothing compared until an outside audit of the
// specification sent someone to look. Three outcomes rather than two: a marker
// with no record and nothing naming the id is a LOSS, since a crash between the
// claim and the write leaves nothing to name it; a marker named by a survivor is
// the ordinary post-delete state the marker is designed to produce, and is not a
// defect. A first version of this collapsed both and failed the suite on a
// spec-sanctioned deletion — found in review.
const agreement = await markerAgreement(store, root ?? STORE_ROOT);
if (agreement.unmarked.length > 0) {
  console.log(
    `\n  ${agreement.unmarked.length} record(s) with no marker — a store written before MUST 1; the next deposit backfills them`,
  );
}
for (const id of agreement.deleted) {
  console.log(`\n  marker with no record at ${id}, named by a survivor — a delete, not a defect`);
}
for (const id of agreement.lost) {
  const note = ORPHANED_MARKERS[id];
  console.log(`\n  marker with no record at ${id}, and nothing names it`);
  console.log(note ? `    known    ${note}` : "    UNACCOUNTED FOR");
}

// Both failures are collected and reported before exiting once. They were two
// blocks with two exits, so accounting for an orphan revealed a divergence the
// operator had never been shown — found in review.
const unexplainedLost = agreement.lost.filter((id) => !ORPHANED_MARKERS[id]);
const unaccounted = findings.filter((f) => f.state === "DIVERGES" && !ACCOUNTED_FOR[f.id]);
if (unexplainedLost.length > 0 || unaccounted.length > 0) {
  if (unexplainedLost.length > 0) {
    console.log(
      `\n${unexplainedLost.length} unaccounted lost marker(s): ${unexplainedLost.join(", ")}`,
    );
    console.log("An id was bound, nothing occupies it, and nothing names it. The marker cannot be");
    console.log("removed — that would free the id and reopen relay-0183's class. Record why.");
  }
  if (unaccounted.length > 0) {
    console.log(
      `\n${unaccounted.length} unaccounted divergence(s): ${unaccounted.map((f) => f.id).join(", ")}`,
    );
    console.log("Records are immutable: the repair is an erratum record, never an edit.");
    console.log("Once written, add the id to ACCOUNTED_FOR with the erratum it points at.");
  }
  process.exit(1);
}

// Say this out loud rather than exiting silently. Green here means "no
// divergence beyond those we cannot repair", which is a weaker statement
// than "the store's continuity claims all hold", and the difference is the sort
// of thing a summary line quietly loses.
console.log(
  `\nno unaccounted divergence. ${Object.keys(ACCOUNTED_FOR).length} known and unrepairable, listed above.`,
);
