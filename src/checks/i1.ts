import { decodeAbiParameters } from "viem";
import { apexHealth, apexHistory } from "../adapters/apex.js";
import { parseHivemark } from "../adapters/hivemark.js";
import type { Finding } from "../verdict.js";
import { CLAIM_TYPES, FIELD, VERDICT_NAMES } from "./claim-schema.js";

interface Stored {
  attestation: { message: { data: `0x${string}` } };
}

export function checkI1(files: Map<string, Uint8Array>): Finding[] {
  const findings: Finding[] = [];

  // hivemark. A vocabulary that names `unresolved` but never emits it has not
  // demonstrated the invariant, so the test is which codes the published set
  // actually carries — not which ones the type permits.
  const raw = parseHivemark(files, "hivemark/attestations.json") as Stored[];
  const codes = new Set<number>();
  let undecodable = 0;
  for (const e of raw) {
    try {
      const decoded = decodeAbiParameters(CLAIM_TYPES, e.attestation.message.data);
      codes.add(Number(decoded[FIELD.verdict]));
    } catch {
      undecodable++;
    }
  }
  const named = [...codes].sort().map((c) => VERDICT_NAMES[c] ?? `unknown(${c})`);
  const keepsAbsenceApart = codes.has(0) && (codes.has(1) || codes.has(2));
  findings.push({
    invariant: "I-1",
    producer: "hivemark",
    verdict: undecodable > 0 ? "UNDECIDABLE" : keepsAbsenceApart ? "CONFORMS" : "UNDECIDABLE",
    evidence: "OBSERVED",
    reason: keepsAbsenceApart
      ? `${raw.length} attestations carry verdicts {${named.join(", ")}}; unresolved is present and distinct from the judged values, so an absence of judgement is not published as a judgement`
      : `${raw.length} attestations carry verdicts {${named.join(", ")}}; the third state is not exercised in this corpus, so the separation cannot be observed`,
  });

  // apex. Two separate mechanisms: the snapshot can say the check itself failed,
  // and the fold can say a run could not observe.
  const health = apexHealth(files);
  const history = apexHistory(files);
  const records = Object.values(history.hosts);
  const states = new Set(records.map((h) => h.state));
  // The same standard hivemark is held to, and deliberately not a weaker one:
  // the third state must be *exercised* in the corpus, not merely representable
  // in it. An earlier draft of this check accepted a present-but-zero mechanism
  // here while demanding an occurring value there, which is exactly the
  // producer-specific leniency the falsification rule forbids.
  const exercised = states.has("unknown") || records.some((h) => h.gaps > 0) || health.ok === false;
  findings.push({
    invariant: "I-1",
    producer: "apex",
    verdict: exercised ? "CONFORMS" : "UNDECIDABLE",
    evidence: "OBSERVED",
    reason: exercised
      ? `the not-observed state occurs: states {${[...states].sort().join(", ")}}, ${records.filter((h) => h.gaps > 0).length} hosts with gaps, snapshot ok:${health.ok}`
      : `the mechanism exists but is never exercised: observed states {${[...states].sort().join(", ")}} with no unknown, all ${records.length} hosts at gaps:0, snapshot ok:${health.ok}. A reader could distinguish not-observed from cold if it occurred; in this corpus it does not`,
  });

  return findings;
}
