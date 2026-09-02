import { describe, expect, it } from "vitest";
import { type MintInput, mint, mintContext } from "../src/relay-lite/act.js";
import {
  type CnsName,
  DEFAULT_TTL,
  checkDelivery,
  formatCns,
  parseCns,
} from "../src/relay-lite/cns.js";

const base: MintInput = {
  thread_id: "t-1",
  type: "message",
  from: "agent:claude",
  to: ["agent:mimo", "agent:mistral"],
  payload: { text: "x" },
};
const { sealed } = mint(base, mintContext("node-1"), 1000);

/**
 * Parse, and fail here if it did not. `parseCns(...)!` silences the null the
 * function exists to return, so a regression in parsing would surface as a
 * confusing failure two lines later instead of as a parse failure.
 */
function parsed(filename: string): CnsName {
  const name = parseCns(filename);
  expect(name).not.toBeNull();
  return name as CnsName;
}

describe("CNS names — §2.1", () => {
  it("round-trips through format and parse", () => {
    const name = formatCns(sealed.act, "agent:mimo");
    const parsed = parseCns(name);
    expect(parsed).toMatchObject({
      to: "agent:mimo",
      from: "agent:claude",
      thread: "t-1",
      id: sealed.act.id,
    });
  });

  it("returns null for a name that is not one", () => {
    expect(parseCns("notes.txt")).toBeNull();
    expect(parseCns("to=a;from=b.json")).toBeNull();
  });
});

describe("checkDelivery — §2's two claims", () => {
  // "CNS.to is an element of the act's to[], or to[] == ["all"]."
  it("refuses a leg naming a recipient outside the audience", () => {
    const name = parsed(formatCns(sealed.act, "agent:mimo"));
    const forged = { ...name, to: "agent:someone-else" };
    expect(checkDelivery(forged, sealed.act)).toEqual({
      ok: false,
      reason: "recipient-not-in-audience",
    });
  });

  it("admits any recipient when the audience is all", () => {
    const open = mint({ ...base, to: ["all"] }, mintContext("node-1"), 1000).sealed;
    const name = parsed(formatCns(open.act, "all"));
    expect(checkDelivery({ ...name, to: "agent:anyone" }, open.act)).toEqual({ ok: true });
  });

  // "CNS.id == act.id."
  it("refuses a name disagreeing with the sealed body", () => {
    const name = parsed(formatCns(sealed.act, "agent:mimo"));
    expect(
      checkDelivery({ ...name, id: "0192aaaa-0000-7000-8000-000000000000" }, sealed.act),
    ).toEqual({ ok: false, reason: "id-mismatch" });
  });

  it("admits a well-formed leg", () => {
    const name = parsed(formatCns(sealed.act, "agent:mistral"));
    expect(checkDelivery(name, sealed.act)).toEqual({ ok: true });
  });
});

describe("the name is also a filename — issue #35", () => {
  it("refuses a recipient that would inject a field or a path", () => {
    // `recipient` is this function's own argument and reaches no other check.
    // Task 4's whitelist guards what it seals; it never saw this value.
    //
    //   "a;to=agent:victim"  ->  a name a parser reads as addressed elsewhere
    //   "../../../tmp/x"     ->  join(inDir, name) resolving outside in/
    for (const bad of ["a;to=agent:victim", "../../../tmp/x", "a;ttl=99", "a/b", "", " "]) {
      expect(() => formatCns(sealed.act, bad)).toThrow(/recipient/);
    }
  });

  it("re-checks the act's own fields, since an act can arrive from the wire", () => {
    // Minting validated these, but `formatCns` may be handed an act nothing in
    // this process minted.
    const forged = { ...sealed.act, from: "b;to=agent:victim" };
    expect(() => formatCns(forged, "agent:mimo")).toThrow(/act\.from/);
    expect(() => formatCns({ ...sealed.act, thread_id: "../x" }, "agent:mimo")).toThrow(
      /act\.thread_id/,
    );
  });
});

describe("ttl, which the spec leaves open — issue #37", () => {
  it("writes the ttl a caller chooses, and round-trips it", () => {
    const name = formatCns(sealed.act, "agent:mimo", 3600);
    expect(name).toContain(";ttl=3600;");
    expect(parsed(name).ttl).toBe(3600);
  });

  it("refuses a ttl it would then refuse to parse", () => {
    // The same grammar on both sides, so this function cannot write a name
    // `parseCns` would reject.
    for (const bad of [
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      1e21,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() => formatCns(sealed.act, "agent:mimo", bad)).toThrow(/ttlSeconds/);
    }
    // The boundary itself is fine.
    expect(() => formatCns(sealed.act, "agent:mimo", Number.MAX_SAFE_INTEGER)).not.toThrow();
  });

  it("refuses a ttl on disk that cannot be read back as itself", () => {
    // The grammar admits any run of digits, so this passes `SECONDS` and then
    // loses precision on the way to a number — a name whose ttl is not the
    // value it was written from.
    const ID = sealed.act.id;
    expect(parseCns(`to=a;from=c;thread=t;ttl=9007199254740993;id=${ID}.json`)).toBeNull();
    expect(parseCns(`to=a;from=c;thread=t;ttl=${"9".repeat(30)};id=${ID}.json`)).toBeNull();
    // And the boundary parses.
    expect(parseCns(`to=a;from=c;thread=t;ttl=9007199254740991;id=${ID}.json`)?.ttl).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it("still defaults to the plan's zero", () => {
    // Kept, not endorsed. §4.1 says a sweeper moves entries "past their TTL" to
    // errata/ and never says what zero means; under one reading every delivery
    // is expired the moment it is written. See #37.
    expect(formatCns(sealed.act, "agent:mimo")).toContain(";ttl=0;");
    expect(DEFAULT_TTL).toBe(0);
  });
});

describe("parseCns reads a disk nobody here wrote", () => {
  const ID = sealed.act.id;

  it("refuses a duplicate field instead of resolving it", () => {
    // A `Map` kept the last, so `to=a;to=b;…` parsed as `to=b` — a name
    // claiming a recipient its writer did not put first. §2.1 asks for no such
    // resolution; that was `Map` deciding, not the spec.
    expect(parseCns(`to=a;to=b;from=c;thread=t;ttl=0;id=${ID}.json`)).toBeNull();
  });

  it("refuses a field §2.1 does not define, and a field out of order", () => {
    expect(parseCns(`to=a;from=c;thread=t;ttl=0;id=${ID};extra=x.json`)).toBeNull();
    expect(parseCns(`from=c;to=a;thread=t;ttl=0;id=${ID}.json`)).toBeNull();
    expect(parseCns(`=empty;to=a;from=c;thread=t;ttl=0;id=${ID}.json`)).toBeNull();
  });

  it("refuses a ttl that is not §2.1's <seconds>", () => {
    // `Number` read `0x10` as 16, `1e3` as 1000 and `" 5"` as 5. Each lets two
    // readers of one name disagree about when it expires.
    for (const ttl of ["0x10", "1e3", " 5", "-0", "-1", "1.5", "", "01", "Infinity"]) {
      expect(parseCns(`to=a;from=c;thread=t;ttl=${ttl};id=${ID}.json`)).toBeNull();
    }
    expect(parseCns(`to=a;from=c;thread=t;ttl=0;id=${ID}.json`)).not.toBeNull();
    expect(parseCns(`to=a;from=c;thread=t;ttl=3600;id=${ID}.json`)).not.toBeNull();
  });

  it("refuses an id that is not §2.1's <uuidv7>", () => {
    for (const id of ["not-a-uuid", "00000000-0000-4000-8000-000000000000", ID.toUpperCase()]) {
      expect(parseCns(`to=a;from=c;thread=t;ttl=0;id=${id}.json`)).toBeNull();
    }
  });

  it("refuses a name whose values are outside the alphabet", () => {
    expect(parseCns(`to=../../x;from=c;thread=t;ttl=0;id=${ID}.json`)).toBeNull();
    expect(parseCns(`to=a;from=../c;thread=t;ttl=0;id=${ID}.json`)).toBeNull();
  });

  it("still round-trips every name formatCns produces", () => {
    for (const recipient of ["agent:mimo", "all", "bee.zae", "relay-mimo", "x_1"]) {
      const name = formatCns(sealed.act, recipient);
      expect(parsed(name).to).toBe(recipient);
    }
  });
});
