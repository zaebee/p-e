import { checkI1 } from "./checks/i1.js";
import { checkI2 } from "./checks/i2.js";
import { checkI3 } from "./checks/i3.js";
import { checkI4 } from "./checks/i4.js";
import { checkI5 } from "./checks/i5.js";
import { checkI6 } from "./checks/i6.js";
import { checkI7 } from "./checks/i7.js";
import { checkI8 } from "./checks/i8.js";
import { checkI9 } from "./checks/i9.js";
import { RecordingCorpus, coverageOf } from "./coverage.js";
import type { Manifest } from "./manifest.js";
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

/** Every check, named, so nothing can be run without appearing in coverage. */
const CHECKS: ReadonlyArray<
  readonly [string, (files: Map<string, Uint8Array>, extractedAt: string) => Finding[]]
> = [
  ["I-1", (f) => checkI1(f)],
  ["I-2", (f, at) => checkI2(f, at)],
  ["I-3", (f) => checkI3(f)],
  ["I-4", (f) => checkI4(f)],
  ["I-5", (f) => checkI5(f)],
  ["I-6", (f) => checkI6(f)],
  ["I-7", (f) => checkI7(f)],
  ["I-8", (f) => checkI8(f)],
  ["I-9", (f) => checkI9(f)],
];

export function runAll(files: Map<string, Uint8Array>, extractedAt: string): Finding[] {
  return CHECKS.flatMap(([, run]) => run(files, extractedAt));
}

/**
 * The same run, watching which corpus paths each check actually opens.
 *
 * Each check gets its own recording view of the corpus, so attribution is
 * measured rather than declared. A hand-kept table of which check reads which
 * artifact would drift from the code without anything going red.
 */
export function runAllWithCoverage(
  files: Map<string, Uint8Array>,
  extractedAt: string,
): { findings: Finding[]; byInvariant: Map<string, Set<string>> } {
  const findings: Finding[] = [];
  const byInvariant = new Map<string, Set<string>>();
  for (const [id, run] of CHECKS) {
    const view = new RecordingCorpus(files);
    findings.push(...run(view, extractedAt));
    byInvariant.set(id, view.reads);
  }
  return { findings, byInvariant };
}

export interface ReportMeta {
  readonly extracted_at: string;
  readonly artifacts: number;
  readonly runId: string;
  /** Present when the run was made through `runAllWithCoverage`. */
  readonly coverage?: {
    readonly manifest: Manifest;
    readonly byInvariant: ReadonlyMap<string, ReadonlySet<string>>;
  };
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
  "08": `The first run in which an invariant is falsified.

**I-3 / hivemark: UNDECIDABLE → VIOLATES.** Not a new observation — every run from
01 stated the condition in its own reason: five derivation inputs pinned by digest,
zero of them in the published corpus. The falsifier reads *a producer publishes a
conclusion whose input is not in the corpus*. The reader established that and
declined to fire it, seven times.

I-3's own \`watch:\` line had said so before any reader existed: *"if so H fails its
own I-3 at the artifact level, and that is a finding, not a bug in the reader."*

What changed is not the corpus and not the clause. Two independent blind readers,
given the frozen catalogue and no access to our results, fired the falsifier on a
byte-identical clause — see docs/experiments/blind-reader/. bee.zae settled it at
relay-0174, on the ground that the admission cost is a consequence of accepting a
normative verdict rather than a reason to decline it.

**The consequence, accepted rather than avoided.** \`admits()\` short-circuits on any
VIOLATES before counting a single CONFORMS, so I-3 is sunk outright and permanently:
debian-rb's CONFORMS on it survives as a finding and counts toward nothing, and no
later evidence can undo it. \`admits()\` was deliberately not changed — altering
admission semantics after inconvenient evidence would be the wrong repair.

The admitted count does not move. It was zero and stays zero. Its shape does: for
seven runs zero meant *nothing contradicted*, and it no longer does.

Scope: only the hivemark branch of I-3 was repaired. The apex branch, every other
check, the corpus and the envelope are untouched, and no historical report was
edited. Runs 01-07 stand as written and still say UNDECIDABLE.

Not to be confused with docs/experiments/blind-reader/run-08/, which is the second
blind reading and is not a conformance run.`,
  "07": `The governance baseline, ruled at relay-0153: **the \`falsifier:\` clause
is the normative test and the title is a description**, for all nine invariants.

Five of the nine — I-3, I-4, I-7, I-8, I-9 — were two rules written as one, and
stayed invisible across six runs because both producers in this corpus satisfy
both readings of every one. It took a producer resembling neither to separate a
single pair.

**No verdict should change, and that is the point of running this.** The reader
has always executed the falsifier; the ruling states what it was already doing.
If this run differs from run 06 on any finding, something here was being decided
by a title without anyone noticing, and the diff is the evidence.

No corpus change, no apparatus change, no producer added. Debian reproducible
builds remains outside this corpus and outside these reports.`,
  "06": `Three falsifier corrections, decided at relay-0056. **Two verdicts
change.**

The ruling that made them possible: **"frozen" covers the normative catalogue —
the invariant statements, §4, M1-M4, U-1/U-2 — and not the falsification
apparatus.** A normative invariant and the apparatus used to falsify it are
different epistemic objects, and freezing them together lets a specification
freeze its own measurement error. It had done so twice.

**I-3/apex: CONFORMS → UNDECIDABLE.** Tested that two keys existed —
\`"finalUrl" in e && "offSite" in e\` — while \`offSite === true\` occurs zero
times and \`finalUrl\` is null in all eight entries. Here the code had gone
*beyond* its clause, which is conditional on the conclusion occurring, so this
one needed no amendment: correcting it brought the code back into line.

**I-9/apex: CONFORMS → UNDECIDABLE.** Confirmed that failures are counted over
\`gaps = [0,0,0,0,0,0,0,0]\`. Eight zeroes show that \`uncounted\` was empty, not
that anything is counted — an absence of detected failures read as evidence of
correct accounting. The same report called this field unexercised twice, in I-1
and I-5, which apply the standard this check now applies.

**I-2/apex: CONFORMS → UNDECIDABLE.** Confirmed occurrence semantics from two
distinct instants: all eight \`since\` identical, \`checkedAt == updatedAt ==
lastOkAt\`. Ordering is not occurrence. This is the step the hivemark branch
thirty lines above was demoted for at relay-0012, taken on thinner data.

I-9 and I-2 were **prescribed by their \`reader:\` clauses**, which are amended in
§3 and recorded in §11.

**Not done, deliberately.** Eight further defects a review demonstrated by
mutating the corpus are latent — key-presence tests in I-8/H and I-9/H, vacuity
in I-3/H and I-4/H, NaN and unimplemented clauses in I-5. relay-0056 ruled they
are candidates, not a reason for a large unrelated diff, until independently
reproduced. They are recorded in OBS-028 and unfixed.

**What this run is evidence of.** Zero of the ten came from 75 tests. The tests
enforced the interpretation the falsifier had encoded upstream of them, which is
not a failure of the suite: a test cannot catch an error it inherited.`,
  "05": `The reader audited against itself, at relay-0025. **No verdict
changed.**

**Every finding now declares its projections** — meaning the reader supplied that
no producer publishes. Four findings carry one. The two that matter:

- **I-1/hivemark.** That verdict code \`0\` means *unresolved* is read off
  hivemark's source, not its artifacts. The producer publishes a uint8. The
  finding was already UNDECIDABLE and is now honest about why it could not have
  been anything else.
- **I-4/hivemark.** The grouping key — identityId, repo, pr, commitSha as one
  review, newest time surviving — is this reader's rule, and a different rule
  gives a different count. This finding stays CONFORMS because the conforming
  half, that no published envelope stores the answer, is native and does not
  depend on it.

**Three reasons were rewritten.** \`I-4/apex\`, \`I-8/hivemark\` and
\`I-9/hivemark\` asserted an absence without a denominator — *no envelope carries
it* over a number the report never gave — and two of them cited producer source
symbols this reader does not read. They now carry counts and say plainly which
half is a claim about source.

Run 04's numbers are unchanged. What changed is what the report admits about how
it got them.`,
  "04": `I-6/hivemark reopened at relay-0022 and demoted. **CONFORMS →
UNDECIDABLE.**

The concern raised was that the check compared two adapter-derived roles.
Checked against the corpus, it did not: \`signer\` and \`message.recipient\` are
both fields hivemark publishes under those names, they never coincide across all
932 envelopes, and no projection is involved. That half stands.

The step after it does not. I-6 asks whether the attester differs from the
**subject**, and identifying \`recipient\` as the subject is §5's mapping rather
than the producer's claim. No producer publishes a field named \`subject\`. Two
natively distinct participant fields never coinciding is a real fact about
hivemark; it is not the same fact as an attester differing from a subject, and
the check no longer reports it as though it were.

The reader now reads the raw JSON for this check rather than the envelope
stream, so nothing it renames can influence the result.

**Coverage is now a section of this report, not an assumption.** Required at
relay-0023: omission from the matrix is not a disposition. Which check opens
which artifact is measured — every check runs against a recording view of the
corpus — and every class carries either the invariants that examined it or a
stated reason for exclusion.

It found more than the gap that prompted it. \`anchors.json\` is read by I-5
after all, though no adapter projects it into an envelope. **\`births.json\` and
\`corpus.json\` are opened by nothing at all**, and had been absent from four
reports without that being visible anywhere.`,
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
        .map((f) => {
          const head = `- **${f.producer} — ${f.verdict}** *(${f.evidence})*. ${f.reason}`;
          if (f.projections.length === 0)
            return `${head}\n  - *projections: none. This finding rests on published bytes alone.*`;
          return `${head}\n${f.projections.map((x) => `  - *projection:* ${x}`).join("\n")}`;
        })
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

  const coverageSection = (() => {
    if (!meta.coverage) return "_Not measured: this run was made without coverage recording._";
    const rows = coverageOf(meta.coverage.manifest, new Set(), meta.coverage.byInvariant).map(
      (c) => {
        // Says how much of a class was opened. EXAMINED used to mean some
        // check touched one file of it, so reading one log entry marked all
        // four examined.
        const scope = c.filesRead === c.files ? "" : ` (${c.filesRead} of ${c.files} opened)`;
        const disposition =
          c.disposition === "EXAMINED"
            ? `examined by ${c.invariants.join(", ")}${scope}`
            : "**EXCLUDED_WITH_REASON**";
        return `| \`${c.cls}\` | ${c.files} | ${disposition} |`;
      },
    );
    const reasons = coverageOf(meta.coverage.manifest, new Set(), meta.coverage.byInvariant)
      .filter((c) => c.disposition === "EXCLUDED_WITH_REASON")
      .map((c) => `- **\`${c.cls}\`** — ${c.reason || "**no reason stated. this is a defect.**"}`)
      .join("\n");
    return `| class | files | disposition |\n|---|:-:|---|\n${rows.join("\n")}\n\n${reasons}`;
  })();

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

## Reader self-audit

The four criteria of relay-0025, each enforced by a test in
\`tests/self-audit.test.ts\` rather than asserted here.

| | criterion | how it is enforced |
|---|---|---|
| 1 | every corpus class examined or excluded with a reason | the coverage matrix below, measured; an excluded class with no reason fails the suite |
| 2 | every verdict traceable to artifact evidence | every reason must cite a count or a named published field; three findings failed this and were rewritten to carry denominators |
| 3 | every semantic projection explicitly marked | \`projections\` is a required field on every finding, listed under each below, and a run declaring none anywhere fails as decorative |
| 4 | no adapter-derived meaning counted as producer evidence | a CONFORMS may name a projection only while stating that its conforming half is native; enforced on every conforming finding |

**Two dispositions that are not variants of each other.** \`NOT_APPLICABLE\` means
the reader looked and the producer has no such construct — a statement about the
producer. \`EXCLUDED_WITH_REASON\` means the reader did not look, and says why — a
statement about the reader. Collapsing them would let unexamined ground read as
cleared ground, which is the defect OBS-010 records.

## Corpus coverage

Every artifact class in the manifest, with an explicit disposition. Required at
relay-0023: **omission from this matrix is not a valid disposition.** Which check
opened which artifact is measured, not declared — each check runs against a
recording view of the corpus.

${coverageSection}

## Findings

${detail}
`;
}
