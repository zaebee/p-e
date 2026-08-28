import { describe, expect, it } from "vitest";
import { checkI7 } from "../src/checks/i7.js";
import { loadCorpus } from "../src/manifest.js";

describe("I-7", () => {
  it("finds no prose in the machine-written files", async () => {
    const a = checkI7(await loadCorpus(".")).find((f) => f.producer === "apex");
    expect(a?.verdict).toBe("CONFORMS");
  });

  it("says what artifacts cannot show about enforcement", async () => {
    for (const f of checkI7(await loadCorpus("."))) expect(f.reason.length).toBeGreaterThan(0);
  });
});
