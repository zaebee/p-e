# Errata — defects in this bundle, recorded, not repaired

**Nothing in this directory is edited by this file.** `PRE-REGISTRATION.md` states that nothing
in it may be revised once a result arrives, and `CONTRACT.md`, `PIN.txt` and the payloads are
pinned artifacts of a run that has happened — participants read those exact bytes. Changing them
now would put a `CONTRACT.md` on the default branch whose digest is not the one that was
dispatched, and would break the pins in `relay-0717` and `relay-0719`.

Each entry says what is wrong, whether it affected the result, and what a later run should do.

## Results are stored verbatim

`RESULT-subagent.md` and `RESULT-mistral.md` are byte-for-byte copies of what each participant
wrote, and are not normalised — not for trailing whitespace, not for markdown style, not for
anything. `RESULT-subagent.md` ends with a newline and `RESULT-mistral.md` ends with `9`, because
that is what the two readers produced.

The run compares what independent readers arrived at. Tidying the artefacts would make some
differences between them mine, and a later reader could not tell which were which. The same rule
governs `docs/experiments/citation-set/`; it was not written down here, which is why a reviewer of
PR #15 had no way to know it and proposed a reformat.

## E1 — `PIN.txt` prints the answers to one candidate reading

**Mine.** `PIN.txt` pins the digest of each payload *file*. One available reading of the
specification is that the digested region is the whole file — so under that reading the correct
answers are printed in the bundle.

**Effect on the result:** mistral returned exactly those six values. Its control digest was
correct, so a computation demonstrably happened; but on those six rows computation and
transcription produce identical output and cannot be told apart. The §3 guard of the procedure
contract was necessary and not sufficient.

**A later run:** pin `SPEC.md` and `CONTRACT.md` only. The payload files are the input, not
something the participant needs to verify separately, and omitting them leaks nothing.

## E2 — every payload separates extent, so extent contaminates every row

**Mine.** All six payloads carry a store-written deposit header, so a reader taking the whole file
and a reader taking the record below that header differ on all six values. The two returned tables
diverge on 6 of 6 rows for this reason alone, and fidelity and type cannot be read from the
comparison.

**Effect on the result:** the run measured extent and could not isolate the two axes it was run
for.

**A later run, and the fix is partial:** payloads carrying no deposit header make the whole-file
and below-the-header readings coincide — measured, `2e6faeac289e9947` under both. The
below-the-record's-own-headers reading still differs (`b6a98d9ce9a2d914`), so contamination is
reduced, not removed. Removing it entirely would require the contract to fix the extent, and
naming an extent is naming a candidate, which §6 of the procedure contract forbids. **This is a
limit of the procedure as specified, not of this run.**

## E3 — `CONTRACT.md` §1 omits `CONTRACT.md` from the verification command

**Found in review of PR #14.** `PIN.txt` carries a line for `CONTRACT.md`; the `sha256sum`
command in §1 lists `SPEC.md` and the payloads and not `CONTRACT.md`, so the instruction does not
cover everything the pin does.

**Effect on the result: none.** The subagent noticed and reported the match "including the extra
`CONTRACT.md` line the pin file carries". Mistral reported "Every line matched."

## E4 — section references in `PRE-REGISTRATION.md` do not name their document

**Found in review of PR #14.** The document cites `§6`, `§4`, `contract §3` and `contract §5`
without saying which document each belongs to. Two contracts are in play — the procedure contract
in `docs/methodology/` and the dispatched `CONTRACT.md` here.

The review read "(contract §3)" at line 83 as the dispatched contract and proposed §5. **That
change would make it wrong.** The reference is to §3 of the procedure contract, *"E2 strengthened,
because a reported match proves nothing"*, which is the section that requires a withheld digest.
The number is right and the document was unnamed.

**Effect on the result: none.** Ambiguity in the pre-registration, not in anything dispatched.

## E5 — the `p5` payload was reported as broken, and is not

**Raised as critical in review of PR #14**, on the grounds that `p5.txt` contains a Euro sign and
so is valid UTF-8, which would destroy the type payload.

**Measured:** the file ends `0a 0a 65 70 73 69 6c 6f 6e 20 80 0a`. It contains one `0x80`, no
`e2 82 ac`, and does not decode as UTF-8 — *"'utf-8' codec can't decode byte 0x80 in position
113"*. `0x80` renders as `€` in cp1252.

**No defect.** The reviewer decoded the octet and reported what the decode produced. That is the
same operation this payload exists to detect, performed on the payload that exists to detect it.
Recorded because a false finding with an instructive cause is worth keeping.
