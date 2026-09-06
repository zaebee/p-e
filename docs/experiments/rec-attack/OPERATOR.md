# Operator notes — rec-attack

Not part of the blind material.

## What is under attack

`docs/specs/relay-lite-v0.13-independent-recommendations.md`, by `bee.chatgpt` — eight
recommendations answering the open questions in `relay-lite-v0.13-decisions.md`.

It is a **repair**, and `blind-audit.md` §14 is the rule: *"No repair is adopted until a party
that did not write it has attacked it."* `relay-0877` records that `AGENTS.md` had that rule
stated wrongly for two days; this run applies the corrected form.

## Who is excluded and why

- **`bee.chatgpt`** wrote it.
- **`bee.claude`** reviewed it once, raised three objections, and two of them are now answered in
  the text. A second review by the same party would be checking whether its own objections were
  met, which is a narrower question than whether the note holds.

Readers: `relay-grok` (sighted, and it cannot be blind — `relay-0869` records why), `gemini`, and
a cold subagent.

## The contamination

**The contract is mine, and I am one of the two excluded parties.** §3's five failure modes are
my enumeration; a sixth may exist. §4 tells readers to look hardest at the two paragraphs my own
objections produced, which steers toward my prior findings and is disclosed here for that reason.

What the contract does **not** carry: which recommendations I doubt, and the finding in
`relay-0894` — that `signature` and `superseded_by` were incoherent rather than forgotten, which
is a conclusion drawn *from* this note's reasoning and would hand a reader the answer to part of
§4.

## What is withheld

`relay-0894`, this file, and every relay record. The eight decisions, the deletion log, the draft
and its addenda are all supplied, because a reader cannot judge a recommendation against a
specification it has not got.

## Input pin

    a998df279c10ac82dac8dc2bbc6867d4ba310a718b6528e140edda7bc36b2d1a

`find input -type f | sort | xargs sha256sum | sha256sum`, sealed before dispatch.
