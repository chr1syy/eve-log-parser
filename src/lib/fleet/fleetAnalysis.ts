import { LogEntry } from "@/lib/types";
import { FleetParticipant } from "@/types/fleet";

export interface DamageDealtAggregation {
  byPilot: Map<string, number>;
  byTarget: Map<string, number>;
  byType: Map<string, number>; // damageType if available, else weapon
}

export interface DamageTakenAggregation {
  byPilot: Map<string, number>;
  bySource: Map<string, number>;
}

export interface RepFlow {
  from: string;
  to: string;
  amount: number;
  count: number;
}

export interface RepFlowsAggregation {
  flows: RepFlow[];
  totalRepsGiven: Map<string, number>;
}

export interface CapPressureAggregation {
  capDrained: Map<string, number>;
  capDrainers: string[];
}

export interface EnemyStats {
  name: string;
  corp?: string;
  damageDealt: number;
  damageReceived: number;
  kills: number;
}

export interface EnemiesAggregation {
  enemies: EnemyStats[];
}

export interface FightDuration {
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
}

export interface FleetCombatAnalysis {
  damageDealt: DamageDealtAggregation;
  damageTaken: DamageTakenAggregation;
  repFlows: RepFlowsAggregation;
  capPressure: CapPressureAggregation;
  enemies: EnemiesAggregation;
  fightDuration: FightDuration;
}

export function analyzeFleetCombat(
  mergedEntries: LogEntry[],
  participants: FleetParticipant[],
): FleetCombatAnalysis {
  return {
    damageDealt: aggregateDamageDealt(mergedEntries),
    damageTaken: aggregateDamageTaken(mergedEntries),
    repFlows: aggregateRepFlows(mergedEntries),
    capPressure: aggregateCapPressure(mergedEntries),
    enemies: identifyEnemies(mergedEntries, participants),
    fightDuration: calculateFightDuration(mergedEntries),
  };
}

export function aggregateDamageDealt(
  entries: LogEntry[],
): DamageDealtAggregation {
  const byPilot = new Map<string, number>();
  const byTarget = new Map<string, number>();
  const byType = new Map<string, number>();

  for (const entry of entries) {
    if (entry.eventType === "damage-dealt" && entry.amount) {
      const pilot = entry.pilotName || "Unknown";
      const target = entry.shipType || "Unknown"; // assuming target is shipType for now
      const type = entry.weapon || "Unknown";

      byPilot.set(pilot, (byPilot.get(pilot) || 0) + entry.amount);
      byTarget.set(target, (byTarget.get(target) || 0) + entry.amount);
      byType.set(type, (byType.get(type) || 0) + entry.amount);
    }
  }

  return { byPilot, byTarget, byType };
}

export function aggregateDamageTaken(
  entries: LogEntry[],
): DamageTakenAggregation {
  const byPilot = new Map<string, number>();
  const bySource = new Map<string, number>();

  for (const entry of entries) {
    if (entry.eventType === "damage-received" && entry.amount) {
      const pilot = entry.pilotName || "Unknown";
      const source = entry.shipType || "Unknown"; // source shipType

      byPilot.set(pilot, (byPilot.get(pilot) || 0) + entry.amount);
      bySource.set(source, (bySource.get(source) || 0) + entry.amount);
    }
  }

  return { byPilot, bySource };
}

export function aggregateRepFlows(entries: LogEntry[]): RepFlowsAggregation {
  const flows = new Map<string, RepFlow>();
  const totalRepsGiven = new Map<string, number>();

  for (const entry of entries) {
    if (entry.eventType === "rep-outgoing" && entry.amount) {
      const from = entry.pilotName || "Unknown";
      const to = entry.repShipType || entry.shipType || "Unknown";
      const key = `${from}-${to}`;

      const existing = flows.get(key) || { from, to, amount: 0, count: 0 };
      existing.amount += entry.amount;
      existing.count += 1;
      flows.set(key, existing);

      totalRepsGiven.set(from, (totalRepsGiven.get(from) || 0) + entry.amount);
    }
  }

  return { flows: Array.from(flows.values()), totalRepsGiven };
}

export function aggregateCapPressure(
  entries: LogEntry[],
): CapPressureAggregation {
  const capDrained = new Map<string, number>();
  const capDrainers = new Set<string>();

  for (const entry of entries) {
    if (entry.eventType === "neut-received" && entry.capAmount) {
      const pilot = entry.pilotName || "Unknown";
      capDrained.set(pilot, (capDrained.get(pilot) || 0) + entry.capAmount);
    }
    if (entry.eventType === "neut-dealt") {
      const drainer = entry.pilotName || "Unknown";
      capDrainers.add(drainer);
    }
  }

  return { capDrained, capDrainers: Array.from(capDrainers) };
}

export function identifyEnemies(
  entries: LogEntry[],
  participants: FleetParticipant[],
): EnemiesAggregation {
  const fleetPilots = new Set(participants.map((p) => p.pilotName));
  const enemyStats = new Map<string, EnemyStats>();

  for (const entry of entries) {
    if (
      entry.eventType === "damage-dealt" &&
      entry.pilotName &&
      !fleetPilots.has(entry.pilotName)
    ) {
      const enemy = enemyStats.get(entry.pilotName) || {
        name: entry.pilotName,
        corp: entry.corpTicker,
        damageDealt: 0,
        damageReceived: 0,
        kills: 0,
      };
      enemy.damageDealt += entry.amount || 0;
      enemyStats.set(entry.pilotName, enemy);
    }
    if (
      entry.eventType === "damage-received" &&
      entry.pilotName &&
      !fleetPilots.has(entry.pilotName)
    ) {
      const enemy = enemyStats.get(entry.pilotName) || {
        name: entry.pilotName,
        corp: entry.corpTicker,
        damageDealt: 0,
        damageReceived: 0,
        kills: 0,
      };
      enemy.damageReceived += entry.amount || 0;
      enemyStats.set(entry.pilotName, enemy);
    }
    // For kills, assuming some event indicates pod destruction, but not implemented yet
  }

  return { enemies: Array.from(enemyStats.values()) };
}

export function calculateFightDuration(entries: LogEntry[]): FightDuration {
  if (entries.length === 0) {
    return { startTime: new Date(), endTime: new Date(), durationSeconds: 0 };
  }

  const timestamps = entries.map((e) => e.timestamp.getTime());
  const startTime = new Date(Math.min(...timestamps));
  const endTime = new Date(Math.max(...timestamps));
  const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

  return { startTime, endTime, durationSeconds };
}
