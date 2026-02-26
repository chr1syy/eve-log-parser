---
type: report
title: Fight Boundaries Acceptance Checklist
created: 2026-02-26
tags:
  - fight-boundaries
related:
  - "[[FIGHT-BOUNDARIES-06-DOCS-AND-ACCEPTANCE]]"
---

This machine-readable acceptance checklist is intended for automated agents to verify the fight-boundaries feature.

assertions:
dotted_lines_present: true
boundaries_match_damage_in: true
responsive: true

notes:

- `dotted_lines_present` expects the `DamageDealtChart` to render `ReferenceLine` elements with `strokeDasharray` set to `"4 4"` and stroke `#8892a4`.
- `boundaries_match_damage_in` expects the timestamps produced by `detectFightBoundaries(entries)` to align with gaps in incoming damage series (i.e., boundaries correspond to fight starts where damage resumes after a gap).
- `responsive` asserts that the chart layout adapts to container width/height changes (verified by rendering in different sizes or using `ResponsiveContainer`).
