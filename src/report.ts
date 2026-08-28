import { checkI1 } from "./checks/i1.js";
import { checkI2 } from "./checks/i2.js";
import { checkI3 } from "./checks/i3.js";
import { checkI4 } from "./checks/i4.js";
import { checkI5 } from "./checks/i5.js";
import { checkI6 } from "./checks/i6.js";
import { checkI7 } from "./checks/i7.js";
import { checkI8 } from "./checks/i8.js";
import { checkI9 } from "./checks/i9.js";
import { type Finding, admits } from "./verdict.js";

const TITLES: Record<string, string> = {
  "I-1": "absence is a named state",
  "I-2": "the recorded time is the occurrence",
  "I-3": "the observation is kept beside the conclusion",
  "I-4": "derived state is never stored",
  "I-5": "named periods, gaps never backfilled",
  "I-6": "the attester is not the subject",
  "I-7": "field ownership is enforced",
  "I-8": "a record states the limit of its own testimony",
  "I-9": "data read back is validated, failures counted",
};

export function runAll(files: Map<string, Uint8Array>, extractedAt: string): Finding[] {
  return [
    ...checkI1(files),
    ...checkI2(files, extractedAt),
    ...checkI3(files),
    ...checkI4(files),
    ...checkI5(files),
    ...checkI6(files),
    ...checkI7(files),
    ...checkI8(files),
    ...checkI9(files),
  ];
}

export interface ReportMeta {
  readonly extracted_at: string;
  readonly artifacts: number;
  readonly runId: string;
}

/**
 * What changed in the methodology, per run.
 *
 * Carried in the report rather than in a commit message because a run is
 * evidence, and evidence that cannot say how it differs from the run before it
 * invites the reader to compare two numbers produced by two different rules.
 */
const RUN_NOTES: Record<string, string> = {
  "01": "First run. No prior run to differ from.",
  "03": `A wording correction, at relay-0018. **No verdict changed** — run the
diff against run 02 and it says so.

**Run 02 overstated its own result.** It closed with "None of them can be
witnessed by a stranger holding only the published artifacts of both producers",
which reads as *none can be witnessed at all*. Six findings CONFORM, each from
one producer. The true statement is narrower: no invariant is witnessable from
the artifacts of **both** producers. That is what admission requires and what
this corpus does not supply.

**The corpus count is now explicit.** Run 02 said "11 artifacts" while the
directory holds twelve files. Eleven are pinned; the twelfth is the manifest,
which is not among its own entries.

Run 02 is preserved unchanged.`,
  "02": `Two verdicts demoted, at relay-0012, after run 01 was read.

**I-2 / hivemark: CONFORMS (INFERRED) → UNDECIDABLE.** Run 01 — quoting it,
since it is preserved and immutable — concluded that an 11.6-hour spread of
timestamps was consistent with occurrence rather than publication, and recorded
CONFORMS. It is consistent with it, and no arrangement
of timestamps read alone establishes which of the two a field means. The step
from *consistent with* to *confirmed* is the one this project exists to forbid,
and run 01 took it — while carrying half of its only admission on it.

**I-7 / apex: CONFORMS → UNDECIDABLE.** Run 01 separated machine values from
prose by asking whether a string contained whitespace. That heuristic is the
reader's own invention and is wrong in both directions: \`"HelloWorld"\` is prose
and passes, \`"https://foo bar"\` is a URL and fails. Testing it tested a
definition of prose no producer publishes.

Run 01 is preserved unchanged. It was methodologically wrong in two places and
is not therefore rubbish: it is where those two errors are visible, and it is
the provenance of this run.

After these demotions the report contains **no INFERRED findings at all**. Every
verdict below rests on something read directly out of an artifact.`,
};

export function renderReport(findings: readonly Finding[], meta: ReportMeta): string {
  const invariants = [...new Set(findings.map((f) => f.invariant))].sort();

  const rows = invariants.map((id) => {
    const own = findings.filter((f) => f.invariant === id);
    const cells = own.map((f) => `${f.producer} ${f.verdict}`).join(" · ");
    return `| ${id} | ${TITLES[id] ?? ""} | ${cells} | **${admits(own)}** |`;
  });

  const admitted = invariants.filter(
    (id) => admits(findings.filter((f) => f.invariant === id)) === "ADMITTED",
  );

  const detail = invariants
    .map((id) => {
      const own = findings.filter((f) => f.invariant === id);
      const lines = own
        .map((f) => `- **${f.producer} — ${f.verdict}** *(${f.evidence})*. ${f.reason}`)
        .join("\n");
      return `### ${id} · ${TITLES[id] ?? ""} — ${admits(own)}\n\n${lines}`;
    })
    .join("\n\n");

  // Witnessable from exactly one producer. Reported beside the admitted count
  // because run 02 said "none can be witnessed by a stranger holding the
  // artifacts of both producers", which reads as "none can be witnessed at
  // all" — and six can, from one producer each. Corrected in run 03.
  const singleWitness = invariants.filter((id) => {
    const confirming = new Set(
      findings.filter((f) => f.invariant === id && f.verdict === "CONFORMS").map((f) => f.producer),
    );
    return confirming.size === 1;
  }).length;

  // The right-hand column is computed from the findings, never restated.
  //
  // An earlier version of this table wrote "apex only" and "hivemark only" by
  // hand. That is the same defect as a report overwriting a previous run, in a
  // quieter form: a verdict changes and the prose keeps the old answer. Review
  // check 4 caught it.
  //
  // The left-hand column is a constant on purpose. It is the spec's claim from
  // reading source code, which this reader does not read and cannot check.
  const witnessTable = invariants
    .map((id) => {
      const confirming = [
        ...new Set(
          findings
            .filter((f) => f.invariant === id && f.verdict === "CONFORMS")
            .map((f) => f.producer),
        ),
      ].sort();
      const witness = confirming.length === 0 ? "no" : `${confirming.join(", ")} only`;
      return `| ${id} ${TITLES[id] ?? ""} | yes (per spec §3) | ${witness} |`;
    })
    .join("\n");

  const tally = (v: string) => findings.filter((f) => f.verdict === v).length;

  return `# p-e conformance report ${meta.runId}

${meta.runId === "01" ? "The first run of the falsifier the spec had never run." : "A run of the falsifier over the frozen corpus."}

## What changed since the previous run

${RUN_NOTES[meta.runId] ?? "Not recorded."}

Corpus extracted at \`${meta.extracted_at}\`. **${meta.artifacts} pinned
artifacts**, digests in \`corpus/manifest.json\`. The directory holds
${meta.artifacts + 1} files: the ${meta.artifacts} above and the manifest itself,
which is not among its own entries — a manifest that pinned itself would be a
file whose digest is a hash of a file containing that digest.

The extraction time is not an occurrence time and is recorded apart from every
timestamp inside the artifacts.

**ADMITTED: ${admitted.length} of 9${admitted.length > 0 ? ` — ${admitted.join(", ")}` : ""}.**

An invariant is ADMITTED only when two distinct producers CONFORM. NOT_APPLICABLE
and UNDECIDABLE are not support, and one VIOLATES sinks an invariant outright.

Verdict tally across ${findings.length} findings: ${tally("CONFORMS")} CONFORMS ·
${tally("VIOLATES")} VIOLATES · ${tally("UNDECIDABLE")} UNDECIDABLE ·
${tally("NOT_APPLICABLE")} NOT_APPLICABLE.

| invariant | | verdicts | result |
|---|---|---|---|
${rows.join("\n")}

## Against the prediction

The spec registered a prediction in §9 before this reader existed: that I-6, I-8
and I-9 would come back UNDECIDABLE, that I-6 would be demoted outright, and that
nine conformances would be evidence of a permissive reader rather than a correct
catalogue.

**Where the prediction held.** All three named invariants came back exactly as
predicted, and I-6 was demoted through the door the spec named — apex has no
attester to compare, so the finding is NOT_APPLICABLE and does not count as
support.

**Where it was wrong.** It expected three casualties and this run demotes
${9 - admitted.length}. It also missed the one that matters most: **I-1, which
the spec called the catalogue's strongest invariant, is demoted with zero
confirmations.**

The prediction assumed one failure mode — that the discipline runs inside the
producer and does not survive into what it publishes. That accounts for I-7, I-8
and I-9 and nothing else. Further modes appeared that nobody had named:

| mode | what happens | where |
|---|---|---|
| **not exercised** | the state is defined and representable, and never occurs in the window the corpus covers | I-1 both producers, I-5 apex |
| **evidence elsewhere** | the input is pinned by digest and lives in another repository | I-3 hivemark |
| **a single point** | the invariant is about change over time and the corpus holds one snapshot or one period | I-5 hivemark, I-4 apex |
| **not expressible in the data** | no arrangement of the published values could settle the question, however many there were | I-2 hivemark, I-7 apex |

That last mode was added in run 02 and is the sharpest of the four. The other
three would be answered by a larger or longer corpus. This one would not: a
timestamp cannot say whether it means occurrence or publication, and a string
cannot say whether a human or a machine wrote it. More data does not help.

**The result that is not in the table.** Zero VIOLATES across ${findings.length}
findings. Nothing in either producer contradicts the catalogue. Every demotion is
a failure of evidence, not a falsification of a rule — the discipline is real in
the code and mostly invisible in the record.

## First-run observation: source-enforced is not artifact-witnessable

Recorded as a finding of this experiment and **not** proposed as a core
invariant.

| | enforced in source | witnessable from artifacts |
|---|:-:|:-:|
${witnessTable}

${invariants.length} rules are enforced, demonstrably, in source — a claim taken
from the spec, not from this run. Of those, **${admitted.length} can be witnessed
from the artifacts of both producers**, which is what admission requires, and
**${singleWitness} from the artifacts of one producer alone**. The second number
is not a weaker version of the first: a rule one system can be seen keeping is a
rule about that system, not a rule two independent systems share.

Which is this run's actual finding, and it is about p-e rather than about either
producer: **a protocol extracted only from what producers publish will be very
much smaller than the discipline that produced them.** Where that leaves the
core is a decision, not a result, and this report does not make it.

## Findings

${detail}
`;
}
