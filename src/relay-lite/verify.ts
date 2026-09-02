import type { RelayAct } from "./act.js";
import { canonicalize, parseIJson, sha256Hex } from "./canonical.js";
import { checkDelivery, parseCns } from "./cns.js";
import { isClockValue } from "./hlc.js";

/**
 * Verification, §7, in the order the section makes normative.
 *
 * Three functions rather than one with phases, because a single function cannot
 * demonstrate that the order was respected and three can — a test may call them
 * out of order and see the difference.
 */

export type CausalStatus =
  | "NO_PARENT"
  | "UNANCHORED"
  | "LABEL_ONLY"
  | "MATCHES"
  | "DIVERGES"
  | "UNCHECKABLE";

export interface StoredAct {
  readonly bytes: string;
  readonly digest: string;
}

/**
 * A discrepancy inside this store, which is not a defect in anyone's record.
 *
 * §7.3: it *"MUST NOT surface as `DIVERGES` against a child record"* — the
 * tri-state stops a reader's visibility gap from becoming an author's defect,
 * and this stops the reader's staleness from doing the same. Thrown rather than
 * returned because it is about the store rather than the record being checked,
 * and swallowing it would put a reader's bookkeeping error into an author's
 * column.
 */
export class StoreCorruption extends Error {
  readonly locator: string;
  constructor(locator: string) {
    super(`stored digest disagrees with stored bytes for ${locator}`);
    this.name = "StoreCorruption";
    this.locator = locator;
  }
}

/**
 * §7.1 stage 1: *"Compute act_digest = SHA-256(raw_received_bytes). No parsing,
 * no normalization."*
 */
export function stage1(bytes: string): { readonly digest: string } {
  return { digest: sha256Hex(bytes) };
}

const ACT_TYPES = new Set(["message", "claim", "challenge", "ruling", "erratum"]);

/**
 * The whole shape, because a partial check is a check that admits what it did
 * not look at.
 */
function isRelayAct(v: unknown): v is RelayAct {
  if (v === null || typeof v !== "object") return false;
  const a = v as Record<string, unknown>;
  const str = (x: unknown): boolean => typeof x === "string";
  const strOrNull = (x: unknown): boolean => x === null || typeof x === "string";
  const hlc = a.hlc;
  if (hlc === null || typeof hlc !== "object") return false;
  const h = hlc as Record<string, unknown>;
  return (
    str(a.id) &&
    str(a.thread_id) &&
    strOrNull(a.parent_id) &&
    strOrNull(a.parent_digest) &&
    str(a.type) &&
    ACT_TYPES.has(a.type as string) &&
    str(a.from) &&
    Array.isArray(a.to) &&
    a.to.every(str) &&
    // The same rule `hlc.ts` enforces, imported rather than restated. It was
    // `typeof === "number"` here, so stage 2 called an act with `hlc.l = -1`
    // structurally conformant and `ingest` — the function that would then
    // process it — refused it as "must be a non-negative integer". Two modules
    // of one store disagreeing about one value, with stage 2 deciding what
    // enters. Same lesson as the name alphabet in `names.ts`: one copy, so they
    // cannot drift apart again.
    isClockValue(h.l) &&
    isClockValue(h.c) &&
    str(h.node_id) &&
    "payload" in a
  );
}

export type Stage2Result =
  | { readonly ok: true; readonly act: RelayAct }
  | { readonly ok: false; readonly reason: string };

/** §7.1 stage 2: structural and I-JSON conformance, and the §2 checks. */
export function stage2(bytes: string, filename: string): Stage2Result {
  const cns = parseCns(filename);
  if (!cns) return { ok: false, reason: "not-a-delivery-name" };

  let value: unknown;
  try {
    value = parseIJson(bytes);
  } catch (error) {
    return { ok: false, reason: (error as Error).message };
  }

  const act = value as RelayAct;
  // Every field, not only two. Checking `id` and `to` alone let a shape that is
  // not an act reach stage 3, where `undefined === null` is false twice and the
  // result was `UNCHECKABLE` — a state meaning "this reader lacks the parent",
  // reported about something that was never an act.
  if (!isRelayAct(act)) return { ok: false, reason: "not-an-act" };

  // A producer that did not canonicalise is refused rather than repaired. §7.1
  // forbids a verifier re-serialising to compute a digest; admitting
  // non-canonical bytes would make JCS a local convention instead of a wire
  // contract, and two verifiers would then disagree about the same act.
  if (canonicalize(act) !== bytes) return { ok: false, reason: "not-canonical" };

  const delivery = checkDelivery(cns, act);
  if (!delivery.ok) return { ok: false, reason: delivery.reason };

  if (act.parent_id === null && act.parent_digest !== null) {
    return { ok: false, reason: "unanchored" };
  }

  return { ok: true, act };
}

/**
 * §7.1 stage 3, and §7.2's matrix.
 *
 * Total: every input returns a state and none throws — except `StoreCorruption`,
 * which is about the store. `UNANCHORED` is refused at stage 2, where rejection
 * belongs, and still classified here, so an auditor sweeping records that did
 * not come through this pipeline gets a report rather than an aborted sweep.
 */
export function stage3(act: RelayAct, held: ReadonlyMap<string, StoredAct>): CausalStatus {
  if (act.parent_id === null) {
    return act.parent_digest === null ? "NO_PARENT" : "UNANCHORED";
  }
  if (act.parent_digest === null) return "LABEL_ONLY";

  const parent = held.get(act.parent_id);
  if (parent === undefined) return "UNCHECKABLE";

  // §7.3's invariant is checked here rather than assumed, because a stale
  // cached digest would otherwise be reported as the child author's defect.
  if (sha256Hex(parent.bytes) !== parent.digest) throw new StoreCorruption(act.parent_id);

  return parent.digest === act.parent_digest ? "MATCHES" : "DIVERGES";
}
