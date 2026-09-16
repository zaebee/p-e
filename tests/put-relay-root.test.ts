import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `check-continuity` has taken `--root` from the start so a read probe has a
 * safe target. `put-relay` had no equivalent, so a *write* probe had none — and
 * on 2026-09-01 one went into the live corpus as `relay-0734`, which cannot be
 * removed without leaving a marker with no record. Issue #24, erratum in
 * `relay-0735`.
 *
 * The property under test is not "the flag parses". It is that a deposit named
 * elsewhere lands elsewhere, and that the live store is untouched by it.
 */
const script = join(import.meta.dirname, "..", "scripts", "put-relay.ts");
const liveStore = join(import.meta.dirname, "..", "relay");
const record = "@p-e/x0\nfrom: probe\nkind: probe\n\nscratch\n";

function put(args: readonly string[]) {
  return spawnSync("bun", ["run", script, ...args], { encoding: "utf8" });
}

describe("relay-put --root", () => {
  // This is also what pins the absent-flag arithmetic, which is worth stating
  // because it is not obvious from the assertions. The arguments are
  // `[input, "--root", root]` with no `--as`, so the first `takeFlag` call runs
  // with `at === -1` and must drop nothing. Under the old form —
  // `filter((_, i) => i !== at + 1)` — `at + 1` is 0, the source file is dropped,
  // and this test fails. Measured by reintroducing the bug and running it.
  it("writes the record and its marker into the named store, not the live one", () => {
    // The source must live outside the root: loadStore reads every .txt in the
    // store directory as a record, so an input placed there is parsed as one.
    const root = mkdtempSync(join(tmpdir(), "pr-root-"));
    const src = mkdtempSync(join(tmpdir(), "pr-src-"));
    const before = readdirSync(liveStore).length;
    try {
      const input = join(src, "in.txt");
      writeFileSync(input, record);

      const out = put([input, "--root", root]);
      expect(out.status).toBe(0);
      expect(out.stdout).toContain("stored relay-0001");

      expect(existsSync(join(root, "relay-0001.txt"))).toBe(true);
      expect(existsSync(join(root, "history", "relay-0001"))).toBe(true);
      expect(readFileSync(join(root, "relay-0001.txt"), "utf8")).toContain(
        "assigned-id: relay-0001",
      );

      expect(readdirSync(liveStore)).toHaveLength(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(src, { recursive: true, force: true });
    }
  });

  it("refuses a depositor with whitespace or newlines cleanly without a stack trace", () => {
    const root = mkdtempSync(join(tmpdir(), "pr-root-"));
    const src = mkdtempSync(join(tmpdir(), "pr-src-"));
    try {
      const input = join(src, "in.txt");
      writeFileSync(input, record);

      const out = put([input, "--as", "local\nprovenance: authored", "--root", root]);
      expect(out.status).toBe(1);
      expect(out.stderr).toContain("no whitespace and no control characters");
      // Matched by SHAPE, not by substring. `not.toContain("throw new Error")`
      // passes if bun prints any other frame, or changes its format; and a bare
      // `not.toContain("at ")` fails on a refusal's own prose — "cannot read the
      // store at /tmp/…" — which is how this check was got wrong once already.
      // A bun trace is numbered source lines and indented `at` frames.
      const lines = out.stderr.split("\n");
      expect(lines.filter((l) => /^\s*\d+\s*\|/.test(l))).toEqual([]);
      expect(lines.filter((l) => /^\s+at\s/.test(l))).toEqual([]);
      // And the refusal did say something, so an empty stderr cannot pass.
      expect(out.stderr).toContain("depositedBy");
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(src, { recursive: true, force: true });
    }
  });

  it("refuses a record with an invalid parent ID or path traversal in parent header", () => {
    const root = mkdtempSync(join(tmpdir(), "pr-root-"));
    const src = mkdtempSync(join(tmpdir(), "pr-src-"));
    try {
      const invalidRecord =
        "@p-e/x0\nparent: ../package\nparent-sha256: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef\n\ntest\n";
      const input = join(src, "in.txt");
      writeFileSync(input, invalidRecord);

      const out = put([input, "--root", root]);
      expect(out.status).toBe(1);
      expect(out.stderr).toContain("is not a valid relay ID");
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(src, { recursive: true, force: true });
    }
  });

  it("does not check a parent digest quoted in the body", () => {
    // `checkParentDigest` read `/^parent:…$/m` over the whole record, so a body
    // quoting another record's parent headers refused a deposit that names no
    // parent. Audit-03 F4's class, left in this script; found by attacking PR #225's
    // repair.
    const root = mkdtempSync(join(tmpdir(), "pr-root-"));
    const src = mkdtempSync(join(tmpdir(), "pr-src-"));
    try {
      const quoting = `@p-e/x0\nfrom: bob\nkind: note\n\nquoting another record:\nparent: relay-0001\nparent-sha256: ${"0".repeat(64)}\n`;
      const input = join(src, "in.txt");
      writeFileSync(input, quoting);

      const out = put([input, "--root", root]);
      expect(out.stderr).not.toContain("parent-sha256 does not match");
      expect(out.status).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(src, { recursive: true, force: true });
    }
  });

  it("does not treat `parent: none` as a parent to look up", () => {
    // `none` is the reserved word for no link: `header()` reads it as null, and
    // `stateOf` calls a digest with no parent `UNANCHORED`. The gate took `none` for
    // an id and refused. Open on main; gemini-code-assist on PR #231.
    const root = mkdtempSync(join(tmpdir(), "pr-root-"));
    const src = mkdtempSync(join(tmpdir(), "pr-src-"));
    try {
      const input = join(src, "in.txt");
      writeFileSync(
        input,
        `@p-e/x0\nfrom: b\nparent: none\nparent-sha256: ${"a".repeat(64)}\n\nbody\n`,
      );
      const out = put([input, "--root", root]);
      expect(out.stderr).not.toContain("is not a valid relay ID");
      expect(out.status).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(src, { recursive: true, force: true });
    }
  });

  // A regression the second attack on PR #225's repair found: reading values to
  // the real line ending left `[ \t]*` unable to see past U+2028 or a second CR,
  // so these wrong digests were stored. Refused on main, and refused again here.
  it.each([
    [
      "followed by U+2028",
      (h: string) => `@p-e/x0\nfrom: b\nparent: relay-0001\nparent-sha256: ${h}\u2028\n\nbody\n`,
    ],
    [
      "followed by CR CR",
      (h: string) =>
        `@p-e/x0\nfrom: b\nparent: relay-0001\nparent-sha256: ${h}\r\r\nkind: x\n\nbody\n`,
    ],
    [
      "in a CRLF record",
      (h: string) =>
        `@p-e/x0\r\nfrom: b\r\nparent: relay-0001\r\nparent-sha256: ${h}\r\n\r\nbody\r\n`,
    ],
    [
      "after a leading blank line",
      (h: string) => `\n\n@p-e/x0\nfrom: b\nparent: relay-0001\nparent-sha256: ${h}\n\nbody\n`,
    ],
  ])("refuses a wrong parent digest %s", (_, build) => {
    const root = mkdtempSync(join(tmpdir(), "pr-root-"));
    const src = mkdtempSync(join(tmpdir(), "pr-src-"));
    try {
      const seed = join(src, "seed.txt");
      writeFileSync(seed, "@p-e/x0\nfrom: alice\n\nfirst\n");
      expect(put([seed, "--root", root]).status).toBe(0);

      const input = join(src, "in.txt");
      writeFileSync(input, build("0".repeat(64)));
      const out = put([input, "--root", root]);
      expect(out.stderr).toContain("parent-sha256 does not match relay-0001");
      expect(out.status).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(src, { recursive: true, force: true });
    }
  });

  it("checks the parent digest against PE_STORE_ROOT, not a relay/ under the working directory", () => {
    // The default was the literal "relay", resolved against wherever the script
    // was started. The record carries a wrong digest on purpose: every outcome of
    // this test stops before `depositLocal`, so nothing is written even if the
    // variable were ignored.
    const root = mkdtempSync(join(tmpdir(), "pr-root-"));
    const src = mkdtempSync(join(tmpdir(), "pr-src-"));
    const elsewhere = mkdtempSync(join(tmpdir(), "pr-cwd-"));
    try {
      const seed = join(src, "seed.txt");
      writeFileSync(seed, "@p-e/x0\nfrom: alice\n\nfirst\n");
      expect(put([seed, "--root", root]).status).toBe(0);

      const input = join(src, "in.txt");
      writeFileSync(
        input,
        `@p-e/x0\nfrom: b\nparent: relay-0001\nparent-sha256: ${"0".repeat(64)}\n\nbody\n`,
      );
      const env = { ...process.env, PE_STORE_ROOT: root };
      const out = spawnSync("bun", ["--no-env-file", "run", script, input], {
        cwd: elsewhere,
        env,
        encoding: "utf8",
      });
      expect(out.stderr).toContain("parent-sha256 does not match relay-0001");
      expect(out.status).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(src, { recursive: true, force: true });
      rmSync(elsewhere, { recursive: true, force: true });
    }
  });

  it("refuses a flag with no value rather than taking the next argument", () => {
    const out = put(["--root"]);
    expect(out.status).toBe(1);
    expect(out.stderr).toContain("--root needs a value");
  });

  it("takes both flags at once without either eating the other's argument", () => {
    const root = mkdtempSync(join(tmpdir(), "pr-root-"));
    const src = mkdtempSync(join(tmpdir(), "pr-src-"));
    const before = readdirSync(liveStore).length;
    try {
      const input = join(src, "in.txt");
      writeFileSync(input, record);

      const out = put([input, "--as", "probe-agent", "--root", root]);
      expect(out.status).toBe(0);
      expect(readFileSync(join(root, "relay-0001.txt"), "utf8")).toContain(
        "deposited-by: probe-agent",
      );
      expect(readdirSync(liveStore)).toHaveLength(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(src, { recursive: true, force: true });
    }
  });

  // The second `takeFlag` call — `--root` absent — is deliberately not covered.
  // Exercising it means a deposit with no root, which writes to the live corpus,
  // and that is the thing this whole change exists to prevent. Both calls go
  // through one helper, so the arithmetic is pinned once by the test above; a
  // test that wrote a record to prove a flag was parsed would cost more than it
  // establishes.
});
