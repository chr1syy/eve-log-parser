"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Upload, Zap } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import Panel from "@/components/ui/Panel";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import StatCard from "@/components/dashboard/StatCard";
import DataTable from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { useParsedLogs } from "@/hooks/useParsedLogs";
import { analyzeCapPressure } from "@/lib/analysis/capAnalysis";
import CapTimelineChart from "@/components/charts/CapTimelineChart";

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtOneDecimal(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

// --- Outgoing table columns ---
const outgoingColumns: Column<Record<string, unknown>>[] = [
  {
    key: "module",
    label: "Module Name",
    sortable: true,
    render: (v) => (
      <span className="font-mono text-xs text-text-primary">{String(v)}</span>
    ),
  },
  {
    key: "eventType",
    label: "Type",
    sortable: true,
    render: (v) => {
      const type = v as string;
      return (
        <Badge variant={type === "nos-dealt" ? "cyan" : "default"}>
          {type === "nos-dealt" ? "NOS" : "NEUT"}
        </Badge>
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
    key: "totalGj",
    label: "Total GJ",
    sortable: true,
    numeric: true,
    render: (v) => (
      <span className="font-mono text-xs text-cyan-glow font-bold">
        {fmt(v as number)}
      </span>
    ),
  },
  {
    key: "maxGj",
    label: "Max GJ",
    sortable: true,
    numeric: true,
    render: (v) => (
      <span className="font-mono text-xs text-gold-bright">
        {fmt(v as number)}
      </span>
    ),
  },
  {
    key: "minGj",
    label: "Min GJ",
    sortable: true,
    numeric: true,
    render: (v) => (
      <span className="font-mono text-xs text-text-secondary">
        {fmt(v as number)}
      </span>
    ),
  },
  {
    key: "avgGj",
    label: "Avg GJ",
    sortable: true,
    numeric: true,
    render: (v) => (
      <span className="font-mono text-xs text-text-secondary">
        {fmtOneDecimal(v as number)}
      </span>
    ),
  },
  {
    key: "zeroHits",
    label: "Zero Hits",
    sortable: true,
    numeric: true,
    render: (v) => {
      const count = v as number;
      return count > 0 ? (
        <span className="font-mono text-xs text-status-kill font-bold">
          {fmt(count)}
        </span>
      ) : (
        <span className="font-mono text-xs text-text-muted">—</span>
      );
    },
  },
];

// --- Incoming by ship type columns ---
const incomingShipTypeColumns: Column<Record<string, unknown>>[] = [
  {
    key: "shipType",
    label: "Ship Type",
    sortable: true,
    render: (v) => <Badge variant="default">{String(v)}</Badge>,
  },
  {
    key: "totalGjTaken",
    label: "Total GJ Taken",
    sortable: true,
    numeric: true,
    render: (v) => (
      <span className="font-mono text-xs text-status-kill font-bold">
        {fmt(v as number)}
      </span>
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
];

// --- Incoming module summary columns ---
const incomingModuleColumns: Column<Record<string, unknown>>[] = [
  {
    key: "module",
    label: "Module Name",
    sortable: true,
    render: (v) => (
      <span className="font-mono text-xs text-text-primary">{String(v)}</span>
    ),
  },
  {
    key: "hitCount",
    label: "Hit Count",
    sortable: true,
    numeric: true,
    render: (v) => (
      <span className="font-mono text-xs">{fmt(v as number)}</span>
    ),
  },
  {
    key: "totalGj",
    label: "Total GJ",
    sortable: true,
    numeric: true,
    render: (v) => (
      <span className="font-mono text-xs text-status-kill font-bold">
        {fmt(v as number)}
      </span>
    ),
  },
  {
    key: "maxGj",
    label: "Max GJ",
    sortable: true,
    numeric: true,
    render: (v) => (
      <span className="font-mono text-xs text-text-secondary">
        {fmt(v as number)}
      </span>
    ),
  },
  {
    key: "minGj",
    label: "Min GJ",
    sortable: true,
    numeric: true,
    render: (v) => (
      <span className="font-mono text-xs text-text-secondary">
        {fmt(v as number)}
      </span>
    ),
  },
  {
    key: "avgGj",
    label: "Avg GJ",
    sortable: true,
    numeric: true,
    render: (v) => (
      <span className="font-mono text-xs text-text-secondary">
        {fmtOneDecimal(v as number)}
      </span>
    ),
  },
];

export default function CapPressurePage() {
  const { activeLog } = useParsedLogs();
  const hasLogs = activeLog !== null;

  const analysis = useMemo(() => {
    if (!hasLogs) return null;
    return analyzeCapPressure(activeLog!.entries);
  }, [activeLog, hasLogs]);

  // Calculate total zero hits from outgoing nos
  const totalZeroHits = useMemo(() => {
    if (!analysis) return 0;
    return analysis.outgoingModuleSummaries
      .filter((m) => m.eventType === "nos-dealt")
      .reduce((a, m) => a + m.zeroHits, 0);
  }, [analysis]);

  // Check if there are any cap events at all
  const hasCapEvents = useMemo(() => {
    if (!analysis) return false;
    return analysis.totalGjOutgoing > 0 || analysis.totalGjNeutReceived > 0;
  }, [analysis]);

  return (
    <AppLayout title="CAP PRESSURE">
      {!hasLogs ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Panel className="text-center max-w-sm w-full">
            <div className="py-8 flex flex-col items-center gap-4">
              <div>
                <h2 className="text-text-primary font-ui font-bold uppercase tracking-widest text-lg mb-2">
                  NO LOGS PARSED
                </h2>
                <p className="text-text-muted font-mono text-sm">
                  Upload EVE combat logs to analyze capacitor pressure
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
      ) : !hasCapEvents ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Panel className="text-center max-w-sm w-full">
            <div className="py-8">
              <Zap className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <h2 className="text-text-primary font-ui font-bold uppercase tracking-widest text-lg mb-2">
                NO CAP PRESSURE DATA
              </h2>
              <p className="text-text-muted font-mono text-sm">
                No capacitor warfare events found in the parsed logs
              </p>
            </div>
          </Panel>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1 — Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="CAP NEUTED BY YOU"
              value={analysis?.totalGjNeutDealt ?? 0}
              variant="cyan"
            />
            <StatCard
              label="CAP DRAINED (NOS)"
              value={analysis?.totalGjNosDrained ?? 0}
              variant="cyan"
            />
            <StatCard
              label="CAP TAKEN FROM YOU"
              value={analysis?.totalGjNeutReceived ?? 0}
              variant="red"
            />
            <StatCard
              label="ZERO GJ NOS HITS"
              value={totalZeroHits}
              variant="gold"
            />
          </div>

          {/* Section 2 — Outgoing Neut/Nos */}
          <Panel title="OUTGOING NEUTRALIZATION SUMMARY" variant="accent">
            <DataTable
              columns={outgoingColumns}
              data={
                (analysis?.outgoingModuleSummaries ?? []) as unknown as Record<
                  string,
                  unknown
                >[]
              }
              searchable
              searchPlaceholder="SEARCH MODULES..."
              rowKey={(_, i) => String(i)}
              emptyState={
                <span className="text-text-muted font-mono text-xs uppercase tracking-widest">
                  NO OUTGOING NEUT/NOS DATA
                </span>
              }
            />
          </Panel>

          {/* Section 3 — Incoming Neut by Enemy Ship Type */}
          <Panel
            title="INCOMING NEUT BY SHIP TYPE"
            className="border-t-status-kill border-t-2"
          >
            <DataTable
              columns={incomingShipTypeColumns}
              data={
                (analysis?.incomingByShipType ?? []) as unknown as Record<
                  string,
                  unknown
                >[]
              }
              searchable
              searchPlaceholder="SEARCH SHIP TYPES..."
              rowKey={(_, i) => String(i)}
              emptyState={
                <span className="text-text-muted font-mono text-xs uppercase tracking-widest">
                  NO INCOMING NEUT DATA
                </span>
              }
            />
          </Panel>

          {/* Section 4 — Incoming Neut Timeline */}
          <Panel title="INCOMING NEUT OVER TIME">
            <CapTimelineChart timeline={analysis?.neutReceivedTimeline ?? []} />
          </Panel>

          {/* Section 5 — Incoming Neut Module Summary */}
          <Panel title="INCOMING NEUT MODULE BREAKDOWN">
            <DataTable
              columns={incomingModuleColumns}
              data={
                (analysis?.incomingModuleSummaries ?? []) as unknown as Record<
                  string,
                  unknown
                >[]
              }
              searchable
              searchPlaceholder="SEARCH MODULES..."
              rowKey={(_, i) => String(i)}
              emptyState={
                <span className="text-text-muted font-mono text-xs uppercase tracking-widest">
                  NO INCOMING MODULE DATA
                </span>
              }
            />
          </Panel>
        </div>
      )}
    </AppLayout>
  );
}
