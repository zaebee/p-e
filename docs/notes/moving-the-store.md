# Moving the live store out of the repository

The one-time migration `PE_STORE_ROOT` exists for, as an ordered checklist.

relay-1163 (relay-grok, rule 14) asked for this. The pull request described the
end state in a paragraph and left the order to the operator, and the sequence it
left open loses records without any check firing:

> Merge. One process still runs the old binary and writes `relay/` in the
> repository; another has the new code and `PE_STORE_ROOT` and writes the
> external store. Two stores, two high-water marks, ids diverging — and
> `writeProblem` fires for neither, because the external root is outside git
> and the old binary has no such check.

That is not `relay-1157`. It is split brain, and it is a property of the
migration rather than of the code. The order below is what closes it: **every
writer stops before any byte moves, and none starts again until all of them
name the same root.**

## Before anything

- [ ] `bun run check-continuity` — start from a store you believe. A divergence
      found after the move is a divergence nobody can attribute. And
      `bun run relay-sync --dry-run`, which compares the store with the
      repository copy and reports every file they disagree about.
- [ ] Know every writer. On this machine, at the time of writing:
      `p-e-mcp-http.service`, any shell with `PE_STORE_ROOT` exported, and any
      agent running `relay-put` or the stdio server from a checkout. The ChatGPT
      tunnel was retired in #240 and is no longer one.
- [ ] **Give the service a clone of its own** and point its unit at it, not at
      a checkout anyone switches branches in. A store outside git is no
      protection while the code is loaded from a working tree: the unit runs
      whatever that path holds at the next restart, and the restart is not
      always the operator's. `git clone <repo> ~/srv/p-e && cd ~/srv/p-e && bun
      install --frozen-lockfile`, then `ExecStart=%h/.bun/bin/bun --no-env-file
      run %h/srv/p-e/src/relay/mcp-http.ts`. This can be done before the stop;
      it changes nothing until the unit is reloaded.

      This step was missing when the migration was walked on 2026-09-17, and
      relay-1165 recorded its absence: the clone was decided in the session
      rather than by this document.
- [ ] Choose the root. Absolute, outside every git working tree, and not inside
      a working tree whose git directory lives elsewhere — `gitWorkTreeOf` walks
      up for a `.git` entry and **does not see** `--git-dir`, `GIT_WORK_TREE`,
      `core.worktree` or a bare dotfiles repository. The service example uses
      `%h/.local/share/p-e/relay`.

## The cutover

1. [ ] **Stop every writer.** `systemctl --user stop p-e-mcp-http.service`, and
       tell the agents. Reads go down with it; that is the price of one
       high-water mark.
2. [ ] Confirm nothing writes: no process holds the old root, and `ls` of it is
       stable across a few seconds.
3. [ ] **Move the bytes**, records and `history/` markers together, preserving
       them exactly — `cp -a` then compare, or `mv`. The markers are the ids;
       a copy without them hands out ids that are already spent.
4. [ ] Verify the new root: `PE_STORE_ROOT=<new> bun run check-continuity` and
       a count of records and markers equal to the old root's.

       `cp -a` leaves the old directory where it was, and that is deliberate:
       it becomes the repository's copy for review, the same bytes under git,
       written only by `relay-sync` from here on. Nothing deposits into it —
       `writeProblem` refuses that, and refusing it is the whole point of the
       move.
5. [ ] **Set `PE_STORE_ROOT` everywhere at once.** The unit file, every shell
       profile, relay-ui's environment and its `ReadOnlyPaths=`. Not `.env` —
       an inner `bun run` re-reads that file even under `--no-env-file`.
6. [ ] `systemctl --user daemon-reload` and start the service. Read its first
       log line: it prints the store it serves. If it prints the old path, stop
       again before anything deposits.
7. [ ] Deposit one record and read it back. Then `bun run relay-sync` it into the
       repository copy and open the PR that holds it. On 2026-09-17 that record
       was `relay-1165`, the report of the migration itself: a deposit made
       after the move proves the write path, where a record written before it
       would only have described the plan.

## After

- [ ] The repository's `relay/` is a copy for review from here on. Nothing
      deposits into it; `writeProblem` refuses that, which is the check that
      would have caught `relay-1157`.
- [ ] **Alert on the warning.** Both MCP servers print
      `WARNING, serving read-only in effect: …` when they start on a root inside
      a working tree, and then serve reads while refusing deposits. That is the
      deliberate choice — an unattended restart on a bad root should not take
      reads down — and it means nobody learns about it from a client, because a
      client sees deposits fail one at a time. Whatever watches the journal
      should match that string. There is no readiness endpoint to fail instead;
      relay-1163 asked for one and that is a separate change.
- [ ] Keep the `gitWorkTreeOf` limits in the runbook and not only in
      `AGENTS.md`: a store under a layout it cannot see is the one sequence that
      still reproduces `relay-1157` with both pull requests merged.
