# Phase 08 — Damage Mitigation & Rep Analysis Views

Answers: **"How well am I mitigating damage?"** and **"How well are reps applying?"**

## Damage Mitigation

1. DPS taken over time as a graph (rolling average line chart)
2. Max DPS taken in ~10s, ~30s, ~1min sliding windows
3. Hit quality summary (Hits/Grazes/etc.) per incoming weapon/ammo type, drones listed separately

## Rep Analysis

1. Total amount repaired, by ship type of repper (includes rep bots, listed separately)
2. Max reps per second in 30s and 1min windows
3. Total reps taken (incoming: `rep-received`) vs outgoing (`rep-outgoing`), rep bots listed separately

## Analysis Logic Notes

- **Sliding window DPS**: sort `damage-received` events by timestamp. For each timestamp T, sum all `amount` values in entries within `[T - windowMs, T]`. Result = sum / windowSeconds. Track the max across all T.
- **Fight detection for graph**: the graph should segment "fights" — gaps of >60 seconds with no combat events start a new fight segment. Each fight is a separate series or shown with a break.
- **Rep bot detection**: `isRepBot = true` on the entry (set by parser for `Medium Armor Maintenance Bot`, etc.). Rep bots are grouped separately in summaries.
- **Outgoing reps**: `rep-outgoing` entries — player was repping someone else. Grouped by `repShipType` (who you repped).

## Tasks

- [x] Create `src/lib/analysis/damageTaken.ts` (already exists):

  ```ts
  import type { LogEntry, HitQuality } from "../types";

  export interface DpsWindow {
    windowSeconds: number; // 10, 30, or 60
    maxDps: number;
    peakTimestamp: Date; // when the peak occurred
  }

  export interface FightSegment {
    start: Date;
    end: Date;
    durationSeconds: number;
    entries: LogEntry[]; // damage-received events in this fight
  }

  export interface TimeSeriesDpsPoint {
    timestamp: Date;
    dps: number; // rolling 10s window ending at this timestamp
    fightIndex: number; // which fight segment
  }

  export interface IncomingWeaponSummary {
    source: string; // attacker name/NPC
    weapon: string;
    isDrone: boolean;
    hitCount: number;
    totalDamage: number;
    minHit: number;
    maxHit: number;
    hitQualities: Partial<Record<HitQuality, number>>;
  }

  export interface DamageTakenAnalysis {
    totalDamageReceived: number;
    totalIncomingHits: number;
    fights: FightSegment[];
    dpsTimeSeries: TimeSeriesDpsPoint[];
    peakDps10s: DpsWindow;
    peakDps30s: DpsWindow;
    peakDps60s: DpsWindow;
    incomingWeaponSummaries: IncomingWeaponSummary[]; // non-drone
    incomingDroneSummaries: IncomingWeaponSummary[]; // drone only
    overallHitQualities: Partial<Record<HitQuality, number>>;
  }

  export function analyzeDamageTaken(entries: LogEntry[]): DamageTakenAnalysis;
  ```

  Implementation:
  - `segmentFights`: sort damage-received entries by timestamp; split into groups where consecutive events are >60s apart
  - `computeDpsTimeSeries`: for each fight, step through every second from fight.start to fight.end; for each second T compute sum of `amount` in `[T-10s, T]`, divide by 10. Return array of points.
  - `computePeakDps(entries, windowSeconds)`: sliding window max — efficient O(n) with a deque or simple O(n\*k) for reasonable log sizes
  - `IncomingWeaponSummary`: group by `(source + weapon)` pair, `isDrone` from entry, aggregate min/max/hitQualities

- [x] Create `src/lib/analysis/repAnalysis.ts`:
  - Implemented RepSourceSummary and RepAnalysis interfaces
  - Sliding window rep calculation for 30s and 60s windows
  - Incoming/outgoing rep analysis with bot detection

- [x] Create `src/components/charts/DpsTakenChart.tsx`:
  - ComposedChart with red line and area gradient fill
  - Vertical reference lines at fight boundaries
  - Custom tooltip showing timestamp, DPS, and fight number

- [x] Create `src/app/damage-taken/page.tsx` — Damage Mitigation page:
  - AppLayout with title "DAMAGE MITIGATION"
  - Section 1: DPS chart with 10s rolling average
  - Section 2: Peak DPS windows (10s, 30s, 60s) as red StatCards
  - Section 3: Incoming weapons and drones tables with hit quality
  - Section 4: Reps received/applied panels with gold variant

- [x] Add `/damage-taken` to sidebar nav with ShieldAlert icon and "DAMAGE IN" label

- [x] Run `npm run build` — zero TypeScript errors (build successful)
