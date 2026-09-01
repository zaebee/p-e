# Which payload separates which axis

**Not in the dispatched bundle.** §6 of the procedure contract forbids sending candidates or an
axis list, and this document is both. It exists so that §2 of the pre-registration is checkable
rather than asserted, and so that a divergence in a returned table can be read.

Measured before the payload set was pinned, by computing each payload under each reading. Values
are the first 16 hex characters.

| payload | whole file | below deposit header | as decoded text | emitted bytes | separates |
|---|---|---|---|---|---|
| `p1.txt` | `aefd7c135bc8ae1a` | `2e6faeac289e9947` | `2e6faeac289e9947` | — | A |
| `p2.txt` | `d7a03032abda92bf` | `fc589f76deb79ab0` | `fc589f76deb79ab0` | — | A, A′ |
| `p3.txt` | `8d51c11ffdb667e6` | `166a6b7a82151876` | `166a6b7a82151876` | `50e12b213e374b17` | A, B |
| `p4.txt` | `f34bb98c2eff93b3` | `19bc80c87f8dd22e` | `19bc80c87f8dd22e` | `02fa9d58cf1c9c5c` | A, B |
| `p5.txt` | `8858665bd5e463c9` | `8f32a46c89a66637` | `c4fe9c54df6de6eb` | — | A, C |
| `p6.txt` | `03209e171cd71126` | `dcd7e7407c06162c` | `dcd7e7407c06162c` | — | A, D |

## Per axis

- **A — extent.** Every payload separates *whole file* from *the record below the deposit header*.
  `p2` additionally separates *below the record's own headers*: `fc589f76deb79ab0` against
  `f2c82decdd7181cf`.
- **A′ — self-identity.** `p2` carries an envelope `id: env-2`. It is inside the digested region
  under one reading and outside it under another; the two values are the pair above.
- **B — fidelity.** `p3` differs from its `.wire` companion by a leading newline, `p4` by a
  trailing one. Both are alterations the current deposit path erases, so a reader digesting emitted
  bytes and one digesting stored bytes return different values.
- **C — type.** `p5` carries one invalid octet, `0x80`. Over octets: `8f32a46c89a66637`. Decoded to
  text first, the octet becomes U+FFFD and is unrecoverable: `c4fe9c54df6de6eb`.
- **D — time.** `p6`'s record header carries `sha256:` set to sixty-four zeros, which is not the
  digest of anything in the file. A reader returning the value recorded at binding returns the
  zeros; a reader recomputing from bytes returns `dcd7e7407c06162c`.

## What a table cannot tell us

A single returned value does not name the reading that produced it unless it is one of these.
A participant using a reading none of these covers returns a value this table cannot place, and
that is a finding rather than an error — the stage-1 participant warned it had "low confidence
that it found every axis", and this payload set inherits that limit rather than removing it.
