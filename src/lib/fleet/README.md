---
type: reference
title: Fleet Feature Module Overview
created: 2026-02-24
tags:
  - fleet
  - analysis
  - documentation
related: []
---

# Fleet Feature Module Overview

## Purpose and Structure

The fleet feature aggregates combat log uploads from multiple pilots, validates overlap, merges events into a single timeline, and produces fleet-level analysis metrics for the UI.

Module breakdown:

- `logMerging.ts`: validates timestamp overlap and merges multiple pilot logs into a single deduplicated event stream.
- `fleetAnalysis.ts`: aggregates fleet-level metrics like damage, reps, cap pressure, enemy stats, and fight duration.
- `participantStats.ts`: derives per-participant totals (damage, reps, status) from merged entries.
- `constants.ts`: shared fleet constants and example data used across the feature.

## ASCII Data Flow

```
Upload logs -> Parse -> Validate timestamps -> Merge -> Analyze -> Calculate stats -> Display
```

## Exported Functions and Type Signatures

### `logMerging.ts`

- `matchLogsByTimestamp(logs: FleetLogData[]): { overlapping: boolean; overlapStart: Date | null; overlapEnd: Date | null; validationErrors: string[] }`
- `mergeFleetLogs(logs: FleetLogData[]): LogEntry[]`

### `fleetAnalysis.ts`

- `analyzeFleetCombat(mergedEntries: LogEntry[], participants: FleetParticipant[]): FleetCombatAnalysis`
- `aggregateDamageDealt(entries: LogEntry[]): DamageDealtAggregation`
- `aggregateDamageTaken(entries: LogEntry[]): DamageTakenAggregation`
- `aggregateRepFlows(entries: LogEntry[]): RepFlowsAggregation`
- `aggregateCapPressure(entries: LogEntry[]): CapPressureAggregation`
- `identifyEnemies(entries: LogEntry[], participants: FleetParticipant[]): EnemiesAggregation`
- `calculateFightDuration(entries: LogEntry[]): FightDuration`

### `participantStats.ts`

- `calculateParticipantStats(mergedEntries: LogEntry[], participants: FleetParticipant[]): FleetParticipant[]`

### `constants.ts`

- No exported functions. This module exports constants and types used across the fleet feature.

## Example Usage

```ts
import { analyzeFleetCombat } from "@/lib/fleet/fleetAnalysis";
import type { LogEntry } from "@/lib/types";
import type { FleetParticipant } from "@/types/fleet";

const mergedEntries: LogEntry[] = [
  {
    timestamp: new Date("2026-02-23T10:00:00Z"),
    eventType: "damage-dealt",
    amount: 1200,
    weapon: "Heavy Entropic Disintegrator II",
    pilotName: "Captain Alpha",
    shipType: "Abaddon",
    rawLine:
      "[2026-02-23 10:00:00] (combat) 1200 from Captain Alpha - Heavy Entropic Disintegrator II - Hits",
  },
];

const participants: FleetParticipant[] = [
  {
    pilotName: "Captain Alpha",
    shipType: "Abaddon",
    damageDealt: 0,
    damageTaken: 0,
    repsGiven: 0,
    repsTaken: 0,
    status: "active",
    logId: "log-1",
  },
];

const analysis = analyzeFleetCombat(mergedEntries, participants);
```
