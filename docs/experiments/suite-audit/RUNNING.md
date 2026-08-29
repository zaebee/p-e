# Running the suite

TypeScript, run with [Bun](https://bun.sh) or Node 22+. No network access is needed
or used.

```
bun install          # vitest is the only dependency that matters
npx vitest run suite/tests/reader-conformance.test.ts
npx vitest run suite/tests/settled-rulings.test.ts
```

Layout: move `suite/` to `src/` and `suite/tests/` to `tests/`, alongside `corpus/`.
Imports resolve unchanged from there — verified by doing exactly that in a scratch
directory, where both files run and 20 tests pass. Nothing else depends on the
layout.

`loadCorpus(".")` reads `corpus/manifest.json` and refuses any artifact whose bytes
do not match its recorded digest, so a corrupted or edited corpus fails loudly
rather than quietly.

## The four rules, and where each lives

| | file | what it asserts |
|---|---|---|
| required-field inspection | `conformance/fields.ts`, `conformance/bearing.ts` | a check may not report a limit of the corpus without opening every field that could lift it |
| rationale fidelity | `conformance/rationale.ts` | a reason may not assert a corpus-wide negative about a field the check never opened |
| clause agreement | `conformance/clause.ts` | the clause, re-implemented from its text, reaches the verdict the check reaches |
| evidence semantics | `conformance/evidence.ts` | `EXCLUDED_WITH_REASON` is licensed only by an artifact actually withheld |

`conformance/settled.ts` is a separate thing: a table of verdicts the catalogue has
ruled, compared against what the reader currently returns.

## Two conventions you will meet

**Accounted-for lists.** Several rules carry a table of known divergences, so the
suite is red on a *new* failure rather than red permanently. Entries are pinned to
*fail if repaired*, which forces the entry to be removed in the same change as the
fix.

**Bearing tables.** `bearing.ts` declares which corpus fields bear on which
invariant. It is authored, by the party whose reader it audits, and says so in its
own header.

## Reading what the suite records

The field watcher is a proxy. To see what a check actually touched:

```ts
const seen = new Set<string>();
const watched = watch(apexHealth(files), "health", seen);
// run the check against watched, then inspect [...seen].sort()
```

The tests substitute the adapters rather than instrumenting the checks, so a
conformance run is unaffected by any of this.
