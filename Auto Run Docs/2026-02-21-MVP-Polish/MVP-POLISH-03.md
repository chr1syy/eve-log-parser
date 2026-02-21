# MVP Polish — Phase 03: Damage Dealt Time-Series Chart

Add a time-series chart to the "Damage Out" (`/damage-dealt`) page. The chart should show:
1. **Damage dealt** broken down by target, as stacked colored bars over a rolling 10-second window.
2. **Bad-hit percentage** overlaid as a line on a secondary Y-axis — "bad" hits are
   `Glances Off`, `Grazes`, and `Barely Scratches`.

The pattern mirrors the existing `DpsTakenChart` on the damage-taken page.

## Context

- Analysis file: `src/lib/analysis/damageDealt.ts` — add new exported function + types
- New chart component: `src/components/charts/DamageDealtChart.tsx`
- Page to update: `src/app/damage-dealt/page.tsx` — import and render chart above the tables
- Types file: `src/lib/types.ts` — `HitQuality` union is already defined there
- Reference chart: `src/components/charts/DpsTakenChart.tsx` — use as style/pattern guide

Bad hit qualities (from `HitQuality` type): `'Glances Off' | 'Grazes' | 'Barely Scratches'`
Good hit qualities: `'Wrecks' | 'Smashes' | 'Penetrates' | 'Hits'`

Target color palette (distinct from existing cyan/gold palette):
```ts
const TARGET_COLORS = [
  '#ff6b35', // orange
  '#9d4edd', // purple
  '#06d6a0', // teal-green
  '#ffd166', // amber
  '#118ab2', // deep blue
  '#ef476f', // pink-red
]
```

## Tasks

- [x] **Add `generateDamageDealtTimeSeries()` to `src/lib/analysis/damageDealt.ts`**

  Add these exported types and function at the end of the file:

  ```ts
  export interface DamageDealtTimePoint {
    timestamp: Date
    badHitPct: number          // 0–100
    damageByTarget: Record<string, number>  // target label → damage in window
  }

  export interface DamageDealtTimeSeries {
    points: DamageDealtTimePoint[]
    topTargets: string[]       // ordered list of target labels (up to maxTargets)
  }

  const BAD_HIT_QUALITIES = new Set<HitQuality>(['Glances Off', 'Grazes', 'Barely Scratches'])

  export function generateDamageDealtTimeSeries(
    entries: LogEntry[],
    windowSeconds = 10,
    maxTargets = 6,
  ): DamageDealtTimeSeries {
    const sorted = entries
      .filter((e) => e.eventType === 'damage-dealt')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    if (sorted.length === 0) return { points: [], topTargets: [] }

    // Identify top N targets by total damage dealt
    const targetDamageMap = new Map<string, number>()
    for (const e of sorted) {
      const key = e.pilotName ?? e.shipType ?? 'Unknown'
      targetDamageMap.set(key, (targetDamageMap.get(key) ?? 0) + (e.amount ?? 0))
    }
    const topTargets = [...targetDamageMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxTargets)
      .map(([name]) => name)

    const WINDOW_MS = windowSeconds * 1000
    const points: DamageDealtTimePoint[] = []
    let prevSecond = -1

    for (const entry of sorted) {
      const t = entry.timestamp.getTime()
      const second = Math.floor(t / 1000)
      if (second === prevSecond) continue   // one point per second
      prevSecond = second

      const windowStart = t - WINDOW_MS
      const inWindow = sorted.filter((e) => {
        const et = e.timestamp.getTime()
        return et >= windowStart && et <= t
      })

      const damageByTarget: Record<string, number> = {}
      for (const target of topTargets) {
        damageByTarget[target] = inWindow
          .filter((e) => (e.pilotName ?? e.shipType ?? 'Unknown') === target)
          .reduce((sum, e) => sum + (e.amount ?? 0), 0)
      }

      const totalHits = inWindow.length
      const badHits = inWindow.filter(
        (e) => e.hitQuality != null && BAD_HIT_QUALITIES.has(e.hitQuality),
      ).length
      const badHitPct = totalHits > 0 ? (badHits / totalHits) * 100 : 0

      points.push({ timestamp: entry.timestamp, badHitPct, damageByTarget })
    }

    return { points, topTargets }
  }
  ```

  Verify with `npx tsc --noEmit`.

- [x] **Create `DamageDealtChart.tsx` and integrate it into the Damage Out page**

  Create `src/components/charts/DamageDealtChart.tsx`:

  ```tsx
  'use client'

  import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
  } from 'recharts'
  import type { DamageDealtTimeSeries } from '@/lib/analysis/damageDealt'

  const TARGET_COLORS = [
    '#ff6b35',
    '#9d4edd',
    '#06d6a0',
    '#ffd166',
    '#118ab2',
    '#ef476f',
  ]

  interface DamageDealtChartProps {
    series: DamageDealtTimeSeries
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null
    const point = payload[0]?.payload
    if (!point) return null
    return (
      <div className="bg-overlay border border-[#00d4ff40] px-3 py-2 rounded-sm font-mono text-xs backdrop-blur space-y-1">
        <p className="text-text-secondary">{formatTime(point.timestamp)}</p>
        {payload
          .filter((p: any) => p.dataKey !== 'badHitPct' && p.value > 0)
          .map((p: any) => (
            <p key={p.dataKey} style={{ color: p.fill }}>
              {p.dataKey}: {p.value.toLocaleString()}
            </p>
          ))}
        <p className="text-status-kill">
          Bad hits: {point.badHitPct.toFixed(1)}%
        </p>
      </div>
    )
  }

  export default function DamageDealtChart({ series }: DamageDealtChartProps) {
    const { points, topTargets } = series

    if (points.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-text-muted font-mono text-xs">
          NO OUTGOING DAMAGE DATA
        </div>
      )
    }

    // Flatten for Recharts
    const data = points.map((pt) => ({
      ...pt,
      timestampMs: pt.timestamp.getTime(),
      ...pt.damageByTarget,
    }))

    return (
      <div className="space-y-3">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a254060" vertical={false} />
            <XAxis
              dataKey="timestampMs"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fill: '#8892a4', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              axisLine={{ stroke: '#1a2540' }}
              tickLine={false}
              tickFormatter={(ts: number) => formatTime(new Date(ts))}
            />
            {/* Left Y-axis: damage */}
            <YAxis
              yAxisId="damage"
              tick={{ fill: '#8892a4', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            {/* Right Y-axis: bad hit % */}
            <YAxis
              yAxisId="pct"
              orientation="right"
              domain={[0, 100]}
              tick={{ fill: '#e53e3e', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              axisLine={false}
              tickLine={false}
              width={36}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#8892a4' }}
            />
            {topTargets.map((target, i) => (
              <Bar
                key={target}
                yAxisId="damage"
                dataKey={target}
                stackId="damage"
                fill={TARGET_COLORS[i % TARGET_COLORS.length]}
                maxBarSize={16}
                animationDuration={600}
                animationEasing="ease-out"
              />
            ))}
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="badHitPct"
              stroke="#e53e3e"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: '#e53e3e' }}
              name="Bad Hit %"
              animationDuration={600}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-text-muted font-mono text-xs">
          Stacked damage by target (10 s rolling window) · Red line = bad-hit % (Glances Off / Grazes / Barely Scratches)
        </p>
      </div>
    )
  }
  ```

  Then update `src/app/damage-dealt/page.tsx`:
  - Add imports at the top:
    ```ts
    import DamageDealtChart from '@/components/charts/DamageDealtChart'
    import { generateDamageDealtTimeSeries } from '@/lib/analysis/damageDealt'
    import type { DamageDealtTimeSeries } from '@/lib/analysis/damageDealt'
    ```
  - Inside `DamageDealtPage`, add a new `useMemo` after the existing `analysis` memo:
    ```ts
    const timeSeries: DamageDealtTimeSeries = useMemo(() => {
      if (!hasLogs) return { points: [], topTargets: [] }
      return generateDamageDealtTimeSeries(activeLogs[0].entries)
    }, [activeLogs, hasLogs])
    ```
  - In the JSX, add a new `<Panel>` section between the stat cards and the "DPS PER TARGET" panel:
    ```tsx
    {/* Damage dealt time-series chart */}
    <Panel title="DAMAGE DEALT OVER TIME">
      <DamageDealtChart series={timeSeries} />
    </Panel>
    ```

  Verify with `npx tsc --noEmit` and confirm the chart renders on the Damage Out page.
