import { describe, expect, it } from "vitest";
import { strandedHeaders } from "../src/relay/headers.js";
import type { RelayRecord } from "../src/relay/store.js";

/**
 * The detector is given records directly rather than a store on disk: what it
 * reads is `bytes`, and building a scratch store would test `loadStore` twice
 * and this once.
 */
function record(id: string, bytes: string): RelayRecord {
  return {
    id,
    bytes,
    sha256: "0".repeat(64),
    parent: null,
    parentSha256: null,
    ref: null,
    from: null,
    to: null,
    kind: null,
    provenance: "as-received",
    depositedBy: "test",
  } as RelayRecord;
}

const store = (...rs: RelayRecord[]) => new Map(rs.map((r) => [r.id, r]));

describe("headers that fell into the prose", () => {
  it("says nothing about a record whose block is whole", () => {
    const r = record(
      "relay-0001",
      "@p-e/x0\nto: a\nfrom: b\nkind: message\n\nthe body starts here.\n",
    );
    expect(strandedHeaders(store(r))).toEqual([]);
  });

  it("names the header a blank line stranded", () => {
    // This is relay-1115's shape exactly: everything up to parent-sha256 is the
    // block, then a blank line, then `kind:` — which the store therefore reads
    // as prose and reports as absent.
    const r = record(
      "relay-1115",
      "@p-e/x0\nto: a\nfrom: b\nparent: relay-1114\nparent-sha256: dead\n\nkind: attack\n\nthe body.\n",
    );
    expect(strandedHeaders(store(r))).toEqual([{ id: "relay-1115", stranded: ["kind"] }]);
  });

  it("does not report a record that merely quotes a header", () => {
    // Half this corpus contains the string `kind:` inside a quotation, so a scan
    // of the whole body would report the citation habit instead of the defect.
    // The window is what keeps those apart, and this is the case it exists for.
    const quoted = `@p-e/x0\nto: a\nfrom: b\nkind: report\n\n${"prose line\n".repeat(20)}kind: attack\n`;
    expect(strandedHeaders(store(record("relay-0002", quoted)))).toEqual([]);
  });

  it("reports several stranded headers on one record, in header order", () => {
    const r = record(
      "relay-0176",
      "@p-e/x0\nfrom: b\n\nto: a\nparent: relay-0175\nkind: message\n",
    );
    expect(strandedHeaders(store(r))[0]?.stranded).toEqual(["to", "parent", "kind"]);
  });

  it("sorts by id, so two runs over one store read the same", () => {
    const bad = (id: string) => record(id, "@p-e/x0\nfrom: b\n\nkind: attack\n");
    const found = strandedHeaders(store(bad("relay-0009"), bad("relay-0002")));
    expect(found.map((f) => f.id)).toEqual(["relay-0002", "relay-0009"]);
  });
});
