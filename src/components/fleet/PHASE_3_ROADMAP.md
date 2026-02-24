---
type: note
title: Phase 3 Fleet Visualization Roadmap
created: 2026-02-24
tags:
  - fleet
  - roadmap
  - phase-3
  - visualization
  - documentation
related:
  - "[[PHASE_2_ROADMAP]]"
  - "[[PHASE_4_ROADMAP]]"
---

# Phase 3 Fleet Visualization Roadmap

## Goal

Introduce four advanced visualizations that build on Phase 2 aggregations, giving fleet commanders intuitive flow, timeline, and composition insights at scale.

## Visualization Plans

### Rep Flow Network Diagram (Sankey)

- Use case and value: Surface primary logistics pilots and their top recipients in a single flow view, enabling quick identification of rep anchors and dependency chains.
- Suggested library: D3.js or visx (Sankey layout); recharts does not include Sankey out of the box.
- Component structure and props:
  - `FleetRepFlowSankey.tsx`
  - Props: `{ flows: RepFlow[]; participants: FleetParticipant[]; minAmount?: number; maxNodes?: number }`
  - Convert `RepFlow` data into Sankey nodes/links, with nodes keyed by pilot name and links weighted by `amount`.
- Integration points:
  - Use `aggregateRepFlows()` output from `src/lib/fleet/fleetAnalysis.ts` (already available on `FleetCombatAnalysis`).
  - Optionally pair with `calculateParticipantStats()` for per-pilot totals and status labels.

### Damage Flow Diagram (Source → Target)

- Use case and value: Visualize damage sources and targets to spot focus fire patterns and top enemy threats.
- Suggested library: visx (network/flow), or D3.js for custom force-directed or Sankey layout.
- Component structure and props:
  - `FleetDamageFlowDiagram.tsx`
  - Props: `{ damageBySource: Map<string, number>; damageByTarget: Map<string, number>; topN?: number }`
  - Build source/target nodes from `byPilot` and `byTarget` maps, limit to top N to reduce clutter.
- Integration points:
  - Use `aggregateDamageDealt()` maps from `src/lib/fleet/fleetAnalysis.ts`.
  - Optional enrichment from Phase 2 damage tab utilities for labels and damage-type grouping.

### Combined Timeline (Damage, Reps, Cap Drain)

- Use case and value: Correlate spike windows across damage dealt, damage taken, reps, and cap pressure to reconstruct fight phases.
- Suggested library: recharts (multi-series line/area chart) for consistency with existing charts.
- Component structure and props:
  - `FleetCombinedTimeline.tsx`
  - Props: `{ timeSeries: Array<{ timestamp: Date; damageDealt: number; damageTaken: number; reps: number; capDrained: number }>; duration: FightDuration }`
  - Provide toggles for series visibility and normalization by duration.
- Integration points:
  - Extend Phase 2 aggregations to emit time buckets (reuse single-log analysis time-binning patterns).
  - Use `calculateFightDuration()` output for axis bounds.

### Damage Composition (Stacked Bar per Pilot)

- Use case and value: Compare per-pilot damage profiles by type to reveal doctrine alignment and ammo choices.
- Suggested library: recharts (stacked bar chart) to keep consistent styling with existing UI.
- Component structure and props:
  - `FleetDamageCompositionChart.tsx`
  - Props: `{ damageByPilotType: Map<string, Map<string, number>>; damageTypes: string[] }`
  - Derive `damageByPilotType` from `aggregateDamageDealt()` and group by `damageType` when available.
- Integration points:
  - Use `aggregateDamageDealt()` and the `byType` map as the baseline; add a grouped map keyed by pilot.
  - Leverage Phase 2 damage tab logic for consistent damage type labels.

## Performance Considerations (50+ Participants)

- Limit network diagrams to top contributors or allow thresholds (`minAmount`, `topN`) to keep node count manageable.
- Pre-aggregate data in `analyzeFleetCombat()` and memoize chart transforms in the UI layer.
- Use windowed or bucketed time series for the combined timeline to avoid rendering thousands of points.
- Provide lightweight tooltip rendering and avoid expensive DOM updates inside mousemove handlers.

## Phase 2 Integration Notes

- Prefer existing `FleetCombatAnalysis` outputs and extend aggregation functions rather than recalculating in components.
- Align component props with Phase 2 tab data structures to minimize data reshaping.
- Keep visualization components pure and feed them prepared datasets from `src/lib/fleet/fleetAnalysis.ts` or companion helpers.
