"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type {
  TimeSeriesDpsPoint,
  FightSegment,
} from "@/lib/analysis/damageTaken";

interface DpsTakenChartProps {
  timeSeries: TimeSeriesDpsPoint[];
  fights: FightSegment[];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as TimeSeriesDpsPoint;
  return (
    <div className="bg-overlay border border-[#00d4ff40] px-3 py-2 rounded-sm font-mono text-xs backdrop-blur">
      <p className="text-text-secondary mb-1">{formatTime(point.timestamp)}</p>
      <p className="text-status-kill font-bold">
        DPS: {point.dps.toLocaleString(undefined, { maximumFractionDigits: 1 })}
      </p>
      <p className="text-text-muted">Fight {point.fightIndex + 1}</p>
    </div>
  );
}

export default function DpsTakenChart({
  timeSeries,
  fights,
}: DpsTakenChartProps) {
  if (timeSeries.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted font-mono text-xs">
        NO INCOMING DAMAGE DATA
      </div>
    );
  }

  // Compute fight boundaries for reference lines
  const fightBoundaries: { timestamp: number; label: string }[] = [];
  for (let i = 1; i < fights.length; i++) {
    fightBoundaries.push({
      timestamp: fights[i].start.getTime(),
      label: `Fight ${i + 1}`,
    });
  }

  // Convert time series data for Recharts
  const data = timeSeries.map((point) => ({
    ...point,
    timestampMs: point.timestamp.getTime(),
    timeLabel: formatTime(point.timestamp),
  }));

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={data}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="dpsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e53e3e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#e53e3e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1a254060"
            vertical={false}
          />
          <XAxis
            dataKey="timestampMs"
            type="number"
            domain={["dataMin", "dataMax"]}
            tick={{
              fill: "#8892a4",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
            }}
            axisLine={{ stroke: "#1a2540" }}
            tickLine={false}
            tickFormatter={(ts: number) => formatTime(new Date(ts))}
          />
          <YAxis
            tick={{
              fill: "#8892a4",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
            }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="dps"
            stroke="none"
            fill="url(#dpsGradient)"
            dot={false}
            animationDuration={600}
            animationEasing="ease-out"
          />
          <Line
            type="monotone"
            dataKey="dps"
            stroke="#e53e3e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: "#e53e3e" }}
            animationDuration={600}
            animationEasing="ease-out"
          />
          {fightBoundaries.map((boundary, idx) => (
            <ReferenceLine
              key={idx}
              x={boundary.timestamp}
              stroke="#8892a4"
              strokeDasharray="4 4"
              label={{
                value: boundary.label,
                position: "top",
                fill: "#8892a4",
                fontSize: 10,
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
