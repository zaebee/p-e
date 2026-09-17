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
