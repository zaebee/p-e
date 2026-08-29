import { describe, expect, it, vi } from "vitest";
import { bearingFor } from "../src/conformance/bearing.js";
import { watch } from "../src/conformance/fields.js";
import { checkRationale, universalNegative } from "../src/conformance/rationale.js";
import { loadCorpus } from "../src/manifest.js";

/**
 * The reader-conformance suite, first rule.
 *
 * **A check may not report a limit of the corpus without opening every field
 * that could lift it.** A verdict of `UNDECIDABLE` or `NOT_APPLICABLE` is a
 * statement about the evidence; if a field that would settle the question was
 * never read, it is a statement about the reader's search wearing the other
 * one's clothes.
 *
 * This is the failure mode two independent blind readers found and seven of our
 * own runs did not — see OBS-060 and OBS-061. It is invisible to
 * `RecordingCorpus`, which measures files, and `apex/health.json` counts as read
 * because i2, i3, i4 and i7 read it.
 *
 * The suite is external to the reader by construction: it mocks the adapters
 * rather than instrumenting them, so nothing here changes what a conformance run
 * does.
 */

/** Known reader defects, so this suite is red on a *new* one rather than always. */
const ACCOUNTED_FOR: Readonly<Record<string, string>> = {
  "I-1/apex": "never opens health.entries[*].code — OBS-060, erratum in relay-0165",
  "I-9/apex": "never opens health at all — OBS-061, erratum in relay-0165",
};

async function runInstrumented(
  invariant: string,
): Promise<{ seen: Set<string>; findings: { producer: string; reason: string }[] }> {
  const seen = new Set<string>();
  const files = await loadCorpus(".");

  vi.resetModules();
  const real =
    await vi.importActual<typeof import("../src/adapters/apex.js")>("../src/adapters/apex.js");
  vi.doMock("../src/adapters/apex.js", () => ({
    ...real,
    apexHealth: (f: Map<string, Uint8Array>) => watch(real.apexHealth(f), "health", seen),
    apexHistory: (f: Map<string, Uint8Array>) => watch(real.apexHistory(f), "history", seen),
  }));

  // Static imports: the bundler cannot resolve a fully dynamic specifier, and a
  // table here is also the honest form — the suite states which checks it audits
  // rather than discovering them.
  const mods: Record<string, () => Promise<Record<string, unknown>>> = {
    "I-1": () => import("../src/checks/i1.js"),
    "I-3": () => import("../src/checks/i3.js"),
    "I-5": () => import("../src/checks/i5.js"),
    "I-9": () => import("../src/checks/i9.js"),
  };
  const loader = mods[invariant];
  if (!loader) throw new Error(`no check module registered for ${invariant}`);
  const mod = await loader();
  // Named, not discovered. `i5.ts` also exports `isoWeekOf`, and picking the
  // first function in the module ran a helper that reads no corpus at all — the
  // harness then reported the check as touching nothing, which would have read
  // as a spectacular defect rather than as a bug in the harness.
  const name = `check${invariant.replace("-", "")}`;
  const check = mod[name] as ((f: Map<string, Uint8Array>) => unknown) | undefined;
  if (!check) throw new Error(`${name} is not exported by the module for ${invariant}`);
  const findings = check(files) as { producer: string; reason: string }[];
  vi.doUnmock("../src/adapters/apex.js");
  return { seen, findings };
}

const fieldsTouchedBy = async (i: string) => (await runInstrumented(i)).seen;

describe("a check may not report a corpus limit it did not look for", () => {
  for (const invariant of ["I-1", "I-3", "I-5", "I-9"]) {
    const key = `${invariant}/apex`;
    const bearing = bearingFor(invariant, "apex");
    if (!bearing) continue;

    it(`${key} opens every field that bears on it`, async () => {
      const seen = await fieldsTouchedBy(invariant);
      const missed = bearing.fields.filter((f) => !seen.has(f));
      const known = ACCOUNTED_FOR[key];

      if (known) {
        // Pinned rather than skipped: if the check is repaired this fails, and
        // the entry above should be removed in the same change.
        expect(missed.length, `${key} was expected to miss fields (${known})`).toBeGreaterThan(0);
      } else {
        expect(missed, `${key} claims about the corpus rest on unread fields`).toEqual([]);
      }
    });
  }

  it("the accounted-for list names only invariants the table covers", () => {
    for (const key of Object.keys(ACCOUNTED_FOR)) {
      const [invariant, producer] = key.split("/");
      expect(bearingFor(invariant as string, producer as string)).toBeDefined();
    }
  });
});

/**
 * Second rule: a reason may not assert a corpus-wide negative about a field the
 * check never opened. Unlike the first rule this applies whatever the verdict
 * is — I-9/apex is `UNDECIDABLE`, which is correct, attached to a sentence
 * saying the mechanism "has never recorded a failure" while six of eight entries
 * carry `ok: false`.
 */
describe("a reason may not claim more than the reading behind it", () => {
  const ACCOUNTED_REASONS: Readonly<Record<string, string>> = {
    "I-1/apex": "'never exercised' without opening entries[*].code — OBS-060",
    "I-9/apex": "'has never recorded a failure' without opening health — OBS-061",
  };

  for (const invariant of ["I-1", "I-3", "I-5", "I-9"]) {
    const bearing = bearingFor(invariant, "apex");
    if (!bearing) continue;

    it(`${invariant}/apex states nothing its reading cannot support`, async () => {
      const { seen, findings } = await runInstrumented(invariant);
      const apex = findings.find((f) => f.producer === "apex");
      expect(apex, `${invariant} produced no apex finding`).toBeDefined();

      const problem = checkRationale(invariant, "apex", apex?.reason ?? "", bearing.fields, seen);
      const known = ACCOUNTED_REASONS[`${invariant}/apex`];

      if (known) {
        expect(problem, `${invariant}/apex was expected to overclaim (${known})`).not.toBeNull();
      } else {
        expect(problem).toBeNull();
      }
    });
  }

  it("recognises a universal negative and ignores a bounded one", () => {
    expect(universalNegative("the field is never populated")).toBe("never");
    expect(universalNegative("every one is zero")).toBe("every one is");
    expect(universalNegative("4 of 8 hosts returned no status")).toBeNull();
    expect(universalNegative("the pairing is exercised 8 times")).toBeNull();
  });

  it("passes a reason whose bearing fields were all opened", () => {
    const seen = new Set(["health.entries[*].offSite", "health.entries[*].finalUrl"]);
    expect(checkRationale("I-3", "apex", "no conclusion is positive", [...seen], seen)).toBeNull();
  });
});
