"use client";

import { useMemo, useState } from "react";
import FleetOverviewTab from "./FleetOverviewTab";
import FleetDamageDealtContent from "./FleetDamageDealtContent";
import FleetDamageTakenContent from "./FleetDamageTakenContent";
import { FleetSession, FleetCombatAnalysis, FleetParticipant } from "@/types/fleet";
import type { LogEntry } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface FleetAnalysisTabsProps {
  sessionData: FleetSession;
  analysisReady: boolean;
  /** Merged LogEntry array from all uploaded pilot logs (timestamps already revived as Dates). */
  entries?: LogEntry[];
}

// ── Reps Tab ──────────────────────────────────────────────────────────────────

function RepsTab({ participants, totalGiven }: { participants: FleetParticipant[]; totalGiven: number }) {
  const withReps = participants.filter((p) => p.repsGiven > 0 || p.repsTaken > 0);
  const sorted = [...withReps].sort((a, b) => b.repsGiven - a.repsGiven);

  if (sorted.length === 0) {
    return <p className="text-text-muted text-center py-12">No remote repair events recorded. Upload combat logs with rep activity to populate this view.</p>;
  }

  return (
    <div className="space-y-2">
      {sorted.map((p) => {
        const pct = totalGiven > 0 ? (p.repsGiven / totalGiven) * 100 : 0;
        return (
          <div key={p.pilotName} className="bg-bg-secondary border border-border rounded px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="font-medium text-text-primary">{p.pilotName}</span>
                {p.shipType && <span className="ml-2 text-xs text-text-muted">{p.shipType}</span>}
              </div>
              <div className="flex gap-4 text-right text-sm">
                <span className="text-green-400">
                  ↑ {formatNumber(p.repsGiven)} <span className="text-xs text-text-muted">given</span>
                </span>
                <span className="text-blue-400">
                  ↓ {formatNumber(p.repsTaken)} <span className="text-xs text-text-muted">taken</span>
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
        <span className="font-mono">{formatNumber(totalGiven)}</span>
      </div>
    </div>
  );
}

// ── Cap Pressure Tab ──────────────────────────────────────────────────────────

function CapPressureTab({ participants }: { participants: FleetParticipant[] }) {
  return (
    <div className="space-y-4">
      <p className="text-text-muted text-center py-12">
        No energy neutralizer events detected in the uploaded logs.
        <br />
        <span className="text-xs mt-1 block">
          Cap events are extracted from combat logs — make sure logs include neut activity.
        </span>
      </p>
      {participants.length > 0 && (
        <div className="border border-border rounded p-4 text-sm text-text-muted">
          <p className="font-medium text-text-primary mb-1">Pilots in this session</p>
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

function CompositionTab({ participants }: { participants: FleetParticipant[] }) {
  if (participants.length === 0) {
    return <p className="text-text-muted text-center py-12">No participants yet. Upload logs to see fleet composition.</p>;
  }

  const shipGroups = participants.reduce<Record<string, FleetParticipant[]>>((acc, p) => {
    const ship = p.shipType || "Unknown";
    if (!acc[ship]) acc[ship] = [];
    acc[ship].push(p);
    return acc;
  }, {});

  const sorted = Object.entries(shipGroups).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sorted.map(([ship, pilots]) => {
          const totalDmg = pilots.reduce((s, p) => s + p.damageDealt, 0);
          const totalReps = pilots.reduce((s, p) => s + p.repsGiven, 0);
          return (
            <div key={ship} className="bg-bg-secondary border border-border rounded p-4">
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
                <span>DMG: <span className="text-text-primary font-mono">{formatNumber(totalDmg)}</span></span>
                <span>Reps: <span className="text-text-primary font-mono">{formatNumber(totalReps)}</span></span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-xs text-text-muted text-right">
        {participants.length} pilots · {Object.keys(shipGroups).length} ship types
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

  const fleetCombatAnalysis: FleetCombatAnalysis = useMemo(() => ({
    totalDamageDealt: sessionData.participants.reduce((sum, p) => sum + p.damageDealt, 0),
    totalDamageTaken: sessionData.participants.reduce((sum, p) => sum + p.damageTaken, 0),
    totalRepsGiven: sessionData.participants.reduce((sum, p) => sum + p.repsGiven, 0),
    participants: sessionData.participants,
    enemies: [],
    fightDuration: 0,
  }), [sessionData.participants]);

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
      <div className="flex gap-2 border-b border-border flex-wrap">
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

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && (
          <FleetOverviewTab fleetCombatAnalysis={fleetCombatAnalysis} />
        )}
        {activeTab === "damage-dealt" && (
          <FleetDamageDealtContent entries={entries} />
        )}
        {activeTab === "damage-taken" && (
          <FleetDamageTakenContent entries={entries} />
        )}
        {activeTab === "reps" && (
          <RepsTab
            participants={fleetCombatAnalysis.participants}
            totalGiven={fleetCombatAnalysis.totalRepsGiven}
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
