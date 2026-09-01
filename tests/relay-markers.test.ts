import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadStore, markerAgreement, markerDir } from "../src/relay/store.js";

/**
 * Markers against records — the comparison nothing made until 2026-08-31.
 *
 * `checkContinuity` cannot see an id that was bound and holds nothing: there is
 * no record to report it on, and an absent id looks the same whether it was
 * never used or was used and lost. The marker is the only thing that tells them
 * apart, and until this function nothing asked it. `relay-0683` is that state in
 * the live store.
 */
describe("markerAgreement", () => {
  // Every store built here is removed afterwards. No test in this repository did
  // that before — gemini-code-assist on PR #10 — and eight files create temporary
  // directories, so the leak is older and wider than this one.
  const made: string[] = [];
  afterEach(() => {
    for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function scratch(): string {
    const root = join(mkdtempSync(join(tmpdir(), "p-e-mk-")), "relay");
    made.push(join(root, ".."));
    return root;
  }

  function store(records: string[], markers: string[]): string {
    const root = scratch();
    mkdirSync(markerDir(root), { recursive: true });
    for (const id of records)
      writeFileSync(
        join(root, `${id}.txt`),
        `deposited-by: t\nprovenance: authored\nassigned-id: ${id}\n---\n@p-e/x0\nfrom: a\n\nb\n`,
      );
    for (const id of markers) writeFileSync(join(markerDir(root), id), "");
    return root;
  }

  it("agrees when every record has a marker and every marker a record", async () => {
    const root = store(["relay-0001", "relay-0002"], ["relay-0001", "relay-0002"]);
    expect(await markerAgreement(await loadStore(root), root)).toEqual({
      lost: [],
      deleted: [],
      unmarked: [],
    });
  });

  it("calls a marker LOST when nothing names the id — the state that was invisible", async () => {
    const root = store(["relay-0001"], ["relay-0001", "relay-0002"]);
    const { lost, deleted, unmarked } = await markerAgreement(await loadStore(root), root);
    // Nothing names relay-0002, so no record ever landed there — a crash between
    // the claim and the write. This is relay-0683's shape in the live store.
    expect(lost).toEqual(["relay-0002"]);
    expect(deleted).toEqual([]);
    expect(unmarked).toEqual([]);
  });

  it("calls it DELETED when a survivor names it — the state the marker is for", async () => {
    // relay-0002 is deposited, named by relay-0003, then removed. The marker
    // survives by design and the id is spent; that is MUST 1 working, not a
    // defect. A first version of this check failed the suite on it.
    const root = store(["relay-0001", "relay-0003"], ["relay-0001", "relay-0002", "relay-0003"]);
    writeFileSync(
      join(root, "relay-0003.txt"),
      "deposited-by: t\nprovenance: authored\nassigned-id: relay-0003\n---\n@p-e/x0\nparent: relay-0002\nfrom: a\n\nb\n",
    );
    const { lost, deleted } = await markerAgreement(await loadStore(root), root);
    expect(deleted).toEqual(["relay-0002"]);
    expect(lost).toEqual([]);
  });

  it("names a record with no marker — every store written before MUST 1", async () => {
    const root = store(["relay-0001", "relay-0002"], ["relay-0001"]);
    const { lost, deleted, unmarked } = await markerAgreement(await loadStore(root), root);
    expect(unmarked).toEqual(["relay-0002"]);
    expect(lost).toEqual([]);
    expect(deleted).toEqual([]);
  });

  it("treats a missing history/ as no markers rather than an error", async () => {
    const root = scratch();
    mkdirSync(root, { recursive: true });
    writeFileSync(
      join(root, "relay-0001.txt"),
      "deposited-by: t\nprovenance: authored\nassigned-id: relay-0001\n---\n@p-e/x0\nfrom: a\n\nb\n",
    );
    // A store from before the mechanism existed. Every record unmarked, no orphans,
    // and not a failure — `survey` backfills on the next deposit.
    expect(await markerAgreement(await loadStore(root), root)).toEqual({
      lost: [],
      deleted: [],
      unmarked: ["relay-0001"],
    });
  });

  it("ignores names on either side that are not ids", async () => {
    const root = store(["relay-0001"], ["relay-0001"]);
    writeFileSync(join(markerDir(root), ".DS_Store"), "");
    writeFileSync(
      join(root, "notes.txt"),
      "deposited-by: t\nprovenance: authored\n---\n@p-e/x0\n\nx\n",
    );
    expect(await markerAgreement(await loadStore(root), root)).toEqual({
      lost: [],
      deleted: [],
      unmarked: [],
    });
  });
});
