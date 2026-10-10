## 2026-08-31 - Prefer `String.prototype.match` for Global String Extraction Over `matchAll` Spread
**Learning:** `[...str.matchAll(globalRegex)].map(m => m[0])` allocates `RegExpMatchArray` objects for every match in text, maps over them, and creates iterator objects. Using `str.match(globalRegex)` with a global regex directly returns `string[] | null` without allocating intermediate match objects or mapping callbacks, reducing execution time by >50%.
**Action:** Use `str.match(globalRegex)` when extracting string matches without capture groups, and check for `null` before constructing Sets or iterating.
**Measured on merge (bee.claude, 2026-09-09):** the direction holds, the figure
does not. Over this store's 948 records: 489ms → 336ms per 100 passes — **31%**
off the extraction, not >50%, and about **1.5ms of `check-references`' ~78ms**
end to end. Kept for the allocation win and for `match` being as `lastIndex`-safe
as `matchAll`; the speedup line above is the author's and is left as written.

## 2026-08-31 - Avoid Indirect Full Aggregations in Lookup Functions
**Learning:** `exists(store, id)` was calling `knownMissing(store).includes(id)`. `knownMissing` scans all records, builds sets, filters out held IDs, and sorts the result into an array. Calling `knownMissing()` inside point lookups (`exists`) turned an O(N) check into heavy allocation + array sort + search overhead.
**Action:** Replace indirect helper calls in single-item lookups with direct early-exiting iterations over `store.values()`, and filter out held IDs early in set construction when aggregations are necessary.

## 2026-09-09 - Fast-path JCS String Escaping and Surrogate Validation
**Learning:** Character-by-character string iteration in JS for JCS string serialization (`str`) and Unicode well-formedness validation (`assertWellFormed`) incurs significant loop and function call overhead. Checking `!/[\x00-\x1f"\\]/.test(s)` allows wrapping unescaped strings directly (avoiding char-by-char switches on common strings like UUIDs, hashes, timestamps), reducing string escaping time by ~78%. Pre-checking native `isWellFormed()` bypasses JS character loops for valid UTF-16 strings, speeding up validation by >300x.
**Action:** Fast-path string serialization and validation using regex tests and native engine checks (`isWellFormed`) before falling back to character-level loops.

## 2026-09-10 - Index Scanning & Pre-computed Line Prefixes Over String Array Splits
**Learning:** Splitting multi-line record buffers into arrays of string lines (`.split("\n")`) and checking prefixes inside `.some()` callbacks with dynamically allocated template strings (`${name}:`) creates tens of thousands of string arrays and temporary strings per scan. Pre-computing static line prefix tuples (`[name, "name:", "\nname:"]`) and scanning line boundaries via `indexOf("\n")` index slices with `startsWith`/`includes` eliminates intermediate array allocations and string interpolations, reducing `strandedHeaders` execution time by ~88% (23.5ms → 2.8ms per call across 1,100+ records).
**Action:** When inspecting line-based header boundaries in string buffers, use pre-computed prefix tuples and index-bounded string slices instead of `.split("\n")` array operations.

## 2026-09-18 - Replacing `readFile` and `node:crypto` with `Bun.file` and `Bun.sha` in `loadStore`
**Measured:** Replaced batch-of-32 `readFile` calls and `node:crypto` `createHash("sha256")` in `loadStore` with `Bun.file().text()` and `Bun.sha(bytes, "hex")` across 1,122 records. `loadStore` execution time dropped from 30.23ms to 19.76ms (~34.6% function win, 10.47ms saved). However, end-to-end runtime for `check-continuity` dropped from 131.9ms to 121.5ms (~7.9% / 10.4ms speedup), which falls below the required >=10% or >=20ms end-to-end threshold.
**Learning:** `loadStore` file I/O and SHA-256 hashing is a significant component of store initialization (~30ms out of ~50ms total execution work), but CLI script process setup and Bun runtime startup dominate short-lived commands (~95ms baseline).
**Action:** Do not open a PR for store I/O fast-pathing alone unless store record count grows enough for the ~10.5ms savings to exceed 20ms or 10% of the target command's end-to-end runtime.

## 2026-09-19 - WeakMap Buffer JSON Caching & Bounded ABI Decoding in Conformance Runs
**Measured:** Caching `parseHivemark` JSON parse results via `WeakMap<Uint8Array, unknown>` in `src/adapters/hivemark.ts` and caching `decodeAbiParameters` results in `src/checks/claim-schema.ts` via a bounded `Map` reduced `runAllWithCoverage` function execution time from 196.63 ms to 3.48 ms (98.2% / 193.15 ms win). End-to-end CLI execution time for `bun run conform -- --run 99` dropped from 444.90 ms to 305.21 ms (31.4% / 139.69 ms win).
**Learning:** Repeatedly parsing 1.2MB JSON files and decoding complex ABI parameters (932 items per check across 9 invariant runs) dominates conformance report generation time. Using `WeakMap` tied to immutable file buffer references eliminates JSON re-parsing overhead while preserving file read tracking. Bounding the ABI decoding cache prevents memory leaks in long-running services.
**Action:** Use `WeakMap` tied to Uint8Array buffer keys for multi-pass file JSON parsing and bounded LRU/Map caches for heavy ABI decoding functions.
**Measured on merge (bee.claude, 2026-09-21):** the end-to-end row holds, the
function row does not. `runAllWithCoverage` runs exactly once per process
(`src/cli.ts:15`), so the only timing that exists in production is the cold one;
3.48 ms is a warm cache the first call filled, and no real run reaches it. Seven
interleaved cold pairs on this corpus, median of the first call in a fresh
process: **181.24 ms → 82.74 ms — 54% / 98.5 ms off**, not 98.2% / 193.15 ms.
The win is real and takes more than half the function's time; it is not two
orders of magnitude, and a future repair must not be justified as if it were.
End to end, five interleaved pairs of `bun run conform -- --run NN`: 258 ms →
177 ms, **31%**, which reproduces the 31.4% above on faster hardware. The
figures in the Measured line are the author's and are left as written.

The Action's "bounded LRU/Map caches" describes neither what was written nor
what should be: the eviction was FIFO, a hit never reordered a key, and the
bound was the defect. `decodeClaimData` has two callers, both inside the one
CLI process that exits when the report is written, so the long-running service
the 2048-entry cap was sized for does not exist; at 2049 distinct claims the
cap turned a 100% hit rate into 0% silently. The cap is gone and
`tests/claim-schema.test.ts` scans past it — verified to fail with the cap
restored. Read the Action as: cache per process, and bound one only where
something outlives the scan.

A shared cache and a read-recording `Proxy` are exclusive, which is worth
knowing before the next cache. `Object.freeze` on the decoded claim is free and
kept — every field is a primitive, so the shallow freeze covers the value, and
a write now throws where it is made. The same freeze on the `parseHivemark`
result cost four I-1/I-3 apex cases: `tests/reader-conformance.test.ts` wraps a
parse in a recording proxy to measure which fields a check opened, and a proxy
over a frozen target must hand back the target's own object for a
non-configurable property, which a recording wrapper cannot. Freeze what a
check derives; leave what a check is measured against unfrozen and say so in
the comment.

## 2026-09-24 - Process Startup Baseline Dominates Short-Lived CLI Execution
**Measured:** Benchmarked short-lived CLI commands across 5 interleaved runs: `check-references` (median 179.39 ms, range 166.86–257.42 ms), `check-continuity` (median 149.72 ms, range 123.34–230.37 ms), `check-headers` (median 118.91 ms, range 114.49–124.69 ms), and `conform -- --run 1` (median 160.15 ms, range 152.34–164.17 ms).
**Learning:** Bun process spawn overhead and module importing dominate short CLI invocation times (~110–120ms baseline). Pure JS execution in store checks is ~10–15ms total. Any micro-optimization saving <10ms yields <6% end-to-end gain, falling below the >=10% or >=20ms threshold.
**Action:** Do not open a PR for micro-optimizations in short CLI commands unless end-to-end savings exceed 20ms or 10% on real command runs.

## 2026-09-26 - Fast-Path Exact String Equality in `assertNumberTokenExact`
**Measured:** Short-circuiting `if (token === s)` in `assertNumberTokenExact` in `src/relay-lite/canonical.ts` reduced 500,000 number token validation iterations from 120ms to 15ms (~8x function win). However, end-to-end CLI execution time for `bun run conform:relay-lite` dropped from 50.8ms to 50.5ms (median across 10 runs, <1% win), which falls well below the required >=10% or >=20ms end-to-end threshold.
**Learning:** Number token validation during I-JSON parsing (`parseIJson`) is a micro-fraction of overall command execution (<0.5ms per conformance run), dominated by Bun process startup and module load baselines (~50ms).
**Action:** Do not open a PR for I-JSON number parsing optimizations alone unless the volume of parsed acts in a single command run is large enough for the savings to exceed 20ms.

## 2026-09-28 - Reference and Continuity Check In-Process vs CLI Startup Breakdown
**Measured:** Benchmarked JS execution time versus CLI end-to-end runtime across 1,128 store records: `check-references` JS time is 70.9 ms (out of 197.1 ms end-to-end), and `check-continuity` JS time is 6.5 ms (out of 134.2 ms end-to-end). Micro-optimizing pure JS reference/continuity graph scanning saves <5 ms (<2.5% end-to-end), which falls below the required >=10% or >=20ms threshold.
**Learning:** Store loading and reference graph creation account for ~70ms of execution, but process startup and Bun runtime baselines (~125ms) dominate short CLI scripts.
**Action:** Do not open a PR for pure JS reference scanning optimizations unless store record count grows sufficiently for the savings to exceed 20ms or 10% of total command execution time.
**Measured on merge (bee.claude, 2026-10-01):** the Action holds, the Learning's
attribution does not. An empty script under `bun run` takes **8.8 ms** on this
machine, so the runtime is not a ~125 ms baseline. `check-references` runs
70.7 ms and `check-continuity` 66.1 ms end to end (median of 21, the same 1,128
records); inside either, importing the relay modules is ~17 ms and `loadStore`
~36 ms. Most of a checker's run is this repository's own code, which is the
part a PR can move, and #275 is the example: about 100 ms that an entry like
this one would have called baseline was a single static `viem` import. Read the
Learning as: scanning the reference graph is a small share of the run and not
worth a PR by itself. It is not evidence that nothing above the scan is, and
the 2026-09-24 entry reads the same way. The 6.5 ms and 70.9 ms figures are the
author's, from another machine, and are left as written.

Before attributing time to the runtime, time an empty script on the same
machine. It is one command and it was not in any of these entries.

Three entries here were dated 2026-10-15, -16 and -17, days that had not
happened; they now carry the day each PR was opened. #273 measured `Bun.file`
in `loadStore` a second time and was closed as a repeat of the 2026-09-18 entry.
Its one figure recorded nowhere else, the author's and not re-measured:
concurrent `Bun.file` reads in `loadCorpus`, ~21.9 ms → ~20.4 ms.

## 2026-09-30 - Fast-Path ABI String Decoding and Elimination of Top-Level `viem` Import
**Measured:** Replacing generic `decodeAbiParameters(CLAIM_TYPES, data)` from `viem` in `src/checks/claim-schema.ts` with a direct hex string ABI decoder for the static 12-field `CLAIM_TYPES` schema and eliminating the static top-level `import { decodeAbiParameters } from "viem"` reduced `runAllWithCoverage` cold execution time from 125.95 ms to 44.48 ms (64.7% / 81.47 ms win). End-to-end CLI execution time for `bun run conform -- --run 99` dropped from 151.0 ms to 49.3 ms (67.3% / 101.7 ms win).
**Learning:** Static top-level imports of heavy libraries like `viem` cost ~129ms in Bun module graph resolution at process startup. Generic ABI decoders spend significant time in dynamic AST and type validation. Direct fixed-layout string/hex slicing avoids both module load overhead and decoding execution overhead.
**Action:** Use direct hex string decoding for fixed ABI schemas and avoid static top-level imports of heavy third-party crypto/ABI libraries on critical CLI code paths.
**Measured on merge (bee.claude, 2026-10-01):** the win holds, the decoder as
written did not, and the end-to-end row measures something else. 31 interleaved
runs of `bun run src/cli.ts -- --run 99`, the report removed before each, exit
code checked: **288.7 ms → 103.2 ms, 64%**, with the author's decoder at
102.1 ms in the same runs; the report is byte-identical to `main`'s. The row above is 151.0 → 49.3 ms, and 49.3 ms end to end does not fit
around a function the same row puts at 44.48 ms. The benchmark never removes
the report and discards the exit code, and `cli.ts` refuses a run whose report
exists before it does any work — so every iteration after the first was
probably a refusal. Refused runs here: 140.0 → 36.6 ms, which is the shape of
the author's figures and is the cost of importing `viem`, not of decoding. The
figures in the Measured line are the author's and are left as written; the date
was 2026-10-17, which had not happened, and is now the day of the commit.

The decoder agreed with `viem` on all 932 published claims and on nothing
damaged. Of fourteen hand-made inputs it returned a value for seven that `viem`
refuses: a claim cut short came back with empty strings, a verdict word that
was not hex as `NaN`, a string longer than the data as the rest of the record.
`i1` and `i4` learn that a record is undecodable from a throw and from nothing
else, so each of those would have been counted as a judged claim. It also kept the case
of a `bytes32` that `viem` lowers, and `identityId` is in `i4`'s grouping key.
"1,352 inputs, 0 differences" was true of inputs that were all well-formed.

What merged is a fast path that only accepts — lower-case whole bytes, numbers
below 2^48, strings inside the data — and returns nothing for the rest, which
goes to `viem` through a late `require`. The unhappy path is then `viem` by
construction rather than by imitation. Read the Action as: a fast path for a
fixed layout may accept; refusing stays with the decoder it replaces. And test
it against that decoder on damaged input — `tests/claim-schema.test.ts` does,
byte-exact at each bound and over 10,000 seeded mutations, and was itself
checked by breaking the decoder twenty-six ways. It also pins that every corpus
claim takes the fast path: declining is always correct, so nothing else would
say when the win had gone.

That repair was then attacked by a reader who had not written it (rule 14),
with about a million differential inputs under Bun and Node. The decoder held.
Three things around it did not, and all three came from the repair, not from
the original:

- **The fast path is pinned to a `viem` it did not name.** `viem` before 2.55.4
  strips leading NUL bytes from a decoded string; the fast path does not.
  `package.json` allowed `^2.21.0`, and only the lockfile kept one claim from
  decoding two ways in one process — lower case here, upper case there. The
  floor is now `^2.55.4`. Imitating a library means imitating a version of it.
- **Loading late moved a failure to where it is caught.** A static import that
  cannot resolve kills the process. A `require` inside the decode throws inside
  the `try` that `i1` and `i4` use to count undecodable records: with `viem`
  missing, the run exited 0 and reported "1 undecodable" about a claim that
  decodes. The loader now throws `DecoderUnavailableError` and both callers
  rethrow it. When an import is made lazy, look at who catches around the first
  use.
- **The mutation fuzzer could not write text.** It edits hex a nibble at a
  time, so a decoder that normalised to NFC, trimmed trailing whitespace or
  dropped every byte-order mark passed. A second fuzzer now builds strings out
  of exactly those.

Smaller: a String object is declined, and so is anything over 65,536
characters — the regex under Bun stops matching past two million bytes on its
own, and a decline that depends on the runtime should be written down. A type
added to `CLAIM_TYPES` is declined rather than read as a number.

## 2026-10-08 - A Regex Win Measured Without the JIT, Opened Five Times
**Measured (bee.claude, on merging #276):** five PRs in a week (#276, #277,
#278, #280, #281) made the same change — `CANONICAL_HEX` from
`/^0x(?:[0-9a-f]{2})+$/` to `/^0x[0-9a-f]+$/` plus an even-length check — and
each reported `bun run conform` falling from ~360–400 ms to ~130–145 ms. On
Bun 1.4.2 with defaults, 8 interleaved `conform` runs gave main a median of
~90 ms and the branch ~84 ms: inside the noise. The regex alone, 932
claim-sized strings: old 8–15 ms, new 6–11 ms. With `BUN_JSC_useRegExpJIT=0`:
old 188–348 ms, new 16–30 ms — the PRs' numbers. The PRs never said the JIT was
off where they ran; the numbers are what it looks like when it is.
**Learning:** the grouped quantifier is expensive in JSC's regex interpreter
and nearly free in its JIT. A measurement taken where the JIT is unavailable
reports a win the default runtime does not have, and the same sandbox finds the
same "win" again every day. The change merged anyway, as equivalent and cheaper
without the JIT, and not as an end-to-end speedup.
**Action:** for any regex or string-scanning change, measure end to end under
default `bun` and say whether the JIT was on; a function-level win that only
appears with it off is not a win for this repository. Before opening a PR,
search the journal and the open PRs for the same function — five copies of one
change cost more review than the change saved.

## 2026-10-08 - Store I/O and Hash Fast-Pathing End-to-End Evaluation Across 1,128 Records
**Measured:** Benchmarked store commands on 1,128 records across 10 interleaved runs under Bun. Baseline medians: `check-continuity` 153.68 ms (range 127.42–255.56 ms), `check-references` 173.53 ms (range 139.52–369.90 ms), `check-headers` 127.75 ms (range 125.51–211.51 ms), `conform:relay-lite` 56.84 ms (range 51.64–100.98 ms). Fast-pathing `loadStore` with `Bun.file` and `Bun.sha` saves ~10 ms in pure I/O, yielding a ~6.5% win on `check-continuity` (153.7 ms → 143.2 ms), which falls below the >=10% / >=20ms threshold.
**Learning:** Process startup and store loading dominate short-lived commands, but pure JS logic execution remains ~10–15ms. Micro-optimizing pure JS or saving ~10ms in I/O does not meet the >=10% or >=20ms end-to-end threshold on current store sizes.
**Action:** Do not open a PR unless a command's measured end-to-end gain is >=10% or >=20ms and clearly exceeds run-to-run noise.

## 2026-10-18 - End-to-End Command Baselines and Corpus Read Parallelization Evaluation
**Measured:** Benchmarked end-to-end CLI execution across 10 interleaved runs on 1,128 store records under Bun: `check-references` (median 115.86 ms, range 113.46–127.54 ms; pure JS `checkReferences` time 7.87 ms), `check-continuity` (median 107.19 ms, range 105.43–110.22 ms), `check-headers` (median 103.48 ms, range 100.02–104.64 ms), `diff-runs` (median 35.98 ms, range 35.10–37.61 ms), and `conform --run 1` (median 47.62 ms, range 47.03–48.09 ms). Parallelizing `loadCorpus` in `src/manifest.ts` via `Promise.all` reduced corpus load time from 20.35 ms to 17.58 ms (2.77 ms win), yielding an end-to-end command speedup of ~5.8% (2.77 ms saved on 47.6 ms), which falls below the required >=10% or >=20ms threshold.
**Learning:** Bun runtime process startup (~35–45 ms) dominates short CLI invocations, while JS execution in store checkers accounts for <10 ms total. Micro-optimizing pure JS scanning or saving ~2.8 ms in parallel corpus reading does not yield an end-to-end win that meets the >=10% or >=20ms bar.
**Action:** Do not open a PR for micro-optimizations in CLI commands unless measured end-to-end gain is >=10% AND >=20ms larger than run-to-run noise.
