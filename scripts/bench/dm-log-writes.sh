#!/usr/bin/env bash
#
# Does the delivery name survive a crash? — the half of §4.1 the test suite
# cannot reach.
#
# `tests/relay-lite-publish.test.ts` checks that `fsync` is called on `in/`.
# That is this implementation's claim and it is checked on every run. Whether a
# directory entry then survives a power cut is the kernel's, and asserting it
# needs the writes replayed to an arbitrary point — which is what dm-log-writes
# is for, and why this is a script you run rather than a test that runs itself.
#
# The experiment is a comparison, not a single observation. The same act is
# published twice, once by the publisher as written and once with the directory
# fsync removed, and the log is replayed flush point by flush point. What the
# run is looking for is a point where the second has the file's bytes on disk
# and no name pointing at them — "durable bytes are not a durable name", as the
# thing that happens rather than as the sentence in §4.1.
#
#   sudo -E BUN="$(command -v bun)" REPLAY_LOG=/tmp/replay-log \
#     scripts/bench/dm-log-writes.sh
#
# Both variables are named explicitly because sudo replaces PATH from
# `secure_path` and `-E` does not stop it. The script finds them itself where it
# can — `SUDO_USER`'s home for bun — and says exactly this line when it cannot.
#
# Everything it touches is created by it: two sparse files under a temp
# directory, two loop devices, one device-mapper target and one mount point. It
# refuses to start if the mapper name is taken, and removes all of them on exit
# including on failure.
#
# Requires root — dmsetup, losetup and mount all do. Also requires `replay-log`
# from xfstests; the script says how to build it if it is missing.

set -euo pipefail

MAPPER=relay-lite-logwrites
MNT=""
WORK=""
PATCHED_COPY=""   # set below, once REPO is known
DATA_LOOP=""
LOG_LOOP=""
REPLAY_LOOP=""

fail() { echo "  ✗ $*" >&2; exit 1; }
step() { echo; echo "── $*"; }

cleanup() {
  set +e
  if [[ -n "$MNT" ]] && mountpoint -q "$MNT"; then umount "$MNT"; fi
  dmsetup remove "$MAPPER" 2>/dev/null
  for l in "$DATA_LOOP" "$LOG_LOOP" "$REPLAY_LOOP"; do
    if [[ -n "$l" ]]; then losetup -d "$l" 2>/dev/null; fi
  done
  if [[ -n "$WORK" ]]; then rm -rf "$WORK"; fi
  if [[ -n "$PATCHED_COPY" ]]; then rm -f "$PATCHED_COPY"; fi
}
trap cleanup EXIT

[[ "$(id -u)" -eq 0 ]] || fail "needs root: dmsetup, losetup and mount all do"

REPLAY_LOG="${REPLAY_LOG:-$(command -v replay-log || true)}"
[[ -x "$REPLAY_LOG" ]] || fail "replay-log not found. Build it:
    git clone --depth 1 https://github.com/kdave/xfstests /tmp/xfstests
    gcc -O2 -o /tmp/replay-log /tmp/xfstests/src/log-writes/{replay-log.c,log-writes.c}
    REPLAY_LOG=/tmp/replay-log sudo -E scripts/bench/dm-log-writes.sh"

modprobe dm-log-writes 2>/dev/null || true
[[ -e /sys/module/dm_log_writes ]] || fail "dm-log-writes not loaded and modprobe failed"
if dmsetup info "$MAPPER" >/dev/null 2>&1; then
  fail "mapper device $MAPPER already exists — refusing to touch it"
fi

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
# Named here rather than inside `publish_once`, which runs in a command
# substitution — a subshell — so an assignment there never reaches the trap that
# has to delete this file.
PATCHED_COPY="$REPO/src/relay-lite/.publish-nodirsync.ts"

# Finding bun under sudo, which is the whole difficulty. `sudo` replaces PATH
# from `secure_path` in sudoers and `-E` does not stop it, so a bun installed
# where bun installs itself — under the invoking user's home — is invisible to
# root no matter what the caller exports. The first version of this script
# checked `command -v bun` and said "bun not on PATH", which was true, useless,
# and said to someone running exactly the command this file told them to run.
# Through `command -v` even when BUN is set, because it takes both forms: an
# absolute path comes back if it is executable, a bare name is looked up on
# PATH. Testing `-x "$BUN"` directly instead meant `BUN=bun` — the obvious thing
# to pass — was checked against the working directory and reported as missing
# while bun sat on PATH.
BUN="$(command -v "${BUN:-bun}" 2>/dev/null || true)"
if [[ -z "$BUN" ]] && [[ -n "${SUDO_USER:-}" ]]; then
  # Where `sudo` came from, which is where bun almost certainly is.
  #
  # The whole lookup is guarded. `getent` exits 2 for a user it does not know
  # and is absent entirely on some minimal images, and under `set -e` with
  # `pipefail` a failure inside this substitution killed the script — silently,
  # before reaching the message below that exists to explain exactly this.
  # Reproduced: `SUDO_USER=nosuchuser` exited 2 with no output at all.
  home="$(getent passwd "$SUDO_USER" 2>/dev/null | cut -d: -f6 || true)"
  if [[ -n "$home" ]] && [[ -x "$home/.bun/bin/bun" ]]; then BUN="$home/.bun/bin/bun"; fi
fi
if [[ ! -x "$BUN" ]]; then
  fail "cannot find bun. It installs into \$HOME/.bun/bin, and sudo replaces PATH
    from secure_path regardless of -E, so root does not see it. Name it:
    sudo -E BUN=\"\$(command -v bun)\" REPLAY_LOG=/tmp/replay-log scripts/bench/dm-log-writes.sh"
fi
echo "  bun: $BUN"

step "setting up"
WORK="$(mktemp -d /tmp/relay-lite-crash-XXXXXX)"
truncate -s 512M "$WORK/data.img"
truncate -s 512M "$WORK/log.img"
truncate -s 512M "$WORK/replay.img"
DATA_LOOP="$(losetup --find --show "$WORK/data.img")"
LOG_LOOP="$(losetup --find --show "$WORK/log.img")"
REPLAY_LOOP="$(losetup --find --show "$WORK/replay.img")"
SECTORS="$(blockdev --getsz "$DATA_LOOP")"
echo "  data $DATA_LOOP   log $LOG_LOOP   replay $REPLAY_LOOP   ${SECTORS} sectors"

# log-writes <dev> <logdev>: every write to the mapped device is also recorded
# in the log, with its flush and FUA flags, so the log can be replayed onto
# another device up to any point.
MAPPED="/dev/mapper/$MAPPER"
MNT="$WORK/mnt"
mkdir -p "$MNT"

# A target and a log per run, not one shared by both.
#
# The log device is never truncated by dm-log-writes, so a second run through
# one target writes its entries after the first run's. The survey would then be
# walking a log holding both, looking for a name that only appears in the
# second half. Two runs reported exactly 190 entries each, which is either a
# reset I cannot account for or a count that does not mean what I read it to
# mean — and either way the comparison rests on it, so the ambiguity is removed
# rather than explained.
fresh_target() {
  if dmsetup info "$MAPPER" >/dev/null 2>&1; then dmsetup remove "$MAPPER"; fi
  dd if=/dev/zero of="$LOG_LOOP" bs=1M count=16 status=none
  dmsetup create "$MAPPER" --table "0 $SECTORS log-writes $DATA_LOOP $LOG_LOOP"
}

publish_once() {
  # $1 — "kept" or "removed", which directory fsync the publisher uses.
  local variant="$1"
  local driver="$WORK/publish-$variant.ts"

  cat > "$driver" <<TS
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { mint, mintContext } from "$REPO/src/relay-lite/act.ts";
import { publish } from "$REPO/src/relay-lite/publish.ts";
import { formatCns } from "$REPO/src/relay-lite/cns.ts";

const root = process.argv[2] as string;
mkdirSync(join(root, "in"), { recursive: true });
mkdirSync(join(root, "tmp"), { recursive: true });

// A fixed clock so the timestamp half of the id matches between runs. The rest
// does not: uuidV7 carries a randomly seeded counter and 62 random bits, put
// there on purpose, so two mints at one millisecond are two different ids. That
// is the module working, and an earlier version of this script asserted the
// opposite and blocked the control run on it.
//
// No backticks anywhere in this heredoc: its delimiter is unquoted so that
// $REPO expands, which also means backticks run as commands. One in a comment
// produced "uuid.ts: command not found" on two runs.
const { sealed } = mint(
  { thread_id: "t-1", type: "message", from: "bee.claude", to: ["bee.zae"], payload: { crash: 1 } },
  mintContext("bench"),
  1756800000000,
);
const result = await publish(sealed, "bee.zae", root);
console.log(JSON.stringify({ name: formatCns(sealed.act, "bee.zae"), digest: sealed.digest, result }));
TS

  fresh_target
  mkfs.ext4 -q -F "$MAPPED"
  mount "$MAPPED" "$MNT"
  mkdir -p "$MNT/relay"

  local out
  if [[ "$variant" = "removed" ]]; then
    # The publisher with its directory fsync taken out, built as a copy so the
    # real module is never edited. This is the control: §4.1 says the step
    # exists because durable bytes are not a durable name, and a control that
    # shares the step cannot show what it buys.
    # Beside the original, not in $WORK. `publish.ts` imports `./canonical.js`
    # and four more by relative path, and those resolve from `src/relay-lite/`
    # and nowhere else — a copy anywhere else fails at the first import. Removed
    # in cleanup, and named with a dot so a stray one is visible as a leftover
    # rather than as a module.
    local patched="$PATCHED_COPY"
    # Both of them: the publish path fsyncs `in/` after `link`, and the
    # already-published path fsyncs it again to complete a guarantee an earlier
    # attempt may have left half-made. A control that removed only one would
    # still have the step under test.
    sed -E 's|^([[:space:]]*)await syncPath\(inDir, "r", (options\.)?onSync\);[[:space:]]*$|\1// directory fsync removed for the control run|' \
      "$REPO/src/relay-lite/publish.ts" > "$patched"
    local removed
    removed="$(grep -c "directory fsync removed for the control run" "$patched" || true)"
    [[ "$removed" = "2" ]] || fail "expected to remove 2 directory fsyncs, removed $removed — publish.ts has changed shape, check it before trusting this run"
    if grep -q "syncPath(inDir" "$patched"; then
      fail "a directory fsync survived the patch"
    fi
    sed -i "s|$REPO/src/relay-lite/publish.ts|$patched|" "$driver"
  fi

  out="$(cd "$REPO" && "$BUN" run "$driver" "$MNT/relay")"

  # The mark that makes this an experiment about publishing rather than about
  # unmounting. It goes in the moment `publish` returns and before anything
  # else touches the filesystem.
  #
  # Without it the survey walked the whole log, and the whole log ends with
  # `umount`, which flushes everything. Both runs then showed the name near the
  # end — run 1 at entry 176 of 190, run 2 at 172 of 184 — because ext4 journals
  # the directory entry either way and the unmount committed the journal. The
  # window a directory fsync closes is between `link` and the next journal
  # commit, and the old script closed that window itself before looking.
  dmsetup message "$MAPPER" 0 mark published
  sync
  umount "$MNT"
  echo "$out"
}

# Replay the log onto the replay device one entry at a time, and report where
# the delivery name first appears.
#
# One entry per step, not `--next-flush` with the start advancing by one. That
# combination replays from entry N *to the next flush*, so consecutive calls
# repeat almost the same span, and the counter it produced counted log entries
# while the output called them flush points. The number was real and the label
# was wrong, which is worse than either.
#
# `--limit 1` from an advancing `--start-entry` gives what the experiment wants:
# the replay device accumulates exactly entries 0..N, so the state at step N is
# the state a crash after entry N would have left.
survey() {
  local name="$1" digest="$2" label="$3"
  local entries="" first_name="-" first_bytes="-" mounts=0

  if ! entries="$("$REPLAY_LOG" --log "$LOG_LOOP" --num-entries 2>&1)"; then
    echo "  ! replay-log could not read the log: $entries"
    return
  fi

  # Only as far as the `published` mark. Past it lies the unmount, which makes
  # the name durable in both runs and answers a question nobody asked.
  #
  # Find mode prints `<entry>@<sector>` and nothing else:
  #
  #   161@34147
  #
  # The `seek entry %d@%llu: ...` format also lives in the binary, which is
  # where I took it from at first; it belongs to a different, verbose path and
  # never appears here. Both shapes put the entry number before the `@`, so
  # this matches on that and accepts either.
  local limit found=""
  found="$("$REPLAY_LOG" --log "$LOG_LOOP" --find --end-mark published 2>&1 || true)"
  limit="$(printf '%s\n' "$found" |
    sed -n 's/^[^0-9]*\([0-9][0-9]*\)@.*/\1/p' | tail -1)"

  if [[ -z "$limit" ]]; then
    # Falling back to the whole log would silently restore the flaw this mark
    # exists to fix, so it stops instead and says what it saw.
    echo "  ! no \`published\` mark in the log — refusing to survey"
    echo "    replay-log said: ${found:-nothing}"
    echo "    Without the mark the survey would run through the unmount, which"
    echo "    makes the name durable either way and answers a different question."
    return
  fi

  echo "  log holds $entries entries, publish returned at entry $limit"
  echo "  $label"

  dd if=/dev/zero of="$REPLAY_LOOP" bs=1M count=16 status=none 2>/dev/null || true

  local n=0
  while [[ "$n" -lt "$limit" ]]; do
    if ! "$REPLAY_LOG" --log "$LOG_LOOP" --replay "$REPLAY_LOOP" \
           --start-entry "$n" --limit 1 >/dev/null 2>&1; then
      echo "    replay stopped at entry $n"
      break
    fi
    n=$((n + 1))
    if mount -o ro "$REPLAY_LOOP" "$MNT" 2>/dev/null; then
      mounts=$((mounts + 1))
      if [[ -f "$MNT/relay/in/$name" ]]; then
        if [[ "$first_name" = "-" ]]; then first_name="$n"; fi
        local got=""
        got="$(sha256sum "$MNT/relay/in/$name" 2>/dev/null | cut -d' ' -f1)" || got=""
        if [[ "$got" = "$digest" ]] && [[ "$first_bytes" = "-" ]]; then first_bytes="$n"; fi
      fi
      umount "$MNT"
    fi
  done

  echo "    log entries replayed        : $n of $limit (to the publish mark)"
  echo "    of those, mountable states  : $mounts"
  echo "    name first present after    : entry $first_name"
  echo "    with correct bytes after    : entry $first_bytes"
}


step "run 1 — the publisher as written (directory fsync kept)"
INFO="$(publish_once kept)"
if [[ -z "$INFO" ]]; then
  fail "the first run produced no output — it failed before publishing."
fi
# `sed -n …p`, so only the matching line is printed. Without `-n`, every other
# line bun writes to stdout — an update notice, a warning — comes through
# unmodified and lands in NAME.
NAME="$(echo "$INFO" | sed -n 's/.*"name":"\([^"]*\)".*/\1/p')"
DIGEST="$(echo "$INFO" | sed -n 's/.*"digest":"\([^"]*\)".*/\1/p')"
echo "  published $NAME"
survey "$NAME" "$DIGEST" "with the directory fsync"

step "run 2 — control, directory fsync removed"
dmsetup message "$MAPPER" 0 mark control >/dev/null 2>&1 || true
INFO2="$(publish_once removed)"
if [[ -z "$INFO2" ]]; then
  fail "the control run produced no output — it failed before publishing, and
    the comparison has nothing to compare. The run's own error is above."
fi
NAME2="$(echo "$INFO2" | sed -n 's/.*"name":"\([^"]*\)".*/\1/p')"
DIGEST2="$(echo "$INFO2" | sed -n 's/.*"digest":"\([^"]*\)".*/\1/p')"
# No requirement that the two names match, and there was one here: it compared
# NAME2 to NAME and failed every run, because uuidV7 is random by design. The
# runs do not need one name. Each begins with `mkfs.ext4 -F` on the same device,
# so they are two filesystems that never coexist, and each survey is run against
# its own act. What is compared is the two surveys.
survey "$NAME2" "$DIGEST2" "without the directory fsync"

step "what to read from this"
cat <<'TXT'
  Both surveys stop at the `published` mark — the moment `publish` returned,
  before anything unmounted. That is the only place the question can be asked.
  Walking the whole log instead answers a different one: the log ends with
  `umount`, which flushes everything, so both runs showed the name near the end
  and the comparison was between two unmounts.

  §4.1 says the directory fsync is what makes the *name* durable, separately
  from the bytes. So:

    the run supports it   name present in run 1 and absent in run 2, at the mark

    it refutes it         name present in both — on this filesystem the step
                          bought nothing that ext4's journal did not already
                          give, and §4.1's reason for it does not hold here

    it says nothing       name absent in both, or almost nothing mountable.
                          Then the window is narrower than one log entry, or the
                          replay never produced a filesystem to look at.

  ext4 journals the directory entry either way, so the window a directory fsync
  closes is between `link` and the next journal commit. `-o data=writeback` and
  a longer commit interval widen it. Say which you ran.
TXT
