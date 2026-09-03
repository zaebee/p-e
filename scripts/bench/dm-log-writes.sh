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
PATCHED_COPY=""
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
dmsetup create "$MAPPER" --table "0 $SECTORS log-writes $DATA_LOOP $LOG_LOOP"
MAPPED="/dev/mapper/$MAPPER"
MNT="$WORK/mnt"
mkdir -p "$MNT"

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
// does not: uuidV7 carries a randomly seeded counter and 62 random bits, which
// `uuid.ts` puts there on purpose, so two mints at one millisecond are two
// different ids. That is the module working, and an earlier version of this
// script asserted the opposite and blocked the control run on it.
const { sealed } = mint(
  { thread_id: "t-1", type: "message", from: "bee.claude", to: ["bee.zae"], payload: { crash: 1 } },
  mintContext("bench"),
  1756800000000,
);
const result = await publish(sealed, "bee.zae", root);
console.log(JSON.stringify({ name: formatCns(sealed.act, "bee.zae"), digest: sealed.digest, result }));
TS

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
    local patched="$REPO/src/relay-lite/.publish-nodirsync.ts"
    PATCHED_COPY="$patched"
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
  sync
  umount "$MNT"
  echo "$out"
}

# Replay the log onto the replay device up to each flush point in turn, mount it,
# and report whether the delivery name is there.
survey() {
  local name="$1" digest="$2" label="$3"
  local entries point=0 seen_name=0 first_name="-" first_data="-"

  # `--num-entries`, taken from replay-log's option table rather than from its
  # own usage text, which prints `--number-entries` and is wrong. I copied the
  # name out of the help output I had just printed, and it cost a run that got
  # as far as publishing before failing.
  # Not silenced. When this failed the first time it printed `?`, and `?` was
  # the only sign that the log could not be read at all — which is also why the
  # survey below replayed zero flush points. A muffled first signal cost a whole
  # run to diagnose.
  if ! entries="$("$REPLAY_LOG" --log "$LOG_LOOP" --num-entries 2>&1)"; then
    echo "  ! replay-log could not read the log: $entries"
    echo "    the survey below will find nothing, and the reason is that line."
    entries="unreadable"
  fi
  echo "  log holds $entries entries"

  dd if=/dev/zero of="$REPLAY_LOOP" bs=1M count=8 status=none 2>/dev/null || true

  # `--start-entry` advances, because `--next-flush` alone replays from entry 0
  # every time: the tool is stateless between invocations and my loop assumed it
  # was not. Without it the same first flush is replayed forever, or the first
  # call fails and the loop ends having done nothing — which is what happened.
  local entry=0 out=""
  while true; do
    if ! out="$("$REPLAY_LOG" --log "$LOG_LOOP" --replay "$REPLAY_LOOP" \
                 --start-entry "$entry" --next-flush 2>&1)"; then
      if [[ "$point" -eq 0 ]]; then
        echo "  ! replay stopped at once: $out"
      fi
      break
    fi
    entry=$((entry + 1))
    point=$((point + 1))
    if mount -o ro "$REPLAY_LOOP" "$MNT" 2>/dev/null; then
      if [[ -f "$MNT/relay/in/$name" ]]; then
        seen_name=1
        if [[ "$first_name" = "-" ]]; then first_name="$point"; fi
        # Guarded, because this filesystem is *expected* to be inconsistent:
        # it was replayed to an arbitrary flush point, which is the whole
        # experiment. A read error here under `set -o pipefail` would end the
        # survey early, and a short survey and a failed one look the same in
        # the output.
        local got=""
        got="$(sha256sum "$MNT/relay/in/$name" 2>/dev/null | cut -d' ' -f1)" || got=""
        if [[ "$got" = "$digest" ]] && [[ "$first_data" = "-" ]]; then first_data="$point"; fi
      fi
      umount "$MNT"
    fi
    # A ceiling, because a replay that never stops advancing would otherwise
    # loop until the mount table filled. 400 flush points is far past what one
    # publish produces; reaching it means something is wrong with the log.
    if [[ "$point" -gt 400 ]]; then
      echo "  ! stopped at 400 flush points — the log is longer than one publish should make"
      break
    fi
  done

  echo "  $label"
  echo "    flush points replayed        : $point"
  echo "    name first visible at point  : $first_name"
  echo "    bytes correct at point       : $first_data"
  echo "    name present at the end      : $([[ "$seen_name" = 1 ]] && echo yes || echo NO)"
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
  The claim §4.1 makes is that a directory fsync is what makes the *name*
  durable, separately from the bytes. The run supports it if the second survey
  reaches a flush point where the file's bytes are on the device and the name is
  not — or never shows the name at all — while the first shows the name at some
  point and keeps it.

  If both runs look the same, that is a result too, and the honest reading is
  that this filesystem and mount option made the difference unobservable rather
  than that the step is unnecessary. ext4's default `data=ordered` and its
  journal commit interval both blur it; `-o data=writeback` and a longer
  interval make the window wider. Say which you ran.
TXT
