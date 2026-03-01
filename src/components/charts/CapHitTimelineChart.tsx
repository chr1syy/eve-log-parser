"use client";

import { useMemo } from "react";
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

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-text-muted font-mono text-xs uppercase tracking-widest">
        NO NEUT HITS RECORDED
      </div>
    );
  }

  // Default to a window of 60 bars so dense logs open readable.
  const defaultEndIndex = Math.min(data.length - 1, 59);

  return (
    <ResponsiveContainer width="100%" height={260}>
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
          wrapperStyle={{ fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
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
          maxBarSize={6}
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
          startIndex={0}
          endIndex={defaultEndIndex}
          tickFormatter={(ts: number) => formatTime(ts)}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
