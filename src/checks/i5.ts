import { apexHistory } from "../adapters/apex.js";
import { parseHivemark } from "../adapters/hivemark.js";
import type { Finding } from "../verdict.js";

const DAY = 86_400_000;

/** Midnight UTC on the Monday of the week containing `at`. */
function mondayOf(at: Date): Date {
  const day = at.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  return new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate() - offset, 0, 0, 0, 0),
  );
}

/** ISO 8601: the Thursday of a week decides which year the week belongs to. */
export function isoWeekOf(iso: string): string {
  const monday = mondayOf(new Date(iso));
  const thursday = new Date(monday.getTime() + 3 * DAY);
  const year = thursday.getUTCFullYear();
  const firstThursday = new Date(mondayOf(new Date(Date.UTC(year, 0, 4))).getTime() + 3 * DAY);
  const week = Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * DAY)) + 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

interface Anchor {
  period: string;
  root: string;
  count: number;
  uids: string[];
}

export function checkI5(files: Map<string, Uint8Array>): Finding[] {
  const findings: Finding[] = [];

  const anchors = parseHivemark(files, "hivemark/anchors.json") as Anchor[];
  const malformed = anchors.filter((a) => !/^\d{4}-W\d{2}$/.test(a.period));
  const miscounted = anchors.filter((a) => a.uids.length !== a.count);
  findings.push({
    invariant: "I-5",
    producer: "hivemark",
    verdict:
      malformed.length > 0 || miscounted.length > 0
        ? "VIOLATES"
        : anchors.length < 2
          ? "UNDECIDABLE"
          : "CONFORMS",
    evidence: "OBSERVED",
    reason: `${anchors.length} anchor(s) — ${anchors.map((a) => a.period).join(", ")} — named as valid ISO weeks with uid counts matching (${malformed.length} malformed, ${miscounted.length} miscounted); with one period a gap cannot be exhibited, so the no-backfill half is unobservable here`,
  });

  const history = apexHistory(files);
  const records = Object.values(history.hosts);
  const uncounted = records.filter((r) => typeof r.gaps !== "number");
  const impossible = records.filter((r) => Date.parse(r.since) > Date.parse(history.updatedAt));
  const anyGap = records.some((r) => r.gaps > 0);
  findings.push({
    invariant: "I-5",
    producer: "apex",
    verdict:
      uncounted.length > 0 || impossible.length > 0
        ? "VIOLATES"
        : anyGap
          ? "CONFORMS"
          : "UNDECIDABLE",
    evidence: "OBSERVED",
    reason: anyGap
      ? `${records.length} host records carry gaps counts, ${records.filter((r) => r.gaps > 0).length} of them non-zero, so a hole is visible rather than absorbed`
      : `${records.length} host records each carry a gaps count and a since no later than the fold, but every count is zero, so no hole exists for the record to have preserved`,
  });

  return findings;
}
