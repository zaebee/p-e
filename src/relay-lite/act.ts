import { assertIJsonValue, canonicalize, sha256Hex } from "./canonical.js";
import { HLC_START, type Hlc, type HlcState, emit } from "./hlc.js";
import { UUID_START, type UuidState, uuidV7 } from "./uuid.js";

/**
 * The canonical act, and the only place that produces one.
 *
 * §3.2: *"An act is sealed at creation: `id` minted, `hlc` stamped once, and the
 * payload canonicalized to JCS bytes"*, and *"Publishers MUST NOT re-tick the
 * HLC or re-mint timestamps when retrying an existing `id`."*
 *
 * That MUST NOT holds here by construction rather than by discipline: there is
 * no `remint`, no `reseal`, and no `toBytes(act)` in this module's surface. What
 * cannot be rebuilt cannot be rebuilt differently, and a retry republishes the
 * bytes it already has.
 */

export interface RelayAct<T = unknown> {
  readonly id: string;
  readonly thread_id: string;
  readonly parent_id: string | null;
  readonly parent_digest: string | null;
  readonly type: "message" | "claim" | "challenge" | "ruling" | "erratum";
  readonly from: string;
  readonly to: readonly string[];
  readonly hlc: Hlc;
  readonly payload: T;
}

export interface SealedAct {
  readonly act: RelayAct;
  readonly bytes: string;
  readonly digest: string;
}

export interface MintContext {
  readonly nodeId: string;
  readonly hlc: HlcState;
  readonly uuid: UuidState;
}

export interface MintInput {
  readonly thread_id: string;
  readonly type: RelayAct["type"];
  readonly from: string;
  readonly to: readonly string[];
  readonly payload: unknown;
  readonly parent?: { readonly id: string; readonly digest: string } | null;
}

/** A sha256 as this store writes them: 64 lowercase hex digits. */
const DIGEST = /^[0-9a-f]{64}$/;

/**
 * Refuse a field that cannot appear in a delivery name.
 *
 * §2.1 names a leg `to=<agent>;from=<agent>;thread=<thread_id>;ttl=…;id=….json`,
 * so `from`, `thread_id` and each recipient are name components. An empty one
 * produces `from=;` — a name §2.1 does not define and `parseCns` cannot read
 * back. The plan refuses an empty audience here rather than at publication
 * because the reason is legible here; these are the same act with the same
 * defect, one field over.
 */
function assertNameable(value: string, what: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${what} must be a non-empty string, got ${JSON.stringify(value)}`);
  }
}

/**
 * A structural copy of an I-JSON value.
 *
 * Runs after `assertIJsonValue`, so the domain is plain objects, arrays,
 * strings, finite numbers, booleans and null — no prototypes to preserve, no
 * cycles to detect, and `canonicalize` gives the copy the same bytes as the
 * original because it reads structure and nothing else.
 */
function cloneIJson<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(cloneIJson) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as object)) out[k] = cloneIJson(v);
  return out as T;
}

/**
 * Freeze an act and everything reachable from it.
 *
 * Without this the seal is one assignment from meaningless. `bytes` and
 * `digest` are computed once and cannot be rebuilt — the module has no
 * `reseal` — but `act` was a plain object, so `sealed.act.from = "someone"`
 * left a record whose digest still verifies against bytes that say something
 * else. Nothing reports it: the pair is internally consistent and the act
 * beside it is a lie. `readonly` is a compile-time claim and the object
 * outlives the compiler.
 *
 * The payload is cloned before it gets here, so this freezes our copy and never
 * the caller's object. An earlier version froze theirs and called it part of the
 * contract; that was wrong in both directions. It broke a caller who reuses a
 * payload between mints, at a distance and with the error pointing at their
 * code — and it protected the seal for a weaker reason, since freezing their
 * object only helps while it *is* the act's payload. A private copy holds the
 * invariant no matter what they do with theirs.
 */
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  for (const v of Object.values(value as object)) deepFreeze(v);
  return Object.freeze(value);
}

export const mintContext = (nodeId: string): MintContext => ({
  nodeId,
  hlc: HLC_START,
  uuid: UUID_START,
});

export function mint(
  input: MintInput,
  ctx: MintContext,
  nowMs: number,
): { sealed: SealedAct; ctx: MintContext } {
  if (!Array.isArray(input.to)) {
    // A string has `.length` and iterates, so `to: "agent"` passed every check
    // below and produced five recipients named `a`, `g`, `e`, `n`, `t` — each
    // getting its own delivery leg. Whether it passed depended on spelling:
    // `"mimo"` was refused as naming a recipient twice, which described a
    // defect that was not there, and `""` was refused for the right reason by
    // accident. `readonly string[]` is a compile-time claim and this is the
    // producer's entry point.
    throw new Error(`to must be an array, got ${typeof input.to}`);
  }
  if (input.to.length === 0) {
    // §2 requires every delivery leg to name a member of `to[]`. An act with an
    // empty audience can have no conforming delivery, so it is refused here
    // rather than at publication, where the reason would be less obvious.
    throw new Error("an act must name at least one recipient");
  }
  assertNameable(input.from, "from");
  assertNameable(input.thread_id, "thread_id");
  for (const recipient of input.to) assertNameable(recipient, "recipient");
  if (new Set(input.to).size !== input.to.length) {
    // §2.1 gives a leg the name `to=<agent>;from=…;thread=…;id=<uuidv7>.json`,
    // and the same recipient twice produces that name twice — one act colliding
    // with itself in `in/`, where the publisher's `O_EXCL` cannot tell a
    // duplicate leg from a foreign one. Refused rather than deduplicated,
    // because silently narrowing the audience would make `sealed.act.to`
    // disagree with what the caller asked for.
    throw new Error(`to[] names a recipient twice: ${JSON.stringify(input.to)}`);
  }

  if (input.parent !== null && input.parent !== undefined) {
    if (typeof input.parent !== "object") {
      // Checked before its fields, so a non-object citation is reported as one
      // rather than as `parent.id must be a non-empty string, got undefined`,
      // which names a field of something that is not there.
      throw new Error(`parent must be an object or null, got ${typeof input.parent}`);
    }
    // §7.2 [MUST]: "A citation carries both handles — the locator and the
    // digest." Its table reads `null` against *set*, and an empty string is
    // set — so half a citation minted this way is not `NO_PARENT`, it is a
    // pair that matches no stored record. Every verifier holding the parent
    // then returns DIVERGES, which §7.2 marks an author defect. Refusing here
    // is the difference between a producer's typo and a permanent accusation
    // against them.
    assertNameable(input.parent.id, "parent.id");
    if (!DIGEST.test(input.parent.digest)) {
      throw new Error(
        `parent.digest must be 64 lowercase hex digits, got ${JSON.stringify(input.parent.digest)}`,
      );
    }
  }

  assertIJsonValue(input.payload);

  const u = uuidV7(ctx.uuid, nowMs);
  const h = emit(ctx.hlc, ctx.nodeId, nowMs);

  // A citation is a pair or it is nothing: §7.2 has no state for half of one
  // that a producer may mint on purpose.
  const act: RelayAct = {
    id: u.id,
    thread_id: input.thread_id,
    parent_id: input.parent ? input.parent.id : null,
    parent_digest: input.parent ? input.parent.digest : null,
    type: input.type,
    from: input.from,
    to: [...input.to],
    hlc: h.hlc,
    payload: cloneIJson(input.payload),
  };

  const bytes = canonicalize(act);
  return {
    sealed: deepFreeze({ act, bytes, digest: sha256Hex(bytes) }),
    ctx: { nodeId: ctx.nodeId, hlc: h.state, uuid: u.state },
  };
}
