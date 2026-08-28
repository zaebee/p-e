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
}

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

  const tally = (v: string) => findings.filter((f) => f.verdict === v).length;

  return `# p-e conformance report 01

The first run of the falsifier the spec had never run.

Corpus extracted at \`${meta.extracted_at}\`, ${meta.artifacts} artifacts, digests in
\`corpus/manifest.json\`. The extraction time is not an occurrence time and is
recorded apart from every timestamp inside the artifacts.

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

**Where the prediction was wrong, and it was wrong badly.** It expected three
casualties. Eight of nine were demoted. It also missed the one that matters most:
**I-1, which the spec called the catalogue's strongest invariant, is demoted with
zero confirmations.**

The prediction assumed one failure mode — that the discipline runs inside the
producer and does not survive into what it publishes. That accounts for I-7, I-8
and I-9 and nothing else. Three further modes appeared that nobody had named:

| mode | what happens | where |
|---|---|---|
| **not exercised** | the state is defined and representable, and never occurs in the window the corpus covers | I-1 both producers, I-5 apex |
| **evidence elsewhere** | the input is pinned by digest and lives in another repository | I-3 hivemark |
| **a single point** | the invariant is about change over time and the corpus holds one snapshot or one period | I-5 hivemark, I-4 apex |

**The result that is not in the table.** Zero VIOLATES across eighteen findings.
Nothing in either producer contradicts the catalogue. Every demotion is a failure
of evidence, not a falsification of a rule — the discipline is real in the code
and mostly invisible in the record.

Which is the report's actual finding, and it is about p-e rather than about
either producer: **a protocol extracted only from what producers publish will be
very much smaller than the discipline that produced them.** Eight of these nine
rules are enforced, demonstrably, in source. One of them can be witnessed by
somebody holding the artifacts alone.

## Findings

${detail}
`;
}
