import { describe, expect, it } from "vitest";
import { checkI6 } from "../src/checks/i6.js";
import { loadCorpus } from "../src/manifest.js";
import { admits } from "../src/verdict.js";

describe("I-6", () => {
  it("reports the corpus-native fact without concluding the invariant from it", async () => {
    const h = checkI6(await loadCorpus(".")).find((f) => f.producer === "hivemark");
    expect(h?.verdict).toBe("UNDECIDABLE");
    expect(h?.reason).toMatch(/natively published/);
    expect(h?.reason).toMatch(/§5's mapping/);
  });

  it("reports apex NOT_APPLICABLE, and the invariant stays demoted", async () => {
    const findings = checkI6(await loadCorpus("."));
    expect(findings.find((f) => f.producer === "apex")?.verdict).toBe("NOT_APPLICABLE");
    expect(admits(findings)).toBe("DEMOTED");
  });
});
