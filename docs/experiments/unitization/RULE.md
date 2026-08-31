# The unitization rule

Apply this rule to the two documents in this directory. It is given to you
as stated; you are not asked whether it is a good rule.

1. Numbered MUSTs: one row per numbered MUST. Compound parts carry sub-verdicts
     that roll up into the parent's verdict.

  2. Unnumbered normative text: one row per distinct normative claim, using the
     following priority for unit boundaries:
       (a) each MUST NOT statement is one row
       (b) each MAY grant is one row
       (c) each definition in the Definitions section is one row
       (d) each convention (K1-K6, citation, envelope) is one row
       (e) each entry in the Named Failures table is one row
       (f) each Migration requirement is one row

  3. Where a single sentence contains multiple normative claims, split at each
     new MUST/MAY/MUST NOT keyword. Where a paragraph contains multiple claims,
     split at each new keyword or table row.

  4. Unit identity: allocated, not computed. Assign stable IDs when the unitization
     is first created: M1, M2, ..., M8, N1, N2, ..., N6, Y1, ..., Y5, D1, ..., D12,
     C1, C2, C3, CT1, CT2, CT3, EV1, EV2, EV3, F1, ..., F7, MG1, MG2. When an
     amendment edits a unit, the amendment states the mapping explicitly:
     "U-X in vN is U-Y of vN-1, narrowed/widened/merged/split."

  5. Stability: a unit's ID does not change when the document is reflowed, reworded
     (without changing normative content), or reformatted. An ID changes only when
     the normative content it covers is added, removed, or substantively altered.
     The amendment records which IDs changed and why.
