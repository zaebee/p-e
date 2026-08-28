import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type Reference, checkReferences, tallyReferences } from "../src/relay/reference.js";
import { loadStore } from "../src/relay/store.js";

function store(records: Record<string, string>): string {
  const root = join(mkdtempSync(join(tmpdir(), "p-e-ref-")), "relay");
  mkdirSync(root, { recursive: true });
  for (const [id, body] of Object.entries(records)) {
    writeFileSync(
      join(root, `${id}.txt`),
      `deposited-by: tester\nprovenance: authored\n---\n${body}`,
    );
  }
  return root;
}

const plain = (id: string, extra = "", body = "text") =>
  `@p-e/x0\nid: ${id}\nfrom: alice\n${extra}\n${body}\n`;

async function stateOf(root: string, id: string): Promise<Reference> {
  const found = checkReferences(await loadStore(root)).find((f) => f.id === id);
  if (!found) throw new Error(`no finding for ${id}`);
  return found.state;
}

describe("checkReferences", () => {
  it("REFERENCED when a later record names it as a parent", async () => {
    const root = store({
      "relay-0001": plain("relay-0001"),
      "relay-0002": plain("relay-0002", "parent: relay-0001"),
      "relay-0003": plain("relay-0003"),
    });
    expect(await stateOf(root, "relay-0001")).toBe("REFERENCED");
  });

  it("REFERENCED through `ref:` as well as `parent:`", async () => {
    const root = store({
      "relay-0001": plain("relay-0001"),
      "relay-0002": plain("relay-0002", "ref: relay-0001"),
      "relay-0003": plain("relay-0003"),
    });
    expect(await stateOf(root, "relay-0001")).toBe("REFERENCED");
  });

  // The store derives its graph from headers alone, on purpose: a comment in
  // store.ts once cited relay-0029..0031 as KNOWN_MISSING because they appear in
  // another record's prose, and that inference was wrong. Prose is reported here
  // as its own state rather than folded into the graph, so the same inference
  // cannot be made by accident a second time.
  it("PROSE_ONLY when only a body mentions it", async () => {
    const root = store({
      "relay-0001": plain("relay-0001"),
      "relay-0002": plain("relay-0002", "", "as relay-0001 showed, the check holds"),
      "relay-0003": plain("relay-0003"),
    });
    expect(await stateOf(root, "relay-0001")).toBe("PROSE_ONLY");
  });

  it("UNREFERENCED when nothing names it and successors existed to do so", async () => {
    const root = store({
      "relay-0001": plain("relay-0001"),
      "relay-0002": plain("relay-0002"),
      "relay-0003": plain("relay-0003"),
    });
    expect(await stateOf(root, "relay-0001")).toBe("UNREFERENCED");
  });

  // The distinction the report exists for. Nothing can reference the newest
  // record, so calling it unreferenced would report our position in time as a
  // property of the record.
  it("NO_SUCCESSORS for the newest record, never UNREFERENCED", async () => {
    const root = store({
      "relay-0001": plain("relay-0001"),
      "relay-0002": plain("relay-0002"),
    });
    expect(await stateOf(root, "relay-0002")).toBe("NO_SUCCESSORS");
  });

  it("does not count a record's mention of its own id", async () => {
    const root = store({
      "relay-0001": plain("relay-0001", "", "this is relay-0001 speaking"),
      "relay-0002": plain("relay-0002"),
    });
    expect(await stateOf(root, "relay-0001")).toBe("UNREFERENCED");
  });

  it("does not read the header block as prose", async () => {
    // `parent: relay-0001` must count once, as a structural reference, and not
    // also as a prose mention — otherwise every parent link would report twice.
    const root = store({
      "relay-0001": plain("relay-0001"),
      "relay-0002": plain("relay-0002", "parent: relay-0001"),
      "relay-0003": plain("relay-0003"),
    });
    const f = checkReferences(await loadStore(root)).find((x) => x.id === "relay-0001");
    expect(f?.referencedBy).toEqual(["relay-0002"]);
    expect(f?.mentionedBy).toEqual([]);
  });

  it("counts successors so a reader can judge how much silence means", async () => {
    const root = store({
      "relay-0001": plain("relay-0001"),
      "relay-0002": plain("relay-0002"),
      "relay-0003": plain("relay-0003"),
    });
    const findings = checkReferences(await loadStore(root));
    expect(findings.map((f) => f.successors)).toEqual([2, 1, 0]);
  });

  it("reports one finding per record, in id order", async () => {
    const root = store({
      "relay-0002": plain("relay-0002"),
      "relay-0001": plain("relay-0001"),
    });
    expect(checkReferences(await loadStore(root)).map((f) => f.id)).toEqual([
      "relay-0001",
      "relay-0002",
    ]);
  });
});

describe("tallyReferences", () => {
  it("reports every state, including ones no record occupies", async () => {
    const root = store({ "relay-0001": plain("relay-0001") });
    const counts = tallyReferences(checkReferences(await loadStore(root)));
    expect(counts.NO_SUCCESSORS).toBe(1);
    expect(counts.PROSE_ONLY).toBe(0);
    expect(counts.UNREFERENCED).toBe(0);
  });
});

describe("the live store", () => {
  it("answers the question chatgpt asked, without inventing a threshold", async () => {
    const findings = checkReferences(await loadStore());
    // Not a pinned population: this is a snapshot and the point of the report is
    // that it must be read across time. What is asserted is that the report is
    // total — every held record gets exactly one state.
    const counts = tallyReferences(findings);
    const summed = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(summed).toBe(findings.length);
    expect(findings.length).toBeGreaterThan(80);
  });
});
