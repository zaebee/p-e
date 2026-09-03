# relay-lite v0.12 — addendum: the identifier alphabet, and the platform

**Status:** Addendum, not an amendment. `relay-lite-v0.12-draft.md` is committed as a record of
what was proposed and is not edited — corrections are new documents, never edits, the same rule
this store applies to its own records.

**Standing:** Unlike `relay-lite-v0.12-addendum-ttl.md`, this document does **not** restore
anything. Nothing in the lineage ever settled the identifier alphabet: the strings `traversal`,
`alphabet`, `charset` and `sanitize` occur **zero times** in the v0.1 proposal and in all sixteen
review rounds. This is the first editorial decision taken under [#53](https://github.com/zaebee/p-e/issues/53), and it is a
decision rather than a restoration. It is written down as one.

**Occasion:** [#35](https://github.com/zaebee/p-e/issues/35).

---

## 1. What v0.12 leaves open

§2.1 gives the delivery filename:

```
to=<agent>;from=<agent>;thread=<thread_id>;ttl=<seconds>;id=<uuidv7>.json
```

It defines the name's *shape* and never its *alphabet*. Two hazards follow, and they are of
different kinds.

**Field injection is live.** The grammar is delimited by `;` and `=`. An identifier containing
either forges fields: a `to` value of `x;from=victim` produces a name that parses differently
from the one the producer wrote. Nothing in v0.12 forbids it.

**Path traversal is narrower than [#35](https://github.com/zaebee/p-e/issues/35) claimed, and this document corrects that.** The issue
gave `to=../../etc/x` as the example. That value contains `/`, and `/` is the vector — but the
identifier is embedded *between* `to=` and `;`, never used as a path component, so `join` sees a
single filename. The implementation already refuses `/`. A bare `..` passes the current predicate
and cannot escape anything, because there is no position in which it is a path segment.

So `..` is forbidden below as defence in depth against a future use, not as a fix for a live
hole. Saying otherwise would overstate what was found.

## 2. The alphabet

```
<agent>      ::= [a-z0-9] [a-z0-9._:@-]{0,47}
<thread_id>  ::= [a-z0-9] [a-z0-9._-]{0,63}
```

Forbidden in both, and the reason for each:

| forbidden | why |
|---|---|
| `;` `=` | the delimiters of §2.1's own grammar; permitting them permits forged fields |
| `/` `\` | path separators; `/` is the only value that turns an identifier into path components |
| control characters, and every byte above ASCII | a name is compared as bytes, and macOS normalizes to NFD where Linux keeps NFC, so the same identifier would not be the same name across hosts |
| whitespace | not a hazard, a legibility choice, and cheap to reverse later |
| `.` and `..` as the **whole** value | defence in depth, per §1 |
| uppercase `A-Z` | see §4 |

**`:` is permitted**, and §5 records why.

## 3. Length, which the obvious limits get wrong

A researched proposal for this addendum gave `{0,63}` for `<agent>` and `{0,127}` for
`<thread_id>`. Those do not fit.

The assembled name has 31 bytes of fixed structure (`to=`, `;from=`, `;thread=`, `;ttl=`, `;id=`,
`.json`), 36 for the UUID, and up to 10 for the seconds — 77 before any identifier. `NAME_MAX` is
255 on ext4 and on every filesystem this protocol targets, leaving **178** bytes for two agents
and a thread. The proposal's maxima sum to 256.

Confirmed rather than computed only. A name built at those maxima is 327 bytes, and the
filesystem refuses it:

```
ОТКАЗ ФС: File name too long
```

A conforming producer using maximum-length identifiers could not publish at all.

The limits above give `48 + 48 + 64 = 160`, so `160 + 77 = 237 ≤ 255` with 18 bytes of headroom.

**A related bound the grammar still lacks.** §2.1's `<seconds>` is `(0|[1-9][0-9]*)` — unbounded
digits. A TTL of a hundred digits is grammatically legal today, and it breaks both the length
budget above and I-JSON's safe-integer range. Not fixed here: it belongs with
[#50](https://github.com/zaebee/p-e/issues/50), which is already open on the units of that field,
and the two should be settled in one edit. The 10-digit allowance used in the arithmetic above is
an assumption, and it is stated as one.

## 4. Case

Lowercase only. This costs nothing — **no identifier anywhere in this repository uses an
uppercase letter** — and it closes a hazard that survives the POSIX declaration in §5: macOS
defaults to a case-insensitive filesystem, and it is POSIX. `agent:Mimo` and `agent:mimo` would be
two identities and one filename there.

The failure is not corruption. §4.1 publishes with `link`, so the second would come back
`COLLISION_REFUSED` rather than overwrite the first. It is a false collision between two identities
that a case-sensitive host would keep apart — a store that behaves differently depending on which
machine holds it.

## 5. `:` is permitted, and the reason the ban was declined

The case for forbidding `:` is portability: it is illegal on NTFS, where it opens an alternate
data stream, and it was the Finder's path separator on classic Mac OS.

**The motive is void, because v0.12 already excludes Windows.** §4.1 mandates a directory `fsync`
after `link` — the step whose necessity was measured in `docs/experiments/dirsync-crash/` — and
Windows offers no way to obtain a directory handle to synchronize. A conforming Windows
implementation cannot exist, whatever the alphabet says. At the POSIX layer `:` is an ordinary
byte; only `/` and NUL are excluded from a filename.

Against that, the ban costs every identifier the protocol has ever had. `agent:claude-code`,
`agent:chatgpt` and `agent:gemini` are v0.1's own examples, and twelve `agent:*` identities appear
across the test suite.

**What was also considered and declined: making `:` structural**, as `<ns> ":" <local>`, so the
colon carries meaning rather than being tolerated. It is the better design and it is not adopted
here, for two reasons. It breaks `bee.claude` and `bee.zae`, which are relay-lite identities in the
durability bench and carry no namespace — so the tidier options each break a different half of
what exists, while permitting `:` breaks nothing. And it is *design*: it adds structure the
protocol never had, in the same act as the first editorial decision taken under #53, three days
after documenting what happens when requirements enter a specification without a record.

If identities need namespaces, that is worth proposing on its own, with its own reviewer under
#53's split. It is not worth bundling into a fix for #35.

## 6. The platform, stated because it is already true

**relay-lite requires a POSIX filesystem.** This adds no constraint. §4.1 already mandates `link`
with `EEXIST` semantics, `O_EXCL` for the temporary file, and a directory `fsync`; the first two
have awkward Windows analogues and the third has none.

v0.12 contains **zero** occurrences of `posix`, `windows`, `portable` or `platform`. A requirement
that binds every implementation and is written nowhere is the same defect this project has spent
three days cataloguing — see #60 and #63 — and this clause exists so that one instance of it is
no longer true.

Case-insensitivity in §4 is the reminder that "POSIX" does not mean "one behaviour": macOS is
POSIX and folds case by default.

## 7. What this does not do

It does not amend v0.12, it does not close #35 — that is bee.zae's call — and it does not touch
`src/relay-lite/names.ts`, whose `NAMEABLE` currently admits uppercase, admits `.` and `..`, and
bounds no length. The gap between this document and that predicate is stated here rather than
quietly closed, so that the decision and its implementation can be reviewed separately.
