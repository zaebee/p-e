# p-e Conformance Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one external reader that consumes the frozen published artifacts of `hivemark` and `apex` and reports, per invariant per producer, one of four verdicts — running the falsifier the spec has never run.

**Architecture:** A corpus frozen by digest, two read-only adapters that project each producer's artifacts into the §5 envelope, nine independent checks that never import producer code, and a report that applies the demotion rule mechanically. The reader is the first code in `p-e` and must not become a second source of protocol semantics: it tests the spec, it does not extend it.

**Tech Stack:** TypeScript, bun, vitest, Biome, `viem` (ABI decoding only). Matches both producers' toolchain so the corpus needs no conversion.

**Spec:** `docs/superpowers/specs/2026-08-28-p-e-core-design.md`

## Global Constraints

Copied from the spec and from relay-0007. Every task's requirements implicitly include this section.

- The reader lives **outside** H, A and P. It **MUST NOT** modify a producer, and **MUST NOT** import producer source code — only their published bytes.
- The reader **MUST** consume frozen real artifacts, pinned by `sha256`, byte count and source revision. **No invented fixture may support a verdict**; a fixture may only exercise the reader.
- Four verdicts, never two: `CONFORMS` · `VIOLATES` · `NOT_APPLICABLE` · `UNDECIDABLE`.
- `UNDECIDABLE` is not `VIOLATES`. `missing` is not `false`. **A producer's absence is evidence, not permission** — a `NOT_APPLICABLE` never counts as support.
- **Demotion rule:** an invariant with fewer than two `CONFORMS` across distinct producers is single-source under test and is demoted to spec §4, whatever the code inspection found.
- **Falsification rule:** any producer-specific adaptation that changes meaning falsifies the corresponding invariant. Remove the invariant; do not special-case the reader.
- The corpus `extracted_at` timestamp is recorded **separately** from every occurrence timestamp inside the artifacts and is never confused with one (I-2 applied to this project's own record).
- The reader introduces no core semantics. It **MUST NOT** infer identity or causality semantics (M1, M2, M4 stay unresolved).
- **Two axes per finding.** Beside the verdict, every finding records how it was
  reached: `OBSERVED` (the property was read directly out of the artifact) or
  `INFERRED` (a proxy consistent with the property, which does not establish it).
  Set it per check: reading `finalUrl` out of a record is `OBSERVED`; concluding
  from a timestamp spread is `INFERRED`.
- **Not added, and why.** relay-0009 proposed `UNDECIDABLE` and `FALSIFIED` as
  further evidence values. They are already carried by the verdict, and a finding
  able to say `evidence: UNDECIDABLE, verdict: CONFORMS` would be incoherent. The
  non-redundant information in that proposal is `OBSERVED` vs `INFERRED`, and
  that is what is implemented.
- **Do not self-heal the spec.** On a failed check, record the failure and its
  cause. Never adjust a test to make a verdict green, and never edit the spec
  mid-run. A core change requires a new explicit decision.
- Node/bun target: bun ≥ 1.1. TypeScript `strict: true`.

---

### Task 1: Scaffolding and the verdict vocabulary

The verdict type is the reader's own application of I-1: a two-valued result would collapse "not observed" into "false". Everything else depends on it, so tooling config is folded in here.

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `biome.jsonc`
- Create: `src/verdict.ts`
- Test: `tests/verdict.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `type Verdict = "CONFORMS" | "VIOLATES" | "NOT_APPLICABLE" | "UNDECIDABLE"`; `type Evidence = "OBSERVED" | "INFERRED"`; `interface Finding { invariant: string; producer: string; verdict: Verdict; evidence: Evidence; reason: string }`; `function admits(findings: readonly Finding[]): "ADMITTED" | "DEMOTED"`

- [ ] **Step 1: Write the failing test**

```ts
// tests/verdict.test.ts
import { describe, expect, it } from "vitest";
import { admits, type Finding } from "../src/verdict.js";

const f = (producer: string, verdict: Finding["verdict"]): Finding =>
  ({ invariant: "I-x", producer, verdict, evidence: "OBSERVED", reason: "" });

describe("admits", () => {
  it("admits an invariant two distinct producers confirm", () => {
    expect(admits([f("hivemark", "CONFORMS"), f("apex", "CONFORMS")])).toBe("ADMITTED");
  });

  it("does not let NOT_APPLICABLE count as support", () => {
    expect(admits([f("hivemark", "CONFORMS"), f("apex", "NOT_APPLICABLE")])).toBe("DEMOTED");
  });

  it("does not let UNDECIDABLE count as support", () => {
    expect(admits([f("hivemark", "CONFORMS"), f("apex", "UNDECIDABLE")])).toBe("DEMOTED");
  });

  it("demotes on any violation, even with two confirmations", () => {
    expect(
      admits([f("hivemark", "CONFORMS"), f("apex", "CONFORMS"), f("other", "VIOLATES")]),
    ).toBe("DEMOTED");
  });

  it("counts producers, not findings", () => {
    expect(admits([f("hivemark", "CONFORMS"), f("hivemark", "CONFORMS")])).toBe("DEMOTED");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run vitest run tests/verdict.test.ts`
Expected: FAIL — cannot resolve `../src/verdict.js`

- [ ] **Step 3: Write the config and the implementation**

```jsonc
// package.json
{
  "name": "p-e",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "freeze": "bun run scripts/freeze-corpus.ts",
    "conform": "bun run src/cli.ts"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "typescript": "^5.6.3",
    "vitest": "^2.1.4"
  },
  "dependencies": { "viem": "^2.21.0" }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests", "scripts"]
}
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["tests/**/*.test.ts"] } });
```

```jsonc
// biome.jsonc
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "formatter": { "enabled": true, "lineWidth": 100, "indentStyle": "space" },
  "linter": { "enabled": true, "rules": { "recommended": true } }
}
```

```ts
// src/verdict.ts

/**
 * Four verdicts, because two would collapse "not observed" into "false" —
 * the exact defect I-1 exists to prevent, applied to this reader itself.
 *
 * NOT_APPLICABLE: the producer has no such construct, so the invariant cannot
 * be exercised. UNDECIDABLE: it applies, but the published artifacts do not
 * settle it. Neither is a failure, and neither is support.
 */
export type Verdict = "CONFORMS" | "VIOLATES" | "NOT_APPLICABLE" | "UNDECIDABLE";

/**
 * How a verdict was reached, which is a different question from what it was.
 *
 * OBSERVED: the property was read directly out of the artifact.
 * INFERRED: a proxy consistent with the property was used, which does not
 * establish it — I-2 at the artifact level is the clearest case.
 *
 * relay-0009 also proposed UNDECIDABLE and FALSIFIED here. Both are already
 * carried by the verdict, and a finding reading `evidence: UNDECIDABLE,
 * verdict: CONFORMS` would be incoherent, so only the non-redundant half of
 * that proposal is implemented.
 */
export type Evidence = "OBSERVED" | "INFERRED";

export interface Finding {
  readonly invariant: string;
  readonly producer: string;
  readonly verdict: Verdict;
  readonly evidence: Evidence;
  /** Why, in a sentence a reader of the report can check against the corpus. */
  readonly reason: string;
}

/**
 * The demotion rule, applied mechanically rather than by judgement.
 *
 * Two distinct producers must CONFORM. A NOT_APPLICABLE never counts as
 * support — a producer that cannot exercise an invariant has told us nothing
 * about it — and neither does an UNDECIDABLE. One VIOLATES sinks it outright.
 */
export function admits(findings: readonly Finding[]): "ADMITTED" | "DEMOTED" {
  if (findings.some((f) => f.verdict === "VIOLATES")) return "DEMOTED";
  const confirming = new Set(
    findings.filter((f) => f.verdict === "CONFORMS").map((f) => f.producer),
  );
  return confirming.size >= 2 ? "ADMITTED" : "DEMOTED";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun install && bun run vitest run tests/verdict.test.ts`
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts biome.jsonc src/verdict.ts tests/verdict.test.ts bun.lock
git commit -m "feat(reader): four verdicts and the demotion rule"
```

---

### Task 2: Freeze the corpus and refuse a moved artifact

The corpus must not shift under the reader. Two hazards are handled here: `hivemark/dist/` is **gitignored**, so `attestations.json` and `provenance.json` have no commit to cite; and `extracted_at` must never be mistaken for an occurrence time.

**Files:**
- Create: `scripts/freeze-corpus.ts`
- Create: `src/manifest.ts`
- Create: `corpus/manifest.json` (generated, committed)
- Create: `corpus/hivemark/*`, `corpus/apex/*` (copied real artifacts, committed)
- Test: `tests/manifest.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `interface CorpusEntry { path: string; sha256: string; bytes: number; producer: string; sourceRepo: string; sourceRev: string | null; tracked: boolean }`; `interface Manifest { extracted_at: string; entries: CorpusEntry[] }`; `function loadCorpus(root: string): Promise<Map<string, Uint8Array>>`

- [ ] **Step 1: Write the failing test**

```ts
// tests/manifest.test.ts
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadCorpus } from "../src/manifest.js";

function fixture(content: string, sha256: string) {
  const root = mkdtempSync(join(tmpdir(), "p-e-"));
  mkdirSync(join(root, "corpus", "x"), { recursive: true });
  writeFileSync(join(root, "corpus", "x", "a.json"), content);
  writeFileSync(
    join(root, "corpus", "manifest.json"),
    JSON.stringify({
      extracted_at: "2026-08-28T00:00:00.000Z",
      entries: [
        { path: "x/a.json", sha256, bytes: Buffer.byteLength(content), producer: "x",
          sourceRepo: "x", sourceRev: null, tracked: false },
      ],
    }),
  );
  return root;
}

// sha256 of "{}"
const SHA_EMPTY_OBJ = "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a";

describe("loadCorpus", () => {
  it("loads an artifact whose digest matches", async () => {
    const files = await loadCorpus(fixture("{}", SHA_EMPTY_OBJ));
    expect(files.get("x/a.json")).toBeDefined();
  });

  it("refuses an artifact that moved under the manifest", async () => {
    await expect(loadCorpus(fixture('{"moved":1}', SHA_EMPTY_OBJ))).rejects.toThrow(
      /digest mismatch/,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run vitest run tests/manifest.test.ts`
Expected: FAIL — cannot resolve `../src/manifest.js`

- [ ] **Step 3: Write the implementation and the freeze script**

```ts
// src/manifest.ts
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface CorpusEntry {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly producer: string;
  readonly sourceRepo: string;
  /** null where the artifact is build output its producer does not track. */
  readonly sourceRev: string | null;
  readonly tracked: boolean;
}

export interface Manifest {
  /**
   * When this corpus was copied. Deliberately named unlike every occurrence
   * timestamp inside the artifacts: I-2 says a recorded time is the time of the
   * occurrence, and this one is the time of the extraction. Confusing the two
   * here would repeat, in this project's own record, the defect the invariant
   * was extracted to describe.
   */
  readonly extracted_at: string;
  readonly entries: readonly CorpusEntry[];
}

export const sha256 = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

/** Load every pinned artifact, refusing any whose bytes no longer match. */
export async function loadCorpus(root: string): Promise<Map<string, Uint8Array>> {
  const manifest: Manifest = JSON.parse(
    await readFile(join(root, "corpus", "manifest.json"), "utf8"),
  );
  const files = new Map<string, Uint8Array>();
  for (const entry of manifest.entries) {
    const bytes = new Uint8Array(await readFile(join(root, "corpus", entry.path)));
    const got = sha256(bytes);
    if (got !== entry.sha256) {
      throw new Error(`digest mismatch for ${entry.path}: manifest ${entry.sha256}, file ${got}`);
    }
    files.set(entry.path, bytes);
  }
  return files;
}
```

```ts
// scripts/freeze-corpus.ts
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { sha256, type CorpusEntry } from "../src/manifest.js";

const PROJECTS = "/home/zaebee/projects";

const SOURCES: ReadonlyArray<{ from: string; to: string; producer: string; repo: string }> = [
  { from: "hivemark/dist/attestations.json", to: "hivemark/attestations.json", producer: "hivemark", repo: "hivemark" },
  { from: "hivemark/dist/provenance.json",   to: "hivemark/provenance.json",   producer: "hivemark", repo: "hivemark" },
  { from: "hivemark/anchors.json",           to: "hivemark/anchors.json",      producer: "hivemark", repo: "hivemark" },
  { from: "hivemark/births.json",            to: "hivemark/births.json",       producer: "hivemark", repo: "hivemark" },
  { from: "hivemark/corpus.json",            to: "hivemark/corpus.json",       producer: "hivemark", repo: "hivemark" },
  { from: "apex/data/health.json",           to: "apex/health.json",           producer: "apex",     repo: "apex" },
  { from: "apex/data/history.json",          to: "apex/history.json",          producer: "apex",     repo: "apex" },
];

const LOG_DIR = "apex/src/content/log";

const rev = (repo: string): string =>
  execFileSync("git", ["-C", join(PROJECTS, repo), "rev-parse", "HEAD"], { encoding: "utf8" }).trim();

/** Whether the producer tracks this file, or it is build output with no commit. */
function tracked(repo: string, relative: string): boolean {
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
  const src = join(PROJECTS, from);
  const dst = join("corpus", to);
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  const bytes = new Uint8Array(readFileSync(dst));
  entries.push({
    path: to,
    sha256: sha256(bytes),
    bytes: bytes.byteLength,
    producer,
    sourceRepo: repo,
    // A gitignored build output has no revision to cite. Recording null rather
    // than the repo HEAD keeps the manifest from claiming a provenance the file
    // does not have.
    sourceRev: tracked(repo, from.slice(repo.length + 1)) ? rev(repo) : null,
    tracked: tracked(repo, from.slice(repo.length + 1)),
  });
}

for (const s of SOURCES) freeze(s.from, s.to, s.producer, s.repo);

for (const name of execFileSync("ls", [join(PROJECTS, LOG_DIR)], { encoding: "utf8" })
  .split("\n")
  .filter((n) => n.endsWith(".md"))) {
  freeze(`${LOG_DIR}/${name}`, `apex/log/${name}`, "apex", "apex");
}

writeFileSync(
  join("corpus", "manifest.json"),
  `${JSON.stringify({ extracted_at: new Date().toISOString(), entries }, null, 2)}\n`,
);
console.log(`froze ${entries.length} artifacts`);
```

- [ ] **Step 4: Run the freeze, then the tests**

Run: `bun run freeze && bun run vitest run tests/manifest.test.ts`
Expected: `froze 11 artifacts` (7 named + 4 log entries), then PASS, 2 tests.
Then confirm by hand that `corpus/manifest.json` records `sourceRev: null` and `tracked: false` for `hivemark/attestations.json` and `hivemark/provenance.json` — `dist/` is gitignored, and the manifest must say so rather than cite a commit that does not contain them.

- [ ] **Step 5: Commit**

```bash
git add scripts/freeze-corpus.ts src/manifest.ts tests/manifest.test.ts corpus/
git commit -m "feat(corpus): freeze the real artifacts by digest

dist/ is gitignored in hivemark, so attestations.json and provenance.json
carry sourceRev: null rather than a commit that does not contain them."
```

---

### Task 3: The envelope and the hivemark adapter

The adapter projects published bytes into the §5 envelope and nothing more. `subject` is taken from `message.recipient` — which, per §5, holds the **claimant** in this producer. The adapter must not correct that.

**Files:**
- Create: `src/envelope.ts`
- Create: `src/adapters/hivemark.ts`
- Test: `tests/adapters-hivemark.test.ts`

**Interfaces:**
- Consumes: `loadCorpus` from Task 2
- Produces: `interface Envelope { subject: string; occurred_at: string; payload: unknown; id?: string; type?: string; version?: string; attester?: string; origin: { file: string; index: number } }`; `function readHivemark(files: Map<string, Uint8Array>): Envelope[]`

- [ ] **Step 1: Write the failing test**

```ts
// tests/adapters-hivemark.test.ts
import { describe, expect, it } from "vitest";
import { loadCorpus } from "../src/manifest.js";
import { readHivemark } from "../src/adapters/hivemark.js";

describe("readHivemark", () => {
  it("projects every published attestation into an envelope", async () => {
    const envelopes = readHivemark(await loadCorpus("."));
    expect(envelopes.length).toBe(932);
  });

  it("takes subject from recipient, which is the claimant in this producer", async () => {
    const [first] = readHivemark(await loadCorpus("."));
    expect(first?.subject).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(first?.attester).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(first?.subject).not.toBe(first?.attester);
  });

  it("converts the occurrence time to ISO without inventing precision", async () => {
    const [first] = readHivemark(await loadCorpus("."));
    expect(first?.occurred_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run vitest run tests/adapters-hivemark.test.ts`
Expected: FAIL — cannot resolve `../src/adapters/hivemark.js`

- [ ] **Step 3: Write the implementation**

```ts
// src/envelope.ts

/**
 * The §5 envelope, and only the §5 envelope.
 *
 * `subject` is an opaque relation token. The three sources put different roles
 * in this slot — claimant in hivemark, observed in apex, producer in Pollen —
 * so nothing may join records across producers on it, and this type promises
 * nothing about what it denotes. `payload` is opaque to the reader by the same
 * rule: carried, never interpreted.
 */
export interface Envelope {
  readonly subject: string;
  readonly occurred_at: string;
  readonly payload: unknown;
  readonly id?: string;
  readonly type?: string;
  readonly version?: string;
  readonly attester?: string;
  /** Where in the frozen corpus this came from, so a finding can be checked. */
  readonly origin: { readonly file: string; readonly index: number };
}
```

```ts
// src/adapters/hivemark.ts
import type { Envelope } from "../envelope.js";

const decoder = new TextDecoder();

/** The published envelope's shape, as far as this reader needs it. */
interface StoredEnvelope {
  envelope_version: number;
  signer: string;
  identity_id: string;
  claim_hash: string;
  attestation: {
    uid: string;
    message: { schema: string; recipient: string; time: string; data: string; refUID: string };
  };
}

export function parseHivemark(files: Map<string, Uint8Array>, name: string): unknown {
  const bytes = files.get(name);
  if (!bytes) throw new Error(`not in corpus: ${name}`);
  return JSON.parse(decoder.decode(bytes));
}

/**
 * Project published attestations into envelopes.
 *
 * `subject` comes from `message.recipient`, which in this producer is the
 * reviewer that made the claim — the claimant, not the thing reviewed. That is
 * recorded, not corrected: correcting it here would be the reader inventing the
 * semantics M2 leaves unresolved.
 */
export function readHivemark(files: Map<string, Uint8Array>): Envelope[] {
  const raw = parseHivemark(files, "hivemark/attestations.json") as StoredEnvelope[];
  return raw.map((e, index) => ({
    subject: e.attestation.message.recipient,
    occurred_at: new Date(Number(e.attestation.message.time) * 1000).toISOString(),
    payload: { data: e.attestation.message.data, claim_hash: e.claim_hash, identity_id: e.identity_id },
    id: e.attestation.uid,
    type: e.attestation.message.schema,
    version: String(e.envelope_version),
    attester: e.signer,
    origin: { file: "hivemark/attestations.json", index },
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run vitest run tests/adapters-hivemark.test.ts`
Expected: PASS, 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/envelope.ts src/adapters/hivemark.ts tests/adapters-hivemark.test.ts
git commit -m "feat(reader): the §5 envelope and the hivemark adapter"
```

---

### Task 4: The apex adapter

Three artifact kinds, one adapter. `subject` here is the **observed** host — the opposite end of the relation from hivemark's, which is the whole point of M2 and must survive into the envelopes unflattened.

**Files:**
- Create: `src/adapters/apex.ts`
- Test: `tests/adapters-apex.test.ts`

**Interfaces:**
- Consumes: `Envelope` (Task 3), `loadCorpus` (Task 2)
- Produces: `function readApex(files: Map<string, Uint8Array>): Envelope[]`; `function apexHealth(files): { checkedAt: string; ok: boolean; entries: Record<string, ApexHealthEntry> }`; `function apexHistory(files): { updatedAt: string; hosts: Record<string, ApexHostRecord> }`; `function apexLog(files): ApexLogEntry[]` with `interface ApexLogEntry { file: string; title: string; date: string; claimed: string; observed: string; attested: string }`

- [ ] **Step 1: Write the failing test**

```ts
// tests/adapters-apex.test.ts
import { describe, expect, it } from "vitest";
import { loadCorpus } from "../src/manifest.js";
import { apexHealth, apexHistory, apexLog, readApex } from "../src/adapters/apex.js";

describe("readApex", () => {
  it("reads the snapshot, the folded history and every log entry", async () => {
    const files = await loadCorpus(".");
    expect(Object.keys(apexHealth(files).entries).length).toBe(8);
    expect(Object.keys(apexHistory(files).hosts).length).toBe(8);
    expect(apexLog(files).length).toBe(4);
  });

  it("takes subject from the host, which is the observed in this producer", async () => {
    const envelopes = readApex(await loadCorpus("."));
    const health = envelopes.filter((e) => e.origin.file === "apex/health.json");
    expect(health.every((e) => e.subject.endsWith(".zae.life"))).toBe(true);
    expect(health.every((e) => e.attester === undefined)).toBe(true);
  });

  it("gives every log entry a non-empty attested field", async () => {
    for (const entry of apexLog(await loadCorpus("."))) {
      expect(entry.attested.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run vitest run tests/adapters-apex.test.ts`
Expected: FAIL — cannot resolve `../src/adapters/apex.js`

- [ ] **Step 3: Write the implementation**

```ts
// src/adapters/apex.ts
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
    if (!match?.[1]) throw new Error(`no frontmatter in ${file}`);
    const field = (name: string): string => {
      const m = new RegExp(`^${name}:\\s*"?([\\s\\S]*?)"?\\s*$`, "m").exec(match[1] as string);
      return m?.[1] ?? "";
    };
    out.push({
      file,
      title: field("title"),
      date: field("date"),
      claimed: field("claimed"),
      observed: field("observed"),
      attested: field("attested"),
    });
  }
  return out;
}

/**
 * `subject` is the host — the thing observed. hivemark's subject is the
 * claimant. Both are carried as written; flattening them into one meaning is
 * the mistake §5 records and M2 leaves open.
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
      occurred_at: new Date(entry.date).toISOString(),
      payload: entry,
      origin: { file: entry.file, index },
    });
  });

  return envelopes;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run vitest run tests/adapters-apex.test.ts`
Expected: PASS, 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/adapters/apex.ts tests/adapters-apex.test.ts
git commit -m "feat(reader): the apex adapter, subject left as the observed"
```

---

### Task 5: Check I-1 — absence is a named state

The test is whether one representation holds both producers' judgement vocabularies without any value collapsing onto another. If it cannot, the invariant is falsified rather than the reader patched.

**Files:**
- Create: `src/checks/i1.ts`
- Test: `tests/i1.test.ts`

**Interfaces:**
- Consumes: `Finding`, `Verdict` (Task 1); `apexHealth`, `apexHistory` (Task 4); `parseHivemark` (Task 3)
- Produces: `function checkI1(files: Map<string, Uint8Array>): Finding[]`

- [ ] **Step 1: Write the failing test**

```ts
// tests/i1.test.ts
import { describe, expect, it } from "vitest";
import { loadCorpus } from "../src/manifest.js";
import { checkI1 } from "../src/checks/i1.js";

describe("I-1", () => {
  it("reports one finding per producer", async () => {
    const findings = checkI1(await loadCorpus("."));
    expect(findings.map((f) => f.producer).sort()).toEqual(["apex", "hivemark"]);
  });

  it("does not collapse a not-observed value onto a negative one", async () => {
    for (const f of checkI1(await loadCorpus("."))) {
      expect(["CONFORMS", "UNDECIDABLE"]).toContain(f.verdict);
      expect(f.reason.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run vitest run tests/i1.test.ts`
Expected: FAIL — cannot resolve `../src/checks/i1.js`

- [ ] **Step 3: Write the implementation**

```ts
// src/checks/i1.ts
import { parseHivemark } from "../adapters/hivemark.js";
import { apexHealth, apexHistory } from "../adapters/apex.js";
import type { Finding } from "../verdict.js";

/**
 * Verdict codes as published in the claim schema. Read from the artifacts'
 * own encoding rather than imported from hivemark: 0 is `unresolved` and must
 * never share a code with `confirmed`.
 */
const H_JUDGEMENTS = ["unresolved", "confirmed", "refuted", "uncertain"] as const;
const A_JUDGEMENTS = ["alive", "cold", "unknown"] as const;

/** The union both vocabularies must fit into without any value losing itself. */
type Held = { producer: string; value: string };

export function checkI1(files: Map<string, Uint8Array>): Finding[] {
  const held: Held[] = [
    ...H_JUDGEMENTS.map((value) => ({ producer: "hivemark", value })),
    ...A_JUDGEMENTS.map((value) => ({ producer: "apex", value })),
  ];
  const distinct = new Set(held.map((h) => `${h.producer}:${h.value}`));
  const collapsed = distinct.size !== held.length;

  const findings: Finding[] = [];

  // hivemark: the published attestations must actually exercise the third
  // state. A vocabulary that names `unresolved` but never emits it has not
  // demonstrated the invariant.
  const raw = parseHivemark(files, "hivemark/attestations.json") as Array<{
    attestation: { message: { data: string } };
  }>;
  // verdict is the tenth field of CLAIM_SCHEMA, a uint8 in the eleventh 32-byte
  // word after the head. Decoded properly in i4; here only its presence in the
  // corpus is needed, so the count of distinct trailing verdict bytes is used.
  const verdictBytes = new Set(
    raw.map((e) => e.attestation.message.data.slice(2).slice(9 * 64, 10 * 64)),
  );
  findings.push({
    invariant: "I-1",
    producer: "hivemark",
    verdict: collapsed ? "VIOLATES" : verdictBytes.size >= 2 ? "CONFORMS" : "UNDECIDABLE",
    reason: `${verdictBytes.size} distinct verdict values across ${raw.length} published attestations; the four-value vocabulary keeps unresolved apart from refuted`,
  });

  // apex: the snapshot must be able to say the check itself failed, and the
  // folded history must be able to say a run could not observe.
  const health = apexHealth(files);
  const history = apexHistory(files);
  const states = new Set(Object.values(history.hosts).map((h) => h.state));
  const hasSnapshotOk = typeof health.ok === "boolean";
  const hasGaps = Object.values(history.hosts).every((h) => typeof h.gaps === "number");
  findings.push({
    invariant: "I-1",
    producer: "apex",
    verdict:
      collapsed ? "VIOLATES"
      : hasSnapshotOk && hasGaps && states.size >= 1 ? "CONFORMS"
      : "UNDECIDABLE",
    reason: `snapshot carries ok:${health.ok} distinct from any entry verdict; every host record carries a gaps count; observed states ${[...states].join(", ")}`,
  });

  return findings;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run vitest run tests/i1.test.ts`
Expected: PASS, 2 tests

- [ ] **Step 5: Commit**

```bash
git add src/checks/i1.ts tests/i1.test.ts
git commit -m "check(I-1): both judgement vocabularies held without collapse"
```

---

### Task 6: Check I-2 — the recorded time is the occurrence

Artifact-level evidence for this is weak by construction, and the check must say so rather than manufacture confidence.

**Files:**
- Create: `src/checks/i2.ts`
- Test: `tests/i2.test.ts`

**Interfaces:**
- Consumes: `readHivemark` (Task 3), `readApex`/`apexHistory`/`apexHealth` (Task 4), `Manifest` (Task 2)
- Produces: `function checkI2(files: Map<string, Uint8Array>, extractedAt: string): Finding[]`

- [ ] **Step 1: Write the failing test**

```ts
// tests/i2.test.ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { loadCorpus, type Manifest } from "../src/manifest.js";
import { checkI2 } from "../src/checks/i2.js";

describe("I-2", () => {
  it("holds every occurrence time before the extraction time", async () => {
    const manifest: Manifest = JSON.parse(await readFile("corpus/manifest.json", "utf8"));
    const findings = checkI2(await loadCorpus("."), manifest.extracted_at);
    expect(findings.some((f) => f.verdict === "VIOLATES")).toBe(false);
  });

  it("does not claim more than artifacts can settle", async () => {
    const manifest: Manifest = JSON.parse(await readFile("corpus/manifest.json", "utf8"));
    const findings = checkI2(await loadCorpus("."), manifest.extracted_at);
    expect(findings.every((f) => f.reason.includes("occurrence"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run vitest run tests/i2.test.ts`
Expected: FAIL — cannot resolve `../src/checks/i2.js`

- [ ] **Step 3: Write the implementation**

```ts
// src/checks/i2.ts
import { readHivemark } from "../adapters/hivemark.js";
import { apexHealth, apexHistory } from "../adapters/apex.js";
import type { Finding } from "../verdict.js";

/** An hour, in ms. Used only to describe clustering, never to judge it. */
const HOUR = 3_600_000;

export function checkI2(files: Map<string, Uint8Array>, extractedAt: string): Finding[] {
  const cutoff = Date.parse(extractedAt);
  const findings: Finding[] = [];

  const times = readHivemark(files).map((e) => Date.parse(e.occurred_at));
  const future = times.filter((t) => t > cutoff).length;
  const spanHours = (Math.max(...times) - Math.min(...times)) / HOUR;
  // A publication timestamp would put every attestation inside one run's
  // window. A spread wider than that is consistent with an occurrence time and
  // does not prove it — the strong evidence is in the source, which this reader
  // does not read.
  findings.push({
    invariant: "I-2",
    producer: "hivemark",
    verdict: future > 0 ? "VIOLATES" : spanHours > 1 ? "CONFORMS" : "UNDECIDABLE",
    reason: `${times.length} occurrence times spread over ${spanHours.toFixed(1)}h, none after extraction; consistent with occurrence rather than publication, not proof of it`,
  });

  const health = apexHealth(files);
  const history = apexHistory(files);
  const checkedAt = Date.parse(health.checkedAt);
  const badSince = Object.entries(history.hosts).filter(
    ([, r]) => Date.parse(r.since) > checkedAt,
  );
  findings.push({
    invariant: "I-2",
    producer: "apex",
    verdict: checkedAt > cutoff || badSince.length > 0 ? "VIOLATES" : "CONFORMS",
    reason: `snapshot occurrence ${health.checkedAt} precedes extraction, and every host's since precedes it (${badSince.length} exceptions)`,
  });

  return findings;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run vitest run tests/i2.test.ts`
Expected: PASS, 2 tests

- [ ] **Step 5: Commit**

```bash
git add src/checks/i2.ts tests/i2.test.ts
git commit -m "check(I-2): occurrence times, and the limit of artifact-level evidence"
```

---

### Task 7: Checks I-3 and I-4 — the observation behind the conclusion, and recomputing derived state

I-4 is the heaviest check: `superseded` is recomputed from published bytes alone, without importing `supersede.ts`. I-3 is expected to expose that hivemark's derivation inputs live in a **different repository** and are pinned by digest but never published.

**Files:**
- Create: `src/checks/i3.ts`, `src/checks/i4.ts`
- Test: `tests/i3.test.ts`, `tests/i4.test.ts`

**Interfaces:**
- Consumes: `parseHivemark`, `readHivemark` (Task 3); `apexHealth` (Task 4); `decodeAbiParameters` from `viem`
- Produces: `function checkI3(files): Finding[]`; `function checkI4(files): Finding[]`; `function recomputeSuperseded(files): { groups: number; repeated: number; superseded: Set<string>; undecodable: number }`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/i3.test.ts
import { describe, expect, it } from "vitest";
import { loadCorpus } from "../src/manifest.js";
import { checkI3 } from "../src/checks/i3.js";

describe("I-3", () => {
  it("confirms apex keeps finalUrl behind every offSite conclusion", async () => {
    const apex = checkI3(await loadCorpus(".")).find((f) => f.producer === "apex");
    expect(apex?.verdict).toBe("CONFORMS");
  });

  it("reports hivemark UNDECIDABLE: inputs are pinned by digest but not published", async () => {
    const h = checkI3(await loadCorpus(".")).find((f) => f.producer === "hivemark");
    expect(h?.verdict).toBe("UNDECIDABLE");
    expect(h?.reason).toMatch(/digest/);
  });
});
```

```ts
// tests/i4.test.ts
import { describe, expect, it } from "vitest";
import { loadCorpus } from "../src/manifest.js";
import { checkI4, recomputeSuperseded } from "../src/checks/i4.js";

describe("I-4", () => {
  it("recomputes supersession from published bytes alone", async () => {
    const summary = recomputeSuperseded(await loadCorpus("."));
    expect(summary.groups).toBeGreaterThan(0);
    expect(summary.undecodable).toBe(0);
  });

  it("reports a verdict per producer", async () => {
    const findings = checkI4(await loadCorpus("."));
    expect(findings.map((f) => f.producer).sort()).toEqual(["apex", "hivemark"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run vitest run tests/i3.test.ts tests/i4.test.ts`
Expected: FAIL — cannot resolve `../src/checks/i3.js` and `../src/checks/i4.js`

- [ ] **Step 3: Write the implementations**

```ts
// src/checks/i3.ts
import { parseHivemark } from "../adapters/hivemark.js";
import { apexHealth } from "../adapters/apex.js";
import type { Finding } from "../verdict.js";

interface ProvenanceManifest {
  source: string;
  sha256: string;
  files: Array<{ path: string; sha256: string }>;
}

export function checkI3(files: Map<string, Uint8Array>): Finding[] {
  const findings: Finding[] = [];

  // hivemark publishes provenance.json, which pins each input of the derivation
  // by digest. The inputs themselves are not in the corpus — they live in
  // another repository entirely. So integrity is checkable given the files and
  // the derivation is not checkable without them. That is neither conformance
  // nor violation: the published record does not settle it.
  const provenance = parseHivemark(files, "hivemark/provenance.json") as ProvenanceManifest;
  const present = provenance.files.filter((f) => files.has(`hivemark/${f.path}`));
  findings.push({
    invariant: "I-3",
    producer: "hivemark",
    verdict: present.length === provenance.files.length ? "CONFORMS" : "UNDECIDABLE",
    reason: `provenance.json pins ${provenance.files.length} inputs by digest; ${present.length} of them are in the published corpus, so the derivation cannot be recomputed from what is published`,
  });

  // apex keeps the observation beside the conclusion inside one record.
  const health = apexHealth(files);
  const entries = Object.values(health.entries);
  const concluded = entries.filter((e) => e.offSite === true);
  const missingEvidence = concluded.filter((e) => e.finalUrl === null || e.finalUrl === undefined);
  findings.push({
    invariant: "I-3",
    producer: "apex",
    verdict: missingEvidence.length > 0 ? "VIOLATES" : "CONFORMS",
    reason: `${concluded.length} offSite conclusions across ${entries.length} entries, each carrying the finalUrl it was drawn from (${missingEvidence.length} without)`,
  });

  return findings;
}
```

```ts
// src/checks/i4.ts
import { decodeAbiParameters } from "viem";
import { parseHivemark } from "../adapters/hivemark.js";
import { apexHealth } from "../adapters/apex.js";
import type { Finding } from "../verdict.js";

/**
 * The claim schema's field types, in the order the published data encodes them.
 * Written out here rather than imported: importing hivemark's copy would make
 * this check agree with the producer by construction.
 */
const CLAIM_TYPES = [
  { type: "bytes32" }, { type: "string" }, { type: "uint32" }, { type: "string" },
  { type: "string" }, { type: "uint32" }, { type: "string" }, { type: "string" },
  { type: "uint8" }, { type: "uint8" }, { type: "uint8" }, { type: "bytes32" },
] as const;

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
    const key = JSON.stringify([decoded[0], decoded[1], Number(decoded[2]), decoded[3]]);
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

  return { groups: groups.size, repeated, superseded, undecodable };
}

export function checkI4(files: Map<string, Uint8Array>): Finding[] {
  const findings: Finding[] = [];

  const summary = recomputeSuperseded(files);
  // The invariant holds if supersession is recomputable by a third party
  // holding only the published set, and if no published record asserts it.
  const raw = parseHivemark(files, "hivemark/attestations.json") as Array<Record<string, unknown>>;
  const asserts = raw.some((e) => "superseded" in e);
  findings.push({
    invariant: "I-4",
    producer: "hivemark",
    verdict: asserts ? "VIOLATES" : summary.undecodable > 0 ? "UNDECIDABLE" : "CONFORMS",
    reason: `${summary.superseded.size} superseded attestations recomputed across ${summary.groups} review groups (${summary.repeated} repeated) from published bytes alone; no envelope stores the answer`,
  });

  // apex derives status at render time and publishes no status field. Whether
  // the rendered page agrees cannot be checked — the page is not in the corpus.
  const health = apexHealth(files);
  const stores = Object.values(health.entries).some((e) => "status" in (e as object));
  findings.push({
    invariant: "I-4",
    producer: "apex",
    verdict: stores ? "VIOLATES" : "UNDECIDABLE",
    reason: `no entry stores a derived status, but the rendered page is not in the corpus, so agreement between derivation and publication cannot be observed`,
  });

  return findings;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run vitest run tests/i3.test.ts tests/i4.test.ts`
Expected: PASS, 4 tests. If the I-3 hivemark assertion fails because the inputs *are* present, do not adjust the test to match — record it and report the opposite finding, which is a stronger result.

- [ ] **Step 5: Commit**

```bash
git add src/checks/i3.ts src/checks/i4.ts tests/i3.test.ts tests/i4.test.ts
git commit -m "check(I-3,I-4): pinned-but-absent inputs, and supersession recomputed independently"
```

---

### Task 8: Check I-5 — named periods, and a gap that cannot be observed

One anchor exists. A single period cannot exhibit a gap, so the no-backfill half must return `UNDECIDABLE` and must not be reported as conformance.

**Files:**
- Create: `src/checks/i5.ts`
- Test: `tests/i5.test.ts`

**Interfaces:**
- Consumes: `parseHivemark` (Task 3), `apexHistory` (Task 4)
- Produces: `function checkI5(files): Finding[]`; `function isoWeekOf(iso: string): string`

- [ ] **Step 1: Write the failing test**

```ts
// tests/i5.test.ts
import { describe, expect, it } from "vitest";
import { loadCorpus } from "../src/manifest.js";
import { checkI5, isoWeekOf } from "../src/checks/i5.js";

describe("isoWeekOf", () => {
  it("puts a January date in the previous year's final week when the rule says so", () => {
    expect(isoWeekOf("2027-01-01T00:00:00.000Z")).toBe("2026-W53");
  });

  it("names the week of a mid-August date", () => {
    expect(isoWeekOf("2026-08-14T00:00:00.000Z")).toBe("2026-W33");
  });
});

describe("I-5", () => {
  it("cannot decide the no-backfill half from a single anchor", async () => {
    const h = checkI5(await loadCorpus(".")).find((f) => f.producer === "hivemark");
    expect(h?.verdict).toBe("UNDECIDABLE");
    expect(h?.reason).toMatch(/one period/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run vitest run tests/i5.test.ts`
Expected: FAIL — cannot resolve `../src/checks/i5.js`

- [ ] **Step 3: Write the implementation**

```ts
// src/checks/i5.ts
import { parseHivemark } from "../adapters/hivemark.js";
import { apexHistory } from "../adapters/apex.js";
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
  const at = new Date(iso);
  const monday = mondayOf(at);
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
      malformed.length > 0 || miscounted.length > 0 ? "VIOLATES"
      : anchors.length < 2 ? "UNDECIDABLE"
      : "CONFORMS",
    reason: `${anchors.length} anchor(s), all named as valid ISO weeks with counts matching their uid lists; with one period a gap cannot be exhibited, so the no-backfill half is unobservable here`,
  });

  // apex: a host's `since` must not precede the first observation the record
  // supports, and gaps must be counted rather than absent.
  const history = apexHistory(files);
  const records = Object.values(history.hosts);
  const uncounted = records.filter((r) => typeof r.gaps !== "number");
  const impossible = records.filter((r) => Date.parse(r.since) > Date.parse(history.updatedAt));
  findings.push({
    invariant: "I-5",
    producer: "apex",
    verdict: uncounted.length > 0 || impossible.length > 0 ? "VIOLATES" : "CONFORMS",
    reason: `${records.length} host records, each carrying a gaps count and a since no later than the fold; holes are counted rather than absorbed`,
  });

  return findings;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run vitest run tests/i5.test.ts`
Expected: PASS, 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/checks/i5.ts tests/i5.test.ts
git commit -m "check(I-5): valid ISO periods, and a gap one period cannot show"
```

---

### Task 9: Checks I-6 and I-7 — the attester, and field ownership

I-6 is the invariant the spec predicted would be demoted. The check must let that happen rather than accept apex's `NOT_APPLICABLE` as support.

**Files:**
- Create: `src/checks/i6.ts`, `src/checks/i7.ts`
- Test: `tests/i6.test.ts`, `tests/i7.test.ts`

**Interfaces:**
- Consumes: `readHivemark` (Task 3); `apexHealth`, `apexHistory` (Task 4); `admits` (Task 1)
- Produces: `function checkI6(files): Finding[]`; `function checkI7(files): Finding[]`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/i6.test.ts
import { describe, expect, it } from "vitest";
import { loadCorpus } from "../src/manifest.js";
import { checkI6 } from "../src/checks/i6.js";
import { admits } from "../src/verdict.js";

describe("I-6", () => {
  it("confirms signer differs from recipient across every hivemark envelope", async () => {
    const h = checkI6(await loadCorpus(".")).find((f) => f.producer === "hivemark");
    expect(h?.verdict).toBe("CONFORMS");
  });

  it("reports apex NOT_APPLICABLE, and the demotion rule then sinks the invariant", async () => {
    const findings = checkI6(await loadCorpus("."));
    expect(findings.find((f) => f.producer === "apex")?.verdict).toBe("NOT_APPLICABLE");
    expect(admits(findings)).toBe("DEMOTED");
  });
});
```

```ts
// tests/i7.test.ts
import { describe, expect, it } from "vitest";
import { loadCorpus } from "../src/manifest.js";
import { checkI7 } from "../src/checks/i7.js";

describe("I-7", () => {
  it("finds no prose in the machine-written files", async () => {
    const a = checkI7(await loadCorpus(".")).find((f) => f.producer === "apex");
    expect(a?.verdict).toBe("CONFORMS");
  });

  it("says what artifacts cannot show about enforcement", async () => {
    for (const f of checkI7(await loadCorpus("."))) {
      expect(f.reason.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run vitest run tests/i6.test.ts tests/i7.test.ts`
Expected: FAIL — cannot resolve the two check modules

- [ ] **Step 3: Write the implementations**

```ts
// src/checks/i6.ts
import { readHivemark } from "../adapters/hivemark.js";
import { readApex } from "../adapters/apex.js";
import type { Finding } from "../verdict.js";

export function checkI6(files: Map<string, Uint8Array>): Finding[] {
  const h = readHivemark(files);
  const collisions = h.filter(
    (e) => e.attester !== undefined && e.attester.toLowerCase() === e.subject.toLowerCase(),
  );
  const findings: Finding[] = [
    {
      invariant: "I-6",
      producer: "hivemark",
      verdict: collisions.length > 0 ? "VIOLATES" : "CONFORMS",
      reason: `across ${h.length} envelopes the signer is never the recipient (${collisions.length} collisions); the publisher signs, the reviewer is signed about`,
    },
  ];

  // apex records no attester anywhere. The invariant cannot be exercised, which
  // is not the same as it holding — and by the demotion rule this leaves I-6
  // supported by a single producer under test.
  const a = readApex(files);
  const withAttester = a.filter((e) => e.attester !== undefined);
  findings.push({
    invariant: "I-6",
    producer: "apex",
    verdict: withAttester.length === 0 ? "NOT_APPLICABLE" : "CONFORMS",
    reason: `none of ${a.length} records names an attester, so the separation cannot be exercised; absence is evidence, not permission`,
  });

  return findings;
}
```

```ts
// src/checks/i7.ts
import { apexHealth, apexHistory } from "../adapters/apex.js";
import { parseHivemark } from "../adapters/hivemark.js";
import type { Finding } from "../verdict.js";

/** A machine-written value is a boolean, a number, null, or a timestamp/host string. */
function isMachineValue(v: unknown): boolean {
  if (v === null || typeof v === "boolean" || typeof v === "number") return true;
  if (typeof v !== "string") return false;
  // Prose is what a sentence looks like: spaces and words. Hosts, ISO stamps
  // and state names have none.
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
    reason: `${values.length} values across the two machine-written files, none of them prose (${prose.length} exceptions); the enforcement itself is a test inside the producer and is not observable here`,
  });

  // hivemark: `Judge` is derived from the genome and must never appear as a
  // stored input. Published attestations carry no genome at all, so the
  // artifacts cannot exhibit the separation either way.
  const raw = parseHivemark(files, "hivemark/attestations.json") as Array<Record<string, unknown>>;
  const carriesGenome = raw.some((e) => "genome" in e || "judge" in e);
  findings.push({
    invariant: "I-7",
    producer: "hivemark",
    verdict: carriesGenome ? "VIOLATES" : "UNDECIDABLE",
    reason: `no published attestation carries a genome or a judge field, so the derived-not-stored separation has nothing to be observed against in this corpus`,
  });

  return findings;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run vitest run tests/i6.test.ts tests/i7.test.ts`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/checks/i6.ts src/checks/i7.ts tests/i6.test.ts tests/i7.test.ts
git commit -m "check(I-6,I-7): the attester separation apex cannot exercise"
```

---

### Task 10: Checks I-8 and I-9 — self-stated limits and counted failures

Both were predicted to come back single-source, because the discipline runs inside the producers and does not survive into what they publish.

**Files:**
- Create: `src/checks/i8.ts`, `src/checks/i9.ts`
- Test: `tests/i8.test.ts`, `tests/i9.test.ts`

**Interfaces:**
- Consumes: `apexLog`, `apexHistory` (Task 4); `parseHivemark` (Task 3)
- Produces: `function checkI8(files): Finding[]`; `function checkI9(files): Finding[]`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/i8.test.ts
import { describe, expect, it } from "vitest";
import { loadCorpus } from "../src/manifest.js";
import { checkI8 } from "../src/checks/i8.js";

describe("I-8", () => {
  it("confirms every apex log entry names the limit of its testimony", async () => {
    const a = checkI8(await loadCorpus(".")).find((f) => f.producer === "apex");
    expect(a?.verdict).toBe("CONFORMS");
  });

  it("reports hivemark UNDECIDABLE: the unverifiable list is not published", async () => {
    const h = checkI8(await loadCorpus(".")).find((f) => f.producer === "hivemark");
    expect(h?.verdict).toBe("UNDECIDABLE");
  });
});
```

```ts
// tests/i9.test.ts
import { describe, expect, it } from "vitest";
import { loadCorpus } from "../src/manifest.js";
import { checkI9 } from "../src/checks/i9.js";

describe("I-9", () => {
  it("confirms apex publishes a gaps count per host", async () => {
    const a = checkI9(await loadCorpus(".")).find((f) => f.producer === "apex");
    expect(a?.verdict).toBe("CONFORMS");
  });

  it("reports hivemark UNDECIDABLE: the undecodable count is computed, not published", async () => {
    const h = checkI9(await loadCorpus(".")).find((f) => f.producer === "hivemark");
    expect(h?.verdict).toBe("UNDECIDABLE");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run vitest run tests/i8.test.ts tests/i9.test.ts`
Expected: FAIL — cannot resolve the two check modules

- [ ] **Step 3: Write the implementations**

```ts
// src/checks/i8.ts
import { apexLog } from "../adapters/apex.js";
import { parseHivemark } from "../adapters/hivemark.js";
import type { Finding } from "../verdict.js";

export function checkI8(files: Map<string, Uint8Array>): Finding[] {
  const entries = apexLog(files);
  const unbounded = entries.filter((e) => e.attested.trim().length === 0);
  const findings: Finding[] = [
    {
      invariant: "I-8",
      producer: "apex",
      verdict: entries.length === 0 ? "UNDECIDABLE" : unbounded.length > 0 ? "VIOLATES" : "CONFORMS",
      reason: `${entries.length} log entries, each naming what it does not establish (${unbounded.length} without)`,
    },
  ];

  // hivemark states the limit of a signature in prose and in verifyEnvelope's
  // return value. Neither reaches the published artifacts.
  const raw = parseHivemark(files, "hivemark/attestations.json") as Array<Record<string, unknown>>;
  const carriesLimit = raw.some((e) => "unverifiable" in e || "limits" in e);
  findings.push({
    invariant: "I-8",
    producer: "hivemark",
    verdict: carriesLimit ? "CONFORMS" : "UNDECIDABLE",
    reason: `no published envelope carries the unverifiable list; verifyEnvelope produces it at read time and it does not survive into the artifact`,
  });

  return findings;
}
```

```ts
// src/checks/i9.ts
import { apexHistory } from "../adapters/apex.js";
import { parseHivemark } from "../adapters/hivemark.js";
import type { Finding } from "../verdict.js";

export function checkI9(files: Map<string, Uint8Array>): Finding[] {
  const records = Object.values(apexHistory(files).hosts);
  const uncounted = records.filter((r) => typeof r.gaps !== "number");
  const findings: Finding[] = [
    {
      invariant: "I-9",
      producer: "apex",
      verdict: uncounted.length > 0 ? "VIOLATES" : "CONFORMS",
      reason: `every one of ${records.length} host records publishes a gaps count, so runs that could not observe are visible in the artifact`,
    },
  ];

  const raw = parseHivemark(files, "hivemark/attestations.json") as Array<Record<string, unknown>>;
  const carriesCount = raw.some((e) => "undecodable" in e);
  findings.push({
    invariant: "I-9",
    producer: "hivemark",
    verdict: carriesCount ? "CONFORMS" : "UNDECIDABLE",
    reason: `supersede computes an undecodable count and reports it to its caller; no published artifact carries it, so the corpus cannot show whether unreadable input was counted`,
  });

  return findings;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run vitest run tests/i8.test.ts tests/i9.test.ts`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/checks/i8.ts src/checks/i9.ts tests/i8.test.ts tests/i9.test.ts
git commit -m "check(I-8,I-9): limits and counts that do not survive into the artifacts"
```

---

### Task 11: The report, and the first conformance run

The report applies the demotion rule mechanically and writes the result. It must not summarise favourably: the count of `ADMITTED` invariants is whatever `admits` returns.

**Files:**
- Create: `src/report.ts`, `src/cli.ts`
- Create: `docs/reports/2026-08-28-conformance-01.md` (generated by the run, committed)
- Test: `tests/report.test.ts`

**Interfaces:**
- Consumes: every `checkI*` (Tasks 5–10), `admits` (Task 1), `loadCorpus` and `Manifest` (Task 2)
- Produces: `function runAll(files, extractedAt): Finding[]`; `function renderReport(findings, meta): string`

- [ ] **Step 1: Write the failing test**

```ts
// tests/report.test.ts
import { describe, expect, it } from "vitest";
import { renderReport, runAll } from "../src/report.js";
import { loadCorpus } from "../src/manifest.js";

describe("report", () => {
  it("produces a finding for every invariant and producer", async () => {
    const findings = runAll(await loadCorpus("."), "2026-08-28T00:00:00.000Z");
    const invariants = new Set(findings.map((f) => f.invariant));
    expect(invariants.size).toBe(9);
  });

  it("never reports an invariant as ADMITTED on a NOT_APPLICABLE", async () => {
    const findings = runAll(await loadCorpus("."), "2026-08-28T00:00:00.000Z");
    const text = renderReport(findings, { extracted_at: "2026-08-28T00:00:00.000Z", artifacts: 11 });
    const i6 = text.split("\n").find((l) => l.startsWith("| I-6"));
    expect(i6).toMatch(/DEMOTED/);
  });

  it("states the count of admitted invariants without rounding it up", async () => {
    const findings = runAll(await loadCorpus("."), "2026-08-28T00:00:00.000Z");
    const text = renderReport(findings, { extracted_at: "2026-08-28T00:00:00.000Z", artifacts: 11 });
    expect(text).toMatch(/ADMITTED: \d of 9/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run vitest run tests/report.test.ts`
Expected: FAIL — cannot resolve `../src/report.js`

- [ ] **Step 3: Write the implementation**

```ts
// src/report.ts
import { checkI1 } from "./checks/i1.js";
import { checkI2 } from "./checks/i2.js";
import { checkI3 } from "./checks/i3.js";
import { checkI4 } from "./checks/i4.js";
import { checkI5 } from "./checks/i5.js";
import { checkI6 } from "./checks/i6.js";
import { checkI7 } from "./checks/i7.js";
import { checkI8 } from "./checks/i8.js";
import { checkI9 } from "./checks/i9.js";
import { admits, type Finding } from "./verdict.js";

export function runAll(files: Map<string, Uint8Array>, extractedAt: string): Finding[] {
  return [
    ...checkI1(files),
    ...checkI2(files, extractedAt),
    ...checkI3(files),
    ...checkI4(files),
    ...checkI5(files),
    ...checkI6(files),
    ...checkI7(files),
    ...checkI8(files),
    ...checkI9(files),
  ];
}

export interface ReportMeta {
  readonly extracted_at: string;
  readonly artifacts: number;
}

export function renderReport(findings: readonly Finding[], meta: ReportMeta): string {
  const invariants = [...new Set(findings.map((f) => f.invariant))].sort();
  const rows = invariants.map((id) => {
    const own = findings.filter((f) => f.invariant === id);
    const byProducer = own.map((f) => `${f.producer}: ${f.verdict}`).join(" · ");
    return `| ${id} | ${byProducer} | ${admits(own)} |`;
  });
  const admitted = invariants.filter((id) =>
    admits(findings.filter((f) => f.invariant === id)) === "ADMITTED",
  ).length;

  const detail = findings
    .map((f) => `- **${f.invariant} · ${f.producer} — ${f.verdict}.** ${f.reason}`)
    .join("\n");

  return `# p-e conformance report 01

Corpus extracted at ${meta.extracted_at}, ${meta.artifacts} artifacts, digests in
\`corpus/manifest.json\`. The extraction time is not an occurrence time and is
recorded separately from every timestamp inside the artifacts.

**ADMITTED: ${admitted} of 9.**

An invariant is ADMITTED only when two distinct producers CONFORM. NOT_APPLICABLE
and UNDECIDABLE are not support, and one VIOLATES sinks an invariant outright.

| invariant | verdicts | result |
|---|---|---|
${rows.join("\n")}

## Findings

${detail}
`;
}
```

```ts
// src/cli.ts
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { loadCorpus, type Manifest } from "./manifest.js";
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
```

- [ ] **Step 4: Run the full suite, then the reader**

Run: `bun run vitest run && bun run typecheck && bun run lint && bun run conform`
Expected: all tests pass, and `docs/reports/2026-08-28-conformance-01.md` is written.

Then **read the report against the spec's §9 prediction** and record the comparison in the report itself, under a heading `## Against the prediction`. The spec predicted I-6, I-8 and I-9 would come back UNDECIDABLE and I-6 would be demoted outright. Write what actually happened, including where the prediction was wrong. Do not edit the prediction.

- [ ] **Step 5: Commit**

```bash
git add src/report.ts src/cli.ts tests/report.test.ts docs/reports/
git commit -m "feat(reader): the first conformance report

Records what the falsifier returned, and how it compares to the prediction
the spec made before the reader existed."
```

---

## After the run

The report is the input to the next decision, not the end of it. Once it exists:

1. Demote every invariant the report demotes — move it from spec §3 to spec §4, with the report's reason.
2. Update each invariant's `status:` block from `PREDICTED` to `ADMITTED` or `REJECTED`, with the reason where rejected.
3. Update spec §6's status table so the `ADMITTED` count is no longer zero — or record that it still is.
4. Only then reopen the core envelope. `subject`, `payload` and `occurred_at` are still predictions until this report says otherwise.

Nothing in this plan builds the codec, the profile, `bee.zae`, or an MCP server over events. Those wait behind the report by the sequencing agreed in relay-0007.
