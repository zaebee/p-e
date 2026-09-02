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
        // Both characters, kept escaped: `JSON.parse` below turns the pair back
        // into the character it denotes. `ch` is known here and the next may be
        // absent at the end of a truncated string, which `?? ""` carries into
        // the parse rather than into a silent `"undefined"`.
        out += ch + (text[i + 1] ?? "");
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
