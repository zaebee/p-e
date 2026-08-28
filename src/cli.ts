import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { type Manifest, loadCorpus } from "./manifest.js";
import { renderReport, runAllWithCoverage } from "./report.js";
import { assertFreeToWrite, parseRunId, reportPath } from "./run.js";

const runId = parseRunId(process.argv.slice(2));
const manifest: Manifest = JSON.parse(await readFile("corpus/manifest.json", "utf8"));

const path = reportPath(runId, manifest.extracted_at);
// Checked before any work is done, so a refused run costs nothing and cannot
// half-write over a previous result.
await assertFreeToWrite(path);

const { findings, byInvariant } = runAllWithCoverage(await loadCorpus("."), manifest.extracted_at);
const text = renderReport(findings, {
  extracted_at: manifest.extracted_at,
  artifacts: manifest.entries.length,
  runId,
  coverage: { manifest, byInvariant },
});

await mkdir(dirname(path), { recursive: true });
await writeFile(path, text);
console.log(`wrote ${path}`);
