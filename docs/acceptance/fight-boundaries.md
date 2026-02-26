---
type: report
title: Fight Boundaries Acceptance Checklist
created: 2026-02-26
tags:
  - acceptance
  - fight-boundaries
related:
  - "[[Fight Boundaries — 06 Docs and Acceptance Criteria]]"
---

This machine-readable acceptance checklist defines assertions that an automated agent or test runner can verify for the `DamageDealtChart` fight boundaries feature.

assertions:
dotted_lines_present: true
boundaries_match_damage_in: true
responsive: true

verification:

- name: dotted_lines_present
  description: "Chart renders dotted vertical separators for each fight boundary (CSS or SVG elements present)."
  type: boolean
  expected: true
- name: boundaries_match_damage_in
  description: "Detected boundaries align with damage-containing entries (e.g. boundary timestamps correspond to local minima/gaps in damage)."
  type: boolean
  expected: true
- name: responsive
  description: "Chart layout adapts to viewport size; separators remain visible and correctly positioned at common breakpoints."
  type: boolean
  expected: true

notes:

- The assertions are intended to be consumed by test agents that can render the chart (headless or browser) and inspect DOM/SVG/CSS or run the boundary detection function `detectFightBoundaries(entries)` and compare results to rendered separators.
