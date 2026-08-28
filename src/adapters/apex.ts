import type { Envelope } from "../envelope.js";

const decoder = new TextDecoder();

export interface ApexHealthEntry {
  host: string;
  ok: boolean;
  code: number | null;
  finalUrl?: string | null;
  offSite?: boolean;
}

export interface ApexHostRecord {
  state: "alive" | "cold" | "unknown";
  since: string;
  checks: number;
  gaps: number;
}

export interface ApexLogEntry {
  file: string;
  title: string;
  date: string;
  claimed: string;
  observed: string;
  attested: string;
}

function text(files: Map<string, Uint8Array>, name: string): string {
  const bytes = files.get(name);
  if (!bytes) throw new Error(`not in corpus: ${name}`);
  return decoder.decode(bytes);
}

export const apexHealth = (files: Map<string, Uint8Array>) =>
  JSON.parse(text(files, "apex/health.json")) as {
    checkedAt: string;
    ok: boolean;
    lastOkAt?: string | null;
    entries: Record<string, ApexHealthEntry>;
  };

export const apexHistory = (files: Map<string, Uint8Array>) =>
  JSON.parse(text(files, "apex/history.json")) as {
    updatedAt: string;
    hosts: Record<string, ApexHostRecord>;
  };

/**
 * Frontmatter only, and a deliberately unclever parser: the fields are quoted
 * single-line YAML scalars, and pulling in a YAML library would let this reader
 * accept shapes the producer never emits.
 */
export function apexLog(files: Map<string, Uint8Array>): ApexLogEntry[] {
  const out: ApexLogEntry[] = [];
  for (const file of [...files.keys()].filter((k) => k.startsWith("apex/log/")).sort()) {
    const body = text(files, file);
    const match = /^---\n([\s\S]*?)\n---/.exec(body);
    const front = match?.[1];
    if (!front) throw new Error(`no frontmatter in ${file}`);
    // An absent field and a present-but-empty one must not collapse to the same
    // value. `?? ""` made "the producer did not publish this" indistinguishable
    // from "the producer published nothing here" — I-1's distinction, lost in
    // the adapter that feeds the check that tests for it. Latent on this corpus,
    // where every field is present and non-empty, and it would have fired
    // silently the first time a log entry omitted `attested:`.
    const field = (name: string): string | undefined => {
      const m = new RegExp(`^${name}:\\s*"?([\\s\\S]*?)"?\\s*$`, "m").exec(front);
      return m?.[1];
    };
    const required = (name: string): string => {
      const value = field(name);
      if (value === undefined) throw new Error(`${file}: frontmatter has no ${name} field`);
      return value;
    };
    out.push({
      file,
      title: required("title"),
      date: required("date"),
      claimed: required("claimed"),
      observed: required("observed"),
      attested: required("attested"),
    });
  }
  return out;
}

/**
 * `subject` is the host — the thing observed. hivemark's subject is the
 * claimant. Both are carried as written; flattening them into one meaning is the
 * mistake §5 records and M2 leaves open.
 */
export function readApex(files: Map<string, Uint8Array>): Envelope[] {
  const health = apexHealth(files);
  const history = apexHistory(files);
  const envelopes: Envelope[] = [];

  Object.entries(health.entries).forEach(([host, entry], index) => {
    envelopes.push({
      subject: host,
      occurred_at: health.checkedAt,
      payload: entry,
      origin: { file: "apex/health.json", index },
    });
  });

  Object.entries(history.hosts).forEach(([host, record], index) => {
    envelopes.push({
      subject: host,
      // The occurrence is when this state was first observed, not when the file
      // was folded — `updatedAt` is a write time and is deliberately not used.
      occurred_at: record.since,
      payload: record,
      origin: { file: "apex/history.json", index },
    });
  });

  apexLog(files).forEach((entry, index) => {
    envelopes.push({
      subject: entry.file,
      // Passed through, not parsed. apex publishes `date: 2026-08-13` — a day,
      // with no time and no zone — and `new Date(...).toISOString()` turned that
      // into `2026-08-13T00:00:00.000Z`, an instant with a precision no producer
      // supplied. It was also machine-dependent: a zone-less datetime would have
      // resolved against whatever TZ the reader ran under.
      //
      // Same defect as `subject` two lines up, on the adjacent field of the same
      // envelopes, and unrecorded until a review found it. A day is already
      // valid ISO-8601; the envelope carries the producer's precision.
      occurred_at: entry.date,
      payload: entry,
      origin: { file: entry.file, index },
    });
  });

  return envelopes;
}
