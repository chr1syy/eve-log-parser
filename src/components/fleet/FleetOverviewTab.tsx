"use client";

import StatCard from "@/components/dashboard/StatCard";
import FleetParticipantsTable from "./FleetParticipantsTable";
import FleetEnemiesTable from "./FleetEnemiesTable";
import {
  FleetCombatAnalysis,
  FleetParticipant,
  EnemyStats,
} from "@/types/fleet";
import { formatNumber, formatDuration } from "@/lib/utils";

interface FleetOverviewTabProps {
  fleetCombatAnalysis: FleetCombatAnalysis;
}

export default function FleetOverviewTab({
  fleetCombatAnalysis,
}: FleetOverviewTabProps) {
  const {
    totalDamageDealt,
    totalDamageTaken,
    totalRepsGiven,
    participants,
    enemies,
    fightDuration,
  } = fleetCombatAnalysis;

  const enemyCount = enemies.length;
  const enemyKills = enemies.reduce((sum, enemy) => sum + enemy.kills, 0);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Fight Duration"
          value={formatDuration(fightDuration)}
        />
        <StatCard
          label="Total Damage Dealt"
          value={`${formatNumber(totalDamageDealt)} ISK`}
        />
        <StatCard
          label="Total Damage Received"
          value={`${formatNumber(totalDamageTaken)} ISK`}
        />
        <StatCard
          label="Total Reps Given"
          value={`${formatNumber(totalRepsGiven)} HP`}
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
