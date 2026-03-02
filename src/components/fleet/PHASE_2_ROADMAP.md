---
type: note
title: Phase 2 Fleet Analysis Roadmap
created: 2026-02-24
tags:
  - fleet
  - roadmap
  - phase-2
  - documentation
related:
  - "[[PHASE_3_ROADMAP]]"
  - "[[PHASE_4_ROADMAP]]"
---

# Phase 2 Fleet Analysis Roadmap

## Goal

Deliver five additional analysis tabs that extend the fleet MVP beyond the overview, using existing aggregation utilities and single-log analysis patterns.

## Tab Plans

### Damage Dealt

- Purpose: Show damage output by pilot, by target, and by damage type/weapon to identify top contributors and enemy focus.
- Data requirements:
  - `aggregateDamageDealt()` from `src/lib/fleet/fleetAnalysis.ts` (uses `damage-dealt` entries).
  - Use `byPilot`, `byTarget`, and `byType` maps for table/chart inputs.
- Component naming: `FleetDamageDealtTab.tsx`.
- Reuse candidates:
  - `src/components/charts/DamageDealtChart.tsx` for time-based damage.
  - `src/components/dashboard/DamageBreakdownChart.tsx` for type breakdowns.
  - `src/components/ui/DataTable.tsx` for top-pilot and top-target tables.
  - Single-log analysis data shape from `src/lib/analysis/damageDealt.ts` for labeling and grouping conventions.
- Testing strategy:
  - Unit tests for `aggregateDamageDealt()` with multiple pilots and mixed damage types.
  - Component test to validate table sorting and chart rendering with fixture data.

### Damage Taken

- Purpose: Highlight incoming damage pressure by pilot and by source to understand threat profile.
- Data requirements:
  - `aggregateDamageTaken()` from `src/lib/fleet/fleetAnalysis.ts` (uses `damage-received` entries).
  - Use `byPilot` and `bySource` maps for table/chart inputs.
- Component naming: `FleetDamageTakenTab.tsx`.
- Reuse candidates:
  - `src/components/charts/DpsTakenChart.tsx` for damage taken time series.
  - Single-log patterns from `src/lib/analysis/damageTaken.ts` for categorization labels.
  - `src/components/ui/DataTable.tsx` for per-pilot totals.
- Testing strategy:
  - Unit tests for `aggregateDamageTaken()` with enemy and pilot mix.
  - Component test that verifies chart dataset mapping and empty-state handling.

### Reps

- Purpose: Visualize rep flows and throughput to highlight primary logistics pilots and targets.
- Data requirements:
  - `aggregateRepFlows()` from `src/lib/fleet/fleetAnalysis.ts` for per-flow totals.
  - `calculateParticipantStats()` from `src/lib/fleet/participantStats.ts` for per-pilot rep totals.
  - Optional reuse of rep grouping logic from `src/lib/analysis/repAnalysis.ts` for module-level summaries.
- Component naming: `FleetRepsTab.tsx`.
- Reuse candidates:
  - `src/components/ui/DataTable.tsx` for flow and totals tables.
  - `src/components/dashboard/StatCard.tsx` for headline totals.
- Testing strategy:
  - Unit tests for `aggregateRepFlows()` to ensure flow keys and totals aggregate correctly.
  - Component test that validates flow table rows and totals formatting.

### Cap Pressure

- Purpose: Summarize neutralizer activity and cap drain to identify pressure points over time.
- Data requirements:
  - `aggregateCapPressure()` from `src/lib/fleet/fleetAnalysis.ts`.
  - Track `capDrained` per pilot and `capDrainers` list.
  - Use `src/lib/analysis/capAnalysis.ts` patterns for per-log time series if expanded in Phase 2.
- Component naming: `FleetCapPressureTab.tsx`.
- Reuse candidates:
  - `src/components/charts/CapTimelineChart.tsx` for time series rendering.
  - `src/components/ui/DataTable.tsx` for per-pilot drained totals.
- Testing strategy:
  - Unit tests for `aggregateCapPressure()` with mixed `neut-received` and `neut-dealt` entries.
  - Component test that validates the chart renders with sparse data.

### Composition

- Purpose: Show participant ships, alive/killed status, and role summaries.
- Data requirements:
  - `calculateParticipantStats()` from `src/lib/fleet/participantStats.ts` for per-pilot totals.
  - `FleetParticipant` data for ship hulls and roles.
  - Extend status when pod destruction events are implemented (currently default "active").
- Component naming: `FleetCompositionTab.tsx`.
- Reuse candidates:
  - `src/components/fleet/FleetParticipantsTable.tsx` structure for status columns.
  - `src/components/ui/Badge.tsx` for role/status labels.
- Testing strategy:
  - Unit tests for `calculateParticipantStats()` to ensure status and totals map correctly.
  - Component test that validates status labels and filtering by role.

## Implementation Notes

- Each tab should be wired into `src/components/fleet/FleetAnalysisTabs.tsx` with a dedicated label and route.
- Prefer aggregation outputs already computed by `analyzeFleetCombat()`; avoid recalculating in the UI.
- Use fixture logs in `src/__tests__/fixtures/fleet-logs/` for stable snapshots.
