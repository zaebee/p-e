import { apexHealth, apexHistory } from "../adapters/apex.js";
import { parseHivemark } from "../adapters/hivemark.js";
import type { Finding } from "../verdict.js";

/**
 * Whitespace as a stand-in for prose. Wrong in both directions, and kept only
 * to describe the corpus — never to support a verdict.
 *
 * `"HelloWorld"` is prose and passes as a machine value. `"https://foo bar"` is
 * a URL and fails as one. A reader that promoted this to evidence would be
 * testing a definition of prose that no producer publishes — the reader
 * inventing semantics, which the falsification rule forbids.
 */
function looksMachineWritten(v: unknown): boolean {
  if (v === null || typeof v === "boolean" || typeof v === "number") return true;
  if (typeof v !== "string") return false;
  return !/\s/.test(v);
}

export function checkI7(files: Map<string, Uint8Array>): Finding[] {
  const findings: Finding[] = [];

  const health = apexHealth(files);
  const history = apexHistory(files);
  const values = [
    ...Object.values(health.entries).flatMap((e) => Object.values(e)),
    ...Object.values(history.hosts).flatMap((r) => Object.values(r)),
  ];
  const proseByHeuristic = values.filter((v) => !looksMachineWritten(v));
  // Demoted at relay-0012. The numbers below describe the corpus and do not
  // support the verdict: separating a machine value from prose needs a
  // definition of prose, and no producer publishes one. The enforcement is a
  // test inside apex, and a test is not an artifact.
  findings.push({
    invariant: "I-7",
    producer: "apex",
    verdict: "UNDECIDABLE",
    evidence: "OBSERVED",
    reason: `${values.length} values across the two machine-written files, ${proseByHeuristic.length} of which a whitespace heuristic would call prose — but that heuristic is wrong in both directions and is the reader's own invention, so the corpus cannot show whether ownership was enforced, only that its result looks consistent`,
  });

  // hivemark: Judge is derived from the genome and must never be a stored input.
  // Published attestations carry no genome at all, so the artifacts cannot
  // exhibit the separation either way.
  const raw = parseHivemark(files, "hivemark/attestations.json") as Array<Record<string, unknown>>;
  const carries = raw.some((e) => "genome" in e || "judge" in e);
  findings.push({
    invariant: "I-7",
    producer: "hivemark",
    verdict: carries ? "VIOLATES" : "UNDECIDABLE",
    evidence: "OBSERVED",
    reason:
      "no published attestation carries a genome or a judge field, so the derived-not-stored separation has nothing in this corpus to be observed against",
  });

  return findings;
}
