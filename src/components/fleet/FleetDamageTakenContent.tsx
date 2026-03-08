"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ShieldAlert } from "lucide-react";
import Panel from "@/components/ui/Panel";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/dashboard/StatCard";
import DataTable from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Brush,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { analyzeDamageTaken } from "@/lib/analysis/damageTaken";
import { analyzeReps } from "@/lib/analysis/repAnalysis";
import { filterOutHostileNpcs } from "@/lib/npcFilter";
import type { RepSourceSummary } from "@/lib/analysis/repAnalysis";
import type { LogEntry } from "@/lib/types";
import Button from "@/components/ui/Button";
import { formatLogTime, formatNumber } from "@/lib/utils";

function fmtDps(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function fmtTime(d: Date): string {
  return formatLogTime(d);
}

// Per-pilot damage taken chart helpers
const PILOT_COLORS = [
  "#e53e3e",
  "#3182ce",
  "#dd6b20",
  "#805ad5",
  "#38a169",
  "#d53f8c",
  "#00a3bf",
  "#f6ad55",
  "#63b3ed",
  "#f687b3",
];

function computePerPilotDamageTaken(entries: LogEntry[]) {
  const damageEvents = entries.filter((e) => e.eventType === "damage-received");
  if (damageEvents.length === 0)
    return { pilots: [] as string[], data: [] as Record<string, number | Date | string>[] };

  const bucketMs = 30 * 1000; // 30s buckets
  const tsSorted = damageEvents
    .map((e) => e.timestamp.getTime())
    .sort((a, b) => a - b);
  const start = Math.floor(tsSorted[0] / bucketMs) * bucketMs;
  const end = Math.ceil(tsSorted[tsSorted.length - 1] / bucketMs) * bucketMs;
  const bucketCount = Math.max(1, Math.floor((end - start) / bucketMs) + 1);

  // Collect pilots and total damage per pilot
  const pilotTotals = new Map<string, number>();
  const eventsByBucket: Array<Record<string, number>> = new Array(bucketCount)
    .fill(0)
    .map(() => ({}));

  for (const e of damageEvents) {
    const pilot = e.fleetPilot ?? e.pilotName ?? "Unknown";
    const amount = e.amount ?? 0;
    pilotTotals.set(pilot, (pilotTotals.get(pilot) ?? 0) + amount);
    const idx = Math.floor((e.timestamp.getTime() - start) / bucketMs);
    const bucket = eventsByBucket[idx] ?? {};
    bucket[pilot] = (bucket[pilot] ?? 0) + amount;
    eventsByBucket[idx] = bucket;
  }

  const pilots = Array.from(pilotTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([p]) => p);

  const data = eventsByBucket.map((bucket, i) => {
    const ts = start + i * bucketMs;
    const row: Record<string, number | Date | string> = {
      timestampMs: ts,
      timestamp: new Date(ts),
      timeLabel: formatLogTime(ts),
    };
    for (const p of pilots) {
      row[p] = bucket[p] ?? 0;
    }
    return row;
  });

  return { pilots, data };
}

interface FleetPilotDamageTakenChartProps {
  entries: LogEntry[];
  onBrushChange?: (start: Date, end: Date) => void;
  brushResetKey?: number;
  initialBrushWindow?: { start: Date; end: Date } | null;
}

function FleetPilotDamageTakenChart({
  entries,
  onBrushChange,
  brushResetKey,
  initialBrushWindow,
}: FleetPilotDamageTakenChartProps) {
  const { pilots, data } = useMemo(
    () => computePerPilotDamageTaken(entries),
    [entries],
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const brushIndices = useMemo(() => {
    if (!initialBrushWindow || data.length === 0) return null;

    const startTs = initialBrushWindow.start.getTime();
    const endTs = initialBrushWindow.end.getTime();

    const findClosestIndex = (targetTs: number) => {
      let bestIndex = 0;
      let bestDiff = Infinity;

      for (let i = 0; i < data.length; i++) {
        const point = data[i];
        if (!point) continue;
        const diff = Math.abs((point.timestampMs as number) - targetTs);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIndex = i;
        }
      }
      return bestIndex;
    };

    const startIndex = findClosestIndex(startTs);
    const endIndex = findClosestIndex(endTs);
    return {
      startIndex: Math.min(startIndex, endIndex),
      endIndex: Math.max(startIndex, endIndex),
    };
  }, [initialBrushWindow, data]);

  const handleBrushChange = useCallback(
    (brushData: { startIndex?: number; endIndex?: number }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const { startIndex, endIndex } = brushData;
        if (startIndex == null || endIndex == null) return;
        const startTs = data[startIndex]?.timestampMs;
        const endTs = data[endIndex]?.timestampMs;
        if (startTs == null || endTs == null) return;
        onBrushChange?.(new Date(startTs), new Date(endTs));
      }, 300);
    },
    [data, onBrushChange],
  );

  if (!data || data.length === 0 || pilots.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted font-mono text-xs">
        NO INCOMING DAMAGE DATA
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={data}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        >
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
          />
          <Tooltip
            content={({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload: Record<string, number | Date | string> }> }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0]?.payload;
              return (
                <div className="bg-overlay border border-[#00d4ff40] px-3 py-2 rounded-sm font-mono text-xs backdrop-blur">
                  <p className="text-text-secondary mb-1">
                    {formatLogTime(point.timestamp as Date | number)}
                  </p>
                  {pilots.map((p, i) => (
                    <p key={p} className="text-text-primary">
                      <span
                        style={{ color: PILOT_COLORS[i % PILOT_COLORS.length] }}
                      >
                        {p}:
                      </span>{" "}
                      {((point[p] as number) ?? 0).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  ))}
                </div>
              );
            }}
          />
          {/* Legend intentionally removed for compact fleet view */}
          {pilots.map((p, i) => (
            <Line
              key={p}
              type="monotone"
              dataKey={p}
              stroke={PILOT_COLORS[i % PILOT_COLORS.length]}
              strokeWidth={2}
              dot={false}
              animationDuration={600}
            />
          ))}
          <Brush
            key={brushResetKey}
            dataKey="timestampMs"
            height={28}
            stroke="#e53e3e"
            fill="#0d0d0d"
            travellerWidth={8}
            tickFormatter={(ts: number) => formatLogTime(ts)}
            onChange={handleBrushChange}
            {...(brushIndices ?? {})}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Per-pilot damage taken bars ───────────────────────────────────────────────
// Groups damage-received entries by pilotName (= the fleet pilot whose log it came from).

function PilotDamageTakenBars({ entries }: { entries: LogEntry[] }) {
  const dmgByPilot = useMemo(() => {
    const map = new Map<string, { damage: number; shipType: string }>();
    for (const e of entries) {
      if (e.eventType !== "damage-received") continue;
      const pilot = e.fleetPilot ?? e.pilotName ?? "Unknown";
      const existing = map.get(pilot);
      map.set(pilot, {
        damage: (existing?.damage ?? 0) + (e.amount ?? 0),
        shipType: e.fleetShipType ?? e.shipType ?? existing?.shipType ?? "",
      });
    }
    return Array.from(map.entries())
      .map(([pilot, { damage, shipType }]) => ({ pilot, damage, shipType }))
      .sort((a, b) => b.damage - a.damage);
  }, [entries]);

  if (dmgByPilot.length === 0) return null;

  const total = dmgByPilot.reduce((s, p) => s + p.damage, 0);

  return (
    <div className="space-y-2">
      {dmgByPilot.map(({ pilot, damage, shipType }) => {
        const pct = total > 0 ? (damage / total) * 100 : 0;
        return (
          <div
            key={pilot}
            className="bg-bg-secondary border border-border rounded px-4 py-3"
          >
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="font-medium text-text-primary">{pilot}</span>
                {shipType && (
                  <span className="ml-2 text-xs text-text-muted">
                    {shipType}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="font-mono text-text-primary">
                  {formatNumber(damage)}
                </span>
                <span className="ml-2 text-xs text-text-muted">
                  {pct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="w-full bg-bg-primary rounded-full h-1.5">
              <div
                className="bg-orange-500 h-1.5 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <div className="flex justify-between text-xs text-text-muted pt-1 px-1">
        <span>Fleet total received</span>
        <span className="font-mono">{formatNumber(total)}</span>
      </div>
    </div>
  );
}

// Cross-matrix helpers for drill-down view (damage taken)
type DamageTakenCrossEntry = {
  byPilot: Record<string, Record<string, number>>; // receiver -> attacker -> dmg
  byAttacker: Record<string, Record<string, number>>; // attacker -> receiver -> dmg
  pilots: { name: string; total: number }[];
  attackers: { name: string; total: number }[];
};

function buildDamageTakenMatrix(entries: LogEntry[]): DamageTakenCrossEntry {
  const dmg = entries.filter((e) => e.eventType === "damage-received");
  const byPilot: Record<string, Record<string, number>> = {};
  const byAttacker: Record<string, Record<string, number>> = {};

  for (const e of dmg) {
    const pilot = e.fleetPilot ?? e.pilotName ?? "Unknown"; // receiver
    const attacker = e.pilotName ?? e.shipType ?? "Unknown"; // source of damage
    const amount = e.amount ?? 0;

    byPilot[pilot] ??= {};
    byPilot[pilot][attacker] = (byPilot[pilot][attacker] ?? 0) + amount;

    byAttacker[attacker] ??= {};
    byAttacker[attacker][pilot] = (byAttacker[attacker][pilot] ?? 0) + amount;
  }

  const pilots = Object.entries(byPilot)
    .map(([name, map]) => ({
      name,
      total: Object.values(map).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total);

  const attackers = Object.entries(byAttacker)
    .map(([name, map]) => ({
      name,
      total: Object.values(map).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total);

  return { byPilot, byAttacker, pilots, attackers };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DamageTakenMatrix({ entries }: { entries: LogEntry[] }) {
  const [selectedPilot, setSelectedPilot] = useState<string | null>(null);
  const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null);

  const matrix = useMemo(() => buildDamageTakenMatrix(entries), [entries]);

  const chartEntries = useMemo(() => {
    if (selectedPilot) {
      return entries.filter(
        (e) => (e.fleetPilot ?? e.pilotName ?? "Unknown") === selectedPilot,
      );
    }
    if (selectedAttacker) {
      return entries.filter(
        (e) => (e.pilotName ?? e.shipType ?? "Unknown") === selectedAttacker,
      );
    }
    return entries;
  }, [entries, selectedPilot, selectedAttacker]);

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
              className={`w-full flex items-center justify-between px-3 py-2 rounded transition-colors text-left ${
                selectedPilot === p.name
                  ? "bg-red-700/10 ring-1 ring-red-600"
                  : "hover:bg-white/2"
              }`}
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

      {/* Center: filtered incoming DPS chart */}
      <div className="col-span-1 lg:col-span-1">
        <div className="mb-2 font-mono text-xs text-text-muted">Timeline</div>
        <Panel title="INCOMING DPS — filtered">
          <FleetPilotDamageTakenChart entries={chartEntries} />
        </Panel>
      </div>

      {/* Attackers (right) */}
      <div>
        <div className="mb-2 font-mono text-xs text-text-muted">Attackers</div>
        <div className="space-y-2">
          {matrix.attackers.map((t) => (
            <button
              key={t.name}
              type="button"
              className={`w-full flex items-center justify-between px-3 py-2 rounded transition-colors text-left ${
                selectedAttacker === t.name
                  ? "bg-red-700/10 ring-1 ring-red-600"
                  : "hover:bg-white/2"
              }`}
              onClick={() =>
                setSelectedAttacker((prev) => (prev === t.name ? null : t.name))
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

// ── Rep table ─────────────────────────────────────────────────────────────────

type RepRow = RepSourceSummary & Record<string, unknown>;

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function RepTable({
  summaries,
  emptyMessage,
}: {
  summaries: RepSourceSummary[];
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
      key: "shipType",
      label: "Ship / Bot",
      sortable: true,
      render: (v, row) => {
        const r = row as RepRow;
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-text-primary">
              {String(v)}
            </span>
            {r.isBot && <Badge variant="gold">BOT</Badge>}
          </div>
        );
      },
    },
    {
      key: "module",
      label: "Module",
      sortable: true,
      render: (v) => (
        <span className="font-mono text-xs text-text-secondary">
          {String(v)}
        </span>
      ),
    },
    {
      key: "totalRepaired",
      label: "Total HP",
      sortable: true,
      numeric: true,
      render: (v) => (
        <span className="font-mono text-xs text-gold-bright font-bold">
          {fmt(v as number)}
        </span>
      ),
    },
    {
      key: "repCount",
      label: "Reps",
      sortable: true,
      numeric: true,
      render: (v) => (
        <span className="font-mono text-xs">{fmt(v as number)}</span>
      ),
    },
    {
      key: "minRep",
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
      key: "maxRep",
      label: "Max",
      sortable: true,
      numeric: true,
      render: (v) => (
        <span className="font-mono text-xs text-status-kill">
          {fmt(v as number)}
        </span>
      ),
    },
  ];

  const rows = summaries.map((s) => ({ ...s }) as Record<string, unknown>);
  return (
    <DataTable columns={columns} data={rows} rowKey={(_, i) => String(i)} />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface FleetDamageTakenContentProps {
  entries: LogEntry[];
  brushWindow?: {
    start: Date;
    end: Date;
  } | null;
  onBrushChange?: (start: Date, end: Date) => void;
  brushResetKey?: number;
  initialBrushWindow?: {
    start: Date;
    end: Date;
  } | null;
}

export default function FleetDamageTakenContent({
  entries,
  brushWindow,
  onBrushChange,
  brushResetKey,
  initialBrushWindow,
}: FleetDamageTakenContentProps) {
  const [hideNpcs, setHideNpcs] = useState(false);

  const filteredEntries = useMemo(
    () => (hideNpcs ? filterOutHostileNpcs(entries) : entries),
    [entries, hideNpcs],
  );

  const windowedEntries = useMemo(
    () =>
      brushWindow
        ? filteredEntries.filter(
            (e) =>
              e.timestamp >= brushWindow.start && e.timestamp <= brushWindow.end,
          )
        : filteredEntries,
    [brushWindow, filteredEntries],
  );

  const damageAnalysis = useMemo(
    () => analyzeDamageTaken(windowedEntries),
    [windowedEntries],
  );

  const repAnalysis = useMemo(
    () => analyzeReps(windowedEntries),
    [windowedEntries],
  );

  if (damageAnalysis.totalIncomingHits === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <ShieldAlert className="w-8 h-8 text-text-muted" />
        <p className="text-text-muted font-mono text-xs uppercase tracking-widest">
          No incoming damage in uploaded logs
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* NPC filter */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant={hideNpcs ? "primary" : "secondary"}
          onClick={() => setHideNpcs(!hideNpcs)}
        >
          {hideNpcs ? "SHOW NPCs" : "HIDE NPCs"}
        </Button>
        {hideNpcs && (
          <span className="text-text-muted font-mono text-xs">
            {filteredEntries.length} / {entries.length} events shown (hostile
            NPCs hidden)
          </span>
        )}
      </div>

      {/* Per-pilot incoming DPS chart */}
      <Panel title="INCOMING DPS — PER PILOT (30s buckets)">
        <FleetPilotDamageTakenChart
          entries={filteredEntries}
          onBrushChange={onBrushChange}
          brushResetKey={brushResetKey}
          initialBrushWindow={initialBrushWindow}
        />
      </Panel>

      {/* Peak DPS */}
      {brushWindow && (
        <p className="font-mono text-xs uppercase tracking-widest text-text-muted">
          Showing brush selection
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="PEAK DPS (10s)"
          value={fmtDps(damageAnalysis.peakDps10s.maxDps)}
          subValue={`at ${fmtTime(damageAnalysis.peakDps10s.peakTimestamp)}`}
          variant="red"
        />
        <StatCard
          label="PEAK DPS (30s)"
          value={fmtDps(damageAnalysis.peakDps30s.maxDps)}
          subValue={`at ${fmtTime(damageAnalysis.peakDps30s.peakTimestamp)}`}
          variant="red"
        />
        <StatCard
          label="PEAK DPS (60s)"
          value={fmtDps(damageAnalysis.peakDps60s.maxDps)}
          subValue={`at ${fmtTime(damageAnalysis.peakDps60s.peakTimestamp)}`}
          variant="red"
        />
      </div>

      {/* Per-pilot damage taken bars */}
      <Panel title="DAMAGE TAKEN — PER PILOT">
        <PilotDamageTakenBars entries={windowedEntries} />
      </Panel>

      {/* Reps */}
      {repAnalysis && (
        <div className="space-y-6">
          <Panel title="REPS RECEIVED" variant="gold">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <RepTable
                  summaries={repAnalysis.repReceivedSources}
                  emptyMessage="NO REPS RECEIVED"
                />
              </div>
              <div className="space-y-4">
                <StatCard
                  label="PEAK REPS/s (30s)"
                  value={fmtDps(
                    repAnalysis.peakRepIncoming30s.maxRepsPerSecond,
                  )}
                  subValue={`at ${fmtTime(repAnalysis.peakRepIncoming30s.peakTimestamp)}`}
                  variant="gold"
                />
                <StatCard
                  label="PEAK REPS/s (60s)"
                  value={fmtDps(
                    repAnalysis.peakRepIncoming60s.maxRepsPerSecond,
                  )}
                  subValue={`at ${fmtTime(repAnalysis.peakRepIncoming60s.peakTimestamp)}`}
                  variant="gold"
                />
              </div>
            </div>
          </Panel>

          <Panel title="REPS APPLIED" variant="gold">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <RepTable
                  summaries={repAnalysis.repOutgoingTargets}
                  emptyMessage="NO REPS APPLIED"
                />
              </div>
              <div className="space-y-4">
                <StatCard
                  label="PEAK REPS/s (30s)"
                  value={fmtDps(
                    repAnalysis.peakRepOutgoing30s.maxRepsPerSecond,
                  )}
                  subValue={`at ${fmtTime(repAnalysis.peakRepOutgoing30s.peakTimestamp)}`}
                  variant="gold"
                />
                <StatCard
                  label="PEAK REPS/s (60s)"
                  value={fmtDps(
                    repAnalysis.peakRepOutgoing60s.maxRepsPerSecond,
                  )}
                  subValue={`at ${fmtTime(repAnalysis.peakRepOutgoing60s.peakTimestamp)}`}
                  variant="gold"
                />
              </div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
