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
import type { RepTimeSeriesPoint } from "@/lib/analysis/repAnalysis";

interface DpsTakenChartProps {
  timeSeries: TimeSeriesDpsPoint[];
  fights: FightSegment[];
  repTimeSeries?: RepTimeSeriesPoint[];
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
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;

  // Find the DPS point (from the first line)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dpsPoint = payload.find((p: any) => p.dataKey === "dps")
    ?.payload as TimeSeriesDpsPoint;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const repPoint = payload.find((p: any) => p.dataKey === "repsPerSecond")
    ?.payload as RepTimeSeriesPoint;

  if (!dpsPoint && !repPoint) return null;

  const point = dpsPoint || repPoint;

  return (
    <div className="bg-overlay border border-[#00d4ff40] px-3 py-2 rounded-sm font-mono text-xs backdrop-blur">
      <p className="text-text-secondary mb-1">{formatTime(point.timestamp)}</p>
      {dpsPoint && (
        <p className="text-status-kill font-bold">
          DPS IN:{" "}
          {dpsPoint.dps.toLocaleString(undefined, { maximumFractionDigits: 1 })}
        </p>
      )}
      {repPoint && (
        <p className="text-text-success font-bold">
          REPS IN:{" "}
          {repPoint.repsPerSecond.toLocaleString(undefined, {
            maximumFractionDigits: 1,
          })}
        </p>
      )}
      {dpsPoint && (
        <p className="text-text-muted">Fight {dpsPoint.fightIndex + 1}</p>
      )}
    </div>
  );
}

export default function DpsTakenChart({
  timeSeries,
  fights,
  repTimeSeries,
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
  const data: Array<{
    timestampMs: number;
    timeLabel: string;
    timestamp: Date;
    dps: number;
    fightIndex: number;
    repsPerSecond?: number;
  }> = timeSeries.map((point) => ({
    ...point,
    timestampMs: point.timestamp.getTime(),
    timeLabel: formatTime(point.timestamp),
  }));

  // Merge rep time series into data if available
  if (repTimeSeries && repTimeSeries.length > 0) {
    // Build rep map with carry-forward logic
    const sortedReps = repTimeSeries
      .map((p) => ({ ts: p.timestamp.getTime(), rps: p.repsPerSecond }))
      .sort((a, b) => a.ts - b.ts);

    // For each damage point, find the most recent rep value
    let repIdx = 0;

    for (const point of data) {
      // Find the last rep entry <= this timestamp
      while (
        repIdx < sortedReps.length - 1 &&
        sortedReps[repIdx + 1].ts <= point.timestampMs
      ) {
        repIdx++;
      }

      if (
        repIdx < sortedReps.length &&
        sortedReps[repIdx].ts <= point.timestampMs
      ) {
        point.repsPerSecond = sortedReps[repIdx].rps;
      }
    }
  }

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
          {repTimeSeries && repTimeSeries.length > 0 && (
            <Line
              type="monotone"
              dataKey="repsPerSecond"
              stroke="#66cc66"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={false}
              activeDot={{ r: 3, fill: "#66cc66" }}
              animationDuration={600}
              animationEasing="ease-out"
            />
          )}
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
