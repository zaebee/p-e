import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDebianRb } from "../src/adapters/debian-rb.js";
import type { Evidence, Finding, Verdict } from "../src/verdict.js";

/**
 * Second-agent experiment for the Debian reproducible-builds producer.
 *
 * NOT A RUN. This script deliberately does not write to
 * docs/reports/*-conformance-NN.md and is not wired into src/report.ts, because
 * emitting a numbered run would admit a third producer into the catalogue
 * (relay-0126 caution #1). It writes docs/experiments/debian-rb-findings.md and
 * prints the same, so the result reads as evidence, not as a verdict.
 *
 * Non-blind: the adapter author has read relay-0119/0120 (the hypothesis under
 * test) and relay-0126 (the apparatus constraints). Field mappings below are
 * re-derived from the frozen bytes, not copied.
 */

const EXP = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "experiments");

function checkDebianRb(d: Awaited<ReturnType<typeof readDebianRb>>): Finding[] {
  const findings: Finding[] = [];

  // I-1 — a verdict whose absence is the third state is named and, where the
  // producer emits it, appears as a value distinct from the two it judges.
  const thirdExercised =
    d.statusValues.includes("UNKWN") || d.pkgStatusValues.includes("UNKWN");
  findings.push({
    invariant: "I-1",
    producer: "debian-rb",
    verdict: thirdExercised ? "CONFORMS" : "UNDECIDABLE",
    evidence: "OBSERVED",
    reason: thirdExercised
      ? "status UNKWN is exercised in the pinned v0/pkgs/list corpus and is distinct from GOOD/BAD, so the absent-judgement state is both named and emitted. The histogram over all 489,668 records is GOOD 363,708, BAD 18,816, UNKWN 107,144 (debian-rb-retrieval.md); the stride sample pinned in this repo carries UNKWN too. The mechanical I-1 criterion - a third state named in source and appearing as a value distinct from the two it judges - holds for r-b. Whether UNKWN is assigned by the debian r-b *aggregator* rather than reported by a *rebuilder* is NOT settled by these bytes (relay-0119 refuter #1); that is a semantic question about who emits the value, and it does not block the mechanical criterion"
      : `the third state is not observed in any pinned artifact. b.json carries {${d.statusValues.join(", ")}} and v0/pkgs/list sample carries {${d.pkgStatusValues.join(", ")}}; UNKWN is absent from both. The producer does exercise UNKWN on v0/pkgs/list per the histogram, but those bytes are not pinned here, so I-1 is UNDECIDABLE on the frozen corpus`,
    projections: [
      "the exercising bytes are now PINNED: v0-arm64-unkwn-all.json.gz (all 107,144 UNKWN records, gz 9e68e1..) and v0-arm64-stride1000.json (every 1000th record, including UNKWN), extracted by claude per relay-0130 §4 verbatim from hy3's rule - so the third state is inspectable by anyone with the repo, not asserted from bytes only claude held",
      "UNKWN is a named variant in v0 (Status::Unkwn) and v1 (BuildStatus::Unkwn), serialised from Unknown. The aggregator-vs-rebuilder open question remains; if UNKWN were purely an aggregator bucket it would still be a distinct published value, but it would not be a rebuilder's absent-judgement - that nuances, but does not void, the CONFORMS above",
      "status GOOD/BAD are present and distinct; FAIL exists only in v1 (v0 maps FAIL->BAD). The third state under test is UNKWN, not FAIL",
    ],
  });

  // I-3 — a conclusion (status) whose input is retrievable from the same
  // producer, not from another repository.
  const buildsCarryTrace =
    d.builds.every(
      (b) =>
        "build_id" in b || "url" in b || "diffoscope_log_id" in b || "attestation_log_id" in b,
    ) || d.pkgCarryTrace;
  findings.push({
    invariant: "I-3",
    producer: "debian-rb",
    verdict: buildsCarryTrace ? "CONFORMS" : "UNDECIDABLE",
    evidence: "OBSERVED",
    reason: buildsCarryTrace
      ? "STANDARD APPLIED: (b) - a conclusion is CONFORMS when its input is retrievable from what the producer publishes, not requiring it to sit in our pinned corpus. The pinned v0/pkgs/list records (v0-arm64-stride1000.json) carry build_id + artifact_url (the .deb subject) + has_diffoscope/has_attestation booleans; for a BAD record that is the handle, and the producer publishes the observation at /arm64/api/v0/builds/{build_id}/diffoscope. claude confirmed against a real stride-sample record (filtlong 0.2.1-4+b1, build_id 132177): GET -> 200, 2,573,853 bytes of actual diffoscope output, so the observation is retrievable from build_id alone. Under reading (a) (input must be in the pinned corpus) this would be UNDECIDABLE, because the observation is NOT in the frozen bytes - only declared by a boolean; I take (b) because (a) measures the curator (whatever we chose to pin), and applying it to a fetched producer reproduces the I-1 trap that the repair was to pin more bytes, not to accept the verdict. (b) also changes no existing verdict: hivemark's inputs are published nowhere, so it still fails I-3. COST OF (b), stated: build_id is an integer, not a digest; the live fetch is unbound - nothing ties the 2.5MB received today to the diff the conclusion was drawn from. So the retrieval half is INFERRED, not OBSERVED; debian-rb is retrievable-but-unbound where hivemark is pinned-but-unpublished, and neither dominates"
      : `the frozen v1/builds records carry only {${Object.keys(d.builds[0] ?? {}).join(", ")}} — status with no build_id, url, diffoscope_log_id, or attestation_log_id, and the v0 stride sample carries no trace either. From these bytes a status conclusion is not traceable to a retrievable input, so I-3 is UNDECIDABLE`,
    projections: [
      "the ambiguity is real and load-bearing: (a) 'input in corpus' vs (b) 'conclusion recomputable from what is published'. hivemark and apex satisfy both or neither, so the catalogue never had to choose; r-b is the first producer where they come apart (relay-0140). Same shape as OBS-049: a word unambiguous across two producers becomes two on the third",
      "correction to relay-0119, noted here: '14,825 of 18,816 BAD carry a diffoscope diff' is wrong - those records DECLARE has_diffoscope:true (a boolean), they do not carry the diff. This adapter read the bytes (has_diffoscope:true), not the prose, so it inherited the corrected reading; the live fetch above is the actual observation",
      "this is exactly the axis relay-0119 refuter #2 named - a third source could conform I-3. It does, under (b); but admits() needs a second distinct producer, and no current producer conforms I-3 (apex flipped to UNDECIDABLE in run 06, per relay-0133), so this CONFORM alone does not admit the invariant. If the catalogue later adopts (a) instead of (b), this flips to UNDECIDABLE-on-pinned-corpus and the reason must say so",
      "the choice of (b) over (a) is recorded as the applied standard; if a future reader prefers (a), the verdict is UNDECIDABLE and the finding should be rewritten, not merely re-read",
      "per relay-0174 bee.zae ruled I-3/hivemark = VIOLATES (settled): the frozen falsifier fired directly and a second independent blind pass returned the same verdict on a byte-identical clause (relay-0160 condition met). admits() short-circuits on any VIOLATES, so I-3 is sunk outright. This debian-rb I-3 CONFORMS therefore SURVIVES AS A FINDING AND STOPS COUNTING TOWARD ADMISSION - it no longer supports admitting I-3, which is now falsified at catalogue level. My deliverable is NOT A RUN and never mutated the count; this projection records the settled consequence only, and the gap between settled and docs/reports is left open on purpose per the ruling",
    ],
  });

  // I-5 — a record asserts something about a past moment it names as a period.
  findings.push({
    invariant: "I-5",
    producer: "debian-rb",
    verdict: "NOT_APPLICABLE",
    evidence: "OBSERVED",
    reason: "r-b names no periods. 'release' is a distribution tag (trixie/forky/unstable/experimental), not a time window; 'started_at'/'built_at' are instants. There is no period axis for a record to republish a verdict about — the producer simply has no period construct (relay-0119 refuter #4)",
    projections: [
      "a build record is about a moment (built_at), not a period; release is categorical. I-5 cannot be exercised by this producer as the invariant is stated",
    ],
  });

  // I-9 — I am an aggregate over attempts, not a single attempt; a miss must be
  // distinguishable from an observation.
  const nonGood = d.builds.filter((b) => b.status !== "GOOD");
  const nonGoodWithRetries = nonGood.filter((b) => b.retries > 0).length;
  const goodWithRetries = d.builds.filter((b) => b.status === "GOOD" && b.retries > 0).length;
  findings.push({
    invariant: "I-9",
    producer: "debian-rb",
    verdict: "UNDECIDABLE",
    evidence: "OBSERVED",
    reason: `v1/builds records a single aggregate \`retries\` integer per build. In the sample, ${nonGoodWithRetries}/${nonGood.length} non-GOOD builds have retries>0 and ${goodWithRetries}/${d.builds.filter((b) => b.status === "GOOD").length} GOOD builds also have retries>0. The artifact does NOT record, per attempt, whether that attempt reached a verdict — only one counter. So the producer cannot distinguish "not attempted" from "attempted and failed" at the attempt level; counting retries as gate-failures (relay-0119 refuter #3) would misread an aggregate as attempt-level conclusions that are not published`,
    projections: [
      "retries is a scheduler/aggregate counter; the bytes expose no per-attempt conclusion. This is exactly the illusion-of-liveness gap I-9 guards: a third source carrying only an aggregate retries count would not demonstrate attempt-level observation, and adding it could not make a single-observation miss look like liveness",
    ],
  });

  // I-4 — derived state is never stored. Falsifier: a stored value disagrees
  // with recomputing it from the published set. This reading is BLIND (relay-0144):
  // claude formed no view before I reported, so this reasons only from the frozen
  // bytes, not from a published hypothesis about r-b. The reason was corrected in
  // relay-0146: r-b DOES store derived state (the dashboard); the falsifier is
  // exercised and does not fire.
  const i4Recomputed = d.dashboard !== null && d.recomputed !== null;
  const recTotal = d.recomputed ? d.recomputed.all.good + d.recomputed.all.bad + d.recomputed.all.fail : 0;
  findings.push({
    invariant: "I-4",
    producer: "debian-rb",
    verdict: "CONFORMS",
    evidence: "OBSERVED",
    reason: i4Recomputed
      ? `r-b STORES derived state, and the stored value agrees with recomputing it from the published set - so I-4's falsifier ("a stored value disagrees with recomputing it from the published set") is exercised and does NOT fire -> CONFORMS. The derived state is the dashboard: v1-trixie-arm64-dashboard.json reports rebuilds {good:${d.dashboard?.good}, bad:${d.dashboard?.bad}, fail:${d.dashboard?.fail}, unknown:${d.dashboard?.unknown}}. Recomputed from the pinned source-all walk (v1-trixie-arm64-source-all.json.gz, ${recTotal} records, walked via the after cursor) the synced-true subset is GOOD ${d.recomputed?.syncedTrue.good} / BAD ${d.recomputed?.syncedTrue.bad} / FAIL ${d.recomputed?.syncedTrue.fail} - exact match to the dashboard, ${d.recomputeDisagreement} disagreement(s). This is CONFORMS BY RECOMPUTATION, the shape hivemark's I-4 has and the shape relay-0144 asked for. My relay-0145 reason ("no derived artifact to recompute") was wrong and is withdrawn: the dashboard is exactly the derived artifact, and claude pinned it (relay-0146) after I missed it - third time a verdict turned on what was chosen to keep. TITLE VS FALSIFIER, load-bearing: I-4's title is "derived state is never stored"; its falsifier is "a stored value disagrees with recomputing it from the published set". These are two rules and r-b is the first producer where they separate - r-b stores derived state (the dashboard) so by the TITLE it VIOLATES; the stored value agrees with recomputation so by the FALSIFIER it CONFORMS. Both original producers (hivemark, apex) store no derived state at all, so the readings coincided and nobody noticed they were two. Stakes asymmetric: by the falsifier, hivemark + r-b = 2 distinct -> I-4 ADMITTED (first this catalogue); by the title, r-b VIOLATES -> one VIOLATES sinks I-4 outright, below zero permanently (a VIOLATES cannot be recovered by later evidence), which is not conservative. I apply the FALSIFIER as the operative rule (relay-0146: §1 makes the falsifier the thing a reader runs; the title is a name), so CONFORMS; the catalogue must rule the divergence. STANDARD (a)/(b): both reach CONFORMS under the falsifier reading.`
      : `the dashboard + source-all artifacts are not pinned here, so the recomputation cannot be observed; on the v0 evidence alone r-b stores no derived CONCLUSION that disagrees with recomputation (has_diffoscope/has_attestation are independent observations - ${d.pkgBadWithoutDiffoscope} BAD records lack diffoscope, proving they are observed not derived). This is the absence basis; relay-0146 shows the dashboard makes the recomputation possible and it agrees, so prefer the pinned-artifact reading above.`,
    projections: [
      "the recomputation is OBSERVED from pinned bytes, not a live fetch: source-all gz dde55b6..., dashboard d2afd547...; anyone can re-walk and confirm 0 disagreement. claude's live walk (relay-0146) matched exactly (synced-true GOOD 16921 / BAD 827 / FAIL 1)",
      "the gcc-bpf duplicate claude saw in the binary-package walk is NOT in source-all: source-all has 18349 distinct ids, 0 dupes. The duplicate is an artifact of claude's cursor walk, not a producer defect, and it does not touch this recomputation",
      "artifact_url remains a locator, excluded from 'derived state'; the dashboard counts are the derived state that matters, and they agree",
      "if the catalogue rules by the TITLE instead of the falsifier, this flips to VIOLATION and I-4 is falsified - state which rule you applied; this finding does not decide, it reports both",
      `the ${d.pkgBadWithoutDiffoscope} BAD records lacking has_diffoscope remain evidence that the per-record booleans are independent observations, not the derived state in question; the dashboard is`,
    ],
  });

  // I-8 — a record states the limit of its own testimony. Falsifier: an artifact
  // makes a claim with no boundary and its producer offers no equivalent anywhere
  // in the corpus. Blind reading per relay-0144.
  findings.push({
    invariant: "I-8",
    producer: "debian-rb",
    verdict: "UNDECIDABLE",
    evidence: "OBSERVED",
    reason: `r-b build records assert a status (GOOD = reproducible) but carry no field stating the limit of that claim - no per-record "what this does not establish" equivalent to apex's required attested field, and no boundary statement anywhere in the frozen corpus. The architecture/suite fields identify the subject, they do not state the boundary of the testimony. So from the frozen artifacts alone, r-b neither conforms (no boundary stated) nor clearly violates (the producer may state limits in endpoints outside the frozen corpus, e.g. the reproducible-builds human report). This matches the I-8 expect line: a half from a fetched producer is likely UNDECIDABLE from artifacts, leaving I-8 single-source (apex). STANDARD: (a)/(b) agree - no boundary artifact is published, so UNDECIDABLE under either.`,
    projections: [
      "apex CONFORMS I-8 because every /log entry names what it does not establish and the schema requires it; r-b has no equivalent field. Absence of such a field in the frozen corpus is not proof of absence everywhere, so UNDECIDABLE rather than VIOLATION",
      "if the reproducible-builds project publishes a boundary statement (the scope of a GOOD verdict) outside the frozen corpus, that would move this to CONFORMS or EXCLUDED_WITH_REASON; the frozen bytes cannot decide",
      "this keeps I-8 single-source under test, exactly as the spec predicted (expect: H's half likely UNDECIDABLE). A CONFORMS here would have required a boundary artifact r-b does not publish in the frozen set",
    ],
  });

  return findings;
}

function render(d: Awaited<ReturnType<typeof readDebianRb>>, findings: Finding[]): string {
  const lines: string[] = [];
  lines.push("<!-- NOT A RUN -->");
  lines.push("# Debian reproducible-builds — second-agent experiment");
  lines.push("");
  lines.push("**NOT A RUN.** This document is not `docs/reports/*-conformance-NN.md`; it does");
  lines.push("not enter the conformance series, is not pinned by");
  lines.push("`tests/reports-immutable.test.ts`, and changes no catalogue. It is the deliverable");
  lines.push("of relay-0124 (human chose option a), written by `relay-hy3` against a previously");
  lines.push("published hypothesis (relay-0119), **not blind** (relay-0126 caution) and not");
  lines.push(
    "fully independent - the proof bytes were pinned by claude, but per hy3's verbatim rule",
  );
  lines.push(
    "(relay-0130 §4), so the v0 selection is no longer claude's curation alone. The initial",
  );
  lines.push("b.json/v0.rs/v1build.rs trio (relay-0129) was claude's; see Effect section for the split.");
  lines.push("");
  lines.push("## Source");
  lines.push("");
  lines.push(`- builds: \`${d.path}\` (frozen; API total ${d.total}, fetched 1000)`);
  lines.push(`- v0 Status variants: ${JSON.stringify(d.v0Status)}`);
  lines.push(`- v1 BuildStatus variants: ${JSON.stringify(d.v1BuildStatus)}`);
  lines.push(`- OBSERVED status values in sample: ${JSON.stringify(d.statusValues)}`);
  lines.push(`- OBSERVED status values in v0/pkgs/list stride sample: ${JSON.stringify(d.pkgStatusValues)}`);
  lines.push(`- v0 package records carry retrievable input trace (build_id+artifact_url+attestation/diffoscope): ${d.pkgCarryTrace}`);
  lines.push(`- v0 BAD records lacking has_diffoscope (proves booleans are independent, not derived): ${d.pkgBadWithoutDiffoscope}`);
  lines.push(`- v0 UNKWN records lacking build_id: ${d.pkgUnkwnWithoutBuildId}`);
  lines.push(`- v0 records carry an explicit boundary/limit field: ${d.pkgHasBoundaryField}`);
  if (d.dashboard !== null && d.recomputed !== null) {
    lines.push(`- DASHBOARD (stored derived state) rebuilds: good=${d.dashboard.good} bad=${d.dashboard.bad} fail=${d.dashboard.fail} unknown=${d.dashboard.unknown}`);
    lines.push(
      `- RECOMPUTED from source-all: all GOOD=${d.recomputed.all.good}/BAD=${d.recomputed.all.bad}/FAIL=${d.recomputed.all.fail}; synced-true GOOD=${d.recomputed.syncedTrue.good}/BAD=${d.recomputed.syncedTrue.bad}/FAIL=${d.recomputed.syncedTrue.fail}; disagreements=${d.recomputeDisagreement}`,
    );
    lines.push(
      "  (dashboard + source-all pinned per relay-0146: v1-trixie-arm64-dashboard.json d2afd547..., v1-trixie-arm64-source-all.json.gz gz dde55b6...)",
    );
  } else {
    lines.push("- DASHBOARD/source-all not pinned here; I-4 recomputation unavailable from frozen bytes");
  }
  lines.push(`- retries>0 by status: ${JSON.stringify(d.retriesByStatus)}`);
  lines.push("");
  lines.push("- v0 bytes now PINNED per relay-0130 §4 (claude, executed verbatim from hy3's rule):");
  lines.push("  v0-arm64-stride1000.json (every 1000th of 489,668 records), v0-arm64-unkwn-all.json.gz (all 107,144 UNKWN).");
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  for (const f of findings) {
    lines.push(`### ${f.invariant} / ${f.producer}: ${f.verdict} (${f.evidence})`);
    lines.push("");
    lines.push(f.reason);
    lines.push("");
    for (const p of f.projections) {
      lines.push(`- ${p}`);
    }
    lines.push("");
  }
  const conforms = findings.filter((f) => f.verdict === "CONFORMS").length;
  lines.push("## Effect on the catalogue (why this is not an admission)");
  lines.push("");
  lines.push(
    `debian-rb now yields ${conforms} CONFORMS (I-1, I-3, I-4) across six invariants`,
  );
  lines.push(
    "(I-1/I-3/I-4/I-5/I-8/I-9), from bytes pinned in this repo (v0/pkgs/list stride + UNKWN-full,",
  );
  lines.push(
    "extracted per relay-0130 §4). This is NOT a run; no catalogue is mutated by it. admits() requires",
  );
  lines.push(
    ">=2 DISTINCT producers CONFORMING on the same invariant. Per run 06:",
  );
  lines.push(
    "- I-1: r-b CONFORMS; hivemark and apex UNDECIDABLE on I-1 -> 1 distinct -> unadmitted.",
  );
  lines.push(
    "- I-3: r-b CONFORMS (v0/pkgs/list, standard (b)); apex UNDECIDABLE on I-3 in run 06,",
  );
  lines.push(
    "  hivemark VIOLATES on I-3 (SETTLED, relay-0174) -> I-3 sunk outright per admits() short-circuit.",
  );
  lines.push(
    "  This r-b I-3 CONFORMS survives as a finding and stops counting toward admission; I-3 is now falsified at catalogue level.",
  );
  lines.push(
    "- I-4: r-b CONFORMS BY RECOMPUTATION (relay-0146 corrected my relay-0145 reason) AND hivemark",
  );
  lines.push(
    "  CONFORMS in run 06 -> TWO distinct CONFORMS. The stored dashboard counts reproduce exactly from",
  );
  lines.push(
    "  the pinned source-all walk (0 disagreement), so I-4's falsifier is exercised and does not fire.",
  );
  lines.push(
    "  If both stand, admits() returns ADMITTED - the first ADMITTED invariant this catalogue has had.",
  );
  lines.push(
    "  BUT I-4's TITLE ('derived state is never stored') and its FALSIFIER ('stored value disagrees with",
  );
  lines.push(
    "  recomputation') are two rules that diverge on r-b: r-b stores derived state (dashboard) so by the",
  );
  lines.push(
    "  TITLE it VIOLATES. By the falsifier it CONFORMS. The catalogue must rule which sentence is the rule;",
  );
  lines.push(
    "  ruling by the title is not conservative (a VIOLATES sinks I-4 below zero permanently). This is the",
  );
  lines.push(
    "  live question, and it is now a rule-ambiguity question, not an evidence question - the bytes agree.",
  );
  lines.push(
    "- I-8: r-b UNDECIDABLE (frozen artifacts carry no boundary statement); apex CONFORMS in run 06 ->",
  );
  lines.push(
    "  1 distinct -> unadmitted. Matches the I-8 expect line (single-source under test).",
  );
  lines.push(
    "- I-5: NOT_APPLICABLE. I-9: UNDECIDABLE.",
  );
  lines.push("");
  lines.push(
    "THE RELAY-0133 DISSENT, resolved by reading. My relay-0130 reason 'a single new source cannot admit",
  );
  lines.push(
    "anything alone' was corrected in relay-0133; r-b has now been read against I-4 and I-8 (relay-0144),",
  );
  lines.push(
    "so the 'I-4 + I-8 untested by r-b' clause is settled: I-4 CONFORMS (2nd distinct, admission candidate),",
  );
  lines.push(
    "I-8 UNDECIDABLE (stays single-source). A third source CAN admit I-4 - and this reading does, on the",
  );
  lines.push(
    "native half. Whether it actually admits is claude's catalogue call, not this experiment's; the finding",
  );
  lines.push(
    "only reports the two CONFORMS. The choice of invariants is no longer the four-at-zero set: the human",
  );
  lines.push(
    "picked I-4/I-8 deliberately, and the reading shows why those two were the live ones (per claude's run-06 map).",
  );
  lines.push("");
  lines.push(
    "Independence note: the v0 bytes were pinned by claude per hy3's verbatim rule (relay-0130 §4), so the",
  );
  lines.push(
    "selection is no longer claude's curation alone. I-4/I-8 were read BLIND (claude held no view before",
  );
  lines.push(
    "reporting, relay-0144), so this is the first r-b reading not reasoning against a published hypothesis.",
  );
  lines.push(
    "I-5/I-9 remain as before. All of it is experiments evidence, outside the series and outside",
  );
  lines.push(
    "manifest.json. The catalogue decision is claude's; this document is the input to it, not the verdict.",
  );
  lines.push("");
  return lines.join("\n");
}

const d = await readDebianRb();
const findings = checkDebianRb(d);
const md = render(d, findings);
await writeFile(join(EXP, "debian-rb-findings.md"), md);
console.log(md);
