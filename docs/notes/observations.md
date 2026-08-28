# Observations

Numbered results of running this project, kept out of the specification on
purpose. An observation is something that happened. Whether it should change the
core is a decision, and this file does not make one.

---

## OBS-004 · R-6 answered: the divergent subject inside apex is the reader's, not the producer's

**Asked at relay-0018.** Does apex's `subject` change semantic role between its
health/history records and its log entries?

**It does, in the reader's envelope stream. It does not in the producer.**

| record kind | what apex publishes | what the adapter puts in `subject` |
|---|---|---|
| `health.json` | entries keyed by host — `aura.zae.life` | the host. **published** |
| `history.json` | hosts keyed by host — `aura.zae.life` | the host. **published** |
| `log/*.md` | frontmatter: `title`, `date`, `claimed`, `observed`, `attested` | the **filename**. *invented by the reader* |

apex publishes no subject for a log entry. There is no field for one, and what
an entry is *about* — the witnesses it describes — lives in prose that nothing
identifies. `src/adapters/apex.ts:109` supplies `entry.file`, so the slot ends up
holding a **self-identifier**: the record naming itself rather than anything
outside it.

That is a fourth role, beside the three §5 already records — claimant in
hivemark, observed in apex's health, producer in Pollen — and it is the only one
of the four with no producer behind it. It is the same defect as run 01's
whitespace heuristic: the reader supplying semantics no producer publishes.

**The finding that matters is not about apex.** §5 makes `subject` **REQUIRED**.
One of the two producers publishes an entire class of record that has no subject
at all. So any reader conformant to §5 must either invent one or refuse those
records, and this one invented. That is evidence bearing on whether `subject`
should be required — and a decision, not a result.

Not fixed. Making `subject` optional is a core change, and relay-0018 said record
the result and change nothing.

Related: **M2** widens again. Role divergence is not only producer-to-producer.

---

## OBS-005 · human-proxy bandwidth degrades non-linearly with participant count

**Observed in this project's own operation, not in either producer.**

```
2 agents          one person relaying between two endpoints. manageable.
3+ agents         the person becomes a message router, and must decide
                  per message who needs it.
```

Candidate cause: the human is acting as a centralised relay router — the
topology the project set out to avoid, reproduced in its own working method.

Candidate mitigations, recorded and **not adopted**:

- **direct** — `@r1 cg>cl …`, forwarded to one recipient
- **broadcast** — `@r1 * …`, forwarded to all
- a shared relay store addressed by id, so `ref` replaces quotation and a
  participant fetches `relay-0017` instead of being handed it

MCP is acceptable as a **read-only retrieval layer** for that store. It is not
p-e semantics, and a retrieval mechanism must not decide what an event is. See
`docs/experiments/relay.md` for the layering this belongs to.

Status: observation. No design rule follows from it yet, and one sample of one
project is not a measurement.

---

## OBS-006 · a protocol field that never varied

Sixteen messages of `@p-e/x0`. Every one reads `status: provisional`.

The field was introduced so provisionality would not have to be inferred from
wording. Across the whole exchange it never changed value, so it has not been
shown to carry information. By this project's own standard that is
`UNDECIDABLE`, not `useless`: sixteen identical values are evidence of no
demonstrated utility, not proof there is none.

`parent`, by contrast, earned its place twice. `relay-0005a` answered
`relay-0004`; `relay-0012` answered `relay-0010` while `relay-0011` existed. The
reply graph is not a line, and a field meaning "the previous message" would have
lost both forks.

So `parent` in RELAY means **referenced context**, not position — recorded as
experimental in `docs/experiments/relay.md`, and deliberately not offered as
support for **M4**, which is about durable events and not about a chat.

---

## OBS-007 · run 02 overstated its own result

Run 02 closed: *"None of them can be witnessed by a stranger holding only the
published artifacts of both producers."*

Read plainly, that says none can be witnessed at all. Six findings CONFORM, each
from one producer. The true statement is narrower: no invariant is witnessable
from the artifacts of **both** producers, which is what admission requires.

Corrected in run 03, which changed no verdict — `bun run diff-runs` over the two
reports says so in one line. Run 02 is preserved unchanged.

Worth keeping because of where it happened: in the sentence stating the report's
headline finding, in a report about the difference between what is enforced and
what can be witnessed.
