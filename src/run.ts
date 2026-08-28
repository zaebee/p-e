import { access } from "node:fs/promises";

/**
 * The run number is part of the report's identity, not a convenience.
 *
 * A report written to a fixed path is overwritten by the next execution, and
 * the first result survives only as a diff. That is the same defect I-5 names
 * in hivemark's anchors — a record republished later asserts something about a
 * moment that has passed — reproduced in this project's own output. So the id
 * is required, never defaulted, and never inferred from what is already there.
 */
export function parseRunId(argv: readonly string[]): string {
  const at = argv.indexOf("--run");
  const value = at === -1 ? undefined : argv[at + 1];
  if (value === undefined) {
    throw new Error("--run <NN> is required: the run number is part of the report's identity");
  }
  if (!/^\d{2}$/.test(value)) {
    throw new Error(`--run must be two digits, got ${JSON.stringify(value)}`);
  }
  return value;
}

/** Dated by the corpus extraction, identified by the run. */
export function reportPath(runId: string, extractedAt: string): string {
  const date = extractedAt.slice(0, 10);
  return `docs/reports/${date}-conformance-${runId}.md`;
}

/**
 * Refuse to write over a run that already exists.
 *
 * A hard failure rather than a prompt or a suffix: a previous result is
 * evidence, and the only correct response to a methodology change is a new run
 * beside the old one.
 */
export async function assertFreeToWrite(path: string): Promise<void> {
  try {
    await access(path);
  } catch {
    return;
  }
  throw new Error(
    `${path} already exists. A run is immutable — give a new --run id rather than rewriting one.`,
  );
}
