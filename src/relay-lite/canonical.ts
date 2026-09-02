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
 * gives. Negative zero is the one case needing a hand: JCS emits `0`, `String(-0)`
 * agrees, and `Object.is` is the only way to tell the two zeros apart.
 *
 * The exponential forms `Number::toString` can produce are unreachable here —
 * they start at 1e21, and the safe range stops three orders below that.
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
    if (ch === '"') out += String.raw`\"`;
    else if (ch === "\\") out += String.raw`\\`;
    else if (ch === "\b") out += String.raw`\b`;
    else if (ch === "\f") out += String.raw`\f`;
    else if (ch === "\n") out += String.raw`\n`;
    else if (ch === "\r") out += String.raw`\r`;
    else if (ch === "\t") out += String.raw`\t`;
    else if (code < 0x20) out += `\\u${code.toString(16).padStart(4, "0")}`;
    else out += ch;
  }
  return `${out}"`;
}

/**
 * Serialize a value to its RFC 8785 canonical form.
 *
 * Precondition: `value` has passed `assertIJsonValue`, or came from
 * `parseIJson`. This function does not re-validate, and it is not safe to call
 * on unvalidated input: an unpaired surrogate reaches Node's UTF-8 encoder,
 * which substitutes U+FFFD, so `{"\ud800":1}` and `{"\ud801":1}` both serialize
 * to the same bytes and hash to the same digest. Distinct values must not share
 * a digest — that is the whole contract — so the guard belongs in front of
 * every call, not somewhere in the caller's history.
 */
export function canonicalize(value: unknown): string {
  assertIJsonValue(value);
  return emit(value);
}

/**
 * The recursive half, after the domain is known good.
 *
 * Split from `canonicalize` so the check runs once over the value rather than
 * once per node on the way down. Validating inside the recursion would re-walk
 * every subtree at every level it appears under.
 */
function emit(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return num(value);
  if (typeof value === "string") return str(value);
  if (Array.isArray(value)) return `[${value.map(emit).join(",")}]`;
  if (typeof value === "object") {
    // Sorted by UTF-16 code unit, which is what sorting strings does in
    // JavaScript. Not by code point: the two differ above the BMP, and JCS
    // names the code-unit ordering.
    const keys = Object.keys(value as object).sort();
    const pairs = keys.map((k) => `${str(k)}:${emit((value as Record<string, unknown>)[k])}`);
    return `{${pairs.join(",")}}`;
  }
  throw new IJsonViolation("invalid-string", `not representable in JSON: ${typeof value}`);
}

/**
 * Refuse a string that has no UTF-8 encoding.
 *
 * A lone surrogate is a well-formed JS string and an ill-formed Unicode one.
 * Encoders do not agree on what to do with it and Node's substitutes U+FFFD,
 * which turns distinct inputs into identical bytes. `where` names the position
 * so a refusal points at the member name rather than at some value inside it.
 */
function assertWellFormed(value: string, where: "string" | "key"): void {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    const isHigh = code >= 0xd800 && code <= 0xdbff;
    const isLow = code >= 0xdc00 && code <= 0xdfff;
    if (isHigh) {
      const next = value.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new IJsonViolation("invalid-string", `unpaired high surrogate in ${where}`);
      }
      i++;
    } else if (isLow) {
      throw new IJsonViolation("invalid-string", `unpaired low surrogate in ${where}`);
    }
  }
}

/** The domain check a producer runs against a value it already holds. */
export function assertIJsonValue(value: unknown): void {
  if (typeof value === "number") {
    assertSafeNumber(value);
    return;
  }
  if (typeof value === "string") {
    assertWellFormed(value, "string");
    return;
  }
  if (value === null || typeof value === "boolean") return;
  if (Array.isArray(value)) {
    for (const v of value) assertIJsonValue(v);
    return;
  }
  if (typeof value === "object") {
    assertPlainObject(value);
    // Keys, not only values. RFC 7493 §2.1 constrains member names the same way
    // it constrains strings, and skipping them was not cosmetic: Node's UTF-8
    // encoder replaces an unpaired surrogate with U+FFFD, so `{"\ud800":1}` and
    // `{"\ud801":1}` canonicalized to the same nine bytes and hashed to the same
    // digest. Two distinct objects, one digest — a collision in the one function
    // whose whole purpose is to give distinct values distinct bytes.
    for (const [k, v] of Object.entries(value as object)) {
      assertWellFormed(k, "key");
      assertIJsonValue(v);
    }
    return;
  }
  // Everything else — undefined, symbol, function, bigint — has no JSON form.
  // Falling through silently made this validator admit what `canonicalize`
  // refuses a moment later, which is a check asserting more than it verified.
  throw new IJsonViolation("unsupported-type", `no JSON representation: ${typeof value}`);
}

/** RFC 7493 §2.2, against a value whose digits the parse has already spent. */
function assertSafeNumber(value: number): void {
  if (!Number.isFinite(value)) {
    throw new IJsonViolation("number-range", `not a finite number: ${String(value)}`);
  }
  // An integer past 2^53 stays past it after rounding, because doubles hold
  // every integer to 2^53 exactly and anything above rounds no smaller. So this
  // catches the violation even though the original digits are gone.
  //
  // No `Number.isInteger` guard: every finite double above 2^52 is integral, so
  // the guard excluded nothing and only made a reader wonder which non-integer
  // case it was for. RFC 7493 §2.2 constrains numbers, not integers, and this
  // now says that. What it cannot reach is a fraction that rounds onto a legal
  // value — `assertNumberTokenExact` covers that, from the text.
  if (Math.abs(value) > MAX_SAFE) {
    throw new IJsonViolation(
      "number-range",
      `integer outside the safe range, encode it as a string: ${value}`,
    );
  }
}

/**
 * Refuse anything whose `typeof` says "object" but whose shape is not one.
 *
 * `typeof` says it for Date, Map, Set, RegExp and every class instance, and
 * `Object.values` on all of them is `[]` — so these passed and `canonicalize`
 * turned each into `{}`. Silent corruption, not a refusal: a caller who checked
 * their value with `JSON.stringify` would have seen an ISO date and received an
 * empty object from us.
 */
function assertPlainObject(value: object): void {
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new IJsonViolation(
      "unsupported-type",
      `only plain objects: ${value.constructor?.name ?? "unknown"}`,
    );
  }
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
  refuseTextOnlyViolations(text);
  const value = JSON.parse(text) as unknown;
  assertIJsonValue(value);
  return value;
}

/**
 * Decide whether two decimal literals denote the same number, exactly.
 *
 * Both sides are decimal, so this needs no float arithmetic: align the two
 * mantissas to a common power of ten and compare them as integers. Comparing
 * with `Number` instead would ask the very rounding under test to judge itself.
 */
function sameDecimalValue(a: string, b: string): boolean {
  const parse = (t: string): { neg: boolean; mant: bigint; e10: number } => {
    const m = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(t);
    if (m === null) throw new IJsonViolation("number-range", `not a JSON number: ${t}`);
    const [, sign, int, frac = "", exp = "0"] = m;
    return {
      neg: sign === "-",
      mant: BigInt(int + frac),
      e10: Number(exp) - frac.length,
    };
  };
  const x = parse(a);
  const y = parse(b);
  // Zero is zero at every exponent, and `-0` canonicalizes to `0` anyway, so
  // sign carries no information once the mantissa is empty.
  if (x.mant === 0n || y.mant === 0n) return x.mant === y.mant;
  if (x.neg !== y.neg) return false;
  const shift = (v: { mant: bigint; e10: number }, to: number): bigint =>
    v.mant * 10n ** BigInt(v.e10 - to);
  const low = Math.min(x.e10, y.e10);
  return shift(x, low) === shift(y, low);
}

/**
 * Refuse a number the parse would silently alter.
 *
 * `String(v)` is the shortest decimal that round-trips to `v`, so it denotes
 * `v` exactly. The token therefore survived the parse if and only if it denotes
 * the same value as `String(v)` — and if it does not, the digest would cover a
 * number nobody sent, which §3.1 of the spec forbids by name.
 *
 * This is what the integer range check cannot reach. `9007199254740993` is
 * caught because rounding leaves it above the safe range, but
 * `9007199254740991.1` rounds *down* onto the boundary and `0.1000000000000000055511`
 * rounds to `0.1`; both land on a legal value and neither is the value sent.
 */
function assertNumberTokenExact(token: string): void {
  const v = Number(token);
  if (!Number.isFinite(v)) {
    throw new IJsonViolation("number-range", `not a finite number: ${token}`);
  }
  if (Math.abs(v) > MAX_SAFE) {
    throw new IJsonViolation(
      "number-range",
      `integer outside the safe range, encode it as a string: ${token}`,
    );
  }
  if (!sameDecimalValue(token, String(v))) {
    throw new IJsonViolation(
      "number-range",
      `number altered by parsing, it denotes ${String(v)}: ${token}`,
    );
  }
}

/**
 * Index just past the number token starting at `from`.
 *
 * Char codes rather than `text[i]`, which allocates a one-character string per
 * character scanned. That allocation, not the validation, was what made this
 * scan cost four times a plain `JSON.parse` of the same text.
 *
 * Deliberately loose: it collects the characters a JSON number can contain and
 * lets `assertNumberTokenExact` judge the result, so a malformed token is
 * refused by the rule that describes it rather than by a scan that stopped early.
 */
function endOfNumber(text: string, from: number): number {
  let i = from;
  while (i < text.length) {
    const c = text.charCodeAt(i);
    const isDigit = c >= 0x30 && c <= 0x39;
    const isSign = c === 0x2b || c === 0x2d;
    const isExp = c === 0x65 || c === 0x45;
    if (!(isDigit || isSign || isExp || c === 0x2e)) break;
    i++;
  }
  return i;
}

/**
 * Apply one structural character to the frame stack, and say whether a key is
 * expected next. A key is expected after `{` and after a `,` whose innermost
 * frame is an object — which is what keeps a repeated string inside an array
 * from being read as a duplicate key.
 */
function afterStructural(code: number, stack: Frame[], expectKey: boolean): boolean {
  if (code === 0x7b) {
    stack.push({ kind: "object", keys: new Set() });
    return true;
  }
  if (code === 0x5b) {
    stack.push({ kind: "array" });
    return false;
  }
  if (code === 0x7d || code === 0x5d) {
    stack.pop();
    return false;
  }
  if (code === 0x2c) return stack.at(-1)?.kind === "object";
  return expectKey;
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

function refuseTextOnlyViolations(text: string): void {
  const stack: Frame[] = [];
  let i = 0;
  let expectKey = false;

  // `isKey` is not an optimization detail. A non-key string is scanned only to
  // find where it ends, so unescaping it would build a value nothing reads —
  // and on a 1.3KB act that discarded work was most of the cost, 28 strings
  // unescaped to compare 9 keys.
  const readString = (isKey: boolean): string => {
    const open = i;
    let escaped = false;
    i++;
    while (i < text.length) {
      const c = text.charCodeAt(i);
      if (c === 0x5c) {
        escaped = true;
        i += 2;
        continue;
      }
      if (c === 0x22) {
        const close = i;
        i++;
        if (!isKey) return "";
        // Unescaped before comparison, because `"a"` and `"\u0061"` are the same
        // key after parsing and different as text. A duplicate written one of
        // each way escaped detection exactly when it was disguised. A key with
        // no escape needs none of that and is its own slice.
        return escaped
          ? (JSON.parse(text.slice(open, close + 1)) as string)
          : text.slice(open + 1, close);
      }
      i++;
    }
    throw new IJsonViolation("invalid-string", "unterminated string");
  };

  const top = (): Frame | undefined => stack.at(-1);

  while (i < text.length) {
    const c0 = text.charCodeAt(i);
    if (c0 === 0x22) {
      const frame = top();
      const isKey = expectKey && frame?.kind === "object";
      const s = readString(isKey);
      if (isKey && frame?.kind === "object") {
        if (frame.keys.has(s)) throw new IJsonViolation("duplicate-key", `duplicate key: ${s}`);
        frame.keys.add(s);
        expectKey = false;
      }
      continue;
    }
    if (c0 === 0x2d || (c0 >= 0x30 && c0 <= 0x39)) {
      // Checked here rather than after `JSON.parse`, because the parse is what
      // destroys the evidence: by the time a value exists, the digits that
      // prove it was altered are gone.
      const from = i;
      i = endOfNumber(text, i);
      assertNumberTokenExact(text.slice(from, i));
      continue;
    }
    expectKey = afterStructural(c0, stack, expectKey);
    i++;
  }
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
