import { readFileSync } from "node:fs";
import { decodeAbiParameters, encodeAbiParameters } from "viem";
import { describe, expect, it } from "vitest";
import {
  CLAIM_TYPES,
  FIELD,
  decodeClaimData,
  fastDecodeClaimData,
} from "../src/checks/claim-schema.js";

/** A distinct encoded claim per `pr`, so every payload is a different key. */
function claim(pr: number): `0x${string}` {
  return encodeAbiParameters(CLAIM_TYPES, [
    `0x${"11".repeat(32)}`,
    "owner/repo",
    pr,
    "0".repeat(40),
    "src/file.ts",
    1,
    "correctness",
    "high",
    90,
    1,
    3,
    `0x${"22".repeat(32)}`,
  ]);
}

describe("decodeClaimData", () => {
  it("returns the same decode for the same data", () => {
    const data = claim(1);
    expect(decodeClaimData(data)).toBe(decodeClaimData(data));
  });

  it("refuses a write to the shared decode rather than poisoning the cache", () => {
    const decoded = decodeClaimData(claim(2)) as unknown[];
    expect(() => {
      decoded[FIELD.verdict] = 99;
    }).toThrow(TypeError);
    expect(decodeClaimData(claim(2))[FIELD.verdict]).toBe(1);
  });

  it("still holds the first payload after a scan longer than any cap", () => {
    // i1 and i4 each walk the attestations in the same order, so an evicting
    // cache smaller than the scan drops every entry just before the second
    // walk wants it: 100% hits become 0%, and nothing else in the run changes
    // to say so. 3000 is past the 2048-entry cap this cache used to carry.
    const first = decodeClaimData(claim(100_000));
    for (let pr = 100_001; pr < 103_000; pr++) decodeClaimData(claim(pr));
    expect(decodeClaimData(claim(100_000))).toBe(first);
  });
});

/** Either the decode or the fact that there was none — never a half of each. */
function outcome(decode: () => readonly unknown[]): { ok: boolean; value?: readonly unknown[] } {
  try {
    return { ok: true, value: [...decode()] };
  } catch {
    return { ok: false };
  }
}

/** The whole contract of the fast path: nothing about a decode may depend on which decoder ran. */
function expectSameAsViem(data: string): void {
  const hex = data as `0x${string}`;
  expect(
    outcome(() => decodeClaimData(hex)),
    data,
  ).toEqual(outcome(() => decodeAbiParameters(CLAIM_TYPES, hex)));
}

function claimWith(strings: { repo?: string; file?: string; severity?: string }): `0x${string}` {
  return encodeAbiParameters(CLAIM_TYPES, [
    `0x${"ab".repeat(32)}`,
    strings.repo ?? "owner/repo",
    7,
    "0".repeat(40),
    strings.file ?? "src/file.ts",
    1,
    "correctness",
    strings.severity ?? "high",
    90,
    1,
    3,
    `0x${"cd".repeat(32)}`,
  ]);
}

const word = (n: bigint) => n.toString(16).padStart(64, "0");
const setWord = (data: string, i: number, w: string) =>
  `${data.slice(0, 2 + i * 64)}${w}${data.slice(2 + (i + 1) * 64)}`;

describe("the fast path against viem", () => {
  const corpus = (
    JSON.parse(readFileSync("corpus/hivemark/attestations.json", "utf8")) as {
      attestation: { message: { data: `0x${string}` } };
    }[]
  ).map((e) => e.attestation.message.data);

  it("takes every published claim, and decodes each as viem does", () => {
    // Both halves matter. A fast path that declined the corpus would still be
    // correct — the fallback is viem — and the whole win would be gone with no
    // line of the report changing to say so.
    expect(corpus.length).toBeGreaterThan(900);
    for (const data of corpus) {
      expect(fastDecodeClaimData(data), data).toEqual(decodeAbiParameters(CLAIM_TYPES, data));
    }
  });

  it("refuses what viem refuses", () => {
    // i1 and i4 count a record as undecodable only when the decode throws, and
    // the verdict turns UNDECIDABLE on that count. A decoder that returns
    // something for these turns a damaged record into a judged one.
    const good = claimWith({});
    const refused = [
      good.slice(0, -64), // the tail cut by a word
      good.slice(0, 2 + 12 * 64), // the static head alone
      setWord(good, FIELD.verdict, "z".repeat(64)), // not hex, in a number
      setWord(good, FIELD.repo, word(100_000n)), // a string offset past the end
      `${good.slice(0, 2 + 12 * 64)}${word(10_000n)}${good.slice(2 + 13 * 64)}`, // a string longer than the data
      `${good.slice(0, 2 + 13 * 64)}zzzz${good.slice(2 + 13 * 64 + 4)}`, // not hex, in a string
      good.slice(0, -1), // a nibble short
      setWord(good, FIELD.pr, word(2n ** 53n)), // a number no double holds
      setWord(good, FIELD.repo, word(BigInt((good.length - 2) / 2 - 32))), // the last word, read as a length
      setWord(good, FIELD.repo, word(BigInt((good.length - 2) / 2 - 31))), // a length word one byte over the end
      "0x",
    ];
    for (const data of refused) {
      expect(() => decodeAbiParameters(CLAIM_TYPES, data as `0x${string}`), data).toThrow();
      expect(() => decodeClaimData(data as `0x${string}`), data).toThrow();
    }
  });

  it("reads what viem reads where the two could plausibly differ", () => {
    const good = claimWith({});
    const accepted = [
      claimWith({ repo: "" }),
      claimWith({ repo: "﻿owner/repo" }), // TextDecoder drops a leading BOM; Buffer#toString keeps it
      claimWith({ file: "src/\u0000file.ts\u0000\u0000", severity: "\u0000" }),
      claimWith({ file: "каталог/файл-✓-𝄞.ts", repo: "x".repeat(1000) }),
      `${good.slice(0, 2 + 13 * 64)}ff80c3${good.slice(2 + 13 * 64 + 6)}`, // ill-formed UTF-8
      setWord(good, FIELD.identityId, "AB".repeat(32)), // viem lowercases; i4 groups on this field
      good.toUpperCase().replace("0X", "0x"),
      setWord(good, FIELD.verdict, `${"0".repeat(60)}0101`), // wider than its uint8
      setWord(good, FIELD.pr, word(2n ** 48n)),
      setWord(good, FIELD.pr, word(2n ** 53n - 1n)),
      setWord(good, FIELD.repo, word(32n)), // an offset back into the head
      setWord(`${good}${word(0n)}`, FIELD.repo, word(BigInt((good.length - 2) / 2))), // an empty string in the last word
      `${good}${"ff".repeat(32)}`,
    ];
    for (const data of accepted) {
      expect(() => decodeAbiParameters(CLAIM_TYPES, data as `0x${string}`), data).not.toThrow();
      expectSameAsViem(data);
    }
  });

  it("draws each boundary on the byte viem draws it", () => {
    // A bound one byte generous reads a string, or a length, that is not all
    // there. Each pair is the last input viem takes and the first it does not.
    const good = claimWith({});
    const bytes = (good.length - 2) / 2;
    const cut = (data: string, to: number) => data.slice(0, 2 + to * 2);

    // The end of a string: `severity` is the last one, four bytes of "high".
    const endOfText = bytes - 32 + 4;
    // The end of a length word: an empty string whose length is the last word.
    const emptyLast = setWord(`${good}${word(0n)}`, FIELD.repo, word(BigInt(bytes)));
    // The end of the head: every string empty, read off a zero word inside it.
    let headOnly: string = setWord(good, FIELD.line, word(0n));
    for (const at of [FIELD.repo, FIELD.commitSha, FIELD.file, FIELD.category, FIELD.severity]) {
      headOnly = setWord(headOnly, at, word(BigInt(FIELD.line * 32)));
    }

    const pairs: [string, string][] = [
      [cut(good, endOfText), cut(good, endOfText - 1)],
      [emptyLast, cut(emptyLast, bytes + 31)],
      [cut(headOnly, 12 * 32), cut(headOnly, 12 * 32 - 1)],
    ];
    for (const [taken, refused] of pairs) {
      expect(fastDecodeClaimData(taken), taken).toEqual(
        decodeAbiParameters(CLAIM_TYPES, taken as `0x${string}`),
      );
      expect(() => decodeAbiParameters(CLAIM_TYPES, refused as `0x${string}`), refused).toThrow();
      expect(() => decodeClaimData(refused as `0x${string}`), refused).toThrow();
    }
  });

  it("agrees with viem on ten thousand damaged claims", () => {
    // Seeded, so a failure names an input that fails again tomorrow.
    let seed = 0x9e3779b9;
    const rand = (n: number) => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return (((t ^ (t >>> 14)) >>> 0) % n) | 0;
    };
    const pick = <T>(from: readonly T[]): T => from[rand(from.length)] as T;
    const sources: string[] = [claimWith({}), claimWith({ repo: "" }), ...corpus.slice(0, 20)];
    const chars = [..."0123456789abcdefABCDEFgz "];
    let refusals = 0;
    for (let i = 0; i < 10_000; i++) {
      let data = pick(sources);
      for (let edits = 1 + rand(3); edits > 0; edits--) {
        const bytes = Math.floor((data.length - 2) / 2);
        const words = Math.max(1, Math.floor(bytes / 32));
        const interesting = [
          0n,
          1n,
          31n,
          32n,
          383n,
          384n,
          BigInt(Math.max(0, bytes - 33)),
          BigInt(Math.max(0, bytes - 32)),
          BigInt(Math.max(0, bytes - 31)),
          BigInt(bytes),
          2n ** 48n - 1n,
          2n ** 53n,
          2n ** 256n - 1n,
        ];
        switch (rand(6)) {
          case 0: // one character
            {
              const at = 2 + rand(data.length - 2);
              data = `${data.slice(0, at)}${pick(chars)}${data.slice(at + 1)}`;
            }
            break;
          case 1: // cut anywhere
            data = data.slice(0, 2 + rand(data.length - 1));
            break;
          case 2: // a head word pointed somewhere pointed
            data = setWord(data, rand(12), word(pick(interesting)));
            break;
          case 3: // any word, same treatment — this is where the string lengths live
            data = setWord(data, rand(words), word(pick(interesting)));
            break;
          case 4: // a head word a few bytes off where it was
            {
              const at = rand(12);
              const held = data.slice(2 + at * 64, 2 + (at + 1) * 64);
              const moved =
                (/^[0-9a-f]+$/i.test(held) ? BigInt(`0x${held}`) : 0n) + BigInt(rand(65) - 32);
              data = setWord(data, at, word(moved < 0n ? 0n : moved));
            }
            break;
          default: // grown by a fragment
            data = `${data}${"0f".repeat(rand(40))}${rand(2) ? "a" : ""}`;
        }
      }
      const expected = outcome(() => decodeAbiParameters(CLAIM_TYPES, data as `0x${string}`));
      if (!expected.ok) refusals++;
      expect(
        outcome(() => decodeClaimData(data as `0x${string}`)),
        data,
      ).toEqual(expected);
    }
    // A fuzzer whose every input decodes, or none, has tested one branch.
    expect(refusals).toBeGreaterThan(1000);
    expect(refusals).toBeLessThan(9000);
  });
});
