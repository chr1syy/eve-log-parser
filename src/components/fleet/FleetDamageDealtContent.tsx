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
import { analyzeDamageDealt } from "@/lib/analysis/damageDealt";
import type { WeaponApplicationSummary } from "@/lib/analysis/damageDealt";
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
    if (e.fleetPilot ?? e.pilotName)
      pilotsSet.add(e.fleetPilot ?? e.pilotName ?? "Unknown");
  }
  const pilots = Array.from(pilotsSet).sort();

  const times = dmgEntries.map((e) => e.timestamp.getTime());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const bucketMs = bucketSecs * 1000;

  // Accumulate damage per (bucket, pilot)
  const buckets = new Map<number, Map<string, number>>();
  for (const entry of dmgEntries) {
    const pilot = entry.fleetPilot ?? entry.pilotName ?? "Unknown";
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
  const { data, pilots } = useMemo(
    () => computePerPilotDps(entries),
    [entries],
  );

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart
        data={data}
        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
      >
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
        <Legend wrapperStyle={{ fontSize: 12, fontFamily: "monospace" }} />
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

// Cross-matrix helpers for drill-down view
type CrossEntry = {
  byPilot: Record<string, Record<string, number>>;
  byTarget: Record<string, Record<string, number>>;
  pilots: { name: string; total: number }[];
  targets: { name: string; total: number }[];
};

function buildDamageDealtMatrix(entries: LogEntry[]): CrossEntry {
  const dmg = entries.filter((e) => e.eventType === "damage-dealt");
  const byPilot: Record<string, Record<string, number>> = {};
  const byTarget: Record<string, Record<string, number>> = {};

  for (const e of dmg) {
    const pilot = e.fleetPilot ?? e.pilotName ?? "Unknown";
    const target = e.pilotName ?? e.shipType ?? "Unknown";
    const amount = e.amount ?? 0;

    byPilot[pilot] ??= {};
    byPilot[pilot][target] = (byPilot[pilot][target] ?? 0) + amount;

    byTarget[target] ??= {};
    byTarget[target][pilot] = (byTarget[target][pilot] ?? 0) + amount;
  }

  const pilots = Object.entries(byPilot)
    .map(([name, map]) => ({
      name,
      total: Object.values(map).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total);

  const targets = Object.entries(byTarget)
    .map(([name, map]) => ({
      name,
      total: Object.values(map).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total);

  return { byPilot, byTarget, pilots, targets };
}

function DamageDealtMatrix({ entries }: { entries: LogEntry[] }) {
  const [selectedPilot, setSelectedPilot] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const matrix = useMemo(() => buildDamageDealtMatrix(entries), [entries]);

  const chartEntries = useMemo(() => {
    if (selectedPilot) {
      return entries.filter(
        (e) => (e.fleetPilot ?? e.pilotName ?? "Unknown") === selectedPilot,
      );
    }
    if (selectedTarget) {
      return entries.filter(
        (e) => (e.pilotName ?? e.shipType ?? "Unknown") === selectedTarget,
      );
    }
    return entries;
  }, [entries, selectedPilot, selectedTarget]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Pilots (left) */}
      <div>
        <div className="mb-2 font-mono text-xs text-text-muted">Pilots</div>
        <div className="space-y-2">
          {matrix.pilots.map((p) => (
            <button
              key={p.name}
              type="button"
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded transition-colors text-left",
                selectedPilot === p.name
                  ? "bg-cyan/10 ring-1 ring-cyan-glow"
                  : "hover:bg-white/2",
              )}
              onClick={() =>
                setSelectedPilot((prev) => (prev === p.name ? null : p.name))
              }
            >
              <span className="font-mono text-sm">{p.name}</span>
              <span className="font-mono text-sm text-gold-bright">
                {fmt(p.total)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Center: filtered DPS chart */}
      <div className="col-span-1 lg:col-span-1">
        <div className="mb-2 font-mono text-xs text-text-muted">Timeline</div>
        <Panel title="DPS — filtered">
          <FleetPilotDpsChart entries={chartEntries} />
        </Panel>
      </div>

      {/* Targets (right) */}
      <div>
        <div className="mb-2 font-mono text-xs text-text-muted">Targets</div>
        <div className="space-y-2">
          {matrix.targets.map((t) => (
            <button
              key={t.name}
              type="button"
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded transition-colors text-left",
                selectedTarget === t.name
                  ? "bg-cyan/10 ring-1 ring-cyan-glow"
                  : "hover:bg-white/2",
              )}
              onClick={() =>
                setSelectedTarget((prev) => (prev === t.name ? null : t.name))
              }
            >
              <span className="font-mono text-sm">{t.name}</span>
              <span className="font-mono text-sm text-gold-bright">
                {fmt(t.total)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
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
  const analysis = useMemo(() => analyzeDamageDealt(entries), [entries]);

  const maxDps = useMemo(
    () => Math.max(0, ...analysis.engagements.map((e) => e.dps)),
    [analysis],
  );

  // NOTE: engagement table / zoom state removed for Phase 05 matrix drill-down.

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
    analysis.totalHits > 0 ? analysis.totalDamageDealt / analysis.totalHits : 0;

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

      {/* Drill-down: fleet pilot ↔ target */}
      <Panel title="DAMAGE MATRIX — FLEET PILOTS vs TARGETS">
        <DamageDealtMatrix entries={entries} />
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
