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
