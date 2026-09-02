/**
 * The errno of a thrown value, when it has one.
 *
 * `(error as NodeJS.ErrnoException).code` is an assertion, and an assertion
 * about a thrown value is a guess: reading `.code` off `null` throws from
 * inside the catch and loses the original error. Node's own fs functions always
 * throw a SystemError, so this costs nothing there — but a caller-supplied seam
 * can throw anything, and both `publish` and `readDelivered` have one.
 *
 * Its own module because it belongs to neither of them. It was written once in
 * `publish.ts` and asserted directly in `index.ts`, which is the sixth rule this
 * store has found written down twice.
 */
export function errnoOf(value: unknown): string | undefined {
  return value instanceof Error ? (value as NodeJS.ErrnoException).code : undefined;
}
