/**
 * What the catalogue has ruled, as data rather than as prose.
 *
 * A settled ruling and the reader's current behaviour are different things, and
 * until now nothing in this repository could tell them apart. I-3 / hivemark was
 * ruled `VIOLATES` at relay-0174; `src/checks/i3.ts` returns `UNDECIDABLE`; and
 * the only places saying so were a relay record and a paragraph in the closing
 * report. Prose does not run.
 *
 * That is OBS-055 again — a rule written down is not a rule enforced, and what
 * people run is not what they read. The I-2 and I-9 amendments were acknowledged
 * by a peer and then contradicted by the same peer's next `sha256sum`, because
 * the correct value had no command behind it.
 *
 * So this table exists to make the divergence observable and to make closing it
 * mechanical: repairing the reader means an entry here stops diverging, and the
 * test says so.
 *
 * ## What it is not
 *
 * Not an override. Nothing here changes a verdict the reader produces, and no
 * run consults it. A ruling is what the catalogue has decided; a finding is what
 * the reader currently reports; the gap between them is a fact about this
 * repository at this commit and is recorded as one.
 */

export interface Ruling {
  readonly invariant: string;
  readonly producer: string;
  /** The verdict the catalogue has settled on. */
  readonly verdict: "CONFORMS" | "VIOLATES" | "NOT_APPLICABLE" | "UNDECIDABLE";
  /** Where the ruling was made. */
  readonly ruledAt: string;
  /** Who decided, since a ruling is not a reading. */
  readonly ruledBy: string;
  readonly grounds: string;
}

export const RULINGS: readonly Ruling[] = [
  {
    invariant: "I-3",
    producer: "hivemark",
    verdict: "VIOLATES",
    ruledAt: "relay-0174",
    ruledBy: "bee.zae",
    grounds:
      "the clause is frozen; the falsifier's condition — a conclusion whose input is not in the corpus — was established by every reader that looked; two independent blind readers fired it on a byte-identical clause; the condition set at relay-0160 for a second independent pass was met",
  },
];

/**
 * Rulings the reader does not yet implement.
 *
 * An entry is a promise that someone knows: it names what the reader returns
 * today and what closing the gap requires. It is not permission to leave it open.
 */
export const NOT_YET_IMPLEMENTED: Readonly<Record<string, string>> = {
  "I-3/hivemark":
    "src/checks/i3.ts returns UNDECIDABLE on the condition it establishes. Closing this means repairing the check and emitting a run, in that order — never editing a report. relay-0174.",
};

export function rulingFor(invariant: string, producer: string): Ruling | undefined {
  return RULINGS.find((r) => r.invariant === invariant && r.producer === producer);
}
