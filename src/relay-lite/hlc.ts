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

export const HLC_START: HlcState = { l: 0, c: 0 };

export function emit(
  state: HlcState,
  nodeId: string,
  nowMs: number,
): { hlc: Hlc; state: HlcState } {
  const l = Math.max(nowMs, state.l);
  const c = l === state.l ? state.c + 1 : 0;
  return { hlc: { l, c, node_id: nodeId }, state: { l, c } };
}

export function ingest(
  state: HlcState,
  incoming: Hlc,
  nodeId: string,
  nowMs: number,
): { hlc: Hlc; state: HlcState } {
  const l = Math.max(nowMs, state.l, incoming.l);
  let c: number;
  if (l === state.l && l === incoming.l) c = Math.max(state.c, incoming.c) + 1;
  else if (l === state.l) c = state.c + 1;
  else if (l === incoming.l) c = incoming.c + 1;
  else c = 0;
  return { hlc: { l, c, node_id: nodeId }, state: { l, c } };
}
