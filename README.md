# p-e — Pollen Event Protocol

**p-e is not designed first. p-e is extracted first.**

A provenance-native event layer for records made by human and non-human agents.
It answers what was observed, by whom, and what the record does not establish.
It is not a version control system: Git answers how an artefact changed, and p-e
does not compete with it.

## Status

`p-e/core 0.1 — Archaeological Draft`, and one conformance reader that has now
run against it twice.

```
core invariants proposed        9
experimentally admitted         0
experimentally unsupported      9
contradicted                    0
```

Nothing has been proven. Nothing has been refuted either — the reader found no
producer that contradicts any rule in the catalogue, and no rule that a stranger
holding only the published artifacts could witness. Those are different failures
and the reports keep them apart.

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

## The reports

Runs are immutable. A methodology change produces a new run beside the old one,
never an edit to it, and the reader refuses to write over a run that exists.

- [`conformance-01`](docs/reports/2026-08-28-conformance-01.md) — the first run.
  Admitted one invariant, and was wrong in two places.
- [`conformance-02`](docs/reports/2026-08-28-conformance-02.md) — the same corpus
  under corrected methodology. Admits none. Says what it corrected and why.

01 is kept because it is where those two errors are visible, and it is the
provenance of 02.

The finding both runs share: **nine rules are enforced, demonstrably, in the
producers' source; none of them can be witnessed by a stranger holding only the
producers' published artifacts.** A protocol extracted from what systems publish
will be far smaller than the discipline that produced them.

## Read this first

[`docs/superpowers/specs/2026-08-28-p-e-core-design.md`](docs/superpowers/specs/2026-08-28-p-e-core-design.md)

## Not part of the protocol

Git (development and review), IPFS (immutable publication of released
artefacts), transports, storage, ontologies, and any particular agent.
