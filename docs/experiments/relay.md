# RELAY — an ephemeral layer, recorded as an experiment

**This is not p-e/core, and it must not influence core semantics.** It lives in
`docs/experiments/` rather than beside the spec so that the separation is
structural and not a promise. Nothing here is admitted, proposed, or scheduled.

## What is being separated

```
p-e/core     durable, context-independent, replayable by a stranger
RELAY        ephemeral, context-dependent, meaningful only inside a session
```

They optimise for different things, which is why one language is unlikely to
serve both:

| | RELAY | p-e |
|---|---|---|
| minimise | ambiguity, token cost, latency | provenance loss, semantic ambiguity |
| maximise | — | replayability |
| assumes | a shared session | nothing |

`@p-e/x0`, the format this project's own participants have been exchanging, is
the ephemeral layer. It was declared "transport of the experiment, not a core
claim" in its second message, before anyone had a reason to distinguish the two
tiers. That disclaimer now reads as the distinction arriving before it was named.

## Observed requirements

Numbered `R-`, not `I-`. They are requirements of a coordination language, drawn
from watching one, and they are not candidates for the core catalogue.

| | requirement | where observed |
|---|---|---|
| R-1 | sender | `@p-e/x0` `from`; METR `zzR_JANFE78_TO_…` |
| R-2 | recipient | `@p-e/x0` `to`; METR `_TO_FEBFE78B` |
| R-3 | operation or intent | `@p-e/x0` `kind`; METR `R`, `ASK`, `NOTE`, `HELP`, `FILE` |
| R-4 | optional reference to prior context | `@p-e/x0` `ref`; METR `saw_your_tripleSSRF` |
| R-5 | compact payload | METR, under a namespace that made length expensive |
| R-6 | session-local context may be assumed | METR `HOLD`, `VETO`, `owner`, `STOP` |
| R-7 | absence of a field stays distinguishable from an intentionally empty one | this project, by argument, not by observation |

**R-7 is I-1 wearing different clothes.** The one rule the conformance run could
not witness in either producer reappears as a requirement of the layer above
them. That is not evidence for I-1 — a requirement argued for is not a rule
observed — but it is worth writing down that the same distinction keeps being
needed.

## Two findings from this project's own exchange

Sixteen messages, which is a small sample and is treated as one.

**`status` carried no information.** Every message in the exchange reads
`status: provisional`. The field was introduced so that provisionality would not
have to be guessed from wording, and across sixteen messages it never varied
once. A field that never changes value has not been shown to be needed.

**`parent` did carry information.** It was not always the immediately preceding
message: `relay-0005a` answered `relay-0004`, and `relay-0012` answered
`relay-0010` while `relay-0011` also existed. Twice in sixteen, the reply graph
was not a line, and a field that only ever meant "the previous one" would have
lost that.

## Field rulings, at relay-0020

Both stay experimental. Neither is promoted, and neither is removed.

| field | evidence after 19 messages | ruling |
|---|---|---|
| `status` | `provisional` every time; never varied | **no demonstrated information.** Nineteen identical values are evidence of no shown utility, not proof there is none. Kept, unpromoted |
| `parent` | twice not the preceding message (`0005a`→`0004`, `0012`→`0010`) | **demonstrated contextual value.** Means *referenced context*, not position. Kept, unpromoted |
| `from` `to` `kind` `ref` | used throughout, and independently observed in the METR swarm | candidates. Not promoted |
| direct vs broadcast | operational pressure observed at three participants (OBS-005) | candidate for the next experiment. Not designed |

Nothing here is a p-e/core field, and nothing becomes one by being useful in a
chat.

## Candidate notation — experimental only

```
@r1 cg>cl review r15
@r1 cl>cg ack r15
@r1 cg>cl ask M1
@r1 cl>cg hold
```

`@r1` is a **dialect version** — which grammar this session speaks — and is
emphatically **not** an event identity. Reading it as one would merge transport
identity with event identity, which is exactly the conflation `M1` was left
unresolved rather than settle. The three concepts `M1` names — `record_id`,
`content_id`, `transport_id` — stay unmerged here too.

No grammar is being designed. The four lines above are a sketch of what the
requirements imply, kept short enough that nobody mistakes them for a
specification.

## Promotion

```
short RELAY  →  expanded relay object  →  optional promotion  →  p-e event
```

Promotion is **not automatic** and is **not part of core**. Most coordination is
noise that never becomes history, which is what the METR swarm showed at scale:
a large volume of chatter, and a few results that became artifacts.

## Prior-art status of the METR observation

Observed external evidence. Not a specification, not a producer in the
conformance corpus, and never a source under the admission rule. It is an account
of a system nobody in this project can inspect, its conventions were re-invented
and re-broken during the incident it describes, and no reader here can exercise
it. See the spec's §7a for the full statement.

## The rule this document exists to enforce

A field must not enter `p-e/core` because this project's own human-proxy exchange
happens to use it. The exchange is one sample, of one dialect, between three
participants, with a person as the transport. It is the weakest evidence in the
project and it is the most available, which is precisely the combination that
gets things adopted without being earned.
