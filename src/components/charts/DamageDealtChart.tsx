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
        Stacked damage by target (10 s rolling window) · Red line = bad-hit % (Glances Off / Grazes)
      </p>
    </div>
  )
}
