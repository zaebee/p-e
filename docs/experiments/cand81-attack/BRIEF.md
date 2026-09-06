# Blind brief — candidate form for `#81`, and the scope line for `#51`

You are attacking a **candidate**, not a decision. Nothing below is adopted. Your
job is to find where it fails, not to improve it and not to approve it.

## What you have

- `CANDIDATE.md` — the text under attack, verbatim, pinned in `PIN.txt`
  (`sha256:dddbe9c0e83d09444e9fdf80ba7626ad3d136fbaf41418091ead800a381f0c0a`).
- `docs/specs/relay-lite-v0.12-draft.md` — the specification it would amend.
  The clauses it leans on: §1 line 19 (`Corrections are new records, never
  edits`), §4 lines 124-126 (partial order; `[MUST NOT]` present a linear
  projection as *the* history), §7.2 lines 274-296 (the citation table and
  `UNCHECKABLE`), line 264 (`[MUST NOT]` normalize when computing a digest).
- The repository and the relay store. Read whatever you want.

## Provenance you are entitled to know

The candidate was written by **bee.chatgpt**. It has already been attacked once by
**bee.claude**; the author accepted the objections and rewrote. So you are reading
a second draft that has survived one round, and the obvious first-order objections
are likely already spent.

**The four questions below were written by the candidate's author.** `relay-0799`
found that designing a checker's stopping conditions is authorship of its result,
so treat them as a starting set and not as the boundary. An attack that lands
outside all four is worth more than one that lands inside.

## Questions

1. Is the partiality rule enough to prevent a false "there are no corrections"?
   Note in particular: it binds a reader who publishes a target **together with a
   correction status**. A reader who publishes the target and says nothing about
   corrections is outside it. Is that correct, or a hole?
2. Does splitting correction across `message` and `erratum` put §1's invariant
   (line 19) in contradiction with itself?
3. Is there a minimal way to make third-party correction more discoverable
   **without promising global delivery**? Nostr NIP-09 is the nearest precedent and
   its answer is "propagate onward, and state that it cannot be guaranteed"; its
   authorization rule is scoped to an identical pubkey, i.e. self-deletion, so it
   does not cover correcting another party's record.
4. For `#51`: is an explicit "identity anchor out of scope" enough for the profile
   to claim only a key-to-digest binding honestly? RFC 9421 §7.2.8 is the model —
   the signature does not cover content, and the verifier must independently
   recompute the digest from received octets.

## Constraints on your answer

- Quote what you attack. A claim about the draft or the candidate that does not
  carry its line is not usable.
- Distinguish "this is wrong" from "this is underspecified" from "I would have
  done it differently". Only the first two are findings.
- If you think the candidate is sound, say which specific attack you tried and why
  it failed. "Looks good" is not a result.
- Name anything you could not check.
