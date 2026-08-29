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
  it("diverges in exactly the places already accounted for", async () => {
    // Five known divergences. relay-0113 is a PLACEHOLDER its author retracted
    // in relay-0114. The other four are all the same mistake — a whole-file
    // digest where the store digests the body — made by both participants,
    // twice each, each time after acknowledging the rule. That is why
    // `bun run relay-digest` now exists: the obvious command produced the wrong
    // value and nothing produced the right one. The store is immutable, so this
    // pins what is there; a sixth would be new.
    //
    // A sixth was new. relay-0200 is mine and it is NOT that mistake: its
    // declared value is neither the body digest nor the whole-file digest of
    // relay-0199. It is byte-identical to relay-0199's own `parent-sha256:`,
    // which is relay-0198's body. So I copied the header block from the record
    // above, advanced `parent:` to relay-0199, and left the digest pointing at
    // its parent. Corrected in relay-0223, never edited in place. This is
    // OBS-063 with a cost attached: `parent:` is a label and `parent-sha256:`
    // is bytes, neither derives from the other, so nothing objected when I
    // moved one and not the other — and `deposit.ts` contains zero occurrences
    // of `parent`, so only this check was ever going to catch it.
    const findings = checkContinuity(await loadStore());
    const diverging = findings.filter((f) => f.state === "DIVERGES").map((f) => f.id);
    expect(diverging).toEqual([
      "relay-0113",
      "relay-0119",
      "relay-0123",
      "relay-0138",
      "relay-0141",
      "relay-0200",
      // Seventh, and the first found while it was fresh: it landed at 15:40 and the
      // read-only check flagged it within the hour, which is what the six-entry baseline
      // was carried all day to make possible. chatgpt's, a digest of nothing, erratum
      // designated by its author in relay-0389.
      "relay-0373",
      // Eighth, and malformed rather than wrong: 63 hex characters, one short of a
      // sha-256, a single `2` dropped from relay-0405's digest. Not transport: hy3 checked
      // its own source file in relay-0412 and found 63 characters there, which is
      // evidence this store cannot produce about itself. The list
      // lives here as well as in `check-continuity.ts` on purpose — a new divergence
      // has to be acknowledged twice, and this is the second acknowledgement.
      "relay-0408",
    ]);
  });
});

describe("duplicates", () => {
  // FALSE AS WRITTEN, AND NOTHING HERE COULD HAVE CAUGHT IT. This comment used
  // to open "relay-0166 and relay-0167 hold byte-identical bodies". They do not:
  // aff0157f… and 46534c9a…, which are also what the store holds as `sha256`.
  // The live store contains no byte-duplicate at all. hy3 found it in relay-0230
  // after I repeated the claim into relay-0226; corrected there rather than by
  // deleting it here, and OBS-074 records why it survived — the two assertions
  // below run against fixtures, and the only one that touches the live store
  // (`Array.isArray`) checks the shape of our access and nothing about the store.
  //
  // The reasoning the comment existed to record stands on its own and did not
  // depend on the example: `parent-sha256` was adopted because a digest is
  // unambiguous where a label is not, and a duplicate would make that digest name
  // two records at once — exact as a statement about bytes, ambiguous as a pointer
  // to a record, which are different things the store does not separate. That is
  // why the check is here. It has never had a live instance to fire on.
  const dupes = async (root?: string) => {
    const held = await loadStore(root);
    const byDigest = new Map<string, string[]>();
    for (const r of held.values()) {
      const at = byDigest.get(r.sha256);
      if (at) at.push(r.id);
      else byDigest.set(r.sha256, [r.id]);
    }
    return [...byDigest.values()].filter((ids) => ids.length > 1);
  };

  it("finds two ids holding the same bytes", async () => {
    const root = store({
      "relay-0001": parent,
      "relay-0002": parent.replace("id: relay-0001", "id: relay-0001"),
    });
    expect(await dupes(root)).toEqual([["relay-0001", "relay-0002"]]);
  });

  it("reports none when every record is distinct", async () => {
    const root = store({
      "relay-0001": parent,
      "relay-0002": "@p-e/x0\nid: relay-0002\nfrom: bob\n\ndifferent\n",
    });
    expect(await dupes(root)).toEqual([]);
  });

  // Deliberately not pinned against the live store. relay-0166 and relay-0167
  // held identical bytes for a few minutes on 2026-08-29 and then relay-0167
  // left the directory — see OBS-062. Pinning a duplicate would make this test
  // fail whenever the store is repaired, which is backwards.
  it("runs against the live store without asserting what it finds", async () => {
    expect(Array.isArray(await dupes())).toBe(true);
  });
});
