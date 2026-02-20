# Phase 09 — Capacitor / Neut Pressure Analysis View

Answers: **"How much is neut pressure mattering?"**

Four sub-sections:

1. Total cap **neuted/drained by you** (outgoing)
2. Total cap **neuted/drained from you** (incoming) — broken down by enemy ship type
3. Outgoing neut hit summary per neut/nos module type (hit count, max, min, avg GJ)
4. Incoming neut hit summary per module type (hit count, max, min, avg GJ)

## Log Format for Cap Events (real data)

**Neut received** (enemy neutralized your cap) — color `0xffe57f7f`:

```
438 GJ energy neutralized <ShipType> - Heavy Energy Neutralizer II
```

No pilot name, only ship type. The ship type is extracted from the `<u>ShipType</u>` underline tag.

**Neut dealt by you** — color `0xff7fffff`:

```
165 GJ energy neutralized <ShipType> - Medium Infectious Scoped Energy Neutralizer
```

Same format — ship type only.

**Nosferatu dealt by you** — color `0xffe57f7f` but contains `energy drained to`:

```
-7 GJ energy drained to <ShipType> - Small Energy Nosferatu II
```

Value is negative (quirk of EVE logging). Use `Math.abs(value)` for actual GJ drained.
A value of `-0` or `0` means your cap was too low — the nos fired but drained nothing.

## Analysis Logic Notes

- **Outgoing total**: sum all `neut-dealt` + `nos-dealt` entries (`capAmount`). Nos 0-value hits still count as a "hit" but 0 GJ.
- **Incoming total by ship type**: group `neut-received` entries by `capShipType`. Sum `capAmount` per ship type.
- **Per-module summary**: group by `capModule`. Track count, max, min, avg GJ per module.
- **Nos vs Neut distinction in outgoing**: `eventType === 'nos-dealt'` vs `'neut-dealt'`.

## Tasks

- [x] Create `src/lib/analysis/capAnalysis.ts`:

  ```ts
  import type { LogEntry } from "../types";

  export interface CapModuleSummary {
    module: string; // e.g. "Heavy Energy Neutralizer II"
    eventType: "neut-dealt" | "neut-received" | "nos-dealt";
    hitCount: number;
    totalGj: number;
    maxGj: number;
    minGj: number;
    avgGj: number;
    zeroHits: number; // hits where GJ = 0 (dry cap / out of range)
  }

  export interface CapShipTypeSummary {
    shipType: string; // enemy ship type
    totalGjTaken: number; // total cap they removed from you
    hitCount: number;
    moduleBreakdown: CapModuleSummary[];
  }

  export interface CapAnalysis {
    // Outgoing (you neuted/drained enemies)
    totalGjNeutDealt: number; // neut-dealt only
    totalGjNosDrained: number; // nos-dealt only (abs values)
    totalGjOutgoing: number; // sum of both
    outgoingModuleSummaries: CapModuleSummary[]; // grouped by module, sorted by totalGj desc

    // Incoming (enemies neuted you)
    totalGjNeutReceived: number;
    incomingByShipType: CapShipTypeSummary[]; // sorted by totalGjTaken desc
    incomingModuleSummaries: CapModuleSummary[]; // grouped by module name

    // Timeline for chart: GJ neut received over time
    neutReceivedTimeline: {
      timestamp: Date;
      gjAmount: number;
      module: string;
      shipType: string;
    }[];
  }

  export function analyzeCapPressure(entries: LogEntry[]): CapAnalysis;
  ```

  Implementation notes:
  - Filter `neut-received` entries: `capEventType === 'neut-received'`
  - Filter `neut-dealt`: `capEventType === 'neut-dealt'`
  - Filter `nos-dealt`: `capEventType === 'nos-dealt'`, use `capAmount` (already abs from parser)
  - Module name comes from `capModule` field (set by parser for all cap events)
  - Ship type comes from `capShipType` field (set by parser for all cap events)
  - `zeroHits`: count entries where `capAmount === 0` (nos fired but drained nothing)
  - `neutReceivedTimeline`: all `neut-received` events sorted by timestamp

- [x] Create `src/components/charts/CapTimelineChart.tsx`:
  - Uses Recharts `BarChart` (vertical bars per neut event)
  - Props: `timeline: { timestamp: Date; gjAmount: number; module: string; shipType: string }[]`
  - X axis: time (HH:mm:ss)
  - Y axis: GJ amount
  - Each bar: color-coded by module name (up to 5 distinct colors: red tones for neuts)
  - Tooltip: "438 GJ neutralized by [Typhoon] — Heavy Energy Neutralizer II at 02:08:37"
  - If no neut-received events: show "NO INCOMING NEUT RECORDED" placeholder

- [x] Create `src/app/cap-pressure/page.tsx` — Cap Pressure page, route `/cap-pressure`:
  - Use `AppLayout` with title "CAP PRESSURE"

  **Section 1 — Summary Stats (top row):**
  - 4 `StatCard`s in a row:
    - "CAP NEUTED BY YOU" (cyan) — totalGjNeutDealt GJ
    - "CAP DRAINED (NOS)" (cyan) — totalGjNosDrained GJ
    - "CAP TAKEN FROM YOU" (red) — totalGjNeutReceived GJ
    - "ZERO GJ NOS HITS" (gold) — total zero-GJ nos events (meaning your cap ran dry)

  **Section 2 — Your Outgoing Neut/Nos:**
  - `Panel` titled "OUTGOING NEUTRALIZATION SUMMARY" (cyan variant)
  - `DataTable` with columns: Module Name, Type (Badge: "NEUT" or "NOS"), Hits, Total GJ (cyan), Max GJ (gold), Min GJ, Avg GJ, Zero Hits
  - Sort by Total GJ desc

  **Section 3 — Incoming Neut by Enemy Ship Type:**
  - `Panel` titled "INCOMING NEUT BY SHIP TYPE" (red/accent variant — use `border-t-status-kill`)
  - `DataTable` with columns: Ship Type, Total GJ Taken (red), Hits, and expandable sub-rows showing module breakdown
  - OR: flat table with Ship Type + Module columns side by side (simpler if sub-rows are complex)
  - Sort by Total GJ Taken desc

  **Section 4 — Incoming Neut Timeline:**
  - `Panel` titled "INCOMING NEUT OVER TIME"
  - `CapTimelineChart` component

  **Section 5 — Incoming Neut Module Summary:**
  - `Panel` titled "INCOMING NEUT MODULE BREAKDOWN"
  - `DataTable`: Module Name, Hit Count, Total GJ (red), Max GJ, Min GJ, Avg GJ
  - Example from real logs: `Heavy Energy Neutralizer II: 2 hits, 438 max, 438 min, 438 avg`

  - Add `/cap-pressure` to sidebar nav (icon: `Zap`, label "CAP PRESSURE")

- [x] Create `src/lib/analysis/index.ts` that re-exports all three analysis modules:

  ```ts
  export * from "./damageDealt";
  export * from "./damageTaken";
  export * from "./repAnalysis";
  export * from "./capAnalysis";
  ```

- [x] Run `npm run build` — zero TypeScript errors. Build successful. All analysis pages reachable from sidebar. ⚠️ Note: Real log file testing requires the actual log file upload flow to be functional.
