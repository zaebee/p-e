import { describe, expect, it } from "vitest";
import { checkI9 } from "../src/checks/i9.js";
import { loadCorpus } from "../src/manifest.js";

describe("I-9", () => {
  it("will not confirm accounting from counts that are all zero", async () => {
    // Asserted CONFORMS through runs 01-05, over gaps [0,0,0,0,0,0,0,0].
    const a = checkI9(await loadCorpus(".")).find((f) => f.producer === "apex");
    expect(a?.verdict).toBe("UNDECIDABLE");
    expect(a?.reason).toMatch(/every one is zero/);
  });

  it("reports hivemark UNDECIDABLE: the undecodable count is computed, not published", async () => {
    const h = checkI9(await loadCorpus(".")).find((f) => f.producer === "hivemark");
    expect(h?.verdict).toBe("UNDECIDABLE");
  });
});
