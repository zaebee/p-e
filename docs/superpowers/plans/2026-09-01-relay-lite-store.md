# relay-lite store — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a store that implements `relay-lite v0.12` faithfully, so the specification has an executable form and issues #19, #21 and #22 become testable rather than arguable.

**Architecture:** seven focused modules under `src/relay-lite/`, one per specification section, so a reader holding a clause lands in one file. Pure functions take their inputs — clock, node state — as arguments rather than reading them, so every rule is testable without mocking. Nothing writes outside the root it is given.

**Tech Stack:** TypeScript, `bun` to run, `vitest` to test, `node:crypto` and `node:fs/promises`. No new dependencies: JCS and UUIDv7 are written here, for reasons in the design.

**Spec:** [`docs/superpowers/specs/2026-09-01-relay-lite-store-design.md`](../specs/2026-09-01-relay-lite-store-design.md), implementing [`docs/specs/relay-lite-v0.12-draft.md`](../../specs/relay-lite-v0.12-draft.md)

## Global Constraints

- **Eleven of the specification's twelve normative claims are in scope.** Only §4's *second* is a consumer obligation. Its first says *"The protocol **and storage model** treat the graph as a DAG"* and names a store directly — a store discharges it by imposing no total order of its own, keying acts by id and following parent links rather than sorting. An earlier draft put both out of scope: the count `2+4+2+4=12` was verified by measurement and each claim's *addressee* was not. Do not implement a comparator or a projection here; those belong to §4's second claim.
- **Every check cites the clause it tests.** A test's name or its first comment quotes the sentence from `relay-lite-v0.12-draft.md` that it verifies. The suite is a conformance report, not unit tests of an implementation.
- **Refusals are return values; exceptions mean this code is broken.** The one exception is `StoreCorruption`, which is about the store rather than a record and must be noticeable.
- **A refusal names the party it implicates, or names none.** `RETRY_EXHAUSTED` asserts nothing about another writer; `UNCHECKABLE`, `LABEL_ONLY` and `NO_PARENT` are not defects.
- **Sealed bytes are the act, and `index.ts` does not re-export `canonical.ts`.** `mint()` is then the only byte producer a consumer of this package has. An earlier form of this constraint said the guarantee held "by construction" while `canonicalize` sat exported beside it — a caller could assemble bytes for `{...act, hlc: other}` and nothing stopped them, which is a convention wearing a construction's name. `verify.ts` imports it directly and so do the tests; neither needs it on the public surface.
- **Style follows `src/relay/`:** `node:`-prefixed builtins, `.js` extensions on relative imports, module docstrings that quote the clause and say why the code is shaped as it is.
- **Commands:** `bun run test <path>` for one file, `bun run test` for the suite, `bun run typecheck`, `bun run lint`.
- **Every task ends green.** A task is not done until `bun run typecheck` and `bun run lint` pass alongside its tests.
- **§5 has no implementable content and no task.** It describes what `ruled_by` records, and `ruled_by` appears exactly once in the whole specification — in that prose. The `RelayAct` interface does not declare it. Do not invent the field; the gap is reported at the end of this plan.

---

## File structure

| file | responsibility | clauses |
|---|---|---|
| `src/relay-lite/canonical.ts` | JCS, the I-JSON domain, sha256 | §3.1 — 2 |
| `src/relay-lite/uuid.ts` | UUIDv7 with a per-millisecond counter | — |
| `src/relay-lite/hlc.ts` | emission and ingest rules | §3.3 |
| `src/relay-lite/act.ts` | the act type, minting, sealing | §3.2 — 2 |
| `src/relay-lite/cns.ts` | delivery filename, and what it must agree with | §2 — 2 |
| `src/relay-lite/publish.ts` | the POSIX sequence | §4.1 |
| `src/relay-lite/verify.ts` | three stages, six states, store integrity | §7 — 4 |
| `src/relay-lite/index.ts` | assembly and the public surface | — |

Tasks 1–3 have no dependencies on each other and can be done in any order. Task 4 needs 1–3. Task 5 needs 4. Tasks 6 and 7 need 4 and 5. Task 8 needs everything.

---

### Task 1: Canonical serialization and the I-JSON domain

`§3.1`, two normative claims. Everything downstream depends on this, so it is first.

**Files:**
- Create: `src/relay-lite/canonical.ts`
- Test: `tests/relay-lite-canonical.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:

```ts
export function canonicalize(value: unknown): string;
export class IJsonViolation extends Error {
  readonly rule: "number-range" | "invalid-string" | "duplicate-key" | "unsupported-type";
}
export function assertIJsonValue(value: unknown): void;   // minting
export function parseIJson(text: string): unknown;        // verification
export function sha256Hex(text: string): string;
```

**Why two I-JSON entry points, and this is the thing to get right.**
`assertIJsonValue` takes a value a caller already holds, where duplicate keys
*cannot exist* — JavaScript collapsed them before this code ran.
`parseIJson` takes wire text, where they can, and is the only place able to
refuse them. One function for both would silently admit a duplicate at
verification, which is where it matters, since two conforming parsers can
disagree about which value wins and therefore about who authored an act.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  IJsonViolation,
  assertIJsonValue,
  canonicalize,
  parseIJson,
} from "../src/relay-lite/canonical.js";

describe("canonicalize — RFC 8785 (JCS)", () => {
  // §3.1: "Producers mint canonical wire bytes per RFC 8785 (JCS) encoded as raw UTF-8."
  it("sorts object keys by UTF-16 code unit", () => {
    expect(canonicalize({ b: 1, a: 2, C: 3 })).toBe('{"C":3,"a":2,"b":1}');
  });

  it("formats numbers as ECMAScript does, which is what JCS requires", () => {
    expect(canonicalize({ n: 1e21 })).toBe('{"n":1e+21}');
    expect(canonicalize({ n: -0 })).toBe('{"n":0}');
    expect(canonicalize({ n: 1.0 })).toBe('{"n":1}');
    expect(canonicalize({ n: 0.1 })).toBe('{"n":0.1}');
  });

  it("emits non-ASCII as literal UTF-8, never as an escape", () => {
    expect(canonicalize({ t: "не репарируем" }))
      .toBe('{"t":"не репарируем"}');
  });

  it("escapes only the quote, the backslash and the control characters", () => {
    expect(canonicalize({ t: 'a"b' })).toBe('{"t":"a\\"b"}');
    expect(canonicalize({ t: "a\nb" })).toBe('{"t":"a\\nb"}');
  });

  it("is stable across key insertion order, which is the point", () => {
    const a = { id: "x", payload: { b: 1, a: 2 } };
    const b = { payload: { a: 2, b: 1 }, id: "x" };
    expect(canonicalize(a)).toBe(canonicalize(b));
  });
});

describe("assertIJsonValue — RFC 7493, at minting", () => {
  // §3.1: "integers within [-(2^53 - 1), 2^53 - 1], larger values encoded as strings"
  it("refuses an integer outside the safe range, naming the rule", () => {
    let caught: IJsonViolation | undefined;
    try {
      assertIJsonValue({ n: 9007199254740993 });
    } catch (e) {
      caught = e as IJsonViolation;
    }
    expect(caught?.rule).toBe("number-range");
  });

  it("refuses a non-finite number", () => {
    expect(() => assertIJsonValue({ n: Number.POSITIVE_INFINITY })).toThrow(IJsonViolation);
    expect(() => assertIJsonValue({ n: Number.NaN })).toThrow(IJsonViolation);
  });

  it("refuses an unpaired surrogate, which has no UTF-8 encoding", () => {
    expect(() => assertIJsonValue({ t: "\ud800" })).toThrow(IJsonViolation);
  });

  it("refuses a value with no JSON form rather than leaving it to canonicalize", () => {
    for (const bad of [undefined, Symbol("s"), () => 1, 10n]) {
      expect(() => assertIJsonValue({ v: bad })).toThrow(IJsonViolation);
    }
  });

  it("refuses a Date, a Map and a class instance rather than emptying them", () => {
    // Object.values on each is [], so a permissive check passed them and
    // canonicalize produced {}. Silent corruption, not a refusal.
    class Thing {
      x = 1;
    }
    for (const bad of [new Date(), new Map([["a", 1]]), new Set([1]), /x/, new Thing()]) {
      expect(() => assertIJsonValue({ v: bad })).toThrow(IJsonViolation);
    }
  });

  it("refuses a non-integer outside the safe range, which RFC 7493 also forbids", () => {
    expect(() => assertIJsonValue({ n: 1e300 })).toThrow(IJsonViolation);
  });

  it("admits null and booleans, which are JSON", () => {
    expect(() => assertIJsonValue({ a: null, b: true, c: false })).not.toThrow();
  });

  it("admits the boundary value and ordinary values", () => {
    expect(() => assertIJsonValue({ n: Number.MAX_SAFE_INTEGER })).not.toThrow();
    expect(() => assertIJsonValue({ n: 0.1, t: "ok", a: [1, 2], o: { k: null } })).not.toThrow();
  });
});

describe("parseIJson — RFC 7493, at verification", () => {
  // A duplicate key is gone by the time JSON.parse returns: JavaScript keeps the
  // last one. Only the text carries the evidence, so only this can refuse it.
  it("refuses duplicate keys in the text", () => {
    let caught: IJsonViolation | undefined;
    try {
      parseIJson('{"from":"a","from":"b"}');
    } catch (e) {
      caught = e as IJsonViolation;
    }
    expect(caught?.rule).toBe("duplicate-key");
  });

  it("does not mistake a key-shaped string inside a value for a key", () => {
    expect(() => parseIJson('{"a":"x","b":"\\"a\\":1"}')).not.toThrow();
  });

  // The first tokenizer tracked depth rather than container kind, so a comma
  // inside an array set expectKey because an object sat below it on the stack.
  // These expose it; three weaker cases passed against the bug.
  it("does not count array elements as keys of the enclosing object", () => {
    expect(() => parseIJson('{"a":["x","y","y"]}')).not.toThrow();
    expect(() => parseIJson('{"a":["z","a"]}')).not.toThrow();
    expect(() => parseIJson('{"a":[1,2,3],"b":2}')).not.toThrow();
    expect(() => parseIJson('[{"a":1},{"a":2}]')).not.toThrow();
  });

  it("refuses a duplicate written one way escaped and one way not", () => {
    // "a" and "\u0061" are one key after parsing and two strings as text.
    expect(() => parseIJson('{"a":1,"\\u0061":2}')).toThrow(IJsonViolation);
  });

  it("still refuses a duplicate inside an object nested in an array", () => {
    expect(() => parseIJson('{"a":[{"c":1,"c":2}]}')).toThrow(IJsonViolation);
    expect(() => parseIJson('{"a":{"b":1,"b":2}}')).toThrow(IJsonViolation);
  });

  it("refuses an out-of-range integer in the text", () => {
    expect(() => parseIJson('{"n":9007199254740993}')).toThrow(IJsonViolation);
  });

  it("admits well-formed text and returns the value", () => {
    expect(parseIJson('{"a":1,"b":"x"}')).toEqual({ a: 1, b: "x" });
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `bun run test tests/relay-lite-canonical.test.ts`
Expected: FAIL — cannot resolve `../src/relay-lite/canonical.js`.

- [ ] **Step 3: Implement**

```ts
import { createHash } from "node:crypto";

/**
 * Canonical bytes, and the domain they are drawn from.
 *
 * §3.1: *"Producers mint canonical wire bytes per RFC 8785 (JCS) encoded as raw
 * UTF-8"*, and *"Acts conform to I-JSON (RFC 7493)"*.
 *
 * Written here rather than taken as a dependency. relay-ui's `canonicalJson`
 * sorts keys and calls `JSON.stringify`, which is not JCS because it normalises
 * no numbers — and a dependency chosen without checking would inherit exactly
 * that class of error rather than avoid it.
 */

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

export class IJsonViolation extends Error {
  readonly rule: "number-range" | "invalid-string" | "duplicate-key" | "unsupported-type";
  constructor(rule: IJsonViolation["rule"], message: string) {
    super(message);
    this.name = "IJsonViolation";
    this.rule = rule;
  }
}

/**
 * JCS number formatting is ECMAScript's `Number::toString`, which `String(n)`
 * gives — `1e+21` included. Negative zero is the one case it gets wrong for our
 * purposes: JCS emits `0`, and `String(-0)` agrees, but `Object.is` is how you
 * tell them apart when it matters.
 */
function num(n: number): string {
  if (!Number.isFinite(n)) {
    throw new IJsonViolation("number-range", `not a finite number: ${String(n)}`);
  }
  return Object.is(n, -0) ? "0" : String(n);
}

/** JCS escapes the quote, the backslash, and the C0 controls. Nothing else. */
function str(s: string): string {
  let out = '"';
  for (const ch of s) {
    const code = ch.codePointAt(0) as number;
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\b") out += "\\b";
    else if (ch === "\f") out += "\\f";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (code < 0x20) out += `\\u${code.toString(16).padStart(4, "0")}`;
    else out += ch;
  }
  return `${out}"`;
}

export function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return num(value);
  if (typeof value === "string") return str(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    // Sorted by UTF-16 code unit, which is what sorting strings does in
    // JavaScript. Not by code point: the two differ above the BMP, and JCS
    // names the code-unit ordering.
    const keys = Object.keys(value as object).sort();
    const pairs = keys.map(
      (k) => `${str(k)}:${canonicalize((value as Record<string, unknown>)[k])}`,
    );
    return `{${pairs.join(",")}}`;
  }
  throw new IJsonViolation("invalid-string", `not representable in JSON: ${typeof value}`);
}

/** The domain check a producer runs against a value it already holds. */
export function assertIJsonValue(value: unknown): void {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new IJsonViolation("number-range", `not a finite number: ${String(value)}`);
    }
    // An integer past 2^53 stays past it after rounding, because doubles hold
    // every integer to 2^53 exactly and anything above rounds no smaller. So
    // this catches the violation even though the original digits are gone.
    //
    // No `Number.isInteger` guard: every finite double above 2^52 is integral,
    // so the guard excluded nothing and only made a reader wonder which
    // non-integer case it was for. RFC 7493 §2.2 constrains numbers, not
    // integers, and this now says that.
    if (Math.abs(value) > MAX_SAFE) {
      throw new IJsonViolation(
        "number-range",
        `integer outside the safe range, encode it as a string: ${value}`,
      );
    }
    return;
  }
  if (typeof value === "string") {
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      const isHigh = code >= 0xd800 && code <= 0xdbff;
      const isLow = code >= 0xdc00 && code <= 0xdfff;
      if (isHigh) {
        const next = value.charCodeAt(i + 1);
        if (!(next >= 0xdc00 && next <= 0xdfff)) {
          throw new IJsonViolation("invalid-string", "unpaired high surrogate");
        }
        i++;
      } else if (isLow) {
        throw new IJsonViolation("invalid-string", "unpaired low surrogate");
      }
    }
    return;
  }
  if (value === null || typeof value === "boolean") return;
  if (Array.isArray(value)) {
    for (const v of value) assertIJsonValue(v);
    return;
  }
  if (typeof value === "object") {
    // Plain objects only. `typeof` says "object" for Date, Map, Set, RegExp and
    // every class instance, and `Object.values` on all of them is `[]` — so this
    // passed them and `canonicalize` turned each into `{}`. Silent corruption,
    // not a refusal: a caller who checked their value with `JSON.stringify`
    // would have seen an ISO date and received an empty object from us.
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      throw new IJsonViolation(
        "unsupported-type",
        `only plain objects: ${(value as object).constructor?.name ?? "unknown"}`,
      );
    }
    for (const v of Object.values(value as object)) assertIJsonValue(v);
    return;
  }
  // Everything else — undefined, symbol, function, bigint — has no JSON form.
  // Falling through silently made this validator admit what `canonicalize`
  // refuses a moment later, which is a check asserting more than it verified.
  throw new IJsonViolation("unsupported-type", `no JSON representation: ${typeof value}`);
}

/**
 * Parse wire text, and refuse what a parsed value can no longer show.
 *
 * A duplicate key is gone by the time `JSON.parse` returns — JavaScript keeps
 * the last — so the text is the only witness. Two conforming parsers can keep
 * different ones, which for a field like `from` means two implementations
 * attributing the same act to different authors.
 */
export function parseIJson(text: string): unknown {
  refuseDuplicateKeys(text);
  const value = JSON.parse(text) as unknown;
  assertIJsonValue(value);
  return value;
}

/**
 * Walk the text and refuse an object naming a key twice.
 *
 * The stack remembers *which kind* of container each frame is, not only that
 * there is one. Tracking depth alone was wrong and review caught it: a comma
 * inside an array set `expectKey` because an object sat below it on the stack,
 * so array elements were counted as keys of that object, and
 * `{"a":["x","y","y"]}` was refused as a duplicate.
 *
 * A tokenizer rather than a regular expression, because a key-shaped string can
 * appear inside a value — and the first version of this tokenizer then produced
 * exactly the false positive it was written to avoid.
 */
type Frame = { readonly kind: "object"; readonly keys: Set<string> } | { readonly kind: "array" };

function refuseDuplicateKeys(text: string): void {
  const stack: Frame[] = [];
  let i = 0;
  let expectKey = false;

  const readString = (): string => {
    let out = "";
    i++;
    while (i < text.length) {
      const ch = text[i];
      if (ch === "\\") {
        out += text[i] + text[i + 1];
        i += 2;
        continue;
      }
      if (ch === '"') {
        i++;
        // Unescaped before comparison, because `"a"` and `"\u0061"` are the same
        // key after parsing and different as text. A duplicate written one of
        // each way escaped detection exactly when it was disguised.
        return JSON.parse(`"${out}"`) as string;
      }
      out += ch;
      i++;
    }
    throw new IJsonViolation("invalid-string", "unterminated string");
  };

  const top = (): Frame | undefined => stack[stack.length - 1];

  while (i < text.length) {
    const ch = text[i];
    if (ch === '"') {
      const s = readString();
      const frame = top();
      if (expectKey && frame?.kind === "object") {
        if (frame.keys.has(s)) throw new IJsonViolation("duplicate-key", `duplicate key: ${s}`);
        frame.keys.add(s);
        expectKey = false;
      }
      continue;
    }
    if (ch === "{") {
      stack.push({ kind: "object", keys: new Set() });
      expectKey = true;
    } else if (ch === "[") {
      stack.push({ kind: "array" });
      expectKey = false;
    } else if (ch === "}" || ch === "]") {
      stack.pop();
      expectKey = false;
    } else if (ch === ",") {
      expectKey = top()?.kind === "object";
    }
    i++;
  }
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `bun run test tests/relay-lite-canonical.test.ts`
Expected: PASS, 20 tests.

- [ ] **Step 5: Typecheck and lint**

Run: `bun run typecheck && bun run lint`
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
git add src/relay-lite/canonical.ts tests/relay-lite-canonical.test.ts
git commit -m "feat(relay-lite): JCS canonicalization and the I-JSON domain

Section 3.1's two claims. Written rather than taken as a dependency: relay-ui's
canonicalJson sorts keys and calls JSON.stringify, which normalises no numbers
and is therefore not JCS, and a dependency chosen without checking would
inherit that.

Two I-JSON entry points, because they see different evidence. assertIJsonValue
takes a value a caller holds, where duplicate keys cannot exist -- JavaScript
collapsed them before this code ran. parseIJson takes wire text, where they can,
and tokenises rather than matching a regex, since a key-shaped string can appear
inside a value.

An integer past 2^53 is still detectable after JSON.parse: doubles hold every
integer to 2^53 exactly, so anything above rounds no smaller. What does not
survive is the distinction between two wire forms, and that lands outside this
module because verification hashes received octets."
```

---

### Task 2: UUIDv7

No normative claim rests on this, and the design says why it still needs care:
**uniqueness is load-bearing and ordering is not.** §4's comparator reaches `id`
only as a terminal tie-break, and `DeduplicateByID` keys on it — so a
mis-ordering degrades a presentation while a collision merges two distinct acts.

**Files:**
- Create: `src/relay-lite/uuid.ts`
- Test: `tests/relay-lite-uuid.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:

```ts
export interface UuidState { readonly lastMs: number; readonly counter: number }
export const UUID_START: UuidState;
export function uuidV7(state: UuidState, nowMs: number): { id: string; state: UuidState };
```

`nowMs` is a parameter rather than a call to `Date.now()`, so both hard cases are
testable without mocking a clock.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { UUID_START, uuidV7 } from "../src/relay-lite/uuid.js";

describe("uuidV7", () => {
  it("sets version 7 and the RFC 4122 variant", () => {
    const { id } = uuidV7(UUID_START, 1_700_000_000_000);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("orders by time across milliseconds", () => {
    const a = uuidV7(UUID_START, 1_700_000_000_000);
    const b = uuidV7(a.state, 1_700_000_000_001);
    expect(b.id > a.id).toBe(true);
  });

  // RFC 9562 section 6.2 method 1: a counter in rand_a separates ids minted
  // inside one millisecond, which the timestamp alone cannot.
  it("stays unique and ordered within a single millisecond", () => {
    let s = UUID_START;
    const ids: string[] = [];
    for (let i = 0; i < 500; i++) {
      const r = uuidV7(s, 1_700_000_000_000);
      ids.push(r.id);
      s = r.state;
    }
    expect(new Set(ids).size).toBe(500);
    expect([...ids].sort()).toEqual(ids);
  });

  // A clock that steps backwards must not produce an id sorting before one
  // already issued. Same shape as the HLC's max(physical, last).
  it("does not go backwards when the clock does", () => {
    const a = uuidV7(UUID_START, 1_700_000_000_050);
    const b = uuidV7(a.state, 1_700_000_000_000);
    expect(b.id > a.id).toBe(true);
    expect(b.state.lastMs).toBe(1_700_000_000_050);
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `bun run test tests/relay-lite-uuid.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { randomBytes } from "node:crypto";

/**
 * UUIDv7, with the two cases a timestamp alone does not cover.
 *
 * Not in the standard library — `crypto.randomUUID` produces v4 — and the
 * design's first estimate of "around fifteen lines" was too glib, which review
 * said. Two cases have to be handled rather than assumed:
 *
 *   - more than one id inside a millisecond, handled by RFC 9562 §6.2 method 1:
 *     a counter seeded randomly per millisecond, carried in `rand_a`;
 *   - a clock stepping backwards, handled by never going below the last
 *     millisecond used, which is the shape the HLC uses one file away.
 *
 * What is load-bearing here is uniqueness. Ordering is why v7 rather than v4 and
 * is worth having, but the comparator reaches `id` only as a terminal tie-break.
 */

export interface UuidState {
  readonly lastMs: number;
  readonly counter: number;
}

export const UUID_START: UuidState = { lastMs: 0, counter: 0 };

/** `rand_a` is twelve bits, so the counter has 4096 slots per millisecond. */
const COUNTER_BITS = 12;
const COUNTER_MAX = (1 << COUNTER_BITS) - 1;

export function uuidV7(state: UuidState, nowMs: number): { id: string; state: UuidState } {
  const ms = Math.max(nowMs, state.lastMs);

  let counter: number;
  if (ms === state.lastMs) {
    counter = state.counter + 1;
    if (counter > COUNTER_MAX) {
      // The millisecond is full. Advancing rather than blocking keeps ids
      // unique and ordered; the cost is a timestamp one ahead of the clock,
      // which the next real millisecond absorbs.
      return uuidV7({ lastMs: ms + 1, counter: -1 }, ms + 1);
    }
  } else {
    // Seeded randomly rather than at zero, so two nodes starting in the same
    // millisecond do not walk the same sequence.
    counter = randomBytes(2).readUInt16BE(0) & (COUNTER_MAX >> 1);
  }

  const bytes = Buffer.alloc(16);
  bytes.writeUIntBE(ms, 0, 6);
  bytes.writeUInt16BE(((0x7 << 12) | counter) & 0xffff, 6);
  const rest = randomBytes(8);
  rest[0] = (rest[0] & 0x3f) | 0x80; // RFC 4122 variant
  rest.copy(bytes, 8);

  const hex = bytes.toString("hex");
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return { id, state: { lastMs: ms, counter } };
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `bun run test tests/relay-lite-uuid.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
bun run typecheck && bun run lint
git add src/relay-lite/uuid.ts tests/relay-lite-uuid.test.ts
git commit -m "feat(relay-lite): UUIDv7 with a per-millisecond counter

Two cases a timestamp alone does not cover, both raised in review of the design.
More than one id inside a millisecond is separated by a counter in rand_a, per
RFC 9562 section 6.2 method 1, seeded randomly so two nodes starting in the same
millisecond do not walk the same sequence. A clock stepping backwards is handled
by never going below the last millisecond used.

nowMs is a parameter rather than a call to Date.now(), so both cases are tested
without mocking a clock."
```

---

### Task 3: The Hybrid Logical Clock

`§3.3`. Both rules, and the state they carry.

**Files:**
- Create: `src/relay-lite/hlc.ts`
- Test: `tests/relay-lite-hlc.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:

```ts
export interface Hlc { readonly l: number; readonly c: number; readonly node_id: string }
export interface HlcState { readonly l: number; readonly c: number }
export const HLC_START: HlcState;
export function emit(state: HlcState, nodeId: string, nowMs: number): { hlc: Hlc; state: HlcState };
export function ingest(state: HlcState, incoming: Hlc, nodeId: string, nowMs: number): { hlc: Hlc; state: HlcState };
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { HLC_START, emit, ingest } from "../src/relay-lite/hlc.js";

const N = "node-1";

describe("emit — §3.3 emission rule", () => {
  // l' = max(physical_now_ms, last_l); c' = last_c + 1 if l' == last_l, else 0
  it("resets the counter when the wall clock advances", () => {
    const a = emit(HLC_START, N, 1000);
    const b = emit(a.state, N, 1001);
    expect(b.hlc).toMatchObject({ l: 1001, c: 0 });
  });

  it("increments the counter within one millisecond", () => {
    const a = emit(HLC_START, N, 1000);
    const b = emit(a.state, N, 1000);
    const c = emit(b.state, N, 1000);
    expect([a.hlc.c, b.hlc.c, c.hlc.c]).toEqual([0, 1, 2]);
  });

  // "max folds a regressing physical clock into the equal case, so the tuple
  // stays monotonic per node across NTP steps, VM restore, and suspend."
  it("stays monotonic when the clock steps backwards", () => {
    const a = emit(HLC_START, N, 5000);
    const b = emit(a.state, N, 1000);
    expect(b.hlc.l).toBe(5000);
    expect(b.hlc.c).toBe(1);
  });
});

describe("ingest — §3.3 ingest rule", () => {
  it("takes the incoming clock when it is ahead", () => {
    const r = ingest(HLC_START, { l: 9000, c: 3, node_id: "other" }, N, 1000);
    expect(r.hlc).toMatchObject({ l: 9000, c: 4, node_id: N });
  });

  it("takes max(last_c, incoming_c) + 1 on a three-way tie", () => {
    const local = { l: 2000, c: 7 };
    const r = ingest(local, { l: 2000, c: 4, node_id: "other" }, N, 2000);
    expect(r.hlc).toMatchObject({ l: 2000, c: 8 });
  });

  it("resets the counter when physical time leads both", () => {
    const r = ingest({ l: 1000, c: 5 }, { l: 900, c: 2, node_id: "other" }, N, 3000);
    expect(r.hlc).toMatchObject({ l: 3000, c: 0 });
  });

  it("carries this node's identity, not the sender's", () => {
    const r = ingest(HLC_START, { l: 10, c: 0, node_id: "other" }, N, 5);
    expect(r.hlc.node_id).toBe(N);
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `bun run test tests/relay-lite-hlc.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
/**
 * The Hybrid Logical Clock, both rules from §3.3.
 *
 * `max` folds a regressing physical clock into the equal case, so the tuple
 * stays monotonic per node across NTP steps, VM restore and suspend — which is
 * the property the section rests on.
 *
 * ## What this file cannot fix, recorded where the next reader meets it
 *
 * §3.3 gives the update rules and says nothing about where `l` and `c` live
 * between process restarts. A node that restarts after its clock stepped
 * backwards begins at zero and can emit a tuple it has already emitted, so the
 * per-node monotonicity the section insists on rests on state the specification
 * does not require anyone to keep. Reported as a defect against the spec; this
 * module takes state as an argument so a caller *can* persist it, and cannot
 * make a caller do so.
 */

export interface Hlc {
  readonly l: number;
  readonly c: number;
  readonly node_id: string;
}

export interface HlcState {
  readonly l: number;
  readonly c: number;
}

export const HLC_START: HlcState = { l: 0, c: 0 };

export function emit(state: HlcState, nodeId: string, nowMs: number): { hlc: Hlc; state: HlcState } {
  const l = Math.max(nowMs, state.l);
  const c = l === state.l ? state.c + 1 : 0;
  return { hlc: { l, c, node_id: nodeId }, state: { l, c } };
}

export function ingest(
  state: HlcState,
  incoming: Hlc,
  nodeId: string,
  nowMs: number,
): { hlc: Hlc; state: HlcState } {
  const l = Math.max(nowMs, state.l, incoming.l);
  let c: number;
  if (l === state.l && l === incoming.l) c = Math.max(state.c, incoming.c) + 1;
  else if (l === state.l) c = state.c + 1;
  else if (l === incoming.l) c = incoming.c + 1;
  else c = 0;
  return { hlc: { l, c, node_id: nodeId }, state: { l, c } };
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `bun run test tests/relay-lite-hlc.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
bun run typecheck && bun run lint
git add src/relay-lite/hlc.ts tests/relay-lite-hlc.test.ts
git commit -m "feat(relay-lite): the Hybrid Logical Clock, both rules

Section 3.3's emission and ingest rules, with nowMs and the node state as
parameters so every case is tested without mocking a clock -- including the one
the section exists for, a physical clock stepping backwards.

The docstring records what this file cannot fix: 3.3 says nothing about where l
and c live between restarts, so a node restarting after a backwards clock step
can emit a tuple it already emitted. Taking state as an argument lets a caller
persist it and cannot make a caller do so."
```

---

### Task 4: The act, minting and sealing

`§3.2`, two normative claims. This is where the constraint that makes them hold
gets built: **`mint()` is the only producer of bytes, and nothing can
re-canonicalise a sealed act.**

**Files:**
- Create: `src/relay-lite/act.ts`
- Test: `tests/relay-lite-act.test.ts`

**Interfaces:**
- Consumes: `canonicalize`, `assertIJsonValue`, `sha256Hex` (Task 1); `uuidV7`, `UuidState` (Task 2); `emit`, `Hlc`, `HlcState` (Task 3).
- Produces:

```ts
export interface RelayAct<T = unknown> {
  readonly id: string;
  readonly thread_id: string;
  readonly parent_id: string | null;
  readonly parent_digest: string | null;
  readonly type: "message" | "claim" | "challenge" | "ruling" | "erratum";
  readonly from: string;
  readonly to: readonly string[];
  readonly hlc: Hlc;
  readonly payload: T;
}

export interface SealedAct {
  readonly act: RelayAct;
  readonly bytes: string;
  readonly digest: string;
}

export interface MintContext {
  readonly nodeId: string;
  readonly hlc: HlcState;
  readonly uuid: UuidState;
}

export interface MintInput {
  readonly thread_id: string;
  readonly type: RelayAct["type"];
  readonly from: string;
  readonly to: readonly string[];
  readonly payload: unknown;
  readonly parent?: { readonly id: string; readonly digest: string } | null;
}

export const mintContext: (nodeId: string) => MintContext;
export function mint(input: MintInput, ctx: MintContext, nowMs: number): { sealed: SealedAct; ctx: MintContext };
```

**No `remint`, no `reseal`, no `toBytes(act)`.** §3.2's *"MUST NOT re-tick the
HLC or re-mint timestamps when retrying an existing `id`"* then holds because the
API offers no way to violate it, rather than because a caller remembers not to.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { type MintInput, mint, mintContext } from "../src/relay-lite/act.js";
import { canonicalize, sha256Hex } from "../src/relay-lite/canonical.js";

const input: MintInput = {
  thread_id: "t-1",
  type: "message",
  from: "agent:claude",
  to: ["agent:mimo", "agent:mistral"],
  payload: { text: "hello" },
};

describe("mint — §3.2 sealing", () => {
  // "An act is sealed at creation: id minted, hlc stamped once, bytes
  // canonicalized once."
  it("produces bytes that are the canonicalization of the act", () => {
    const { sealed } = mint(input, mintContext("node-1"), 1000);
    expect(sealed.bytes).toBe(canonicalize(sealed.act));
    expect(sealed.digest).toBe(sha256Hex(sealed.bytes));
  });

  it("carries the audience as a list, and the parent as a pair or as neither", () => {
    const { sealed } = mint(input, mintContext("node-1"), 1000);
    expect(sealed.act.to).toEqual(["agent:mimo", "agent:mistral"]);
    expect(sealed.act.parent_id).toBeNull();
    expect(sealed.act.parent_digest).toBeNull();

    const child = mint(
      { ...input, parent: { id: sealed.act.id, digest: sealed.digest } },
      mintContext("node-1"),
      1001,
    );
    expect(child.sealed.act.parent_id).toBe(sealed.act.id);
    expect(child.sealed.act.parent_digest).toBe(sealed.digest);
  });

  // The republication case: the same sealed act must give the same bytes,
  // because the bytes are what is republished, not the act.
  it("gives bytes that do not change when republished", () => {
    const { sealed } = mint(input, mintContext("node-1"), 1000);
    const again = sealed.bytes;
    expect(again).toBe(sealed.bytes);
    expect(sha256Hex(again)).toBe(sealed.digest);
  });

  // §3.2 MUST NOT: two acts minted from one input are different acts, and the
  // API offers no way to re-stamp one of them.
  it("mints a new id and a new hlc for a second call, and cannot restamp the first", () => {
    const ctx = mintContext("node-1");
    const a = mint(input, ctx, 1000);
    const b = mint(input, a.ctx, 1000);
    expect(b.sealed.act.id).not.toBe(a.sealed.act.id);
    expect(b.sealed.act.hlc.c).toBe(a.sealed.act.hlc.c + 1);
    expect(a.sealed.bytes).not.toBe(b.sealed.bytes);
  });

  it("advances the context so a caller can carry it forward", () => {
    const ctx = mintContext("node-1");
    const a = mint(input, ctx, 1000);
    expect(a.ctx.hlc).not.toEqual(ctx.hlc);
    expect(a.ctx.uuid).not.toEqual(ctx.uuid);
  });

  it("refuses a payload outside the I-JSON domain", () => {
    expect(() => mint({ ...input, payload: { n: 9007199254740993 } }, mintContext("n"), 1)).toThrow();
  });

  it("refuses an empty audience, since a delivery leg must name a member", () => {
    expect(() => mint({ ...input, to: [] }, mintContext("n"), 1)).toThrow();
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `bun run test tests/relay-lite-act.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { assertIJsonValue, canonicalize, sha256Hex } from "./canonical.js";
import { HLC_START, type Hlc, type HlcState, emit } from "./hlc.js";
import { UUID_START, type UuidState, uuidV7 } from "./uuid.js";

/**
 * The canonical act, and the only place that produces one.
 *
 * §3.2: *"An act is sealed at creation: `id` minted, `hlc` stamped once, and the
 * payload canonicalized to JCS bytes"*, and *"Publishers MUST NOT re-tick the
 * HLC or re-mint timestamps when retrying an existing `id`."*
 *
 * That MUST NOT holds here by construction rather than by discipline: there is
 * no `remint`, no `reseal`, and no `toBytes(act)` in this module's surface. What
 * cannot be rebuilt cannot be rebuilt differently, and a retry republishes the
 * bytes it already has.
 */

export interface RelayAct<T = unknown> {
  readonly id: string;
  readonly thread_id: string;
  readonly parent_id: string | null;
  readonly parent_digest: string | null;
  readonly type: "message" | "claim" | "challenge" | "ruling" | "erratum";
  readonly from: string;
  readonly to: readonly string[];
  readonly hlc: Hlc;
  readonly payload: T;
}

export interface SealedAct {
  readonly act: RelayAct;
  readonly bytes: string;
  readonly digest: string;
}

export interface MintContext {
  readonly nodeId: string;
  readonly hlc: HlcState;
  readonly uuid: UuidState;
}

export interface MintInput {
  readonly thread_id: string;
  readonly type: RelayAct["type"];
  readonly from: string;
  readonly to: readonly string[];
  readonly payload: unknown;
  readonly parent?: { readonly id: string; readonly digest: string } | null;
}

export const mintContext = (nodeId: string): MintContext => ({
  nodeId,
  hlc: HLC_START,
  uuid: UUID_START,
});

export function mint(
  input: MintInput,
  ctx: MintContext,
  nowMs: number,
): { sealed: SealedAct; ctx: MintContext } {
  if (input.to.length === 0) {
    // §2 requires every delivery leg to name a member of `to[]`. An act with an
    // empty audience can have no conforming delivery, so it is refused here
    // rather than at publication, where the reason would be less obvious.
    throw new Error("an act must name at least one recipient");
  }
  assertIJsonValue(input.payload);

  const u = uuidV7(ctx.uuid, nowMs);
  const h = emit(ctx.hlc, ctx.nodeId, nowMs);

  // A citation is a pair or it is nothing: §7.2 has no state for half of one
  // that a producer may mint on purpose.
  const act: RelayAct = {
    id: u.id,
    thread_id: input.thread_id,
    parent_id: input.parent ? input.parent.id : null,
    parent_digest: input.parent ? input.parent.digest : null,
    type: input.type,
    from: input.from,
    to: [...input.to],
    hlc: h.hlc,
    payload: input.payload,
  };

  const bytes = canonicalize(act);
  return {
    sealed: { act, bytes, digest: sha256Hex(bytes) },
    ctx: { nodeId: ctx.nodeId, hlc: h.state, uuid: u.state },
  };
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `bun run test tests/relay-lite-act.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
bun run typecheck && bun run lint
git add src/relay-lite/act.ts tests/relay-lite-act.test.ts
git commit -m "feat(relay-lite): the canonical act, minted once and sealed

Section 3.2's two claims. The MUST NOT against re-ticking the HLC on a retry
holds by construction: this module's surface has no remint, no reseal and no
toBytes(act), so what cannot be rebuilt cannot be rebuilt differently, and a
retry republishes the bytes it already has.

An empty audience is refused at minting rather than at publication. Section 2
requires every delivery leg to name a member of to[], so an act with no
recipients can have no conforming delivery, and refusing early puts the reason
where it is legible."
```

---

### Task 5: Delivery names

`§2`, two normative claims.

**Files:**
- Create: `src/relay-lite/cns.ts`
- Test: `tests/relay-lite-cns.test.ts`

**Interfaces:**
- Consumes: `RelayAct` (Task 4).
- Produces:

```ts
export interface CnsName {
  readonly to: string;
  readonly from: string;
  readonly thread: string;
  readonly ttl: number;
  readonly id: string;
}
export function formatCns(act: RelayAct, recipient: string): string;
export function parseCns(filename: string): CnsName | null;
export type DeliveryCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "recipient-not-in-audience" | "id-mismatch" };
export function checkDelivery(cns: CnsName, act: RelayAct): DeliveryCheck;
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { type MintInput, mint, mintContext } from "../src/relay-lite/act.js";
import { checkDelivery, formatCns, parseCns } from "../src/relay-lite/cns.js";

const base: MintInput = {
  thread_id: "t-1",
  type: "message",
  from: "agent:claude",
  to: ["agent:mimo", "agent:mistral"],
  payload: { text: "x" },
};
const { sealed } = mint(base, mintContext("node-1"), 1000);

describe("CNS names — §2.1", () => {
  it("round-trips through format and parse", () => {
    const name = formatCns(sealed.act, "agent:mimo");
    const parsed = parseCns(name);
    expect(parsed).toMatchObject({
      to: "agent:mimo",
      from: "agent:claude",
      thread: "t-1",
      id: sealed.act.id,
    });
  });

  it("returns null for a name that is not one", () => {
    expect(parseCns("notes.txt")).toBeNull();
    expect(parseCns("to=a;from=b.json")).toBeNull();
  });
});

describe("checkDelivery — §2's two claims", () => {
  // "CNS.to is an element of the act's to[], or to[] == ["all"]."
  it("refuses a leg naming a recipient outside the audience", () => {
    const name = parseCns(formatCns(sealed.act, "agent:mimo"))!;
    const forged = { ...name, to: "agent:someone-else" };
    expect(checkDelivery(forged, sealed.act)).toEqual({
      ok: false,
      reason: "recipient-not-in-audience",
    });
  });

  it("admits any recipient when the audience is all", () => {
    const open = mint({ ...base, to: ["all"] }, mintContext("node-1"), 1000).sealed;
    const name = parseCns(formatCns(open.act, "all"))!;
    expect(checkDelivery({ ...name, to: "agent:anyone" }, open.act)).toEqual({ ok: true });
  });

  // "CNS.id == act.id."
  it("refuses a name disagreeing with the sealed body", () => {
    const name = parseCns(formatCns(sealed.act, "agent:mimo"))!;
    expect(checkDelivery({ ...name, id: "0192aaaa-0000-7000-8000-000000000000" }, sealed.act))
      .toEqual({ ok: false, reason: "id-mismatch" });
  });

  it("admits a well-formed leg", () => {
    const name = parseCns(formatCns(sealed.act, "agent:mistral"))!;
    expect(checkDelivery(name, sealed.act)).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `bun run test tests/relay-lite-cns.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { RelayAct } from "./act.js";

/**
 * The delivery filename, and the two things it must agree with.
 *
 * §2.1: `to=<agent>;from=<agent>;thread=<thread_id>;ttl=<seconds>;id=<uuidv7>.json`
 *
 * §2: *"`CNS.to` is an element of the act's `to[]`, or `to[] == ["all"]`"*, and
 * *"`CNS.id == act.id`."*
 *
 * The name carries delivery and the sealed body carries the act, so the two can
 * disagree — a validly sealed act can be linked under a name naming someone the
 * author never addressed. `checkDelivery` is what makes the attested audience
 * mean something rather than merely being recorded.
 */

export interface CnsName {
  readonly to: string;
  readonly from: string;
  readonly thread: string;
  readonly ttl: number;
  readonly id: string;
}

const DEFAULT_TTL = 0;

export function formatCns(act: RelayAct, recipient: string): string {
  return `to=${recipient};from=${act.from};thread=${act.thread_id};ttl=${DEFAULT_TTL};id=${act.id}.json`;
}

export function parseCns(filename: string): CnsName | null {
  if (!filename.endsWith(".json")) return null;
  const fields = new Map<string, string>();
  for (const part of filename.slice(0, -".json".length).split(";")) {
    const at = part.indexOf("=");
    if (at === -1) return null;
    fields.set(part.slice(0, at), part.slice(at + 1));
  }
  const to = fields.get("to");
  const from = fields.get("from");
  const thread = fields.get("thread");
  const ttl = fields.get("ttl");
  const id = fields.get("id");
  if (!to || !from || !thread || ttl === undefined || !id) return null;
  const ttlNum = Number(ttl);
  if (!Number.isInteger(ttlNum) || ttlNum < 0) return null;
  return { to, from, thread, ttl: ttlNum, id };
}

export type DeliveryCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "recipient-not-in-audience" | "id-mismatch" };

export function checkDelivery(cns: CnsName, act: RelayAct): DeliveryCheck {
  if (cns.id !== act.id) return { ok: false, reason: "id-mismatch" };
  const open = act.to.length === 1 && act.to[0] === "all";
  if (!open && !act.to.includes(cns.to)) {
    return { ok: false, reason: "recipient-not-in-audience" };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `bun run test tests/relay-lite-cns.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
bun run typecheck && bun run lint
git add src/relay-lite/cns.ts tests/relay-lite-cns.test.ts
git commit -m "feat(relay-lite): delivery names, and the two things they must agree with

Section 2's two claims. The name carries delivery and the sealed body carries
the act, so the two can disagree -- a validly sealed act can be linked under a
name addressing someone its author never named, with every digest still
verifying. checkDelivery is what makes the attested audience constrain something
rather than merely be recorded."
```

---

### Task 6: The publisher

`§4.1`. No RFC-2119 keyword appears in that section and all of it is
load-bearing: every element closes a failure that sixteen rounds of review on
issue #5 found. The two checks here are beyond the eleven claims.

**Files:**
- Create: `src/relay-lite/publish.ts`
- Test: `tests/relay-lite-publish.test.ts`

**Interfaces:**
- Consumes: `SealedAct` (Task 4); `formatCns` (Task 5); `sha256Hex` (Task 1).
- Produces:

```ts
export type PublishResult =
  | { readonly status: "PUBLISHED" }
  | { readonly status: "ALREADY_PUBLISHED" }
  | { readonly status: "COLLISION_REFUSED" }
  | { readonly status: "RETRY_EXHAUSTED" };

export interface PublishOptions {
  readonly maxRetries?: number;
  /** Called with each path `fsync` is issued against. For the §4.1 check. */
  readonly onSync?: (path: string) => void;
}

export async function publish(
  sealed: SealedAct,
  recipient: string,
  root: string,
  options?: PublishOptions,
): Promise<PublishResult>;

export async function publishAll(
  sealed: SealedAct,
  root: string,
  options?: PublishOptions,
): Promise<ReadonlyArray<{ readonly recipient: string; readonly result: PublishResult }>>;
```

**`publishAll` is a loop over `publish`, and returns one result per recipient.**
The specification is silent on partial fan-out, there is no atomicity across
delivery legs and none available, so three recipients give three answers rather
than one verdict standing for all three.

- [ ] **Step 1: Write the failing tests**

```ts
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type MintInput, mint, mintContext } from "../src/relay-lite/act.js";
import { formatCns } from "../src/relay-lite/cns.js";
import { publish, publishAll } from "../src/relay-lite/publish.js";

const input: MintInput = {
  thread_id: "t-1",
  type: "message",
  from: "agent:claude",
  to: ["agent:mimo", "agent:mistral"],
  payload: { text: "x" },
};
const root = () => mkdtempSync(join(tmpdir(), "relay-lite-"));

describe("publish — §4.1", () => {
  it("writes the act under its delivery name", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    expect(await publish(sealed, "agent:mimo", dir)).toEqual({ status: "PUBLISHED" });
    const name = formatCns(sealed.act, "agent:mimo");
    expect(readFileSync(join(dir, "in", name), "utf8")).toBe(sealed.bytes);
  });

  it("leaves no temp file behind", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    await publish(sealed, "agent:mimo", dir);
    expect(readdirSync(join(dir, "tmp"))).toEqual([]);
  });

  // "EEXIST alone does not say whose name it is."
  it("reports the same act as already published, not as a collision", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    await publish(sealed, "agent:mimo", dir);
    expect(await publish(sealed, "agent:mimo", dir)).toEqual({ status: "ALREADY_PUBLISHED" });
  });

  it("reports a different act at the same name as a collision", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    const name = formatCns(sealed.act, "agent:mimo");
    writeFileSync(join(dir, "in", name), '{"different":true}');
    expect(await publish(sealed, "agent:mimo", dir)).toEqual({ status: "COLLISION_REFUSED" });
  });

  // "Loop exhaustion is reachable only via the vanished-target path, which means
  // every attempt found the name free. Reporting that as a collision is the
  // same error one level out."
  it("reports exhaustion, not a collision, when the target keeps vanishing", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    const name = formatCns(sealed.act, "agent:mimo");
    // A target that exists for `link` and is gone by the time it is read.
    let reads = 0;
    const result = await publish(sealed, "agent:mimo", dir, {
      maxRetries: 3,
      onSync: () => {},
      // The seam the test needs: see Step 3 for `readTarget`.
    });
    expect(["RETRY_EXHAUSTED", "PUBLISHED"]).toContain(result.status);
    expect(reads).toBe(0);
    expect(name.length).toBeGreaterThan(0);
  });

  // Check 11 of the design: the implementation's claim, not the kernel's.
  it("calls fsync on the directory, not only on the file", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    const synced: string[] = [];
    await publish(sealed, "agent:mimo", dir, { onSync: (p) => synced.push(p) });
    expect(synced).toContain(join(dir, "in"));
    expect(synced.length).toBeGreaterThanOrEqual(2);
  });

  it("completes the durability guarantee on the recovered path too", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    await publish(sealed, "agent:mimo", dir);
    const synced: string[] = [];
    const again = await publish(sealed, "agent:mimo", dir, { onSync: (p) => synced.push(p) });
    expect(again).toEqual({ status: "ALREADY_PUBLISHED" });
    expect(synced).toContain(join(dir, "in"));
  });
});

describe("publishAll — fan-out", () => {
  it("returns one result per recipient", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    const results = await publishAll(sealed, dir);
    expect(results.map((r) => r.recipient)).toEqual(["agent:mimo", "agent:mistral"]);
    expect(results.every((r) => r.result.status === "PUBLISHED")).toBe(true);
  });

  it("shows a partial fan-out as partial", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    writeFileSync(join(dir, "in", formatCns(sealed.act, "agent:mistral")), '{"other":1}');
    const results = await publishAll(sealed, dir);
    expect(results.map((r) => r.result.status)).toEqual(["PUBLISHED", "COLLISION_REFUSED"]);
  });

  it("writes bytes identical across every delivery leg", async () => {
    const dir = root();
    const { sealed } = mint(input, mintContext("n"), 1000);
    await publishAll(sealed, dir);
    const bodies = readdirSync(join(dir, "in")).map((n) =>
      readFileSync(join(dir, "in", n), "utf8"),
    );
    expect(new Set(bodies).size).toBe(1);
  });
});
```

**Note on the vanished-target test.** The path is reachable only by a race, and
the test above asserts the shape rather than forcing it. Forcing it needs a seam;
if the implementer wants one, add an optional `readTarget` to `PublishOptions`
defaulting to `readFile`, and have the test supply one that throws `ENOENT`.
Prefer the seam: an untested `RETRY_EXHAUSTED` is a status nothing has produced.

- [ ] **Step 2: Run and watch it fail**

Run: `bun run test tests/relay-lite-publish.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { link, mkdir, open, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { sha256Hex } from "./canonical.js";
import type { SealedAct } from "./act.js";
import { formatCns } from "./cns.js";

/**
 * The publish sequence from §4.1.
 *
 * Every element closes a failure found during review of issue #5, and the
 * comments say which, because a reader who does not know what each guards will
 * eventually simplify one away.
 *
 * ## This module requires POSIX, and says so rather than degrading
 *
 * §4.1 is built from `link` refusing a held name with `EEXIST`, `O_CREAT |
 * O_EXCL` on the temp, and `fsync` on a directory file descriptor. Windows has
 * none of those semantics, and `open()` on a directory there raises `EISDIR`.
 *
 * Review proposed catching and ignoring that. It is not done, because a
 * publisher that skipped the directory fsync and still returned `PUBLISHED`
 * would be asserting a durability it did not obtain — *"durable bytes are not a
 * durable name"* is the whole reason the step exists. An error propagating is a
 * caller learning the platform cannot give what this returns; a swallowed one is
 * a caller told the name is safe when it may not be.
 *
 * If this ever needs to run where a directory cannot be synced, the honest shape
 * is a fourth `PublishResult` naming the weaker guarantee, not a silent one.
 */

export type PublishResult =
  | { readonly status: "PUBLISHED" }
  | { readonly status: "ALREADY_PUBLISHED" }
  | { readonly status: "COLLISION_REFUSED" }
  | { readonly status: "RETRY_EXHAUSTED" };

export interface PublishOptions {
  readonly maxRetries?: number;
  /** Every path `fsync` is issued against, so a test can assert the directory. */
  readonly onSync?: (path: string) => void;
  /** Seam for the vanished-target path, which a race alone cannot be made to take. */
  readonly readTarget?: (path: string) => Promise<string>;
}

async function syncPath(path: string, flags: string, onSync?: (p: string) => void): Promise<void> {
  const handle = await open(path, flags);
  try {
    await handle.sync();
    onSync?.(path);
  } finally {
    await handle.close();
  }
}

export async function publish(
  sealed: SealedAct,
  recipient: string,
  root: string,
  options: PublishOptions = {},
): Promise<PublishResult> {
  const inDir = join(root, "in");
  const tmpDir = join(root, "tmp");
  await mkdir(inDir, { recursive: true });
  await mkdir(tmpDir, { recursive: true });

  const target = join(inDir, formatCns(sealed.act, recipient));
  const maxRetries = options.maxRetries ?? 3;
  const readOne = options.readTarget ?? ((p: string) => readFile(p, "utf8"));

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Randomised, not `<id>.tmp`. A crash leaves no `finally` to run, and a
    // deterministic name would survive as an uncollectable file blocking
    // republication of exactly the message that was interrupted.
    const tmp = join(
      tmpDir,
      `.dep-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    let created = false;

    try {
      const handle = await open(tmp, "wx");
      created = true;
      try {
        await handle.writeFile(sealed.bytes, "utf8");
        await handle.sync();
        options.onSync?.(tmp);
      } finally {
        await handle.close();
      }

      try {
        // `link`, not `rename`: rename overwrites a held name silently, and a
        // create-or-fail publish needs the EEXIST.
        await link(tmp, target);
      } catch (error) {
        // EEXIST is interpreted only for `link`. The temp `open` above uses
        // O_EXCL and produces EEXIST too, and catching it at this level would
        // report a temp-name collision as a publish collision.
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;

        let existing: string;
        try {
          existing = await readOne(target);
        } catch (readError) {
          // ENOENT is interpreted only for reading the target. The directory
          // fsync below produces ENOENT too, and the two are indistinguishable
          // by code.
          if ((readError as NodeJS.ErrnoException).code === "ENOENT") continue;
          throw readError;
        }

        if (sha256Hex(existing) === sealed.digest) {
          // The recovery path completes the guarantee it is recovering: the
          // first attempt may have linked and failed before its directory
          // fsync, leaving a name visible in page cache and never persisted.
          await syncPath(inDir, "r", options.onSync);
          return { status: "ALREADY_PUBLISHED" };
        }
        return { status: "COLLISION_REFUSED" };
      }

      // Durable bytes are not a durable name.
      await syncPath(inDir, "r", options.onSync);
      return { status: "PUBLISHED" };
    } finally {
      if (created) await unlink(tmp).catch(() => {});
    }
  }

  // Reachable only through the vanished-target path, which means every attempt
  // found the name free. Reporting that as a collision would assert another
  // writer holds a name nobody holds.
  return { status: "RETRY_EXHAUSTED" };
}

/**
 * One result per recipient.
 *
 * The specification is silent on partial fan-out, there is no atomicity across
 * delivery legs and none available, so collapsing three outcomes into one would
 * assert a guarantee the mechanism does not provide.
 */
export async function publishAll(
  sealed: SealedAct,
  root: string,
  options: PublishOptions = {},
): Promise<ReadonlyArray<{ readonly recipient: string; readonly result: PublishResult }>> {
  const out: { recipient: string; result: PublishResult }[] = [];
  for (const recipient of sealed.act.to) {
    out.push({ recipient, result: await publish(sealed, recipient, root, options) });
  }
  return out;
}
```

- [ ] **Step 4: Rewrite the vanished-target test against the seam**

Replace the placeholder test from Step 1 with one that uses `readTarget`:

```ts
it("reports exhaustion, not a collision, when the target keeps vanishing", async () => {
  const dir = root();
  const { sealed } = mint(input, mintContext("n"), 1000);
  writeFileSync(join(dir, "in", formatCns(sealed.act, "agent:mimo")), '{"other":1}');
  const result = await publish(sealed, "agent:mimo", dir, {
    maxRetries: 3,
    readTarget: async () => {
      const e: NodeJS.ErrnoException = new Error("vanished");
      e.code = "ENOENT";
      throw e;
    },
  });
  expect(result).toEqual({ status: "RETRY_EXHAUSTED" });
});
```

- [ ] **Step 5: Run and watch it pass**

Run: `bun run test tests/relay-lite-publish.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 6: Typecheck, lint, commit**

```bash
bun run typecheck && bun run lint
git add src/relay-lite/publish.ts tests/relay-lite-publish.test.ts
git commit -m "feat(relay-lite): the publish sequence

Section 4.1, which contains no RFC-2119 keyword and is entirely load-bearing:
every element closes a failure found during sixteen rounds of review on issue
number 5, and the comments say which, because a reader who does not know what
each guards will eventually simplify one away.

EEXIST is interpreted only for link and ENOENT only for reading the target,
because the temp open and the directory fsync produce the same codes and the
two would otherwise be indistinguishable. The recovered path completes the
directory fsync it is recovering. RETRY_EXHAUSTED is reachable only when every
attempt found the name free, so it asserts nothing about another writer.

publishAll returns one result per recipient. The spec is silent on partial
fan-out and there is no atomicity across delivery legs, so three recipients give
three answers rather than one verdict standing for all three.

onSync is a seam for the check the design names: fsync being called on the
directory is this implementation's claim and is checked every run, while a
directory entry surviving a crash is the kernel's and needs dm-log-writes."
```

---

### Task 7: Verification

`§7`, four normative claims. Three stages in order, six states, and the store
integrity rule.

**Files:**
- Create: `src/relay-lite/verify.ts`
- Test: `tests/relay-lite-verify.test.ts`

**Interfaces:**
- Consumes: `parseIJson`, `sha256Hex`, `canonicalize` (Task 1); `RelayAct` (Task 4); `parseCns`, `checkDelivery` (Task 5).
- Produces:

```ts
export type CausalStatus =
  | "NO_PARENT" | "UNANCHORED" | "LABEL_ONLY"
  | "MATCHES"   | "DIVERGES"   | "UNCHECKABLE";

export interface StoredAct { readonly bytes: string; readonly digest: string }

export class StoreCorruption extends Error {
  readonly locator: string;
}

export function stage1(bytes: string): { readonly digest: string };

export type Stage2Result =
  | { readonly ok: true; readonly act: RelayAct }
  | { readonly ok: false; readonly reason: string };
export function stage2(bytes: string, filename: string): Stage2Result;

export function stage3(act: RelayAct, held: ReadonlyMap<string, StoredAct>): CausalStatus;
```

**Three functions, not one with phases.** §7.1's ordering is normative, and a
test can call them out of order and observe the difference only if they are
separable.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { type MintInput, mint, mintContext } from "../src/relay-lite/act.js";
import { canonicalize, sha256Hex } from "../src/relay-lite/canonical.js";
import { formatCns } from "../src/relay-lite/cns.js";
import {
  StoreCorruption,
  type StoredAct,
  stage1,
  stage2,
  stage3,
} from "../src/relay-lite/verify.js";

const input: MintInput = {
  thread_id: "t-1",
  type: "message",
  from: "agent:claude",
  to: ["agent:mimo"],
  payload: { text: "x" },
};
const parent = mint(input, mintContext("n"), 1000).sealed;
const child = mint(
  { ...input, parent: { id: parent.act.id, digest: parent.digest } },
  mintContext("n"),
  1001,
).sealed;

const holding = (...acts: { act: { id: string }; bytes: string; digest: string }[]) =>
  new Map<string, StoredAct>(acts.map((a) => [a.act.id, { bytes: a.bytes, digest: a.digest }]));

describe("stage 1 — §7.1 wire-octet hashing", () => {
  // "MUST NOT parse, normalize, or re-serialize payload bytes when computing
  // digest or verifying parent_digest."
  it("hashes what it was given, not a re-serialization of it", () => {
    const spaced = ` ${parent.bytes} `;
    expect(stage1(parent.bytes).digest).toBe(parent.digest);
    expect(stage1(spaced).digest).not.toBe(parent.digest);
    expect(stage1(spaced).digest).toBe(sha256Hex(spaced));
  });
});

describe("stage 2 — §7.1 structural and I-JSON conformance", () => {
  it("admits a well-formed act under its own name", () => {
    const r = stage2(parent.bytes, formatCns(parent.act, "agent:mimo"));
    expect(r.ok).toBe(true);
  });

  it("refuses a leg naming a recipient outside the audience", () => {
    const r = stage2(parent.bytes, formatCns(parent.act, "agent:someone-else"));
    expect(r).toMatchObject({ ok: false, reason: "recipient-not-in-audience" });
  });

  it("refuses duplicate keys, which a parsed value can no longer show", () => {
    const r = stage2('{"from":"a","from":"b"}', formatCns(parent.act, "agent:mimo"));
    expect(r.ok).toBe(false);
  });

  // "reject ... on an unanchored citation (parent_id == null && parent_digest != null)"
  it("refuses a shape that is not an act, rather than passing it to stage 3", () => {
    const notAnAct = canonicalize({ id: "x", to: [] });
    const r = stage2(notAnAct, formatCns(parent.act, "agent:mimo"));
    expect(r).toMatchObject({ ok: false, reason: "not-an-act" });
  });

  it("refuses a to[] holding something other than strings", () => {
    const forged = canonicalize({ ...parent.act, to: [1, 2] });
    expect(stage2(forged, formatCns(parent.act, "agent:mimo")).ok).toBe(false);
  });

  it("refuses an unanchored citation at ingest", () => {
    const forged = canonicalize({ ...parent.act, parent_id: null, parent_digest: "aa" });
    const r = stage2(forged, formatCns(parent.act, "agent:mimo"));
    expect(r).toMatchObject({ ok: false, reason: "unanchored" });
  });

  it("refuses non-canonical bytes rather than silently repairing them", () => {
    // Same act, keys in another order: parses to the same value, is not the
    // same wire form, and a verifier that re-serialised would call it fine.
    const reordered = JSON.stringify(parent.act);
    if (reordered !== parent.bytes) {
      const r = stage2(reordered, formatCns(parent.act, "agent:mimo"));
      expect(r).toMatchObject({ ok: false, reason: "not-canonical" });
    }
  });
});

describe("stage 3 — §7.2 the citation matrix", () => {
  // All six corners, and three of them are not defects.
  it("classifies all six", () => {
    const held = holding(parent);
    expect(stage3(parent.act, held)).toBe("NO_PARENT");
    expect(stage3(child.act, held)).toBe("MATCHES");
    expect(stage3({ ...child.act, parent_digest: `${"0".repeat(64)}` }, held)).toBe("DIVERGES");
    expect(stage3(child.act, new Map())).toBe("UNCHECKABLE");
    expect(stage3({ ...child.act, parent_digest: null }, held)).toBe("LABEL_ONLY");
    expect(stage3({ ...child.act, parent_id: null }, held)).toBe("UNANCHORED");
  });

  // "Verifiers MUST NOT reject or discard a well-formed act solely because its
  // causal link evaluates to UNCHECKABLE."
  it("is total: every input returns a state and none throws", () => {
    expect(() => stage3({ ...child.act, parent_id: "unknown" }, new Map())).not.toThrow();
  });
});

describe("§7.3 store integrity", () => {
  // "A detected discrepancy raises STORE_CORRUPTION. It MUST NOT surface as
  // DIVERGES against a child record."
  it("raises STORE_CORRUPTION rather than charging a child", () => {
    const corrupt = new Map<string, StoredAct>([
      [parent.act.id, { bytes: parent.bytes, digest: "0".repeat(64) }],
    ]);
    expect(() => stage3(child.act, corrupt)).toThrow(StoreCorruption);
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `bun run test tests/relay-lite-verify.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { RelayAct } from "./act.js";
import { canonicalize, parseIJson, sha256Hex } from "./canonical.js";
import { checkDelivery, parseCns } from "./cns.js";

/**
 * Verification, §7, in the order the section makes normative.
 *
 * Three functions rather than one with phases, because a single function cannot
 * demonstrate that the order was respected and three can — a test may call them
 * out of order and see the difference.
 */

export type CausalStatus =
  | "NO_PARENT"
  | "UNANCHORED"
  | "LABEL_ONLY"
  | "MATCHES"
  | "DIVERGES"
  | "UNCHECKABLE";

export interface StoredAct {
  readonly bytes: string;
  readonly digest: string;
}

/**
 * A discrepancy inside this store, which is not a defect in anyone's record.
 *
 * §7.3: it *"MUST NOT surface as `DIVERGES` against a child record"* — the
 * tri-state stops a reader's visibility gap from becoming an author's defect,
 * and this stops the reader's staleness from doing the same. Thrown rather than
 * returned because it is about the store rather than the record being checked,
 * and swallowing it would put a reader's bookkeeping error into an author's
 * column.
 */
export class StoreCorruption extends Error {
  readonly locator: string;
  constructor(locator: string) {
    super(`stored digest disagrees with stored bytes for ${locator}`);
    this.name = "StoreCorruption";
    this.locator = locator;
  }
}

/**
 * §7.1 stage 1: *"Compute act_digest = SHA-256(raw_received_bytes). No parsing,
 * no normalization."*
 */
export function stage1(bytes: string): { readonly digest: string } {
  return { digest: sha256Hex(bytes) };
}

const ACT_TYPES = new Set(["message", "claim", "challenge", "ruling", "erratum"]);

/**
 * The whole shape, because a partial check is a check that admits what it did
 * not look at.
 */
function isRelayAct(v: unknown): v is RelayAct {
  if (v === null || typeof v !== "object") return false;
  const a = v as Record<string, unknown>;
  const str = (x: unknown): boolean => typeof x === "string";
  const strOrNull = (x: unknown): boolean => x === null || typeof x === "string";
  const hlc = a.hlc;
  if (hlc === null || typeof hlc !== "object") return false;
  const h = hlc as Record<string, unknown>;
  return (
    str(a.id) &&
    str(a.thread_id) &&
    strOrNull(a.parent_id) &&
    strOrNull(a.parent_digest) &&
    str(a.type) &&
    ACT_TYPES.has(a.type as string) &&
    str(a.from) &&
    Array.isArray(a.to) &&
    a.to.every(str) &&
    typeof h.l === "number" &&
    typeof h.c === "number" &&
    str(h.node_id) &&
    "payload" in a
  );
}

export type Stage2Result =
  | { readonly ok: true; readonly act: RelayAct }
  | { readonly ok: false; readonly reason: string };

/** §7.1 stage 2: structural and I-JSON conformance, and the §2 checks. */
export function stage2(bytes: string, filename: string): Stage2Result {
  const cns = parseCns(filename);
  if (!cns) return { ok: false, reason: "not-a-delivery-name" };

  let value: unknown;
  try {
    value = parseIJson(bytes);
  } catch (error) {
    return { ok: false, reason: (error as Error).message };
  }

  const act = value as RelayAct;
  // Every field, not only two. Checking `id` and `to` alone let a shape that is
  // not an act reach stage 3, where `undefined === null` is false twice and the
  // result was `UNCHECKABLE` — a state meaning "this reader lacks the parent",
  // reported about something that was never an act.
  if (!isRelayAct(act)) return { ok: false, reason: "not-an-act" };

  // A producer that did not canonicalise is refused rather than repaired. §7.1
  // forbids a verifier re-serialising to compute a digest; admitting
  // non-canonical bytes would make JCS a local convention instead of a wire
  // contract, and two verifiers would then disagree about the same act.
  if (canonicalize(act) !== bytes) return { ok: false, reason: "not-canonical" };

  const delivery = checkDelivery(cns, act);
  if (!delivery.ok) return { ok: false, reason: delivery.reason };

  if (act.parent_id === null && act.parent_digest !== null) {
    return { ok: false, reason: "unanchored" };
  }

  return { ok: true, act };
}

/**
 * §7.1 stage 3, and §7.2's matrix.
 *
 * Total: every input returns a state and none throws — except `StoreCorruption`,
 * which is about the store. `UNANCHORED` is refused at stage 2, where rejection
 * belongs, and still classified here, so an auditor sweeping records that did
 * not come through this pipeline gets a report rather than an aborted sweep.
 */
export function stage3(act: RelayAct, held: ReadonlyMap<string, StoredAct>): CausalStatus {
  if (act.parent_id === null) {
    return act.parent_digest === null ? "NO_PARENT" : "UNANCHORED";
  }
  if (act.parent_digest === null) return "LABEL_ONLY";

  const parent = held.get(act.parent_id);
  if (parent === undefined) return "UNCHECKABLE";

  // §7.3's invariant is checked here rather than assumed, because a stale
  // cached digest would otherwise be reported as the child author's defect.
  if (sha256Hex(parent.bytes) !== parent.digest) throw new StoreCorruption(act.parent_id);

  return parent.digest === act.parent_digest ? "MATCHES" : "DIVERGES";
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `bun run test tests/relay-lite-verify.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
bun run typecheck && bun run lint
git add src/relay-lite/verify.ts tests/relay-lite-verify.test.ts
git commit -m "feat(relay-lite): verification, three stages and six states

Section 7's four claims. Three functions rather than one with phases, because
7.1's ordering is normative and only separable functions let a test call them
out of order and see the difference.

Non-canonical bytes are refused rather than repaired. 7.1 forbids a verifier
re-serialising to compute a digest, so admitting them would make JCS a local
convention instead of a wire contract and two verifiers would disagree about
the same act.

UNANCHORED is refused at stage 2 and still classified at stage 3. The two stages
answer different questions -- may this enter, and what is this -- so evaluation
stays total and a sweep over records that did not come through this pipeline
reports rather than aborts.

StoreCorruption is thrown rather than returned because it is about the store
rather than the record being checked. 7.3 forbids it surfacing as DIVERGES: the
tri-state stops a reader's visibility gap becoming an author's defect, and this
stops the reader's staleness from doing the same."
```

---

### Task 8: Assembly, and a conformance report

Ties the modules together and produces the artifact this exercise exists for: a
report saying which of the specification's claims hold, by clause.

**Files:**
- Create: `src/relay-lite/index.ts`
- Create: `scripts/relay-lite-conformance.ts`
- Test: `tests/relay-lite-roundtrip.test.ts`
- Modify: `package.json` — add `"conform:relay-lite": "bun run scripts/relay-lite-conformance.ts"`

**Interfaces:**
- Consumes: everything from Tasks 1–7.
- Produces:

```ts
export * from "./act.js";
export * from "./cns.js";
export * from "./hlc.js";
export * from "./publish.js";
export * from "./uuid.js";
export * from "./verify.js";
// canonical.js is deliberately absent from this list. See the implementation.
export async function readDelivered(root: string): Promise<ReadonlyMap<string, StoredAct>>;
```

- [ ] **Step 1: Write the failing round-trip test**

```ts
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  mint,
  mintContext,
  publishAll,
  readDelivered,
  StoreCorruption,
  stage1,
  stage2,
  stage3,
} from "../src/relay-lite/index.js";
import { formatCns } from "../src/relay-lite/cns.js";
import { readFile } from "node:fs/promises";

// §4: "The protocol and storage model treat the graph as a DAG — a partial
// order." A store discharges it by imposing no total order of its own.
describe("§4 — the store imposes no order", () => {
  it("returns acts keyed by id, with no sequence and no sort", async () => {
    const root = mkdtempSync(join(tmpdir(), "relay-lite-dag-"));
    let ctx = mintContext("n");
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const m = mint(
        { thread_id: "t", type: "message", from: "agent:a", to: ["agent:b"], payload: { i } },
        ctx,
        1000 + i,
      );
      ctx = m.ctx;
      ids.push(m.sealed.act.id);
      await publishAll(m.sealed, root);
    }
    const held = await readDelivered(root);
    // A Map keyed by id: no position, no rank, nothing a consumer could mistake
    // for the causal history. Every act is present and none is ordered.
    expect(new Set(held.keys())).toEqual(new Set(ids));
    for (const act of held.values()) {
      expect(Object.keys(act)).toEqual(["bytes", "digest"]);
    }
  });
});

describe("readDelivered", () => {
  it("skips a file deleted between the listing and the read", async () => {
    const root = mkdtempSync(join(tmpdir(), "relay-lite-gap-"));
    const { sealed } = mint(
      { thread_id: "t", type: "message", from: "agent:a", to: ["agent:b"], payload: { n: 1 } },
      mintContext("n"),
      1000,
    );
    await publishAll(sealed, root);
    // One delivery file, removed after publication: the sweep reports what it
    // holds rather than failing.
    rmSync(join(root, "in", formatCns(sealed.act, "agent:b")));
    expect((await readDelivered(root)).size).toBe(0);
  });

  it("refuses two copies of one id that disagree, rather than picking one", async () => {
    const root = mkdtempSync(join(tmpdir(), "relay-lite-dup-"));
    const { sealed } = mint(
      { thread_id: "t", type: "message", from: "agent:a", to: ["agent:b", "agent:c"], payload: { n: 1 } },
      mintContext("n"),
      1000,
    );
    await publishAll(sealed, root);
    // Same id under a second delivery name, different bytes: a discrepancy in
    // the store, not a defect in anyone's record.
    writeFileSync(join(root, "in", formatCns(sealed.act, "agent:c")), '{"forged":true}');
    await expect(readDelivered(root)).rejects.toThrow(StoreCorruption);
  });
});

describe("round trip — two agents and a citation between them", () => {
  it("mints, publishes, reads back, and verifies the citation", async () => {
    const root = mkdtempSync(join(tmpdir(), "relay-lite-rt-"));
    let ctx = mintContext("node-a");

    const first = mint(
      { thread_id: "t", type: "message", from: "agent:a", to: ["agent:b"], payload: { n: 1 } },
      ctx,
      1000,
    );
    ctx = first.ctx;
    await publishAll(first.sealed, root);

    const second = mint(
      {
        thread_id: "t",
        type: "message",
        from: "agent:a",
        to: ["agent:b"],
        payload: { n: 2 },
        parent: { id: first.sealed.act.id, digest: first.sealed.digest },
      },
      ctx,
      1001,
    );
    await publishAll(second.sealed, root);

    const held = await readDelivered(root);
    expect(held.size).toBe(2);

    const name = formatCns(second.sealed.act, "agent:b");
    const bytes = await readFile(join(root, "in", name), "utf8");

    expect(stage1(bytes).digest).toBe(second.sealed.digest);
    const parsed = stage2(bytes, name);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(stage3(parsed.act, held)).toBe("MATCHES");
  });
});
```

- [ ] **Step 2: Run and watch it fail**

Run: `bun run test tests/relay-lite-roundtrip.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the assembly**

```ts
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { sha256Hex } from "./canonical.js";
import { parseCns } from "./cns.js";
import { StoreCorruption, type StoredAct } from "./verify.js";

export * from "./act.js";
export * from "./cns.js";
export * from "./hlc.js";
export * from "./publish.js";
export * from "./uuid.js";
export * from "./verify.js";

// `canonical.js` is deliberately not re-exported. `mint()` is then the only
// producer of bytes a consumer of this package has, which is what makes §3.2's
// MUST NOT against re-ticking a retry hold by construction rather than by
// convention: through this surface a caller cannot assemble bytes for
// {...act, hlc: other}. verify.ts imports it directly, and so do the tests.

/**
 * Every act delivered under this root, keyed by act id.
 *
 * Fan-out means N delivery files carry one act, and §4 requires a consumer to
 * deduplicate by `id` before doing anything else — so this returns one entry per
 * act rather than one per file. The copies are byte-identical, which is what
 * moving `to` out of the hashed body bought.
 */
export async function readDelivered(root: string): Promise<ReadonlyMap<string, StoredAct>> {
  const inDir = join(root, "in");
  let names: string[];
  try {
    names = await readdir(inDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Map();
    throw error;
  }

  const out = new Map<string, StoredAct>();
  for (const name of names) {
    const cns = parseCns(name);
    if (!cns) continue;

    let bytes: string;
    try {
      bytes = await readFile(join(inDir, name), "utf8");
    } catch (error) {
      // A file deleted between the readdir and this read is a gap in what this
      // reader holds, not a fault in the store. Failing the whole sweep for it
      // would make one racing delete look like a broken store.
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }

    const digest = sha256Hex(bytes);
    const seen = out.get(cns.id);
    if (seen !== undefined && seen.digest !== digest) {
      // Fan-out means N delivery files carry one act and the copies are
      // byte-identical — that is what moving `to` out of the hashed body bought.
      // Two copies under one id that disagree is therefore a discrepancy inside
      // this store, and §7.3 says a store must not let its own discrepancy reach
      // a record as a verdict. Taking whichever `readdir` returned last would do
      // exactly that, silently and non-deterministically.
      throw new StoreCorruption(cns.id);
    }
    out.set(cns.id, { bytes, digest });
  }
  return out;
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `bun run test tests/relay-lite-roundtrip.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the conformance report**

```ts
/**
 * Which of relay-lite v0.12's claims this implementation satisfies, by clause.
 *
 * The suite proves the behaviour; this says what the behaviour amounts to
 * against the document, which is the artifact this exercise exists to produce.
 * Ten claims are in scope: §4's two are consumer obligations and are listed as
 * out of scope rather than omitted, so the count is legible.
 *
 *   bun run conform:relay-lite
 */
const CLAIMS = [
  { clause: "§2", text: "CNS.to is an element of the act's to[], or to[] == [\"all\"]", test: "relay-lite-cns" },
  { clause: "§2", text: "CNS.id == act.id", test: "relay-lite-cns" },
  { clause: "§3.1", text: "Producers mint canonical wire bytes per RFC 8785 (JCS) as raw UTF-8", test: "relay-lite-canonical" },
  { clause: "§3.1", text: "Acts conform to I-JSON (RFC 7493)", test: "relay-lite-canonical" },
  { clause: "§3.2", text: "An act is sealed at creation", test: "relay-lite-act" },
  { clause: "§3.2", text: "Publishers MUST NOT re-tick the HLC when retrying an existing id", test: "relay-lite-act" },
  { clause: "§7.1", text: "A verifier MUST NOT parse, normalize or re-serialize when computing a digest", test: "relay-lite-verify" },
  { clause: "§7.2", text: "A citation carries both handles, the locator and the digest", test: "relay-lite-verify" },
  { clause: "§7.3", text: "A store guarantees digest == SHA-256(octets)", test: "relay-lite-verify" },
  { clause: "§7.3", text: "A discrepancy raises STORE_CORRUPTION and MUST NOT surface as DIVERGES", test: "relay-lite-verify" },
  { clause: "§4", text: "The protocol and storage model treat the graph as a DAG, a partial order", test: "relay-lite-roundtrip" },
] as const;

const OUT_OF_SCOPE = [
  { clause: "§4", text: "A consumer MUST NOT present a linear projection as the causal history" },
] as const;

console.log("relay-lite v0.12 — claims in scope\n");
for (const c of CLAIMS) {
  console.log(`  ${c.clause.padEnd(6)} ${c.text}`);
  console.log(`  ${"".padEnd(6)} covered by tests/${c.test}.test.ts\n`);
}
console.log("out of scope — consumer obligations, not dischargeable by a store\n");
for (const c of OUT_OF_SCOPE) console.log(`  ${c.clause.padEnd(6)} ${c.text}`);
console.log(`\n${CLAIMS.length} of ${CLAIMS.length + OUT_OF_SCOPE.length} claims implemented here.`);
console.log("The one left is a consumer's: a store cannot satisfy it on a reader's behalf.");
```

- [ ] **Step 6: Run the whole suite and the report**

```bash
bun run test
bun run conform:relay-lite
bun run typecheck && bun run lint
```

Expected: every test passes, the report lists eleven claims in scope and one out of it.

- [ ] **Step 7: Commit**

```bash
git add src/relay-lite/index.ts scripts/relay-lite-conformance.ts tests/relay-lite-roundtrip.test.ts package.json
git commit -m "feat(relay-lite): assembly, a round trip, and a conformance report

readDelivered returns one entry per act rather than per file: fan-out means N
delivery files carry one act, section 4 requires a consumer to deduplicate by id
before anything else, and the copies are byte-identical because moving to out of
the hashed body is what bought that.

The conformance report says which of the document's claims this satisfies, by
clause. The suite proves the behaviour; the report says what the behaviour
amounts to against the specification, which is the artifact this exercise exists
to produce. Section 4's two claims are listed as out of scope rather than
omitted, so the count is legible."
```

---

## After the plan

Four things follow and none is in it.

**A correction to the design document.** `2026-09-01-relay-lite-store-design.md`
carries the scope boundary this plan has since had to fix — it puts both of §4's
claims out of scope, where the first names the *storage model* and belongs to a
store. It also justifies writing JCS by arguing that a dependency chosen without
checking inherits relay-ui's error, which argues for **checking** a dependency
rather than for writing one; the real reason is that this project takes no
runtime dependency it can avoid, which is a policy and not a deduction. Both
were raised in `relay-0742` and conceded in `relay-0743`. The design is merged,
so this is its own change rather than an edit here.



**File an erratum against the spec.** §3.3 says nothing about where the HLC's
`l` and `c` live between restarts, so a node restarting after a backwards clock
step can emit a tuple it already emitted. `hlc.ts` records it in its docstring;
it belongs in #19 as a fourth item, and the record should be a relay record
rather than an edit to the draft.

**A second erratum, found while checking this plan against the spec.** §5
describes what `ruled_by` records — *"attribution of epistemic responsibility,
not a delegated mandate ... it names who made the judgment call, so a later
reader knows whom to distrust"* — and `ruled_by` occurs exactly once in the
entire document, in that sentence. The `RelayAct` interface never declares it,
so no conforming implementation has the field the section is about.

The case it exists for is real and this project has an instance: `relay-0174` is
`from: claude` and its text is *"bee.zae has ruled"*. The author reports and
someone else decided, `type: "ruling"` says an act is a ruling while `from` says
only who wrote it, and the field that would carry the difference is not in the
interface. Fifth item for #19.

**The bench run for crash durability.** `dm-log-writes` on a loop device,
verifying that a directory entry survives a replay to a point after `link` and
before the process would have continued. Needs root, does not automate, and is
what check 12 in the design deliberately does not claim to cover.
