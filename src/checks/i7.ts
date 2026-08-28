import { apexHealth, apexHistory } from "../adapters/apex.js";
import { parseHivemark } from "../adapters/hivemark.js";
import type { Finding } from "../verdict.js";

/**
 * A machine-written value is a boolean, a number, null, or a string with no
 * whitespace. Prose is what a sentence looks like: hosts, ISO stamps and state
 * names have no spaces; a `why` or a `learned` field would.
 */
function isMachineValue(v: unknown): boolean {
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
  const prose = values.filter((v) => !isMachineValue(v));
  findings.push({
    invariant: "I-7",
    producer: "apex",
    verdict: prose.length > 0 ? "VIOLATES" : "CONFORMS",
    evidence: "OBSERVED",
    reason: `${values.length} values across the two machine-written files, none of them prose (${prose.length} exceptions); the enforcement itself is a test inside the producer and is not observable from artifacts — only its result is`,
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
