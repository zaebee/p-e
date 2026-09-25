/**
 * Reader 3 of `docs/experiments/rounds-read/` — `jev-1.13` on the reduced question.
 *
 * Stand, key and the reduction's justification: `docs/experiments/rounds-read/JEV-STAND.md`,
 * registered before this ran. Not the sealed `CONTRACT.md`, which this model cannot execute: it
 * cannot search, and three of the five sealed verdicts turn on facts about the thread, which does
 * not fit beside the draft in one state.
 *
 * Each undertaking's text travels in its own question, extracted from the thread by the line
 * numbers already in `ITEMS.md`. The state is the draft and its three addenda.
 *
 * Not a conformance run. Writes no report into `docs/reports/` and changes no catalogue.
 *
 * The key is read from `TYPESAFE_API_KEY` and never printed.
 */

export {};

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const THREAD = "docs/sources/issue-5-thread.txt";
const ITEMS = "docs/experiments/rounds-read/ITEMS.md";
const STATE_FILES = [
  "docs/specs/relay-lite-v0.12-draft.md",
  "docs/specs/relay-lite-v0.12-addendum-clock.md",
  "docs/specs/relay-lite-v0.12-addendum-identifiers.md",
  "docs/specs/relay-lite-v0.12-addendum-ttl.md",
];

/** From `RESULT.md`, established by two blind readers against a predicate sealed before both. */
const INCOMPLETE = new Set([3, 5, 6, 11, 28, 46]);
/** Adjudicated rather than agreed, by a party `RESULT.md` names as interested. */
const WEAK_KEY = new Set([6, 28]);
/** Contested between the two readers and left contested — answered, not scored. */
const UNSCORED = new Set([30]);

const CRITERIA = {
  arrived:
    "The specification carries what this undertaking promised, recognisably. The wording may differ.",
  incomplete: "Some component this undertaking promised is not in the specification.",
};

function instructions(text: string): string {
  return [
    "The state is a protocol specification and its addenda.",
    "During review, this undertaking was made about what the specification would contain:",
    "",
    text,
    "",
    "Did the specification receive it?",
  ].join("\n");
}

const itemsDoc = await Bun.file(ITEMS).text();
const marks = [...itemsDoc.matchAll(/^ *(\d+)\. \*\*line (\d+)\*\*/gm)].map((m) => ({
  n: Number(m[1]),
  line: Number(m[2]),
}));
if (marks.length !== 46) throw new Error(`expected 46 undertakings, parsed ${marks.length}`);

// ITEMS.md: "The item runs from its own line to the next numbered item or the end of its
// response section." Taken whole rather than truncated — a cap would be a choice about what the
// undertaking says, made by the party scoring the answer.
const threadLines = (await Bun.file(THREAD).text()).split("\n");
const undertakings = marks.map((m, i) => {
  const next = marks[i + 1];
  return {
    ...m,
    text: threadLines
      .slice(m.line - 1, next ? next.line - 1 : threadLines.length)
      .join("\n")
      .trim(),
  };
});

const state = (
  await Promise.all(STATE_FILES.map(async (f) => `=== ${f} ===\n\n${await Bun.file(f).text()}`))
).join("\n\n");

const apiKey = process.env.TYPESAFE_API_KEY;
if (!apiKey) {
  console.error("TYPESAFE_API_KEY is not set. Put it in .env, which is never committed.");
  process.exit(2);
}

const questions = Object.fromEntries(
  undertakings.map((u) => [
    `item${String(u.n).padStart(2, "0")}`,
    { type: "choice", instructions: instructions(u.text), criteria: CRITERIA },
  ]),
);

const response = await fetch(ENDPOINT, {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({ state, model: "jev-latest", questions }),
});
if (!response.ok) {
  throw new Error(`${ENDPOINT} returned ${response.status}: ${await response.text()}`);
}
const body = (await response.json()) as {
  answers?: Record<string, { choice?: unknown; confidence?: unknown }>;
  usage?: { input_tokens?: unknown };
};
if (!body?.answers) throw new Error(`${ENDPOINT} returned no answers`);

// The answers are a third party's output and this script's printed table is transcribed into a
// recorded measurement, so an unconstrained string would let the endpoint write lines of that
// record. A value that is not one of the two choices is shown as invalid rather than shown.
function answerFor(n: number): { choice: string; confidence: number } {
  const a = body.answers?.[`item${String(n).padStart(2, "0")}`];
  const confidence = Number(a?.confidence);
  return {
    choice: a?.choice === "arrived" || a?.choice === "incomplete" ? a.choice : "INVALID",
    confidence: Number.isFinite(confidence) ? confidence : Number.NaN,
  };
}

function keyFor(n: number): string {
  if (UNSCORED.has(n)) return "—";
  return INCOMPLETE.has(n) ? "incomplete" : "arrived";
}

console.log(`state: ${state.length} chars over ${STATE_FILES.length} files`);
if (body.usage) console.log(`input tokens: ${Number(body.usage.input_tokens)}\n`);

const flagged: number[] = [];
const falsePositives: number[] = [];
const dissent: number[] = [];

for (const u of undertakings) {
  const got = answerFor(u.n);
  const keyed = keyFor(u.n);
  const note: string[] = [];
  if (UNSCORED.has(u.n)) note.push("CONTESTED, unscored");
  else if (INCOMPLETE.has(u.n)) {
    if (got.choice === "incomplete") {
      flagged.push(u.n);
      note.push("FOUND");
    } else {
      note.push("missed");
      if (WEAK_KEY.has(u.n)) dissent.push(u.n);
    }
    if (WEAK_KEY.has(u.n)) note.push("key adjudicated, not agreed");
  } else if (got.choice === "incomplete") {
    falsePositives.push(u.n);
    note.push("flags what the key calls arrived");
  }
  console.log(
    `item ${String(u.n).padStart(2)}  line ${String(u.line).padStart(4)}  ` +
      `key ${keyed.padEnd(10)}  jev ${got.choice.padEnd(10)}  ` +
      `${Number.isFinite(got.confidence) ? got.confidence.toFixed(2) : "—"}  ${note.join("; ")}`,
  );
}

console.log(`\nof the six the key calls incomplete, found: ${flagged.length} — ${flagged}`);
console.log(`flagged where the key says arrived: ${falsePositives.length} — ${falsePositives}`);
if (dissent.length) console.log(`dissent on an adjudicated entry: ${dissent}`);
console.log("\nbaseline answering 'arrived' to everything: 39/45.");
console.log("A reading, not a verdict — candidates, under rule 14.");
