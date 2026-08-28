import { decodeAbiParameters } from "viem";
import { apexHealth } from "../adapters/apex.js";
import { parseHivemark } from "../adapters/hivemark.js";
import type { Finding } from "../verdict.js";
import { CLAIM_TYPES, FIELD } from "./claim-schema.js";

interface Stored {
  attestation: { uid: string; message: { data: `0x${string}`; time: string } };
}

/** Re-derive which runs a later run superseded, from published bytes only. */
export function recomputeSuperseded(files: Map<string, Uint8Array>) {
  const raw = parseHivemark(files, "hivemark/attestations.json") as Stored[];
  const groups = new Map<string, { uid: string; time: number }[]>();
  let undecodable = 0;

  for (const e of raw) {
    let decoded: readonly unknown[];
    try {
      decoded = decodeAbiParameters(CLAIM_TYPES, e.attestation.message.data);
    } catch {
      undecodable++;
      continue;
    }
    const key = JSON.stringify([
      decoded[FIELD.identityId],
      decoded[FIELD.repo],
      Number(decoded[FIELD.pr]),
      decoded[FIELD.commitSha],
    ]);
    const entry = { uid: e.attestation.uid, time: Number(e.attestation.message.time) };
    const held = groups.get(key);
    if (held) held.push(entry);
    else groups.set(key, [entry]);
  }

  const superseded = new Set<string>();
  let repeated = 0;
  for (const entries of groups.values()) {
    const times = new Set(entries.map((x) => x.time));
    if (times.size === 1) continue;
    repeated++;
    let newest = Number.NEGATIVE_INFINITY;
    for (const t of times) if (t > newest) newest = t;
    for (const entry of entries) if (entry.time !== newest) superseded.add(entry.uid);
  }

  return { total: raw.length, groups: groups.size, repeated, superseded, undecodable };
}

export function checkI4(files: Map<string, Uint8Array>): Finding[] {
  const findings: Finding[] = [];

  const summary = recomputeSuperseded(files);
  const raw = parseHivemark(files, "hivemark/attestations.json") as Array<Record<string, unknown>>;
  const asserts = raw.some((e) => "superseded" in e);
  findings.push({
    invariant: "I-4",
    producer: "hivemark",
    verdict: asserts ? "VIOLATES" : summary.undecodable > 0 ? "UNDECIDABLE" : "CONFORMS",
    evidence: "OBSERVED",
    reason: `${summary.superseded.size} superseded attestations recomputed across ${summary.groups} review groups (${summary.repeated} repeated) from the ${summary.total} published envelopes alone, with ${summary.undecodable} undecodable; no envelope stores the answer`,
  });

  // apex derives status at render time and publishes no status field. Whether
  // the rendered page agrees cannot be checked — the page is not in the corpus.
  const health = apexHealth(files);
  const stores = Object.values(health.entries).some((e) => "status" in (e as object));
  findings.push({
    invariant: "I-4",
    producer: "apex",
    verdict: stores ? "VIOLATES" : "UNDECIDABLE",
    evidence: "OBSERVED",
    reason: `no entry stores a derived status, but the rendered page is not in the corpus, so agreement between the derivation and what is published cannot be observed`,
  });

  return findings;
}
