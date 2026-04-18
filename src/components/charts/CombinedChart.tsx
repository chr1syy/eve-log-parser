"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import type { LogEntry, TrackingSeries } from "@/lib/types";
import type { FightSegment } from "@/lib/analysis/damageTaken";
import {
  computeRollingTracking,
  isTrackingEligibleTurretShot,
} from "@/lib/analysis/tracking";
import type { TackleWindow } from "@/lib/analysis/damageDealt";
import { generateDamageDealtTimeSeries } from "@/lib/analysis/damageDealt";
import { analyzeDamageTaken } from "@/lib/analysis/damageTaken";
import { analyzeReps } from "@/lib/analysis/repAnalysis";
import { formatLogTime } from "@/lib/utils";
import { BRUSH_STYLE } from "@/lib/chartConstants";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Brush,
} from "recharts";

export interface ActiveToggles {
  damageOut: boolean;
  damageIn: boolean;
  capPressure: boolean;
  reps: boolean;
  tracking: boolean;
}

export interface CombinedChartProps {
  entries: LogEntry[];
  activeToggles: ActiveToggles;
  onBrushChange?: (start: Date | null, end: Date | null) => void;
  brushResetKey?: number;
  initialBrushWindow?: { start: Date; end: Date } | null;
}

// Internal — numeric timestamp so Recharts scale="time" works cleanly
export type UnifiedPoint = {
  timestamp: number; // ms since epoch
  dpsOut?: number;
  dpsIn?: number;
  repsPerSec?: number;
  trackingQuality?: number | null;
  trackingHigh?: number | null;
  trackingMid?: number | null;
  trackingLow?: number | null;
};

export type CombinedChartData = {
  points: UnifiedPoint[];
  fights: FightSegment[];
  tackleWindows: TackleWindow[];
  hasTurretWeapons: boolean;
};

const UNIFIED_BUCKET_MS = 10_000;

// Merge a TrackingSeries into UnifiedPoints using interpolation + tier-bridging.
// Mirrors buildEnrichedTrackingData from DamageDealtChart, adapted for UnifiedPoint
// (which uses .timestamp: number directly instead of .timestampMs).
function applyTrackingTiers(
  points: UnifiedPoint[],
  trackingSeries: TrackingSeries[],
): UnifiedPoint[] {
  if (points.length === 0 || trackingSeries.length === 0) return points;

  const ts = trackingSeries.slice().sort((a, b) => a.timestamp - b.timestamp);
  const MAX_FILL_MS = 60_000;

  const getTier = (tq: number): "high" | "mid" | "low" =>
    tq >= 1.0 ? "high" : tq >= 0.7 ? "mid" : "low";

  // Pass 1: interpolate tracking quality at each point's timestamp
  let i = 0;
  const tqs: (number | null)[] = points.map((pt) => {
    const tms = pt.timestamp;
    while (i < ts.length && ts[i].timestamp <= tms) i++;
    const prev = i > 0 ? ts[i - 1] : null;
    const next = i < ts.length ? ts[i] : null;

    let tq: number | null = null;
    if (prev && next) {
      const gap = next.timestamp - prev.timestamp;
      if (gap <= MAX_FILL_MS) {
        const frac = (tms - prev.timestamp) / (next.timestamp - prev.timestamp);
        tq =
          prev.trackingQuality +
          frac * (next.trackingQuality - prev.trackingQuality);
      } else if (Math.abs(tms - prev.timestamp) <= MAX_FILL_MS) {
        tq = prev.trackingQuality;
      } else if (Math.abs(next.timestamp - tms) <= MAX_FILL_MS) {
        tq = next.trackingQuality;
      }
    } else if (prev && Math.abs(tms - prev.timestamp) <= MAX_FILL_MS) {
      tq = prev.trackingQuality;
    } else if (next && Math.abs(next.timestamp - tms) <= MAX_FILL_MS) {
      tq = next.trackingQuality;
    }
    return tq;
  });

  // Pass 2: forward sweep — record the previous non-null tier at each index
  const prevTiers: ("high" | "mid" | "low" | null)[] = new Array(
    tqs.length,
  ).fill(null);
  let lastTier: "high" | "mid" | "low" | null = null;
  for (let j = 0; j < tqs.length; j++) {
    prevTiers[j] = lastTier;
    if (tqs[j] !== null) lastTier = getTier(tqs[j]!);
  }

  // Pass 3: assign tier keys with bridge-on-arrival to eliminate visual gaps
  return points.map((pt, j) => {
    const tq = tqs[j];
    if (tq === null) {
      return {
        ...pt,
        trackingQuality: null,
        trackingHigh: null,
        trackingMid: null,
        trackingLow: null,
      };
    }

    const currTier = getTier(tq);
    let trackingHigh: number | null = currTier === "high" ? tq : null;
    let trackingMid: number | null = currTier === "mid" ? tq : null;
    let trackingLow: number | null = currTier === "low" ? tq : null;

    const prevT = prevTiers[j];
    if (prevT !== null && prevT !== currTier) {
      if (prevT === "high") trackingHigh = tq;
      else if (prevT === "mid") trackingMid = tq;
      else trackingLow = tq;
    }

    return { ...pt, trackingQuality: tq, trackingHigh, trackingMid, trackingLow };
  });
}

export function useCombinedChartData(entries: LogEntry[]): CombinedChartData {
  return useMemo(() => {
    const map = new Map<number, UnifiedPoint>();
    const toBucket = (ts: number) =>
      Math.floor(ts / UNIFIED_BUCKET_MS) * UNIFIED_BUCKET_MS;

    // Damage Out
    const dealtSeries = generateDamageDealtTimeSeries(entries);
    for (const pt of dealtSeries.points) {
      const ts = toBucket(pt.timestamp.getTime());
      const existing = map.get(ts) ?? { timestamp: ts };
      map.set(ts, {
        ...existing,
        dpsOut: Math.max(existing.dpsOut ?? 0, pt.dps),
      });
    }

    // Damage In
    const takenAnalysis = analyzeDamageTaken(entries);
    for (const pt of takenAnalysis.dpsTimeSeries) {
      const ts = toBucket(pt.timestamp.getTime());
      const existing = map.get(ts) ?? { timestamp: ts };
      map.set(ts, {
        ...existing,
        dpsIn: Math.max(existing.dpsIn ?? 0, pt.dps),
      });
    }

    // Reps
    const repResult = analyzeReps(entries);
    for (const pt of repResult.incomingRepTimeSeries) {
      const ts = toBucket(pt.timestamp.getTime());
      const existing = map.get(ts) ?? { timestamp: ts };
      map.set(ts, {
        ...existing,
        repsPerSec: Math.max(existing.repsPerSec ?? 0, pt.repsPerSecond),
      });
    }

    const sortedBuckets = Array.from(map.keys()).sort((a, b) => a - b);
    const firstTs = sortedBuckets[0];
    const lastTs = sortedBuckets[sortedBuckets.length - 1];
    const sortedPoints: UnifiedPoint[] = [];

    if (firstTs != null && lastTs != null) {
      for (let ts = firstTs; ts <= lastTs; ts += UNIFIED_BUCKET_MS) {
        const existing = map.get(ts);
        sortedPoints.push({
          timestamp: ts,
          dpsOut: existing?.dpsOut ?? 0,
          dpsIn: existing?.dpsIn ?? 0,
          repsPerSec: existing?.repsPerSec ?? 0,
        });
      }
    }

    // Turret tracking quality overlay
    const hasTurretWeapons = entries.some(isTrackingEligibleTurretShot);
    const points = hasTurretWeapons
      ? applyTrackingTiers(sortedPoints, computeRollingTracking(entries))
      : sortedPoints;

    return {
      points,
      fights: takenAnalysis.fights,
      tackleWindows: dealtSeries.tackleWindows,
      hasTurretWeapons,
    };
  }, [entries]);
}

// Placeholder — chart rendering added in Task 1b
interface TooltipEntry {
  dataKey?: string;
  value?: number;
  payload?: UnifiedPoint;
}

const TRACKING_TIER_KEYS = new Set(["trackingHigh", "trackingMid", "trackingLow"]);

function trackingColor(tq: number): string {
  return tq >= 1.0 ? "#16a34a" : tq >= 0.7 ? "#eab308" : "#dc2626";
}

function CombinedTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
}) {
  if (!active || !payload?.length) return null;
  const pt = payload[0]?.payload;
  const ts = pt?.timestamp;

  const colorMap: Record<string, string> = {
    dpsOut: "#00d4ff",
    dpsIn: "#e53e3e",
    repsPerSec: "#66cc66",
  };
  const labelMap: Record<string, string> = {
    dpsOut: "Damage Out",
    dpsIn: "Damage In",
    repsPerSec: "Reps/s",
  };
  const unitMap: Record<string, string> = {
    dpsOut: " DPS",
    dpsIn: " DPS",
    repsPerSec: " /s",
  };

  return (
    <div className="bg-[#1a1a1a] border border-[#444] px-3 py-2 rounded-sm font-mono text-xs">
      {ts != null && (
        <p className="text-[#888] mb-1">{formatLogTime(ts)}</p>
      )}
      {payload.map((entry) => {
        if (entry.value == null) return null;
        const key = entry.dataKey ?? "";
        // Tracking tiers are deduplicated below — skip them here
        if (TRACKING_TIER_KEYS.has(key)) return null;
        const color = colorMap[key] ?? "#888";
        const label = labelMap[key] ?? key;
        const unit = unitMap[key] ?? "";
        return (
          <p key={key} style={{ color }}>
            {label}: {entry.value.toFixed(1)}
            {unit}
          </p>
        );
      })}
      {/* Show tracking quality once, derived from the point's computed value */}
      {pt?.trackingQuality != null && (
        <p style={{ color: trackingColor(pt.trackingQuality) }}>
          Tracking: {pt.trackingQuality.toFixed(2)}
        </p>
      )}
    </div>
  );
}

const BRUSH_PAD_MS = 15_000; // 15 s padding around clicked target range

export default function CombinedChart({
  entries,
  activeToggles,
  onBrushChange,
  brushResetKey,
  initialBrushWindow,
}: CombinedChartProps) {
  const {
    points: unifiedData,
    fights,
    tackleWindows,
    hasTurretWeapons,
  } = useCombinedChartData(entries);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Compute brush startIndex/endIndex when an initial window is provided
  const brushIndices = useMemo(() => {
    if (!initialBrushWindow || unifiedData.length === 0) return null;
    const startTs = initialBrushWindow.start.getTime() - BRUSH_PAD_MS;
    const endTs = initialBrushWindow.end.getTime() + BRUSH_PAD_MS;
    let startIdx = 0;
    let endIdx = unifiedData.length - 1;
    for (let i = 0; i < unifiedData.length; i++) {
      if (unifiedData[i].timestamp <= startTs) startIdx = i;
      if (unifiedData[i].timestamp <= endTs) endIdx = i;
    }
    return { startIndex: startIdx, endIndex: endIdx };
  }, [initialBrushWindow, unifiedData]);

  // Debounced brush change handler
  const handleBrushChange = useCallback(
    (brushData: { startIndex?: number; endIndex?: number }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const { startIndex, endIndex } = brushData;
        if (startIndex == null || endIndex == null) return;
        const start = unifiedData[startIndex]?.timestamp;
        const end = unifiedData[endIndex]?.timestamp;
        if (start == null || end == null) return;
        const isFullRange =
          startIndex === 0 && endIndex === unifiedData.length - 1;
        onBrushChange?.(
          isFullRange ? null : new Date(start),
          isFullRange ? null : new Date(end),
        );
      }, 300);
    },
    [unifiedData, onBrushChange],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  // MutationObserver: enforce EVE red fill on Recharts brush elements
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const applyBrushStyles = () => {
      container
        .querySelectorAll<SVGRectElement>(".recharts-brush-traveller rect")
        .forEach((el) => {
          el.style.fill = "#e53e3e";
        });
      container
        .querySelectorAll<SVGRectElement>(".recharts-brush-slide")
        .forEach((el) => {
          el.style.fill = "#e53e3e";
          el.style.fillOpacity = "0.15";
        });
    };
    applyBrushStyles();
    const observer = new MutationObserver(applyBrushStyles);
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    return () => observer.disconnect();
  }, []);

  if (unifiedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[420px] text-[#555] font-mono text-sm">
        No data available
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart
          key={brushResetKey}
          data={unifiedData}
          margin={{ top: 20, right: 80, left: 10, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(ts: number) => formatLogTime(ts)}
            tick={{ fill: "#888", fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            yAxisId="dps"
            orientation="left"
            tickFormatter={(v: number) => `${Math.round(v)}`}
            tick={{ fill: "#888", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            label={{
              value: "DPS / Rep/s",
              angle: -90,
              position: "insideLeft",
              fill: "#888",
              fontSize: 11,
            }}
          />
          {activeToggles.tracking && hasTurretWeapons && (
            <YAxis
              yAxisId="tracking"
              orientation="right"
              domain={[0, 1.5]}
              tickFormatter={(v: number) => v.toFixed(1)}
              tick={{ fill: "#16a34a", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={36}
              label={{
                value: "TRACK",
                angle: 90,
                position: "insideRight",
                offset: 28,
                fill: "#16a34a",
                fontSize: 9,
              }}
            />
          )}
          <Tooltip content={<CombinedTooltip />} />

          {/* Fight boundary lines (skip first fight) */}
          {fights.slice(1).map((fight, i) => (
            <ReferenceLine
              key={`fight-${i}`}
              yAxisId="dps"
              x={fight.start.getTime()}
              stroke="#444"
              strokeDasharray="4 4"
              label={{
                value: `Fight ${i + 2}`,
                position: "top",
                fill: "#888",
                fontSize: 11,
              }}
            />
          ))}

          {/* Tackle windows (only when damage out is active) */}
          {activeToggles.damageOut &&
            tackleWindows.map((tw, i) => (
              <ReferenceArea
                key={`tackle-${i}`}
                yAxisId="dps"
                x1={tw.start.getTime()}
                x2={tw.end.getTime()}
                fill="#1e40af"
                fillOpacity={0.15}
              />
            ))}

          {activeToggles.damageOut && (
            <Line
              yAxisId="dps"
              type="monotone"
              dataKey="dpsOut"
              stroke="#00d4ff"
              name="Damage Out"
              dot={false}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          {activeToggles.damageIn && (
            <Line
              yAxisId="dps"
              type="monotone"
              dataKey="dpsIn"
              stroke="#e53e3e"
              name="Damage In"
              dot={false}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          {activeToggles.reps && (
            <Line
              yAxisId="dps"
              type="monotone"
              dataKey="repsPerSec"
              stroke="#66cc66"
              name="Reps/s"
              dot={false}
              strokeWidth={2}
              strokeDasharray="5 5"
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          {/* Turret tracking quality — three coloured tier lines */}
          {activeToggles.tracking && hasTurretWeapons && (
            <Line
              yAxisId="tracking"
              type="monotone"
              dataKey="trackingHigh"
              stroke="#16a34a"
              name="Tracking (High)"
              dot={false}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          {activeToggles.tracking && hasTurretWeapons && (
            <Line
              yAxisId="tracking"
              type="monotone"
              dataKey="trackingMid"
              stroke="#eab308"
              name="Tracking (Mid)"
              dot={false}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          {activeToggles.tracking && hasTurretWeapons && (
            <Line
              yAxisId="tracking"
              type="monotone"
              dataKey="trackingLow"
              stroke="#dc2626"
              name="Tracking (Low)"
              dot={false}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}

          <Brush
            dataKey="timestamp"
            {...BRUSH_STYLE}
            tickFormatter={(ts: number) => formatLogTime(ts)}
            onChange={handleBrushChange}
            {...(brushIndices ?? {})}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
