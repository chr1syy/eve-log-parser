"use client";

import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import Panel from "@/components/ui/Panel";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/dashboard/StatCard";
import DataTable from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import DpsTakenChart from "@/components/charts/DpsTakenChart";
import { analyzeDamageTaken } from "@/lib/analysis/damageTaken";
import { analyzeReps } from "@/lib/analysis/repAnalysis";
import { filterOutHostileNpcs } from "@/lib/npcFilter";
import type { RepSourceSummary } from "@/lib/analysis/repAnalysis";
import type { LogEntry } from "@/lib/types";
import Button from "@/components/ui/Button";
import { formatNumber } from "@/lib/utils";

function fmtDps(n: number): string {
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
}

export default function FleetDamageTakenContent({
  entries,
}: FleetDamageTakenContentProps) {
  const [hideNpcs, setHideNpcs] = useState(false);

  const filteredEntries = useMemo(
    () => (hideNpcs ? filterOutHostileNpcs(entries) : entries),
    [entries, hideNpcs],
  );

  const damageAnalysis = useMemo(
    () => analyzeDamageTaken(filteredEntries),
    [filteredEntries],
  );

  const repAnalysis = useMemo(
    () => analyzeReps(filteredEntries),
    [filteredEntries],
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

      {/* DPS over time */}
      <Panel title="INCOMING DPS OVER TIME (10s ROLLING)">
        <DpsTakenChart
          timeSeries={damageAnalysis.dpsTimeSeries}
          fights={damageAnalysis.fights}
          repTimeSeries={repAnalysis?.incomingRepTimeSeries}
        />
      </Panel>

      {/* Peak DPS */}
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
        <PilotDamageTakenBars entries={filteredEntries} />
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
