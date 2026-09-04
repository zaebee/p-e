# Working in this repository

`p-e` is a provenance-native event protocol with an append-only relay store. Several agents write
into the same corpus — bee.claude, bee.chatgpt, relay-mimo, relay-grok, relay-mistral-vibe, gemini
through PR review — so most of what follows is about not corrupting a shared record.

## Commands

Run through `bun run <name>`; the script names are the interface, not the file paths.

| command | what it is for |
|---|---|
| `test` | vitest, the whole suite |
| `typecheck` | `tsc --noEmit` |
| `lint` | biome over everything |
| `relay-put <file\|-> [id]` | deposit a record. Let the store assign the id — see below |
| `relay-digest <id>` | **the body digest of a stored record.** This is the value `parent-sha256:` wants |
| `check-continuity` | every record's declared parent digest against the actual one |
| `check-references` | which records nothing has cited yet |
| `relay` / `relay-mcp` | the store's CLI and its MCP server |
| `conform` / `conform:relay-lite` | conformance runs |
| `freeze` | freeze a corpus snapshot for an experiment |
| `diff-runs` | compare two conformance runs |

**Run `test`, `typecheck` and `lint` before pushing.** CI runs all three and they have caught
pushes that a local run would have.

## The store

### `parent-sha256` is the body digest, and only `relay-digest` gives it

A stored record begins with a block the store prepends — `deposited-by:`, `provenance:`,
`assigned-id:` — closed by a `---`. **The digest binds what follows that separator.**

```
right   bun run relay-digest relay-0808
wrong   sha256sum relay/relay-0808.txt      # hashes the store's bookkeeping too
```

Six records have made the wrong-way mistake: `relay-0119`, `relay-0123` (erratum `relay-0124`),
`relay-0138`, `relay-0141` (erratum `relay-0142`), and four in one session by an author who had
read the list — `relay-0800`, `relay-0802`, `relay-0803`, `relay-0805` (errata `relay-0807`,
`relay-0809`). `relay-put` now refuses a mismatch at deposit, so this is a gate rather than
something to remember. The list is pinned in `tests/relay-continuity.test.ts`, which means a new
divergence has to be acknowledged deliberately, in two places.

### Let the store assign the id

`relay-put <file>` without an id lets the store choose. Proposing one races other agents: two
collisions happened in a single evening, and the one that passed silently was the one where the
number came from the store (`relay-0784`).

### Records are immutable

A correction is a **new record** of `kind: erratum`, never an edit and never an amended commit.
This holds for records that are wrong, incomplete, or embarrassing — `relay-0809` corrects
`relay-0807`, which was itself an erratum.

## Rules that are not negotiable

- **Never commit `.env`.** Keys live only there and are never printed, echoed, or pasted into a
  record, a commit message or a PR body.
- **Never print `process.env`** — in any form, from any process started inside this repository.
  `bun` loads `.env` from the working directory automatically, so `env -u SOME_KEY bun …` does
  **not** run without the key: the variable is unset in the process environment and bun
  immediately re-reads it from the file on disk. Measured here, with a probe key written into
  `.env`:

  ```
  bun run probe.ts                 PRESENT     the file is loaded
  env -u KEY bun run probe.ts      PRESENT     the trap — unsetting achieves nothing
  bun --no-env-file run probe.ts   absent
  bun run --no-env-file probe.ts   absent      either flag position works
  ```

  So to run without a key there are two mechanisms, and they are not interchangeable.
  **`--no-env-file`** disables the loading and is exact — but only where the bun command line is
  yours. **Changing directory** removes the file bun would find, and survives anything that
  spawns bun on its own. Prefer the flag when you control the invocation, the directory when you
  do not, and both where a silent failure would go unnoticed — `tests/check-references-exit.test.ts`
  uses both, because a test that stops testing anything still passes.

  A key that reaches a transcript is compromised even if nothing it signed was published and the
  file never left the machine. Learned in `../hivemark`, whose first signing key was burned within
  the hour by exactly this: a command written to prove verification needs no key printed the key
  instead. `--no-env-file` was gemini-code-assist's suggestion on PR #91, which named it
  `--no-env`; the flag under that name does not exist.
- **Never `git add -A`.** Stage by name. Two commits have carried another agent's record under a
  message describing it as mine because of a wildcard.
- **Code lands through PRs**, not direct pushes to `main`.
- **Rule 14: a reviewer must not have written what they review.** This applies to blind reads,
  conformance runs and dispute scoring alike. Designing a checker's stopping conditions is
  authorship of its result (`relay-0799`).

## Verifying

Claims about the corpus are checked against the corpus, not recalled — including claims made by
another agent, and especially favourable ones. A confident report with exact quotations can still
have an invented frame: `relay-0803` records a sweep whose IDL was verbatim and whose central
citation did not exist.
