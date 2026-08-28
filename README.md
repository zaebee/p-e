# p-e — Pollen Event Protocol

**p-e is not designed first. p-e is extracted first.**

A provenance-native event layer for records made by human and non-human agents.
It answers what was observed, by whom, and what the record does not establish.
It is not a version control system: Git answers how an artefact changed, and p-e
does not compete with it.

## Status

`p-e/core 0.1 — Archaeological Draft`. Specification only. **No code yet, on
purpose.**

The draft is not an invention. Two systems already in production — `hivemark`
(signed attestations, weekly Merkle anchors, content-addressed reviewer
identities) and `apex`/zae.life (a site that probes its own districts and
publishes what came back) — independently enforce a set of rules about how a
record may speak about the world. 0.1 reads those rules off the code.

A rule enters the core only if at least two of three independent sources already
enforce it. Everything else is catalogued as evidence and kept out.

Applying that rule strictly leaves **core 0.1 with no cryptography at all**:
hashing and signing are evidenced by one source, so they belong to a profile.
That was not the intended result. It is what the method returned.

Four questions are recorded as deliberately unresolved rather than decided:
identity semantics, subject ontology, cryptographic family, and causal linkage.

## Read this first

[`docs/superpowers/specs/2026-08-28-p-e-core-design.md`](docs/superpowers/specs/2026-08-28-p-e-core-design.md)

## Not part of the protocol

Git (development and review), IPFS (immutable publication of released
artefacts), transports, storage, ontologies, and any particular agent.
