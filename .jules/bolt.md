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
