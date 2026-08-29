# Over which bytes does `sha256(bytes)` run?

## 0. Preliminaries

**Spec integrity.** `sha256sum SPEC.md` →
`847b8971d36390cd8843da7ebe59bc3499cd8050473425eb91a4a09f30b9901c`. **It matched** the
value given in the contract. Executed.

**How behaviour was established.** Every behavioural claim below was produced by running
the five supplied files. `src/*.ts` was copied unmodified to `probe/` and driven by
scripts in `probe/` (`m1.ts`, `m2.ts`, `m4.ts`, `m5.ts`, `m6.ts`, `m9.ts`, `m9b.ts`,
`m10.ts`), each writing to a fresh `mkdtemp` store root. Runtime: `bun 1.3.14`, which is
the runtime SPEC.md's K5 says the reader runs under. Node v22.19.0 is present but, as
K5 records, cannot resolve the `.js`→`.ts` specifiers. Nothing outside this directory
was read. Where I say "inferred" I did not run it.

**Line numbers.** The spec's own citations were checked against the supplied files.
`store.ts:127-133` is exact (the `parse` split). `reference.ts:94` and `:105` are exact.
`deposit.ts:68` (`held.has(proposedId)`) is exact. `deposit.ts:102`, cited for "the
receiving store writes the deposit header," is **off by five** — the write is at
`deposit.ts:107`; line 102 is prose in the comment above it. `store.ts:87` is one or two
lines above the `relay-0060` mention it cites (line 89). Noted because I cite the same
files.

---

## 1. The question has five axes, not one

"Which bytes" reads as a single question about *extent* — where does the digested region
start and stop. Measurement shows it is at least five independent questions. Two
implementations that agreed on extent and disagreed on any one of the others would
produce different digests for the same record.

| | axis | the question | spec | implementation | agree? |
|---|---|---|---|---|---|
| **A** | **extent** | whole file, or the record below the deposit header, or the payload below the record's own headers? | determines it (derivably, not by a definition) | record below the deposit header, headers included | **yes** |
| **A′** | **self-identity** | is the record's own `id:` inside the digested region? | says both things | yes, it is inside | **contradicts itself** |
| **B** | **fidelity** | the bytes the sender emitted, or the bytes the store stored? | silent | the *stored* bytes: `trimStart` + a trailing `\n` the sender may not have written | **no position; impl contradicts its own docstring** |
| **C** | **type** | octets, or a decoded text string? | silent | decoded UTF-8 text, lossily — the digest is **not injective over file bytes** | **no position; impl is internally inconsistent** |
| **D** | **time** | the bytes as bound, or the bytes present now? | presupposes "as bound" | recomputed from disk on every read; no digest is ever persisted | **no** |

Axis A is the one a first reading suggests. A′, B, C and D were found by running the
code, and three of them are places where the implementation settled something the
specification never asked about.

---

## 2. Axis A — extent

### What the spec determines

MUST 3 is the clause the contract quotes, and it does not define `bytes`:

> **3.** Record content is identified by `sha256(bytes)`, stable across ids. Record identity
> and content identity are different things and neither derives from the other.

The kernel names the axis but disclaims normative force. K1 and K2:

> | **K1** | artifact boundary | what counts as *one artifact*. The receiving store writes the
> deposit header (`deposit.ts:102`) and `loadStore` splits it off again (`store.ts:127-133`),
> so the boundary is ours and is not in the bytes. Irreducible — byte extraction is a
> function and needs its domain first. **Our only 100%-failure-rate decision.** |
>
> | **K2** | byte extraction | which bytes are digested. Every digest failure here was K2:
> OBS-055 four times, relay-0237 twice. |

and the section they sit in disclaims itself:

> **This section and the one above it constrain no requirement below** (audit finding F10, pin
> `6dfcce1`). Of K1–K6 only K3 reappears, in MUST 3 [...] An implementer can build from the
> MUST/MAY/MUST NOT sections alone and lose nothing.

So the kernel *describes* the implementation's boundary; it cannot *require* it. But the
extent is nevertheless **determined by normative text**, in three independent places:

1. MUST 3's own qualifier — "**stable across ids**". The deposit header contains
   `assigned-id: relay-NNNN` (`deposit.ts:107`). A digest over the whole file therefore
   varies with the id by construction, and could not be stable across ids.
2. The Named failures table:
   > | duplicate content | none | two ids, one digest. Correct, and needs no resolution |
   Two ids and one digest is unachievable under a whole-file domain.
3. Cross-store citation, which is normative:
   > **Cross-store citation is normative (chatgpt relay-0354):** within one identified store the
   > pair `(locator, digest)` is sufficient; crossing an authority or store boundary the citation
   > MUST be `(store identity, locator, content digest)`
   The deposit header is written by the *receiving* store and records the delivery channel
   (`deposited-by:`, `provenance:`). A digest including it is a fact about one store's
   receipt, so a "content digest" that crosses a store boundary could not be computed by
   the citer or reproduced by the cited store's peer. The MUST would be unsatisfiable.

Against the *lower* boundary — digesting only the payload below the record's headers —
the spec is explicit:

> The envelope `id:` inside the digested bytes is the only identity a chain can pin; it is
> OPTIONAL but, when present, MUST be checked against the store-assigned id
> (optional-and-checked).

"inside the digested bytes" places the record's own header block within the domain.

**Search performed for silence.** `grep -in` over SPEC.md for `octet` (0 hits),
`encoding` (0), `utf` (0), `canonical` (0), `normalis`/`normaliz` (0), `whitespace` (0),
`newline` (0), `trailing` (0), `trim` (0). `serial` returns one hit, K4's "serialization
of the hash list" — about the *manifest*, not about a record, so irrelevant to this axis.
`domain` returns one hit, K1's "byte extraction is a function and needs its domain first"
— which names the gap rather than filling it. `byte`/`bytes` returns 20 hits (lines 75,
76, 79, 88, 91, 112, 130, 164, 173, 187, 193, 210, 242, 258, 261, 294, 304, 306, 316,
318, 353); all are quoted or accounted for above except line 79 ("two `bun` runs are
byte-identical at 531 bytes") and line 353 ("byte-identical" verdicts), which are about
run reproducibility, and lines 88–91/258–261, which are about *availability* of named
bytes rather than their extent.

### What the implementation does — measured

`store.ts:130-133` splits at the first `\n---\n`; `store.ts:161` digests only the part
after it.

M1 deposited `"@p-e/x0\nid: relay-0001\nfrom: alice\nto: bob\n\nbody line one\nbody line two\n"`
at `relay-0001` and compared the reported digest against six candidate domains:

```
reported sha256      : 314d7a7b5eeef0c99d04b9ab52129b3ab3163d5bf0b9860cf9ff3d0ec87f9828
candidate A whole file (octets)     : 93a8e1d4de90bd58c4… false
candidate B whole file (utf8 str)   : 93a8e1d4de90bd58c4… false
candidate C after deposit header    : 314d7a7b5eeef0c99d… true
candidate D caller's exact input    : 314d7a7b5eeef0c99d… true
candidate E payload below headers   : 2cd291938c2f91125f… false
candidate F header block only       : 9b5d00f5b936fc4dc5… false

file on disk : "deposited-by: mcp\nprovenance: as-received\nassigned-id: relay-0001\n---\n@p-e/x0\nid: relay-0001\nfrom: alice\nto: bob\n\nbody line one\nbody line two\n"
digested     : "@p-e/x0\nid: relay-0001\nfrom: alice\nto: bob\n\nbody line one\nbody line two\n"
```

C and D coincide here only because this input was already canonical; §4 separates them.

M3 deposited byte-identical content through both entry points into two different stores —
`appendRelay` (`mcp`/`as-received`, id `relay-0001`) and `depositLocal` (`alice`/`authored`,
id `relay-0009`):

```
mcp/as-received  relay-0001 8882c101a47dac424d25be4c3694f9e45fd70fa4ca3f21fe5e7b2d42ecdd1f85
local/authored   relay-0009 8882c101a47dac424d25be4c3694f9e45fd70fa4ca3f21fe5e7b2d42ecdd1f85
record digests equal : true
whole-file digests   : 786f26fd… / 15b69c99…   equal: false
```

M7 deposited identical content at two ids in one store: one digest
(`5e1e066f8231ffb9…` twice), while the whole-file digests differ.

M6 settles which domain the *checkable* claim uses. A parent was deposited; two children
were deposited, one declaring `parent-sha256:` = the parent's record digest, the other
declaring the parent's whole-file digest. `checkContinuity` (`continuity.ts:71`, which
compares against `store.get(parent).sha256`) returned:

```
relay-0001 NO_CLAIM
relay-0002 MATCHES   (record digest)
relay-0003 DIVERGES  (whole-file digest)
```

### Verdict on axis A

**Agree.** The implementation digests the record as deposited — its own header block
included, the store's deposit header excluded — and this is what the spec's normative
text requires, even though no clause states it. `store.ts:53-66` gives the same reasoning
the spec gives, in the same words: "Not the whole file: `deposited-by:` and `provenance:`
are written by the *receiving* store and differ by delivery channel, so a whole-file
digest names bytes the sender never wrote."

### One structural weakness on this axis

The boundary is a text search for the first `\n---\n` in a string the store itself
assembles from an unvalidated caller-supplied field. `depositLocal`'s `depositor` is
interpolated at `deposit.ts:107` with no check. M5c deposited real bytes with
`depositor = "mcp\nprovenance: authored\n---\n@p-e/x0\nfrom: victim\n\nFORGED PAYLOAD\n\nz"`:

```
deposit returned sha256  : 1567dccd423c145889f10d8f82797b870a59e8c519b295858179a3a9603ab3eb
sha256 of supplied bytes : e5b6faa1d9da5d5083cb5fc71cd506b529c79836114995720436c3cc00a635f1  (DIFFERENT)
record.from parsed as    : victim
record.provenance        : authored
record.depositedBy       : mcp
digested region          : "@p-e/x0\nfrom: victim\n\nFORGED PAYLOAD\n\nz\nprovenance: as-received\nassigned-id: relay-0001\n---\n@p-e/x0\nfrom: attacker\n\nthe bytes the depositor actually supplied\n"
```

The deposit succeeded, survived the read-back check (`deposit.ts:122-131`), and the digest
now covers a region the *caller* chose. This is on the digest-domain axis, not beside it:
K1 says "the boundary is ours and is not in the bytes," and the measurement shows the
boundary is in the bytes and is negotiable by whoever calls the write path. A framing
rule (length prefix, or a forbidden-character check on the three deposit-header fields)
is what would make K1's sentence true.

---

## 3. Axis A′ — is the record's own `id:` inside the digest?

The spec answers this twice, incompatibly.

> **3.** Record content is identified by `sha256(bytes)`, **stable across ids**.

> The envelope `id:` **inside the digested bytes** is the only identity a chain can pin

If the envelope `id:` is inside the digested bytes, then content identity is *not* stable
across ids for any record that carries one: moving the same content to another id changes
the digest. The two sentences cannot both hold for records with an envelope id.

**Measured (M10).** In one store:

```
-- content carrying `id: relay-0001`, deposited at two ids --
relay-0001: 67e384be83ca19c5ce8abb559857d26bf054c68aa8c0649be4212c477e9ea2c3
relay-0002: REFUSED -> the record declares id: relay-0001 and would be stored as relay-0002

-- same content, envelope id omitted --
relay-0003: f96c193f0789e4a1afa9d1e7997f5bc3e3ff2c66d4d5fcbbbc06642c28d47bfd
relay-0004: f96c193f0789e4a1afa9d1e7997f5bc3e3ff2c66d4d5fcbbbc06642c28d47bfd   one digest across two ids: true

with id : 67e384be…   without : f96c193f…   equal: false
```

The implementation resolves the contradiction by *forbidding the case*: `deposit.ts:87-90`
refuses a deposit whose declared `id:` differs from the assigned id, so content bearing an
envelope id can never reach a second id, and MUST 3's "stable across ids" is never
observably violated — at the price that the MAY on line 205 ("Content deduplication across
ids") and the Named-failures row "duplicate content → two ids, one digest" apply only to
records that omit the envelope `id:`. That restriction is nowhere stated in the spec.

**Verdict: the spec contradicts itself; the implementation picks the horn that keeps the
envelope pinnable and silently narrows the dedup guarantee.** The narrowing is the right
call and should be written down.

---

## 4. Axis B — fidelity: the sender's bytes or the store's?

### Spec

Silent. The searches in §2 found no occurrence of `trim`, `whitespace`, `newline`,
`trailing`, `canonical`, `normalis`/`normaliz`. The nearest thing to a position is
negative and about the *reverse* direction — the spec forbids the store to strengthen or
alter what it received ("MUST NOT silently strengthen"; "A content digest attests
transmission and storage. It does not attest composition"), and the deposit path's own
comment states the invariant explicitly at `deposit.ts:98-101`:

> `bytes` is "the record exactly as deposited, never re-serialised", and editing a record
> marked `as-received` would have the store alter content while claiming it only received
> it, **changing the digest its sender computed**.

`store.ts:49` states the same as a field invariant: "The record exactly as deposited.
Never re-serialised."

### Measured — the invariant is false

`deposit.ts:107` applies `bytes.trimStart()`; `deposit.ts:109` appends `\n` when the
record does not end with one. M2 deposited six shapes and compared the store's digest
with `sha256` of the caller's exact input:

| caller bytes | store digest == sha256(caller)? |
|---|---|
| `"@p-e/x0\nfrom: a\n\nbody\n"` | yes |
| `"@p-e/x0\nfrom: a\n\nbody"` | **no** |
| `"\n@p-e/x0\nfrom: a\n\nbody\n"` | **no** |
| `"   @p-e/x0\nfrom: a\n\nbody"` | **no** |
| `"@p-e/x0\r\nfrom: a\r\n\r\nbody\r\n"` | yes (CRLF preserved) |
| `"@p-e/x0\nfrom: a\n\nbody\n\n\n"` | yes (trailing blanks preserved) |

In every "no" row the store's digest equals `sha256` of the *stored* region, and the
stored region is `trimStart(input)` with a newline appended. The digest domain is
therefore **the bytes the store wrote**, not the bytes it was handed. Trailing whitespace
other than the final newline is preserved, and line endings are untouched — so the
normalization is neither absent nor complete.

### The observable consequence, end to end (M9a)

A sender emits a record with no trailing newline, computes `sha256` over what it emitted,
and publishes that digest. A child record cites it as `parent-sha256:`:

```
sender-computed digest : 8cf736ec875185eb3a3d875b8c4baec78262d413591c02635d7dadb571941281
store digest for it    : 3e9565e3d87e93761bb43f3427e24b0d1cf5ea20d2c6f8e76de01c3db9788b0f
continuity verdict     : DIVERGES   (nothing was corrupted)
```

`DIVERGES` is documented in `continuity.ts` as "both are known and they differ — **a defect
in the record**." The spec's whole apparatus for distinguishing our-access problems from
their-error problems (`UNCHECKABLE` vs `DIVERGES`, the I-1 substitution the store exists to
refuse) is defeated by an added newline. This is the *exact* failure mode the spec names in
its list of things a digest cannot save you from — "`relay-0236` carries a permanent,
verifiable digest over content that was already corrupt when it arrived" — except that here
the store, not the transport, introduced the difference.

**Verdict on axis B: the spec has no position; the implementation has one and it
contradicts the invariant both files claim to uphold.** Either the store must digest what
it received byte for byte (and refuse or store non-canonical input unmodified), or the
spec must define a canonicalization that senders can apply *before* computing the digest
they publish. It currently does neither, and the divergence is silent.

---

## 5. Axis C — type: octets or decoded text?

### Spec

Silent, and the search is the strongest evidence of it: `octet` 0 hits, `encoding` 0 hits,
`utf` 0 hits (case-insensitive), across all 410 lines. The word "bytes" appears 20 times
and is never given a type.

### Measured — the digest is over text, and is not injective

`store.ts:188` reads with `"utf8"`, producing a JS string; `store.ts:161` hashes that
string, which Node encodes back to UTF-8. Invalid octets are replaced with U+FFFD on the
way in and never recovered. M9b wrote three *different* files to the same id in turn:

```
0x80                       file= 94 octets  octet-sha=72789356…  RECORD DIGEST=c5675a98bbbc05d8d9a93431f11e3b019154103dfc1d5b0a7adfd6d9da3b9b8b
0xFF                       file= 94 octets  octet-sha=c89eb46b…  RECORD DIGEST=c5675a98bbbc05d8d9a93431f11e3b019154103dfc1d5b0a7adfd6d9da3b9b8b
literal U+FFFD (3 octets)  file= 96 octets  octet-sha=5d7f8ad1…  RECORD DIGEST=c5675a98bbbc05d8d9a93431f11e3b019154103dfc1d5b0a7adfd6d9da3b9b8b
```

Three distinct byte sequences, two distinct file *lengths*, one digest. M4 confirmed the
same three as three coexisting records in one store.

This is not a theoretical collision — it needs no cryptographic work, only a byte the
UTF-8 decoder rejects. It directly weakens two guarantees:

- **G1** — "an id, once bound, never names other bytes." The digest can only ever witness
  that the id names the same *text*. An id can name different bytes with its digest
  unchanged.
- **MUST 4** — "a bound `(authority, seq)` never changes its digest." Satisfied, above,
  while the bytes at that id changed and grew by two.

Unicode normalization is *not* applied, measured (M4b): NFC `café` digests to
`39f9875850b07f5f…` and NFD `café` to `20d4149a77ff0add…`. So the domain is "the UTF-8
re-encoding of the lossy UTF-8 decode," which is a strictly worse object than either
raw octets or normalized text: it discards information without gaining a canonical form.

On the write side the same axis appears as an input-type restriction: `deposit`'s
parameter is a `string` (`deposit.ts:57`), so a record that is not valid UTF-8 text
cannot be deposited at all. M5a deposited a lone surrogate; the reported digest equals
`sha256` of the caller's string, but only because Node's own string hashing performs the
same U+FFFD substitution — verified directly: `sha256("\uD800") == sha256("�") ==
83d544ccc223c057…`. The lossiness is symmetric, which is why it is invisible.

### The implementation contains the other answer as well

`manifest.ts` is the second digest site in the supplied set, and it has a *different*
domain on both axis A and axis C: `sha256(bytes: Uint8Array)` (`manifest.ts:30-31`) over
whole-file octets read with no encoding (`manifest.ts:46`). M8 took one record file and
digested it both ways:

```
manifest domain (whole file, octets) : 3e071c41308afbb4db9623ace58eef289d8b4256fea0cc46a88a41705eda9be1
store domain    (record, text)       : 59cdee472466981945af5d971fd79fafbeece2004c0c356da9a561555bf3b79b
```

One repository, two functions named `sha256`, two answers for one object. The spec's K2
("byte extraction") and K4 ("manifest format") do not distinguish them, and nothing names
which one a `(store identity, locator, content digest)` citation is supposed to carry.

**Verdict on axis C: the spec has no position; the implementation holds both positions in
different files, and the one used for records is the lossy one.**

---

## 6. Axis D — time: the bytes as bound, or the bytes now?

### Spec

The spec presupposes a persisted digest. MUST 6:

> - **Deletion.** The ledger keeps `(authority, seq, digest)` and answers with it; the
>   payload reads `KNOWN_MISSING`. A client must never confuse *content removed* with
>   *no binding*.
> - **Crash between ledger and payload.** Ledger committed, bytes never written: the
>   id is bound and the content unreachable. That state is `KNOWN_MISSING` — the
>   digest and the binding are known — not `UNKNOWN` and not an error.

MUST 4:

> A **conforming** authority's ledger is non-rewindable: a bound `(authority, seq)`
> never changes its digest.

Both sentences require the digest to be a *recorded* value, separable from the payload.

### Measured

No digest is stored anywhere. `store.ts:161` recomputes it from the file on every
`loadStore`. M5b deposited a record, edited the file, and reloaded:

```
at deposit : cb4a8d3c571e3678ca757b8baec1bf6394da8586c680099527737989c766885d
after edit : 51e9598240bb22acd95aa308905e428afae2274cfe950fe6be80f950484f807a
loadStore threw? no.  any persisted digest to compare against? no
```

`parse` does check `assigned-id:` against the filename (`store.ts:151-156`), so a *rename*
is caught. A content edit is not, because there is nothing to catch it with.

`deposit.ts:137` returns `stored.sha256` — the digest read back through the parser rather
than one computed at the door — so the write path and the read path do agree with each
other; they simply both answer "the bytes present now."

The manifest path is the counter-example again: `loadCorpus` compares the recomputed
digest with the one recorded in `manifest.json` and throws `digest mismatch` on
disagreement (`manifest.ts:47-50`) — measured working in M8.

**Verdict on axis D: disagree.** `sha256(bytes)` as implemented for records is a checksum
of current state, not a ledger entry. MUST 4 is not merely unimplemented; it is
unimplementable against this domain, and MUST 6's `KNOWN_MISSING`-with-digest is
unreachable — delete the file and the digest goes with it. The spec is candid that v1 has
no ledger ("v1 has no ledger to extract them from"), but it is not candid that MUST 4 and
MUST 6 already assume one.

---

## 7. Consequences: what two implementations would disagree about

Every row is an observable disagreement, not a stylistic one.

| axis | choice X | choice Y | what they observably disagree about |
|---|---|---|---|
| A | whole file | record below deposit header | Same content relayed through two channels or two stores. X: two digests, so a cross-store `(store identity, locator, content digest)` citation never resolves and every `parent-sha256:` written by a sender fails. Y: one digest. **Measured (M3): whole-file digests `786f26fd…`/`15b69c99…`, record digests identical.** |
| A | payload only | headers included | X: a record whose `parent:`/`from:` headers were altered in transit still verifies. Y: it does not. **Measured (M1): candidate E ≠ reported digest.** |
| A′ | envelope `id:` inside | outside | X: identical content at two ids has two digests, and dedup across ids is impossible for id-bearing records. Y: dedup works, but nothing in the digested bytes pins which record a chain link means. **Measured (M10).** |
| B | sender's exact bytes | store's stored bytes | Any sender whose record lacks a trailing newline. X: its published digest verifies. Y: the store reports a different digest and every citation of it reads `DIVERGES` — "a defect in the record" — with no defect present. **Measured (M9a).** |
| C | octets | decoded UTF-8 text | X: swapping `0x80` for `0xFF` in a record body changes its digest; a record that is not valid UTF-8 has a stable identity. Y: it does not, and three different files share one digest. **Measured (M9b).** |
| C | with NFC normalization | without | X: `café` composed and decomposed are one record. Y: two. **Measured (M4b).** |
| D | digest recorded at binding | recomputed on read | X: a post-hoc edit to a record file is detected and named. Y: it is silently adopted, and `KNOWN_MISSING`-with-digest cannot be answered after deletion. **Measured (M5b) against the manifest path's opposite behaviour (M8).** |

---

## 8. Conclusion

**The protocol should define `bytes` as:**

> the octet sequence the depositor supplied, taken exactly and unmodified, beginning at
> the first octet of the record's `@p-e/x0` line and ending at its last octet — the
> record's own header block included, the store's deposit header excluded — recorded at
> the moment of binding and thereafter compared against, never recomputed as a
> substitute for the recorded value.

Concretely, per axis: **A** — the record as deposited, headers in, deposit header out
(what the implementation does; required by MUST 3's "stable across ids", the
duplicate-content row, and the cross-store citation MUST). **A′** — the envelope `id:`
stays inside, and MUST 3's "stable across ids" must be narrowed in writing to records that
omit it. **B** — no `trimStart`, no appended newline; the store either stores what it was
given or refuses it. **C** — octets, not text; `readFile` without an encoding, hashing a
`Uint8Array`, which is what `manifest.ts:30-31` already does correctly. **D** — the digest
is written down at binding and checked on read, the way `loadCorpus` checks its manifest.

**Why.** Axis A follows from the spec and needs no argument beyond §2. The other three
follow from a single principle the spec states and the record implementation abandons: the
digest is the one claim a stranger can settle without a key. `store.ts:53-66` puts it
exactly — "a digest is checkable by anyone holding both without any key." A digest is only
that if the party who wrote the bytes and the party who checks them can both compute it
from the same object. Text decoding, silent trimming, and recomputation each break that:
the first makes the object ambiguous (three files, one digest), the second makes it
unavailable to the sender (the sender's own digest reads as a defect), the third makes it
unavailable across time (there is nothing to check against). Octets, unmodified,
recorded, are the only choice under which `parent-sha256:`, cross-store citation, MUST 4
and MUST 6 all mean what the spec says they mean.

**What it costs.**
- Axis C costs a corpus rehash: every stored digest changes for any record whose bytes are
  not pure ASCII, and any published `parent-sha256:` computed under the text domain becomes
  wrong. It also costs the parser its convenience — headers must be located in octets, or
  decoded for parsing while the digest stays on the raw slice. It gains: the digest becomes
  injective, and the store can hold records it currently mangles.
- Axis B costs deposits. Records that are not already canonical must be refused, and the
  spec's own `MUST NOT make deposit depend on…` instinct will read this as new strictness.
  The alternative — storing non-canonical bytes verbatim — costs nothing but a `.trimStart()`
  and a conditional, and is what the docstrings already promise. **I would take the
  alternative:** store exactly what arrived, refuse nothing new.
- Axis D costs the ledger the spec has already deferred. This is the expensive one, and it
  is the one v1 says it is not building. The cheap partial move — write the digest into the
  deposit header beside `assigned-id:`, checked on read exactly as `assigned-id:` already is
  (`store.ts:151-156`) — costs one line, catches post-hoc edits, and survives nothing else.
  It is not a ledger and must not be described as one, but it converts axis D from
  undetectable to detectable.
- Axis A′ costs a sentence in MUST 3 and nothing else.
- The framing weakness in §2 costs a validity check on three fields.

**This is not undecidable.** Axis A is decided by the spec's own normative text. Axes B, C
and D are not decided by the spec, but they are not *undecidable* either: for each of them
the spec states a purpose (a keyless, sender-computable, store-independent, time-stable
content claim) that only one of the candidate answers can serve. The implementation is
evidence of what one implementer did, and on axis A it did the right thing for the reasons
the spec gives; on B, C and D it settled by accident, through defaults — `"utf8"` on a
`readFile`, a `.trimStart()` added for tidiness, a digest computed where it was convenient.

**Confidence.**
- Axis A extent: **high**. Three independent normative supports, measured agreement,
  and the implementation's own reasoning matches the spec's.
- Axis A′ contradiction: **high** that the contradiction exists (both sentences quoted);
  **medium** that forbidding the case is the intended resolution — that is inferred from
  `deposit.ts:87-90`, not from any spec sentence.
- Axis B and C behaviour: **high** — directly measured and reproducible from the scripts in
  `probe/`. That octets is the *right* answer: **medium-high**. The counter-argument is that
  the store's records are text by construction, that the deposit path only accepts a
  `string`, and that no non-UTF-8 record can currently exist — so the collision may be
  unreachable in practice today. I do not find that reassuring for a *protocol*, but it is
  a real argument and it is why this is not "high".
- Axis D: **high** that no digest is persisted; **high** that MUST 4 and MUST 6 assume one.
- **Low** confidence that I have found every axis. I found five by measurement after
  expecting one, which is evidence that the enumeration is incomplete rather than that it is
  finished.

**What would change my mind.**
- On A: a normative clause defining the record as the whole stored file, which would make
  the cross-store citation MUST and the duplicate-content row wrong instead.
- On B: a statement in `docs/experiments/deposit-semantics.md` (cited three times in
  `deposit.ts`, not supplied) that the store canonicalizes on entry and that senders are
  expected to digest the canonical form. That would move B from "silent contradiction" to
  "underdocumented decision", and I would then argue only for writing it down.
- On C: evidence that the corpus and the protocol are defined over text — for example, a
  spec-level statement that records are UTF-8 text, plus a normalization rule. With both, the
  text domain becomes defensible; with only the first, it does not.
- On D: any file showing digests persisted at binding.
- On the count of axes: any of the four consumers I was not given.

**The evidence that would decide the open axes, by name from MANIFEST.txt.** All exist in
the repository and none was supplied:
- **`scripts/relay-digest.ts`** — the single most important missing file. Its name says it
  computes a record digest; if it computes one that differs from `store.ts:161` on any axis,
  the repository disagrees with itself in a fifth place and the question is settled by
  contradiction rather than by argument.
- **`src/envelope.ts`** — the envelope convention of §A′ presumably lives here.
- **`src/relay/mcp.ts`, `src/relay/cli.ts`, `src/relay/wait.ts`** — three further consumers
  of `sha256`; the contract described five files as "the write path, the store's reader, and
  three consumers", and the manifest shows the store has more consumers than that.
- **`tests/relay-deposit.test.ts`** — would show which of these behaviours the authors
  intended and which they never looked at, particularly on axis B.
- **`docs/experiments/deposit-semantics.md`** and **`docs/experiments/claim-matrix-v2.md`** —
  cited as authority by `deposit.ts:9-12`, `:41`, `:45`, `:210`.
- **OBS-055 and relay-0237**, named in K2 as the six historical digest failures ("Every
  digest failure here was K2"). Six K2 failures already happened and the spec records only
  their count. Which axis each was on would tell me whether B, C and D are new or recurrent.
  The relay corpus is in the manifest (392 records, `relay-0032`–`relay-0432`) and would
  contain them.

---

## 9. Out of scope, one line each

- `MANIFEST.txt` contains no `history/` directory, so MUST 1's allocation-marker mechanism —
  the stated fix for `relay-0183` — appears unimplemented, and `nextFree` (`deposit.ts:24-28`)
  is still the `max+1` the same MUST forbids.
- The spec's legacy measurements ("Ids run 32–298, 258 records") are stale against the
  manifest, which lists 392 record files up to `relay-0432`.
