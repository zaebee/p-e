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
proposed core invariants     9
experimentally admitted      0
contradicted                 0
```

**The spec and the reports disagree, and the disagreement is the project.**

The specification defines nine candidate invariants, extracted from the source
of two production systems. Conformance runs 01–05 admitted none of them from
those systems' published artifacts. Neither document is being adjusted to match
the other, and §3 has not been rewritten to encode run 05 as its normative state.

The separation is deliberate:

| | holds |
|---|---|
| **spec** | the hypotheses under test |
| **reports** | what survived the falsifier, per run, immutably |
| **observations** | how the method failed and what was changed |
| **this README** | where the project currently stands |

A spec edited to match the latest run would make the normative document a
function of the most recent experiment — and run 06 admitting something would
then force a normative change for an empirical reason. The draft records what is
proposed. The reports record what was witnessed.

Nothing has been proven. Nothing has been refuted either: the reader found no
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

| run | what changed | admitted |
|---|---|:-:|
| [01](docs/reports/2026-08-28-conformance-01.md) | the first run | 1 of 9 |
| [02](docs/reports/2026-08-28-conformance-02.md) | I-2 and I-7 demoted; "consistent with" is not "confirmed" | 0 of 9 |
| [03](docs/reports/2026-08-28-conformance-03.md) | a wording correction; run 02 overstated its own result | 0 of 9 |
| [04](docs/reports/2026-08-28-conformance-04.md) | I-6 demoted on corrected grounds; coverage becomes measured | 0 of 9 |
| [05](docs/reports/2026-08-28-conformance-05.md) | the reader audited against itself; every finding declares its projections | 0 of 9 |

Every run is kept, including the ones that were wrong. Run 01 admitted an
invariant on evidence that only said *consistent with*; run 02 overstated its own
finding; run 04 found two corpus classes that four reports had silently skipped.
Each is the provenance of the next.

`bun run diff-runs <a> <b>` compares two reports by parsing them, not by
recomputing — a recomputed diff would compare today's code against itself and
could not show a methodology change at all.

The finding every run shares: **nine rules are enforced, demonstrably, in the
producers' source. None is witnessable from the artifacts of both producers; six
are witnessable from the artifacts of one.** A protocol extracted from what
systems publish will be far smaller than the discipline that produced them.

## Reproducing a run

```sh
bun install
bun run conform --run 06     # any unused two-digit run id
bun run diff-runs docs/reports/2026-08-28-conformance-05.md \
                  docs/reports/2026-08-28-conformance-06.md
```

The corpus is committed and pinned by digest, so this needs no access to either
producer's repository. Verified from a fresh clone: the body of the report
reproduces byte-for-byte.

Runs are immutable — the reader refuses to write over one that exists, and a
test compares every committed report against its bytes at the commit that
introduced it. `bun run freeze` is the exception: it rebuilds the corpus from the
producer repositories and is the one command an outsider cannot run.

## Read this first

[`docs/superpowers/specs/2026-08-28-p-e-core-design.md`](docs/superpowers/specs/2026-08-28-p-e-core-design.md)

## Not part of the protocol

Git (development and review), IPFS (immutable publication of released
artefacts), transports, storage, ontologies, and any particular agent.
