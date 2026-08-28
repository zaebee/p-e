import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type Continuity, checkContinuity, tally } from "../src/relay/continuity.js";
import { loadStore } from "../src/relay/store.js";

/** A store built one record at a time, so each case states its own bytes. */
function store(records: Record<string, string>): string {
  const root = join(mkdtempSync(join(tmpdir(), "p-e-cont-")), "relay");
  mkdirSync(root, { recursive: true });
  for (const [id, body] of Object.entries(records)) {
    writeFileSync(
      join(root, `${id}.txt`),
      `deposited-by: tester\nprovenance: authored\n---\n${body}`,
    );
  }
  return root;
}

const parent = "@p-e/x0\nid: relay-0001\nfrom: alice\n\nthe parent body\n";
/** The store digests the record body — everything after the deposit header. */
const parentDigest = "a2d0ae4bd45d4c2b2cb1ff9d16ac0dc4b1f4e1cf1e1cbdb9c1b2a2b0b1a83e11";

async function stateOf(root: string, id: string): Promise<Continuity> {
  const found = checkContinuity(await loadStore(root)).find((f) => f.id === id);
  if (!found) throw new Error(`no finding for ${id}`);
  return found.state;
}

describe("checkContinuity", () => {
  it("MATCHES when the declared digest is the parent's store digest", async () => {
    const root = store({ "relay-0001": parent });
    const real = (await loadStore(root)).get("relay-0001")?.sha256;
    writeFileSync(
      join(root, "relay-0002.txt"),
      `deposited-by: t\nprovenance: authored\n---\n@p-e/x0\nid: relay-0002\nparent: relay-0001\nparent-sha256: ${real}\nfrom: bob\n\nb\n`,
    );
    expect(await stateOf(root, "relay-0002")).toBe("MATCHES");
  });

  it("DIVERGES when a digest is declared and is not the parent's", async () => {
    const root = store({
      "relay-0001": parent,
      "relay-0002": `@p-e/x0\nid: relay-0002\nparent: relay-0001\nparent-sha256: ${parentDigest}\nfrom: bob\n\nb\n`,
    });
    expect(await stateOf(root, "relay-0002")).toBe("DIVERGES");
  });

  // The distinction the whole check exists for. A parent this store does not
  // hold makes the claim unverifiable *here*; it says nothing about whether the
  // record's author computed it correctly. Collapsing this into DIVERGES would
  // report a fact about our access as a defect in someone else's record.
  it("UNCHECKABLE when the named parent's bytes are not held", async () => {
    const root = store({
      "relay-0002": `@p-e/x0\nid: relay-0002\nparent: relay-0001\nparent-sha256: ${parentDigest}\nfrom: bob\n\nb\n`,
    });
    expect(await stateOf(root, "relay-0002")).toBe("UNCHECKABLE");
  });

  it("LABEL_ONLY when a parent is named and no digest binds it", async () => {
    const root = store({
      "relay-0001": parent,
      "relay-0002": "@p-e/x0\nid: relay-0002\nparent: relay-0001\nfrom: bob\n\nb\n",
    });
    expect(await stateOf(root, "relay-0002")).toBe("LABEL_ONLY");
  });

  it("NO_CLAIM when the record names no predecessor at all", async () => {
    const root = store({ "relay-0001": parent });
    expect(await stateOf(root, "relay-0001")).toBe("NO_CLAIM");
  });

  it("UNANCHORED when a digest is declared with no parent to anchor it", async () => {
    const root = store({
      "relay-0002": `@p-e/x0\nid: relay-0002\nparent-sha256: ${parentDigest}\nfrom: bob\n\nb\n`,
    });
    expect(await stateOf(root, "relay-0002")).toBe("UNANCHORED");
  });

  it("reports one finding per record and never omits one", async () => {
    const root = store({
      "relay-0001": parent,
      "relay-0002": "@p-e/x0\nid: relay-0002\nparent: relay-0001\nfrom: bob\n\nb\n",
    });
    const findings = checkContinuity(await loadStore(root));
    expect(findings.map((f) => f.id)).toEqual(["relay-0001", "relay-0002"]);
  });

  it("carries both digests on a divergence, so the report can be checked", async () => {
    const root = store({
      "relay-0001": parent,
      "relay-0002": `@p-e/x0\nid: relay-0002\nparent: relay-0001\nparent-sha256: ${parentDigest}\nfrom: bob\n\nb\n`,
    });
    const f = checkContinuity(await loadStore(root)).find((x) => x.id === "relay-0002");
    expect(f?.declared).toBe(parentDigest);
    expect(f?.actual).toBe((await loadStore(root)).get("relay-0001")?.sha256);
  });

  it("leaves `actual` null where there was nothing to compute it from", async () => {
    const root = store({
      "relay-0002": `@p-e/x0\nid: relay-0002\nparent: relay-0001\nparent-sha256: ${parentDigest}\nfrom: bob\n\nb\n`,
    });
    const f = checkContinuity(await loadStore(root)).find((x) => x.id === "relay-0002");
    expect(f?.actual).toBeNull();
  });
});

describe("tally", () => {
  it("counts every state, including the ones no record exercises", async () => {
    const root = store({ "relay-0001": parent });
    const counts = tally(checkContinuity(await loadStore(root)));
    expect(counts.NO_CLAIM).toBe(1);
    // A state that does not occur must read as zero rather than be absent: an
    // unexercised state and an unrepresented one are different facts, which is
    // I-1 applied to this check's own output.
    expect(counts.DIVERGES).toBe(0);
    expect(counts.UNANCHORED).toBe(0);
  });
});

describe("the live store", () => {
  it("diverges in exactly the three places already accounted for", async () => {
    // relay-0113 (PLACEHOLDER, retracted by its author in relay-0114) and
    // relay-0119 / relay-0123 (whole-file digests, mine, corrected in
    // relay-0124) are the three known divergences. The store is immutable, so
    // this test pins the count rather than demanding zero: a fourth would be new.
    const findings = checkContinuity(await loadStore());
    const diverging = findings.filter((f) => f.state === "DIVERGES").map((f) => f.id);
    expect(diverging).toEqual(["relay-0113", "relay-0119", "relay-0123"]);
  });
});
