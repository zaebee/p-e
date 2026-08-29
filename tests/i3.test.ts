import { describe, expect, it } from "vitest";
import { checkI3 } from "../src/checks/i3.js";
import { loadCorpus } from "../src/manifest.js";

describe("I-3", () => {
  it("will not confirm a pairing that is never exercised", async () => {
    // This test asserted CONFORMS through runs 01-05 and was wrong with the
    // check it covered: offSite is true zero times and finalUrl is null in all
    // eight entries, so the old verdict rested on two keys existing over empty
    // values. A test can lock in the defect it is meant to catch, and this one
    // did.
    const apex = checkI3(await loadCorpus(".")).find((f) => f.producer === "apex");
    expect(apex?.verdict).toBe("UNDECIDABLE");
    expect(apex?.reason).toMatch(/never exercised/);
  });

  // This asserted UNDECIDABLE for runs 01 through 07, on the reading that inputs
  // pinned by digest and not published settle nothing. The catalogue had said
  // otherwise before the reader existed — I-3's `watch:` line reads "if so H
  // fails its own I-3 at the artifact level, and that is a finding, not a bug in
  // the reader" — and two independent blind readers fired the falsifier on the
  // same bytes. Settled as VIOLATES by bee.zae at relay-0174.
  it("reports hivemark VIOLATES: a conclusion is published and its input is not", async () => {
    const h = checkI3(await loadCorpus(".")).find((f) => f.producer === "hivemark");
    expect(h?.verdict).toBe("VIOLATES");
    expect(h?.reason).toMatch(/absent from the published corpus/);
  });

  it("would report CONFORMS if every pinned input were published", () => {
    // The other branch, which this corpus cannot exercise: the check must be able
    // to return CONFORMS, or the falsifier is unfalsifiable in the direction that
    // matters. i1 has no VIOLATES branch at all and that is a recorded defect.
    const files = new Map<string, Uint8Array>();
    const enc = new TextEncoder();
    files.set(
      "hivemark/provenance.json",
      enc.encode(
        JSON.stringify({ source: "x", sha256: "y", files: [{ path: "in.json", sha256: "z" }] }),
      ),
    );
    files.set("hivemark/in.json", enc.encode("{}"));
    files.set(
      "apex/health.json",
      enc.encode(JSON.stringify({ checkedAt: "2026-01-01T00:00:00Z", ok: true, entries: {} })),
    );
    const h = checkI3(files).find((f) => f.producer === "hivemark");
    expect(h?.verdict).toBe("CONFORMS");
  });
});
