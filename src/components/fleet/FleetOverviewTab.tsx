"use client";

import StatCard from "@/components/dashboard/StatCard";
import FleetParticipantsTable from "./FleetParticipantsTable";
import FleetEnemiesTable from "./FleetEnemiesTable";
import { FleetCombatAnalysis } from "@/types/fleet";
import { formatNumber, formatDuration } from "@/lib/utils";
import type { LogEntry } from "@/lib/types";
import { useMemo } from "react";

interface FleetOverviewTabProps {
  fleetCombatAnalysis: FleetCombatAnalysis;
  entries?: LogEntry[];
  brushWindow?: {
    start: Date;
    end: Date;
  } | null;
}

export default function FleetOverviewTab({
  fleetCombatAnalysis,
  entries,
  brushWindow,
}: FleetOverviewTabProps) {
  const scopedTotals = useMemo(() => {
    if (!brushWindow || !entries || entries.length === 0) {
      return {
        totalDamageDealt: fleetCombatAnalysis.totalDamageDealt,
        totalDamageTaken: fleetCombatAnalysis.totalDamageTaken,
        totalRepsGiven: fleetCombatAnalysis.totalRepsGiven,
      };
    }

    const windowedEntries = entries.filter(
      (entry) =>
        entry.timestamp >= brushWindow.start && entry.timestamp <= brushWindow.end,
    );

    const totalDamageDealt = windowedEntries
      .filter((entry) => entry.eventType === "damage-dealt")
      .reduce((sum, entry) => sum + (entry.amount ?? 0), 0);

    const totalDamageTaken = windowedEntries
      .filter((entry) => entry.eventType === "damage-received")
      .reduce((sum, entry) => sum + (entry.amount ?? 0), 0);

    const totalRepsGiven = windowedEntries
      .filter((entry) => entry.eventType === "rep-outgoing")
      .reduce((sum, entry) => sum + (entry.amount ?? 0), 0);

    return {
      totalDamageDealt,
      totalDamageTaken,
      totalRepsGiven,
    };
  }, [
    entries,
    brushWindow,
    fleetCombatAnalysis.totalDamageDealt,
    fleetCombatAnalysis.totalDamageTaken,
    fleetCombatAnalysis.totalRepsGiven,
  ]);

  const { participants, enemies, fightDuration } = fleetCombatAnalysis;

  const enemyCount = enemies.length;
  const enemyKills = enemies.reduce((sum, enemy) => sum + enemy.kills, 0);

  return (
    <div className="space-y-6">
      {brushWindow ? (
        <p className="text-text-muted text-xs font-medium">Showing zoomed selection</p>
      ) : null}
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Fight Duration"
          value={formatDuration(fightDuration)}
        />
        <StatCard
          label="Total Damage Dealt"
          value={`${formatNumber(scopedTotals.totalDamageDealt)} HP`}
        />
        <StatCard
          label="Total Damage Received"
          value={`${formatNumber(scopedTotals.totalDamageTaken)} HP`}
        />
        <StatCard
          label="Total Reps Given"
          value={`${formatNumber(scopedTotals.totalRepsGiven)} HP`}
        />
        <StatCard label="Enemy Count" value={`${enemyCount} enemies`} />
        <StatCard label="Enemy Kills" value={`${enemyKills} killed`} />
      </div>

      {/* Participants Table */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Fleet Participants
        </h3>
        <FleetParticipantsTable participants={participants} />
      </div>

      {/* Enemies Table */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Fleet Enemies
        </h3>
        <FleetEnemiesTable enemies={enemies} />
      </div>
    </div>
  );
}
