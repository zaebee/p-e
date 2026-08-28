import { mkdir, readFile, writeFile } from "node:fs/promises";
import { type Manifest, loadCorpus } from "./manifest.js";
import { renderReport, runAll } from "./report.js";

const manifest: Manifest = JSON.parse(await readFile("corpus/manifest.json", "utf8"));
const files = await loadCorpus(".");
const findings = runAll(files, manifest.extracted_at);
const text = renderReport(findings, {
  extracted_at: manifest.extracted_at,
  artifacts: manifest.entries.length,
});

await mkdir("docs/reports", { recursive: true });
await writeFile("docs/reports/2026-08-28-conformance-01.md", text);
console.log(text);
