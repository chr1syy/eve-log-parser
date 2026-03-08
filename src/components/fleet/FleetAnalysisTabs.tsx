"use client";

import { useMemo, useState } from "react";
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
import FleetOverviewTab from "./FleetOverviewTab";
import FleetDamageDealtContent from "./FleetDamageDealtContent";
import FleetDamageTakenContent from "./FleetDamageTakenContent";
import Button from "@/components/ui/Button";
import {
  FleetSession,
  FleetCombatAnalysis,
  FleetParticipant,
} from "@/types/fleet";
import type { LogEntry } from "@/lib/types";
import { formatLogTime, formatNumber } from "@/lib/utils";

interface FleetAnalysisTabsProps {
  sessionData: FleetSession;
  analysisReady: boolean;
  /** Merged LogEntry array from all uploaded pilot logs (timestamps already revived as Dates). */
  entries?: LogEntry[];
}

type BrushWindow = {
  start: Date;
  end: Date;
};

// ── Colour palette for per-pilot lines (re-used) ───────────────────────────────

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

function computePerPilotReps(
  entries: LogEntry[],
  bucketSecs = 30,
): { data: Record<string, unknown>[]; pilots: string[] } {
  const repEntries = entries.filter((e) => e.eventType === "rep-received");
  if (repEntries.length === 0) return { data: [], pilots: [] };

  const pilotsSet = new Set<string>();
  for (const e of repEntries) {
    if (e.fleetPilot ?? e.pilotName)
      pilotsSet.add(e.fleetPilot ?? e.pilotName ?? "Unknown");
  }
  const pilots = Array.from(pilotsSet).sort();

  const times = repEntries.map((e) => e.timestamp.getTime());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const bucketMs = bucketSecs * 1000;

  const buckets = new Map<number, Map<string, number>>();
  for (const entry of repEntries) {
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
      label: formatLogTime(t),
    };
    const m = buckets.get(t);
    for (const pilot of pilots) {
      // convert total rep amount in bucket to reps-per-second
      point[pilot] = m ? Math.round((m.get(pilot) ?? 0) / bucketSecs) : 0;
    }
    data.push(point);
  }

  return { data, pilots };
}

// ── Reps Tab ──────────────────────────────────────────────────────────────────

function RepsTab({
  participants,
  entries,
  brushWindow,
}: {
  participants: FleetParticipant[];
  entries: LogEntry[];
  brushWindow?: BrushWindow | null;
}) {
  const windowedEntries = useMemo(() => {
    if (!brushWindow) return entries;
    return entries.filter(
      (e) =>
        e.timestamp >= brushWindow.start && e.timestamp <= brushWindow.end,
    );
  }, [entries, brushWindow]);

  const pilotStats = useMemo(() => {
    const byPilot = new Map<
      string,
      { pilotName: string; shipType: string; repsGiven: number; repsTaken: number }
    >();
    const lookupByPilot = new Map(
      participants.map((p) => [p.pilotName, p.shipType]),
    );

    const addPilot = (name: string): void => {
      if (!byPilot.has(name)) {
        byPilot.set(name, {
          pilotName: name,
          shipType: lookupByPilot.get(name) || "Unknown",
          repsGiven: 0,
          repsTaken: 0,
        });
      }
    };

    for (const entry of windowedEntries) {
      const amount = entry.amount ?? 0;
      if (entry.eventType === "rep-outgoing") {
        const pilot = entry.fleetPilot ?? entry.pilotName ?? "Unknown";
        addPilot(pilot);
        byPilot.get(pilot)!.repsGiven += amount;
      }

      if (entry.eventType === "rep-received") {
        const pilot = entry.fleetPilot ?? entry.pilotName ?? "Unknown";
        addPilot(pilot);
        byPilot.get(pilot)!.repsTaken += amount;
      }
    }

    const repRows = [...byPilot.values()].filter(
      (p) => p.repsGiven > 0 || p.repsTaken > 0,
    );
    const sorted = repRows.sort((a, b) => b.repsGiven - a.repsGiven);

    const computedTotalGiven = sorted.reduce((sum, p) => sum + p.repsGiven, 0);
    return { sorted, computedTotalGiven };
  }, [windowedEntries, participants]);

  const { sorted, computedTotalGiven } = pilotStats;

  // Preserve chart behaviour on full timeline for now; Reps analysis stays zoom-aware.
  const { data: repsChartData, pilots: repsPilots } = useMemo(
    () => computePerPilotReps(entries),
    [entries],
  );

  if (sorted.length === 0) {
    return (
      <p className="text-text-muted text-center py-12">
        No remote repair events recorded. Upload combat logs with rep activity
        to populate this view.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {repsChartData.length > 0 && (
        <div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart
              data={repsChartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="label"
                tick={{
                  fill: "#8899aa",
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{
                  fill: "#8899aa",
                  fontSize: 11,
                  fontFamily: "monospace",
                }}
                label={{
                  value: "Reps/s",
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
                  `${Number(value).toLocaleString()} reps/s`,
                  name ?? "",
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, fontFamily: "monospace" }}
              />
              {repsPilots.map((pilot, i) => (
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
        </div>
      )}
      {sorted.map((p) => {
        const pct =
          computedTotalGiven > 0 ? (p.repsGiven / computedTotalGiven) * 100 : 0;
        return (
          <div
            key={p.pilotName}
            className="bg-bg-secondary border border-border rounded px-4 py-3"
          >
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="font-medium text-text-primary">
                  {p.pilotName}
                </span>
                {p.shipType && (
                  <span className="ml-2 text-xs text-text-muted">
                    {p.shipType}
                  </span>
                )}
              </div>
              <div className="flex gap-4 text-right text-sm">
                <span className="text-green-400">
                  ↑ {formatNumber(p.repsGiven)}{" "}
                  <span className="text-xs text-text-muted">given</span>
                </span>
                <span className="text-blue-400">
                  ↓ {formatNumber(p.repsTaken)}{" "}
                  <span className="text-xs text-text-muted">taken</span>
                </span>
              </div>
            </div>
            {p.repsGiven > 0 && (
              <div className="w-full bg-bg-primary rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
      <div className="flex justify-between text-xs text-text-muted pt-1 px-1">
        <span>Total reps given</span>
        <span className="font-mono">{formatNumber(computedTotalGiven)}</span>
      </div>
    </div>
  );
}

// ── Cap Pressure Tab ──────────────────────────────────────────────────────────

function CapPressureTab({
  participants,
}: {
  participants: FleetParticipant[];
}) {
  return (
    <div className="space-y-4">
      <p className="text-text-muted text-center py-12">
        No energy neutralizer events detected in the uploaded logs.
        <br />
        <span className="text-xs mt-1 block">
          Cap events are extracted from combat logs — make sure logs include
          neut activity.
        </span>
      </p>
      {participants.length > 0 && (
        <div className="border border-border rounded p-4 text-sm text-text-muted">
          <p className="font-medium text-text-primary mb-1">
            Pilots in this session
          </p>
          <ul className="space-y-1">
            {participants.map((p) => (
              <li key={p.pilotName} className="flex justify-between">
                <span>{p.pilotName}</span>
                <span className="text-xs">{p.shipType || "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Composition Tab ───────────────────────────────────────────────────────────

function CompositionTab({
  participants,
}: {
  participants: FleetParticipant[];
}) {
  if (participants.length === 0) {
    return (
      <p className="text-text-muted text-center py-12">
        No participants yet. Upload logs to see fleet composition.
      </p>
    );
  }

  const shipGroups = participants.reduce<Record<string, FleetParticipant[]>>(
    (acc, p) => {
      const ship = p.shipType || "Unknown";
      if (!acc[ship]) acc[ship] = [];
      acc[ship].push(p);
      return acc;
    },
    {},
  );

  const sorted = Object.entries(shipGroups).sort(
    (a, b) => b[1].length - a[1].length,
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sorted.map(([ship, pilots]) => {
          const totalDmg = pilots.reduce((s, p) => s + p.damageDealt, 0);
          const totalReps = pilots.reduce((s, p) => s + p.repsGiven, 0);
          return (
            <div
              key={ship}
              className="bg-bg-secondary border border-border rounded p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-text-primary">{ship}</span>
                <span className="text-xs bg-bg-primary border border-border rounded px-2 py-0.5 font-mono">
                  ×{pilots.length}
                </span>
              </div>
              <ul className="text-xs text-text-muted space-y-0.5 mb-2">
                {pilots.map((p) => (
                  <li key={p.pilotName}>{p.pilotName}</li>
                ))}
              </ul>
              <div className="flex gap-4 text-xs text-text-muted border-t border-border pt-2 mt-2">
                <span>
                  DMG:{" "}
                  <span className="text-text-primary font-mono">
                    {formatNumber(totalDmg)}
                  </span>
                </span>
                <span>
                  Reps:{" "}
                  <span className="text-text-primary font-mono">
                    {formatNumber(totalReps)}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-text-muted text-right">
        {participants.length} pilots · {Object.keys(shipGroups).length} ship
        types
      </div>
    </div>
  );
}

// ── Tab registry ──────────────────────────────────────────────────────────────

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "damage-dealt", label: "Damage Dealt" },
  { key: "damage-taken", label: "Damage Taken" },
  { key: "reps", label: "Reps" },
  { key: "cap-pressure", label: "Cap Pressure" },
  { key: "composition", label: "Composition" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ── Main component ────────────────────────────────────────────────────────────

export default function FleetAnalysisTabs({
  sessionData,
  analysisReady,
  entries = [],
}: FleetAnalysisTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [brushWindow, setBrushWindow] = useState<BrushWindow | null>(null);
  const [brushResetKey, setBrushResetKey] = useState(0);
  const [initialBrushWindow, setInitialBrushWindow] = useState<BrushWindow | null>(
    null,
  );

  const handleBrushChange = (start: Date, end: Date) => {
    setBrushWindow({ start, end });
    setInitialBrushWindow({ start, end });
  };

  const handleResetBrush = () => {
    setBrushWindow(null);
    setInitialBrushWindow(null);
    setBrushResetKey((v) => v + 1);
  };

  const fleetCombatAnalysis: FleetCombatAnalysis = useMemo(
    () => ({
      totalDamageDealt: sessionData.participants.reduce(
        (sum, p) => sum + p.damageDealt,
        0,
      ),
      totalDamageTaken: sessionData.participants.reduce(
        (sum, p) => sum + p.damageTaken,
        0,
      ),
      totalRepsGiven: sessionData.participants.reduce(
        (sum, p) => sum + p.repsGiven,
        0,
      ),
      participants: sessionData.participants,
      enemies: [],
      fightDuration: 0,
    }),
    [sessionData.participants],
  );

  return (
    <div className="space-y-6">
      {!analysisReady && (
        <div className="text-center py-2">
          <p className="text-text-muted">
            Upload logs to populate fleet analysis metrics
          </p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border flex-wrap justify-between">
        <div className="flex gap-2 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`px-4 py-2 ${
                activeTab === tab.key
                  ? "text-text-primary border-b-2 border-accent"
                  : "text-text-muted hover:text-text-primary"
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {brushWindow !== null && (
          <Button
            variant="secondary"
            onClick={handleResetBrush}
            className="text-xs mt-2"
          >
            {`Zoomed: ${formatLogTime(brushWindow.start)} – ${formatLogTime(brushWindow.end)} · Reset Zoom`}
          </Button>
        )}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && (
          <FleetOverviewTab
            fleetCombatAnalysis={fleetCombatAnalysis}
            entries={entries}
            brushWindow={brushWindow}
          />
        )}
        {activeTab === "damage-dealt" && (
          <FleetDamageDealtContent
            entries={entries}
            brushWindow={brushWindow}
            onBrushChange={handleBrushChange}
            brushResetKey={brushResetKey}
            initialBrushWindow={initialBrushWindow}
          />
        )}
        {activeTab === "damage-taken" && (
          <FleetDamageTakenContent
            entries={entries}
            brushWindow={brushWindow}
            onBrushChange={handleBrushChange}
            brushResetKey={brushResetKey}
            initialBrushWindow={initialBrushWindow}
          />
        )}
        {activeTab === "reps" && (
          <RepsTab
            participants={fleetCombatAnalysis.participants}
            entries={entries}
            brushWindow={brushWindow}
          />
        )}
        {activeTab === "cap-pressure" && (
          <CapPressureTab participants={fleetCombatAnalysis.participants} />
        )}
        {activeTab === "composition" && (
          <CompositionTab participants={fleetCombatAnalysis.participants} />
        )}
      </div>
    </div>
  );
}
