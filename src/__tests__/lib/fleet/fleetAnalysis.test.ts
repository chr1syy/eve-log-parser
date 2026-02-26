import { describe, it, expect } from "vitest";
import {
  analyzeFleetCombat,
  aggregateDamageDealt,
  aggregateDamageTaken,
  aggregateRepFlows,
  aggregateCapPressure,
  identifyEnemies,
  calculateFightDuration,
} from "@/lib/fleet/fleetAnalysis";
import { LogEntry } from "@/lib/types";
import { FleetParticipant } from "@/types/fleet";

describe("fleetAnalysis", () => {
  const baseTime = new Date("2023-01-01T12:00:00Z");

  const mockEntries: LogEntry[] = [
    // Damage dealt by pilot1
    {
      id: "1",
      timestamp: new Date(baseTime.getTime() + 1000),
      rawLine: "damage1",
      eventType: "damage-dealt",
      amount: 100,
      fleetPilot: "Pilot1",
      pilotName: "Pilot1",
      shipType: "Typhoon",
      weapon: "Heavy Entropic Disintegrator II",
    },
    // Damage dealt by pilot2
    {
      id: "2",
      timestamp: new Date(baseTime.getTime() + 2000),
      rawLine: "damage2",
      eventType: "damage-dealt",
      amount: 150,
      fleetPilot: "Pilot2",
      pilotName: "Pilot2",
      shipType: "Tempest",
      weapon: "Nova Cruise Missile",
    },
    // Damage received by pilot1
    {
      id: "3",
      timestamp: new Date(baseTime.getTime() + 3000),
      rawLine: "damage3",
      eventType: "damage-received",
      amount: 50,
      fleetPilot: "Pilot1",
      pilotName: "Pilot1",
      shipType: "Typhoon",
    },
    // Damage received by pilot2
    {
      id: "4",
      timestamp: new Date(baseTime.getTime() + 4000),
      rawLine: "damage4",
      eventType: "damage-received",
      amount: 75,
      fleetPilot: "Pilot2",
      pilotName: "Pilot2",
      shipType: "Tempest",
    },
    // Rep given by pilot1 to pilot2
    {
      id: "5",
      timestamp: new Date(baseTime.getTime() + 5000),
      rawLine: "rep1",
      eventType: "rep-outgoing",
      amount: 200,
      fleetPilot: "Pilot1",
      pilotName: "Pilot1",
      shipType: "Typhoon",
      repShipType: "Tempest",
      repModule: "Medium Remote Armor Repairer II",
    },
    // Rep received by pilot2 from pilot1
    {
      id: "6",
      timestamp: new Date(baseTime.getTime() + 5000),
      rawLine: "rep2",
      eventType: "rep-received",
      amount: 200,
      fleetPilot: "Pilot2",
      pilotName: "Pilot2",
      shipType: "Tempest",
    },
    // Cap drained from pilot1
    {
      id: "7",
      timestamp: new Date(baseTime.getTime() + 6000),
      rawLine: "cap1",
      eventType: "neut-received",
      capAmount: 100,
      fleetPilot: "Pilot1",
      pilotName: "Pilot1",
      shipType: "Typhoon",
      capModule: "Heavy Energy Neutralizer II",
    },
    // Neut dealt by pilot1 (Pilot1 used a neutralizer on Enemy1)
    {
      id: "8",
      timestamp: new Date(baseTime.getTime() + 6000),
      rawLine: "cap2",
      eventType: "neut-dealt",
      capAmount: 100,
      fleetPilot: "Pilot1",
      pilotName: "Enemy1",
      shipType: "Confessor",
    },
    // Damage dealt by enemy1 (not in fleet)
    {
      id: "9",
      timestamp: new Date(baseTime.getTime() + 7000),
      rawLine: "enemy_damage",
      eventType: "damage-dealt",
      amount: 120,
      pilotName: "Enemy1",
      shipType: "Confessor",
      corpTicker: "ENEMY",
    },
    // Damage dealt by enemy2
    {
      id: "10",
      timestamp: new Date(baseTime.getTime() + 8000),
      rawLine: "enemy_damage2",
      eventType: "damage-dealt",
      amount: 180,
      pilotName: "Enemy2",
      shipType: "Vexor",
      corpTicker: "ENEMY",
    },
  ];

  const mockParticipants: FleetParticipant[] = [
    {
      pilotName: "Pilot1",
      shipType: "Typhoon",
      damageDealt: 0,
      damageTaken: 0,
      repsGiven: 0,
      repsTaken: 0,
      status: "active",
      logId: "log1",
    },
    {
      pilotName: "Pilot2",
      shipType: "Tempest",
      damageDealt: 0,
      damageTaken: 0,
      repsGiven: 0,
      repsTaken: 0,
      status: "active",
      logId: "log2",
    },
  ];

  describe("aggregateDamageDealt", () => {
    it("should aggregate damage dealt by pilot, target, and type", () => {
      const result = aggregateDamageDealt(mockEntries);

      expect(result.byPilot.get("Pilot1")).toBe(100);
      expect(result.byPilot.get("Pilot2")).toBe(150);
      expect(result.byTarget.get("Enemy1")).toBe(120); // entry 9: no fleetPilot, pilotName=Enemy1
      expect(result.byTarget.get("Enemy2")).toBe(180); // entry 10: no fleetPilot, pilotName=Enemy2
      expect(result.byType.get("Heavy Entropic Disintegrator II")).toBe(100);
      expect(result.byType.get("Nova Cruise Missile")).toBe(150);
    });
  });

  describe("aggregateDamageTaken", () => {
    it("should aggregate damage taken by pilot and source", () => {
      const result = aggregateDamageTaken(mockEntries);

      expect(result.byPilot.get("Pilot1")).toBe(50);
      expect(result.byPilot.get("Pilot2")).toBe(75);
      expect(result.bySource.get("Pilot1")).toBe(50); // pilotName on damage-received entry
      expect(result.bySource.get("Pilot2")).toBe(75);
    });
  });

  describe("aggregateRepFlows", () => {
    it("should aggregate repair flows and total reps given", () => {
      const result = aggregateRepFlows(mockEntries);

      expect(result.flows).toHaveLength(1);
      expect(result.flows[0]).toEqual({
        from: "Pilot1",
        to: "Tempest",
        amount: 200,
        count: 1,
      });
      expect(result.totalRepsGiven.get("Pilot1")).toBe(200);
    });
  });

  describe("aggregateCapPressure", () => {
    it("should aggregate cap drained and drainers", () => {
      const result = aggregateCapPressure(mockEntries);

      expect(result.capDrained.get("Pilot1")).toBe(100);
      expect(result.capDrainers).toContain("Pilot1"); // Pilot1 used a neutralizer
    });
  });

  describe("identifyEnemies", () => {
    it("should identify enemies not in fleet participants", () => {
      const result = identifyEnemies(mockEntries, mockParticipants);

      expect(result.enemies).toHaveLength(2);
      const enemy1 = result.enemies.find((e) => e.name === "Enemy1");
      const enemy2 = result.enemies.find((e) => e.name === "Enemy2");

      expect(enemy1?.damageDealt).toBe(120);
      expect(enemy1?.corp).toBe("ENEMY");
      expect(enemy2?.damageDealt).toBe(180);
      expect(enemy2?.kills).toBe(0); // No kills detected
    });
  });

  describe("calculateFightDuration", () => {
    it("should calculate fight duration from timestamps", () => {
      const result = calculateFightDuration(mockEntries);

      expect(result.startTime.getTime()).toBe(baseTime.getTime() + 1000);
      expect(result.endTime.getTime()).toBe(baseTime.getTime() + 8000);
      expect(result.durationSeconds).toBe(7);
    });
  });

  describe("analyzeFleetCombat", () => {
    it("should combine all aggregations into FleetCombatAnalysis", () => {
      const result = analyzeFleetCombat(mockEntries, mockParticipants);

      expect(result.damageDealt.byPilot.get("Pilot1")).toBe(100);
      expect(result.damageTaken.byPilot.get("Pilot1")).toBe(50);
      expect(result.repFlows.totalRepsGiven.get("Pilot1")).toBe(200);
      expect(result.capPressure.capDrained.get("Pilot1")).toBe(100);
      expect(result.enemies.enemies).toHaveLength(2);
      expect(result.fightDuration.durationSeconds).toBe(7);
    });

    it("should handle 3-pilot, 5-enemy scenario", () => {
      // Add more entries for larger scenario
      const extendedEntries = [
        ...mockEntries,
        // Additional pilot3
        {
          id: "11",
          timestamp: new Date(baseTime.getTime() + 9000),
          rawLine: "damage_p3",
          eventType: "damage-dealt" as const,
          amount: 200,
          fleetPilot: "Pilot3",
          pilotName: "Pilot3",
          shipType: "Apocalypse",
          weapon: "Mega Pulse Laser II",
        },
        // Additional enemies
        {
          id: "12",
          timestamp: new Date(baseTime.getTime() + 10000),
          rawLine: "enemy3",
          eventType: "damage-dealt" as const,
          amount: 90,
          pilotName: "Enemy3",
          shipType: "Thrasher",
          corpTicker: "ENEMY",
        },
        {
          id: "13",
          timestamp: new Date(baseTime.getTime() + 11000),
          rawLine: "enemy4",
          eventType: "damage-dealt" as const,
          amount: 110,
          pilotName: "Enemy4",
          shipType: "Punisher",
          corpTicker: "ENEMY",
        },
        {
          id: "14",
          timestamp: new Date(baseTime.getTime() + 12000),
          rawLine: "enemy5",
          eventType: "damage-dealt" as const,
          amount: 130,
          pilotName: "Enemy5",
          shipType: "Rifter",
          corpTicker: "ENEMY",
        },
      ];

      const extendedParticipants = [
        ...mockParticipants,
        {
          pilotName: "Pilot3",
          shipType: "Apocalypse",
          damageDealt: 0,
          damageTaken: 0,
          repsGiven: 0,
          repsTaken: 0,
          status: "active" as const,
          logId: "log3",
        },
      ];

      const result = analyzeFleetCombat(extendedEntries, extendedParticipants);

      // Verify 3 pilots damage dealt
      expect(result.damageDealt.byPilot.get("Pilot1")).toBe(100);
      expect(result.damageDealt.byPilot.get("Pilot2")).toBe(150);
      expect(result.damageDealt.byPilot.get("Pilot3")).toBe(200);

      // Verify 5 enemies identified
      expect(result.enemies.enemies).toHaveLength(5);
      const totalEnemyDamage = result.enemies.enemies.reduce(
        (sum, e) => sum + e.damageDealt,
        0,
      );
      expect(totalEnemyDamage).toBe(120 + 180 + 90 + 110 + 130); // 630
    });
  });
});
