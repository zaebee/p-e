# Operator instructions for the `citation-blind` bundle

**This file lives outside the bundle and must stay outside it.** The reading directory contains
`SYSTEM.md`, `CONTRACT.md`, `PIN.txt` and nothing else.

## Running a reader

1. Copy `citation-blind/` to a fresh directory.
2. Start the reader in a **new session with no prior context**.
3. Paste the text below as its only instruction, with `<DIR>` replaced by the copy's path.
4. Give it nothing else: no history, no statement of where the material came from, no hint of
   what the answer should look like, and no clarification if it asks. If it asks a question,
   the run is over — start again with a fresh session.

```
Your working directory for this task is <DIR>

Read CONTRACT.md there and follow it exactly. It defines the whole task, including a constraint
that you read nothing outside that directory — honour that strictly: do not read, list, search,
or open any file outside <DIR>, do not search the wider filesystem, do not consult any
repository, and do not use the network. You have no prior context on this task and should not
seek any; the directory is complete.

Write your report to RESULT.md inside that directory as the contract specifies. When you are
done, reply with a short summary of what you concluded.
```

## Run log

- **Run A — subagent. Valid.** Bundle was `SYSTEM.md`, `CONTRACT.md`, `PIN.txt`. Wrapper
  delivered as a message. Hashes verified by the reader. Result: `RESULT-subagent.md` here.

- **Run B — Mistral, first attempt. Void, not counted.** This file was mistakenly placed
  *inside* the reading directory. The reader honoured the contract's "read nothing outside this
  directory", read the operator instructions, learned it was a subject in a run comparison, and
  asked the operator what to do rather than performing the task. The session is discarded: a
  reader that has seen the run log cannot give a blind reading, and answering its question would
  have supplied exactly the context the procedure withholds.

  The fault is in the bundle, not the reader. The operator instructions were visible material
  inside a directory the reader was told to treat as complete.

- **Run D — Mistral, second attempt. Void, not counted.** The operator handed this file to the
  reader instead of the wrapper. The reader read it, correctly recognised the operator role, and
  verified the bundle rather than performing the task. Fault is in the handover, not the reader:
  only the fenced block below "Paste the text below" is ever given to a reader; this file is for
  the operator alone.

- **Run C onward** — bundle restored to the three material files. `SYSTEM.md` and `CONTRACT.md`
  hash identically to what Run A read, so Run A and Run C are comparable.

## Where things live, and why

The reading bundle is `~/projects/citation-blind/` and holds **only** `SYSTEM.md`,
`CONTRACT.md`, `PIN.txt`. Everything else — these instructions, the run log, and every result —
lives here in the repository.

That separation is not tidiness. A reader running from the bundle has that directory as its
working directory, and one `ls ..` used to show `citation-blind-a/` and
`citation-blind-OPERATOR.md` sitting beside it, both named to announce what the exercise is. It
now sits among thirty unrelated project directories with no sibling that refers to it.

The bundle keeps the name `citation-blind` deliberately. Run A read from a path containing the
same word; renaming it now would add a difference between runs that Run A did not have, to
remove a hint Run A already had and was not visibly moved by. Comparability is worth more here
than the last increment of concealment.
