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
    // A literal here would lose precision before the parser saw it, which is
    // the opposite of the case: the text is what carries the out-of-range value.
    expect(() => parseIJson('{"n":9007199254740993}')).toThrow(IJsonViolation);
  });

  it("admits well-formed text and returns the value", () => {
    expect(parseIJson('{"a":1,"b":"x"}')).toEqual({ a: 1, b: "x" });
  });
});
