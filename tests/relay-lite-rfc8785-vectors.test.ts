import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { IJsonViolation, canonicalize } from "../src/relay-lite/canonical.js";

/**
 * The reference test vectors for RFC 8785, from the RFC author's own
 * implementation. External ground truth: every other test in this repository was
 * written by whoever wrote the code and shares its blind spots by construction.
 *
 * See tests/fixtures/rfc8785/README.md for provenance and licence.
 */

const dir = fileURLToPath(new URL("./fixtures/rfc8785", import.meta.url));
const read = (side: "input" | "output", name: string) =>
  readFileSync(`${dir}/${side}/${name}.json`, "utf8");

describe("RFC 8785 reference vectors", () => {
  // `values` is the one vector I-JSON puts partly out of domain; it has its own
  // case below.
  for (const name of ["arrays", "french", "structures", "unicode", "weird"]) {
    it(`${name} canonicalizes to the reference bytes`, () => {
      const expected = read("output", name).replace(/\n$/, "");
      expect(canonicalize(JSON.parse(read("input", name)))).toBe(expected);
    });
  }

  it("french passes, which is what `localeCompare` would have failed", () => {
    // The vector's own payload states the requirement: "This sorting order / is
    // wrong according to French / but canonicalization MUST / ignore locale".
    // SonarCloud rule S2871 proposed sorting keys with `localeCompare`, and the
    // RFC ships a vector specifically to catch that.
    const out = canonicalize(JSON.parse(read("input", "french")));
    expect(out.indexOf('"peach"')).toBeLessThan(out.indexOf('"péché"'));
    expect(out.indexOf('"péché"')).toBeLessThan(out.indexOf('"pêche"'));
  });

  it("refuses `values`, for the one member I-JSON puts out of domain", () => {
    // 1E30 is past 2^53, so the parse alters it before canonicalization and the
    // digest would cover a value nobody sent — spec §3.1, a MUST.
    expect(() => canonicalize(JSON.parse(read("input", "values")))).toThrow(IJsonViolation);
  });

  it("agrees with `values` on every member that is in domain", () => {
    const input = JSON.parse(read("input", "values")) as { numbers: number[] };
    const trimmed = {
      ...input,
      numbers: input.numbers.filter((n) => Math.abs(n) <= Number.MAX_SAFE_INTEGER),
    };
    const expected = read("output", "values").replace(/\n$/, "").replace("1e+30,", "");
    // Includes the vector's escape-torture string, which is the part of JCS most
    // easily got wrong: `"€$\nA'B\"\\\\\"/"`.
    expect(canonicalize(trimmed)).toBe(expected);
  });
});
