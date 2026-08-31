# RESULT

## Verification
`sha256sum SPEC.md` = `847b8971d36390cd8843da7ebe59bc3499cd8050473425eb91a4a09f30b9901c` — **matched** the value in `PIN.txt`.

---

## Rule

**Rule v1 (initial):** A passage is normative if and only if it appears inside one of the explicit normative sections: MUST (lines 149–201), MAY (lines 203–210), or MUST NOT (lines 212–227).

**Rule v2 (refined):** A passage is normative if it satisfies any of the following:
1. It appears inside the MUST, MAY, or MUST NOT sections (lines 149–201, 203–210, 212–227); OR
2. It appears inside the "Three guarantees, kept apart" section (lines 108–118), because those guarantees (G1, G2a, G2b) are explicitly referenced and relied upon by the MUST provisions; OR
3. It appears inside the "Capabilities, and their monotonicity" section (lines 119–148), because the definitions of *bound*, *held*, and *witnessed* are the conceptual foundation for the MUST clauses (e.g., MUST 1 states G1, which is defined as the demand that *bound* be monotone at line 144–145); OR
4. It appears inside the "Citing a record" section (lines 288–327), because line 296 explicitly declares "**Cross-store citation is normative**" and the section contains multiple MUST-level requirements (lines 290, 298–299, 317); OR
5. It contains the uppercase keywords MUST, MAY, or MUST NOT as part of a requirement statement outside the above sections (e.g., line 334).

Rule v1 was refined because it excluded sections that define the very concepts that the MUST/MAY/MUST NOT clauses rely on, and it excluded a section explicitly marked normative. Under v1, lines 108–148 and 288–327 would have been excluded; under v2 they are included. Line 334 would also have been excluded under v1; v2 includes it.

---

## Normative passages

| Lines | First words | Reason |
|-------|-------------|--------|
| 108–118 | "## Three guarantees, kept" | Defines G1, G2a, G2b — the guarantees implemented by the MUST clauses. |
| 119–148 | "## Capabilities, and their monotonicity" | Defines *bound*, *held*, *witnessed* and their monotonicity properties; MUST 1 is explicitly "G1, localised" and line 144–145 states "G1 is exactly the demand that `bound` be monotone." |
| 149–201 | "## MUST" | Explicit normative section. |
| 203–210 | "## MAY" | Explicit normative section. |
| 212–227 | "## MUST NOT" | Explicit normative section. |
| 288–327 | "## Citing a record" | Line 296 explicitly states "**Cross-store citation is normative**"; the section also contains MUST-level requirements at lines 290, 298–299, and 317. |
| 334 | "the ledger MUST be written" | Contains uppercase MUST keyword outside the main normative sections. |

---

## Excluded passages

| Lines | First words | Reason |
|-------|-------------|--------|
| 1–32 | "# Issue #1 · Crash-durable" | Metadata, history, status notes; not requirements. |
| 33–58 | "## What this document certifies" | Line 61–68 explicitly states: "**This section and the one above it constrain no requirement below**" (i.e., lines 33–68 are non-normative). |
| 59–95 | "## The trusted kernel" | Line 61–68 explicitly states: "**This section and the one above it constrain no requirement below**" (i.e., lines 33–68 are non-normative); line 67 further notes that an implementer can build from MUST/MAY/MUST NOT alone. |
| 98–107 | "## The incident this exists for" | Background narrative; no requirements or definitions relied upon by normative clauses. |
| 229–251 | "## What a witness does, exactly" | Descriptive explanation; no MUST/MAY/MUST NOT keywords and not referenced as binding by any normative clause. |
| 252–287 | "## What is not covered" | Line 254 begins: "Stated so that no implementation promises it:" — explicitly non-normative. |
| 329–333, 335–340 | Table headers and other rows in "Named failures" | Descriptive; only line 334 contains a MUST keyword and is thus normative. |
| 341–410 | "## Migration, and the one step" through "## Deferred to a separate issue" | Procedural notes, future work, and legacy analysis; no requirement statements. |

---

## Borderline cases

### 1. Section "Three guarantees, kept apart" (lines 108–118)
- **Resolution:** Included as normative under Rule v2.
- **Alternative:** Exclude under Rule v1 (not in MUST/MAY/MUST NOT).
- **What changes:** Without this section, the definitions of G1, G2a, and G2b are lost. MUST 1 refers to "G1, localised" (line 152), and MUST 8 refers to "G2a — *the binding survives a crash*" (line 200). If the guarantees are non-normative, the meaning of the MUST clauses that implement them becomes undefined.

### 2. Section "Capabilities, and their monotonicity" (lines 119–148)
- **Resolution:** Included as normative under Rule v2.
- **Alternative:** Exclude under Rule v1.
- **What changes:** The terms *bound*, *held*, and *witnessed* are used throughout the MUST clauses (e.g., MUST 1 enforces G1, which line 144–145 defines as "the demand that `bound` be monotone"). Excluding this section would leave the conceptual vocabulary of the specification undefined.

### 3. Section "Citing a record" (lines 288–327)
- **Resolution:** Included as normative under Rule v2.
- **Alternative:** Exclude under Rule v1 (except for lines with MUST keywords).
- **What changes:** Line 296 explicitly declares "**Cross-store citation is normative**". Excluding the section would ignore this explicit declaration. Additionally, lines 290, 298–299, and 317 contain MUST-level requirements that would be orphaned if the section were non-normative.

### 4. Line 334 in "Named failures" table
- **Resolution:** Included as normative (contains uppercase MUST keyword).
- **Alternative:** Exclude the entire "Named failures" table as descriptive.
- **What changes:** Line 334 states "the ledger MUST be written **before** the record, or an id is handed out twice." If excluded, a critical timing requirement would be lost. The rest of the table (lines 331–333, 335–340) remains excluded as descriptive, which is consistent because only line 334 contains a normative keyword.

### 5. Line 335 in "Named failures" table — "A durable record MAY be unwitnessed"
- **Resolution:** Excluded as non-normative.
- **Alternative:** Include as normative (contains uppercase MAY).
- **What changes:** The sentence describes a possible state, not a permission granted to implementations. The MAY here is descriptive ("it may happen that...") rather than prescriptive ("an implementation may..."). Including it would incorrectly treat a factual observation as a requirement.

### 6. Section "What a witness does, exactly" (lines 229–251)
- **Resolution:** Excluded as non-normative.
- **Alternative:** Include as normative because it elaborates on witnessing, which is constrained by MUST NOT 2 (line 216–217: "MUST NOT let witnessing masquerade as ordering").
- **What changes:** The section explains what witnesses can and cannot do, but it does not itself impose requirements. Including it would conflate explanatory text with binding obligations. The MUST NOT clauses already cover the normative constraints on witnessing.

### 7. Headings (e.g., "## MUST", "## MAY", "## MUST NOT")
- **Resolution:** Included as normative because they delimit normative sections and are part of the section content.
- **Alternative:** Exclude headings as structural rather than normative.
- **What changes:** Excluding headings would remove the labels of the normative sections themselves. However, the headings do not state requirements; they only organize them. The practical impact is minimal, as the content beneath the headings remains normative either way.

### 8. Tables inside normative sections (e.g., MUST 6, lines 181–189)
- **Resolution:** Included as normative because they are contained within the MUST section and elaborate on the requirement.
- **Alternative:** Exclude tables as illustrative.
- **What changes:** The table in MUST 6 defines the visibility states and their reporting rules. Excluding it would remove binding detail from a MUST clause.

### 9. Parenthetical and postscript clauses inside MUST/MAY/MUST NOT (e.g., rationale in MUST 1, lines 154–166)
- **Resolution:** Included as normative because Rule v2 treats the entire MUST/MAY/MUST NOT sections as normative.
- **Alternative:** Include only the sentences containing MUST/MAY/MUST NOT keywords.
- **What changes:** Excluding the rationale would remove the explanation of *why* certain mechanisms are required (e.g., why `max+1` is unsafe). Line 67 states that an implementer can build from the MUST/MAY/MUST NOT sections *alone and lose nothing*, implying that the explanatory text within those sections is also part of the normative baseline.

### 10. Line 67 — "An implementer can build from the MUST/MAY/MUST NOT sections alone and lose nothing."
- **Resolution:** Excluded as non-normative (meta-commentary).
- **Alternative:** Include as normative because it constrains how the spec is to be used.
- **What changes:** The statement is a claim *about* the document's structure, not a requirement *in* the document. Including it would treat a second-order observation as first-order normative text. This aligns with the contract's §5: this is not an audit or conformance check, so statements about the spec's completeness are not themselves normative.

### 11. Line 296 — "**Cross-store citation is normative**"
- **Resolution:** Included as normative; it is the explicit declaration that triggers inclusion of the entire "Citing a record" section.
- **Alternative:** Treat the declaration as self-referential and exclude the section unless it contains MUST/MAY/MUST NOT keywords.
- **What changes:** Ignoring the explicit declaration would violate the principle that the document can declare parts of itself normative. The document itself states the rule for this section.

### 12. Envelope convention sub-section (lines 314–327) within "Citing a record"
- **Resolution:** Included as normative because it is inside the "Citing a record" section (lines 288–327), which Rule v2 treats as normative.
- **Alternative:** Exclude as a "convention" (line 314) rather than a requirement.
- **What changes:** Line 317 contains a MUST-level requirement ("MUST be checked"). Excluding the sub-section would orphan this requirement. The label "convention" does not override the presence of a MUST keyword or the explicit normative declaration at line 296.

### 13. Lines 33–68 explicitly declared non-binding by line 61–68
- **Resolution:** Excluded as non-normative. Line 61–68 states: "**This section and the one above it constrain no requirement below** (audit finding F10, pin `6dfcce1`)." This explicitly covers lines 33–68 ("What this document certifies, and what it cannot" and "The trusted kernel").
- **Alternative:** Interpret the declaration as applying only to the kernel conventions (K1–K6) and not to the entire sections.
- **What changes:** Including lines 33–68 would incorrectly treat the trusted kernel conventions and the certification discussion as binding, contradicting the document's own statement and line 67's assurance that MUST/MAY/MUST NOT sections alone are sufficient.

### 14. Mentions of normative items by name/number outside normative sections
- **Resolution:** Not applicable in this document. All mentions of guarantees (G1, G2a, G2b) or MUST clauses by number occur inside normative sections (e.g., line 152 "This is G1, localised" is inside MUST; line 200 "G2a — *the binding survives a crash*" is inside MUST 8).
- **Alternative:** If such a mention appeared outside a normative section, treat it as normative by reference to the original clause.
- **What changes:** In this document, no change. Hypothetically, including references would expand normative text; excluding them would mean references are non-binding descriptions rather than restatements of requirements.
