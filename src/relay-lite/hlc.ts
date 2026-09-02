/**
 * The Hybrid Logical Clock, both rules from §3.3.
 *
 * `max` folds a regressing physical clock into the equal case, so the tuple
 * stays monotonic per node across NTP steps, VM restore and suspend — which is
 * the property the section rests on.
 *
 * ## What this file cannot fix, recorded where the next reader meets it
 *
 * Three gaps, all in what §3.3 specifies rather than in the code that follows
 * it. Filed as issue #32; none is patched here, because a local guard would
 * make this implementation refuse messages the specification requires it to
 * accept, which is a worse failure than the one it avoids.
 *
 * **§3.3 can produce a clock §3.1 forbids.** An incoming `c` of exactly
 * `MAX_SAFE_INTEGER` is valid I-JSON, so §7.1 stage 2 must accept it. The
 * ingest rule then computes `max(last_c, M.hlc.c) + 1` — 2^53, which §3.1
 * forbids by the same clause that admitted the input. A conforming node,
 * ingesting a conforming message, produces a clock it cannot serialize.
 *
 * **An incoming `l` is unbounded, and one message is permanent.** `max` is
 * what makes the tuple monotonic and also what makes a hostile `l` stick: a
 * single message carrying 2^53 - 1 moves the node's clock there for good, past
 * the range of a JavaScript `Date`, and every peer that ingests an act sealed
 * afterwards inherits it. The HLC literature bounds this with a drift check;
 * §3.3 has no ε.
 *
 * **Where `l` and `c` live between restarts is unspecified.** A node that
 * restarts after its clock stepped backwards begins at zero and can emit a
 * tuple it has already emitted, so the per-node monotonicity the section
 * insists on rests on state nobody is required to keep. This module takes state
 * as an argument so a caller *can* persist it, and cannot make a caller do so.
 */

export interface Hlc {
  readonly l: number;
  readonly c: number;
  readonly node_id: string;
}

export interface HlcState {
  readonly l: number;
  readonly c: number;
}

export const HLC_START: HlcState = Object.freeze({ l: 0, c: 0 });

/**
 * §3.1's own domain, checked at this module's boundary.
 *
 * This is not the drift bound or the `c` ceiling of #32 — those would refuse
 * messages §3.1 admits, which is why they are not here. This refuses only what
 * §3.1 already forbids, and it closes a hole that is reachable over the wire.
 *
 * `{"c":0,"node_id":"peer"}` is valid I-JSON. §7.1 stage 2 enumerates its
 * checks — duplicate keys, numbers outside the safe range, `CNS.id`, `CNS.to`,
 * an unanchored citation — and none of them is about a field being present, so
 * the message reaches ingest with `l` undefined. `Math.max(now, last, undefined)`
 * is NaN; `Math.max(anything, NaN)` is NaN; and `NaN !== NaN` means the equal
 * branch never fires again, so `c` sticks at 0 too. The node emits the same
 * tuple for every act it ever seals afterwards, and no later clock recovers it.
 * Twenty-four bytes, permanent, from any peer.
 */
function assertClockValue(value: number, what: string): void {
  if (!Number.isInteger(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    throw new TypeError(`${what} must be an integer within the safe range, got ${String(value)}`);
  }
}

export function emit(
  state: HlcState,
  nodeId: string,
  nowMs: number,
): { hlc: Hlc; state: HlcState } {
  // Floored rather than refused: `l` is a wall clock in milliseconds, and a
  // caller holding `performance.timeOrigin + performance.now()` has a fractional
  // one through no fault of its own. Flooring is what "milliseconds" means and
  // preserves order; refusing would buy nothing.
  const physical = Math.floor(nowMs);
  assertClockValue(physical, "nowMs");
  const l = Math.max(physical, state.l);
  const c = l === state.l ? state.c + 1 : 0;
  return { hlc: { l, c, node_id: nodeId }, state: { l, c } };
}

export function ingest(
  state: HlcState,
  incoming: Hlc,
  nodeId: string,
  nowMs: number,
): { hlc: Hlc; state: HlcState } {
  const physical = Math.floor(nowMs);
  assertClockValue(physical, "nowMs");
  // The sender's clock, checked against §3.1 before it touches ours. `c` at
  // exactly MAX_SAFE_INTEGER passes here, because §3.1 admits it — which is
  // what makes the overflow in #32 a defect of the specification rather than
  // something this check could paper over.
  assertClockValue(incoming?.l, "incoming.l");
  assertClockValue(incoming.c, "incoming.c");
  const l = Math.max(physical, state.l, incoming.l);
  let c: number;
  if (l === state.l && l === incoming.l) c = Math.max(state.c, incoming.c) + 1;
  else if (l === state.l) c = state.c + 1;
  else if (l === incoming.l) c = incoming.c + 1;
  else c = 0;
  return { hlc: { l, c, node_id: nodeId }, state: { l, c } };
}
