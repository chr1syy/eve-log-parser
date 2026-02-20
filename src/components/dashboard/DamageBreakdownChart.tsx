'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { LogStats } from '@/lib/types';

interface DamageBreakdownChartProps {
  stats: LogStats;
}

// Colors: first = cyan-glow, second = gold-bright, rest = progressively dimmer blues
const SEGMENT_COLORS = [
  '#00d4ff', // cyan-glow
  '#c9a227', // gold-bright
  '#0099cc', // cyan-mid
  '#005f80', // cyan-dim
  '#003d54', // darker blue
  '#4a5568', // muted
  '#2d3748', // very muted
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-overlay border border-[#00d4ff40] px-3 py-2 rounded-sm font-mono text-xs backdrop-blur">
      <p className="text-text-primary mb-0.5">{d.name}</p>
      <p style={{ color: d.payload.fill }}>
        Hits: {d.payload.count.toLocaleString()}
      </p>
      <p className="text-text-secondary">
        Damage: {d.payload.totalDamage.toLocaleString()}
      </p>
    </div>
  );
}

export default function DamageBreakdownChart({ stats }: DamageBreakdownChartProps) {
  const weapons = stats.topWeapons.slice(0, 7);

  if (weapons.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted font-mono text-xs">
        NO WEAPON DATA
      </div>
    );
  }

  const data = weapons.map((w) => ({
    name: w.name,
    value: w.count,
    count: w.count,
    totalDamage: w.totalDamage,
  }));

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            animationDuration={600}
            animationEasing="ease-out"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />

          {/* Center label rendered via SVG text */}
          <text
            x="50%"
            y="46%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#4a5568"
            fontSize={9}
            fontFamily="Rajdhani, sans-serif"
            fontWeight={600}
            letterSpacing="0.1em"
          >
            TOP
          </text>
          <text
            x="50%"
            y="56%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#4a5568"
            fontSize={9}
            fontFamily="Rajdhani, sans-serif"
            fontWeight={600}
            letterSpacing="0.1em"
          >
            WEAPONS
          </text>
        </PieChart>
      </ResponsiveContainer>

      {/* Legend table */}
      <div className="space-y-1">
        {data.map((w, i) => (
          <div key={w.name} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
            />
            <span className="flex-1 text-text-secondary text-xs font-mono truncate">{w.name}</span>
            <span className="text-text-muted text-xs font-mono">{w.count.toLocaleString()} hits</span>
          </div>
        ))}
      </div>
    </div>
  );
}
