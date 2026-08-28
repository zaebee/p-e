import { describe, expect, it } from "vitest";
import { checkI3 } from "../src/checks/i3.js";
import { loadCorpus } from "../src/manifest.js";

describe("I-3", () => {
  it("confirms apex keeps finalUrl behind every offSite conclusion", async () => {
    const apex = checkI3(await loadCorpus(".")).find((f) => f.producer === "apex");
    expect(apex?.verdict).toBe("CONFORMS");
  });

  it("reports hivemark UNDECIDABLE: inputs are pinned by digest but not published", async () => {
    const h = checkI3(await loadCorpus(".")).find((f) => f.producer === "hivemark");
    expect(h?.verdict).toBe("UNDECIDABLE");
    expect(h?.reason).toMatch(/digest/);
  });
});
