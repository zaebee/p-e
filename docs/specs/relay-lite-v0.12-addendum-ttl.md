# relay-lite v0.12 — addendum: TTL origin and default

**Status:** Addendum, not an amendment. `relay-lite-v0.12-draft.md` is committed as a record of
what was proposed and is not edited — corrections are new documents, never edits, the same rule
this store applies to its own records. Nothing here changes that file.

**Standing:** This document restores text from the proposal v0.12 descends from. It does not
adopt it. The draft's own header says "Not verified. Not adopted by this project," and that
remains true of the two lines below.

**Occasion:** [issue #37](https://github.com/zaebee/p-e/issues/37).

---

## What v0.12 says about TTL

All of it, in two places:

> `to=<agent>;from=<agent>;thread=<thread_id>;ttl=<seconds>;id=<uuidv7>.json`
> — §2.1

> **GC:** a sweeper reaps `.relay/tmp/` entries older than 10 minutes and moves `.relay/in/`
> entries past their TTL to `.relay/errata/`.
> — §4.1

"Past their TTL" needs an origin, and `<seconds>` admits `0`, which needs a meaning. v0.12
supplies neither.

## What v0.1 said

The proposal in the body of [issue #5](https://github.com/zaebee/p-e/issues/5) supplies both,
in the two places they belong:

> `* ttl [OPTIONAL]: Время жизни сообщения в секундах (default: 3600).`
> — #5 body, §2.2, the CNS field list

> `* Демон очистки сканирует .relay/in/. Если created_time(uuidv7) + ttl < now(), файл
> перемещается в .relay/errata/ с пометкой EXPIRED.`
> — #5 body, §4, Очистка по TTL

In English, and this is the whole of the restoration:

1. **§2.1** — `ttl` is OPTIONAL, measured in seconds, and defaults to `3600`.
2. **§4.1** — an entry is past its TTL when `created_time(uuidv7) + ttl < now()`, where
   `created_time` is the RFC 9562 millisecond timestamp in the id's first 48 bits.

## The loss is not recorded anywhere

The strings `created_time` and `3600` each occur **exactly twice** in the 2262-line #5 thread,
both times in the original body. Across sixteen review rounds neither appears again.

Every other mention of TTL in that thread is about something else:

| where | what it says |
|---|---|
| #5 body §7 | workers SHOULD check `ttl` before expensive processing |
| round 1 | §6's delete/update prohibition should name its directories, since the sweep moves files out of `in/` |
| round 11 | the CNS name carries `to`, `from`, `thread`, `ttl`, `id` and no parent |
| round 16 | restates the filename grammar |

So the two rules were not removed by a decision anyone can point to. They were dropped, and no
round records the drop. That is a different defect from an unanswered question: an unanswered
question is visible in the document, and this was invisible until someone read the source the
document descends from.

## What follows for `ttl=0`

The v0.1 rule is arithmetic with no carve-out for zero. `created_time + 0 < now()` holds at any
instant after creation, so **`ttl=0` is already expired**. This is not a preference between two
readings; the other reading — zero as "never expires" — has no textual support in #5 or in
v0.12.

`DEFAULT_TTL = 0` in `src/relay-lite/cns.ts` is therefore the one value that, under the only
origin this protocol has ever specified, expires every delivery at the moment it is written.
That constant is not changed here. This document is the evidence for the decision, not the
decision.

## Why this origin and not the others

Issue #37 listed three candidates before the source was consulted. Against the named answer:

- **It travels in the name.** `id=<uuidv7>` is already in every CNS filename. A sweeper needs
  the filename and nothing else — no envelope parse, no `stat`, no local state.
- **It survives copy, backup and restore.** mtime does not; a restore would reset every TTL in
  the store.
- **Every fan-out leg computes the same expiry.** Receipt-time does not, and §2.1's "N delivery
  files carrying identical bytes" only stays true if the legs expire together.
- **It is not the HLC.** §3.3's `l` runs ahead of the wall clock by design, which is exactly
  what disqualifies it as a wall-clock deadline.

## One caveat, from the implementation rather than the spec

`src/relay-lite/uuid.ts` advances the embedded millisecond when the intra-millisecond counter is
exhausted — around 2300 ids in practice — so the timestamp can run ahead of the true clock
(`uuid.ts:83`, and the comment there says so: "the cost is a timestamp one ahead of the clock").

A delivery minted inside such a burst therefore expires marginally late. The error is bounded by
the burst rate and is immaterial at any TTL measured in seconds. But it means the quantity is
**the id's timestamp**, not the instant of creation, and a specification adopting this origin
should say the former. `created_time(uuidv7)` as written in v0.1 is the looser phrase.
