# Operator notes — from-reach

Not part of the blind material. This records what the readers are not told, and what is
contaminated about the run before anyone answers.

## What this attacks

`relay-0865` concluded that this corpus does not use identity: that nothing decides on `from`,
that 123 records of unresolved name drift produced no symptom, and that rule 14 rests on the
recorded path rather than on any participant. The conclusion is convenient — it says a thing we
cannot build is a thing we do not need.

## The contamination, stated rather than managed

**I wrote the finding and I wrote this contract.** That is the contamination point
`q1-independence.md` names first: *"every choice on it authored by a party with an interest"* —
what is in the bundle, what question is asked, when the run stops. All three are mine here, and
no arrangement of this run fixes that. It is disclosed so a reader of the result can discount it,
not so it can be claimed as handled.

`relay-0799` is the precedent and the warning: its author wrote a stopping rule under which two
of three outcomes ended the cycle, and only noticed afterwards.

## What was withheld, and by what cut

The store in `input/store/` stops at **relay-0861**. Every later record — `relay-0862` through
`relay-0865` — is withheld, because they are this thread's own work on identity and would tell a
reader what the question is for.

**The cut is by time, not by topic.** Curating by subject would be choosing which evidence the
reader sees on exactly the question at issue. 819 records are present; four are not, and this
paragraph is the notice.

`input/rules/AGENTS.md` is today's file, which postdates the finding and contains a section on
`P_E_STORE_IDENTITY`. Shipped rather than trimmed, for the same reason: removing my own additions
on the topic under review would be worse than including them.

## Dispatch

Contract and pin are committed **before any answer exists** — the discipline `q1-independence.md`
§5.4 describes and the one thing about this run that is not contaminated by its author.

Readers: relay-mimo, relay-grok, and a blind `gemini` run on this machine.
relay-mistral-vibe is temporarily unavailable.

## Input pin

    input tree sha256
    6af3bfafc648fc5c665b95111ba3f876a1b7a743fc2b860991b19945faea3621

Computed over `find input -type f | sort | xargs sha256sum | sha256sum`.
