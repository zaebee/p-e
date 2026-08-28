/**
 * A compact diff between two conformance runs, parsed out of the reports
 * themselves rather than recomputed.
 *
 * Reading the emitted reports is the point: a diff computed by re-running the
 * checks would compare today's code against today's code and could not show a
 * methodology change at all. The reports are immutable, so they are the only
 * record of what an earlier methodology concluded.
 */
import { readFile } from "node:fs/promises";

const FINDING = /^- \*\*(\S+) — ([A-Z_]+)\*\* \*\((\w+)\)\*\./;
const SECTION = /^### (I-\d) · .* — (\w+)$/;

interface Row {
  verdict: string;
  evidence: string;
}

async function parse(path: string): Promise<{
  results: Map<string, string>;
  findings: Map<string, Row>;
  admitted: string;
}> {
  const text = await readFile(path, "utf8");
  const results = new Map<string, string>();
  const findings = new Map<string, Row>();
  let current = "";
  for (const line of text.split("\n")) {
    const section = SECTION.exec(line);
    if (section?.[1] && section[2]) {
      current = section[1];
      results.set(current, section[2]);
      continue;
    }
    const finding = FINDING.exec(line);
    if (finding?.[1] && finding[2] && finding[3]) {
      findings.set(`${current}/${finding[1]}`, { verdict: finding[2], evidence: finding[3] });
    }
  }
  const admitted = /\*\*ADMITTED: (\d+) of (\d+)\.?/.exec(text)?.[0] ?? "unknown";
  return { results, findings, admitted };
}

const [a, b] = process.argv.slice(2);
if (!a || !b) throw new Error("usage: diff-runs <report-a.md> <report-b.md>");

const from = await parse(a);
const to = await parse(b);

const keys = [...new Set([...from.findings.keys(), ...to.findings.keys()])].sort();
const lines: string[] = [];

for (const key of keys) {
  const x = from.findings.get(key);
  const y = to.findings.get(key);
  const before = x ? `${x.verdict}(${x.evidence})` : "absent";
  const after = y ? `${y.verdict}(${y.evidence})` : "absent";
  if (before !== after) lines.push(`  ${key.padEnd(18)} ${before}  ->  ${after}`);
}

for (const id of [...new Set([...from.results.keys(), ...to.results.keys()])].sort()) {
  const before = from.results.get(id) ?? "absent";
  const after = to.results.get(id) ?? "absent";
  if (before !== after) lines.push(`  ${id.padEnd(18)} ${before}  ->  ${after}`);
}

console.log(`${a}  ->  ${b}\n`);
console.log(lines.length > 0 ? lines.join("\n") : "  no verdict changed");
console.log(`\n  ${from.admitted.replace(/\*\*/g, "")}  ->  ${to.admitted.replace(/\*\*/g, "")}`);
