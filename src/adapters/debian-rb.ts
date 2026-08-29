import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Adapter for the Debian reproducible-builds (r-b) producer.
 *
 * This is NOT a producer in the conformance catalogue. It is read here only as
 * an experiment: a second agent (relay-hy3) re-deriving field mappings from the
 * frozen bytes in `docs/experiments/debian-rb-bytes/`, against a hypothesis
 * previously published by another agent (relay-0119). The corpus format cannot
 * hold this source (scripts/freeze-corpus.ts expects a producer git repo with a
 * sourceRev), so nothing here enters corpus/manifest.json and no conformance
 * run is emitted. Results land in docs/experiments/, labelled NOT A RUN.
 *
 * Bytes read (frozen, pinned by docs/experiments/debian-rb-retrieval.md):
 *   b.json                 v1/builds?release=experimental&architecture=arm64
 *                           (truncated by the server to the first 1000 of 4710)
 *   v0.rs                  rebuilderd common/src/api/v0/mod.rs  (Status enum)
 *   v1build.rs             rebuilderd common/src/api/v1/models/build.rs (BuildStatus)
 *   v0-arm64-stride1000.json   every 1000th record of v0/pkgs/list?distro=debian
 *                           (490 records), pinned per relay-0130 §4 by claude,
 *                           executed verbatim from hy3's rule. Carries status,
 *                           build_id, artifact_url, has_attestation, has_diffoscope.
 *   v0-arm64-unkwn-all.json.gz  all 107,144 UNKWN records of that same list.
 */

const BYTES = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "docs",
  "experiments",
  "debian-rb-bytes",
);

export interface RbBuild {
  id: number;
  name: string;
  version: string;
  distribution: string;
  release: string;
  architecture: string;
  backend: string;
  retries: number;
  started_at: string;
  built_at: string | null;
  status: string;
}

export interface DebianRb {
  /** Path the builds artifact was read from. */
  path: string;
  /** `total` reported by the API (the full set); records is truncated to 1000. */
  total: number;
  builds: RbBuild[];
  /** Distinct status values OBSERVED in the fetched records. */
  statusValues: string[];
  /** retries>0 counts, by status, OBSERVED in the fetched records. */
  retriesByStatus: Record<string, { count: number; withRetries: number }>;
  /** Status variants named in v0 source (rebuilderd api/v0), or null if the enum is absent. */
  v0Status: string[] | null;
  /** BuildStatus variants named in v1 source (rebuilderd api/v1), or null if the enum is absent. */
  v1BuildStatus: string[] | null;
  /** Distinct status values OBSERVED in the pinned v0/pkgs/list stride sample. */
  pkgStatusValues: string[];
  /** v0 package records carry a retrievable input trace (build_id + artifact_url + attestation/diffoscope). */
  pkgCarryTrace: boolean;
  /** v0 BAD records lacking has_diffoscope (proves the boolean is independent, not derived). */
  pkgBadWithoutDiffoscope: number;
  /** v0 UNKWN records lacking build_id. */
  pkgUnkwnWithoutBuildId: number;
  /** v0 records carry any explicit boundary/limit field (attested/limit/scope). */
  pkgHasBoundaryField: boolean;
  /** Stored derived counts from the pinned dashboard (release=trixie, arm64), or null if not pinned. */
  dashboard: { good: number; bad: number; fail: number; unknown: number } | null;
  /** Recomputed counts from the pinned source-all walk, or null if not pinned. */
  recomputed: {
    all: { good: number; bad: number; fail: number };
    syncedTrue: { good: number; bad: number; fail: number };
    syncedFalse: { good: number; bad: number; fail: number };
  } | null;
  /** Number of dashboard-vs-recomputed disagreements (0 = falsifier not fired). */
  recomputeDisagreement: number;
}

/** Pull enum variant identifiers out of a Rust `enum Name { .. }` block.
 * Returns null (not []) when the enum is absent from the source, so a missing
 * enum is distinguishable from an enum that genuinely declares no variants. */
function rustEnumVariants(src: string, name: string): string[] | null {
  const re = new RegExp(`enum\\s+${name}\\s*\\{([\\s\\S]*?)\\}`);
  const m = src.match(re);
  if (!m) return null;
  const body = m[1] ?? "";
  return body
    .split(/[,\n]/)
    .map((s) => s.replace(/\/\/.*$/, "").trim())
    .filter((s) => /^[A-Za-z][A-Za-z0-9_]*$/.test(s));
}

export async function readDebianRb(): Promise<DebianRb> {
  const buildsRaw = JSON.parse(await readFile(join(BYTES, "b.json"), "utf8")) as {
    total: number;
    records: RbBuild[];
  };
  const builds = buildsRaw.records;

  const statusValues = [...new Set(builds.map((b) => b.status))].sort();
  const retriesByStatus: Record<string, { count: number; withRetries: number }> = {};
  for (const b of builds) {
    let e = retriesByStatus[b.status];
    if (!e) {
      e = { count: 0, withRetries: 0 };
      retriesByStatus[b.status] = e;
    }
    e.count++;
    if (b.retries > 0) e.withRetries++;
  }

  const v0Src = await readFile(join(BYTES, "v0.rs"), "utf8");
  const v1Src = await readFile(join(BYTES, "v1build.rs"), "utf8");

  const pkgRaw = JSON.parse(
    await readFile(join(BYTES, "v0-arm64-stride1000.json"), "utf8"),
  ) as Array<{
    status: string;
    build_id?: number;
    artifact_url?: string;
    has_attestation?: boolean;
    has_diffoscope?: boolean;
  }>;
  const pkgStatusValues = [...new Set(pkgRaw.map((r) => r.status))].sort();
  const pkgCarryTrace =
    pkgRaw.length > 0 &&
    pkgRaw.every(
      (r) =>
        "build_id" in r &&
        (typeof r.artifact_url === "string" ||
          r.has_attestation === true ||
          r.has_diffoscope === true),
    );
  const pkgBad = pkgRaw.filter((r) => r.status === "BAD");
  const pkgBadWithoutDiffoscope = pkgBad.filter((r) => r.has_diffoscope !== true).length;
  const pkgUnkwnWithoutBuildId = pkgRaw.filter(
    (r) => r.status === "UNKWN" && typeof r.build_id !== "number",
  ).length;
  const pkgHasBoundaryField = pkgRaw.some(
    (r) => "limit" in r || "boundary" in r || "attested" in r || "scope" in r,
  );

  let dashboard: DebianRb["dashboard"] = null;
  let recomputed: DebianRb["recomputed"] = null;
  let recomputeDisagreement = 0;
  try {
    const dashRaw = JSON.parse(
      await readFile(join(BYTES, "v1-trixie-arm64-dashboard.json"), "utf8"),
    ) as { rebuilds: { good: number; bad: number; fail: number; unknown: number } };
    dashboard = dashRaw.rebuilds;
    const srcRaw = gunzipSync(
      await readFile(join(BYTES, "v1-trixie-arm64-source-all.json.gz")),
    ).toString("utf8");
    const src = JSON.parse(srcRaw) as Array<{ status: string; seen_in_last_sync: boolean }>;
    const count = (pred: (r: { status: string; seen_in_last_sync: boolean }) => boolean) =>
      src.filter(pred).length;
    const all = {
      good: count((r) => r.status === "GOOD"),
      bad: count((r) => r.status === "BAD"),
      fail: count((r) => r.status === "FAIL"),
    };
    const syncedTrue = {
      good: count((r) => r.seen_in_last_sync && r.status === "GOOD"),
      bad: count((r) => r.seen_in_last_sync && r.status === "BAD"),
      fail: count((r) => r.seen_in_last_sync && r.status === "FAIL"),
    };
    const syncedFalse = {
      good: count((r) => !r.seen_in_last_sync && r.status === "GOOD"),
      bad: count((r) => !r.seen_in_last_sync && r.status === "BAD"),
      fail: count((r) => !r.seen_in_last_sync && r.status === "FAIL"),
    };
    recomputed = { all, syncedTrue, syncedFalse };
    if (
      syncedTrue.good !== dashboard.good ||
      syncedTrue.bad !== dashboard.bad ||
      syncedTrue.fail !== dashboard.fail
    ) {
      recomputeDisagreement++;
    }
  } catch {
    // artifacts not pinned; I-4 falls back to the absence reasoning in the check
  }

  return {
    path: join(BYTES, "b.json"),
    total: buildsRaw.total,
    builds,
    statusValues,
    retriesByStatus,
    v0Status: rustEnumVariants(v0Src, "Status"),
    v1BuildStatus: rustEnumVariants(v1Src, "BuildStatus"),
    pkgStatusValues,
    pkgCarryTrace,
    pkgBadWithoutDiffoscope,
    pkgUnkwnWithoutBuildId,
    pkgHasBoundaryField,
    dashboard,
    recomputed,
    recomputeDisagreement,
  };
}
