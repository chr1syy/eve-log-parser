"use client";

import {
  useMemo,
  useState,
  useDeferredValue,
  useTransition,
  useCallback,
} from "react";
import Link from "next/link";
import { Upload, ShieldAlert } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/dashboard/StatCard";
import DataTable from "@/components/ui/DataTable";
import DpsTakenChart from "@/components/charts/DpsTakenChart";
import type { Column } from "@/components/ui/DataTable";
import { useParsedLogs } from "@/hooks/useParsedLogs";
import { analyzeDamageTaken } from "@/lib/analysis/damageTaken";
import { analyzeReps } from "@/lib/analysis/repAnalysis";
import { filterOutHostileNpcs } from "@/lib/npcFilter";
import type {
  IncomingWeaponSummary,
  AttackerTimeSeries,
} from "@/lib/analysis/damageTaken";
import type { RepSourceSummary } from "@/lib/analysis/repAnalysis";
import type { HitQuality } from "@/lib/types";
import { cn } from "@/lib/utils";

// Hit quality ordered display config
const HIT_QUALITY_ORDER: HitQuality[] = [
  "Wrecks",
  "Smashes",
  "Penetrates",
  "Hits",
  "Glances Off",
  "Grazes",
];

function hitQualityColor(hq: HitQuality): string {
  switch (hq) {
    case "Wrecks":
    case "Smashes":
      return "text-gold-bright";
    case "Penetrates":
    case "Hits":
      return "text-cyan-glow";
    case "Glances Off":
    case "Grazes":
      return "text-text-muted";
    default:
      return "text-text-secondary";
  }
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

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

// --- Weapon/Damage source table ---
type WeaponRow = IncomingWeaponSummary & Record<string, unknown>;

function WeaponTable({
  summaries,
  emptyMessage,
  showSource = false,
  onRowClick,
  attackerSeries,
}: {
  summaries: IncomingWeaponSummary[];
  emptyMessage: string;
  showSource?: boolean;
  onRowClick?: (row: IncomingWeaponSummary) => void;
  attackerSeries?: AttackerTimeSeries[];
}) {
  if (summaries.length === 0) {
    return (
      <p className="text-text-muted font-mono text-xs uppercase tracking-widest text-center py-6">
        {emptyMessage}
      </p>
    );
  }

  const columns: Column<Record<string, unknown>>[] = [
    ...(showSource
      ? [
          {
            key: "source",
            label: "Attacker",
            sortable: true,
            render: (v, row) => {
              const r = row as WeaponRow;
              const shipType = r.shipType;
              const showShip = shipType && shipType !== String(v);
              // try to find attacker color/index
              const attackerIdx = attackerSeries
                ? attackerSeries.findIndex((a) => a.source === String(v))
                : -1;
              const attacker =
                attackerIdx >= 0 ? attackerSeries![attackerIdx] : null;
              return (
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    {attacker ? (
                      <span
                        className="w-3 h-3 inline-block rounded-sm"
                        style={{ backgroundColor: attacker.color }}
                        aria-hidden
                      />
                    ) : null}
                    <span className="font-mono text-xs text-text-primary">
                      {String(v)}
                    </span>
                    {attacker ? (
                      <span className="font-mono text-[10px] text-text-muted">
                        #{attackerIdx + 1}
                      </span>
                    ) : null}
                  </div>
                  {showShip ? (
                    <Badge variant="default">{shipType}</Badge>
                  ) : (
                    <span className="text-text-muted font-mono text-xs">—</span>
                  )}
                </div>
              );
            },
          } as Column<Record<string, unknown>>,
        ]
      : []),
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
      key: "missCount",
      label: "Misses",
      sortable: true,
      numeric: true,
      render: (v) => {
        const n = v as number;
        return n > 0 ? (
          <span className="font-mono text-xs text-text-muted">{fmt(n)}</span>
        ) : (
          <span className="text-text-muted font-mono text-xs">—</span>
        );
      },
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
    ...HIT_QUALITY_ORDER.map((hq) => ({
      key: `hq_${hq}`,
      label: hq,
      sortable: false,
      numeric: true,
      render: (_v: unknown, row: Record<string, unknown>) => {
        const weaponRow = row as WeaponRow;
        const count = weaponRow.hitQualities[hq];
        if (!count)
          return <span className="text-text-muted font-mono text-xs">—</span>;
        return (
          <span
            className={cn("font-mono text-xs font-bold", hitQualityColor(hq))}
          >
            {count}
          </span>
        );
      },
    })),
  ];

  // Flatten hitQualities into row keys for DataTable and keep original
  // summary on the row under a private key so clickable rows can map
  // back to the typed IncomingWeaponSummary.
  const rows: Record<string, unknown>[] = summaries.map((s) => {
    const row: Record<string, unknown> = {
      ...(s as unknown as Record<string, unknown>),
    };
    for (const hq of HIT_QUALITY_ORDER) {
      row[`hq_${hq}`] = s.hitQualities[hq] ?? null;
    }
    // keep reference to original summary for callbacks
    row.__orig = s;
    return row;
  });

  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(_, i) => String(i)}
      onRowClick={
        onRowClick
          ? (r) =>
              onRowClick(
                (r as Record<string, unknown>).__orig as IncomingWeaponSummary,
              )
          : undefined
      }
    />
  );
}

// --- Rep source table ---
type RepRow = RepSourceSummary & Record<string, unknown>;

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

  // Convert summaries to DataTable-compatible rows
  const rows = summaries.map((s) => ({ ...s }) as Record<string, unknown>);

  return (
    <DataTable columns={columns} data={rows} rowKey={(_, i) => String(i)} />
  );
}

export default function DamageTakenPage() {
  const { activeLog } = useParsedLogs();
  const hasLogs = activeLog !== null;
  const [hideNpcs, setHideNpcs] = useState(false);

  // Defer heavy analysis when the active log changes so UI interactions stay
  // responsive (matches the pattern used in Damage Dealt page).
  const deferredActiveLog = useDeferredValue(activeLog);
  const [isPending, startTransition] = useTransition();

  const entries = useMemo(() => {
    const raw = deferredActiveLog?.entries ?? [];
    return hideNpcs ? filterOutHostileNpcs(raw) : raw;
  }, [deferredActiveLog, hideNpcs]);

  const damageAnalysis = useMemo(() => {
    if (!deferredActiveLog) return null;
    return analyzeDamageTaken(entries);
  }, [entries, deferredActiveLog]);

  const repAnalysis = useMemo(() => {
    if (!deferredActiveLog) return null;
    return analyzeReps(entries);
  }, [entries, deferredActiveLog]);

  const hasIncomingDamage =
    damageAnalysis && damageAnalysis.totalIncomingHits > 0;

  // Zoom/brush state for the chart
  const [zoomedWindow, setZoomedWindow] = useState<
    { start: Date; end: Date } | undefined
  >(undefined);
  const [zoomedSource, setZoomedSource] = useState<{
    source: string;
    weapon?: string;
    shipType?: string;
  } | null>(null);
  const [resetBrushKey, setResetBrushKey] = useState(0);

  const handleRangeSelect = useCallback((start: Date, end: Date) => {
    startTransition(() => {
      setZoomedSource(null);
      setZoomedWindow({ start, end });
    });
  }, []);

  const handleSourceClick = useCallback(
    (summary: IncomingWeaponSummary) => {
      startTransition(() => {
        // Toggle zoom for this source+weapon
        const isSame =
          zoomedSource?.source === summary.source &&
          zoomedSource?.weapon === summary.weapon;
        if (isSame) {
          // clicking again toggles off and reset brush
          setResetBrushKey((k) => k + 1);
          setZoomedSource(null);
          setZoomedWindow(undefined);
          return;
        }

        // If this summary has timestamps, zoom to them; otherwise no-op
        if (summary.firstHit && summary.lastHit) {
          setZoomedSource({
            source: summary.source,
            weapon: summary.weapon,
            shipType: summary.shipType,
          });
          setZoomedWindow({ start: summary.firstHit, end: summary.lastHit });
        }
      });
    },
    [zoomedSource],
  );

  const hasZoom = Boolean(zoomedWindow);

  const chartHeaderAction = (
    <div className="flex items-center gap-3 font-mono text-xs">
      {hasZoom && (
        <>
          <button
            type="button"
            className="text-text-muted hover:text-text-primary transition-colors uppercase tracking-widest"
            onClick={() => {
              startTransition(() => {
                setResetBrushKey((k) => k + 1);
                setZoomedWindow(undefined);
              });
            }}
          >
            RESET
          </button>
          <span className="text-text-muted">—</span>
        </>
      )}
    </div>
  );

  return (
    <AppLayout title="DAMAGE MITIGATION">
      {!hasLogs ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Panel className="text-center max-w-sm w-full">
            <div className="py-8 flex flex-col items-center gap-4">
              <div>
                <h2 className="text-text-primary font-ui font-bold uppercase tracking-widest text-lg mb-2">
                  NO LOGS PARSED
                </h2>
                <p className="text-text-muted font-mono text-sm">
                  Upload EVE combat logs to analyze damage mitigation
                </p>
              </div>
              <Link href="/upload">
                <Button variant="primary" size="md" icon={<Upload size={14} />}>
                  UPLOAD LOGS
                </Button>
              </Link>
            </div>
          </Panel>
        </div>
      ) : !hasIncomingDamage ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Panel className="text-center max-w-sm w-full">
            <div className="py-8">
              <ShieldAlert className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <h2 className="text-text-primary font-ui font-bold uppercase tracking-widest text-lg mb-2">
                NO DAMAGE RECEIVED
              </h2>
              <p className="text-text-muted font-mono text-sm">
                No incoming damage events found in the parsed logs
              </p>
            </div>
          </Panel>
        </div>
      ) : (
        <div className="space-y-6">
          {/* NPC Filter Toggle */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant={hideNpcs ? "primary" : "secondary"}
              onClick={() => setHideNpcs(!hideNpcs)}
            >
              {hideNpcs ? "SHOW NPCs" : "HIDE NPCs"}
            </Button>
            {hideNpcs && activeLog && (
              <span className="text-text-muted font-mono text-xs">
                {filterOutHostileNpcs(activeLog.entries).length} /
                {activeLog.entries.length} sources shown (hostile NPCs hidden)
              </span>
            )}
          </div>

          {/* Section 1 — DPS Over Time */}
          <Panel
            title="INCOMING DPS OVER TIME (10s ROLLING)"
            headerAction={chartHeaderAction}
          >
            <DpsTakenChart
              timeSeries={damageAnalysis.dpsTimeSeries}
              fights={damageAnalysis.fights}
              attackerSeries={damageAnalysis.attackerTimeSeries}
              repTimeSeries={repAnalysis?.incomingRepTimeSeries}
              zoomedWindow={zoomedWindow}
              onRangeSelect={handleRangeSelect}
              resetKey={resetBrushKey}
            />
            {isPending && (
              <div className="mt-2 text-text-muted font-mono text-xs">
                Computing analysis…
              </div>
            )}
          </Panel>

          {/* Section 2 — Peak DPS Windows */}
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

          {/* Section 3 — Incoming Hit Quality */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Panel title="INCOMING WEAPONS">
              <WeaponTable
                summaries={damageAnalysis.incomingWeaponSummaries}
                emptyMessage="NO INCOMING WEAPON DAMAGE"
                showSource={true}
                // Make rows clickable so users can click the existing table rows
                // to zoom the chart instead of using the duplicated summary list.
                onRowClick={(row) =>
                  handleSourceClick(row as IncomingWeaponSummary)
                }
                attackerSeries={damageAnalysis.attackerTimeSeries}
              />
            </Panel>
            <Panel title="INCOMING DRONES">
              <WeaponTable
                summaries={damageAnalysis.incomingDroneSummaries}
                emptyMessage="NO INCOMING DRONE DAMAGE"
                showSource={true}
                onRowClick={(row) =>
                  handleSourceClick(row as IncomingWeaponSummary)
                }
                attackerSeries={damageAnalysis.attackerTimeSeries}
              />
            </Panel>
          </div>

          {/* Section 4 — Rep Summary */}
          {repAnalysis && (
            <div className="space-y-6">
              {/* Reps Received */}
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

              {/* Reps Applied (outgoing) */}
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
      )}
    </AppLayout>
  );
}
