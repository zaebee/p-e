# Audit Report: suite-audit

**Audit Date:** 2026-08-29  
**Auditor:** Mistral Vibe (via bee.zae prompt)  
**Scope:** Conformance suite in `suite/conformance/` and `suite/tests/`  
**Target:** Reader implementation in `suite/checks/` against `CATALOGUE.md` catalogue

---

## Executive Summary

The conformance suite **fails its own mission**. It exists to ensure the reader does not have blind spots, yet the suite itself has structural blind spots that prevent it from auditing the reader comprehensively. The suite passes its own tests while being unable to detect classes of defects in the reader it audits.

**Verdict:** The suite is **not fit for purpose** in its current form. It provides partial coverage that gives a false sense of security.

---

## Questions Answered

### A. Coverage: Does the suite observe all data the verdict depends on?

**Status: VIOLATES**

The suite fails to observe critical data that its own verdicts depend on.

#### A-1. Field watcher only instruments apex adapters

**File:** `suite/tests/reader-conformance.test.ts:44-47`

```typescript
vi.doMock("../src/adapters/apex.js", () => ({
  ...real,
  apexHealth: (f: Map<string, Uint8Array>) => watch(real.apexHealth(f), "health", seen),
  apexHistory: (f: Map<string, Uint8Array>) => watch(real.apexHistory(f), "history", seen),
}));
```

**Defect:** `parseHivemark` is **not wrapped**. Every check that reads hivemark artifacts (I-1, I-2, I-3, I-4, I-6, I-8, I-9 all have hivemark branches) has its field access **completely invisible** to the conformance suite.

**Impact:** If `checkI1` fails to open a field that bears on I-1/hivemark, the suite **cannot detect it**.

**Demonstration:** `suite/checks/i1.ts:17` calls `parseHivemark(files, "hivemark/attestations.json")` directly. The conformance test does not instrument this, so any field access within hivemark artifacts is untracked.

#### A-2. Only 4 of 9 invariants are tested for field coverage

**File:** `suite/tests/reader-conformance.test.ts:53-58, 77-95`

```typescript
const mods: Record<string, () => Promise<Record<string, unknown>>> = {
  "I-1": () => import("../src/checks/i1.js"),
  "I-3": () => import("../src/checks/i3.js"),
  "I-5": () => import("../src/checks/i5.js"),
  "I-9": () => import("../src/checks/i9.js"),
};
// Loop only iterates over ["I-1", "I-3", "I-5", "I-9"]
```

**Defect:** I-2, I-4, I-6, I-7, I-8 are **never tested** for field coverage.

**Impact:** A check for these invariants could fail to open all bearing fields and the suite would not catch it.

#### A-3. Bearing table is incomplete

**File:** `suite/conformance/bearing.ts:40-69`

The `BEARING` array only contains entries for 4 invariants (I-1, I-3, I-5, I-9) for apex only.

**Missing:** No bearing entries for:
- All hivemark invariants
- I-2, I-4, I-6, I-7, I-8 for both producers

**Impact:** Even if the conformance suite tried to check field coverage for I-2, there is no bearing table entry to check against. `bearingFor()` returns `undefined`.

**Root cause:** The bearing table is authored by the suite author and only covers selected invariants, creating a structural gap.

#### A-4. `ownKeys` trap does not record property enumeration

**File:** `suite/conformance/fields.ts:75-77`

```typescript
ownKeys(target) {
  return Reflect.ownKeys(target);
}
```

**Defect:** Returns keys without adding them to `seen`. A check using `Object.keys(obj)` to determine which properties exist (without accessing them) would not have this recorded.

**Impact:** Low for current corpus, but creates a gap in the observation mechanism for edge cases.

---

### B. Fidelity: Does the suite execute the falsifier from the frozen clause?

**Status: VIOLATES** (partial implementation)

The suite only partially verifies fidelity to the clause text.

#### B-1. Only 2 of 18 clause re-implementations exist

**File:** `suite/conformance/clause.ts:51-91`

The `CLAUSES` object contains only:
- `I-3/hivemark`
- `I-5/apex`

**Defect:** 16 invariant/producer combinations have **no clause re-implementation** at all.

**Impact:** For these 16, the suite **does not verify** whether the check agrees with its clause.

#### B-2. Known fidelity defect is pinned

**File:** `suite/tests/reader-conformance.test.ts:161-163`

```typescript
const ACCOUNTED_CLAUSES: Readonly<Record<string, string>> = {
  "I-5/apex": "requires a non-zero gap before CONFORMS, which is the amended I-9 standard; the I-5 clause never asked for it and was never amended — OBS-060",
};
```

**Defect:** The check for I-5/apex requires `anyGap` (a non-zero gaps count) to return CONFORMS. But CATALOGUE.md §3 line 270 states the clause asks only that gaps be **counted** (field exists and is a number), not that any gap occurred.

The clause re-implementation in `clause.ts` correctly returns CONFORMS when gaps field exists and is valid, regardless of whether any gap occurred. But the check is stricter than its clause.

**Impact:** This is a **real fidelity defect** that the suite knows about but accepts (via the ACCOUNTED_CLAUSES pin). The pin ensures the defect is visible, but it still exists.

---

### C. Evidence Semantics: Handling of EXCLUDED_WITH_REASON, UNDECIDABLE, VIOLATES, CONFORMS

**Status: VIOLATES** (partial implementation)

The suite only partially validates evidence semantics.

#### C-1. Only 3 evidence rules exist

**File:** `suite/conformance/evidence.ts:43-68`

The `EVIDENCE` array contains only:
- `I-4/hivemark`
- `I-8/hivemark`
- `I-9/hivemark`

**Defect:** No evidence rules for:
- All apex invariants
- I-1, I-2, I-3, I-5, I-6, I-7 for both producers

**Impact:** If a check returns `EXCLUDED_WITH_REASON` for an untested invariant/producer, the suite **does not validate** whether the exclusion is licensed.

#### C-2. Evidence semantics tests are limited

**File:** `suite/tests/reader-conformance.test.ts:198-233`

Tests only verify:
1. Exclusion is licensed when artifact is genuinely absent
2. Exclusion is refused when clause says value is never published
3. Exclusion is refused when nothing was withheld
4. Non-exclusion verdicts return null

**Defect:** Does not test that `UNDECIDABLE` is used correctly when the artifact is present but does not settle the question.

**Note:** CATALOGUE.md §9 line 682-686 predicts several invariants will be UNDECIDABLE at the artifact level. The suite does not verify these are correctly identified.

---

### D. Harness Integrity: Which functions run, which files are read, which assertions can fail?

**Status: VIOLATES**

The test harness has significant gaps in what it exercises.

#### D-1. Functions that actually run in the conformance suite

**Executed:**
- `watch()` from `suite/conformance/fields.ts`
- `checkRationale()` from `suite/conformance/rationale.ts`
- `clauseVerdict()` from `suite/conformance/clause.ts` (2 combinations)
- `checkEvidence()` from `suite/conformance/evidence.ts` (3 rules)
- Check functions: `checkI1`, `checkI3`, `checkI5`, `checkI9`
- Adapter functions: `apexHealth`, `apexHistory` (wrapped with watch)

**NOT executed:**
- `checkI2`, `checkI4`, `checkI6`, `checkI7`, `checkI8`
- `parseHivemark` (not wrapped with watch)
- Clause re-implementations for 16 combinations
- Evidence checks for 15 combinations

#### D-2. Files that are actually read

**Read:**
- `corpus/manifest.json` via `loadCorpus()`
- `corpus/apex/health.json` via watched `apexHealth()`
- `corpus/apex/history.json` via watched `apexHistory()`
- `corpus/hivemark/*.json` via unwatched `parseHivemark()`

**NOT read:**
- `hivemark/births.json` (excluded per `suite/coverage.ts:66-67`)
- `hivemark/corpus.json` (excluded per `suite/coverage.ts:68-70`)
- `apex/log/*.md` (not used by conformance suite)

#### D-3. Assertions that can actually fail

| Test Category | Coverage | Details |
|--------------|----------|---------|
| Field coverage | 4/9 invariants | I-1, I-3, I-5, I-9 (apex only) |
| Rationale | 4/9 invariants | I-1, I-3, I-5, I-9 (apex only) |
| Clause agreement | 2/18 combinations | I-3/hivemark, I-5/apex |
| Evidence semantics | 3/18 combinations | I-4, I-8, I-9 (hivemark only) |
| Settled rulings | 1/18 combinations | I-3/hivemark only |

**Assertions that CANNOT fail (because they are not tested):**
- Field coverage for I-2, I-4, I-6, I-7, I-8
- Field coverage for hivemark branch of any invariant
- Rationale for hivemark
- Rationale for I-2, I-4, I-6, I-7, I-8
- Clause agreement for 16 combinations
- Evidence semantics for 15 combinations

#### D-4. Known defects are pinned to pass

**File:** `suite/tests/reader-conformance.test.ts:30-33, 86-93, 114-116, 131-132, 161-163, 180-183, 202-218`

The suite uses an "accounted-for" pattern that pins known defects:
- `ACCOUNTED_FOR`: Known field coverage defects
- `ACCOUNTED_REASONS`: Known rationale overclaims
- `ACCOUNTED_CLAUSES`: Known clause fidelity issues

**Mechanism:** If a defect is in the accounted list, the test **expects it to exist** and passes if found. This forces coordinated fixes (defect + pin must be removed together).

**Impact:** The suite is **green despite known blind spots**. This is intentional design, but it means the suite does not currently provide full coverage.

---

## The Killer Test: Can the Suite Be Broken?

**Status: YES - The suite can be trivially broken**

### Method 1: Exploit untested invariants

**Attack:** Modify `suite/checks/i2.ts` to stop opening bearing fields for I-2/apex.

**Why it works:** The conformance suite does not test I-2 at all. There is no bearing table entry for I-2. The check could fail to open `history.hosts[*].since` and `health.checkedAt` (which the CATALOGUE.md reader clause for I-2/apex requires) and the suite would not detect it.

**Files to modify:**
- `suite/checks/i2.ts:11-12` - Remove the `since` and `checkedAt` access

**Expected result:** Suite passes, but the check no longer properly verifies I-2.

### Method 2: Exploit unwatched hivemark access

**Attack:** Modify `suite/checks/i1.ts` to stop opening `health.entries[*].code` for hivemark.

**Why it works:** The conformance suite only wraps apex adapters. Hivemark access via `parseHivemark` is not instrumented. The check could completely fail to open hivemark fields and the suite would not detect it.

**Files to modify:**
- `suite/checks/i1.ts:17-27` - Remove all field access from the parsed hivemark data

**Expected result:** Suite passes (hivemark branch not watched), but the check no longer properly verifies I-1/hivemark.

### Method 3: Exploit missing clause re-implementation

**Attack:** Modify `suite/checks/i6.ts` to return CONFORMS when it should return VIOLATES.

**Why it works:** There is no clause re-implementation for I-6/apex or I-6/hivemark. The clause agreement test only checks 2 of 18 combinations. A defect in I-6 would not be caught.

**Files to modify:**
- `suite/checks/i6.ts:31-46` - Change the hivemark logic to always return CONFORMS

**Expected result:** Suite passes (no clause test for I-6), but the check no longer properly verifies I-6.

### Method 4: Exploit missing evidence rules

**Attack:** Modify `suite/checks/i7.ts` to return `EXCLUDED_WITH_REASON` instead of `UNDECIDABLE`.

**Why it works:** There is no evidence rule for I-7. The evidence semantics test only checks 3 of 18 combinations. An incorrect `EXCLUDED_WITH_REASON` verdict would not be validated.

**Files to modify:**
- `suite/checks/i7.ts:35-39` - Change verdict to `EXCLUDED_WITH_REASON`

**Expected result:** Suite passes (no evidence test for I-7), but the check incorrectly disclaims the question.

---

## Root Cause Analysis

The suite has **structural blind spots** that stem from incomplete implementation:

1. **Selective testing:** Only 4 of 9 invariants are tested for field coverage and rationale
2. **Producer bias:** Only apex is instrumented; hivemark is completely unwatched
3. **Incomplete data:** Bearing table, clause re-implementations, and evidence rules only cover subsets
4. **Self-audit gap:** The suite does not apply its own standards to itself comprehensively

These are not bugs in the suite's code, but **gaps in its scope**. The suite correctly implements what it chooses to test, but it chooses not to test most of the reader.

---

## Recommendations

To make the suite fit for purpose, the following changes are required:

### Priority 1: Expand scope to all invariants

1. **Add bearing table entries** for all 9 invariants for both producers, derived from CATALOGUE.md reader clauses
2. **Add clause re-implementations** for all 18 invariant/producer combinations
3. **Add evidence rules** for all 18 combinations
4. **Test all 9 invariants** in the conformance suite, not just 4

### Priority 2: Fix instrumentation gaps

1. **Wrap all adapter functions** with the field watcher, including `parseHivemark` and any other adapters
2. **Fix the `ownKeys` trap** to record property enumeration
3. **Use RecordingCorpus** in the conformance tests to track file-level access

### Priority 3: Add rationale checking for all

1. **Extend rationale checking** to hivemark
2. **Add rationale checking** for I-2, I-4, I-6, I-7, I-8

### Priority 4: Validate evidence semantics comprehensively

1. **Add evidence rules** for all invariants, both producers
2. **Test UNDECIDABLE** usage, not just EXCLUDED_WITH_REASON

---

## Evidence Summary

| Question | Status | Findings | Severity |
|----------|--------|----------|----------|
| A. Coverage | VIOLATES | 4 findings | HIGH |
| B. Fidelity | VIOLATES | 2 findings | HIGH |
| C. Evidence Semantics | VIOLATES | 2 findings | HIGH |
| D. Harness Integrity | VIOLATES | 5 findings | HIGH |
| Killer Test | VIOLATES | 4 attack methods | CRITICAL |

**Overall Assessment:** The suite is **structurally incomplete** and cannot reliably detect defects in the reader it audits. It provides a false sense of security by passing its own tests while having known, documented gaps that prevent it from auditing the full scope of the reader's behavior.

---

## Files Referenced

All findings reference specific files and lines in the `suite/` directory:
- `suite/conformance/bearing.ts`
- `suite/conformance/fields.ts`
- `suite/conformance/clause.ts`
- `suite/conformance/evidence.ts`
- `suite/conformance/rationale.ts`
- `suite/tests/reader-conformance.test.ts`
- `suite/tests/settled-rulings.test.ts`
- `suite/checks/i1.ts` through `suite/checks/i9.ts`
- `suite/adapters/apex.ts`
- `suite/adapters/hivemark.ts`

---

*This audit was conducted independently by reading the suite code and understanding its behavior. No external resources or network access were used. The findings are based solely on analysis of the code in this directory.*
