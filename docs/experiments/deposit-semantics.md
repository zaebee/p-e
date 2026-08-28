# Deposit semantics — a research question, answered before anything is built

**Nothing here is implemented.** relay-0038 asked for the semantics to be defined
first, and the MCP surface stays read-only until this is reviewed. No rule in
`docs/superpowers/specs/` is affected by anything below.

## Six things that are currently one

| | |
|---|---|
| **sender** | the participant whose message it is; whose intent the bytes express |
| **depositor** | whoever put bytes into the store |
| **receiver** | a participant who reads them out |
| **transport** | whatever carried bytes from sender to depositor. Currently a person pasting text |
| **source bytes** | what the sender emitted |
| **received bytes** | what the depositor placed under an id |

**The store only ever holds received bytes.** Source bytes may not exist anywhere
it can reach. Where sender and depositor are the same participant, the two
coincide by construction; everywhere else the store cannot tell, and must not
imply that it can.

## The six questions

### 1. Who may deposit?

**Anyone who can reach the store, and the record names who did.**

Restricting deposit to the sender is the obvious answer and it is the one the
topology forbids: a participant with no filesystem cannot deposit at all, which
is the whole reason `as-received` exists.

The shape is already solved in the conformance corpus. hivemark signs with a
publisher's key and never with the reviewer's, because *reviewers hold no keys by
construction* — and an attestation names both roles rather than collapsing them.

**Corrected at relay-0040.** An earlier version of this paragraph read
*authorisation is not what protects fidelity; attribution is*. That is a
collapse and it is wrong. Attribution protects nothing about fidelity. It names
whom to distrust when fidelity fails, which is a different and much smaller
thing. Fidelity stays undecidable whether or not a depositor is named. Five
concepts have to be held apart:

| | question |
|---|---|
| **authorization** | who is permitted to deposit? |
| **attribution** | who deposited these bytes? |
| **authorship** | who originally produced them? |
| **integrity** | were deposited bytes altered after deposit? |
| **fidelity** | are received bytes identical to what the sender emitted? |

Without sender-side evidence, **authorship and fidelity are both UNDECIDABLE**,
and no arrangement of the other three makes either decidable.

### 2. What does a deposit attest?

**That this depositor observed these bytes and placed them under this id, at this
time.** Nothing else.

It does **not** attest that the sender emitted them, that they are complete, that
they are unaltered, or that the id is the one the sender chose. hivemark's
`verifyEnvelope` returns an `unverifiable` list saying the equivalent in as many
words, and I-6's demotion in run 04 is what happens when a reader reads more into
a two-party record than the parties published.

### 3. Can the depositor alter content?

**Yes, and the design must assume it.**

Nothing prevents it, and no amount of store-side validation can: the store sees
only what it is handed. The question is not how to forbid alteration but what
survives it, and the answer is that alteration becomes **attributable** rather
than impossible. A record says who deposited it; a reader who distrusts a
depositor distrusts every record that depositor placed.

This makes `authored` and `as-received` two different claims rather than a strong
and a weak one:

```
authored      depositor == sender. alteration is self-alteration, and the
              sender is answerable for it.
as-received   depositor != sender. alteration is possible, undetectable by
              the store, and attributable to a named depositor.
```

### 4. How is sender provenance preserved?

**Currently it is not, and the store must say so rather than imply otherwise.**

The `from:` line lives inside the bytes, which the depositor could have written.
There is no sender-held key, because a participant without a filesystem also has
nowhere to keep one. So a record's claim about its sender rests entirely on the
depositor's honesty and on whatever the receiver can check out of band.

Three ways out exist and none is adopted: a signature by the sender over the
canonical bytes (needs the sender to hold a key), an independent channel the
receiver can compare against (reintroduces the human), or accepting the limit and
recording it (what is done now).

This is **M3 arriving in the relay layer** — the cryptographic question the spec
left unresolved, showing up where it actually bites.

### 5. Can a receiver verify byte fidelity?

**No. It can verify integrity, which is a different question, and the two must
not be run together.**

```
integrity   have these bytes changed since they were deposited?
            decidable. a digest over the record answers it.

fidelity    do these bytes match what the sender emitted?
            undecidable here. it is a relation between received bytes and
            source bytes, and source bytes exist nowhere the receiver can
            reach.
```

This is the corpus's own distinction wearing new clothes: apex separates `cold`
— a fact about a district — from `unknown` — a fact about the observation.
Integrity is a fact about the record. Fidelity is a fact about the transport.
Reporting integrity and letting it read as fidelity would be the exact defect
I-1 exists to name.

### 6. What does absence from the store mean?

**That this store does not hold it.** That is a fact about the store, not about
the message, and the three states the reader already implements say only that
much:

| | |
|---|---|
| `PRESENT` | the bytes are here |
| `KNOWN_MISSING` | a held record names this id and we do not have it |
| `UNKNOWN` | nothing held here mentions it |

A deposit path adds a distinction the store still cannot make: **never
deposited** against **deposited elsewhere and never propagated**. Both look
identical from inside. An append-only store that has deleted nothing can say it
never received something; it can say nothing about whether it was sent.

## What follows for an implementation, when one is authorised

- A record carries **depositor** and **provenance** separately from the `from:`
  line inside its bytes, because those are claims by different parties.
- A digest is over the received bytes and is labelled **integrity**, never
  fidelity.
- `authored` requires depositor == the `from:` participant; the store can check
  that much and should refuse to label a record `authored` when it does not hold.
- Deposit is append-only: a second deposit under an existing id is a **conflict**
  to be recorded, never an overwrite. Two depositors disagreeing about what a
  sender said is exactly the data OBS-013 says the exchange currently loses.
- Nothing here promotes a relay to a p-e event. That boundary is unchanged.

## The claim/role matrix

**Superseded by `claim-matrix-v2.md`**, which adds four rows and two columns. This
version is kept rather than replaced: it is where the collapse corrected at
relay-0040 is visible, and a design document that quietly overwrites its own
wrong version is doing what the reports are forbidden to do.

Required at relay-0040. Each row is a thing the design has been treating as
available; the columns ask on what basis.

| | asserted by | observable by | verifiable by | evidence required | store can infer |
|---|---|---|---|---|:-:|
| **sender** | the depositor, via the `from:` line inside the bytes | nobody — a reader sees a claim, not an observation | a receiver holding sender-side evidence | a signature by a sender-held key over canonical bytes, or an independent channel | **no.** It can echo the claim, and echoing must not render as fact |
| **depositor** | the store, in the deposit header | anyone reading the record | **nobody, currently** | an authenticated deposit channel | it records rather than infers — see below |
| **receiver** | nobody. Reading leaves no trace | nobody | — | a read log, if it ever matters | no |
| **transport** | the depositor, implicitly, by choosing `as-received` | nobody | nobody | a transport-side attestation, which cannot exist while the transport is a person | **no.** `as-received` says a transport existed, not which, nor what it did |
| **source bytes** | nobody. They are not in the store | the sender, at emission, and then nobody | nobody afterwards unless the sender retained and signed them | sender-side retention plus a digest | **no** |
| **received bytes** | the depositor | anyone reading the store | **anyone**, against a recorded digest | a digest taken at deposit | **yes** |

### What the matrix makes visible

**One row of six is verifiable, and it answers the question nobody asked.**
Received bytes can be checked against a digest — that is integrity, and integrity
was never in doubt. Every row that bears on authorship or fidelity is empty in
the *verifiable by* column, and empty for the same reason: **the source bytes row
is empty everywhere.** Fidelity is undecidable not because the store is weak but
because one of its two operands does not exist in reach.

**Attribution is not established either, which goes further than the
correction.** The deposit header reads `deposited-by: claude` because the process
that wrote the file wrote that line. Deposits are local file writes; nothing
authenticates them. So attribution is currently a *third* unverified claim
sitting beside authorship and fidelity, and calling a record `authored` on that
basis asserts more than the store can support.

The store can check one thing about `authored` and should: that the named
depositor matches the `from:` participant. That is a consistency check between
two claims, not evidence for either.

## Revisited, given the matrix

**Deposit identity.** A deposit needs an identity of its own, distinct from the
relay id, as soon as two deposits can exist under one id: `(relay_id, depositor,
digest)`. That is a **fourth** identity concept beside M1's `record_id`,
`content_id` and `transport_id`, and it is named here so a later discussion
cannot merge it into one of them by default.

**Conflict identity.** Two deposits, one relay id, different digests. The
conflict is identified by the *set* of digests and is **not resolvable by the
store**: it holds two accounts of what a sender said and no basis for preferring
either. Recording both is the whole of what it can do, and is more than the
current exchange does — where a second account simply replaces the first in
somebody's context.

**Id semantics.** If a depositor chooses the relay id, then the id is a depositor
claim exactly like `from:` — not sender-provenanced, not verifiable, and
collidable. This is new: the identity questions in M1 were about events, and this
one is about whether an identifier belongs to the sender at all.

## What this document does not settle

Whether a sender should hold a key; whether a conflicting deposit should be
resolvable at all or only recorded; whether an id may be chosen by a depositor or
must come from the sender; and whether a store that cannot verify fidelity is
worth more than the human transport it replaces. None of these has evidence yet,
and none is decided here.
