# Enumeration of specification resolutions for the domain closure problem

## Distinctness rule (§4)

Two resolutions are counted as the same only if they modify the *same section(s)* **and** use the *same mechanism* at the same locus of change.  
Resolutions that touch different sections are distinct.  
Resolutions that touch the same section but employ different mechanisms (e.g., saturating vs. modular arithmetic, widening the range vs. removing it) are distinct.  
Constants that parameterise a single mechanism (e.g., 2^63 vs. 2^127 in a widening) are treated as one resolution.

---

## §1 Widen the safe integer range (modifies §3.1)

**Rule.**  Replace the integer range in §3.1 with a strictly larger safe range, e.g. `[-(2^N - 1), 2^N - 1]` for N > 53.  Canonical serialization still uses JCS number formatting; values beyond 2^53 are encoded as JSON strings to remain loss-free through ECMAScript parsers.

**Changes.** §3.1 only.

**Cost.**  Every conforming implementation must support integers outside the original range; JSON libraries that only support double-precision floats natively must switch to a big-integer type for parsing and serialization; wire size increases when numbers exceed 2^53 because JCS emits them as decimal strings rather than as numeric tokens.

**Preserves.**  The clock update rules in §3.3 continue to operate exactly as written for all values that were previously valid, and now the boundary case `c = 2^53 - 1` can be incremented without leaving the domain.

**Confidence.**  High — this is a clear, complete resolution.

---

## §2 Remove the integer range constraint (modifies §3.1)

**Rule.**  Delete the sentence in §3.1 that restricts integers to `[-(2^53 - 1), 2^53 - 1]`.  Integers are now arbitrary-precision.  Producers still use JCS canonical bytes; consumers must accept arbitrarily large integers and preserve them exactly.

**Changes.** §3.1 only.

**Cost.**  All implementations must use arbitrary-precision integer arithmetic and serialization; canonical JCS output for very large integers becomes long decimal strings, increasing message size without bound; digest computation depends on canonical bytes, so large integers change digests in a way that was not previously possible.

**Preserves.**  The domain is closed under every operation the protocol performs; no value, no matter how large, can cause overflow or serialization failure.

**Confidence.**  High — straightforward and complete.

---

## §3 Saturating addition in the clock update rule (modifies §3.3)

**Rule.**  In the ingest rule, change the equal-case line from  
`c' = max(last_c, M.hlc.c) + 1` when `l' == last_l == M.hlc.l`  
to  
`c' = min(max(last_c, M.hlc.c) + 1, 2^53 - 1)`.

**Changes.** §3.3 only.

**Cost.**  Once the counter reaches `2^53 - 1` at a given logical time, it stays there; subsequent messages at the same logical time cannot be distinguished by counter value, so a node loses the ability to order events beyond that point at that `l`; the HLC partially collapses into a purely physical/logical clock without fine-grained counter ordering at saturation.

**Preserves.**  All counters produced by a conforming node remain within the safe integer range, so every produced act is serializable and passes §7.1 stage 2.

**Confidence.**  High — precise, implementable, and directly addresses the overflow.

---

## §4 Modular (wrapping) arithmetic in the clock update rule (modifies §3.3)

**Rule.**  In the ingest rule, change the equal-case line to  
`c' = (max(last_c, M.hlc.c) + 1) mod (2^53)` when `l' == last_l == M.hlc.l`.  
`mod` is the non-negative remainder operation, so `2^53 - 1 + 1 = 0`.

**Changes.** §3.3 only.

**Cost.**  The counter can decrease: after wrapping, `c'` can be strictly less than both `last_c` and `M.hlc.c`, breaking the monotonic increase of the counter component; this can make later messages appear to have lower counters than earlier ones at the same `l`, violating the intended partial order and potentially creating false causality relationships.

**Preserves.**  Every computed counter is within `[0, 2^53 - 1]` ⊂ `[-(2^53 - 1), 2^53 - 1]`, so serialization is always possible.

**Confidence.**  High — well-defined, implementable, and closes the domain.

---

## §5 Overflow triggers logical-time increment (modifies §3.3)

**Rule.**  In the ingest rule, when `l' == last_l == M.hlc.l` and `max(last_c, M.hlc.c) == 2^53 - 1`,  
set `l' = max(physical_now_ms, last_l, M.hlc.l) + 1` and `c' = 0`; otherwise use the existing rules.

**Changes.** §3.3 only.

**Cost.**  Logical time advances more aggressively: a single overflow forces `l` to increase by at least 1 ms beyond its current value, even if physical time has not advanced; on systems with fine-grained physical clocks this may be acceptable, but on coarse clocks it can create large logical-time gaps and potentially exceed the physical clock if many overflows occur; the rule assumes `physical_now_ms` is available at ingest time.

**Preserves.**  The tuple `(l', c')` remains strictly greater than `(last_l, last_c)` under the HLC ordering, and both components stay within the safe range; no information about ordering is lost.

**Confidence.**  High — precise and maintains all ordering properties.

---

## §6 Freeze counter at maximum (modifies §3.3)

**Rule.**  In the ingest rule, change the equal-case line to  
`c' = max(last_c, M.hlc.c) + 1` if `max(last_c, M.hlc.c) < 2^53 - 1`, else `c' = 2^53 - 1`,  
when `l' == last_l == M.hlc.l`.

**Changes.** §3.3 only.

**Cost.**  Once a node’s counter reaches `2^53 - 1` at a particular logical time, every subsequent message ingested at that same logical time receives the same counter value; the node can no longer distinguish the ordering of those messages by counter, losing fine-grained causality within that `l` slice.

**Preserves.**  All counters remain in the safe range; the partial order between messages with different `l` values is maintained.

**Confidence.**  High — simple, implementable, and closes the domain.

---

## §7 Stateful overflow guard in the verification pipeline (modifies §7.1)

**Rule.**  Insert a new check immediately after stage 2 (structural and I-JSON conformance) that, using the node’s current clock state `(last_l, last_c)`, computes whether ingesting the message would produce a counter outside `[-(2^53 - 1), 2^53 - 1]`.  If so, reject the message as non-conforming.  The check is:
`if l' == last_l == M.hlc.l and max(last_c, M.hlc.c) == 2^53 - 1 then REJECT`
where `l'` is determined as in §3.3.

**Changes.** §7.1 (addition of a new stage or expansion of stage 2).

**Cost.**  Verification becomes stateful: the outcome now depends on the node’s current clock, breaking the current design where stages 1–2 are purely a function of the received bytes; different nodes may accept or reject the same message depending on their internal state, risking network partition; stage ordering must be adjusted to give this check access to `last_l, last_c`.

**Preserves.**  A conforming node’s own clock never transitions to an unserializable state; the verification pipeline guarantees that every accepted message can be safely ingested.

**Confidence.**  High — directly prevents the overflow by rejecting the triggering input.

---

## §8 Represent counter as arbitrary-precision string (modifies act’s type, §3.1, §3.3)

**Rule.**  Change the act type so that `hlc.c` and `last_c` are strings containing base-10 representations of arbitrary-precision integers.  Amend §3.1 to remove the numeric range constraint for these specific fields (or explicitly allow strings for counters).  In §3.3, numeric comparisons and arithmetic are performed by parsing the strings to big integers, then formatting the result back to a string for storage.

**Changes.** The act’s type definition, §3.1 (integer constraints), §3.3 (arithmetic operations).

**Cost.**  All producers and consumers must serialize/deserialize counters as strings; canonical JCS bytes change for counter fields, altering digests; implementations must add parsing/format logic for string-based big integers; existing code that assumes JSON numbers for counters breaks.

**Preserves.**  Exact, lossless counter arithmetic with no upper bound; the domain is closed under the operation.

**Confidence.**  High — well-defined and solves the problem completely.

---

## §9 Replace counter with epoch-offset pair (modifies act’s type, §3.1, §3.3)

**Rule.**  Replace the single integer `c` in the HLC with a pair `{epoch: int, offset: int}`.  `offset` is in `[0, 2^53 - 2]`.  Emission: if `l' == last_l`, set `offset' = last_offset + 1`; if `offset' > 2^53 - 2`, set `offset' = 0` and `epoch' = last_epoch + 1`.  Ingest: similar logic with `max` applied lexicographically to `(epoch, offset)`.  Canonical serialization uses a JSON object `{e: epoch, o: offset}`.  §3.1 constraints apply to `epoch` and `offset` individually.

**Changes.** The act’s type, §3.1 (applied to both new fields), §3.3 (rewritten for pair arithmetic).

**Cost.**  All message formats change; implementations must handle the pair, define ordering, and serialize/deserialize the object; every consumer must be updated; wire size increases slightly for the extra key/structural characters.

**Preserves.**  Unbounded total ordering of events: the pair `(epoch, offset)` can represent arbitrarily many increments while each component stays within the safe integer range; monotonicity is preserved under lexicographic comparison.

**Confidence.**  High — standard technique for unbounded counters with bounded fields.

---

## Completeness (§5)

The above list covers every *mechanism* that can make the domain closed under the protocol’s operations:

1. **Expand the codomain** so the result of `max + 1` is always representable (R1, R2, R8, R9).
2. **Change the operation** so it never leaves the codomain (R3, R4, R5, R6).
3. **Prevent the input** that would cause overflow from ever reaching the operation (R7).

There is no fourth class.  Hybrid approaches (e.g., widening the range *and* adding saturating arithmetic) are redundant, because either component alone suffices.  Solutions that rely on external mechanisms (e.g., “restart the node before overflow”) are not specification changes and therefore out of scope per §6.  Probabilistic or approximate solutions fail to guarantee closure deterministically.  Thus the enumeration is complete up to the distinctness rule stated in §4.

---

## Confidence (§7)

1. High — widening is a standard, complete fix.
2. High — removing the constraint is a direct, complete fix.
3. High — saturating addition is a well-understood overflow response.
4. High — modular arithmetic is a well-understood overflow response.
5. High — logical-time promotion at overflow is a precise, correct mechanism.
6. High — freezing at max is a simple, correct mechanism.
7. High — stateful guard is a clear, if invasive, preventive measure.
8. High — string-encoded bigints are a complete representational fix.
9. High — epoch/offset is a classic unbounded-counter pattern.
