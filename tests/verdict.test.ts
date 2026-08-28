import { describe, expect, it } from "vitest";
import { type Finding, admits } from "../src/verdict.js";

const f = (producer: string, verdict: Finding["verdict"]): Finding => ({
  invariant: "I-x",
  producer,
  verdict,
  evidence: "OBSERVED",
  reason: "",
  projections: [],
});

describe("admits", () => {
  it("admits an invariant two distinct producers confirm", () => {
    expect(admits([f("hivemark", "CONFORMS"), f("apex", "CONFORMS")])).toBe("ADMITTED");
  });

  it("does not let NOT_APPLICABLE count as support", () => {
    expect(admits([f("hivemark", "CONFORMS"), f("apex", "NOT_APPLICABLE")])).toBe("DEMOTED");
  });

  it("does not let UNDECIDABLE count as support", () => {
    expect(admits([f("hivemark", "CONFORMS"), f("apex", "UNDECIDABLE")])).toBe("DEMOTED");
  });

  it("demotes on any violation, even with two confirmations", () => {
    expect(admits([f("hivemark", "CONFORMS"), f("apex", "CONFORMS"), f("other", "VIOLATES")])).toBe(
      "DEMOTED",
    );
  });

  it("counts producers, not findings", () => {
    expect(admits([f("hivemark", "CONFORMS"), f("hivemark", "CONFORMS")])).toBe("DEMOTED");
  });
});
