import { describe, expect, it } from "vitest";
import { checkI8 } from "../src/checks/i8.js";
import { loadCorpus } from "../src/manifest.js";

describe("I-8", () => {
  it("confirms every apex log entry names the limit of its testimony", async () => {
    const a = checkI8(await loadCorpus(".")).find((f) => f.producer === "apex");
    expect(a?.verdict).toBe("CONFORMS");
  });

  it("reports hivemark UNDECIDABLE: the unverifiable list is not published", async () => {
    const h = checkI8(await loadCorpus(".")).find((f) => f.producer === "hivemark");
    expect(h?.verdict).toBe("UNDECIDABLE");
  });
});
