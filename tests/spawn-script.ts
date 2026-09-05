import { spawnSync } from "node:child_process";
import { constants, accessSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, isAbsolute, join } from "node:path";
import { afterAll } from "vitest";

/**
 * Run one of the corpus scripts as a child, with the environment it would have
 * in a shell nobody has configured.
 *
 * One helper rather than the same twenty lines in two files, for the reason
 * `relay-tmp.ts` gives beside its own: two copies of a spawn harness do not
 * break when they drift, they quietly stop testing the same thing. Sonar put
 * the new duplication at 7.1% on PR #93 and it was right — what was duplicated
 * is the harness for an exit-code CONTRACT, and `src/relay/refusal.ts` now owns
 * the contract itself for the same reason.
 *
 * ## Two independent guards against the child seeing a `.env`
 *
 * Both are here because this harness's failure mode is silent: it would pass
 * while testing nothing at all.
 *
 * `--no-env-file` turns off bun's automatic loading; `cwd` outside the
 * repository removes the file it would load. Measured in this repo with a probe
 * key written into `.env`: plain `bun run` saw it, `env -u KEY bun run` STILL
 * saw it — the trap, reproduced rather than cited — and `--no-env-file` did not,
 * in either flag position. The flag is exact and works only where the bun
 * command line is ours; the directory survives anything spawning bun on its own.
 * AGENTS.md carries the rule. gemini-code-assist asked for the flag on PR #91,
 * naming it `--no-env`, which does not exist.
 */

/**
 * The bun binary as an absolute path, resolved once and never searched for at
 * spawn time.
 *
 * `spawnSync("bun", …)` makes the OS walk `PATH` at every call, so whichever
 * directory comes first decides which binary runs — SonarCloud's S4036 on
 * PR #93, and it blocks the merge on the security rating. The rule is worth
 * more than the gate here for two reasons that are not about attackers.
 *
 * Under bun, `process.execPath` is the very binary running this suite, so
 * pinning it removes a real inconsistency: the child could otherwise be a
 * DIFFERENT bun than the parent, and these tests assert exit codes produced by
 * bun's own module loading and `.env` handling.
 *
 * Under Node — the `tests (node 22)` job — there is no such binary to inherit,
 * so `PATH` is walked HERE, once, in code that says it is doing so. That does
 * not make `PATH` trustworthy; it makes the assumption auditable and the
 * failure legible. `spawnSync` with a missing command returns
 * `{ error: ENOENT, status: null }`, and every assertion below then fails with
 * "expected null to be 3", which says nothing about bun being absent.
 *
 * An empty `PATH` entry means the current directory. Skipped rather than
 * resolved: a cwd-relative interpreter is precisely what the rule is about, and
 * this harness deliberately runs from a scratch directory.
 */
function resolveBun(): string {
  if (process.versions.bun !== undefined) return process.execPath;
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (dir === "" || !isAbsolute(dir)) continue;
    const candidate = join(dir, "bun");
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Not here, or not executable by us. Keep looking; the throw below is the
      // only outcome that stops the suite, and it names the cause.
    }
  }
  throw new Error(
    "bun was not found on PATH. These tests spawn the corpus scripts under bun, " +
      "which is how they run in CI and in the commands AGENTS.md documents.",
  );
}

const BUN = resolveBun();

/** A directory with no `.env` in it, and none above it that bun will find. */
const OUTSIDE = mkdtempSync(join(tmpdir(), "p-e-outside-"));

/**
 * The directory belongs to this module, so this module removes it.
 *
 * Left behind, every suite run deposits another empty tree in the system temp
 * directory — measured at 12 after one run before this hook existed. That is the
 * third time this leak has been found here: `relay-lite-publish` leaked one per
 * test and `relay-lite-roundtrip` four per run, and 86 trees had accumulated
 * before the first was noticed (`relay-tmp.ts`). gemini-code-assist on PR #93.
 */
afterAll(() => rmSync(OUTSIDE, { recursive: true, force: true }));

export interface RunOptions {
  /** `--root <dir>`, when the case needs a store of its own. */
  readonly root?: string;
  /**
   * `P_E_STORE_IDENTITY` for the child, or `null` to configure none.
   *
   * `null` rather than `undefined`, and that is the bug this parameter already
   * caused once: an explicitly passed `undefined` selects a default parameter,
   * so `run(undefined, undefined)` supplied an identity while reading as though
   * it withheld one, and the unconfigured case went down the configured path
   * and returned 0. The distinction these tests are about, in their own harness.
   */
  readonly identity?: string | null;
}

/** The identity a case uses when it is not the subject of the case. */
export const TEST_AUTHORITY = "p-e/relay-under-test";

export function runScript(name: string, options: RunOptions = {}) {
  const { root, identity = TEST_AUTHORITY } = options;
  const script = join(import.meta.dirname, "..", "scripts", name);
  const args = ["--no-env-file", "run", script, ...(root === undefined ? [] : ["--root", root])];
  const env: NodeJS.ProcessEnv = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key !== "P_E_STORE_IDENTITY"),
  );
  if (identity !== null) env.P_E_STORE_IDENTITY = identity;
  return spawnSync(BUN, args, { encoding: "utf8", env, cwd: OUTSIDE });
}

/**
 * Does this output carry a stack trace?
 *
 * Matched by SHAPE, not by substring. A first version asserted the absence of
 * `"at "` and failed on a refusal's own prose — "cannot read the store at
 * /tmp/…" — and would equally have passed the unconfigured-identity case for no
 * reason, since that message happens not to contain those characters. A bun
 * trace is numbered source lines and indented `at` frames, both of which are
 * line shapes.
 */
export function stackTraceLines(stderr: string): string[] {
  return stderr.split("\n").filter((line) => /^\s*\d+\s*\|/.test(line) || /^\s+at\s/.test(line));
}
