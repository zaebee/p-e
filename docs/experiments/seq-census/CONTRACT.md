# Contract — a census of one field

You are given a TypeScript codebase under `input/`. It is a small web application with an
Express server and a React frontend. That is all you need to know about what it does.

## §1 Read nothing else

Work only from `input/`. Do not fetch anything, do not consult other repositories, and do not
use knowledge you may have about this project from elsewhere. If you recognise it, set that
aside: what you remember is not evidence about this tree.

## §2 The subject

One field: **`seq`**.

You are producing a **census**, not an assessment. Do not say whether anything is good, bad,
cheap, expensive, safe or risky. Report what is there.

## §3 The five questions

**1. Enumerate every occurrence of `seq` in `input/`.** For each: file, line, and its role —
*type declaration*, *write* (a value assigned into a field), *read* (a value taken out and used),
*display* (rendered or logged as text), or *other* (say which).

**2. Where does the value come from?** For each place a `seq` value is produced, say how:
computed from another value, read from storage, supplied by a caller, or otherwise. Quote the
line that produces it.

**3. Where does it cross a process boundary?** List every place a `seq` reaches an HTTP response
body, an event stream, or any other output leaving this process. Quote the construction.

**4. If the field were absent, what would notice?** For each *read* from question 1, say whether
that code path would (a) throw or visibly fail, (b) render or log something different, or
(c) proceed and produce a different result without any signal. Answer per site, with the reason.

**5. Does anything in `input/` name a consumer outside this tree** — a client, a script, a
document, a configuration — that reads `seq` from this application's output? Quote what you find,
or state that you found nothing.

## §4 State your rule before you apply it

Before question 1's list, write the rule you used to decide what counts as an occurrence, and the
rule you used to tell a *read* from a *display*. Apply it consistently and say so if you had to
depart from it.

## §5 Evidence against your own classification

For question 4 especially: name the site where your own answer is least secure, and say what
would settle it. If you are confident everywhere, say that instead — but check first.

## §6 What you are not told

You are not told why this census was commissioned, what decision depends on it, or what anyone
expects the answer to be. Those are withheld deliberately. **Do not infer them and do not write
toward them.** If you find yourself concluding something about what *should* happen, stop: that
is outside this contract.

## §7 Confidence

For each of the five questions, one line: what you are certain of, and what you are not.

## §8 One shot

Produce the whole census once, in a single document. Do not ask questions first.
