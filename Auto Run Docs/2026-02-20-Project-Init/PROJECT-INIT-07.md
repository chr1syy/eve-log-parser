# Phase 07 — Damage Application Analysis View

Answers: **"How well am I applying damage?"**

Three sub-sections:
1. **DPS per target** — calculated within the engagement window you were actually shooting them
2. **Hit quality summary** — Hits/Grazes/etc. per weapon/ammo type, drones listed separately
3. **Min / Max hit** — per weapon/ammo type

## Analysis Logic Notes

- **Engagement window per target**: group outgoing damage entries by `pilotName + shipType`. The window = first hit to last hit on that target. DPS = totalDamage / windowSeconds.
- **Drones**: entries with `isDrone = true` are bucketed separately from turret/missile weapons.
- **Hit quality**: use the `hitQuality` field — count occurrences per `weapon` value.
- **Min/Max hit**: per weapon, track `Math.min` and `Math.max` of `amount`.

## Tasks

- [x] Create `src/lib/analysis/damageDealt.ts` with pure analysis functions (no React, no UI):
  ```ts
  import type { LogEntry, HitQuality } from '../types'

  export interface TargetEngagement {
    target: string           // pilotName or NPC name
    shipType: string
    corp?: string
    firstHit: Date
    lastHit: Date
    windowSeconds: number
    totalDamage: number
    hitCount: number
    dps: number              // totalDamage / windowSeconds (0 if single hit)
    minHit: number
    maxHit: number
    avgHit: number
    hitQualities: Partial<Record<HitQuality, number>>
  }

  export interface WeaponApplicationSummary {
    weapon: string
    isDrone: boolean
    hitCount: number
    totalDamage: number
    minHit: number
    maxHit: number
    avgHit: number
    hitQualities: Partial<Record<HitQuality, number>>
  }

  export interface DamageDealtAnalysis {
    engagements: TargetEngagement[]         // sorted by totalDamage desc
    weaponSummaries: WeaponApplicationSummary[]  // turrets/missiles
    droneSummaries: WeaponApplicationSummary[]   // drones only
    overallDps: number                      // total damage / total active combat seconds
    totalDamageDealt: number
    totalHits: number
    overallHitQualities: Partial<Record<HitQuality, number>>
  }

  export function analyzeDamageDealt(entries: LogEntry[]): DamageDealtAnalysis
  ```

  Implementation notes:
  - Filter entries: `eventType === 'damage-dealt'`
  - Group by unique target key (`pilotName ?? 'unknown' + shipType`), compute `TargetEngagement` per group
  - Window seconds: if `lastHit === firstHit`, use `1` to avoid divide-by-zero; DPS shown as `N/A` or `—` in UI for single-hit targets
  - Weapon summaries: group by `weapon`, set `isDrone` from any entry in group
  - Overall DPS: span from first to last outgoing damage event overall

- [x] Create `src/app/damage-dealt/page.tsx` — Damage Application page, route `/damage-dealt`:
  - Use `AppLayout` with title "DAMAGE APPLICATION"
  - Use `useParsedLogs` hook, run `analyzeDamageDealt(activeLogs[0].entries)` on first active log
  - **Section 1 — DPS per Target:**
    - Panel titled "DPS PER TARGET"
    - `DataTable` with columns: Target (pilot+ship badge), Corp, Engagement Window (start–end in monospace), Window Secs, Total Damage (gold), DPS (cyan, bold), Hits, Min (green), Max (red), Avg
    - Sort by DPS desc by default
    - A horizontal bar under each DPS cell showing relative % of max DPS (visual bar, styled in cyan)
  - **Section 2 — Weapon Hit Quality:**
    - Two side-by-side `Panel`s: "WEAPONS & AMMO" and "DRONES"
    - Each panel: a table with columns: Weapon/Ammo, Hits, Total Dmg, Min, Max, Avg, then one column per hit quality word (Wrecks/Smashes/Penetrates/Hits/Glances Off/Grazes/Barely Scratches) showing count
    - Hit quality columns: color-coded cells — Wrecks/Smashes = gold, Penetrates/Hits = cyan, Glances Off/Grazes = text-muted, Barely Scratches = red
    - Empty drone panel shows "NO DRONE DAMAGE RECORDED" in text-muted
  - **Section 3 — Min/Max Hit stat cards:**
    - Row of `StatCard`s: Best Single Hit (gold), Worst Hit (text-muted), Average Hit (cyan), Total Hits, Total Damage Dealt
  - Add link to this page in `Sidebar.tsx` nav (icon: `Sword` from Lucide, label "DAMAGE OUT")

- [x] Add `src/app/damage-dealt/page.tsx` to the sidebar navigation in `src/components/layout/Sidebar.tsx`. Ensure the nav item activates correctly based on `usePathname()`.

- [x] Run `npm run build` — confirm zero TypeScript errors.
