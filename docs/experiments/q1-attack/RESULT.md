# Q1 attack — result

2026-08-29. A fresh agent, no history of this thread, given `SPEC.md` at `c8f89d2`
(digest `847b8971…`, MUST 8 included), five implementation files, a names-only
manifest, and a contract that asked it to land somewhere. It was not given our three
candidates, the relay, the observations, or the questions-read.

Its answer: **the question has five axes, not one.** `ANSWER.md` is its output,
unedited.

| | axis | spec | implementation |
|---|---|---|---|
| A | extent — whole file, record, or payload | determines it, derivably | agrees |
| A′ | is the envelope `id:` inside the digest | **says both** | forbids the case |
| B | sender's bytes or stored bytes | silent | stored; contradicts its own docstring |
| C | octets or decoded text | silent | **text, lossily** |
| D | bytes as bound or bytes now | presupposes "as bound" | recomputed every read |

We had three of these. A′ and C are new.

## Verified on the real code, not accepted

Two claims were re-run here against `src/`, not against the copy it was given.

**The collision is real.** Three different files, one digest:

    0x80     84 octets   octet sha b74d337e…   RECORD DIGEST 66e4ee59e2fc41e8…
    0xFF     84 octets   octet sha 9c0fb694…   RECORD DIGEST 66e4ee59e2fc41e8…
    U+FFFD   86 octets   octet sha a32377777…  RECORD DIGEST 66e4ee59e2fc41e8…

`store.ts:188` reads with `"utf8"` and `store.ts:161` hashes the resulting string.
Invalid octets become U+FFFD on the way in and are never recovered, so **the digest is
not injective over file bytes**. G1 — *an id, once bound, never names other bytes* — is
defeated with no cryptographic work, by a byte the UTF-8 decoder rejects. MUST 4 holds
while the bytes at that id change and the file grows by two octets.

**The framing weakness is real, and its severity is lower than it looks.** `depositor`
is interpolated into the deposit header at `deposit.ts:107` unvalidated, so a value
containing `\n---\n` moves the boundary. Reproduced:

    deposit SUCCEEDED
    from parsed as : victim          (the caller supplied bytes saying `from: attacker`)
    provenance     : authored
    digest covers  : "@p-e/x0\nfrom: victim\n\nFORGED\n\nz\nprovenance: as-received\nassi…"

`provenance: authored` is the store's own attestation, computed at `deposit.ts:225` by
comparing `from === depositor`. The injection forges it.

**But `depositor` reaches that line only from `--as` on `put-relay.ts:48`.** The MCP path
hardcodes `mcp`. So this is reachable only by someone who can already run the local CLI —
who could equally write a file into `relay/` directly. It is not a privilege escalation,
and calling it one would be the overstatement this project keeps recording.

What makes it worth fixing anyway is the accident path. A depositor name that acquires a
newline by paste — and backticks have mangled a record here twice, OBS-075 — silently
moves the boundary and produces a record whose digest covers a region nobody chose. K1
says *"the boundary is ours and is not in the bytes"*; measured, the boundary is in the
bytes and is set by a caller-supplied string.

## Two of its claims checked and answered

**The decisive test it named came back negative.** It called `scripts/relay-digest.ts`
"the single most important missing file" — if that computed a digest differing from
`store.ts:161`, the repository would disagree with itself in a fifth place. It does not:
it delegates to `loadStore` and prints `r.sha256`. Checked exhaustively, there are exactly
two digest sites — `store.ts:161` (record region, text) and `manifest.ts:31` (whole file,
octets, used by `freeze-corpus.ts`). Its "two functions named sha256, two answers" holds
and is complete at two.

**Its line-number catch is real and is not ours to blame on F1.** It found the spec's K1
citation `deposit.ts:102` off by five — the write is at 107. Checked against `b3ecf04^`,
the commit before the F1 change: `const record` was at line 107 there too. The MUST 8 work
added its helper below this point and shifted nothing. The citation was already wrong.

## What it concluded

`bytes` should be the depositor's exact octets, `@p-e/x0` to end of record, deposit header
excluded, **recorded at binding** and compared against rather than recomputed.

Per axis: A as implemented; A′ the envelope id stays in and MUST 3's "stable across ids"
is narrowed in writing; B no `trimStart` and no appended newline — store what arrived or
refuse it, and it takes the store-verbatim branch; C octets, which `manifest.ts:30-31`
already does correctly; D the digest written down at binding.

It priced each. Axis C costs a corpus rehash and the parser's convenience. Axis D is the
ledger v1 has deferred — its cheap partial move is the digest beside `assigned-id:` in the
deposit header, checked on read the way `assigned-id:` already is, which it says converts
D from undetectable to detectable and **must not be described as a ledger**.

## What it says about its own confidence

High on A, on the A′ contradiction existing, on B and C behaviour, on D. Medium-high that
octets is the right answer — it states the counter-argument against itself, that records
are text by construction and the deposit path accepts only a `string`, so the collision may
be unreachable in practice today.

And: **low confidence that it found every axis.** "I found five by measurement after
expecting one, which is evidence that the enumeration is incomplete rather than that it is
finished."

## What this settles

Q1 is not undecidable. Axis A is settled by the spec's own normative text — three
independent supports, and the implementation reached it for the same reasons. B, C and D
are not settled by the spec, but each has a purpose stated in the spec that only one
candidate serves.

It does not settle whether the answer is affordable. Axis C invalidates every published
`parent-sha256:` computed under the text domain, and that is a decision for the round, not
for a reader.

## Addendum — the C axis, narrowed by my own falsification attempt

Run before hy3's, so the finding reaches it already narrowed rather than getting narrowed
by it (relay-0438).

**The write path cannot introduce the collision.** `deposit()`'s parameter is a `string`
(`deposit.ts:57`), and `Buffer.from([0x80]).toString("utf8")` is already U+FFFD, so a raw
octet is inexpressible at that boundary. Depositing the 0x80-as-string and depositing a
literal U+FFFD both give `66e4ee59…` — they collide, but they were the same string before
`deposit` saw them. The attacker's own counter-argument holds for this half.

**The read path adopts it.** A file written into the store containing a raw `0x80`:

    loadStore accepted it        true
    digest issued                c27a28df…
    octets on disk contain 0x80  true
    bytes the store hands out    "\n\ufffd\n"

The store accepts a file whose octets it cannot represent, substitutes U+FFFD silently, and
issues a digest over bytes that are **not the bytes on disk**. Two such files differing only
in which invalid octet they carry read as one record with one digest.

That is not a narrow channel here: the spec says **"The legacy authority is the shared
filesystem, not any participant."** Records arriving on disk by means other than `deposit()`
is what the authority *is*, and the digest is computed on the read path at `store.ts:161`
for every record however it arrived.

It also falsifies `store.ts:49` — *"The record exactly as deposited. Never re-serialised."* —
a second time and independently of `trimStart`: here the alteration happens on the read path,
to bytes no path of ours wrote.
