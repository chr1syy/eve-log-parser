"use client";

import { useMemo, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  Brush,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { analyzeCapPressure } from "@/lib/analysis/capAnalysis";
import type { LogEntry } from "@/lib/types";
import { formatLogTime } from "@/lib/utils";

interface CapHitTimelineChartProps {
  entries: LogEntry[];
}

type HitPoint = {
  timestampMs: number;
  gjAmount: number;
  module: string;
  shipType: string;
  direction: "in" | "out";
};

// Distinct palette for outgoing neut targets — avoids orange-red tones
// that would be confused with incoming hits.
const OUTGOING_PALETTE = [
  "#00d4ff", // cyan
  "#7cfc00", // green
  "#ff69b4", // pink
  "#ffd700", // gold
  "#9370db", // purple
  "#20b2aa", // teal
  "#a78bfa", // violet
  "#34d399", // emerald
];

const INCOMING_COLOR = "#c2410c";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload as HitPoint;
  const isIn = pt.direction === "in";
  const color = payload[0].fill as string;
  return (
    <div className="bg-overlay border border-[#00d4ff40] px-3 py-2 rounded-sm font-mono text-xs backdrop-blur">
      <p className="text-text-secondary mb-1">{formatLogTime(pt.timestampMs)}</p>
      {pt.gjAmount === 0 ? (
        <p className="font-bold" style={{ color }}>
          DRY HIT — 0 GJ
        </p>
      ) : (
        <p className="font-bold" style={{ color }}>
          {pt.gjAmount.toLocaleString()} GJ {isIn ? "neutralized" : "dealt"}
        </p>
      )}
      <p className="text-text-muted">
        [{pt.shipType}] — {pt.module}
      </p>
    </div>
  );
}

export default function CapHitTimelineChart({
  entries,
}: CapHitTimelineChartProps) {
  const data = useMemo<HitPoint[]>(() => {
    const { neutReceivedTimeline, neutDealtTimeline } =
      analyzeCapPressure(entries);

    const incoming: HitPoint[] = neutReceivedTimeline.map((pt) => ({
      timestampMs: pt.timestamp.getTime(),
      gjAmount: pt.gjAmount,
      module: pt.module,
      shipType: pt.shipType,
      direction: "in",
    }));

    const outgoing: HitPoint[] = neutDealtTimeline.map((pt) => ({
      timestampMs: pt.timestamp.getTime(),
      gjAmount: pt.gjAmount,
      module: pt.module,
      shipType: pt.shipType,
      direction: "out",
    }));

    return [...incoming, ...outgoing].sort(
      (a, b) => a.timestampMs - b.timestampMs,
    );
  }, [entries]);

  // Assign a stable colour to each unique outgoing ship type.
  const outgoingColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let i = 0;
    for (const pt of data) {
      if (pt.direction === "out" && !map.has(pt.shipType)) {
        map.set(pt.shipType, OUTGOING_PALETTE[i % OUTGOING_PALETTE.length]);
        i++;
      }
    }
    return map;
  }, [data]);

  // Container width tracked via ResponsiveContainer onResize.
  const [containerWidth, setContainerWidth] = useState(800);
  const handleResize = useCallback((width: number) => {
    setContainerWidth(width);
  }, []);

  // Brush window (index-based). Default: first 60 bars.
  const [brushStart, setBrushStart] = useState(0);
  const [brushEnd, setBrushEnd] = useState(
    Math.min(59, Math.max(0, data.length - 1)),
  );

  const defaultBrushEnd = useMemo(
    () => Math.min(59, Math.max(0, data.length - 1)),
    [data.length],
  );
  const effectiveBrushEnd =
    brushStart === 0 && brushEnd === 0 ? defaultBrushEnd : brushEnd;

  const handleBrushChange = useCallback(
    ({ startIndex, endIndex }: { startIndex?: number; endIndex?: number }) => {
      if (startIndex != null) setBrushStart(startIndex);
      if (endIndex != null) setBrushEnd(endIndex);
    },
    [],
  );

  // Clamp brush bounds to current data length.
  const safeStart = Math.min(brushStart, Math.max(0, data.length - 1));
  const safeEnd = Math.min(effectiveBrushEnd, Math.max(0, data.length - 1));

  // Bar width = 1 second expressed in pixels at the current zoom level.
  const barSize = useMemo(() => {
    const visible = data.slice(safeStart, safeEnd + 1);
    if (visible.length < 2) return 20;
    const spanMs =
      visible[visible.length - 1].timestampMs - visible[0].timestampMs;
    if (spanMs <= 0) return 20;
    const usableWidth = Math.max(100, containerWidth - 64);
    return Math.max(2, Math.round((usableWidth * 1000) / spanMs));
  }, [data, safeStart, safeEnd, containerWidth]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-text-muted font-mono text-xs uppercase tracking-widest">
        NO NEUT HITS RECORDED
      </div>
    );
  }

  const hasIncoming = data.some((d) => d.direction === "in");

  return (
    <div>
      {/* Custom legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 pb-2 font-mono text-xs">
        {hasIncoming && (
          <span style={{ color: INCOMING_COLOR }}>▮ incoming</span>
        )}
        {[...outgoingColorMap.entries()].map(([shipType, color]) => (
          <span key={shipType} style={{ color }}>
            ▮ {shipType}
          </span>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={260} onResize={handleResize}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
            tickFormatter={(ts: number) => formatLogTime(ts)}
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
            label={{
              value: "GJ",
              angle: -90,
              position: "insideLeft",
              fill: "#8892a4",
              fontSize: 10,
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="gjAmount"
            barSize={barSize}
            minPointSize={2}
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          >
            {data.map((pt, idx) => (
              <Cell
                key={`cell-${idx}`}
                fill={
                  pt.direction === "in"
                    ? INCOMING_COLOR
                    : (outgoingColorMap.get(pt.shipType) ??
                      OUTGOING_PALETTE[0])
                }
              />
            ))}
          </Bar>
          <Brush
            dataKey="timestampMs"
            height={28}
            stroke="#e53e3e"
            fill="#0d0d0d"
            travellerWidth={8}
            startIndex={safeStart}
            endIndex={safeEnd}
            onChange={handleBrushChange}
            tickFormatter={(ts: number) => formatTime(ts)}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
