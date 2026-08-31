# AUDIT — `impl/` against SPEC.md as amended by AMENDMENT.md

## Digest check

Both matched.

| file | expected (CONTRACT.md) | computed | |
|---|---|---|---|
| `SPEC.md` | `847b8971…b9901c` | `847b8971d36390cd8843da7ebe59bc3499cd8050473425eb91a4a09f30b9901c` | match |
| `AMENDMENT.md` | `abe840dc…5d644b` | `abe840dcd5bb00f5ecbfb7fc6e55b8cd4aaa8e049f2c4be0f53e572c4a5d644b` | match |

## Verdict

**No defects.** Nine rounds of probes (A–U below), run against the code as shipped,
failed to produce a MUST violation reachable by any in-scope operation. Four findings
about the *specification* are reported under their own heading.

Nothing in `impl/` was modified. Probes live in `audit/` and import `store.py`
unchanged; where instrumentation was needed it was applied to the *probe process*
(wrapping `os.open`/`write`/`fsync`/`link`/`unlink` in probe 3) or to a module
attribute inside a forked child that then hard-exits (probe 4). Post-run checksums:
`store.py` `e19d0cd8…`, `test_store.py` `ee20881a…`, `demo.py` `2dcb71d1…`.

---

## §3.1 — its own tests

`python3 test_store.py` → **63 passed, 0 failed**. `python3 demo.py` runs clean.

Read as evidence about the implementer's understanding rather than about correctness,
four things stand out.

**1. One test asserts a reading the specification does not settle, and it is the
load-bearing one.** Line 226:

```
check("a whitespace-only line does not end the header block",
      set(f) == {"id", "parent"}, str(sorted(f)))
```

Neither document defines "blank line". The suite fixes it to *empty (or bare CR) only*
and never tests the other reading. See specification finding **SF-1**, where the
consequence is executed.

**2. One test name claims more than the code delivers.** Line 182:

```
matching = rec(b"body", id="alpha-0001")
m = dep(st9, matching)
check("a matching envelope id is accepted at the id it names", m.locator == "alpha-0001")
```

This passes only because the allocator independently arrived at `alpha-0001` on that
deposit. A declared id does not direct allocation. Executed (probe T): depositing
`id: alpha-0004` into a fresh store is refused four times running and binds only on the
fifth attempt, when the walk happens to reach seq 4 — eight seqs consumed to bind one
record. The test as named would be read by a maintainer as a guarantee that a correct
declared id lands where it says; it is not one.

**3. The create-or-fail test does not go through the deposit path.** Lines 113 and 120
call `write_crash_atomic_create_or_fail` directly. That shows the primitive refuses; it
does not show `deposit` cannot rebind. Probe T closes that gap (`bound_locators()` has
no repeats after the 8-attempt sequence above), so this is a coverage gap in the suite,
not an error in it.

**4. The durability half of MUST 8 is asserted by no test.** The suite's write-order
test (line 141) checks only that `.bind` precedes `.rec` at the function level. That
the record's bytes are `fsync`ed *before* the directory entry naming them appears, and
that the naming directory is `fsync`ed after, is untested by the implementer. Probe H
verifies it independently and it holds.

No test asserts the negation of anything the specification requires.

---

## What I tried that did not break it

Every row was executed. Store roots were created under `/tmp` (tmpfs).

### A — admission, Unicode 15.0 Table 3-7 (AMENDMENT 9.2)
Sixteen boundary candidates. All twelve ill-formed forms refused `not_utf8` — bare
continuation `\x80`; overlong `\xc0\xaf`, `\xe0\x80\xaf`, `\xe0\x9f\xbf`,
`\xf0\x80\x80\xaf`, `\xf0\x8f\xbf\xbf`; encoded surrogates `\xed\xa0\x80`, `\xed\xbf\xbf`;
above U+10FFFF `\xf4\x90\x80\x80`; 5-byte `\xf8…`; `\xfe`; truncated `\xe2\x82`. All four
well-formed candidates admitted, including a NUL octet and noncharacter U+FFFE — which
is right: Table 3-7 is about well-formedness, not about assigned characters.

### B — the `@p-e/x0` prefix
`@p-e/x0` alone, and `@p-e/x0\n`, admit. A UTF-8 BOM before the magic and an uppercased
magic are refused `not_x0`. `@p-e/x0Z…` admits — 9.2 requires only that the candidate
*begin with* those octets.

### C — fidelity (9.3, 9.4)
Ten shapes: no trailing newline; multiple trailing newlines; CRLF throughout; NUL and
C0/C1 controls; multibyte and astral characters; 100 kB; leading whitespace in the body.
For all ten, the object file on disk, the `bound_content` handed back by `read`, and the
delivered candidate are the same octets, and the citation digest equals
`sha256(candidate)` computed outside the store. **No trimming, padding, re-encoding, or
appended framing.** The store's own `deposited-by` metadata is written into the ledger
entry and never into the digested octets — which is exactly the K1 trap SPEC flags
("the receiving store writes the deposit header … so the boundary is ours"), and the
implementation does not fall into it.

### D — MUST 1 under concurrency
128 deposits across 32 forked processes: 128 distinct locators, dense `0..127`, every
one reading `OK`. A 64-thread run in one process: 64 bound, 64 distinct, 0 errors.

### E — MUST 1 monotonicity
25 deposits with three seq-burning refusals interleaved: seqs strictly increasing,
never below the floor, and monotonicity survives closing and reopening the `Store` from
disk (next seq 33 > max 32). Allocation reads no maximum; it walks markers and takes the
first `O_EXCL` create that succeeds.

### F — seq exhaustion
At the ceiling the store raises `Exhausted("seq_space_exhausted")`. It does not wrap and
does not reuse.

### G — MUST 4, non-rewindable
Direct overwrite attempts against a bound id's `.bind`, `.rec`, and marker all refuse
`id_already_bound`; `create_marker` on an existing marker returns `False`; the ledger
digest is unchanged afterwards. All three files are mode `0444`.

### H — MUST 8, syscall ordering
Wrapping `os.*` in the probe process, one deposit produces:

```
open marker(O_EXCL) → fsync(history) →
open tmp(O_EXCL) → write → fsync(fd) → link(tmp → alpha-0000.bind) → unlink(tmp) → fsync(history)
open tmp(O_EXCL) → write → fsync(fd) → link(tmp → alpha-0000.rec)  → unlink(tmp) → fsync(objects)
```

For **both** binding writes the data is `fsync`ed before the name appears and the naming
directory is `fsync`ed after — MUST 8's "flushing the record and the directory entry
that names it, not only the record". The name appears by `link`, which returns `EEXIST`
rather than replacing; the `rename` trap MUST 8 names verbatim is avoided. And the ledger
precedes the record, as *Named failures* requires.

### I — crash windows
A forked child hard-exits (`os._exit`, no flush) at three points, then the parent reopens
the store:

| crash point | left on disk | visibility | verdict |
|---|---|---|---|
| before the ledger write | marker only | `UNKNOWN` | `NOT_BOUND` |
| after the ledger, before the payload | marker + `.bind` | `KNOWN_MISSING` | `CONTENT_UNREACHABLE` |
| payload tmp written and fsynced, killed before the `link` | marker + `.bind` | `KNOWN_MISSING` | `CONTENT_UNREACHABLE` |

Row 2 is MUST 6's second bullet verbatim — "the id is bound and the content unreachable.
That state is `KNOWN_MISSING` … not `UNKNOWN` and not an error" — and the ledger still
answers with the digest and extent. No crashed id is ever handed out again; reads of
every id in `history/` after the three crashes raise nothing. A stray `tmp/` file
survives, which is inert (nothing enumerates `tmp/`) and is crash *recovery*, excluded
by BUILD-CONTRACT §2.

### J/K — header block, envelope id
Field extraction is scoped to the header block; a `id:` line below an empty separator
line is neither adopted nor rejected (deposits and reads `OK`). An indented ` id:` is not
a field. See SF-1 for the whitespace-separator case.

### L — fuzz
400 pseudorandom admissible candidates (mixed line endings, embedded `@p-e/x0`, NULs,
astral characters, random header combinations); 339 admitted, 61 refused for stated
reasons. After **closing and reopening the store from disk**: 0 round-trip failures —
every `bound_content` octet-identical, every digest equal to an externally computed
`sha256`, every recorded extent equal to the delivered length, every visibility
`PRESENT`, every locator distinct, no seq reused.

### M — input surface
`bytearray` accepted and stored identically. `extent=True`, `extent=-1`, `extent=3.0`
refused `bad_extent` (the `bool` case is explicitly guarded); a `str` candidate refused
`not_octets`. None of these consumed a seq.

### N — MUST 3 as amended
Two fresh stores given the same *number* of deposits but wholly different content produce
identical locator sequences; identical content deposited twice produces distinct
locators with one digest. Record identity is a function of allocation order alone. (The
amendment says a store "cannot observe" this rule; the above is the strongest black-box
evidence available, and the allocator's source confirms it reads only the marker set.)

### O — MUST 2
With `g1_floor=100` and 50 deposits, no marker exists below 100, a read below the floor
answers `UNKNOWN`/`NOT_BOUND`, and `authority.json` carries the declaration:
`"authority alpha claims G1 from seq 100 and makes no claim below it; no exceptions are
declared or declarable"`. The floor is a required config key with no default.

### P — MUST 6, all eight states of {marker, bind, object}
The three in-scope rows (`111`, `110`, `100`) give `PRESENT/OK`,
`KNOWN_MISSING/CONTENT_UNREACHABLE`, `UNKNOWN/NOT_BOUND`. No fourth visibility state
appears anywhere. See the note under *Not a defect* below for the `marker=0` rows.

### R — MUST 7
`witnesses == []` and `witnesses_absent is True` in every reachable verdict. Absence is
an empty collection, not a "no evidence found" string.

### S — create-or-fail against a hostile target
A dangling symlink planted at an id's object path does not fool `os.link`: the deposit
refuses `id_already_bound` and no file is created at the symlink's target.

### T — the abandoned-id path
Eight deposits declaring `id: alpha-0004`: seven refused, one bound, eight seqs consumed,
`bound_locators()` contains `alpha-0004` exactly once. Burning a seq per mismatch is
sanctioned by SPEC ("`deposit.ts` records ids being abandoned once taken").

### U — the parent MUST NOT
Deposit succeeds with a `parent:` naming a record that is tampered
(`EXTENT_MISMATCH`), never allocated, abandoned, or the depositing record itself. Deposit
does not depend on the parent being present or readable, per the MUST NOT.

### Also checked, no violation
`Citation` is always the `(store identity, locator, content digest)` triple and never a
bare locator; `store_identity` comes from configuration, not from `self.root`, so it is
"not a filesystem path" as the citation clause requires. `read` verifies against the
recorded digest on every call, and the only operations that return bound-content are
`read` — `bound_locators`, `allocated_seqs`, `ledger_entry`, and `visibility` return
store metadata only, which the amendment's *Read* definition excludes. Admission is
tested before verification on read (10.4), and the admission failure is what is reported.
`digest_recorded=False` yields `UNVERIFIABLE` with no content (10.5). Nothing in the API
exposes a "latest"/"unreferenced" verdict, a cross-authority order, or an attribution
claim; `deposited-by` defaults to `"unattributed"` and is carried as channel framing.

### Not a defect, but recorded
Deleting an allocation *marker* while its `.bind` survives puts `visibility()` and
`read()` out of step: the pair reports `UNKNOWN` alongside verdict `OK` **with
bound-content returned** (row `marker=0 bind=1 obj=1`), or raises an uncaught
`FileNotFoundError` (row `marker=0 bind=1 obj=0`). `UNKNOWN` while handing back the
bound bytes is not honest under MUST 6. I am not reporting it as a defect because no
operation the store performs removes a marker, MUST 1 requires the marker to persist for
the authority's life, and deletion is excluded by BUILD-CONTRACT §2 — the state is
unreachable in scope, and a defect must be one the implementation can be driven into.
Recorded because it is one `os.remove` away from mattering if deletion is ever built.

---

## Findings about the specification

These are places where the implementation reads a clause one way and I read it another,
and I cannot show its reading is incoherent.

### SF-1 — "blank line" is never defined, and it decides the header/body boundary

AMENDMENT, *Header block*: "The octets of bound-content above its **first blank line**."
SPEC line 318 gives the same scope for the envelope check and then adds the constraint
that depends on it:

> "The check is scoped to the header block - the bytes above the first blank line - and a
> header-like line quoted in a record body is not a field and **must not be adopted or
> rejected as one**."

The implementation (`_is_blank`, `store.py:153`) counts only an empty line or a bare `\r`
as blank. A line holding a space or a tab is header block. Executed (probe J/K):

```
candidate: @p-e/x0\nsubject: a\n \nid: alpha-9999\nbody\n     ← separator is one space
observed:  Refused("declared_id_mismatch",
                   "envelope id: alpha-9999, store-assigned alpha-0000;
                    alpha-0000 is now allocated and abandoned")

candidate: @p-e/x0\nsubject: a\n\nid: alpha-9999\nbody\n      ← separator is empty
observed:  bound alpha-0000, read OK
```

Under my reading — a line carrying only whitespace is a blank line — the first candidate
has `id: alpha-9999` in its *body*, and refusing the deposit is exactly the "rejected as
one" the clause forbids. Under the implementation's reading the line has octets on it, so
it is not blank, so the `id:` is a header field and the check applies. I cannot show the
narrower reading is incoherent: "blank" plausibly means "empty", and the amendment defines
the block by octets, not by rendered appearance. So this is a gap in the specification.

It is not free of consequence: which reading a store picks decides whether a record whose
author separated header from body with an accidental space is bound, refused, or bound
with body lines silently in force as headers — and two stores disagreeing here disagree
about `parent:` scoping and about the envelope check on the same octets. The term is used
in two normative documents and defined in neither.

### SF-2 — whether a declared `id:` may direct allocation is left open

SPEC, *Envelope convention*: "The envelope `id:` inside the digested bytes is the only
identity a chain can pin; it is OPTIONAL but, when present, MUST be checked against the
store-assigned id (optional-and-checked)."

The clause fixes the *check* and says nothing about the *allocator*. The implementation
allocates first and checks after (`store.py:349-356`), so a declared id can only be
satisfied by coincidence. Probe T: binding one record that declares `id: alpha-0004` into
a fresh store took eight deposits and consumed eight seqs, seven of them abandoned. A
store that instead attempted the declared id's marker first — still an `O_EXCL` claim,
still no `max+1`, still one writer — would satisfy the same sentence, satisfy MUST 1, and
make the declared id usable as SPEC says it is ("the only identity a chain can pin").

SPEC does sanction abandonment ("deposit.ts records ids being abandoned once taken"), so
the chosen reading is coherent and I am not reporting it as a defect. But the sentence
that makes the envelope id *useful* and the sentence that governs allocation are never
joined, and under the implemented reading a chain author cannot in practice pin an
identity — which is the thing the clause exists to make possible.

### SF-3 — MUST 6's visibility vocabulary is closed; AMENDMENT 10.3's verdict is open, and the two are never joined

MUST 6: "Visibility state is exposed honestly: `PRESENT` / `KNOWN_MISSING` / `UNKNOWN`."
AMENDMENT 10.3: "The verdict when the recorded and recomputed content identities disagree
is **not defined by this document**… no behaviour is admissible under 10.3 that another
MUST forbids."

The implementation answers on two axes: visibility stays `PRESENT` and a second field
carries `DIGEST_MISMATCH` (executed: tampering an object yields `visibility=PRESENT,
verdict=DIGEST_MISMATCH`, no content returned). A reader could equally hold that MUST 6
enumerates the *whole* answer a store may give about a record, there being no fourth
state, and that a store holding octets which are not the bound-content must therefore say
`KNOWN_MISSING` — the bound content genuinely is unreachable — rather than `PRESENT`.
Both are defensible: `PRESENT` is honest about the bytes on disk, `KNOWN_MISSING` is
honest about the binding, and MUST 6's own gloss ("a failure MUST NOT be reported as
absence") cuts toward the implementation's choice while its closed enumeration cuts away
from it. The specification never says whether "visibility state" is the store's whole
answer or one axis of it.

### SF-4 — MUST 5 requires a label it never names, and names no party to enforce it

MUST 5: "Cross-authority references are **observations** and MUST be labelled as such."

No label is specified. The implementation refuses a cross-authority `parent:` and steers
the depositor to `ref:` in the refusal text, then accepts `ref: beta-0001` with no
validation at all — as it accepts any other field name (executed, probe U/§tests). That
satisfies the negative half of the clause (nothing cross-authority travels as `parent:`)
and leaves the positive half unimplementable: with no reserved label, a store cannot tell
an observation from any other header, so "MUST be labelled" binds the *author*, whom the
protocol cannot reach. This is coherent — the clause may well be addressed to authors —
but as written it reads as a requirement on the store, and no store can discharge it.

---

## What I could not test, and why

- **Real durability.** I verified the *ordering* of `fsync`/`link` syscalls (probe H),
  not that `fsync` reached stable storage. Every store root here is on **tmpfs**, where
  `fsync` is a no-op and no power cut is available to me. MUST 8's "the bytes are durable
  before the name that points at them appears" is therefore established as correct
  *structure*, not as observed survival of a power loss.
- **Filesystem portability.** The whole create-or-fail mechanism rests on `link`
  returning `EEXIST` and on `O_EXCL`. Both behave correctly here; a filesystem without
  hardlinks (some network and FAT mounts) would break `deposit` outright. I could not
  test another filesystem inside this directory.
- **Crash recovery, deletion, migration, multi-authority, cross-authority history.**
  Excluded by BUILD-CONTRACT §2, so not defects here. I tested the *states* a crash
  leaves (probe I) because MUST 6 legislates one of them directly, but not repair.
- **The MAY surface** — witnessing, replication, content deduplication — is not built,
  which BUILD-CONTRACT permits and `store.py`'s module docstring declares.
- **The decision journal.** `impl/` contains only `store.py`, `test_store.py`, and
  `demo.py`. `DECISIONS.md` and `NOTES.md`, which BUILD-CONTRACT §7 makes the deliverable
  and which both source files cite by number ("DECISION 2", "see NOTES.md"), are not in
  what I was given. I judged the code against SPEC and AMENDMENT alone and could not
  check it against its own recorded reasoning — which is where SF-1 through SF-4 would
  most likely already be written down.
- **K5, evaluator determinism.** SPEC marks it untested in its own kernel; nothing in
  `impl/` claims it, and there is no evaluator here to test.
