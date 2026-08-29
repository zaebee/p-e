/**
 * Record which fields a check actually opened.
 *
 * `RecordingCorpus` measures which *files* a check read, and that granularity is
 * why two defects survived seven runs. `src/checks/i1.ts` and `src/checks/i9.ts`
 * each stated a limit of the corpus — *"the mechanism exists but is never
 * exercised"*, *"has never recorded a failure"* — while never opening the field
 * that contradicts it. Both times `apex/health.json` counted as read, because
 * i2, i3, i4 and i7 read it.
 *
 * A check that opens a file and ignores the deciding field is invisible to
 * file-level coverage. This wrapper watches property access on the parsed value
 * instead, so a claim about the corpus can be compared against what was looked
 * at to make it.
 *
 * Nothing here runs in a conformance run. It exists for the reader-conformance
 * suite, which is external to the reader by construction.
 */

/** Collection keys whose members are normalised to `[*]` rather than named. */
const COLLECTIONS = new Set(["entries", "hosts", "attestations", "log"]);

function isPlain(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !ArrayBuffer.isView(v);
}

/**
 * A deep proxy that adds every property path it is asked for to `seen`.
 *
 * Paths are normalised: an array member and a member of a known collection both
 * read as `[*]`, so `health.entries.car.zae.life.code` is recorded as
 * `health.entries[*].code`. Without that, a declaration of which fields bear on
 * an invariant would have to name all eight hosts, and would go stale the moment
 * the corpus gained a ninth.
 */
export function watch<T>(value: T, path: string, seen: Set<string>): T {
  if (!isPlain(value) && !Array.isArray(value)) return value;

  const collection = Array.isArray(value) || COLLECTIONS.has(path.split(".").pop() ?? "");

  return new Proxy(value as object, {
    get(target, prop, receiver) {
      const held = Reflect.get(target, prop, receiver);
      if (typeof prop === "symbol") return held;
      // Object.keys / Object.values / iteration reach members without naming a
      // field, and recording `length` or `map` as a field read would be noise.
      if (typeof held === "function") return held.bind(target);

      const child = collection ? `${path}[*]` : path === "" ? prop : `${path}.${prop}`;
      if (!collection) seen.add(child);
      return watch(held, child, seen);
    },
    /**
     * `Object.values`, `Object.entries` and spread do not go through `get`.
     *
     * They read members through `getOwnPropertyDescriptor`, so without this trap
     * a check that iterates instead of naming — `Object.values(history.hosts)`,
     * which is what `i5.ts` does — hands back unwrapped objects and every field
     * read after that is invisible. The first version of this file had that hole
     * and reported `i5` as never opening fields it plainly reads.
     *
     * Which is the same blindness the suite exists to detect, one level up: a
     * watcher that measures one access path and reports silence on the others.
     */
    getOwnPropertyDescriptor(target, prop) {
      const desc = Reflect.getOwnPropertyDescriptor(target, prop);
      if (!desc || typeof prop === "symbol" || !("value" in desc)) return desc;

      const child = collection ? `${path}[*]` : path === "" ? prop : `${path}.${prop}`;
      if (!collection) seen.add(child);
      // `configurable: true` or the Proxy invariant rejects a wrapped value for a
      // non-configurable own property.
      return { ...desc, configurable: true, value: watch(desc.value, child, seen) };
    },
    ownKeys(target) {
      return Reflect.ownKeys(target);
    },
  }) as T;
}

/** Every field path recorded, sorted, for comparison against a declaration. */
export function fieldsSeen(seen: ReadonlySet<string>): string[] {
  return [...seen].sort();
}
