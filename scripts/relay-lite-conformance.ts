import { existsSync, readFileSync } from "node:fs";

/**
 * Which of relay-lite v0.12's claims this implementation satisfies, by clause.
 *
 * The suite proves the behaviour; this says what the behaviour amounts to
 * against the document, which is the artifact this exercise exists to produce.
 * Eleven claims are in scope. §4 has two and only one of them is a store's: the
 * first names the *storage model*, the second is a consumer obligation, and it
 * is listed as out of scope rather than omitted so the count is legible.
 *
 * The plan's docstring said ten, which was the count before the design was
 * corrected in #28. The array below has always had eleven; the sentence
 * describing it had not been updated with it.
 *
 *   bun run conform:relay-lite
 */
const CLAIMS = [
  {
    clause: "§2",
    text: 'CNS.to is an element of the act\'s to[], or to[] == ["all"]',
    test: "relay-lite-cns",
  },
  { clause: "§2.1", text: "CNS.id == act.id", test: "relay-lite-cns" },
  {
    clause: "§3.1",
    text: "Producers mint canonical wire bytes per RFC 8785 (JCS) as raw UTF-8",
    test: "relay-lite-canonical",
  },
  { clause: "§3.1", text: "Acts conform to I-JSON (RFC 7493)", test: "relay-lite-canonical" },
  { clause: "§3.2", text: "An act is sealed at creation", test: "relay-lite-act" },
  {
    clause: "§3.2",
    text: "Publishers MUST NOT re-tick the HLC when retrying an existing id",
    test: "relay-lite-act",
  },
  {
    clause: "§7.1",
    text: "A verifier MUST NOT parse, normalize or re-serialize when computing a digest",
    test: "relay-lite-verify",
  },
  {
    clause: "§7.2",
    text: "A citation carries both handles, the locator and the digest",
    test: "relay-lite-verify",
  },
  {
    clause: "§7.3",
    text: "A store guarantees digest == SHA-256(octets)",
    test: "relay-lite-verify",
  },
  {
    clause: "§7.3",
    text: "A discrepancy raises STORE_CORRUPTION and MUST NOT surface as DIVERGES",
    test: "relay-lite-verify",
  },
  {
    clause: "§4",
    text: "The protocol and storage model treat the graph as a DAG, a partial order",
    test: "relay-lite-roundtrip",
  },
] as const;

const OUT_OF_SCOPE = [
  { clause: "§4", text: "A consumer MUST NOT present a linear projection as the causal history" },
] as const;

console.log("relay-lite v0.12 — claims in scope\n");
for (const c of CLAIMS) {
  console.log(`  ${c.clause.padEnd(6)} ${c.text}`);
  console.log(`  ${"".padEnd(6)} covered by tests/${c.test}.test.ts\n`);
}
console.log("out of scope — consumer obligations, not dischargeable by a store\n");
for (const c of OUT_OF_SCOPE) console.log(`  ${c.clause.padEnd(6)} ${c.text}`);
console.log(
  `\n${CLAIMS.length} of ${CLAIMS.length + OUT_OF_SCOPE.length} claims implemented here.`,
);
console.log("The one left is a consumer's: a store cannot satisfy it on a reader's behalf.");

/**
 * What this report checks, and what it does not.
 *
 * It checks that every test file it names exists, and exits non-zero if one
 * does not. That is a low bar and it is the bar a table of strings fails:
 * rename a test file and a report that only printed would go on claiming
 * coverage by a file that is gone.
 *
 * It does not check that a named test *covers* the claim beside it. Nothing
 * automatic can — that mapping is a judgment, made when the test was written
 * and re-made by whoever reads this. Saying so is the difference between a
 * report and an assertion nobody verified.
 */
/**
 * The count, checked against the document rather than remembered from it.
 *
 * "11 of 12" was a number in a comment. If the draft gains a thirteenth MUST,
 * a report that only printed would go on saying twelve — and this report exists
 * to say which of the specification's claims hold, so a stale denominator is
 * the one error it cannot afford.
 *
 * Counted by scanning for `**[MUST]**` and `**[MUST NOT]**`, which is how the
 * draft marks them. That is a syntactic count and it agrees with the reading
 * below at twelve; if the draft ever states one another way, this disagrees
 * loudly instead of quietly being wrong.
 */
const specText = readFileSync(
  new URL("../docs/specs/relay-lite-v0.12-draft.md", import.meta.url),
  "utf8",
);
const normative = specText.match(/\*\*\[MUST(?: NOT)?\]\*\*/g) ?? [];
const accounted = CLAIMS.length + OUT_OF_SCOPE.length;

const missing = CLAIMS.filter(
  (c) => !existsSync(new URL(`../tests/${c.test}.test.ts`, import.meta.url)),
);

console.log("\nwhat this report establishes");
console.log(
  `  every claim in the draft is accounted for: ${normative.length === accounted ? "yes" : `NO — draft has ${normative.length}, this lists ${accounted}`}`,
);
console.log(`  every named test file exists: ${missing.length === 0 ? "yes" : "NO"}`);
console.log("  that a named test covers the claim beside it: not checked, and not checkable");
console.log("  that those tests pass: run `bun run test`");

if (normative.length !== accounted) {
  console.log(
    `\nthe draft states ${normative.length} normative claims and this report accounts for ${accounted}.`,
  );
  process.exit(1);
}

if (missing.length > 0) {
  console.log("\nmissing test files, so the coverage above is not true as written:");
  for (const c of missing) console.log(`  ${c.clause.padEnd(6)} tests/${c.test}.test.ts`);
  process.exit(1);
}
