"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CapTimelineChartProps {
  timeline: {
    timestamp: Date;
    gjAmount: number;
    module: string;
    shipType: string;
  }[];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// Module color map - red tones for neuts (up to 5 distinct colors)
const moduleColors: Record<string, string> = {
  "Heavy Energy Neutralizer II": "#dc2626", // red-600
  "Heavy Energy Neutralizer I": "#ef4444", // red-500
  "Medium Energy Neutralizer II": "#f87171", // red-400
  "Medium Energy Neutralizer I": "#fca5a5", // red-300
  "Light Energy Neutralizer II": "#fecaca", // red-200
};

// Default color for unknown modules
const defaultColor = "#991b1b"; // red-800

function getModuleColor(module: string): string {
  return moduleColors[module] || defaultColor;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as {
    timestamp: Date;
    gjAmount: number;
    module: string;
    shipType: string;
  };
  return (
    <div className="bg-overlay border border-[#00d4ff40] px-3 py-2 rounded-sm font-mono text-xs backdrop-blur">
      <p className="text-text-secondary mb-1">{formatTime(point.timestamp)}</p>
      <p className="text-status-kill font-bold">
        {point.gjAmount.toLocaleString()} GJ neutralized
      </p>
      <p className="text-text-muted">
        by [{point.shipType}] — {point.module}
      </p>
    </div>
  );
}

export default function CapTimelineChart({ timeline }: CapTimelineChartProps) {
  if (timeline.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted font-mono text-xs uppercase tracking-widest">
        NO INCOMING NEUT RECORDED
      </div>
    );
  }

  // Prepare data for Recharts
  const data = timeline.map((point) => ({
    ...point,
    timestampMs: point.timestamp.getTime(),
    timeLabel: formatTime(point.timestamp),
    color: getModuleColor(point.module),
  }));

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={280}>
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
          <Bar
            dataKey="gjAmount"
            fill="#dc2626"
            radius={[2, 2, 0, 0]}
            animationDuration={600}
            animationEasing="ease-out"
          >
            {/* Use color function for each bar */}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
