import { describe, expect, it } from "vitest";
import { AUTHORITY, type G1Claim, claimsG1, floorOf } from "../src/relay/authority.js";

/**
 * MUST 2 — "An authority MUST declare the seq from which it claims G1, and MUST
 * NOT claim G1 below it."
 *
 * These tests cover the half a store can enforce: that a declared claim is never
 * exceeded. They do not and cannot cover whether a claim was entitled to be made.
 * That is F3, the standing UNDECIDABLE limit — a single authority's G1 claim is
 * self-asserted and not checkable by a reader who was not present for every
 * allocation.
 */
/**
 * The grounds of a claim of none, and a loud failure otherwise.
 *
 * Written this way on purpose. `expect(claim.claims === "none" && claim.because)`
 * asserts `false` matches a regular expression when the narrowing fails, which is
 * a confusing failure — gemini-code-assist on PR #6, and correct. But narrowing
 * with a bare `if (claim.claims === "none")` is worse: if the declaration ever
 * changes to a floor, THE GROUNDS ASSERTION SILENTLY STOPS RUNNING and the test
 * stays green. Measured before choosing between them — the if-block form passes
 * with the assertion never reached.
 *
 * A test that vanishes when the thing it guards changes is the failure mode this
 * whole branch keeps recording. So: narrow by throwing.
 */
function groundsOf(claim: G1Claim): string {
  if (claim.claims !== "none") {
    throw new Error(`expected a claim of none, got a claim from seq ${claim.seq}`);
  }
  return claim.because;
}

describe("the authority's G1 declaration", () => {
  it("this store claims no G1, and says why", () => {
    expect(AUTHORITY.claims).toBe("none");
    expect(floorOf(AUTHORITY)).toBeUndefined();
    // The grounds name the reuse rather than gesturing at one, so a reader does
    // not have to take the position on trust.
    expect(groundsOf(AUTHORITY)).toMatch(/relay-0183/);
  });

  it("a claim of none covers no seq at all", () => {
    // Including seqs the store demonstrably holds. Holding a record and claiming
    // G1 over it are different things, and this is the difference.
    for (const seq of [0, 1, 32, 183, 683, 9999]) {
      expect(claimsG1(AUTHORITY, seq)).toBe(false);
    }
  });

  it("a declared floor covers from itself upward and never below", () => {
    const future: G1Claim = { claims: "from", seq: 700, declaredAt: "relay-0700" };
    expect(claimsG1(future, 699)).toBe(false);
    expect(claimsG1(future, 700)).toBe(true);
    expect(claimsG1(future, 701)).toBe(true);
    expect(floorOf(future)).toBe(700);
  });

  it("the reuse this store records sits above any floor it could declare", () => {
    // issue-1's argument, made mechanical: ids run from 32 and relay-0183 was
    // reused, so every candidate floor for this authority contains the violation.
    // Under v1's ban on exceptions that leaves no floor it could declare, which is
    // why the declaration above is `none` rather than a number.
    const lowestIdEverBound = 32;
    const reuse = 183;
    for (let floor = lowestIdEverBound; floor <= reuse; floor++) {
      expect(claimsG1({ claims: "from", seq: floor, declaredAt: "hypothetical" }, reuse)).toBe(
        true,
      );
    }
    // A floor above the reuse would exclude it, and is not open to this authority
    // either: v1 forbids exceptions, and the record below such a floor would be
    // unclaimed rather than excused. That is a position issue-1 takes and this
    // test does not re-argue.
    expect(claimsG1({ claims: "from", seq: reuse + 1, declaredAt: "hypothetical" }, reuse)).toBe(
      false,
    );
  });
});
