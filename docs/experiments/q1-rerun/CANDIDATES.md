# The five axes and their candidates

Verbatim from an earlier independent reader's report. You are not told which it preferred,
and its preferences are not evidence here.

| | axis | candidates |
|---|---|---|
| **A** | extent | whole file · the record below the deposit header · the payload below the record's own headers |
| **A′** | self-identity | the envelope `id:` **is** inside the digested region · **is not** |
| **B** | fidelity | the bytes the sender emitted · the bytes the store stored |
| **C** | type | octets · decoded UTF-8 text |
| **D** | time | the bytes as bound, digest recorded at binding · the bytes present now, recomputed on read |

## Two measured facts about the store, given so you need not run anything

1. A stored record file begins with a **deposit header written by the receiving store**, then a
   `---` line, then the record. The deposit header carries `deposited-by:`, `provenance:` and
   `assigned-id: relay-NNNN`. The record below may carry its own `id:` header. Example:

       deposited-by: bee.claude
       provenance: authored
       assigned-id: relay-0646
       ---
       @p-e/x0
       parent: relay-0645
       ...

2. Under the **decoded UTF-8 text** candidate on axis C the digest is not injective over file
   bytes: three files differing only in one invalid octet were measured to produce one digest,
   `66e4ee59e2fc41e8…`, because invalid octets become U+FFFD on decode and are never recovered.
