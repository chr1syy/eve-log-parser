"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
};

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
  return (
    <div className="bg-overlay border border-[#00d4ff40] px-3 py-2 rounded-sm font-mono text-xs backdrop-blur">
      <p className="text-text-secondary mb-1">{formatTime(pt.timestampMs)}</p>
      {pt.gjAmount === 0 ? (
        <p className="text-[#7c2d12] font-bold">DRY HIT — 0 GJ</p>
      ) : (
        <p className="text-[#c2410c] font-bold">
          {pt.gjAmount.toLocaleString()} GJ neutralized
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
    const { neutReceivedTimeline } = analyzeCapPressure(entries);
    return neutReceivedTimeline.map((pt) => ({
      timestampMs: pt.timestamp.getTime(),
      gjAmount: pt.gjAmount,
      module: pt.module,
      shipType: pt.shipType,
    }));
  }, [entries]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-text-muted font-mono text-xs uppercase tracking-widest">
        NO INCOMING NEUT HITS RECORDED
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
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
        <Bar
          dataKey="gjAmount"
          maxBarSize={6}
          minPointSize={2}
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
        >
          {data.map((pt, idx) => (
            <Cell
              key={`cell-${idx}`}
              fill={pt.gjAmount === 0 ? "#7c2d12" : "#c2410c"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
