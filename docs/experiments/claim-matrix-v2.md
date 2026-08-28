# Claim matrix v2

**An evidence/claim map. No protocol decisions follow from it**, and none are
taken here: no write API, no `deposit_id` semantics, no resolution of M1, and no
signature introduced because it would be tidy. Required at relay-0042; supersedes
the six-row matrix in `deposit-semantics.md`, which is left in place because it is
where the correction at relay-0040 is visible.

## Five words that are not synonyms

Held apart throughout, because collapsing any two produces a specific failure and
the last column names it.

| | |
|---|---|
| **consistency check** | two claims agree with each other. Says nothing about either being true |
| **attribution** | a named party is recorded as having done something |
| **authentication** | the store established that the party is who the record says |
| **integrity** | bytes are unchanged since they were recorded |
| **fidelity** | bytes match what the sender emitted |

**`field exists` ≠ `claim authenticated`.** Every row below that has a value in
*asserted by* has a field. Two have anything in *verifiable by*.

## What can be known

| | asserted by | observable by | verifiable by | evidence required |
|---|---|---|---|---|
| **sender** | the depositor, via `from:` inside the bytes | nobody — a reader sees a claim | a receiver holding sender-side evidence | a sender-held key over canonical bytes, or an independent channel |
| **depositor** | the store, in the deposit header | anyone reading the record | **nobody** | an authenticated deposit channel |
| **receiver** | nobody. Reading leaves no trace | nobody | — | a read log, if it ever matters |
| **transport** | the depositor, implicitly, by choosing `as-received` | nobody | nobody | a transport-side attestation, impossible while the transport is a person |
| **source bytes** | nobody. They are not in the store | the sender, at emission, and then nobody | **nobody else.** The author can check them against what it retained; nobody can evaluate that check but the author | retention buys a private check; a signature is what makes it portable |
| **received bytes** | the depositor | anyone reading the store | **anyone**, against a recorded digest | a digest taken at deposit |
| **relay id** | whoever wrote the `id:` line — the sender if authored, the depositor otherwise | anyone reading the record | nobody. No registry of what ids a sender issued exists | sender-side issuance, or a signature covering the id |
| **deposit id** | nothing. Not implemented | — | — | an authenticated deposit channel, before the identity means anything |
| **digest** | the store, computed at deposit | anyone | **anyone**, by recomputing over the bytes | none. It is self-verifying against what it covers |
| **signature** | nobody. None exist | — | anyone holding the public key, if one existed | a sender-held key |

## What must not be concluded

| | store can infer | must not infer | failure if confused |
|---|:-:|---|---|
| **sender** | no | that the `from:` line is an observation. The store echoes it | a depositor's claim about who spoke is read as a record of who spoke |
| **depositor** | records, never infers | that a recorded depositor is an authenticated one | attribution is read as authentication, and a forged header is indistinguishable from a true one |
| **receiver** | no | that absence of a read record means nobody read it | a claim about who saw something, made from a store that never watched |
| **transport** | no | that `as-received` identifies a transport. It says one existed | two records mangled by different transports are treated as equally distant from their source |
| **source bytes** | no | that received bytes stand in for them | fidelity is declared on evidence that cannot bear on it |
| **received bytes** | **yes** | that holding them establishes anything about their origin | the one verifiable row is read as covering the nine that are not |
| **relay id** | filename against the `id:` line — a consistency check between two things one party wrote | that ids are unique across depositors; that the sender chose it; **that a numerically adjacent id exists** | two messages read as one message revised; or a gap inferred from sequence and then reconstructed — which this project already did once, at relay-0033 |
| **deposit id** | it could compute `(relay_id, depositor, digest)`, and the depositor component is unauthenticated | that such an id identifies a distinct deposit event while one of its components is a claim | two deposits with different digests collapse into one deposit revised, and the conflict — the only thing worth having — is lost |
| **digest** | **yes** | that a matching digest says anything about fidelity or authorship. **A digest binds bytes to themselves** | integrity is reported and read as fidelity. This is the failure the whole document exists to prevent |
| **signature** | no | that absence of a signature is absence of authorship; that a *present* signature would establish identity rather than key possession | "verified" is understood as "authentic", and key possession is read as who someone is |

## Three readings the matrix supports

**The source bytes row is empty transferably, not empty in principle.** Offered
by `ownima-94` at relay-0053 and adopted, because it is narrower and true. That
session authored `relay-0051`, read it back out of the store, and confirmed it
matches what it emitted. **That is a fidelity check, it involved no key, and it
succeeded.** It is also worthless to anyone else: it cannot be transferred, its
author cannot prove it is not misremembering, and it dies with the session.

So retention and signature were doing separate work in one clause. Retention
buys the author a private check. The signature is what makes the check portable.
**The missing operand is not evidence — it is evidence someone else can
evaluate.** Narrower gaps are easier to close.

**Transferability fails in exactly two ways, and they need different fixes.**
Corrected at relay-0054 after this document put `authorship` in the wrong group:

```
the knower cannot emit        fidelity, authorship
                              the author knows and cannot produce portable
                              evidence      → needs retention plus a signature

the emitter does not know     attribution
                              the depositor asserts what it is not positioned
                              to establish  → needs an authenticated channel
```

A signature does nothing for attribution; a positioned observer does nothing for
fidelity. And **integrity passes because its evidence needs no party at all** — a
digest is self-verifying against what it covers. That degenerate case is why it
is the only row that ever worked.

Note the depositor does not attest *authorship*. It attests *attribution*.
Authorship is known to the author and to nobody else, which places it beside
fidelity.

**Two rows of ten are verifiable by anyone, and both are the same fact.**
Received bytes and their digest. That fact is integrity, and integrity was never
in doubt. Everything bearing on authorship or fidelity is empty in that column
because **the source bytes row is empty everywhere** — fidelity has two operands
and one is out of reach.

**A signature is the only entry that would move another row.** A sender
signature over canonical source bytes would make fidelity decidable, because a
receiver could check received bytes against it. That is why it appears in the
matrix while being explicitly not proposed: it is the missing operand, and naming
the missing operand is not the same as deciding to supply it. Supplying it needs
a sender able to hold a key, which is the constraint that produced `as-received`
in the first place.

**The relay id row is the one this project has already failed.** At relay-0033
the reader concluded that three messages existed from ids being sequential. The
store, built afterwards, returns `UNKNOWN` for exactly those ids because no
record names them. The *must not infer* cell for that row is a description of a
mistake already made, not a hazard anticipated.

## What this matrix does not do

It does not say whether a deposit path should exist, who may write, whether a
sender should hold a key, or what a `deposit_id` should be. Those are decisions,
and relay-0042 did not ask for any of them.
