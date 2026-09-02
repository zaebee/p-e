import { describe, expect, it } from "vitest";
import {
  IJsonViolation,
  assertIJsonValue,
  canonicalize,
  parseIJson,
  sha256Hex,
} from "../src/relay-lite/canonical.js";

describe("canonicalize — RFC 8785 (JCS)", () => {
  it("sorts by UTF-16 code unit, not by locale", () => {
    // Locked against a static-analysis suggestion to sort with `localeCompare`.
    // JCS names the code-unit ordering, and `localeCompare` is locale-dependent:
    // sv-SE orders these `a B z Z ä ø` while en-US gives `a ä B ø z Z`. Taking
    // that suggestion would make an act's digest depend on the machine that
    // canonicalized it, which is the one thing a digest may never do.
    expect(canonicalize({ z: 1, ä: 1, B: 1, a: 1, ø: 1, Z: 1 })).toBe(
      '{"B":1,"Z":1,"a":1,"z":1,"ä":1,"ø":1}',
    );
  });

  // §3.1: "Producers mint canonical wire bytes per RFC 8785 (JCS) encoded as raw UTF-8."
  it("sorts object keys by UTF-16 code unit", () => {
    expect(canonicalize({ b: 1, a: 2, C: 3 })).toBe('{"C":3,"a":2,"b":1}');
  });

  it("formats numbers as ECMAScript does, which is what JCS requires", () => {
    expect(canonicalize({ n: -0 })).toBe('{"n":0}');
    expect(canonicalize({ n: 1.0 })).toBe('{"n":1}');
    expect(canonicalize({ n: 0.1 })).toBe('{"n":0.1}');
    expect(canonicalize({ n: 9007199254740991 })).toBe('{"n":9007199254740991}');
  });

  it("enforces its own precondition rather than trusting the caller", () => {
    // `canonicalize` is exported, so the precondition cannot live in a docstring:
    // an unpaired surrogate reaching Node's encoder becomes U+FFFD, and these two
    // distinct objects produced identical bytes and identical digests.
    expect(() => canonicalize({ "\ud800": 1 })).toThrow(IJsonViolation);
    expect(() => canonicalize({ t: "\udc00" })).toThrow(IJsonViolation);
  });

  it("refuses the out-of-domain number it used to format", () => {
    // This case asserted `{"n":1e+21}` until `canonicalize` began enforcing its
    // own precondition. JCS does specify that formatting, but 1e21 is outside
    // the safe range, so no conforming act can carry it: the assertion was
    // documenting behaviour on a value the protocol does not admit.
    expect(() => canonicalize({ n: 1e21 })).toThrow(IJsonViolation);
  });

  it("emits non-ASCII as literal UTF-8, never as an escape", () => {
    expect(canonicalize({ t: "не репарируем" })).toBe('{"t":"не репарируем"}');
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
      assertIJsonValue({ n: Number.MAX_SAFE_INTEGER + 2 });
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

  it("refuses an unpaired surrogate in a key, not only in a value", () => {
    expect(() => assertIJsonValue({ "\ud800": 1 })).toThrow(IJsonViolation);
  });

  it("refuses the two keys that canonicalized to one digest", () => {
    // Regression, and the reason the key check is not cosmetic. Node's UTF-8
    // encoder maps every unpaired surrogate to U+FFFD, so these two distinct
    // objects produced the same nine bytes — `7b 22 ef bf bd 22 3a 31 7d` —
    // and therefore the same sha256. The guard is what keeps the collision
    // unreachable, so the test asserts the refusal, not the equality.
    expect(() => assertIJsonValue({ "\ud800": 1 })).toThrow(IJsonViolation);
    expect(() => assertIJsonValue({ "\ud801": 1 })).toThrow(IJsonViolation);
  });

  it("admits a key whose surrogates are paired", () => {
    expect(() => assertIJsonValue({ "\ud83d\udc1d": 1 })).not.toThrow();
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
  it("refuses a number the parse would round onto a legal value", () => {
    // The range check cannot reach these. `…993` is caught because rounding
    // leaves it above the safe range; `…991.1` rounds *down* onto the boundary
    // and `0.1000000000000000055511` rounds to `0.1`. Both land on a value that
    // passes every check, and neither is the value that was sent.
    expect(() => parseIJson('{"n":9007199254740991.1}')).toThrow(IJsonViolation);
    expect(() => parseIJson('{"n":0.1000000000000000055511}')).toThrow(IJsonViolation);
  });

  it("admits a number that survives the parse exactly", () => {
    expect(parseIJson('{"n":1.0000000000000002}')).toEqual({ n: 1.0000000000000002 });
    expect(parseIJson('{"n":-0.5}')).toEqual({ n: -0.5 });
    expect(parseIJson('{"n":1e2}')).toEqual({ n: 100 });
  });

  it("names the digits that were sent, not the ones we parsed", () => {
    // A message reporting `9007199254740992` would describe our rounding rather
    // than their act, and the sender could not find that value in what they sent.
    expect(() => parseIJson('{"n":9007199254740993}')).toThrow(/9007199254740993/);
  });

  it("terminates on exponents built to overflow the exactness check", () => {
    // A huge positive exponent reaches `Infinity` and is refused before the
    // decimal comparison runs; a huge negative one reaches zero, where the
    // mantissa test returns early. Neither builds the enormous BigInt that a
    // naive reading of the comparison suggests — the exponent that survives to
    // the shift is bounded by the length of the token carrying it.
    for (const t of [
      '{"n":1e99999999999999999999}',
      '{"n":1e-99999999999999999999}',
      '{"n":1e400}',
      '{"n":1e-400}',
    ]) {
      expect(() => parseIJson(t)).toThrow(IJsonViolation);
    }
    // Legitimate despite a large exponent: the zeros pay for it exactly.
    expect(parseIJson(`{"n":0.${"0".repeat(500)}1e500}`)).toEqual({ n: 0.1 });
  });

  it("does not mistake a number inside a string for a number", () => {
    expect(parseIJson('{"n":"9007199254740991.1"}')).toEqual({ n: "9007199254740991.1" });
  });

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
    // A literal here would lose precision before the parser saw it, which is
    // the opposite of the case: the text is what carries the out-of-range value.
    expect(() => parseIJson('{"n":9007199254740993}')).toThrow(IJsonViolation);
  });

  it("admits well-formed text and returns the value", () => {
    expect(parseIJson('{"a":1,"b":"x"}')).toEqual({ a: 1, b: "x" });
  });
});

describe("round-trip stability, over generated values", () => {
  // The property a canonicalizer exists to have: text that has been through the
  // store and back must canonicalize to the same bytes, or a record's digest
  // would depend on how many times it had been read. Seeded, so a failure is
  // reproducible rather than a story about a run nobody has.
  const NL = String.fromCharCode(10);
  const BEE = String.fromCodePoint(0x1f41d);
  const keys = ["a", "b", "ключ", "x y", "", BEE, "A", " ", "zz", "Z", "a"];
  const leaves: unknown[] = [
    "",
    "ok",
    "ключ",
    'a"b',
    "\\",
    NL,
    " ",
    BEE,
    0,
    -0,
    1,
    -1,
    1.5,
    0.1,
    100,
    9007199254740991,
    -9007199254740991,
    1.0000000000000002,
    5e-324,
    true,
    false,
    null,
  ];

  it("canonicalize, parse, canonicalize gives the same bytes and digest", () => {
    let seed = 987654321;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const pick = <T>(a: T[]): T => a[Math.floor(rnd() * a.length)] as T;
    const gen = (d: number): unknown => {
      const r = rnd();
      if (d > 4 || r < 0.4) return pick(leaves);
      if (r < 0.7) return Array.from({ length: Math.floor(rnd() * 5) }, () => gen(d + 1));
      const o: Record<string, unknown> = {};
      for (let i = 0, n = Math.floor(rnd() * 5); i < n; i++) o[pick(keys)] = gen(d + 1);
      return o;
    };

    for (let i = 0; i < 2000; i++) {
      const first = canonicalize(gen(0));
      const second = canonicalize(parseIJson(first));
      expect(second).toBe(first);
      expect(sha256Hex(second)).toBe(sha256Hex(first));
      // And the canonical form is a fixed point of itself.
      expect(canonicalize(JSON.parse(first))).toBe(first);
    }
  });
});
