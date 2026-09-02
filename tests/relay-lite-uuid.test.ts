import { describe, expect, it } from "vitest";
import { UUID_START, uuidV7 } from "../src/relay-lite/uuid.js";

describe("uuidV7", () => {
  it("sets version 7 and the RFC 4122 variant", () => {
    const { id } = uuidV7(UUID_START, 1_700_000_000_000);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("orders by time across milliseconds", () => {
    const a = uuidV7(UUID_START, 1_700_000_000_000);
    const b = uuidV7(a.state, 1_700_000_000_001);
    expect(b.id > a.id).toBe(true);
  });

  // RFC 9562 section 6.2 method 1: a counter in rand_a separates ids minted
  // inside one millisecond, which the timestamp alone cannot.
  it("stays unique and ordered within a single millisecond", () => {
    let s = UUID_START;
    const ids: string[] = [];
    for (let i = 0; i < 500; i++) {
      const r = uuidV7(s, 1_700_000_000_000);
      ids.push(r.id);
      s = r.state;
    }
    expect(new Set(ids).size).toBe(500);
    expect([...ids].sort()).toEqual(ids);
  });

  // The overflow branch, which no other test reaches: the counter is seeded in
  // the lower half of rand_a, so a millisecond holds around 2300 ids and the 500
  // above stop well short of it. Uniqueness is the load-bearing property here —
  // a mis-ordering degrades a presentation, a collision merges two distinct acts
  // — and this is the one path where it could break.
  it("stays unique and ordered past the counter's width", () => {
    let s = UUID_START;
    const ids: string[] = [];
    for (let i = 0; i < 20_000; i++) {
      const r = uuidV7(s, 1_700_000_000_000);
      ids.push(r.id);
      s = r.state;
    }
    expect(new Set(ids).size).toBe(20_000);
    expect([...ids].sort()).toEqual(ids);
    // Version and variant must survive the path that mints its own millisecond.
    // Counted rather than asserted per id: 20000 `expect` calls cost more than
    // the 20000 matches they wrap, and a count names the failure just as well.
    const shape = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(ids.filter((id) => !shape.test(id))).toEqual([]);
    // The timestamp runs ahead of the clock rather than blocking or repeating,
    // and by a bounded amount: 20000 ids cost single-digit milliseconds.
    expect(s.lastMs).toBeGreaterThan(1_700_000_000_000);
    expect(s.lastMs).toBeLessThan(1_700_000_000_020);
  });

  // A clock that steps backwards must not produce an id sorting before one
  // already issued. Same shape as the HLC's max(physical, last).
  it("does not go backwards when the clock does", () => {
    const a = uuidV7(UUID_START, 1_700_000_000_050);
    const b = uuidV7(a.state, 1_700_000_000_000);
    expect(b.id > a.id).toBe(true);
    expect(b.state.lastMs).toBe(1_700_000_000_050);
  });
});
