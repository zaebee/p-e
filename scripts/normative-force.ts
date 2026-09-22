/**
 * Does a model read normative force, or does it read normative markers?
 *
 * Contract and pre-registered key: `docs/experiments/normative-force/`. The key was committed
 * before this ran. Ten passages of `relay-lite-v0.12-draft.md`, each asked the same question in
 * the same words, in two conditions: the document as written, and the document with every
 * `**[MUST]**` and `**[MUST NOT]**` removed.
 *
 * Not a conformance run. Writes no report into `docs/reports/` and changes no catalogue.
 *
 * The key is read from `TYPESAFE_API_KEY` and never printed. Nothing here echoes the
 * environment.
 */

export {};

const DRAFT = "docs/specs/relay-lite-v0.12-draft.md";
const ENDPOINT = "https://api.typesafe.ai/v1/systemone";

/** One line range of the draft, with the answer `CANDIDATES.md` §5 gives for it. */
interface Item {
  id: string;
  from: number;
  to: number;
  key: "binding" | "descriptive";
  /** What a reader of markers alone would answer. */
  marker: "binding" | "descriptive";
}

const ITEMS: Item[] = [
  { id: "i01-hlc-retick", from: 93, to: 93, key: "binding", marker: "binding" },
  { id: "i02-linear-projection", from: 126, to: 127, key: "binding", marker: "binding" },
  { id: "i03-parse-before-digest", from: 264, to: 266, key: "binding", marker: "binding" },
  { id: "i04-dag", from: 124, to: 124, key: "binding", marker: "binding" },
  { id: "i05-citation-handles", from: 276, to: 276, key: "binding", marker: "binding" },
  { id: "i06-partial-visibility", from: 293, to: 294, key: "descriptive", marker: "descriptive" },
  { id: "i07-flat-presentation", from: 129, to: 129, key: "descriptive", marker: "descriptive" },
  { id: "i08-dedup-rationale", from: 137, to: 139, key: "descriptive", marker: "descriptive" },
  { id: "i09-stage-ordering", from: 258, to: 259, key: "binding", marker: "descriptive" },
  { id: "i10-stage-one-hashing", from: 261, to: 262, key: "descriptive", marker: "descriptive" },
];

/**
 * Asked identically of every passage. Any wording that fits one item better than another would
 * be the question answering itself — `relay-0799`, and the reason this run produces candidates
 * rather than verdicts.
 */
const CRITERIA = {
  binding: "An implementation that did the opposite of this passage would be non-conforming.",
  descriptive:
    "The passage states what is the case, what follows from something, or why a rule exists. No implementation can violate it.",
};

function instructions(passage: string): string {
  return [
    "The state is a protocol specification. Consider only this passage from it:",
    "",
    passage,
    "",
    "Does that passage bind an implementation, or describe?",
  ].join("\n");
}

/** Removes the marking convention and nothing else — sentences are left as they stand. */
function stripMarkers(text: string): string {
  return text.replaceAll("**[MUST NOT]** ", "").replaceAll("**[MUST]** ", "");
}

async function ask(
  apiKey: string,
  state: string,
  passages: Map<string, string>,
): Promise<Record<string, { choice: string; confidence: number }>> {
  const questions = Object.fromEntries(
    [...passages].map(([id, passage]) => [
      id,
      { type: "choice", instructions: instructions(passage), criteria: CRITERIA },
    ]),
  );
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ state, model: "jev-latest", questions }),
  });
  if (!response.ok) {
    // The body can carry the request id, which is worth having; it does not carry the key.
    throw new Error(`${ENDPOINT} returned ${response.status}: ${await response.text()}`);
  }
  const body = (await response.json()) as {
    answers?: Record<string, { choice?: unknown; confidence?: unknown }>;
    usage?: { input_tokens?: unknown };
  };
  if (!body?.answers) throw new Error(`${ENDPOINT} returned no answers`);
  if (body.usage) console.log(`  input tokens: ${Number(body.usage.input_tokens)}`);
  // Everything below this line is a third party's output, and this script's printed table is
  // transcribed into a recorded measurement. An unconstrained string would let the endpoint
  // write lines of that record, so a value that is not one of the two choices is shown as
  // invalid rather than shown.
  return Object.fromEntries(
    [...passages.keys()].map((id) => {
      const a = body.answers?.[id];
      const choice = a?.choice === "binding" || a?.choice === "descriptive" ? a.choice : "INVALID";
      const confidence = Number(a?.confidence);
      return [id, { choice, confidence: Number.isFinite(confidence) ? confidence : Number.NaN }];
    }),
  );
}

function score(answers: Record<string, { choice: string; confidence: number }>): number {
  let correct = 0;
  console.log("  item                      key           answered      confidence");
  for (const item of ITEMS) {
    const got = answers[item.id];
    const hit = got?.choice === item.key;
    if (hit) correct++;
    console.log(
      `  ${item.id.padEnd(24)}  ${item.key.padEnd(12)}  ${(got?.choice ?? "—").padEnd(12)}  ` +
        `${got && Number.isFinite(got.confidence) ? got.confidence.toFixed(2) : "—"}  ` +
        `${hit ? "" : "MISS"}`,
    );
  }
  return correct;
}

const apiKey = process.env.TYPESAFE_API_KEY;
if (!apiKey) {
  console.error(
    "TYPESAFE_API_KEY is not set. Put it in .env, which is never committed, and never echo it.",
  );
  process.exit(2);
}

const draft = await Bun.file(DRAFT).text();
const lines = draft.split("\n");
const passages = new Map(
  ITEMS.map((i) => [
    i.id,
    lines
      .slice(i.from - 1, i.to)
      .join("\n")
      .trim(),
  ]),
);

const markerBaseline = ITEMS.filter((i) => i.marker === i.key).length;
console.log(`marker-reader baseline, condition A: ${markerBaseline}/${ITEMS.length}\n`);

console.log("condition A — the document as written");
const a = await ask(apiKey, draft, passages);
const scoreA = score(a);
console.log(`  jev: ${scoreA}/${ITEMS.length}\n`);

console.log("condition B — every [MUST] and [MUST NOT] marker removed");
const strippedPassages = new Map([...passages].map(([id, p]) => [id, stripMarkers(p)]));
const b = await ask(apiKey, stripMarkers(draft), strippedPassages);
const scoreB = score(b);
console.log(`  jev: ${scoreB}/${ITEMS.length}`);

console.log(
  "\nA result about ten passages. Not a rate, not a verdict — candidates, under rule 14.",
);
