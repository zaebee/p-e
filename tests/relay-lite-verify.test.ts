import { describe, expect, it } from "vitest";
import { type MintInput, mint, mintContext } from "../src/relay-lite/act.js";
import { canonicalize, sha256Hex } from "../src/relay-lite/canonical.js";
import { formatCns, parseCns } from "../src/relay-lite/cns.js";
import { HLC_START, type Hlc, ingest } from "../src/relay-lite/hlc.js";
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
    // A *well-formed* digest with no locator, which is what §7.2 calls
    // UNANCHORED — "bytes claimed for nobody". The plan's fixture used `"aa"`,
    // which is not a digest at all, so once stage 2 started checking the digest
    // format this case was refused as `not-an-act` and the unanchored rule was
    // no longer being exercised. Two different defects were sharing one test.
    const forged = canonicalize({
      ...parent.act,
      parent_id: null,
      parent_digest: parent.digest,
    });
    const r = stage2(forged, formatCns(parent.act, "agent:mimo"));
    expect(r).toMatchObject({ ok: false, reason: "unanchored" });
  });

  it("separates a malformed digest from an unanchored one", () => {
    const name = formatCns(parent.act, "agent:mimo");
    // No locator, real digest: unanchored.
    expect(
      stage2(canonicalize({ ...parent.act, parent_id: null, parent_digest: parent.digest }), name),
    ).toMatchObject({ reason: "unanchored" });
    // A locator, and something that is not a digest: not an act.
    expect(
      stage2(canonicalize({ ...parent.act, parent_id: parent.act.id, parent_digest: "aa" }), name),
    ).toMatchObject({ reason: "not-an-act" });
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
      // These were admitted. `typeof === "number"` let stage 2 call an act with
      // `hlc.l = -1` structurally conformant while `ingest` — the function that
      // would then process it — refused it as "must be a non-negative integer".
      { l: -1, c: 0, node_id: "n" },
      { l: 1000, c: -5, node_id: "n" },
      { l: 1.5, c: 0, node_id: "n" },
      { l: 1000, c: 0.5, node_id: "n" },
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

describe("the store agreeing with itself", () => {
  it("admits from, thread_id and to only if act.ts would mint them", () => {
    // Third disagreement of this shape, after the clock and the digest.
    // `from: "b;to=victim"` and `thread_id: "../../x"` were admitted here and
    // refused by both `mint` and `formatCns` — an act this store could not have
    // created and cannot republish, sitting inside it.
    const cnsName = formatCns(parent.act, "agent:mimo");
    for (const [field, value] of [
      ["from", "b;to=victim"],
      ["from", ""],
      ["thread_id", "../../x"],
      ["thread_id", "a b"],
      ["to", ["a b"]],
      ["to", [""]],
    ] as const) {
      const forged = { ...parent.act, [field]: value };
      expect(stage2(canonicalize(forged), cnsName).ok).toBe(false);
      expect(() => mint({ ...input, [field]: value } as never, mintContext("n"), 1001)).toThrow();
    }
  });

  it("refuses a name that misrepresents the sender or the thread", () => {
    // §2 makes only `CNS.to ∈ act.to[]` and `CNS.id == act.id` normative, so
    // these are beyond its enumeration — and on the same test used elsewhere in
    // this store: no conforming publisher can produce such a name, because
    // `formatCns` writes the act's own fields and nothing else.
    //
    // Anything scanning `in/` by name — which is what §2.1 puts `from=` and
    // `thread=` in the name for — read the sender the file claimed rather than
    // the one the act attests.
    const real = parseCns(formatCns(parent.act, "agent:mimo"));
    expect(real).not.toBeNull();
    const { from, thread, id } = real as NonNullable<typeof real>;

    expect(
      stage2(
        parent.bytes,
        `to=agent:mimo;from=agent:impostor;thread=${thread};ttl=0;id=${id}.json`,
      ),
    ).toEqual({ ok: false, reason: "from-mismatch" });

    expect(
      stage2(parent.bytes, `to=agent:mimo;from=${from};thread=other-thread;ttl=0;id=${id}.json`),
    ).toEqual({ ok: false, reason: "thread-mismatch" });
  });

  it("admits a parent_digest only if act.ts would mint it", () => {
    // The same shape as the clock: `act.ts` refuses a malformed
    // `parent.digest`, and stage 2 admitted one. Stage 3 then returned
    // DIVERGES, which §7.2 defines as "parent held, digest differs — author
    // defect". An unparseable digest is not a differing one, and this is the
    // #21 failure arriving from the receiving side, where the author cannot
    // answer for it.
    const cnsName = formatCns(parent.act, "agent:mimo");
    for (const digest of ["zz", "", "0".repeat(63), "A".repeat(64), `${parent.digest}0`]) {
      const forged = { ...parent.act, parent_id: parent.act.id, parent_digest: digest };
      expect(stage2(canonicalize(forged), cnsName)).toEqual({ ok: false, reason: "not-an-act" });
      expect(() =>
        mint({ ...input, parent: { id: parent.act.id, digest } }, mintContext("n"), 1002),
      ).toThrow();
    }
    // A real digest passes both.
    const good = { ...parent.act, parent_id: parent.act.id, parent_digest: parent.digest };
    expect(stage2(canonicalize(good), cnsName).ok).toBe(true);
  });

  it("admits an hlc only if hlc.ts would ingest it", () => {
    // Stage 2 decides what enters and `ingest` is what processes it next. When
    // the two disagreed, an act could be pronounced structurally conformant and
    // then refused by the module that had to act on it.
    //
    // One rule, imported from `hlc.ts`, so a change to either lands in both.
    // Same lesson as the name alphabet in `names.ts`.
    const cnsName = formatCns(parent.act, "agent:mimo");
    for (const hlc of [
      { l: 0, c: 0, node_id: "n" },
      { l: 1000, c: 7, node_id: "n" },
      { l: Number.MAX_SAFE_INTEGER, c: 0, node_id: "n" },
      { l: -1, c: 0, node_id: "n" },
      { l: 1.5, c: 0, node_id: "n" },
      { l: 1000, c: -1, node_id: "n" },
    ]) {
      const admitted = stage2(canonicalize({ ...parent.act, hlc }), cnsName).ok;
      let ingested = true;
      try {
        ingest(HLC_START, hlc as Hlc, "me", 2000);
      } catch {
        ingested = false;
      }
      expect(admitted).toBe(ingested);
    }
  });
});

// The property behind four separate findings: whatever `mint` refuses to
// create, stage 2 must refuse to admit, and whatever `mint` creates, stage 2
// must admit. Each disagreement was found singly — the clock, the digest, the
// alphabet, then the type and the duplicate recipient — so this states the
// property instead of listing the five.
//
// A node that can mint what it will not accept has no use for either answer.
describe("mint and stage 2 admit the same acts", () => {
  const bad: [string, unknown][] = [
    ["thread_id", ""],
    ["thread_id", "a b"],
    ["thread_id", "../x"],
    ["thread_id", "a;b"],
    ["thread_id", 7],
    ["from", ""],
    ["from", "a=b"],
    ["from", null],
    ["to", []],
    ["to", ["", "x"]],
    ["to", ["agent:mimo", "agent:mimo"]],
    ["to", "agent:mimo"],
    ["to", [7]],
    ["type", "gossip"],
    ["type", ""],
    ["type", null],
    ["parent_digest", "zz"],
    ["parent_digest", "A".repeat(64)],
    // Added after the matrix missed the field entirely: it enumerated values
    // across five fields and the summary called that "fields checked", which
    // was the wrong noun for what it covered. `parent_id` disagreed on four
    // values while the matrix reported zero disagreements.
    ["parent_id", "a b"],
    ["parent_id", "../x"],
    ["parent_id", "b;to=v"],
    ["parent_id", ""],
    ["parent_id", "not-a-uuid"],
    ["parent_id", 7],
  ];

  it("agrees on every field §3 declares", () => {
    const cnsName = formatCns(parent.act, "agent:mimo");
    const disagreements: string[] = [];

    for (const [field, value] of bad) {
      let mintOk = true;
      try {
        const patched: Record<string, unknown> = { ...input };
        if (field === "parent_digest") patched.parent = { id: parent.act.id, digest: value };
        else if (field === "parent_id") patched.parent = { id: value, digest: parent.digest };
        else patched[field] = value;
        mint(patched as unknown as MintInput, mintContext("n"), 1001);
      } catch {
        mintOk = false;
      }

      let stage2Ok: boolean;
      try {
        const forged: Record<string, unknown> = { ...parent.act };
        if (field === "parent_digest") {
          forged.parent_id = parent.act.id;
          forged.parent_digest = value;
        } else if (field === "parent_id") {
          forged.parent_id = value;
          forged.parent_digest = parent.digest;
        } else {
          forged[field] = value;
        }
        stage2Ok = stage2(canonicalize(forged), cnsName).ok;
      } catch {
        // `canonicalize` refused it, so it cannot reach a wire at all.
        stage2Ok = false;
      }

      if (mintOk !== stage2Ok) {
        disagreements.push(`${field}=${JSON.stringify(value)}: mint=${mintOk} stage2=${stage2Ok}`);
      }
    }

    expect(disagreements).toEqual([]);
  });

  it("admits what it mints, for every type in §3's union", () => {
    for (const type of ["message", "claim", "challenge", "ruling", "erratum"] as const) {
      const sealed = mint({ ...input, type }, mintContext("n"), 1000).sealed;
      const r = stage2(sealed.bytes, formatCns(sealed.act, "agent:mimo"));
      expect(r.ok).toBe(true);
    }
  });
});
