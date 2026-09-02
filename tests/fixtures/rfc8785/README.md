# RFC 8785 (JCS) reference test vectors

Vendored from [cyberphone/json-canonicalization](https://github.com/cyberphone/json-canonicalization),
`testdata/{input,output}`, the reference implementation by Anders Rundgren, author
of RFC 8785. Copyright 2018 Anders Rundgren, licensed under Apache License 2.0.

Fetched 2026-09-02.

`input/<name>.json` is arbitrary JSON; `output/<name>.json` is the canonical form
the reference implementation produces. The comparison is byte-for-byte.

These are external ground truth. Every other test in this repository was written
by whoever wrote the code, and shares its blind spots by construction; these were
written by someone who had never seen it.

## `values.json` is expected to be refused

It contains `1E30`, which I-JSON (RFC 7493 §2.2) puts outside the domain: an
integer past 2^53 is altered by the parse that precedes canonicalization, so the
digest would cover a value nobody sent. Refusing it is the spec's requirement,
not a shortfall — `docs/specs/relay-lite-v0.12-draft.md` §3.1 states it as a MUST.

Every other member of that vector, including its escape-torture string, matches
the reference byte-for-byte. The test asserts both halves: the refusal, and the
agreement on the remainder.

## `french.json` is why the key sort has an explicit comparator

Its own payload says it: *"This sorting order / is wrong according to French /
but canonicalization MUST / ignore locale"*. SonarCloud's rule S2871 proposed
sorting keys with `localeCompare`, which would have failed this vector. See
`byCodeUnit` in `src/relay-lite/canonical.ts`.
