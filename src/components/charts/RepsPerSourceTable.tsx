"use client";

import { useMemo } from "react";
import type { LogEntry } from "@/lib/types";
import Panel from "@/components/ui/Panel";
import DataTable from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";

interface RepSourceRow {
  source: string;
  module: string;
  direction: "IN" | "OUT";
  type: "BOT" | "SHIP";
  totalRepaired: number;
  repsPerSecond: number;
  hits: number;
  minRep: number;
  maxRep: number;
  avgRep: number;
  firstRep: Date;
  lastRep: Date;
  [key: string]: unknown;
}

export interface RepsPerSourceTableProps {
  entries: LogEntry[];
  brushWindow: { start: Date; end: Date } | null;
  onSourceClick?: (start: Date, end: Date) => void;
}

const COLUMNS: Column<RepSourceRow>[] = [
  {
    key: "source",
    label: "Source / Module",
    sortable: true,
    render: (_v, row) => (
      <div>
        <div className="text-text-primary font-mono text-xs leading-snug">
          {row.source}
        </div>
        <div className="text-text-muted font-mono text-[10px] leading-snug">
          {row.module}
        </div>
      </div>
    ),
  },
  {
    key: "direction",
    label: "Dir",
    sortable: true,
    width: "56px",
    render: (v) => (
      <span className="font-mono text-xs text-text-secondary">{v as string}</span>
    ),
  },
  {
    key: "type",
    label: "Type",
    sortable: true,
    width: "72px",
    render: (v) => (
      <span className="font-mono text-xs text-text-secondary">{v as string}</span>
    ),
  },
  {
    key: "totalRepaired",
    label: "Total Rep",
    sortable: true,
    numeric: true,
    render: (v) => (
      <span className="text-[#66cc66]">{Math.round(v as number).toLocaleString()}</span>
    ),
  },
  {
    key: "repsPerSecond",
    label: "Rep/s",
    sortable: true,
    numeric: true,
    render: (v) =>
      (v as number) > 0 ? (
        <span className="text-[#7ddf7d]">{(v as number).toFixed(1)}</span>
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
    key: "minRep",
    label: "Min",
    sortable: true,
    numeric: true,
    render: (v) => (
      <span className="text-[#66cc66]">{Math.round(v as number).toLocaleString()}</span>
    ),
  },
  {
    key: "maxRep",
    label: "Max",
    sortable: true,
    numeric: true,
    render: (v) => (
      <span className="text-[#00d4ff]">{Math.round(v as number).toLocaleString()}</span>
    ),
  },
  {
    key: "avgRep",
    label: "Avg",
    sortable: true,
    numeric: true,
    render: (v) => Math.round(v as number).toLocaleString(),
  },
];

export default function RepsPerSourceTable({
  entries,
  brushWindow,
  onSourceClick,
}: RepsPerSourceTableProps) {
  const rows = useMemo((): RepSourceRow[] => {
    const windowedEntries =
      brushWindow !== null
        ? entries.filter(
            (e) =>
              e.timestamp >= brushWindow.start && e.timestamp <= brushWindow.end,
          )
        : entries;

    const repEntries = windowedEntries.filter(
      (e) => e.eventType === "rep-received" || e.eventType === "rep-outgoing",
    );
    const map = new Map<string, LogEntry[]>();

    for (const entry of repEntries) {
      const source = entry.repShipType ?? "Unknown";
      const moduleName = entry.repModule ?? "Unknown";
      const direction = entry.eventType === "rep-outgoing" ? "OUT" : "IN";
      const key = `${source}||${moduleName}||${direction}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }

    const result: RepSourceRow[] = [];
    for (const [key, group] of map) {
      const [source, module, direction] = key.split("||");
      const timestamps = group.map((e) => e.timestamp.getTime());
      const firstMs = Math.min(...timestamps);
      const lastMs = Math.max(...timestamps);
      const windowSeconds = (lastMs - firstMs) / 1000;

      const amounts = group.map((e) => e.amount ?? 0);
      const totalRepaired = amounts.reduce((a, b) => a + b, 0);
      const hits = group.length;
      const minRep = Math.min(...amounts);
      const maxRep = Math.max(...amounts);
      const avgRep = hits > 0 ? totalRepaired / hits : 0;
      const repsPerSecond = windowSeconds > 0 ? totalRepaired / windowSeconds : 0;
      const type = group.some((e) => e.isRepBot) ? "BOT" : "SHIP";

      result.push({
        source,
        module,
        direction: direction as "IN" | "OUT",
        type,
        totalRepaired,
        repsPerSecond,
        hits,
        minRep,
        maxRep,
        avgRep,
        firstRep: new Date(firstMs),
        lastRep: new Date(lastMs),
      });
    }

    result.sort((a, b) => b.totalRepaired - a.totalRepaired);
    return result;
  }, [entries, brushWindow]);

  if (rows.length === 0) return null;

  const subtitle = brushWindow ? "brush selection" : "full session";

  return (
    <Panel
      title={`REPS BY SOURCE — ${subtitle.toUpperCase()}`}
      headerAction={
        onSourceClick ? (
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
            Click row to zoom chart
          </span>
        ) : undefined
      }
      className="mt-0"
    >
      <DataTable<RepSourceRow>
        columns={COLUMNS}
        data={rows}
        defaultSortKey="totalRepaired"
        defaultSortDirection="desc"
        rowKey={(row) => `${row.source}||${row.module}||${row.direction}`}
        pageSize={20}
        emptyState={
          <span className="text-text-muted font-mono text-xs uppercase tracking-widest">
            No reps in selection
          </span>
        }
        onRowClick={
          onSourceClick
            ? (row) => onSourceClick(row.firstRep as Date, row.lastRep as Date)
            : undefined
        }
      />
    </Panel>
  );
}
