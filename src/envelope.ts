/**
 * The §5 envelope, and only the §5 envelope.
 *
 * `subject` is an opaque relation token. The three sources put different roles
 * in this slot — claimant in hivemark, observed in apex, producer in Pollen — so
 * nothing may join records across producers on it, and this type promises
 * nothing about what it denotes. `payload` is opaque by the same rule: carried,
 * never interpreted.
 */
export interface Envelope {
  readonly subject: string;
  readonly occurred_at: string;
  readonly payload: unknown;
  readonly id?: string;
  readonly type?: string;
  readonly version?: string;
  readonly attester?: string;
  /** Where in the frozen corpus this came from, so a finding can be checked. */
  readonly origin: { readonly file: string; readonly index: number };
}
