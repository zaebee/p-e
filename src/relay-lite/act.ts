import { assertIJsonValue, canonicalize, isDigest, sha256Hex } from "./canonical.js";
import { HLC_START, type Hlc, type HlcState, emit } from "./hlc.js";
import { assertNameable } from "./names.js";
import { UUID_START, type UuidState, isUuidV7, uuidV7 } from "./uuid.js";

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

/**
 * §3's five act types, as a value rather than only a type.
 *
 * The union was a compile-time claim and `mint` checked nothing at runtime, on
 * the reasoning that TypeScript covers the producer. It covers the *typed*
 * producer: `mint({...input, type: "gossip" as never})` sealed and published an
 * act that this store's own stage 2 refuses as `not-an-act`. A node that can
 * mint what it will not accept has no use for either answer.
 *
 * Exported so `verify.ts` reads the same set instead of restating it — the
 * fourth rule in this store to have been written down twice.
 */
export const ACT_TYPES = new Set(["message", "claim", "challenge", "ruling", "erratum"]);

export function isActType(value: unknown): value is RelayAct["type"] {
  return typeof value === "string" && ACT_TYPES.has(value);
}

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

export interface SealedAct<T = unknown> {
  readonly act: RelayAct<T>;
  readonly bytes: string;
  readonly digest: string;
}

export interface MintContext {
  readonly nodeId: string;
  readonly hlc: HlcState;
  readonly uuid: UuidState;
}

export interface MintInput<T = unknown> {
  readonly thread_id: string;
  readonly type: RelayAct["type"];
  readonly from: string;
  readonly to: readonly string[];
  readonly payload: T;
  readonly parent?: { readonly id: string; readonly digest: string } | null;
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

/**
 * Everything a caller may hand `mint`, refused before anything is sealed.
 *
 * Gathered here for the reason `publish`'s checks were: SonarCloud counts the
 * function that follows at the complexity limit, and a reader asking what
 * minting refuses should find the answer in one place rather than in front of
 * the code that builds the act.
 */
/**
 * §7.2's citation, checked as a pair or not at all.
 *
 * Its own function because a citation is its own question — and because the
 * checks around it were enough, together, to put `checkInput` over the
 * complexity limit on their own.
 */
function checkCitation(parent: MintInput<unknown>["parent"]): void {
  if (parent === null || parent === undefined) return;
  if (typeof parent !== "object" || Array.isArray(parent)) {
    // Checked before its fields, so a citation that is not a citation is
    // reported as one rather than as `parent.id must be a non-empty string,
    // got undefined`, which names a field of something that has none. Arrays
    // need saying separately: `typeof []` is "object".
    const what = Array.isArray(parent) ? "array" : typeof parent;
    throw new Error(`parent must be an object or null, got ${what}`);
  }

  // §7.2 [MUST]: "A citation carries both handles — the locator and the
  // digest." Its table reads `null` against *set*, and an empty string is set —
  // so half a citation minted this way is not `NO_PARENT`, it is a pair that
  // matches no stored record. Every verifier holding the parent then returns
  // DIVERGES, which §7.2 marks an author defect. Refusing here is the
  // difference between a producer's typo and a permanent accusation.
  //
  // A uuidv7 rather than merely a nameable string: `parent_id` locates a
  // predecessor, and predecessors are acts whose ids this store mints, so a
  // non-uuid names nothing that can exist.
  if (!isUuidV7(parent.id)) {
    throw new Error(`parent.id must be a uuidv7, got ${JSON.stringify(parent.id)}`);
  }
  if (!isDigest(parent.digest)) {
    throw new Error(
      `parent.digest must be 64 lowercase hex digits, got ${JSON.stringify(parent.digest)}`,
    );
  }
}

function checkInput(input: MintInput<unknown>): void {
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
  if (!isActType(input.type)) {
    throw new TypeError(`type must be one of §3's five, got ${JSON.stringify(input.type)}`);
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

  checkCitation(input.parent);
}

export function mint<T>(
  input: MintInput<T>,
  ctx: MintContext,
  nowMs: number,
): { sealed: SealedAct<T>; ctx: MintContext } {
  checkInput(input);
  assertIJsonValue(input.payload);

  const u = uuidV7(ctx.uuid, nowMs);
  const h = emit(ctx.hlc, ctx.nodeId, nowMs);

  // A citation is a pair or it is nothing: §7.2 has no state for half of one
  // that a producer may mint on purpose.
  const act: RelayAct<T> = {
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
