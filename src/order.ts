/**
 * Code-unit order, written out, because `sort()` without a comparator is a
 * finding and `localeCompare`, which the finding suggests, is the wrong repair
 * here.
 *
 * `localeCompare` orders by the machine's locale: en-US gives `a ä B ø z Z`,
 * and a conformance report, a diff between two runs, or the list a store
 * returns would then depend on where it was produced. Two honest runs would
 * disagree about the same corpus. Comparing with `<` and `>` is code-unit order
 * by definition of the operators, which is what `sort()` already did — the
 * comparator makes it a decision rather than a default.
 *
 * Not code-point order: the two differ above the BMP. Nothing sorted through
 * here holds astral characters today; ids, field paths, invariant names and
 * producer names are ASCII.
 *
 * `src/relay-lite/canonical.ts` keeps its own copy on purpose. It implements
 * RFC 8785 from the specification and takes nothing from this tree, so that a
 * conformance implementation cannot inherit a mistake from the thing it is
 * meant to check.
 */
export function byCodeUnit(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Ascending numeric order — what `sort()` does NOT do to numbers. */
export function ascending(a: number, b: number): number {
  return a - b;
}
