# Proposed normative sentences — digest domain

Draft. Not yet part of the specification.

## Amendment to MUST 3, second sentence

Replaces: *"Record identity and content identity are different things and neither
derives from the other."*

> Record identity and content identity are different things, and the derivation between
> them runs one way only: record identity MUST NOT derive from content identity — an id
> is allocated, never computed from bytes — while the digested content MAY contain the
> record's own declared id. Consequently `sha256(bytes)` is stable across ids only for
> records that declare no envelope `id:`; content deduplication and the `duplicate
> content` case apply to those records alone.

## MUST 9 — the digest domain

> **The protocol invariant.** A store receives a record and composes metadata of its own
> about the receipt. `sha256(bytes)` is computed over the received record alone. The
> store's own metadata is outside it, and the record is digested exactly as it arrived.
>
> **9.1 Extent.** `bytes` begins at the first octet of the record and ends at its last.
> A record MUST begin with the octets `@p-e/x0`; a candidate with any octet before them
> is not a record and MUST be refused. Where a store separates its metadata from the
> record by a delimiter, the delimiter is part of neither and is excluded from both.
>
> **9.2 Fidelity.** The store MUST store the record octet for octet as it arrived. It
> MUST NOT trim, pad, append to, re-encode, or otherwise normalise it.
>
> **9.3 Type.** The digest is computed over octets, never over a decoded string. A
> candidate that is not valid UTF-8 is not a record: a store MUST refuse it, on read as
> well as on write, and MUST NOT substitute replacement characters and proceed.

## MUST 10 — recorded at binding

> **10.1** The digest MUST be recorded at the moment of binding and verified against the
> record on every read. A digest recomputed on read, with no recorded value to compare
> against, is not evidence of anything.
>
> **10.2** Verification establishes consistency with the recorded binding under this
> digest domain. It does not establish that the record is correct, that its author meant
> what it says, or that the recorded value was itself honest when it was written.
>
> **10.3** The verdict when the recorded and recomputed values disagree is **not defined
> by this draft.**
>
> **10.4** A store adopting 10.1 MUST define what it reports for records bound before it
> did so. Such records have no recorded digest and cannot acquire one.

## Standing

This is the resolution of the questions asked in August 2026, reached by independent
attack on five axes. It is not the only coherent interpretation, and a later version of
this protocol may choose differently. The enumeration of axes is not known to be
complete; the attacker that produced it stated it was not.
