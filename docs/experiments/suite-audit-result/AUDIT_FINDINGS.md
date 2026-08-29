# Audit Findings for suite-audit

This document records findings against the four questions in CONTRACT.md and the killer test.

## Executive Summary

The conformance suite (`src/conformance/` and `tests/reader-conformance.test.ts`) has **significant blind spots** that mirror the very defects it was designed to detect. It fails to observe all the data its verdicts depend on (Question A), only tests a subset of invariants (Question D), and has gaps in its field-observation mechanism.

---

## Question A: Coverage

**Finding A-1: The field watcher only instruments apex adapters, not hivemark**
- **File:** `tests/reader-conformance.test.ts:44-47`
- **Line:** 44-47
- **Issue:** The `vi.doMock` only wraps `apexHealth` and `apexHistory` with the `watch` proxy. It does not wrap `parseHivemark` or any hivemark adapter.
- **Impact:** For any check that reads hivemark artifacts directly (I-1, I-2, I-3, I-4, I-6, I-8, I-9 all have hivemark branches), field access is **not tracked at all**. The suite cannot detect if a hivemark check fails to open a bearing field.
- **Demonstration:** `src/checks/i1.ts:17` calls `parseHivemark(files, "hivemark/attestations.json")` directly. The conformance test does not wrap this call, so if this check failed to open a field that bears on I-1/hivemark, the suite would not detect it.

**Finding A-2: The coverage test only checks 4 of 9 invariants**
- **File:** `tests/reader-conformance.test.ts:53-58`
- **Lines:** 53-58, 77-78
- **Issue:** The `mods` table only includes I-1, I-3, I-5, I-9. The `for` loop at line 77 only iterates over these four.
- **Impact:** I-2, I-4, I-6, I-7, I-8 are **never tested for field coverage** by the conformance suite. A check for these invariants could fail to open bearing fields and the suite would not catch it.
- **Note:** I-2, I-6, I-7, I-8 are in the bearing table (`src/conformance/bearing.ts`), but the test doesn't use them.

**Finding A-3: The `ownKeys` trap does not record property enumeration**
- **File:** `src/conformance/fields.ts:75-77`
- **Lines:** 75-77
- **Issue:** The `ownKeys` trap returns `Reflect.ownKeys(target)` without adding the keys to `seen`. While subsequent property access via `get` would be recorded, a check that uses `Object.keys()` to determine *which* properties exist (without accessing them) would not have this recorded.
- **Impact:** Low for current corpus, as most checks access properties after enumerating them. But this is a gap in the observation mechanism.

**Finding A-4: ` watch` does not track `files.get()` calls**
- **File:** `tests/reader-conformance.test.ts:44-47`
- **Issue:** The mock wraps the adapter return values, but does not wrap the `files` Map itself. When a check calls `files.get("hivemark/some.json")`, this is not recorded.
- **Impact:** The suite tracks which *properties* of parsed objects are accessed, but not which *files* are opened from the corpus. However, `RecordingCorpus` (used in `runAllWithCoverage`) does track this separately.
- **Partial mitigation:** `src/coverage.ts` uses `RecordingCorpus` which overrides `get()` and `has()` to track file access. But the reader-conformance tests use a different mechanism that doesn't cover file-level access for hivemark.

---

## Question B: Fidelity

**Finding B-1: The clause re-implementation in `clause.ts` only covers 2 of 9 invariants**
- **File:** `src/conformance/clause.ts:51-91`
- **Lines:** 51-91
- **Issue:** The `CLAUSES` object only has entries for `I-3/hivemark` and `I-5/apex`.
- **Impact:** For the other 7 invariants × 2 producers = 14 combinations, the suite **does not check** whether the check agrees with its clause. It only checks these two.
- **Demonstration:** Looking at `CLAUSE_KEYS` (line 100-101), it only exports `["I-3/hivemark", "I-5/apex"]`. The test at `tests/reader-conformance.test.ts:165-191` only iterates over `CLAUSE_KEYS`.

**Finding B-2: The clause implementation may diverge from the catalogue text**
- **File:** `src/conformance/clause.ts:79-90` (I-5/apex clause)
- **Lines:** 74-77 (comment), 79-90 (implementation)
- **Issue:** The comment states "The clause asks that `since` be no later than the fold and that a gaps count exist. It does not ask that a gap have occurred." But the implementation (line 83) checks `Date.parse(r.since) > Date.parse(history.updatedAt)` and `typeof r.gaps !== "number"`.
- **Analysis:** The comment correctly notes that requiring a non-zero gap is stricter than the clause. But the implementation checks `uncounted.length + impossible.length > 0` (line 84) which means it returns VIOLATES if either condition fails. This matches the clause text in CATALOGUE.md line 267-269 which says: "the clause asks for a recomputation over the published envelopes, which the file supplies; withholding it genuinely prevents the reading".
- **Wait - re-reading:** Actually CATALOGUE.md I-5 says (line 262-273): "falsifier: a period covers days outside its own name, or a gap is absorbed into an adjacent period" and "reader: H — every anchors.json period is a valid ISO week; periods do not overlap; every week between first and last is present or absent, never merged".
- **The issue:** The clause.ts implementation for I-5/apex checks different conditions than what the CATALOGUE specifies for apex. The catalogue reader clause for apex is "A — since never precedes first observation; gaps counted" (line 270). The clause.ts implementation checks exactly this. So this appears correct.
- **Status:** This is NOT a finding - the implementation matches the clause text.

**Finding B-3: No clause re-implementation for hivemark I-1, I-2, I-4, I-6, I-7, I-8, I-9**
- **File:** `src/conformance/clause.ts`
- **Issue:** Only 2 clause re-implementations exist out of 18 possible (9 invariants × 2 producers).
- **Impact:** For 16 combinations, the suite does not verify fidelity to the clause at all.

---

## Question C: Evidence Semantics

**Finding C-1: The evidence rules in `evidence.ts` only cover 3 invariants for hivemark**
- **File:** `src/conformance/evidence.ts:43-68`
- **Lines:** 43-68
- **Issue:** The `EVIDENCE` array only has rules for I-4, I-8, I-9 for hivemark. It has no rules for apex at all, and no rules for I-1, I-2, I-3, I-5, I-6, I-7.
- **Impact:** The evidence semantics check (`tests/reader-conformance.test.ts:198-233`) only tests these specific cases. For other invariants/producers, `EXCLUDED_WITH_REASON` verdicts are not validated.
- **Demonstration:** The test at line 202-218 only iterates over the `EVIDENCE` array. If a check returns `EXCLUDED_WITH_REASON` for I-1/apex, this is not checked.

**Finding C-2: The evidence check assumes hivemark/attestations.json is the only relevant artifact**
- **File:** `src/conformance/evidence.ts:47, 55`
- **Lines:** 47, 55
- **Issue:** For I-8 and I-9 hivemark, the `needs` field only lists `"hivemark/attestations.json"`. But I-8's clause says "the unverifiable list is produced by verifyEnvelope at runtime and does not appear in attestations.json". If other files (like the README mentioned in the clause) were withheld, the evidence rule doesn't account for them.
- **Impact:** The suite might incorrectly license `EXCLUDED_WITH_REASON` if other relevant artifacts are missing.
- **Note:** The `unpublishedByClause: true` flag (lines 48, 56) correctly marks these as cases where the clause itself says the value doesn't reach artifacts, so withholding doesn't change the answer.

**Finding C-3: `UNDECIDABLE` vs `EXCLUDED_WITH_REASON` boundary is tested but not comprehensive**
- **File:** `tests/reader-conformance.test.ts:198-233`
- **Issue:** The test only checks that:
  1. Exclusion is licensed when artifact is genuinely absent (line 202-207)
  2. Exclusion is refused when clause says value is never published (line 209-218)
  3. Exclusion is refused when nothing was withheld (line 220-226)
  4. Non-exclusion verdicts return null (line 228-233)
- **But:** It does not test that `UNDECIDABLE` is used correctly when the artifact is present but doesn't settle the question. The catalogue predicts several invariants will be UNDECIDABLE at the artifact level (CATALOGUE.md line 682-686).

---

## Question D: Harness Integrity

**Finding D-1: Only 4 of 9 invariants are tested for field coverage**
- **File:** `tests/reader-conformance.test.ts:76-95`
- **Lines:** 53-58 (mods table), 77-78 (loop)
- **Issue:** The test loop only iterates over ["I-1", "I-3", "I-5", "I-9"].
- **Impact:** I-2, I-4, I-6, I-7, I-8 have **no conformance tests at all** for field coverage.
- **Which functions run:** Only `checkI1`, `checkI3`, `checkI5`, `checkI9` are executed by the conformance harness. The other 5 check functions are never called.

**Finding D-2: Only 2 of 18 possible clause agreements are tested**
- **File:** `tests/reader-conformance.test.ts:165-191`
- **Lines:** 165-191
- **Issue:** The test iterates over `CLAUSE_KEYS` which only contains 2 entries.
- **Impact:** 16 invariant/producer combinations are not tested for clause agreement.

**Finding D-3: Only 3 evidence semantics rules are tested**
- **File:** `tests/reader-conformance.test.ts:198-233`
- **Issue:** The test uses the `EVIDENCE` array which has 3 entries (I-4, I-8, I-9 for hivemark).
- **Impact:** No evidence semantics testing for apex, and no testing for I-1, I-2, I-3, I-5, I-6, I-7.

**Finding D-4: The rationable test only checks 4 invariants for apex**
- **File:** `tests/reader-conformance.test.ts:112-136`
- **Lines:** 118-136
- **Issue:** The loop only iterates over ["I-1", "I-3", "I-5", "I-9"] for apex.
- **Impact:** No rationale checking for hivemark, and no checking for I-2, I-4, I-6, I-7, I-8.

**Finding D-5: The `ACCOUNTED_FOR` list pins known defects, making the suite pass despite gaps**
- **File:** `tests/reader-conformance.test.ts:30-33`
- **Lines:** 30-33, 86-93
- **Issue:** The `ACCOUNTED_FOR` object lists:
  - `"I-1/apex": "never opens health.entries[*].code"`
  - `"I-9/apex": "never opens health at all"`
- **And at lines 86-93:** If the invariant is in `ACCOUNTED_FOR`, the test **expects** it to miss fields (`expect(missed.length).toBeGreaterThan(0)`).
- **Impact:** The suite **passes** when it finds known defects, rather than failing. This is intentional (line 88-90 comment: "Pinned rather than skipped: if the check is repaired this fails"), but it means the suite is **green despite known blind spots**.
- **Analysis:** This is actually a good practice - it ensures new defects are caught while tracking known ones. But it does mean the suite currently has 2 known coverage defects that are accepted.

**Finding D-6: Which files are actually read - the conformance test doesn't use RecordingCorpus**
- **File:** `tests/reader-conformance.test.ts:35-72`
- **Issue:** The `runInstrumented` function uses `loadCorpus(".")` which returns a plain `Map`, and then wraps adapter return values with `watch`. It does not use `RecordingCorpus` from `src/coverage.ts` which would track `files.get()` calls.
- **Impact:** File-level access (vs property-level access) is not tracked by the reader-conformance tests. Only property access on parsed objects is tracked.
- **Note:** The `runAllWithCoverage` in `src/report.ts` does use `RecordingCorpus`, but the conformance tests use a different harness.

---

## Question D Summary: What actually runs

**Functions that run in the conformance suite:**
- `watch()` from `src/conformance/fields.ts` - wraps adapter return values
- `checkRationale()` from `src/conformance/rationale.ts` - checks reason phrasing
- `clauseVerdict()` from `src/conformance/clause.ts` - re-implements clauses (only 2)
- `checkEvidence()` from `src/conformance/evidence.ts` - checks evidence semantics (only 3 rules)
- Only check functions: `checkI1`, `checkI3`, `checkI5`, `checkI9`
- Only adapter functions: `apexHealth`, `apexHistory` (wrapped), but NOT `parseHivemark`

**Files that are read by the conformance suite:**
- `corpus/manifest.json` - via `loadCorpus()`
- `corpus/apex/health.json` - via `apexHealth()` (watched)
- `corpus/apex/history.json` - via `apexHistory()` (watched)
- `corpus/hivemark/attestations.json` - via `parseHivemark()` (NOT watched)
- `corpus/hivemark/provenance.json` - via `parseHivemark()` (NOT watched)
- `corpus/hivemark/anchors.json` - via `parseHivemark()` (NOT watched)
- NOT read: `hivemark/births.json`, `hivemark/corpus.json` (excluded per `src/coverage.ts:66-67`)
- NOT read: `apex/log/*.md` (only used by checks, not by conformance suite directly)

**Assertions that can actually fail:**
- Field coverage assertions for I-1, I-3, I-5, I-9 (apex only)
- Rationale assertions for I-1, I-3, I-5, I-9 (apex only)
- Clause agreement for I-3/hivemark and I-5/apex only
- Evidence semantics for I-4, I-8, I-9 (hivemark only)
- Settled rulings test for I-3/hivemark only (from `RULINGS` array)

**Assertions that CANNOT fail (because they're not tested):**
- Field coverage for I-2, I-4, I-6, I-7, I-8
- Field coverage for hivemark branch of any invariant
- Rationale for hivemark
- Rationale for I-2, I-4, I-6, I-7, I-8
- Clause agreement for 16 combinations
- Evidence semantics for most combinations

---

## The Killer Test

### Attempt 1: Break field coverage checking

**Synthetic corpus:** Create a minimal `apex/health.json` where `health.entries[*].code` contains a `null` value (the third state for I-1).

**Expected:** I-1/apex should return CONFORMS (since the not-observed state is exercised).

**What the suite checks:** The conformance test expects I-1/apex to open `health.entries[*].code` (bearing table, line 44).

**Actual check behavior:** Looking at `src/checks/i1.ts:45-66`, the apex branch does:
```typescript
const health = apexHealth(files);
const history = apexHistory(files);
const records = Object.values(history.hosts);
const states = new Set(records.map((h) => h.state));
const exercised = states.has("unknown") || records.some((h) => h.gaps > 0) || health.ok === false;
```

**Problem:** It checks `states` (from history), `gaps` (from history), and `health.ok`, but it **does not check `health.entries[*].code` at all**! The bearing table says `health.entries[*].code` bears on I-1/apex, but the check doesn't open it.

**Finding:** The check I-1/apex does NOT open `health.entries[*].code`. The conformance test's `ACCOUNTED_FOR` entry confirms this: `"I-1/apex": "never opens health.entries[*].code — OBS-060, erratum in relay-0165"`.

**But wait:** If the check doesn't open this field, and the conformance test expects it to miss this field (line 86-90), then the test **passes** despite the defect. This is Finding D-5 again.

**Can we break it?** If we repair the check to open `health.entries[*].code`, the conformance test would fail because it expects the field to NOT be opened (due to ACCOUNTED_FOR). So the suite is **locked in** - it passes with a known defect, and would fail if the defect were fixed without updating ACCOUNTED_FOR.

**This is actually good design** - the pinned test forces the defect to be fixed and the ACCOUNTED_FOR entry to be removed together.

### Attempt 2: Break clause fidelity

**Target:** I-5/apex. The clause says: "since never precedes first observation; gaps counted" (CATALOGUE.md line 270).

**Current check:** `src/checks/i5.ts:53-72`. The apex branch checks:
```typescript
const uncounted = records.filter((r) => typeof r.gaps !== "number");
const impossible = records.filter((r) => Date.parse(r.since) > Date.parse(history.updatedAt));
const anyGap = records.some((r) => r.gaps > 0);
verdict: uncounted.length > 0 || impossible.length > 0 ? "VIOLATES" : anyGap ? "CONFORMS" : "UNDECIDABLE"
```

**Problem:** The check requires `anyGap` (a non-zero gaps count) to return CONFORMS. But the clause only asks that gaps be **counted** (i.e., the field exists and is a number), not that any gap actually occurred.

**The clause.ts re-implementation:** `src/conformance/clause.ts:79-90`
```typescript
const uncounted = records.filter((r) => typeof r.gaps !== "number");
const impossible = records.filter((r) => Date.parse(r.since) > Date.parse(history.updatedAt));
const broken = uncounted.length + impossible.length;
return { verdict: broken > 0 ? "VIOLATES" : "CONFORMS", ... }
```

**Finding:** The clause re-implementation returns CONFORMS when `broken === 0`, regardless of whether any gaps exist. But the check returns UNDECIDABLE when `anyGap === false` (no gaps occurred).

**Demonstration:** On the current corpus, if all `gaps` are 0 but the field exists and is a number, and all `since` values are valid:
- Clause re-implementation: CONFORMS (no broken conditions)
- Actual check: UNDECIDABLE (no gaps occurred)

**Impact:** The check is **stricter** than its clause. This is exactly the failure mode mentioned in the clause.ts header (lines 15-18).

**But:** The conformance test for this is in `tests/reader-conformance.test.ts:165-191`. Line 161-163 has:
```typescript
const ACCOUNTED_CLAUSES: Readonly<Record<string, string>> = {
  "I-5/apex": "requires a non-zero gap before CONFORMS, which is the amended I-9 standard; the I-5 clause never asked for it and was never amended — OBS-060",
};
```

And at line 179-183:
```typescript
if (known) {
  expect(
    fromCheck?.verdict,
    `${key} now agrees with its clause; remove its ACCOUNTED_CLAUSES entry (${known})`,
  ).not.toBe(fromClause?.verdict);
}
```

So the test **expects** them to disagree! If someone fixes the check to match the clause, the test would fail, forcing them to also remove the ACCOUNTED_CLAUSES entry.

**Again, this is good design** - but it means the suite currently has a known fidelity defect.

### Attempt 3: Break evidence semantics

**Target:** I-8/hivemark. The clause says the unverifiable list doesn't appear in attestations.json.

**Check behavior:** `src/checks/i8.ts:20-31`. The hivemark branch checks if any envelope carries `"unverifiable"` or `"limits"` key. It returns CONFORMS if they do, UNDECIDABLE if they don't.

**Evidence rule:** `src/conformance/evidence.ts:44-51`
```typescript
{
  invariant: "I-8",
  producer: "hivemark",
  needs: ["hivemark/attestations.json"],
  unpublishedByClause: true,
  because: "the clause says the value never reaches an artifact..."
}
```

**Test:** `tests/reader-conformance.test.ts:209-218`
```typescript
it("refuses exclusion when the clause says the value is never published", () => {
  for (const invariant of ["I-8", "I-9"]) {
    const rule = EVIDENCE.find((r) => r.invariant === invariant);
    expect(rule).toBeDefined();
    if (!rule) continue;
    const problem = checkEvidence(rule, "EXCLUDED_WITH_REASON", () => false);
    expect(problem, `${invariant}/hivemark should not be excludable`).not.toBeNull();
    expect(problem?.should).toBe("UNDECIDABLE");
  }
});
```

This test checks that if a reader returns `EXCLUDED_WITH_REASON` for I-8/hivemark, the evidence check will flag it as wrong (should be UNDECIDABLE).

**Can we break it?** If the check returned `EXCLUDED_WITH_REASON` instead of UNDECIDABLE, the test would catch it. So this part seems solid.

**But:** What if we look at I-8/apex? There's no evidence rule for it (EVIDENCE array doesn't have it). If the apex check returned `EXCLUDED_WITH_REASON`, the evidence semantics test wouldn't check it at all.

**Finding:** Evidence semantics is only checked for the 3 rules in the EVIDENCE array. For other invariants/producers, a check could return `EXCLUDED_WITH_REASON` incorrectly and the suite wouldn't catch it.

### Successful Break: Field coverage for untested invariants

**Synthetic scenario:** Modify `src/checks/i2.ts` to stop opening a bearing field for I-2/apex.

**Bearing for I-2:** Looking at `src/conformance/bearing.ts`, there's no bearing entry for I-2 at all! The bearing table only has entries for I-1, I-3, I-5, I-9 for apex.

**Wait:** The bearing table is authored by the suite author and only covers some invariants. But CATALOGUE.md has reader clauses for I-2:
- hivemark: "assert every occurrence time precedes the corpus extraction timestamp; assert H's message.time values are not clustered into one publication window" (line 158-159)
- apex: "assert A's since <= checkedAt" (line 157)

So bearing fields for I-2/apex should include `history.hosts[*].since` and `health.checkedAt`. But the bearing table doesn't have an entry for I-2.

**Finding:** The bearing table is **incomplete**. It doesn't cover I-2, I-4, I-6, I-7, I-8 for either producer.

**Impact:** Even if the conformance test tried to check field coverage for I-2, there's no bearing table entry to check against. The `bearingFor()` function (line 71-72) would return undefined.

**This is a structural gap**: The suite cannot check field coverage for invariants that aren't in the bearing table.

---

## Summary of Findings

| Question | Status | Key Findings |
|----------|--------|--------------|
| A: Coverage | **FAIL** | Field watcher only covers apex adapters; bearing table incomplete; only 4/9 invariants tested |
| B: Fidelity | **PARTIAL** | Only 2/18 clause re-implementations exist; known defect for I-5/apex pinned |
| C: Evidence | **PARTIAL** | Only 3/18 evidence rules exist; no apex coverage |
| D: Integrity | **FAIL** | Only 4/9 invariants have any conformance tests; known defects pinned to pass |

### Most Serious Issues

1. **The conformance suite does not test hivemark at all for field coverage** - The watch mechanism only wraps apex adapters, so hivemark checks' field access is invisible to the suite.

2. **5 of 9 invariants have zero conformance testing** - I-2, I-4, I-6, I-7, I-8 are not checked for field coverage, clause fidelity, or rationale.

3. **The bearing table is incomplete** - Only covers 4 invariants for apex, none for hivemark.

4. **The suite passes despite known blind spots** - The ACCOUNTED_FOR mechanism pins known defects, so the suite is green while having documented gaps.

### The Suite's Self-Audit

The suite does have mechanisms to catch defects:
- `ACCOUNTED_FOR` pins known issues so new ones are visible
- Pinned tests fail if defects are fixed without updating the pin
- This forces coordinated fixes

However, these mechanisms only cover what the suite **chooses to test**. The fact that 5 invariants and all hivemark field access are untested means the suite has **structural blind spots** that the pinning mechanism doesn't address.

---

## Recommendations

1. **Expand the bearing table** to cover all 9 invariants for both producers, derived from the CATALOGUE.md reader clauses.

2. **Wrap all adapter functions** in the field watcher, including `parseHivemark` and any other adapters.

3. **Add clause re-implementations** for all invariant/producer combinations, not just 2.

4. **Add evidence rules** for all invariants, not just 3.

5. **Test all 9 invariants** in the conformance suite, not just 4.

6. **Add rationale checking** for hivemark and for the untested invariants.

Without these changes, the suite is **demonstrably incomplete** and cannot claim to audit the reader comprehensively.
