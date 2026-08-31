import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
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
  function store(records: string[], markers: string[]): string {
    const root = join(mkdtempSync(join(tmpdir(), "p-e-mk-")), "relay");
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
      orphaned: [],
      unmarked: [],
    });
  });

  it("names a marker with no record — the state that was invisible", async () => {
    const root = store(["relay-0001"], ["relay-0001", "relay-0002"]);
    const { orphaned, unmarked } = await markerAgreement(await loadStore(root), root);
    // relay-0002 was bound and nothing occupies it. Indistinguishable here from
    // an id never used — except that the marker exists, which is the whole point.
    expect(orphaned).toEqual(["relay-0002"]);
    expect(unmarked).toEqual([]);
  });

  it("names a record with no marker — every store written before MUST 1", async () => {
    const root = store(["relay-0001", "relay-0002"], ["relay-0001"]);
    const { orphaned, unmarked } = await markerAgreement(await loadStore(root), root);
    expect(unmarked).toEqual(["relay-0002"]);
    expect(orphaned).toEqual([]);
  });

  it("treats a missing history/ as no markers rather than an error", async () => {
    const root = join(mkdtempSync(join(tmpdir(), "p-e-mk-")), "relay");
    mkdirSync(root, { recursive: true });
    writeFileSync(
      join(root, "relay-0001.txt"),
      "deposited-by: t\nprovenance: authored\nassigned-id: relay-0001\n---\n@p-e/x0\nfrom: a\n\nb\n",
    );
    // A store from before the mechanism existed. Every record unmarked, no orphans,
    // and not a failure — `survey` backfills on the next deposit.
    expect(await markerAgreement(await loadStore(root), root)).toEqual({
      orphaned: [],
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
      orphaned: [],
      unmarked: [],
    });
  });
});
