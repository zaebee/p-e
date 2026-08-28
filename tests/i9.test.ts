import { describe, expect, it } from "vitest";
import { checkI9 } from "../src/checks/i9.js";
import { loadCorpus } from "../src/manifest.js";

describe("I-9", () => {
  it("confirms apex publishes a gaps count per host", async () => {
    const a = checkI9(await loadCorpus(".")).find((f) => f.producer === "apex");
    expect(a?.verdict).toBe("CONFORMS");
  });

  it("reports hivemark UNDECIDABLE: the undecodable count is computed, not published", async () => {
    const h = checkI9(await loadCorpus(".")).find((f) => f.producer === "hivemark");
    expect(h?.verdict).toBe("UNDECIDABLE");
  });
});
