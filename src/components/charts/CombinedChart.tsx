"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { LogEntry } from "@/lib/types";
import type { FightSegment } from "@/lib/analysis/damageTaken";
import type { TackleWindow } from "@/lib/analysis/damageDealt";
import { generateDamageDealtTimeSeries } from "@/lib/analysis/damageDealt";
import { analyzeDamageTaken } from "@/lib/analysis/damageTaken";
import { analyzeReps } from "@/lib/analysis/repAnalysis";
import { analyzeCapPressure } from "@/lib/analysis/capAnalysis";
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
  ReferenceLine,
  Brush,
} from "recharts";

export interface ActiveToggles {
  damageOut: boolean;
  damageIn: boolean;
  capPressure: boolean;
  reps: boolean;
}

export interface CombinedChartProps {
  entries: LogEntry[];
  activeToggles: ActiveToggles;
  onBrushChange?: (start: Date | null, end: Date | null) => void;
}

// Internal — numeric timestamp so Recharts scale="time" works cleanly
export type UnifiedPoint = {
  timestamp: number; // ms since epoch
  dpsOut?: number;
  dpsIn?: number;
  repsPerSec?: number;
  capGj?: number;
};

export type CombinedChartData = {
  points: UnifiedPoint[];
  fights: FightSegment[];
  tackleWindows: TackleWindow[];
};

export function useCombinedChartData(entries: LogEntry[]): CombinedChartData {
  return useMemo(() => {
    const map = new Map<number, UnifiedPoint>();

    // Damage Out
    const dealtSeries = generateDamageDealtTimeSeries(entries);
    for (const pt of dealtSeries.points) {
      const ts = pt.timestamp.getTime();
      const existing = map.get(ts) ?? { timestamp: ts };
      map.set(ts, { ...existing, dpsOut: pt.dps });
    }

    // Damage In
    const takenAnalysis = analyzeDamageTaken(entries);
    for (const pt of takenAnalysis.dpsTimeSeries) {
      const ts = pt.timestamp.getTime();
      const existing = map.get(ts) ?? { timestamp: ts };
      map.set(ts, { ...existing, dpsIn: pt.dps });
    }

    // Reps
    const repResult = analyzeReps(entries);
    for (const pt of repResult.incomingRepTimeSeries) {
      const ts = pt.timestamp.getTime();
      const existing = map.get(ts) ?? { timestamp: ts };
      map.set(ts, { ...existing, repsPerSec: pt.repsPerSecond });
    }

    // Cap Pressure — bucket into 10-second windows
    const capResult = analyzeCapPressure(entries);
    for (const pt of capResult.neutReceivedTimeline) {
      const bucket = Math.floor(pt.timestamp.getTime() / 10_000) * 10_000;
      const existing = map.get(bucket) ?? { timestamp: bucket };
      map.set(bucket, {
        ...existing,
        capGj: (existing.capGj ?? 0) + pt.gjAmount,
      });
    }

    const points = Array.from(map.values()).sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    return {
      points,
      fights: takenAnalysis.fights,
      tackleWindows: dealtSeries.tackleWindows,
    };
  }, [entries]);
}

export function formatTime(date: Date): string {
  if (isNaN(date.getTime())) return "--:--:--";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// Placeholder — chart rendering added in Task 1b
interface TooltipEntry {
  dataKey?: string;
  value?: number;
  payload?: UnifiedPoint;
}

function CombinedTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
}) {
  if (!active || !payload?.length) return null;
  const ts = payload[0]?.payload?.timestamp;
  return (
    <div className="bg-[#1a1a1a] border border-[#444] px-3 py-2 rounded-sm font-mono text-xs">
      {ts != null && (
        <p className="text-[#888] mb-1">{formatTime(new Date(ts))}</p>
      )}
      {payload.map((entry) => {
        if (entry.value == null) return null;
        const colorMap: Record<string, string> = {
          dpsOut: "#00d4ff",
          dpsIn: "#e53e3e",
          repsPerSec: "#66cc66",
          capGj: "#e58c00",
        };
        const labelMap: Record<string, string> = {
          dpsOut: "Damage Out",
          dpsIn: "Damage In",
          repsPerSec: "Reps/s",
          capGj: "Cap Drain",
        };
        const unitMap: Record<string, string> = {
          dpsOut: " DPS",
          dpsIn: " DPS",
          repsPerSec: " /s",
          capGj: " GJ",
        };
        const key = entry.dataKey ?? "";
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
    </div>
  );
}

export default function CombinedChart({
  entries,
  activeToggles,
  onBrushChange,
}: CombinedChartProps) {
  const {
    points: unifiedData,
    fights,
    tackleWindows,
  } = useCombinedChartData(entries);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          data={unifiedData}
          margin={{ top: 10, right: 60, left: 10, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(ts: number) => formatTime(new Date(ts))}
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
              fill: "#555",
              fontSize: 10,
            }}
          />
          <YAxis
            yAxisId="cap"
            orientation="right"
            tickFormatter={(v: number) => `${Math.round(v)}`}
            tick={{ fill: "#888", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            label={{
              value: "GJ",
              angle: 90,
              position: "insideRight",
              fill: "#555",
              fontSize: 10,
            }}
          />
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
                fill: "#555",
                fontSize: 10,
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
          {activeToggles.capPressure && (
            <Bar
              yAxisId="cap"
              dataKey="capGj"
              fill="#e58c00"
              name="Cap Pressure (GJ)"
              opacity={0.75}
              maxBarSize={8}
              isAnimationActive={false}
            />
          )}

          <Brush
            dataKey="timestamp"
            height={28}
            stroke="#e53e3e"
            fill="#0d0d0d"
            travellerWidth={8}
            tickFormatter={(ts: number) => formatTime(new Date(ts))}
            onChange={handleBrushChange}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
