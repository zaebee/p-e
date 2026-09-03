<!-- NOT A RUN -->
# Does the directory fsync in `publish` do anything?

**NOT A RUN.** Not a `docs/reports/*-conformance-NN.md`, not in the conformance
series, not pinned by `tests/reports-immutable.test.ts`, changes no catalogue.

§4.1 of `docs/specs/relay-lite-v0.12-draft.md` says the directory fsync is what
makes the delivery's **name** durable, separately from its bytes. `publish`
implements that. This is the attempt to find out whether the step buys anything
observable, rather than asserting it does because the specification says so.

## Method

`scripts/bench/dm-log-writes.sh`, run as root. `dm-log-writes` records every
write with its flush and FUA flags. A mark named `published` goes into the log
the moment `publish` returns, before anything unmounts. The log is then replayed
onto a second device one entry at a time, and each accumulated state is mounted
and inspected — stopping at the mark, because past it lies the unmount, which
makes the name durable either way.

Two runs. Run 1 is `publish` as written. Run 2 is a copy with the directory
fsync removed and nothing else changed.

Each intermediate state is mounted **read-write through a throwaway
dm-snapshot**. This is load-bearing, not incidental: `fsync` forces a journal
commit, not a checkpoint to the final on-disk location, so a read-only mount —
which skips journal recovery, having nowhere to write — is blind to exactly the
durability being measured. The snapshot gives recovery somewhere to write and
is discarded before the next step.

Filesystem: `mkfs.ext4 -q -F`, mounted with no options — ext4 defaults, so
`data=ordered` and `commit=5`.

## Result

Two consecutive runs, identical in every number, different delivery UUIDs:

```
run 1 — directory fsync kept
  log holds 191 entries, publish returned at entry 161
    log entries replayed        : 161 of 161 (to the publish mark)
    of those, mountable states  : 23
    name first present after    : entry 161
    with correct bytes after    : entry 161

run 2 — directory fsync removed
  log holds 185 entries, publish returned at entry 156
    log entries replayed        : 156 of 156 (to the publish mark)
    of those, mountable states  : 18
    name first present after    : entry -
    with correct bytes after    : entry -
```

**The run supports §4.1.** With the fsync, the name is present at the mark — the
instant `publish` returned. Without it, the name is not present at any point in
the run. This is an absence, not a delay: run 2 does not show the name later, it
does not show it at all.

## What this is not

**The bytes line is not a second piece of evidence.** In run 2 the bytes are
unreachable because there is no directory entry pointing at them; the check has
no path to open. One observation, reported on two lines. In run 1 both land on
entry 161, which says the name and the correct bytes became visible together.

**One filesystem, one mount, one machine.** ext4 with `data=ordered` and a
five-second commit interval. Nothing here establishes the behaviour of any other
filesystem, and `-o data=writeback` with a longer interval would widen the
window rather than reproduce this one.

**The mountable-state counts do not move between the read-only and read-write
methods** — 23 and 18 either way. Journal recovery changes what a mounted state
*contains*, not whether it mounts. The counts are reported because they bound
how much was actually inspected, not as a result.

## Three earlier runs that produced numbers and no finding

Kept because each looked like a result at the time and each was an artefact of
how the question was posed.

1. **Both runs shared one log.** The comparison was a log against itself.
2. **The survey walked the whole log.** The log ends with `umount`, which
   flushes everything, so both runs showed the name near the end — 176 of 190
   and 172 of 184 — and the comparison was between two unmounts. Fixed by the
   `published` mark.
3. **The survey mounted `-o ro`.** No journal recovery, so only checkpointed
   state was visible, and the name was absent in *both* runs including the one
   with the fsync. That could not be a fact about fsync — if `publish` returned
   after `fsync(dir)`, the name is durable by definition — so it was a fact
   about the survey. Fixed by the snapshot mount.

Defect 2 and defect 3 have the same signature: the name appearing only at the
unmount. Under an unrecovered read-only mount, the unmount's checkpoint is the
one moment the name can be seen, so the first null result was already evidence
of the second defect and was not read that way at the time.
