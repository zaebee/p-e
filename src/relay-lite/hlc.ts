/**
 * The Hybrid Logical Clock, both rules from §3.3.
 *
 * `max` folds a regressing physical clock into the equal case, so the tuple
 * stays monotonic per node across NTP steps, VM restore and suspend — which is
 * the property the section rests on.
 *
 * ## What this file cannot fix, recorded where the next reader meets it
 *
 * ## Checked against the paper §3.3 is taken from
 *
 * Kulkarni, Demirbas, Madeppa, Avva and Leone, *Logical Physical Clocks and
 * Consistent Snapshots in Globally Distributed Databases* (2014), Figure 5.
 * §3.3 reproduces both rules exactly — the emission rule, and all four branches
 * of the ingest rule in the same order, `max(c.j, c.m) + 1` included.
 *
 * What §3.3 does not reproduce is the assumption the paper's boundedness rests
 * on. Corollary 1 bounds `|l - pt|` by the clock synchronization uncertainty ε;
 * Corollary 3 bounds the counter by `N * (ε + 1)`. Both proofs invoke the
 * synchronization constraint by name. §3.3 states no ε and requires none, so it
 * inherits the algorithm without the premise its guarantees are proved under —
 * which is what makes the counter overflow below reachable at all. Under the
 * paper's assumption `c` cannot approach 2^53; the paper's own worst case, a
 * node violating the drift constraint fivefold, reached 514 and did not raise
 * any other node's counter.
 *
 * Reproduced in the tests: with ε ≤ 10ms, 99.2% of events carry `c ≤ 4`, which
 * is the paper's published measurement.
 *
 * ## Three gaps, all in what §3.3 specifies rather than in the code that
 * follows it
 *
 * Filed as issue #32; none is patched here, because a local guard would
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

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

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
export function isClockValue(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_SAFE;
}

function assertClockValue(value: number, what: string): void {
  // Non-negative, which is a claim about §3.3 rather than about §3.1. §3.1
  // admits negative integers, so this is not "the safe range" alone — but no
  // conforming node can produce either value negative: `c` starts at 0 and is
  // only incremented or reset to 0, and `l` is `max(nowMs, state.l)` over a
  // wall clock and a state that starts at 0. A negative arrival is therefore
  // not a message we are refusing to understand; it is one no correct sender
  // wrote. Without the check a peer can push our `c` below zero through the
  // `l' == incoming.l` branch and bias where our acts land in §4's tie-break.
  if (!isClockValue(value)) {
    throw new TypeError(
      `${what} must be a non-negative integer within the safe range, got ${String(value)}`,
    );
  }
}

/**
 * The node's own clock, checked because it does not stay in this process.
 *
 * §3.3 requires per-node monotonicity and says nothing about where `l` and `c`
 * live between restarts (#32), so a caller that satisfies the requirement has
 * to write this state somewhere and read it back. It re-enters as data from a
 * file, not as the value we returned — truncated by a crash mid-write, or
 * hand-edited, or restored from a backup taken during one. Unchecked, a `null`
 * there propagates as 0 and a missing field as NaN, and either silently ends
 * the monotonicity the persistence was for.
 */
function assertState(state: HlcState): void {
  if (state === null || typeof state !== "object") {
    throw new TypeError(`state must be an object, got ${String(state)}`);
  }
  assertClockValue(state.l, "state.l");
  assertClockValue(state.c, "state.c");
}

/**
 * This node's own name, which §4 makes load-bearing.
 *
 * The comparator is `TopologicalDepth → HLC (l, c, node_id) → id`, so an empty
 * or blank `node_id` collapses its whole level: every act from such a node ties
 * with every other, and the ordering falls through to `id` — which is a valid
 * result and not the one §4 describes. Nothing downstream would report it. The
 * canonicalizer accepts an empty string, the digest is well formed, and the
 * defect appears only as a presentation that quietly stopped grouping by node.
 *
 * Only ours. `incoming.node_id` is not checked because it is not read: `ingest`
 * stamps the act with this node's identity, never the sender's, so refusing a
 * message over that field would reject it for a value we ignore.
 */
function assertNodeId(nodeId: string): void {
  if (typeof nodeId !== "string" || nodeId.trim() === "") {
    throw new TypeError(`nodeId must be a non-empty string, got ${JSON.stringify(nodeId)}`);
  }
}

export function emit(
  state: HlcState,
  nodeId: string,
  nowMs: number,
): { hlc: Hlc; state: HlcState } {
  assertState(state);
  assertNodeId(nodeId);
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
  assertState(state);
  assertNodeId(nodeId);
  const physical = Math.floor(nowMs);
  assertClockValue(physical, "nowMs");
  // The sender's clock, checked against §3.1 before it touches ours. `c` at
  // exactly MAX_SAFE_INTEGER passes here, because §3.1 admits it — which is
  // what makes the overflow in #32 a defect of the specification rather than
  // something this check could paper over.
  // Checked before its fields, so a null sender is reported as one rather than
  // as a bad `l`. The optional chain that stood here worked — `undefined` fails
  // the value check — and named the wrong thing when it did.
  if (incoming === null || typeof incoming !== "object") {
    throw new TypeError(`incoming clock must be an object, got ${String(incoming)}`);
  }
  assertClockValue(incoming.l, "incoming.l");
  assertClockValue(incoming.c, "incoming.c");
  const l = Math.max(physical, state.l, incoming.l);
  let c: number;
  if (l === state.l && l === incoming.l) c = Math.max(state.c, incoming.c) + 1;
  else if (l === state.l) c = state.c + 1;
  else if (l === incoming.l) c = incoming.c + 1;
  else c = 0;
  return { hlc: { l, c, node_id: nodeId }, state: { l, c } };
}
