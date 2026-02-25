"use client";

import { useMemo, useState } from "react";
import { Sword } from "lucide-react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Panel from "@/components/ui/Panel";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/dashboard/StatCard";
import DataTable from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import {
  analyzeDamageDealt,
} from "@/lib/analysis/damageDealt";
import type {
  TargetEngagement,
  WeaponApplicationSummary,
} from "@/lib/analysis/damageDealt";
import type { LogEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

// ── Colour palette for per-pilot lines ───────────────────────────────────────

const PILOT_COLORS = [
  "#00d4ff", // cyan
  "#ff6b35", // orange
  "#7cfc00", // green
  "#ff69b4", // pink
  "#ffd700", // gold
  "#9370db", // purple
  "#20b2aa", // teal
  "#ff4500", // red-orange
];

// ── Per-pilot DPS chart ───────────────────────────────────────────────────────
// Uses 30s buckets so all pilots share a common x-axis.

function computePerPilotDps(
  entries: LogEntry[],
  bucketSecs = 30,
): { data: Record<string, unknown>[]; pilots: string[] } {
  const dmgEntries = entries.filter((e) => e.eventType === "damage-dealt");
  if (dmgEntries.length === 0) return { data: [], pilots: [] };

  const pilotsSet = new Set<string>();
  for (const e of dmgEntries) {
    if (e.pilotName) pilotsSet.add(e.pilotName);
  }
  const pilots = Array.from(pilotsSet).sort();

  const times = dmgEntries.map((e) => e.timestamp.getTime());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const bucketMs = bucketSecs * 1000;

  // Accumulate damage per (bucket, pilot)
  const buckets = new Map<number, Map<string, number>>();
  for (const entry of dmgEntries) {
    const pilot = entry.pilotName ?? "Unknown";
    const bucketIdx = Math.floor((entry.timestamp.getTime() - tMin) / bucketMs);
    const bucketTime = tMin + bucketIdx * bucketMs;
    if (!buckets.has(bucketTime)) buckets.set(bucketTime, new Map());
    const m = buckets.get(bucketTime)!;
    m.set(pilot, (m.get(pilot) ?? 0) + (entry.amount ?? 0));
  }

  const numBuckets = Math.ceil((tMax - tMin) / bucketMs) + 1;
  const data: Record<string, unknown>[] = [];
  for (let i = 0; i < numBuckets; i++) {
    const t = tMin + i * bucketMs;
    const point: Record<string, unknown> = {
      label: new Date(t).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    };
    const m = buckets.get(t);
    for (const pilot of pilots) {
      point[pilot] = m ? Math.round((m.get(pilot) ?? 0) / bucketSecs) : 0;
    }
    data.push(point);
  }

  return { data, pilots };
}

interface FleetPilotDpsChartProps {
  entries: LogEntry[];
}

function FleetPilotDpsChart({ entries }: FleetPilotDpsChartProps) {
  const { data, pilots } = useMemo(() => computePerPilotDps(entries), [entries]);

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="label"
          tick={{ fill: "#8899aa", fontSize: 11, fontFamily: "monospace" }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "#8899aa", fontSize: 11, fontFamily: "monospace" }}
          label={{
            value: "DPS",
            angle: -90,
            position: "insideLeft",
            fill: "#8899aa",
            fontSize: 11,
          }}
        />
        <Tooltip
          contentStyle={{
            background: "#0d1117",
            border: "1px solid #30363d",
            borderRadius: 4,
            fontSize: 12,
            fontFamily: "monospace",
          }}
          formatter={(value: unknown, name: string | undefined) => [
            `${Number(value).toLocaleString()} DPS`,
            name ?? "",
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, fontFamily: "monospace" }}
        />
        {pilots.map((pilot, i) => (
          <Line
            key={pilot}
            type="monotone"
            dataKey={pilot}
            stroke={PILOT_COLORS[i % PILOT_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Target engagement table ───────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtDps(n: number): string {
  if (n === 0) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

type EngagementRow = TargetEngagement & {
  _maxDps: number;
  _isZoomed: boolean;
};

function buildEngagementColumns(
  maxDps: number,
  onTargetClick: (e: TargetEngagement) => void,
): Column<Record<string, unknown>>[] {
  return [
    {
      key: "target",
      label: "Target",
      sortable: true,
      render: (_, row) => {
        const r = row as unknown as EngagementRow;
        return (
          <button
            type="button"
            className={cn(
              "flex flex-col gap-0.5 text-left w-full cursor-pointer transition-colors",
              r._isZoomed ? "text-cyan-glow" : "hover:text-cyan-glow",
            )}
            onClick={() => onTargetClick(r)}
          >
            <span
              className={cn(
                "font-mono text-xs",
                r._isZoomed ? "text-cyan-glow font-bold" : "text-text-primary",
              )}
            >
              {r.target}
            </span>
            {r.shipType && r.shipType !== r.target && (
              <Badge variant={r._isZoomed ? "cyan" : "default"}>
                {r.shipType}
              </Badge>
            )}
          </button>
        );
      },
    },
    {
      key: "corp",
      label: "Corp",
      sortable: true,
      render: (v) =>
        v ? (
          <Badge variant="cyan">{String(v)}</Badge>
        ) : (
          <span className="text-text-muted">—</span>
        ),
    },
    {
      key: "firstHit",
      label: "Window",
      render: (_, row) => {
        const r = row as unknown as EngagementRow;
        return (
          <span className="font-mono text-xs text-text-secondary">
            {fmtTime(r.firstHit)}–{fmtTime(r.lastHit)}
          </span>
        );
      },
    },
    {
      key: "windowSeconds",
      label: "Secs",
      sortable: true,
      numeric: true,
      render: (v) => (
        <span className="font-mono text-xs text-text-secondary">
          {(v as number).toFixed(1)}
        </span>
      ),
    },
    {
      key: "totalDamage",
      label: "Total Dmg",
      sortable: true,
      numeric: true,
      render: (v) => (
        <span className="font-mono text-xs text-gold-bright font-bold">
          {fmt(v as number)}
        </span>
      ),
    },
    {
      key: "dps",
      label: "DPS",
      sortable: true,
      numeric: true,
      render: (v, row) => {
        const dps = v as number;
        const r = row as unknown as EngagementRow;
        const pct = r._maxDps > 0 && dps > 0 ? (dps / r._maxDps) * 100 : 0;
        return (
          <div className="flex flex-col gap-1 min-w-[80px]">
            <span className="font-mono text-xs text-cyan-glow font-bold">
              {fmtDps(dps)}
            </span>
            {pct > 0 && (
              <div className="h-1 rounded-full bg-space overflow-hidden w-full">
                <div
                  className="h-full bg-cyan-glow rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "hitCount",
      label: "Hits",
      sortable: true,
      numeric: true,
      render: (v) => (
        <span className="font-mono text-xs">{fmt(v as number)}</span>
      ),
    },
    {
      key: "minHit",
      label: "Min",
      sortable: true,
      numeric: true,
      render: (v) => (
        <span className="font-mono text-xs text-status-safe">
          {fmt(v as number)}
        </span>
      ),
    },
    {
      key: "maxHit",
      label: "Max",
      sortable: true,
      numeric: true,
      render: (v) => (
        <span className="font-mono text-xs text-status-kill">
          {fmt(v as number)}
        </span>
      ),
    },
    {
      key: "avgHit",
      label: "Avg",
      sortable: true,
      numeric: true,
      render: (v) => (
        <span className="font-mono text-xs text-text-secondary">
          {fmt(v as number)}
        </span>
      ),
    },
    // Hit quality columns intentionally omitted for fleet view
  ];
}

// ── Weapon table (no hit quality) ─────────────────────────────────────────────

function WeaponTable({
  summaries,
  emptyMessage,
}: {
  summaries: WeaponApplicationSummary[];
  emptyMessage: string;
}) {
  if (summaries.length === 0) {
    return (
      <p className="text-text-muted font-mono text-xs uppercase tracking-widest text-center py-6">
        {emptyMessage}
      </p>
    );
  }

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: "weapon",
      label: "Weapon / Ammo",
      sortable: true,
      render: (v) => (
        <span className="font-mono text-xs text-text-primary">{String(v)}</span>
      ),
    },
    {
      key: "hitCount",
      label: "Hits",
      sortable: true,
      numeric: true,
      render: (v) => (
        <span className="font-mono text-xs">{fmt(v as number)}</span>
      ),
    },
    {
      key: "totalDamage",
      label: "Total Dmg",
      sortable: true,
      numeric: true,
      render: (v) => (
        <span className="font-mono text-xs text-gold-bright font-bold">
          {fmt(v as number)}
        </span>
      ),
    },
    {
      key: "minHit",
      label: "Min",
      sortable: true,
      numeric: true,
      render: (v) => (
        <span className="font-mono text-xs text-status-safe">
          {fmt(v as number)}
        </span>
      ),
    },
    {
      key: "maxHit",
      label: "Max",
      sortable: true,
      numeric: true,
      render: (v) => (
        <span className="font-mono text-xs text-status-kill">
          {fmt(v as number)}
        </span>
      ),
    },
    {
      key: "avgHit",
      label: "Avg",
      sortable: true,
      numeric: true,
      render: (v) => (
        <span className="font-mono text-xs text-text-secondary">
          {fmt(v as number)}
        </span>
      ),
    },
    // Hit quality columns intentionally omitted for fleet view
  ];

  return (
    <DataTable
      columns={columns}
      data={summaries as unknown as Record<string, unknown>[]}
      rowKey={(_, i) => String(i)}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface FleetDamageDealtContentProps {
  entries: LogEntry[];
}

export default function FleetDamageDealtContent({
  entries,
}: FleetDamageDealtContentProps) {
  const [zoomedTarget, setZoomedTarget] = useState<TargetEngagement | null>(
    null,
  );

  const analysis = useMemo(() => analyzeDamageDealt(entries), [entries]);

  const maxDps = useMemo(
    () => Math.max(0, ...analysis.engagements.map((e) => e.dps)),
    [analysis],
  );

  const handleTargetClick = (engagement: TargetEngagement) => {
    setZoomedTarget((prev) =>
      prev?.target === engagement.target &&
      prev?.shipType === engagement.shipType
        ? null
        : engagement,
    );
  };

  const engagementRows = useMemo(
    () =>
      analysis.engagements.map((e) => ({
        ...e,
        _maxDps: maxDps,
        _isZoomed:
          zoomedTarget?.target === e.target &&
          zoomedTarget?.shipType === e.shipType,
      })),
    [analysis, maxDps, zoomedTarget],
  );

  const engagementColumns = useMemo(
    () => buildEngagementColumns(maxDps, handleTargetClick),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [maxDps],
  );

  if (analysis.totalHits === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Sword className="w-8 h-8 text-text-muted" />
        <p className="text-text-muted font-mono text-xs uppercase tracking-widest">
          No outgoing damage in uploaded logs
        </p>
      </div>
    );
  }

  const bestHit = Math.max(0, ...analysis.engagements.map((e) => e.maxHit));
  const worstHit =
    analysis.engagements.length > 0
      ? Math.min(...analysis.engagements.map((e) => e.minHit))
      : 0;
  const avgHit =
    analysis.totalHits > 0
      ? analysis.totalDamageDealt / analysis.totalHits
      : 0;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Best Single Hit" value={bestHit} variant="gold" />
        <StatCard label="Worst Hit" value={worstHit} variant="default" />
        <StatCard
          label="Average Hit"
          value={Math.round(avgHit)}
          variant="cyan"
        />
        <StatCard
          label="Total Hits"
          value={analysis.totalHits}
          variant="default"
        />
        <StatCard
          label="Total Damage Dealt"
          value={analysis.totalDamageDealt}
          variant="gold"
        />
      </div>

      {/* Per-pilot DPS chart */}
      <Panel title="DPS OVER TIME — PER PILOT (30s buckets)">
        <FleetPilotDpsChart entries={entries} />
      </Panel>

      {/* DPS per target */}
      <Panel title="DPS PER TARGET">
        <DataTable
          columns={engagementColumns}
          data={engagementRows as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="SEARCH TARGETS..."
          rowKey={(_, i) => String(i)}
          emptyState={
            <span className="text-text-muted font-mono text-xs uppercase tracking-widest">
              NO TARGETS
            </span>
          }
        />
      </Panel>

      {/* Weapons & Drones (no hit quality) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="WEAPONS &amp; AMMO">
          <WeaponTable
            summaries={analysis.weaponSummaries}
            emptyMessage="NO WEAPON DAMAGE RECORDED"
          />
        </Panel>
        <Panel title="DRONES">
          <WeaponTable
            summaries={analysis.droneSummaries}
            emptyMessage="NO DRONE DAMAGE RECORDED"
          />
        </Panel>
      </div>
    </div>
  );
}
