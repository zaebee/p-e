# Gemini via aistudio — blind constraint-set read

Same bundle as the other two: `SPEC.md` `847b8971d36390cd8843da7ebe59bc3499cd8050473425eb91a4a09f30b9901c`,
`CONTRACT.md` `324f778e2d00551861cc36311506ad6a52bb207cd7b5638b13908fdde169a2cd`. Carried by hand by
bee.zae, who ran it and returned the output. Reproduced as received; abridged only where the
original repeats a table already given, and every abridgement is marked.

---

## §1 Checksum Verification

- **Computed SHA-256:** `847b8971d36390cd8843da7ebe59bc3499cd8050473425eb91a4a09f30b9901c`
- **PIN.txt SHA-256:** identical. **Status:** verified, exact match.

## §2 The Rule

**Initial (v1).** A passage is normative if and only if it uses explicit modal verbs of requirement
(MUST, MUST NOT, MAY, OPTIONAL) or is located in a dedicated conformance section (`## MUST`,
`## MAY`, `## MUST NOT`) to impose a binding requirement, permission, or prohibition on
implementations or authorities.

**Why it needed refinement.** Three structural ambiguities: an explicit self-disclaimer at 61–68
nullifying modal phrasing in the sections it covers; mixed operative rules and informative
commentary inside numbered provisions; and modal language outside normative sections used for
non-protocol purposes (line 351's migration instruction, lines 334–335's summary table).

**Refined (v2), applied.** A passage is normative if and only if it states an operative requirement,
permission, prohibition, or wire format that directly binds a conforming implementation or authority
— whether by modal keyword, by explicit designation ("is normative"), or by prescriptive placement
in a conformance section — **excluding** sections the document disclaims (33–97), internal codebase
migration tasks, and accompanying commentary, history, rationale, or measurement.

## §3 Normative passages

MUST 1 (151–154, 157–160, 162–163, 165–166, operative sentences only), MUST 2 (170–171), MUST 3
(173), MUST 4 (175–176), MUST 5 (178–180), MUST 6 (181–183) with both sub-bullets (184–186,
187–189), MUST 7 (190), MUST 8 (191–196); the five MAY bullets (205, 206, 207, 208–209, 210); the
six MUST NOT bullets (214–215, 216–217, 218–219, 220–222, 223–224, 225–227); the citation rules
(290–294, 296–300); the envelope convention (314–320, 321–326).

## §3b Excluded

Sixty-nine entries, each with a reason. The load-bearing ones: lines 33–97 in full, by the
disclaimer at 61–68; all headings; embedded measurement and rationale inside MUST 1 and MUST 8;
the guarantee table (110–114) and capability table (127–131) as definitional; `## What a witness
does, exactly` (229–251) as descriptive; `## What is not covered` (254–286), on the ground that
line 254's "Stated so that no implementation promises it" is *itself* an explicit disclaimer of
normativity; the whole `## Named failures` table **including line 334**, as a summary matrix; and
`## Migration` (341–410) as procedural notes and legacy analysis.

## §4 Borderline cases

Twelve, each with resolution, alternative, and consequence. The three that bear on the comparison:

**2 — Normative force without RFC 2119 keywords.** MUST 3, MUST 4, MUST 7 carry no uppercase modal,
and no MAY bullet repeats the word "MAY". *Chosen:* structural placement in a conformance section
imparts normative force without the keyword. *Alternative:* strict keyword requirement. *What
changes:* MUST 3, MUST 4, MUST 7 and all five MAY bullets leave the normative list, "stripping the
specification of core content identification rules, ledger non-rewindability for conforming
authorities, witness absence reporting, and explicit implementation options."

**7 — Normative provisions outside the apparent normative sections.** *Chosen:* `## Citing a record`
is normative — it says of itself "Cross-store citation is normative" and carries `MUST`, `OPTIONAL`
and `must not`. *Alternative:* "Rely strictly on the disclaimer in line 66 — 'An implementer can
build from the MUST/MAY/MUST NOT sections alone and lose nothing' — to exclude everything outside
`## MUST`, `## MAY`, and `## MUST NOT`." *What changes:* lines 290–294, 296–300 and 314–326 are
excluded, "omitting citation syntax, cross-store citation requirements, and envelope header
processing from the specification."

**10 — The summary matrix in `## Named failures`.** *Chosen:* non-normative summary; the table
synthesises consequences of MUST 1, MUST 4, MUST 8 and MAY rather than enacting new requirements.
*Alternative:* treat cells containing modals as independent requirements. *What changes:* rows 334
("the ledger MUST be written **before** the record"), 335 and 336 enter the normative list.

---

## Where this differs from the other two reads

| | subagent | Mistral | Gemini |
|---|---|---|---|
| MUST 3, line 173 | normative | normative | normative |
| MUST 6 sub-bullets, 184–189 | normative | normative | normative |
| **line 317**, envelope `id:` | normative | normative | normative |
| line 334, ledger-before-record | normative | normative | **excluded** |
| lines 108–148, definitions | excluded | **normative** | excluded |
| line 254 | **normative** | excluded | excluded |
| line 351, migration deadline | **normative** | excluded | excluded |
| the line-66 tension | **raised (B3)** | not raised | **raised (borderline 7)** |

Line 334 is the only divergence among the four clauses that decide the Q1 axes, and it was cited in
both elimination runs as support rather than as grounds — the rejection on axis D rests on MUST 6's
deletion bullet, which all three admit.
