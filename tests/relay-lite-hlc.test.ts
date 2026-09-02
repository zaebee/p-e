import { describe, expect, it } from "vitest";
import { HLC_START, type Hlc, type HlcState, emit, ingest } from "../src/relay-lite/hlc.js";

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

  it("refuses a negative clock, which no conforming node can produce", () => {
    // §3.1 admits negative integers, so this is a claim about §3.3: `c` starts
    // at 0 and is only incremented or reset to 0, and `l` is `max(nowMs, l)`
    // over a wall clock. Without it a peer can push our `c` below zero through
    // the `l' == incoming.l` branch and bias where our acts land in §4's
    // tie-break.
    expect(() => ingest(HLC_START, { l: -1, c: 0, node_id: "p" }, N, 1000)).toThrow(TypeError);
    expect(() => ingest({ l: 1000, c: 0 }, { l: 2000, c: -5, node_id: "p" }, N, 1500)).toThrow(
      TypeError,
    );
    expect(() => emit(HLC_START, N, -1)).toThrow(TypeError);
  });

  it("names the sender, not a field, when the clock is absent entirely", () => {
    expect(() => ingest(HLC_START, null as never, N, 1000)).toThrow(/must be an object/);
    expect(() => ingest(HLC_START, undefined as never, N, 1000)).toThrow(/must be an object/);
  });

  it("refuses a state that did not survive persistence intact", () => {
    // §3.3 requires per-node monotonicity and does not say where `l` and `c`
    // live between restarts (#32), so a caller meeting that requirement writes
    // this state to a file and reads it back. What returns is data, not the
    // value we handed out: truncated by a crash mid-write, or restored from a
    // backup taken during one. Unchecked, `null` propagates as 0 and a missing
    // field as NaN, ending the monotonicity the persistence was for.
    const fromDisk = (text: string) => JSON.parse(text) as never;
    expect(() => emit(fromDisk('{"l":1000}'), N, 2000)).toThrow(/state\.c/);
    expect(() => emit(fromDisk('{"l":null,"c":0}'), N, 2000)).toThrow(/state\.l/);
    expect(() => emit(null as never, N, 2000)).toThrow(/state must be an object/);
    expect(() => ingest(fromDisk("{}"), { l: 1, c: 0, node_id: "p" }, N, 2000)).toThrow(TypeError);
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

// The property the HLC exists to have, which none of the cases above states:
// if A happens-before B then hlc(A) < hlc(B), under the comparator §4 names,
// (l, c, node_id). Each example test checks one transition; this checks the
// guarantee those transitions are for, over a run where clocks drift and
// sometimes step backwards — the case §3.3 was written for.
describe("causality, over a simulated network", () => {
  const cmp = (a: Hlc, b: Hlc): number => {
    if (a.l !== b.l) return a.l - b.l;
    if (a.c !== b.c) return a.c - b.c;
    return a.node_id < b.node_id ? -1 : a.node_id > b.node_id ? 1 : 0;
  };

  it("never orders a cause at or after its effect", () => {
    let seed = 424_242;
    const rnd = () => {
      // `Math.imul`, not `*`: at seed ~2^31 the product passes 2^53 and the
      // float rounds its low bits away, so three quarters of the draws had a
      // zero low byte and successive values were never closer than 34760. The
      // generator looked uniform and was coarse, which quietly shrank the space
      // these properties explore.
      //
      // Divided by 2^31 rather than 2^31 - 1, so a draw of exactly 1.0 is
      // structurally impossible rather than merely unobserved — `rnd() * n`
      // would otherwise index one past the end.
      seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
      return seed / 0x80000000;
    };
    const NODES = 5;
    const state: HlcState[] = Array.from({ length: NODES }, () => HLC_START);
    const clock: number[] = Array.from({ length: NODES }, () => 1_700_000_000_000);
    const lastOn: (number | null)[] = Array.from({ length: NODES }, () => null);
    const events: { hlc: Hlc; node: number; causes: number[] }[] = [];
    const inFlight: { to: number; hlc: Hlc; index: number }[] = [];

    for (let step = 0; step < 8000; step++) {
      const n = Math.floor(rnd() * NODES);
      const drift = rnd();
      // Backwards steps are the point: NTP, VM restore, suspend.
      if (drift < 0.6) clock[n] = (clock[n] as number) + Math.floor(rnd() * 3);
      else if (drift < 0.68) clock[n] = (clock[n] as number) - Math.floor(rnd() * 50);

      const waiting = inFlight.findIndex((m) => m.to === n);
      const causes: number[] = [];
      if (lastOn[n] !== null) causes.push(lastOn[n] as number);

      let hlc: Hlc;
      if (waiting >= 0 && rnd() < 0.45) {
        const msg = inFlight.splice(waiting, 1)[0] as { hlc: Hlc; index: number };
        causes.push(msg.index);
        const r = ingest(state[n] as HlcState, msg.hlc, `node-${n}`, clock[n] as number);
        state[n] = r.state;
        hlc = r.hlc;
      } else {
        const r = emit(state[n] as HlcState, `node-${n}`, clock[n] as number);
        state[n] = r.state;
        hlc = r.hlc;
        if (rnd() < 0.35) {
          const to = Math.floor(rnd() * NODES);
          if (to !== n) inFlight.push({ to, hlc, index: events.length });
        }
      }
      events.push({ hlc, node: n, causes });
      lastOn[n] = events.length - 1;
    }

    let edges = 0;
    const violations: string[] = [];
    for (const e of events) {
      for (const c of e.causes) {
        edges++;
        const cause = events[c]?.hlc as Hlc;
        if (cmp(cause, e.hlc) >= 0) {
          violations.push(`${JSON.stringify(cause)} !< ${JSON.stringify(e.hlc)}`);
        }
      }
    }
    expect(edges).toBeGreaterThan(8000);
    expect(violations).toEqual([]);

    // And per node, the tuple never goes backwards despite the clock doing so.
    for (let n = 0; n < NODES; n++) {
      const own = events.filter((e) => e.node === n).map((e) => e.hlc);
      const breaks = own.filter((h, i) => i > 0 && cmp(own[i - 1] as Hlc, h) >= 0);
      expect(breaks).toEqual([]);
    }
  });
});
