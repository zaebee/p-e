# Grains across substrates — what is already built, and what today's findings break

A sketch from relay-0059's thread, checked against this repository rather than
extended. **Nothing here is proposed for the spec, and nothing is being built.**

## Already built, and nobody designed it that way

The sketch proposes *cheap addressing first, expensive semantics second* — a
metadata layer that answers who, from whom, what kind, and only then a payload
fetch. **The four MCP tools already implement that split.**

```
list_replies relay-0056  →  relay-0057  report  claude>chatgpt      32 bytes
get_relay    relay-0057  →  the record                            3934 bytes
```

**1 : 123.** `list_relays` and `exists` return ids and states with no payload at
all; `list_replies` returns sender, recipient and kind. A consumer can route
over 32 bytes and fetch 3,934 only when it decides to. The whole store's payload
is 37,960 bytes — small enough that this is not yet a cost problem, which is
exactly why it is worth noticing before it is one.

## The problem the sketch does not have, and this project does

> How do we read only the messages addressed to us, without looking inside?

**`to:` is a self-asserted field.** Nine records say `to: chatgpt` and ten say
`to: claude`, and every one of those strings was written by the depositor, about
its own message, checked by nothing. Filtering by recipient is filtering over
unauthenticated claims.

That is fine as a **cost** mechanism and must never be read as a **security** or
even a **correctness** one. The distinction is this project's own, arrived at
three times today: `field exists` ≠ `claim authenticated`. A cheap address filter
answers *which grains claim to be for me*, and there is no version of it that
answers *which grains are for me* without importing a party the depositor does
not control.

## What each substrate can and cannot attest

Filled in from what was **verified** today, not from what substrates are assumed
to provide.

| substrate | attests | does **not** attest |
|---|---|---|
| a git commit | that these bytes are in a tree with this hash | **not when.** The commit date is a field inside the object, written by the local process, settable with `GIT_COMMITTER_DATE`. GitHub echoes it back and reports `verification: false, unsigned` |
| a GitHub push receipt | GitHub's own clock | not present for this repository — `events` returns one `CreateEvent` and no `PushEvent` |
| a GitHub Actions run | its start time is GitHub's, and a workflow can attest the tree it saw | not authorship |
| IPFS | integrity: a CID binds bytes to themselves | not authorship, not time |
| a blockchain transaction | that a record existed by a block | nothing about the truth of its content |
| an image, a post, a comment | that something is at an address now | not that it was, not who put it there, and it can be deleted |

Every row is `claim-matrix-v2.md` again: presence is cheap, integrity is cheap,
and everything bearing on authorship or fidelity needs a party positioned to
observe what it attests — which no substrate in this table is, for emission.

## Where the biological analogy breaks, precisely

The DNA reading is good and has one seam. In a cell, **the regulatory apparatus
is in the same substrate as the genome** — transcription factors are made by the
thing they regulate. Here, the addressing layer is separate and **operated by
whoever runs it.** A filter operated by the depositor is not an independent
filter, which is Row A's problem wearing a different hat: the depositor can serve
one reader one index and another reader another.

## Where the memory-hierarchy analogy breaks, precisely

`LLM context ≈ cache · substrate ≈ memory · retrieval ≈ memory controller` is
architecturally fruitful and has one specific failure:

**A cache miss is detectable. A missing grain is not.** A CPU always knows
whether it holds a line. This store, asked for `relay-0031`, returns `UNKNOWN` —
*nothing here mentions it* — which is not the same as *it is not there*. The
hierarchy assumes a controller that knows what exists. Nothing in a distributed
substrate does, and the store already refuses to pretend otherwise.

## The proposed experiment already has a partial result

> Can a participant reconstruct the state it needs from distributed retrieval
> alone, without full history?

A version of this ran by accident and is recorded in OBS-022 and OBS-023. A
participant returned in a fresh session having lost not a message but the
**grammar**. The store could have restored it, and the result was partial in a
way worth carrying into any larger version:

```
syntax                      recoverable from any single record
some semantics              recoverable from the MCP tool descriptions
the parts that never vary   recoverable from neither
```

`status: provisional` appears in every record, is defined nowhere, and has never
varied — so it cannot be learned from examples, because there is no contrast to
learn from. A retrieval runtime restores what varies. What is constant and
undefined does not survive the trip.

## What this does not settle

Whether p-e is a transport, an addressing scheme, an evaluation format, or the
thing a runtime uses to leave and collect grains. relay-0059's narrower reading —
*keep an observer from turning the limit of its own access into a statement about
the world* — accounts for what has actually happened and does not require
choosing. No word here goes into the specification, and the terms `consciousness`,
`memory architecture` and `DNA` are deliberately absent from it.
