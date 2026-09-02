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
    //
    // Asserted unconditionally. The plan guarded this with `if (reordered !==
    // parent.bytes)`, which is a test that stops running the day mint's
    // insertion order happens to match canonical order — silently, and exactly
    // when the case it covers gets easier to break.
    const reordered = JSON.stringify(parent.act);
    expect(reordered).not.toBe(parent.bytes);
    const r = stage2(reordered, formatCns(parent.act, "agent:mimo"));
    expect(r).toMatchObject({ ok: false, reason: "not-canonical" });
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

describe("what stage 2 looks at, enumerated", () => {
  const name = formatCns(parent.act, "agent:mimo");

  it("refuses an act missing any field §3 declares", () => {
    // `isRelayAct` checks the whole shape, and nothing pinned that. A partial
    // check is one that admits what it did not look at — and the state it would
    // have produced downstream is `UNCHECKABLE`, which means "this reader lacks
    // the parent", reported about something that was never an act.
    for (const field of ["id", "thread_id", "type", "from", "to", "hlc", "payload"]) {
      const a = { ...parent.act } as Record<string, unknown>;
      delete a[field];
      expect(stage2(canonicalize(a), name)).toEqual({ ok: false, reason: "not-an-act" });
    }
  });

  it("refuses an hlc that is not the tuple §3.3 declares", () => {
    for (const hlc of [
      { l: 1, c: 0 },
      { l: 1, node_id: "n" },
      { l: "1", c: 0, node_id: "n" },
      null,
    ]) {
      const a = { ...parent.act, hlc };
      expect(stage2(canonicalize(a), name)).toEqual({ ok: false, reason: "not-an-act" });
    }
  });

  it("refuses a type outside §3's union", () => {
    const a = { ...parent.act, type: "gossip" };
    expect(stage2(canonicalize(a), name)).toEqual({ ok: false, reason: "not-an-act" });
  });

  it("refuses a name that is not a delivery name, before reading the bytes", () => {
    for (const bad of ["notes.txt", "", "to=a;from=b.json"]) {
      expect(stage2(parent.bytes, bad)).toEqual({ ok: false, reason: "not-a-delivery-name" });
    }
  });

  it("ADMITS a field §3 does not declare — see issue #39", () => {
    // Recorded as behaviour, not endorsed. §3 declares nine fields and the spec
    // never says whether the envelope is closed. Admitting means an unknown
    // field is digested, republished and never validated by anything; refusing
    // means a later version adding a field cannot be read by today's verifiers.
    // Either is defensible and the spec picks neither, so this test states what
    // this implementation does and will fail if that changes silently.
    const forged = canonicalize({ ...parent.act, surprise: 1 });
    expect(stage2(forged, name).ok).toBe(true);
  });
});

describe("the three stages are separable, which is why there are three", () => {
  it("lets stage 3 be called on what stage 2 would refuse", () => {
    // The module's stated reason for three functions rather than one with
    // phases: §7.1's ordering is normative, and only separable functions let a
    // test call them out of order and see the difference. Nothing asserted it.
    const held = holding(parent);
    const rejected = JSON.parse(
      canonicalize({ ...parent.act, type: "gossip" }),
    ) as typeof parent.act;

    expect(stage2(canonicalize(rejected), formatCns(parent.act, "agent:mimo")).ok).toBe(false);
    // Stage 3 still answers, because it is total by §7.1 and because an auditor
    // sweeping records that did not come through this pipeline needs a report
    // rather than an abort.
    expect(stage3(rejected, held)).toBe("NO_PARENT");
  });

  it("hashes bytes stage 2 would refuse, because stage 1 does not parse", () => {
    // §7.1: "Compute act_digest = SHA-256(raw_received_bytes). No parsing, no
    // normalization." A stage that refused malformed bytes would be parsing.
    expect(stage1("not json at all").digest).toBe(sha256Hex("not json at all"));
    expect(stage1("").digest).toBe(sha256Hex(""));
  });
});

describe("§7.3 store corruption names the record it found", () => {
  it("carries the locator, so a sweep can say which record", () => {
    const corrupt = new Map<string, StoredAct>([
      [parent.act.id, { bytes: parent.bytes, digest: "0".repeat(64) }],
    ]);
    try {
      stage3(child.act, corrupt);
      expect.unreachable("stage3 should have raised StoreCorruption");
    } catch (error) {
      expect(error).toBeInstanceOf(StoreCorruption);
      expect((error as StoreCorruption).locator).toBe(parent.act.id);
    }
  });
});
