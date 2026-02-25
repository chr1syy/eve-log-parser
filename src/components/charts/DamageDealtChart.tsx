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
import { useEffect, useMemo, useRef, useState } from "react";
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

  // Keep full data for the chart so Brush always operates over the entire
  // timeline. When a zoomedWindow is provided we narrow the X axis domain to
  // the requested window but still render from the full dataset. This avoids
  // the brush "jumping" behavior caused by rendering the brush against a
  // filtered (shortened) data array.
  const fullPoints = points;
  const data = useMemo(
    () =>
      fullPoints.map((pt) => ({ ...pt, timestampMs: pt.timestamp.getTime() })),
    [fullPoints],
  );

  // Filter to zoomed window if provided for other UI bits (tooltips / labels)
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

  const fullDomainMin = data[0]?.timestampMs ?? 0;
  const fullDomainMax = data[data.length - 1]?.timestampMs ?? 0;

  // If a zoomedWindow is active, use that as the visible domain. Otherwise use
  // the full data domain. Keeping `data` as the full dataset ensures the
  // Brush indexes map consistently to timestamps.
  const domainMin = zoomedWindow ? zoomedWindow.start.getTime() : fullDomainMin;
  const domainMax = zoomedWindow ? zoomedWindow.end.getTime() : fullDomainMax;

  // Compute brush indices for controlled Brush positioning when a zoomed
  // window is active. This keeps the brush handles aligned with the visible
  // domain instead of appearing to float when the X axis domain changes.
  const brushIndexRange = (() => {
    if (!zoomedWindow) return undefined;
    const startMs = zoomedWindow.start.getTime();
    const endMs = zoomedWindow.end.getTime();
    let startIndex: number | undefined = undefined;
    let endIndex: number | undefined = undefined;
    for (let i = 0; i < data.length; i++) {
      const ts = data[i].timestampMs;
      if (startIndex === undefined && ts >= startMs) startIndex = i;
      if (ts <= endMs) endIndex = i;
      if (startIndex !== undefined && ts > endMs) break;
    }
    // If no points fall within the window, clamp to nearest indices
    if (startIndex === undefined) startIndex = 0;
    if (endIndex === undefined) endIndex = data.length - 1;
    return { startIndex, endIndex };
  })();

  // timer ref for debouncing notifications to parent
  const notifyTimer = useRef<number | null>(null);

  // transient controlled indices used only to snap the Brush when a
  // programmatic zoom is requested. We render the Brush once with
  // these indices (by giving it a unique key) then clear them so the Brush
  // becomes uncontrolled and user interactions take precedence.
  const [syncIndices, setSyncIndices] = useState<
    { startIndex?: number; endIndex?: number } | undefined
  >(undefined);
  const [brushRemountKey, setBrushRemountKey] = useState<string | undefined>(
    undefined,
  );
  const lastZoomSourceRef = useRef<string | null>(null);

  useEffect(() => {
    if (!brushIndexRange) return;
    setSyncIndices(brushIndexRange);
    setBrushRemountKey(
      `${brushIndexRange.startIndex ?? 0}-${brushIndexRange.endIndex ?? 0}-${Date.now()}`,
    );
    // clear syncIndices after a single tick so Brush becomes uncontrolled
    const id = window.setTimeout(() => setSyncIndices(undefined), 80);
    return () => window.clearTimeout(id);
  }, [brushIndexRange?.startIndex, brushIndexRange?.endIndex]);

  // When zoom is cleared (zoomedWindow becomes undefined) we also force a
  // transient remount of the Brush set to the full range so the traveller
  // visually resets to the full domain. Skip this if the last zoom source
  // was the brush itself to avoid fighting user interaction.
  useEffect(() => {
    if (zoomedWindow) return;
    if (lastZoomSourceRef.current === "brush") {
      lastZoomSourceRef.current = null;
      return;
    }
    // ensure data length is available
    const lastIdx = Math.max(0, data.length - 1);
    setSyncIndices({ startIndex: 0, endIndex: lastIdx });
    setBrushRemountKey(`clear-${Date.now()}`);
    const id = window.setTimeout(() => setSyncIndices(undefined), 80);
    return () => window.clearTimeout(id);
  }, [zoomedWindow, data.length]);

  // Clip tackle windows to the visible domain
  const visibleTackleWindows = useMemo(
    () =>
      tackleWindows
        .map((w) => ({
          x1: Math.max(w.start.getTime(), domainMin),
          x2: Math.min(w.end.getTime(), domainMax),
        }))
        .filter((w) => w.x1 < w.x2),
    [tackleWindows, domainMin, domainMax],
  );

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
            isAnimationActive={false}
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
            isAnimationActive={false}
          />
          {onRangeSelect && (
            <Brush
              key={syncIndices ? brushRemountKey : undefined}
              dataKey="timestampMs"
              height={28}
              stroke="#00707f"
              strokeOpacity={0.75}
              travellerWidth={6}
              fill="#00707f"
              fillOpacity={0.14}
              // Update internal UI state immediately while dragging; notify
              // parent after a short debounce so we don't fight pointer
              // interactions.
              onChange={(r) => {
                // Don't update parent/zoom while dragging. Debounce and mark
                // the last zoom source so programmatic sync doesn't remount
                // the Brush while the user is interacting.
                lastZoomSourceRef.current = "brush";
                if (notifyTimer.current)
                  window.clearTimeout(notifyTimer.current);
                notifyTimer.current = window.setTimeout(() => {
                  handleBrushChange(r);
                  notifyTimer.current = null;
                }, 700);
              }}
              // When a transient sync is present we pass start/end indices once
              // so the Brush snaps to the programmatic window. After a short
              // timeout syncIndices is cleared and the Brush becomes
              // uncontrolled again, allowing smooth user dragging.
              startIndex={syncIndices ? syncIndices.startIndex : undefined}
              endIndex={syncIndices ? syncIndices.endIndex : undefined}
            />
          )}
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
