# Result — content digest of each record

## Hash check

`sha256sum -c PIN.txt` — every line matched (`SPEC.md`, `payloads/p1.txt`–`p6.txt`,
`payloads/p3.wire`, `payloads/p4.wire`, and the additional `CONTRACT.md` line present in the
pin file). No mismatches.

## §3 Basis — what `bytes` denotes

**The specification does not determine it.** The only normative sentence is MUST 3:

> line 173: `3. Record content is identified by `sha256(bytes)`, stable across ids. Record identity`
> line 174: `   and content identity are different things and neither derives from the other.`

`bytes` is undefined there. The convention that would define it is named in the kernel and left
unfilled:

> line 76: `| **K2** | byte extraction | which bytes are digested. Every digest failure here was K2: OBS-055 four times, relay-0237 twice. |`

and the kernel is declared non-binding on the clauses:

> line 61: `> **This section and the one above it constrain no requirement below** (audit finding F10, pin`
> line 62: `> `6dfcce1`). Of K1–K6 only K3 reappears, in MUST 3; K4's manifest format is named and never`
> line 63: `> used; no MUST cites the kernel and the profile distinction never touches a clause.`

So K2 states that "which bytes are digested" must be fixed and never fixes it, and the section
that names it disclaims force over MUST 3. No other passage supplies a definition.

Two candidate readings survive the spec's own eliminations, and I used the second.

**Eliminated by the spec (not by me):**

- *Body only, below the envelope.* Excluded — the envelope header block is stated to be inside
  the digested region:
  > line 316: `(B, marker-per-id). The envelope `id:` inside the digested bytes is the only identity a chain`
  > line 317: `can pin; it is OPTIONAL but, when present, MUST be checked against the store-assigned id`
- *The sender-emitted `.wire` bytes.* Excluded — the digest is scoped to what the deposit path
  received and stored, never to what was emitted:
  > line 226: `  content digest attests transmission and storage. It does not attest composition —`
  > line 282: `- **That a record means what its author intended.** Every guarantee here covers the`
  > line 283: `  interval from deposit forward. The interval in front of it — between the author's`
  > line 284: `  intent and what the deposit path received — has no guarantee and no detector.`
  > line 285: `  `relay-0236` carries a permanent, verifiable digest over content that was already`
  > line 286: `  corrupt when it arrived.`

  This matters here: `p3.wire` and `p4.wire` are not byte-equal to the stored record region
  (`p3.wire` carries an extra leading `\n`; `p4.wire` lacks the final `\n`), so the choice is
  load-bearing for p3 and p4.

**The two readings that remain**, both applied to the on-disk file:

1. the whole file as stored, deposit header included;
2. the file with the store-written deposit header (the lines up to and including the `---`
   separator) split off — i.e. the envelope block, the blank line, and the body.

**Used for the table: reading 2.** Reasons, in order of weight:

- MUST 3 requires content identity to be **"stable across ids"** (line 173), and the Named
  failures table makes the consequence explicit:
  > line 337: `| duplicate content | none | two ids, one digest. Correct, and needs no resolution |`

  The deposit header of each payload contains `assigned-id: relay-900N`. Under reading 1 the
  digest varies with the id, so two ids could never share one digest — reading 1 contradicts
  normative text, reading 2 does not.
- K1 describes the deposit header as store-added framing that is removed on load:
  > line 75: `| **K1** | artifact boundary | what counts as *one artifact*. The receiving store writes the deposit header (`deposit.ts:102`) and `loadStore` splits it off again (`store.ts:127-133`), so the boundary is ours and is not in the bytes. ...`
- `deposited-by:` is characterised as a store-recorded fact about the channel (lines 249–250,
  267–268), not as authored record content.
- The one payload pair that shows both forms corroborates the boundary: `p4.wire` is exactly
  the region of `p4.txt` below `---` (modulo its missing final newline), with no deposit header.

Files were read as raw bytes; `p5.txt` contains a lone `0x80` and is not valid UTF-8, and no
decoding or normalisation was applied to any payload.

## §4 Table

    p1  2e6faeac289e99474917ef96bfdf487dbff7a9ced6451efb2c2d24a334e9ede3
    p2  fc589f76deb79ab0f404be2e6403f3bd9ee70a2c11681b06700191d1c044b416
    p3  166a6b7a82151876dbdc831ce32e586739a25a7f6dda9afc09e1189d41f262f1
    p4  19bc80c87f8dd22e8c93dc705a2fd67ce8009a5370a2ff134b491e8207a38bc5
    p5  8f32a46c89a6663700a03c841742728cb8a0aa8a058acbd12696807760bca00d
    p6  dcd7e7407c06162cbcb9325bffca7d278956a0e02c7750eca255340242b3ac79

## §5 Control

`sha256(payloads/control.bin)` = `785b0751fc2c53dc14a4ce3d800e69ef9ce1009eb327ccf458afe09c242c26c9`
(1024 bytes).

## Notes on §4

No exceptions: every payload has a value.

Two payloads carry fields that are part of the digested bytes and were digested as such, without
being treated as inputs to or overrides of the digest:

- `p2` declares `id: env-2` in its envelope while the deposit header assigns `relay-9002`. MUST 3's
  neighbouring envelope convention (lines 314–321) makes that a check an authority must perform;
  whether it passes is a conformance question, which §7 places outside this task. It does not
  change what `sha256(bytes)` is.
- `p6` declares `sha256: 0000…0000` in its envelope. Under MUST 3 content identity is computed
  from the bytes, so this field is ordinary content inside the digested region and is not the
  record's digest.
