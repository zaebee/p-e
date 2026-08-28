import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { sha256, type CorpusEntry } from "../src/manifest.js";

const PROJECTS = "/home/zaebee/projects";

const SOURCES: ReadonlyArray<{ from: string; to: string; producer: string; repo: string }> = [
  { from: "hivemark/dist/attestations.json", to: "hivemark/attestations.json", producer: "hivemark", repo: "hivemark" },
  { from: "hivemark/dist/provenance.json", to: "hivemark/provenance.json", producer: "hivemark", repo: "hivemark" },
  { from: "hivemark/anchors.json", to: "hivemark/anchors.json", producer: "hivemark", repo: "hivemark" },
  { from: "hivemark/births.json", to: "hivemark/births.json", producer: "hivemark", repo: "hivemark" },
  { from: "hivemark/corpus.json", to: "hivemark/corpus.json", producer: "hivemark", repo: "hivemark" },
  { from: "apex/data/health.json", to: "apex/health.json", producer: "apex", repo: "apex" },
  { from: "apex/data/history.json", to: "apex/history.json", producer: "apex", repo: "apex" },
];

const LOG_DIR = "apex/src/content/log";

const rev = (repo: string): string =>
  execFileSync("git", ["-C", join(PROJECTS, repo), "rev-parse", "HEAD"], { encoding: "utf8" }).trim();

/** Whether the producer tracks this file, or it is build output with no commit. */
function isTracked(repo: string, relative: string): boolean {
  try {
    execFileSync("git", ["-C", join(PROJECTS, repo), "ls-files", "--error-unmatch", relative], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

const entries: CorpusEntry[] = [];

function freeze(from: string, to: string, producer: string, repo: string): void {
  const dst = join("corpus", to);
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(join(PROJECTS, from), dst);
  const bytes = new Uint8Array(readFileSync(dst));
  const tracked = isTracked(repo, from.slice(repo.length + 1));
  entries.push({
    path: to,
    sha256: sha256(bytes),
    bytes: bytes.byteLength,
    producer,
    sourceRepo: repo,
    // A gitignored build output has no revision to cite. Recording null rather
    // than the repo HEAD keeps the manifest from claiming a provenance the file
    // does not have — the same refusal the producers themselves practise.
    sourceRev: tracked ? rev(repo) : null,
    tracked,
    ...(tracked ? {} : { reason: "artifact_not_versioned" }),
  });
}

for (const s of SOURCES) freeze(s.from, s.to, s.producer, s.repo);

for (const name of readdirSync(join(PROJECTS, LOG_DIR)).filter((n) => n.endsWith(".md")).sort()) {
  freeze(`${LOG_DIR}/${name}`, `apex/log/${name}`, "apex", "apex");
}

writeFileSync(
  join("corpus", "manifest.json"),
  `${JSON.stringify({ extracted_at: new Date().toISOString(), entries }, null, 2)}\n`,
);
console.log(`froze ${entries.length} artifacts`);
