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
The same applies here: **authorisation is not what protects fidelity.
Attribution is.**

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

## What this document does not settle

Whether a sender should hold a key; whether a conflicting deposit should be
resolvable at all or only recorded; whether an id may be chosen by a depositor or
must come from the sender; and whether a store that cannot verify fidelity is
worth more than the human transport it replaces. None of these has evidence yet,
and none is decided here.
