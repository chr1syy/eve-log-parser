"use client";

import { useMemo } from "react";
import type { HitQuality, LogEntry } from "@/lib/types";
import Panel from "@/components/ui/Panel";
import DataTable from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import HitQualityTooltip from "./HitQualityTooltip";

interface TargetRow {
  target: string;
  shipType: string;
  corp: string;
  totalDamage: number;
  dps: number;
  hits: number;
  minHit: number;
  maxHit: number;
  avgHit: number;
  misses: number;
  hitQualities: Partial<Record<HitQuality, number>>;
  firstHit: Date;
  lastHit: Date;
  [key: string]: unknown;
}

export interface DamagePerTargetTableProps {
  entries: LogEntry[];
  brushWindow: { start: Date; end: Date } | null;
  onTargetClick?: (start: Date, end: Date) => void;
  excludeDrones?: boolean;
}

const COLUMNS: Column<TargetRow>[] = [
  {
    key: "target",
    label: "Target / Ship",
    sortable: true,
    render: (_v, row) => (
      <div>
        <div className="text-text-primary font-mono text-xs leading-snug">
          {row.target}
        </div>
        <div className="text-text-muted font-mono text-[10px] leading-snug">
          {row.shipType}
        </div>
      </div>
    ),
  },
  {
    key: "corp",
    label: "Corp",
    sortable: true,
    width: "80px",
    render: (v) =>
      v ? (
        <span className="font-mono text-xs text-text-secondary">{v as string}</span>
      ) : (
        <span className="text-text-muted">—</span>
      ),
  },
  {
    key: "totalDamage",
    label: "Total Dmg",
    sortable: true,
    numeric: true,
    render: (v) => (
      <span className="text-[#eab308]">{Math.round(v as number).toLocaleString()}</span>
    ),
  },
  {
    key: "dps",
    label: "DPS",
    sortable: true,
    numeric: true,
    render: (v) =>
      (v as number) > 0 ? (
        <span className="text-[#00d4ff]">{(v as number).toFixed(1)}</span>
      ) : (
        <span className="text-text-muted">—</span>
      ),
  },
  {
    key: "hits",
    label: "Hits",
    sortable: true,
    numeric: true,
    render: (v, row) => (
      <HitQualityTooltip
        hitQualities={row.hitQualities}
        totalHits={row.hits}
      >
        <span>{(v as number).toLocaleString()}</span>
      </HitQualityTooltip>
    ),
  },
  {
    key: "minHit",
    label: "Min",
    sortable: true,
    numeric: true,
    render: (v) => (
      <span className="text-[#66cc66]">{Math.round(v as number).toLocaleString()}</span>
    ),
  },
  {
    key: "maxHit",
    label: "Max",
    sortable: true,
    numeric: true,
    render: (v) => (
      <span className="text-[#e53e3e]">{Math.round(v as number).toLocaleString()}</span>
    ),
  },
  {
    key: "avgHit",
    label: "Avg",
    sortable: true,
    numeric: true,
    render: (v) => Math.round(v as number).toLocaleString(),
  },
  {
    key: "misses",
    label: "Misses",
    sortable: true,
    numeric: true,
    render: (v) =>
      (v as number) > 0 ? (
        <span className="text-[#e53e3e]">{v as number}</span>
      ) : (
        <span className="text-text-muted">0</span>
      ),
  },
];

export default function DamagePerTargetTable({
  entries,
  brushWindow,
  onTargetClick,
  excludeDrones,
}: DamagePerTargetTableProps) {
  const rows = useMemo((): TargetRow[] => {
    const windowedEntries =
      brushWindow !== null
        ? entries.filter(
            (e) =>
              e.timestamp >= brushWindow.start && e.timestamp <= brushWindow.end,
          )
        : entries;

    const damageMap = new Map<string, LogEntry[]>();
    const missMap = new Map<string, number>();

    for (const entry of windowedEntries) {
      if (excludeDrones && entry.isDrone) continue;
      const targetName = entry.pilotName ?? entry.shipType ?? "Unknown";
      const shipType = entry.shipType ?? "Unknown";
      const key = `${targetName}||${shipType}`;

      if (entry.eventType === "damage-dealt") {
        if (!damageMap.has(key)) damageMap.set(key, []);
        damageMap.get(key)!.push(entry);
      } else if (entry.eventType === "miss-outgoing") {
        missMap.set(key, (missMap.get(key) ?? 0) + 1);
      }
    }

    const result: TargetRow[] = [];
    for (const [key, group] of damageMap) {
      const [targetName, shipType] = key.split("||");
      const timestamps = group.map((e) => e.timestamp.getTime());
      const firstMs = Math.min(...timestamps);
      const lastMs = Math.max(...timestamps);
      const windowSeconds = (lastMs - firstMs) / 1000;

      const amounts = group.map((e) => e.amount ?? 0);
      const totalDamage = amounts.reduce((a, b) => a + b, 0);
      const hits = group.length;
      const minHit = Math.min(...amounts);
      const maxHit = Math.max(...amounts);
      const avgHit = hits > 0 ? totalDamage / hits : 0;
      const dps = windowSeconds > 0 ? totalDamage / windowSeconds : 0;
      const corp = group.find((e) => e.corpTicker)?.corpTicker ?? "";
      const misses = missMap.get(key) ?? 0;

      const hitQualities: Partial<Record<HitQuality, number>> = {};
      for (const entry of group) {
        if (entry.hitQuality) {
          hitQualities[entry.hitQuality] =
            (hitQualities[entry.hitQuality] ?? 0) + 1;
        }
      }

      result.push({
        target: targetName,
        shipType,
        corp,
        totalDamage,
        dps,
        hits,
        minHit,
        maxHit,
        avgHit,
        misses,
        hitQualities,
        firstHit: new Date(firstMs),
        lastHit: new Date(lastMs),
      });
    }

    result.sort((a, b) => b.totalDamage - a.totalDamage);
    return result;
  }, [entries, brushWindow, excludeDrones]);

  if (rows.length === 0) return null;

  const subtitle = brushWindow ? "brush selection" : "full session";
  const droneNote = excludeDrones ? " · drones excluded" : "";

  return (
    <Panel
      title={`DAMAGE PER TARGET — ${subtitle.toUpperCase()}${droneNote.toUpperCase()}`}
      headerAction={
        onTargetClick ? (
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
            Click row to zoom chart
          </span>
        ) : undefined
      }
      className="mt-0"
    >
      <DataTable<TargetRow>
        columns={COLUMNS}
        data={rows}
        defaultSortKey="totalDamage"
        defaultSortDirection="desc"
        rowKey={(row) => `${row.target}||${row.shipType}`}
        pageSize={20}
        emptyState={
          <span className="text-text-muted font-mono text-xs uppercase tracking-widest">
            No damage dealt in selection
          </span>
        }
        onRowClick={
          onTargetClick
            ? (row) => onTargetClick(row.firstHit as Date, row.lastHit as Date)
            : undefined
        }
      />
    </Panel>
  );
}
