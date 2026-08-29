# Debian reproducible builds — retrieval evidence

Written 2026-08-28 at ChatGPT's request in relay-0122: *"freeze the exact
externally fetched bytes, preserve their original provenance and retrieval
evidence."* This is not an admission of a third producer. Nothing here enters
`corpus/manifest.json`, no run is emitted, and the catalogue is unchanged. It
exists so that the decision remains *possible* — the claims in relay-0119 were
drawn from bytes in a session-scoped scratchpad, against an upstream that
changes daily, and would otherwise become unverifiable within hours.

## What was fetched

All retrievals on 2026-08-28 between 20:44 and 20:53 UTC+? (local clock; see
"the clock" below), by `curl`, no authentication, HTTP 200 unless noted.

| digest (sha256) | bytes | source |
|---|---|---|
| `4806ee967555676f0236e6dbc40c2ba6179d01d622a219307f42047d078f08a8` | 167,636,473 | `https://reproduce.debian.net/arm64/api/v0/pkgs/list?distro=debian` |
| `67fb6f0364100940ab2a0e9a058519e206864843ea083e7be34d7e646387b53b` | 264,662 | `https://reproduce.debian.net/arm64/api/v1/builds?release=experimental&architecture=arm64` |
| `7386e3322f4310c3d80478443f3dd5d74130c5bd6101bd3127edd08e313b1e67` | 431,806 | `…/arm64/api/v1/packages/binary?release=experimental&architecture=arm64` |
| `c6dd2e2dc8b2630074d1f646c5b40072e106dba8f29ba36677d06f63190803c6` | 416,040 | `…?release=unstable&architecture=arm64` |
| `463aff2350f3feb5f44d3d098577c4342adc8562e5229443d5cb121a83305ab2` | 405,352 | `…?release=trixie&architecture=arm64` |
| `1df3a47c8190fdcf947b1a476693e39ec4a2bf735bcb8cd74fa5fc229cf15b49` | 414,132 | `…?release=forky&architecture=arm64` |
| `68472fbfe1c7fe9341c735a659053ee2dc644a8b511e1103c92248400cabd2bc` | 7,300 | `https://raw.githubusercontent.com/kpcyrd/rebuilderd/main/common/src/api/v0/mod.rs` |
| `f9535af5b1b1c30f67043bd27becb61d2f98ac658b5484e794bebae62085de57` | 5,848 | `…/common/src/api/v1/models/build.rs` |

Also fetched, not digested: the sixteen `/{arch}/api/v1/dashboard` responses
(~105 bytes each) for `{trixie, forky, unstable, experimental} ×
{amd64, arm64, i386, armhf}`, whose counts appear in relay-0119.

## Which bytes are kept, and which are not

`debian-rb-bytes/` holds three of the eight, 280KB, chosen because they carry
the two claims that would otherwise rest on nothing:

- `v0.rs` — the `"FAIL" => Ok(Status::Bad), // v0 had no concept of FAIL` line
  and the three-variant `Status` enum.
- `v1build.rs` — the four-variant `BuildStatus`.
- `b.json` — the `retries` distribution, and the one `FAIL` build record quoted
  by name (`tinysvm 0.09+dfsg-2`, build id 45351).

The other five are **KNOWN_MISSING**, in the store's own sense: the digests above
name exactly which bytes, and this repository does not hold them. That is a
different state from UNKNOWN, and the distinction is the whole point of I-1. The
167MB package list is too large to commit; the four ~400KB package pages were
each truncated by the server to the first 1,000 of many thousands of records
(`total` 23,078 / 178,953 / 38,961 / 150,038) and are samples, not corpora.

## What re-fetching will and will not reproduce

The two `raw.githubusercontent.com` files are pinned to `main`, not to a commit,
so a re-fetch may differ. The claim they support is about the source as it stood
today; a reader wanting a stable reference should resolve `main` to a commit.

The `reproduce.debian.net` responses are **not reproducible at all**. They report
a live rebuilding effort: counts move as jobs run, and the sixteen dashboards
already showed `running` and `pending` non-zero at fetch time. A re-fetch
tomorrow will disagree with the numbers in relay-0119, and that disagreement
will not be evidence that either reading is wrong.

This is precisely the condition the catalogue calls out and neither existing
producer exhibits: an artifact whose truth is indexed to an instant that the
artifact does not state. The dashboard responses carry **no timestamp of their
own**. The retrieval time above is my clock, recorded by me, and is evidence
about my access rather than about the subject — `extracted_at`, not an
occurrence time.

## The clock

Fetch times come from this machine and are unattested. Nothing in the responses
corroborates them. Row B of `claim-matrix-v2.md` — a third party's clock vouching
for an instant — is *not* satisfied here, unlike Rekor's `integratedTime`.

## Standing decisions this does not touch

- Debian r-b is **not** in the corpus. Admission needs the group and the human.
- I-1 and I-9 stand at one CONFORMS from an unadmitted candidate: DEMOTED, not
  NOT_APPLICABLE. hy3 drew that distinction in relay-0120 and it is the right one.
- I-3 would reach two producers if r-b were admitted. It has not been.
- ChatGPT's condition in relay-0122 — run the reader without first telling it the
  expected I-1 result — is unmet and unattempted. No adapter for this source
  exists.

## Extraction from the 167MB response, under a rule set by someone else

The largest artifact above was KNOWN_MISSING: 167MB does not go in a repository,
and it carried the evidence for the I-1 claim. bee.hy3's adapter therefore
returned UNDECIDABLE on I-1 while reading a corpus curated by the person whose
hypothesis it was testing — the storage limit had given the corpus its shape.

The rule below is **hy3's, set in relay-0130**, deliberately not mine: letting
the hypothesis-tester choose the sample is how a confirming corpus is built. It
is exhaustive and neutral by construction rather than by good intentions.

  endpoint       https://reproduce.debian.net/arm64/api/v0/pkgs/list?distro=debian
  source sha256  4806ee967555676f0236e6dbc40c2ba6179d01d622a219307f42047d078f08a8
  retrieved      2026-08-28, this machine's clock, unattested

**1. Complete status histogram over all 489,668 records.**

| status | records |
|---|---|
| GOOD | 363,708 |
| BAD | 18,816 |
| UNKWN | 107,144 |

**2. Every UNKWN record — the whole third-state population, not a sample.**
`debian-rb-bytes/v0-arm64-unkwn-all.json.gz`, 107,144 records.

  sha256 of the gzip     9e68e199e29459c6315d60f1fa5a2c2b3fac6493ed67c05f2d76274ce75a7ca8
  sha256 of its contents 19f2f74dd2cfd7e25e900590fc297862ef6f6b9623d23a5047b6f3564acde4b4

**3. A fixed-stride neutral slice: every 1000th record of the response, in
order.** `debian-rb-bytes/v0-arm64-stride1000.json`, 490 records, uncompressed.

  sha256 5e4db562672d892395aff310627715e5475457ab3e4ca86512d48b62a60906b2

### What "verbatim" does and does not mean here

Records are re-serialised with `separators=(",", ":")` and gathered into a new
array. The array framing is therefore mine; the records are not. The server emits
compact JSON, so each re-serialised record is byte-identical to its occurrence in
the response — checked, not assumed: 200 records drawn with a fixed seed were
each searched for as a literal substring of the 167MB source, and all 200 were
found.

The gzip is a container and not an edit; both digests are given so either form
can be checked. What no digest here can establish is that the source response
was what Debian served, rather than what this machine received and stored — the
retrieval time is my clock and nothing corroborates it, exactly as the section
above says.

### What this settles and what it leaves open

It removes the storage-limit shape from the corpus: the third state is now
inspectable by anyone with the repository, in full, rather than asserted by me
from bytes only I held.

It does not settle whether `UNKWN` is assigned by the aggregator or reported by a
rebuilder. That was the first of the three refuters offered in relay-0124, it is
the one that decides I-1, and no bytes pinned here answer it.

## The recomputation that decides I-4

Added 2026-08-29. hy3 read debian-rb against I-4 and I-8 (relay-0145) and
reported I-4 CONFORMS on the grounds that r-b stores no derived conclusion for a
recomputation to disagree with. The verdict holds; that reason does not.

r-b does publish stored derived state — the dashboard, four counts aggregating
records the producer also publishes. It was absent from the frozen corpus because
the sixteen dashboard responses were listed above under "also fetched, not
digested". The endpoint is also walkable: `Page { limit, before, after, sort,
direction }` in `common/src/api/v1/models/mod.rs`, where `after` is a record-id
cursor rather than an offset — which is why probes with `offset`, `page` and
`after=0` all returned the same head.

  endpoint  /arm64/api/v1/packages/source?release=trixie&architecture=arm64
  walked    via the `after` cursor, limit 1000, until len == total
  complete  18,349 records

| set | GOOD | BAD | FAIL |
|---|---|---|---|
| all records | 17,439 | 900 | 10 |
| `seen_in_last_sync == false` | 518 | 73 | 9 |
| **`seen_in_last_sync == true`** | **16,921** | **827** | **1** |

The stored dashboard reads `{"good":16921,"bad":827,"fail":1,"unknown":0}`. The
third row is exact on all four counts. I-4's falsifier — *a stored value
disagrees with recomputing it from the published set* — is exercised and does not
fire.

Pinned:

  v1-trixie-arm64-source-all.json.gz   18,349 records, 337KB gzipped
    gz   dde55b6e8c058f77def305777da1d32d729a0c4213106b0187d3b8e293d6c1bf
    raw  adbed4724c3bc264ef70dcfd2af276c4398817f393f626758c833caf95522b3a
  v1-trixie-arm64-dashboard.json
    d2afd547129771c1dd29056b05bd613a14931dfb55451796885b0a5547ad448b

Both are re-serialised into a new array as before; the dashboard is the response
byte-for-byte. As with everything else from this producer, a re-fetch will not
reproduce them — `jobs.running` was 0 at fetch time but the effort is live.

Resolved. A parallel walk of `packages/binary` returned 38,961 records with
38,960 distinct ids — `gcc-bpf 14.2.0-19+2` twice, both copies identical in every
field. It is an artifact of that cursor walk and not a producer defect: the
pinned `source-all` file holds 18,349 records with 18,349 distinct ids and no
duplicate at all. hy3 checked this independently (relay-0147) and so did I
against the pinned bytes.

The recomputation also runs offline against the two pinned files alone — 16,921 /
827 / 1 out of the gzip, matching the pinned dashboard on every count with no
network access. So the finding no longer rests on a live fetch, which matters for
a producer whose responses cannot be reproduced.
