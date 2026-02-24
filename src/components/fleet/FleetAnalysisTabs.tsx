"use client";

import { useState } from "react";
import FleetOverviewTab from "./FleetOverviewTab";
import { FleetSession, FleetCombatAnalysis } from "@/types/fleet";

interface FleetAnalysisTabsProps {
  sessionData: FleetSession;
  analysisReady: boolean;
}

const tabData = [
  { key: "overview", label: "Overview", component: FleetOverviewTab },
  {
    key: "damage-dealt",
    label: "Damage Dealt",
    placeholder: "Coming in Phase 2",
  },
  {
    key: "damage-taken",
    label: "Damage Taken",
    placeholder: "Coming in Phase 2",
  },
  { key: "reps", label: "Reps", placeholder: "Coming in Phase 2" },
  {
    key: "cap-pressure",
    label: "Cap Pressure",
    placeholder: "Coming in Phase 2",
  },
  {
    key: "composition",
    label: "Composition",
    placeholder: "Coming in Phase 2",
  },
];

export default function FleetAnalysisTabs({
  sessionData,
  analysisReady,
}: FleetAnalysisTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Compute FleetCombatAnalysis from sessionData
  const fleetCombatAnalysis: FleetCombatAnalysis = {
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
    enemies: [], // TODO: Compute from logs
    fightDuration: 0, // TODO: Compute from logs
  };

  if (!analysisReady) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-text-muted">
            Upload at least one log to see fleet analysis
          </p>
        </div>
        {/* Disabled tabs */}
        <div className="flex gap-2 border-b border-border">
          {tabData.map((tab) => (
            <button
              key={tab.key}
              className="px-4 py-2 text-text-muted cursor-not-allowed opacity-50"
              disabled
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const activeTabData = tabData.find((tab) => tab.key === activeTab);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border">
        {tabData.map((tab) => (
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
        {activeTab === "overview" ? (
          <FleetOverviewTab fleetCombatAnalysis={fleetCombatAnalysis} />
        ) : (
          <div className="text-center py-12">
            <p className="text-text-muted">{activeTabData?.placeholder}</p>
          </div>
        )}
      </div>
    </div>
  );
}
