"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Brush,
} from "recharts";
import type {
  DamageDealtTimeSeries,
  DamageDealtPoint,
  TackleWindow,
} from "@/lib/analysis/damageDealt";

interface DamageDealtChartProps {
  series: DamageDealtTimeSeries;
  zoomedWindow?: { start: Date; end: Date };
  excludeDrones?: boolean;
  onRangeSelect?: (start: Date, end: Date) => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function isInTackleWindow(
  ts: number,
  windows: TackleWindow[],
): TackleWindow | null {
  return (
    windows.find((w) => ts >= w.start.getTime() && ts <= w.end.getTime()) ??
    null
  );
}

export function resolveBrushRange(
  data: Array<{ timestamp: Date }>,
  startIndex?: number,
  endIndex?: number,
): { start: Date; end: Date } | null {
  if (!data.length || startIndex === undefined || endIndex === undefined) {
    return null;
  }

  const lastIndex = data.length - 1;
  const clampedStart = Math.max(0, Math.min(startIndex, lastIndex));
  const clampedEnd = Math.max(0, Math.min(endIndex, lastIndex));
  const safeStart = Math.min(clampedStart, clampedEnd);
  const safeEnd = Math.max(clampedStart, clampedEnd);
  const start = data[safeStart]?.timestamp;
  const end = data[safeEnd]?.timestamp;

  if (!start || !end) return null;

  return { start, end };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, tackleWindows }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as DamageDealtPoint & {
    timestampMs: number;
  };
  if (!point) return null;
  const tackleWindow = isInTackleWindow(point.timestampMs, tackleWindows ?? []);
  return (
    <div className="bg-overlay border border-[#00d4ff40] px-3 py-2 rounded-sm font-mono text-xs backdrop-blur space-y-1">
      <p className="text-text-secondary">{formatTime(point.timestamp)}</p>
      <p className="text-[#00d4ff] font-bold">
        DPS: {point.dps.toLocaleString(undefined, { maximumFractionDigits: 1 })}
      </p>
      <p className="text-[#cc0000]">Bad Hit: {point.badHitPct.toFixed(1)}%</p>
      {tackleWindow && (
        <>
          <p className="text-[#4488ff] font-bold">TACKLED</p>
          {tackleWindow.targetShips && tackleWindow.targetShips.size > 0 && (
            <p className="text-[#4488ff] text-xs">
              {Array.from(tackleWindow.targetShips).join(", ")}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function DamageDealtChart({
  series,
  zoomedWindow,
  excludeDrones,
  onRangeSelect,
}: DamageDealtChartProps) {
  const { points, tackleWindows } = series;

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted font-mono text-xs">
        NO DATA
      </div>
    );
  }

  // Filter to zoomed window if provided
  const visiblePoints = zoomedWindow
    ? points.filter((p) => {
        const t = p.timestamp.getTime();
        return (
          t >= zoomedWindow.start.getTime() && t <= zoomedWindow.end.getTime()
        );
      })
    : points;

  // Expand window slightly so chart doesn't look empty if only 1 point is visible
  const displayPoints = visiblePoints.length > 0 ? visiblePoints : points;

  const data = displayPoints.map((pt) => ({
    ...pt,
    timestampMs: pt.timestamp.getTime(),
  }));

  const handleBrushChange = (range?: {
    startIndex?: number;
    endIndex?: number;
  }) => {
    if (!onRangeSelect) return;

    const resolved = resolveBrushRange(
      data,
      range?.startIndex,
      range?.endIndex,
    );

    if (resolved) {
      onRangeSelect(resolved.start, resolved.end);
    }
  };

  const domainMin = data[0]?.timestampMs ?? 0;
  const domainMax = data[data.length - 1]?.timestampMs ?? 0;

  // Clip tackle windows to the visible domain
  const visibleTackleWindows = tackleWindows
    .map((w) => ({
      x1: Math.max(w.start.getTime(), domainMin),
      x2: Math.min(w.end.getTime(), domainMax),
    }))
    .filter((w) => w.x1 < w.x2);

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={data}
          margin={{ top: 4, right: 48, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1a254060"
            vertical={false}
          />
          <XAxis
            dataKey="timestampMs"
            type="number"
            domain={[domainMin, domainMax]}
            tick={{
              fill: "#8892a4",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
            }}
            axisLine={{ stroke: "#1a2540" }}
            tickLine={false}
            tickFormatter={(ts: number) => formatTime(new Date(ts))}
          />
          {/* Left Y-axis: DPS */}
          <YAxis
            yAxisId="dps"
            tick={{
              fill: "#00d4ff",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
            }}
            axisLine={false}
            tickLine={false}
            width={56}
            label={{
              value: "DPS",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              fill: "#00d4ff",
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
            }}
          />
          {/* Right Y-axis: bad hit % */}
          <YAxis
            yAxisId="pct"
            orientation="right"
            domain={[0, 100]}
            tick={{
              fill: "#cc0000",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
            }}
            axisLine={false}
            tickLine={false}
            width={36}
            tickFormatter={(v: number) => `${v}%`}
            label={{
              value: "BAD HIT %",
              angle: 90,
              position: "insideRight",
              offset: 10,
              fill: "#cc0000",
              fontSize: 9,
              fontFamily: "JetBrains Mono, monospace",
            }}
          />
          <Tooltip content={<CustomTooltip tackleWindows={tackleWindows} />} />

          {/* Tackle windows as blue reference areas */}
          {visibleTackleWindows.map((w, i) => (
            <ReferenceArea
              key={i}
              yAxisId="dps"
              x1={w.x1}
              x2={w.x2}
              fill="#0044cc"
              fillOpacity={0.2}
              strokeOpacity={0}
            />
          ))}

          {/* Bad hit % bars */}
          <Bar
            yAxisId="pct"
            dataKey="badHitPct"
            fill="#cc0000"
            fillOpacity={0.4}
            maxBarSize={12}
            animationDuration={600}
            animationEasing="ease-out"
            name="Bad Hit %"
          />

          {/* DPS line */}
          <Line
            yAxisId="dps"
            type="monotone"
            dataKey="dps"
            stroke="#00d4ff"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: "#00d4ff" }}
            name="DPS"
            animationDuration={600}
            animationEasing="ease-out"
          />
          <Brush
            dataKey="timestampMs"
            height={32}
            stroke="#00d4ff"
            travellerWidth={8}
            onChange={handleBrushChange}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="text-text-muted font-mono text-xs">
        Cyan line = outgoing DPS (10 s rolling,{" "}
        {excludeDrones ? "weapons only" : "all damage"}) · Red bars = bad-hit %
        (Glances Off / Grazes) · Blue shading = tackle window
      </p>
    </div>
  );
}
