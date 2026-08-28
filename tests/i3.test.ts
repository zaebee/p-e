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

  it("reports hivemark UNDECIDABLE: inputs are pinned by digest but not published", async () => {
    const h = checkI3(await loadCorpus(".")).find((f) => f.producer === "hivemark");
    expect(h?.verdict).toBe("UNDECIDABLE");
    expect(h?.reason).toMatch(/digest/);
  });
});
