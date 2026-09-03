# SHA256 verification

The hash matches. `sha256sum SPEC.md` produced:
```
5f8974a21fa03f0cc488eb9d7999e1fa2d232717d2e0916aa400f4785495c073  SPEC.md
```
This is identical to `PIN.txt`.

---

## §3 Rule

**Rule v1:** I will treat a specification as stating only what it explicitly says. For cases it does not name, I will not infer constraints from declarations alone; I will look for explicit language that governs the unspecified case.

---

## §2 The question — answer in three parts

### 1. Does the document answer directly?

**No direct passage settles it.**

The specification contains no sentence that mentions extra, unknown, additional, undeclared, or surplus fields. The **[MUST]** clauses in §3.1 and §7.1 enumerate rejection criteria (duplicate keys, number range, CNS mismatch, unanchored citation), but none states what happens when an act carries a field the document does not declare.

### 2. Does anything in the document imply an answer?

**Yes, with inference marked.**

The Stage 2 verification list (§7.1, lines 268–270) explicitly enumerates what causes rejection:
> reject on duplicate keys, on numbers outside the safe range, on `CNS.id != act.id`, on `CNS.to ∉ act.to[]`, and on an unanchored citation

**Inference:** Because undeclared fields are *not* in this explicit list, the document implies that an act with a `surprise` field **would not be rejected** on that basis alone. The pipeline's structure (normative, ordered stages with specific checks) suggests that what is not checked is not a defect.

This is inference, not quotation. The document does not say "only these things are rejected," but the presence of a precise, explicit list invites the reading that other structural properties are permitted.

### 3. Could two implementations disagree?

**Yes.**

- **Implementation A (strict schema):** Rejects the act because `surprise` is not in `RelayAct` (lines 60–70). It would point to §3's interface as the definitive, exhaustive schema.

- **Implementation B (explicit-rejections-only):** Accepts the act because Stage 2 does not list undeclared fields as a rejection criterion. It would point to §7.1 lines 268–270 and argue that only enumerated defects cause rejection.

---

## §4 Both readings

The document supports two readings:

| Reading | Support | Deciding words |
|---------|---------|----------------|
| **Strict:** extra fields are a defect | §3's `RelayAct` interface defines the act's fields with no provision for others | *The canonical act* (§3 header) and the closed interface (lines 60–70) |
| **Lenient:** extra fields are allowed | Stage 2's explicit rejection list does not include them | *reject on duplicate keys, on numbers outside the safe range, on `CNS.id != act.id`, on `CNS.to ∉ act.to[]`, and on an unanchored citation* (§7.1 lines 268–270) |

**Better supported:** The lenient reading. The explicit, normative rejection list carries more weight than the descriptive interface. If extra fields were a defect, the Stage 2 list would be the natural place to state it; its absence there is the document's strongest signal.

---

## §5 Evidence against my own conclusion

My conclusion is that the document does not directly answer and implies (by the explicit rejection list) that the act would not be rejected.

**Strongest evidence against this:** The `RelayAct` interface (lines 60–70) is presented as the canonical definition of an act, and in a typed specification language (TypeScript), an object with a property not in the interface does not conform to that type. The document uses this interface without any disclaimer that additional fields are permitted. This supports the strict reading that any act with `surprise` is non-conformant by definition.

---

## §7 Confidence

| Part | Confidence | What would settle |
|------|------------|-------------------|
| 1 | Certain | No direct passage exists; exhaustive search found none. |
| 2 | Uncertain | An explicit sentence in the specification such as "MUST reject acts containing fields not declared in `RelayAct`" or "MUST ignore undeclared fields" would remove the inference. |
| 3 | Certain | The two readings are clearly supported by different parts of the document; implementers could and would disagree. |
