import { describe, expect, it } from "vitest";
import { checkI6 } from "../src/checks/i6.js";
import { loadCorpus } from "../src/manifest.js";
import { admits } from "../src/verdict.js";

describe("I-6", () => {
  it("confirms signer differs from recipient across every hivemark envelope", async () => {
    const h = checkI6(await loadCorpus(".")).find((f) => f.producer === "hivemark");
    expect(h?.verdict).toBe("CONFORMS");
  });

  it("reports apex NOT_APPLICABLE, and the demotion rule then sinks the invariant", async () => {
    const findings = checkI6(await loadCorpus("."));
    expect(findings.find((f) => f.producer === "apex")?.verdict).toBe("NOT_APPLICABLE");
    expect(admits(findings)).toBe("DEMOTED");
  });
});
