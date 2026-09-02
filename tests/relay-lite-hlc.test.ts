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

describe("domain checks at the boundary — §3.1, not §3.3 policy", () => {
  it("refuses a wire message whose hlc has no `l`", () => {
    // `{"c":0,"node_id":"peer"}` is valid I-JSON, and §7.1 stage 2 enumerates
    // its checks without one about a field being present — so before this
    // guard the message reached ingest, `Math.max(now, last, undefined)` gave
    // NaN, and NaN !== NaN kept the equal branch from ever firing again. The
    // node emitted {l: NaN, c: 0} for every act it sealed afterwards, with no
    // later clock recovering it. Twenty-four bytes, permanent, from any peer.
    const fromWire = JSON.parse('{"c":0,"node_id":"peer"}');
    expect(() => ingest(HLC_START, fromWire, N, 1000)).toThrow(TypeError);
  });

  it("refuses a null or fractional clock rather than carrying it", () => {
    expect(() => ingest(HLC_START, JSON.parse('{"l":null,"c":0}'), N, 1000)).toThrow(TypeError);
    expect(() => ingest(HLC_START, { l: 1.5, c: 0, node_id: "p" }, N, 1000)).toThrow(TypeError);
    expect(() => ingest(HLC_START, { l: 1000, c: 0.5, node_id: "p" }, N, 1000)).toThrow(TypeError);
  });

  it("refuses a NaN or out-of-range nowMs from its own caller", () => {
    expect(() => emit(HLC_START, N, Number.NaN)).toThrow(TypeError);
    expect(() => emit(HLC_START, N, Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });

  it("floors a fractional nowMs rather than refusing it", () => {
    // A caller holding `performance.timeOrigin + performance.now()` has a
    // fractional millisecond through no fault of its own.
    expect(emit(HLC_START, N, 1000.9).hlc.l).toBe(1000);
    expect(emit({ l: 1000, c: 0 }, N, 1001.1).hlc).toMatchObject({ l: 1001, c: 0 });
  });

  it("still admits the values §3.1 admits, including the one that overflows", () => {
    // The guard must not paper over #32: MAX_SAFE_INTEGER is legal input, and
    // the defect is that §3.3 then adds one to it.
    const r = ingest(
      { l: 2000, c: 0 },
      { l: 2000, c: Number.MAX_SAFE_INTEGER, node_id: "p" },
      N,
      2000,
    );
    expect(r.hlc.c).toBe(2 ** 53);
  });

  it("freezes the starting state", () => {
    expect(Object.isFrozen(HLC_START)).toBe(true);
  });
});

// These pin defects, not expectations. §3.3 as written produces each of them,
// so the tests state the current behaviour and name it wrong; whichever way
// issue #32 is resolved they fail and force an update, rather than quietly
// encoding today's answer as the intended one.
describe("§3.3 defects, recorded — see issue #32", () => {
  it("DEFECT: ingest can produce a `c` that §3.1 forbids", () => {
    // MAX_SAFE_INTEGER is valid I-JSON, so stage 2 must accept a message
    // carrying it. The ingest rule then adds one and leaves the domain.
    const r = ingest(
      { l: 2000, c: 0 },
      { l: 2000, c: Number.MAX_SAFE_INTEGER, node_id: "peer" },
      N,
      2000,
    );
    expect(r.hlc.c).toBe(2 ** 53);
    expect(r.hlc.c).toBeGreaterThan(Number.MAX_SAFE_INTEGER);
  });

  it("DEFECT: one incoming `l` moves this node's clock permanently", () => {
    const poisoned = ingest(
      HLC_START,
      { l: Number.MAX_SAFE_INTEGER, c: 0, node_id: "peer" },
      N,
      1000,
    );
    let state = poisoned.state;
    for (let i = 0; i < 5; i++) state = emit(state, N, 1000 + i).state;
    // Five honest emits at a correct clock do not bring it back: `max` is both
    // what makes the tuple monotonic and what makes this stick.
    expect(state.l).toBe(Number.MAX_SAFE_INTEGER);
    // Past the range of a Date, so anything rendering it gets an invalid one.
    expect(Number.isNaN(new Date(state.l).getTime())).toBe(true);
  });
});
