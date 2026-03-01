"use client";

import { useMemo } from "react";
import type { LogEntry } from "@/lib/types";
import Panel from "@/components/ui/Panel";
import DataTable from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";

interface AttackerRow {
  attacker: string;
  shipType: string;
  corp: string;
  totalDamage: number;
  dps: number;
  hits: number;
  minHit: number;
  maxHit: number;
  avgHit: number;
  misses: number;
  firstHit: Date;
  lastHit: Date;
  [key: string]: unknown;
}

export interface DamageReceivedPerTargetTableProps {
  entries: LogEntry[];
  brushWindow: { start: Date; end: Date } | null;
  onAttackerClick?: (start: Date, end: Date) => void;
}

const COLUMNS: Column<AttackerRow>[] = [
  {
    key: "attacker",
    label: "Attacker / Ship",
    sortable: true,
    render: (_v, row) => (
      <div>
        <div className="text-text-primary font-mono text-xs leading-snug">
          {row.attacker}
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
      <span className="text-[#e53e3e]">{Math.round(v as number).toLocaleString()}</span>
    ),
  },
  {
    key: "dps",
    label: "DPS",
    sortable: true,
    numeric: true,
    render: (v) =>
      (v as number) > 0 ? (
        <span className="text-[#ff7448]">{(v as number).toFixed(1)}</span>
      ) : (
        <span className="text-text-muted">—</span>
      ),
  },
  {
    key: "hits",
    label: "Hits",
    sortable: true,
    numeric: true,
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

export default function DamageReceivedPerTargetTable({
  entries,
  brushWindow,
  onAttackerClick,
}: DamageReceivedPerTargetTableProps) {
  const rows = useMemo((): AttackerRow[] => {
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
      const attackerName = entry.pilotName ?? entry.shipType ?? "Unknown";
      const shipType = entry.shipType ?? "Unknown";
      const key = `${attackerName}||${shipType}`;

      if (entry.eventType === "damage-received") {
        if (!damageMap.has(key)) damageMap.set(key, []);
        damageMap.get(key)!.push(entry);
      } else if (entry.eventType === "miss-incoming") {
        missMap.set(key, (missMap.get(key) ?? 0) + 1);
      }
    }

    const result: AttackerRow[] = [];
    for (const [key, group] of damageMap) {
      const [attackerName, shipType] = key.split("||");
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

      result.push({
        attacker: attackerName,
        shipType,
        corp,
        totalDamage,
        dps,
        hits,
        minHit,
        maxHit,
        avgHit,
        misses,
        firstHit: new Date(firstMs),
        lastHit: new Date(lastMs),
      });
    }

    result.sort((a, b) => b.totalDamage - a.totalDamage);
    return result;
  }, [entries, brushWindow]);

  if (rows.length === 0) return null;

  const subtitle = brushWindow ? "brush selection" : "full session";

  return (
    <Panel
      title={`DAMAGE RECEIVED PER ATTACKER — ${subtitle.toUpperCase()}`}
      headerAction={
        onAttackerClick ? (
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
            Click row to zoom chart
          </span>
        ) : undefined
      }
      className="mt-0"
    >
      <DataTable<AttackerRow>
        columns={COLUMNS}
        data={rows}
        defaultSortKey="totalDamage"
        defaultSortDirection="desc"
        rowKey={(row) => `${row.attacker}||${row.shipType}`}
        pageSize={20}
        emptyState={
          <span className="text-text-muted font-mono text-xs uppercase tracking-widest">
            No damage received in selection
          </span>
        }
        onRowClick={
          onAttackerClick
            ? (row) => onAttackerClick(row.firstHit as Date, row.lastHit as Date)
            : undefined
        }
      />
    </Panel>
  );
}
