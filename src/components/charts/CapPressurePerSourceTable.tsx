"use client";

import { useMemo } from "react";
import type { LogEntry } from "@/lib/types";
import Panel from "@/components/ui/Panel";
import DataTable from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";

interface CapSourceRow {
  direction: "IN" | "OUT";
  source: string;
  module: string;
  totalGj: number;
  gjPerSecond: number;
  hits: number;
  minGj: number;
  maxGj: number;
  avgGj: number;
  zeroHits: number;
  firstHit: Date;
  lastHit: Date;
  [key: string]: unknown;
}

export interface CapPressurePerSourceTableProps {
  entries: LogEntry[];
  brushWindow: { start: Date; end: Date } | null;
  onSourceClick?: (start: Date, end: Date) => void;
}

const COLUMNS: Column<CapSourceRow>[] = [
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
    key: "totalGj",
    label: "Total GJ",
    sortable: true,
    numeric: true,
    render: (v) => (
      <span className="text-[#e58c00]">{Math.round(v as number).toLocaleString()}</span>
    ),
  },
  {
    key: "gjPerSecond",
    label: "GJ/s",
    sortable: true,
    numeric: true,
    render: (v) =>
      (v as number) > 0 ? (
        <span className="text-[#ffb347]">{(v as number).toFixed(1)}</span>
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
    key: "minGj",
    label: "Min",
    sortable: true,
    numeric: true,
    render: (v) => Math.round(v as number).toLocaleString(),
  },
  {
    key: "maxGj",
    label: "Max",
    sortable: true,
    numeric: true,
    render: (v) => Math.round(v as number).toLocaleString(),
  },
  {
    key: "avgGj",
    label: "Avg",
    sortable: true,
    numeric: true,
    render: (v) => Math.round(v as number).toLocaleString(),
  },
  {
    key: "zeroHits",
    label: "Zero Hits",
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

export default function CapPressurePerSourceTable({
  entries,
  brushWindow,
  onSourceClick,
}: CapPressurePerSourceTableProps) {
  const rows = useMemo((): CapSourceRow[] => {
    const windowedEntries =
      brushWindow !== null
        ? entries.filter(
            (e) =>
              e.timestamp >= brushWindow.start && e.timestamp <= brushWindow.end,
          )
        : entries;

    const capEntries = windowedEntries.filter(
      (e) =>
        e.capEventType === "neut-received" ||
        e.capEventType === "neut-dealt" ||
        e.capEventType === "nos-dealt",
    );
    const map = new Map<string, LogEntry[]>();

    for (const entry of capEntries) {
      const source = entry.capShipType ?? "Unknown";
      const moduleName = entry.capModule ?? "Unknown";
      const direction = entry.direction === "outgoing" ? "OUT" : "IN";
      const key = `${source}||${moduleName}||${direction}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }

    const result: CapSourceRow[] = [];
    for (const [key, group] of map) {
      const [source, module, direction] = key.split("||");
      const timestamps = group.map((e) => e.timestamp.getTime());
      const firstMs = Math.min(...timestamps);
      const lastMs = Math.max(...timestamps);
      const windowSeconds = (lastMs - firstMs) / 1000;

      const amounts = group.map((e) => e.capAmount ?? 0);
      const totalGj = amounts.reduce((a, b) => a + b, 0);
      const hits = group.length;
      const minGj = Math.min(...amounts);
      const maxGj = Math.max(...amounts);
      const avgGj = hits > 0 ? totalGj / hits : 0;
      const gjPerSecond = windowSeconds > 0 ? totalGj / windowSeconds : 0;
      const zeroHits = amounts.filter((a) => a === 0).length;

      result.push({
        direction: direction as "IN" | "OUT",
        source,
        module,
        totalGj,
        gjPerSecond,
        hits,
        minGj,
        maxGj,
        avgGj,
        zeroHits,
        firstHit: new Date(firstMs),
        lastHit: new Date(lastMs),
      });
    }

    result.sort((a, b) => b.totalGj - a.totalGj);
    return result;
  }, [entries, brushWindow]);

  if (rows.length === 0) return null;

  const subtitle = brushWindow ? "brush selection" : "full session";

  return (
    <Panel
      title={`CAP PRESSURE BY SOURCE — ${subtitle.toUpperCase()}`}
      headerAction={
        onSourceClick ? (
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
            Click row to zoom chart
          </span>
        ) : undefined
      }
      className="mt-0"
    >
      <DataTable<CapSourceRow>
        columns={COLUMNS}
        data={rows}
        defaultSortKey="totalGj"
        defaultSortDirection="desc"
        rowKey={(row) => `${row.source}||${row.module}||${row.direction}`}
        pageSize={20}
        emptyState={
          <span className="text-text-muted font-mono text-xs uppercase tracking-widest">
            No cap pressure in selection
          </span>
        }
        onRowClick={
          onSourceClick
            ? (row) => onSourceClick(row.firstHit as Date, row.lastHit as Date)
            : undefined
        }
      />
    </Panel>
  );
}
