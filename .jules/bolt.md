## 2026-08-31 - Prefer `String.prototype.match` for Global String Extraction Over `matchAll` Spread
**Learning:** `[...str.matchAll(globalRegex)].map(m => m[0])` allocates `RegExpMatchArray` objects for every match in text, maps over them, and creates iterator objects. Using `str.match(globalRegex)` with a global regex directly returns `string[] | null` without allocating intermediate match objects or mapping callbacks, reducing execution time by >50%.
**Action:** Use `str.match(globalRegex)` when extracting string matches without capture groups, and check for `null` before constructing Sets or iterating.

## 2026-08-31 - Avoid Indirect Full Aggregations in Lookup Functions
**Learning:** `exists(store, id)` was calling `knownMissing(store).includes(id)`. `knownMissing` scans all records, builds sets, filters out held IDs, and sorts the result into an array. Calling `knownMissing()` inside point lookups (`exists`) turned an O(N) check into heavy allocation + array sort + search overhead.
**Action:** Replace indirect helper calls in single-item lookups with direct early-exiting iterations over `store.values()`, and filter out held IDs early in set construction when aggregations are necessary.
