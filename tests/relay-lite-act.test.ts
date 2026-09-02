import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type MintInput, mint, mintContext } from "../src/relay-lite/act.js";
import { canonicalize, parseIJson, sha256Hex } from "../src/relay-lite/canonical.js";

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
    // Written as the boundary rather than as the literal `9007199254740993`,
    // which biome refuses under noPrecisionLoss — correctly, since the literal
    // *is* the lossy thing and has already rounded before any check runs.
    const past = Number.MAX_SAFE_INTEGER + 2;
    expect(() => mint({ ...input, payload: { n: past } }, mintContext("n"), 1)).toThrow();
  });

  it("refuses an empty audience, since a delivery leg must name a member", () => {
    expect(() => mint({ ...input, to: [] }, mintContext("n"), 1)).toThrow();
  });
});

describe("what mint refuses, and where the reason comes from", () => {
  it("freezes the seal, so the act cannot drift from its bytes", () => {
    // Without this the seal is one assignment from meaningless: `bytes` and
    // `digest` cannot be rebuilt — there is no `reseal` — but `act` was a plain
    // object, so an assignment left a record whose digest still verified against
    // bytes saying something else, with nothing to report it.
    const { sealed } = mint(input, mintContext("node-1"), 1000);
    expect(Object.isFrozen(sealed.act)).toBe(true);
    expect(() => {
      (sealed.act as { from: string }).from = "agent:impostor";
    }).toThrow(TypeError);
    expect(canonicalize(sealed.act)).toBe(sealed.bytes);
  });

  it("freezes what the act reaches, not only its surface", () => {
    const { sealed } = mint(input, mintContext("node-1"), 1000);
    expect(Object.isFrozen(sealed.act.to)).toBe(true);
    expect(Object.isFrozen(sealed.act.hlc)).toBe(true);
    expect(Object.isFrozen(sealed.act.payload)).toBe(true);
  });

  it("freezes its own copy of the payload, never the caller's object", () => {
    // An earlier version froze the caller's object and called it part of the
    // contract. That broke a caller who reuses a payload between mints, at a
    // distance and with the error pointing at their code — and it held the
    // invariant for a weaker reason, since freezing their object only helps
    // while it *is* the act's payload.
    const payload = { text: "draft", tags: ["a"] };
    const { sealed, ...rest } = mint({ ...input, payload }, mintContext("node-1"), 1000);
    void rest;

    expect(Object.isFrozen(payload)).toBe(false);
    payload.text = "edited after minting";
    payload.tags.push("b");

    // No cast: `mint` is generic over the payload, so this is typed.
    expect(sealed.act.payload.text).toBe("draft");
    expect(sealed.act.payload).not.toBe(payload);
    expect(canonicalize(sealed.act)).toBe(sealed.bytes);
  });

  it("refuses half a citation, which would be read as an author defect", () => {
    // §7.2's table reads `null` against *set*, and an empty string is set. Half
    // a citation minted this way is not NO_PARENT — it is a pair matching no
    // stored record, so every verifier holding the parent returns DIVERGES,
    // which §7.2 marks an author defect. The refusal is the difference between
    // a producer's typo and a permanent accusation against them.
    const ctx = mintContext("node-1");
    expect(() => mint({ ...input, parent: { id: "x", digest: "" } }, ctx, 1)).toThrow(
      /parent\.digest/,
    );
    expect(() => mint({ ...input, parent: { id: "", digest: "a".repeat(64) } }, ctx, 1)).toThrow(
      /parent\.id/,
    );
    expect(() => mint({ ...input, parent: { id: "x", digest: "not-a-sha256" } }, ctx, 1)).toThrow(
      /64 lowercase hex/,
    );
    // A well-formed pair still passes.
    expect(() =>
      mint({ ...input, parent: { id: "x", digest: "a".repeat(64) } }, ctx, 1),
    ).not.toThrow();
  });

  it("refuses a field that cannot appear in a delivery name", () => {
    // §2.1 names a leg `to=<agent>;from=<agent>;thread=<thread_id>;…`, so an
    // empty one produces `from=;` — a name §2.1 does not define. Same reason
    // the empty audience is refused here rather than at publication.
    const ctx = mintContext("node-1");
    expect(() => mint({ ...input, from: "" }, ctx, 1)).toThrow(/from/);
    expect(() => mint({ ...input, thread_id: "  " }, ctx, 1)).toThrow(/thread_id/);
    expect(() => mint({ ...input, to: [""] }, ctx, 1)).toThrow(/recipient/);
  });

  it("refuses a name component that would inject a field or a path", () => {
    // §2.1's name is also a filename, and the plan's `formatCns` interpolates
    // without escaping while `parseCns` lets the last duplicate field win.
    //
    //   from = "b;to=bee.victim"  ->  ...;from=b;to=bee.victim;thread=...
    //                             ->  parses as to=bee.victim
    //
    //   thread_id = "../../../tmp/x"
    //                             ->  join(inDir, name) resolves outside in/
    //
    // See #35: the name is built in task 5 and joined in task 6, so this is the
    // producer's gate rather than the only one it should have.
    const ctx = mintContext("node-1");
    for (const bad of ["b;to=bee.victim", "../../../tmp/x", "a=b", "a/b", "a\\b", "a b"]) {
      expect(() => mint({ ...input, from: bad }, ctx, 1)).toThrow(/may only contain/);
      expect(() => mint({ ...input, thread_id: bad }, ctx, 1)).toThrow(/may only contain/);
      expect(() => mint({ ...input, to: [bad] }, ctx, 1)).toThrow(/may only contain/);
    }
  });

  it("admits the identities this corpus actually uses", () => {
    // The whitelist has to be narrow without being useless.
    const ctx = mintContext("node-1");
    for (const good of ["bee.claude", "relay-mimo", "agent:mimo", "all", "bee.zae", "t-1", "x_1"]) {
      expect(() =>
        mint({ ...input, from: good, thread_id: good, to: [good] }, ctx, 1),
      ).not.toThrow();
    }
  });

  it("refuses a string audience, which used to be shredded into letters", () => {
    // A string has `.length` and iterates, so `to: "agent"` passed every check
    // and produced five recipients — `a`, `g`, `e`, `n`, `t` — each with its own
    // delivery leg. Whether it passed depended on spelling: `"mimo"` was refused
    // as naming a recipient twice, describing a defect that was not there, and
    // `""` was refused for the right reason by accident.
    const ctx = mintContext("n");
    for (const to of ["agent", "mimo", ""]) {
      expect(() => mint({ ...input, to: to as never }, ctx, 1)).toThrow(/must be an array/);
    }
  });

  it("names an array citation as an array, not as a missing field", () => {
    // `typeof []` is "object", so `parent: []` passed the object check and came
    // out as `parent.id must be a non-empty string, got undefined` — a true
    // refusal naming a field of something that has none.
    expect(() => mint({ ...input, parent: [] as never }, mintContext("n"), 1)).toThrow(/got array/);
  });

  it("names a non-object citation as one, not as a missing field", () => {
    expect(() => mint({ ...input, parent: "abc" as never }, mintContext("n"), 1)).toThrow(
      /parent must be an object/,
    );
    // null and undefined stay the way to say "no parent".
    expect(() => mint({ ...input, parent: null }, mintContext("n"), 1)).not.toThrow();
    expect(() => mint({ ...input, parent: undefined }, mintContext("n"), 1)).not.toThrow();
  });

  it("refuses the same recipient twice, which is one act colliding with itself", () => {
    // The CNS name is identical for both legs, so `in/` would hold one file
    // where the act asked for two and the publisher's O_EXCL cannot tell a
    // duplicate leg from a foreign one.
    expect(() => mint({ ...input, to: ["agent:mimo", "agent:mimo"] }, mintContext("n"), 1)).toThrow(
      /twice/,
    );
  });
});

describe("the sealed act, checked against the spec and over many mints", () => {
  it("carries exactly the fields §3 declares, read from the spec itself", () => {
    // Read rather than transcribed: a hardcoded list would drift with the spec
    // and agree with whatever this module happens to do. §3's `RelayAct` is the
    // wire contract, and the wire cares about field names, not type names —
    // which is why `HLC` there and `Hlc` here is not a difference.
    const spec = readFileSync(
      new URL("../docs/specs/relay-lite-v0.12-draft.md", import.meta.url),
      "utf8",
    );
    const start = spec.indexOf("export interface RelayAct");
    const declared = [
      ...spec.slice(start, spec.indexOf("}", start)).matchAll(/readonly (\w+):/g),
    ].map((m) => m[1]);

    const { sealed } = mint(input, mintContext("node-1"), 1000);
    expect(Object.keys(sealed.act).sort()).toEqual([...declared].sort());
    expect(declared).toHaveLength(9);
  });

  it("holds the seal over many mints, not only the one the examples use", () => {
    // The property §3.2 states: sealed at creation, bytes canonicalized once.
    // Each example above checks it for a single input; this checks that no
    // combination of parent, audience, type and payload breaks it.
    let seed = 20260902;
    const rnd = () => {
      seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
      return seed / 0x80000000;
    };
    const types = ["message", "claim", "challenge", "ruling", "erratum"] as const;
    const agents = ["agent:mimo", "agent:mistral", "agent:zae", "all"];

    let ctx = mintContext("node-1");
    let nowMs = 1_756_800_000_000;
    let parent: { id: string; digest: string } | null = null;
    const ids = new Set<string>();
    const digests = new Set<string>();
    let previous: { l: number; c: number } | null = null;

    for (let i = 0; i < 1500; i++) {
      if (rnd() < 0.4) nowMs += Math.floor(rnd() * 3);
      const to = agents.filter(() => rnd() < 0.5);
      // Annotated rather than inferred: `parent` is fed from the previous act,
      // so leaving `T` to inference makes the input's type depend on `r` and
      // `r`'s on the input.
      const next: MintInput<Record<string, unknown>> = {
        thread_id: `t-${Math.floor(rnd() * 4)}`,
        type: types[Math.floor(rnd() * types.length)] as (typeof types)[number],
        from: "agent:claude",
        to: to.length > 0 ? to : ["agent:mimo"],
        payload: rnd() < 0.5 ? { n: i } : { text: "не репарируем", tags: [i, "q1"] },
        parent: rnd() < 0.6 ? parent : null,
      };
      const r = mint(next, ctx, nowMs);
      ctx = r.ctx;
      const { act, bytes, digest } = r.sealed;

      expect(bytes).toBe(canonicalize(act));
      expect(digest).toBe(sha256Hex(bytes));
      expect(canonicalize(parseIJson(bytes))).toBe(bytes);
      expect(Object.isFrozen(act)).toBe(true);

      ids.add(act.id);
      digests.add(digest);
      if (previous !== null) {
        // Strictly increasing per node, which is what makes the HLC usable as
        // §4's comparator key.
        expect(act.hlc.l > previous.l || (act.hlc.l === previous.l && act.hlc.c > previous.c)).toBe(
          true,
        );
      }
      previous = { l: act.hlc.l, c: act.hlc.c };
      parent = { id: act.id, digest };
    }

    expect(ids.size).toBe(1500);
    expect(digests.size).toBe(1500);
  });
});
