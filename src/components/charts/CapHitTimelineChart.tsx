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
  Legend,
  ResponsiveContainer,
} from "recharts";
import { analyzeCapPressure } from "@/lib/analysis/capAnalysis";
import type { LogEntry } from "@/lib/types";

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

// Incoming: orange-red palette. Outgoing: green palette. Dry hit = darker shade.
function barColor(pt: HitPoint): string {
  if (pt.direction === "in") return pt.gjAmount === 0 ? "#7c2d12" : "#c2410c";
  return pt.gjAmount === 0 ? "#14532d" : "#16a34a";
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload as HitPoint;
  const isIn = pt.direction === "in";
  return (
    <div className="bg-overlay border border-[#00d4ff40] px-3 py-2 rounded-sm font-mono text-xs backdrop-blur">
      <p className="text-text-secondary mb-1">{formatTime(pt.timestampMs)}</p>
      {pt.gjAmount === 0 ? (
        <p
          className="font-bold"
          style={{ color: isIn ? "#7c2d12" : "#14532d" }}
        >
          DRY HIT — 0 GJ
        </p>
      ) : (
        <p
          className="font-bold"
          style={{ color: isIn ? "#c2410c" : "#16a34a" }}
        >
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

  // Container width tracked via ResponsiveContainer onResize — used for
  // computing how many pixels correspond to 1 second at the current zoom.
  const [containerWidth, setContainerWidth] = useState(800);
  const handleResize = useCallback((width: number) => {
    setContainerWidth(width);
  }, []);

  // Brush window (index-based). Default: first 60 bars.
  const [brushStart, setBrushStart] = useState(0);
  const [brushEnd, setBrushEnd] = useState(
    Math.min(59, Math.max(0, data.length - 1)),
  );

  const handleBrushChange = useCallback(
    ({ startIndex, endIndex }: { startIndex?: number; endIndex?: number }) => {
      if (startIndex != null) setBrushStart(startIndex);
      if (endIndex != null) setBrushEnd(endIndex);
    },
    [],
  );

  // Clamp brush bounds to current data length — guards against stale state
  // after a new log is loaded without resetting brush manually.
  const safeStart = Math.min(brushStart, Math.max(0, data.length - 1));
  const safeEnd = Math.min(brushEnd, Math.max(0, data.length - 1));

  // Bar width = 1 second expressed in pixels at the current zoom level.
  // usableWidth ≈ container minus YAxis (56 px) and right margin (8 px).
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

  return (
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
          tickFormatter={(ts: number) => formatTime(ts)}
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
        <Legend
          wrapperStyle={{
            fontSize: 10,
            fontFamily: "JetBrains Mono, monospace",
          }}
          formatter={(value) =>
            value === "gjAmount"
              ? [
                  <span key="in" style={{ color: "#c2410c" }}>
                    incoming
                  </span>,
                  " / ",
                  <span key="out" style={{ color: "#16a34a" }}>
                    outgoing
                  </span>,
                ]
              : value
          }
        />
        <Bar
          dataKey="gjAmount"
          barSize={barSize}
          minPointSize={2}
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
        >
          {data.map((pt, idx) => (
            <Cell key={`cell-${idx}`} fill={barColor(pt)} />
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
  );
}
