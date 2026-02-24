import { describe, it, expect } from "vitest";
import { analyzeFleetCombat } from "@/lib/fleet/fleetAnalysis";
import { calculateParticipantStats } from "@/lib/fleet/participantStats";
import { mergeFleetLogs, FleetLogData } from "@/lib/fleet/logMerging";
import { LogEntry } from "@/lib/types";
import { FleetParticipant } from "@/types/fleet";

describe("fleet/data-consistency", () => {
  // Mock 3-pilot logs with overlapping timestamps
  const baseTime = new Date("2023-01-01T12:00:00Z");

  const mockLog1: FleetLogData = {
    pilot: "Pilot1",
    shipType: "Typhoon",
    entries: [
      // Damage dealt by Pilot1
      {
        id: "1",
        timestamp: new Date(baseTime.getTime() + 1000),
        rawLine:
          "[ 2023.01.01 12:00:01 ] (combat) 100 from Pilot1 - Heavy Entropic Disintegrator II - Hits",
        eventType: "damage-dealt",
        amount: 100,
        pilotName: "Pilot1",
        shipType: "Typhoon",
        weapon: "Heavy Entropic Disintegrator II",
      },
      // Damage received by Pilot1
      {
        id: "2",
        timestamp: new Date(baseTime.getTime() + 2000),
        rawLine:
          "[ 2023.01.01 12:00:02 ] (combat) 50 to Pilot1 - Enemy Turret - Hits",
        eventType: "damage-received",
        amount: 50,
        pilotName: "Pilot1",
        shipType: "Typhoon",
      },
      // Rep given by Pilot1 to Pilot2
      {
        id: "3",
        timestamp: new Date(baseTime.getTime() + 3000),
        rawLine:
          "[ 2023.01.01 12:00:03 ] (combat) 200 from Pilot1 to Pilot2 - Medium Remote Armor Repairer II",
        eventType: "rep-outgoing",
        amount: 200,
        pilotName: "Pilot1",
        shipType: "Typhoon",
        repModule: "Medium Remote Armor Repairer II",
      },
      // Rep received by Pilot1 from Pilot3
      {
        id: "4",
        timestamp: new Date(baseTime.getTime() + 4000),
        rawLine:
          "[ 2023.01.01 12:00:04 ] (combat) 150 to Pilot1 from Pilot3 - Large Remote Armor Repairer II",
        eventType: "rep-received",
        amount: 150,
        pilotName: "Pilot1",
        shipType: "Typhoon",
      },
    ],
  };

  const mockLog2: FleetLogData = {
    pilot: "Pilot2",
    shipType: "Tempest",
    entries: [
      // Damage dealt by Pilot2
      {
        id: "5",
        timestamp: new Date(baseTime.getTime() + 1500),
        rawLine:
          "[ 2023.01.01 12:00:01 ] (combat) 80 from Pilot2 - Nova Cruise Missile - Hits",
        eventType: "damage-dealt",
        amount: 80,
        pilotName: "Pilot2",
        shipType: "Tempest",
        weapon: "Nova Cruise Missile",
      },
      // Rep received by Pilot2 from Pilot1
      {
        id: "6",
        timestamp: new Date(baseTime.getTime() + 3000),
        rawLine:
          "[ 2023.01.01 12:00:03 ] (combat) 200 to Pilot2 from Pilot1 - Medium Remote Armor Repairer II",
        eventType: "rep-received",
        amount: 200,
        pilotName: "Pilot2",
        shipType: "Tempest",
      },
    ],
  };

  const mockLog3: FleetLogData = {
    pilot: "Pilot3",
    shipType: "Apocalypse",
    entries: [
      // Damage dealt by Pilot3
      {
        id: "7",
        timestamp: new Date(baseTime.getTime() + 2500),
        rawLine:
          "[ 2023.01.01 12:00:02 ] (combat) 120 from Pilot3 - Mega Pulse Laser II - Hits",
        eventType: "damage-dealt",
        amount: 120,
        pilotName: "Pilot3",
        shipType: "Apocalypse",
        weapon: "Mega Pulse Laser II",
      },
      // Rep given by Pilot3 to Pilot1
      {
        id: "8",
        timestamp: new Date(baseTime.getTime() + 4000),
        rawLine:
          "[ 2023.01.01 12:00:04 ] (combat) Pilot3 repairing Pilot1 for 150 - Large Remote Armor Repairer II",
        eventType: "rep-outgoing",
        amount: 150,
        pilotName: "Pilot3",
        shipType: "Apocalypse",
        repModule: "Large Remote Armor Repairer II",
      },
    ],
  };

  const mockParticipants: FleetParticipant[] = [
    {
      pilotName: "Pilot1",
      shipType: "Typhoon",
      damageDealt: 0,
      damageTaken: 0,
      repsGiven: 0,
      repsTaken: 0,
      status: "pending",
      logId: "log1",
    },
    {
      pilotName: "Pilot2",
      shipType: "Tempest",
      damageDealt: 0,
      damageTaken: 0,
      repsGiven: 0,
      repsTaken: 0,
      status: "pending",
      logId: "log2",
    },
    {
      pilotName: "Pilot3",
      shipType: "Apocalypse",
      damageDealt: 0,
      damageTaken: 0,
      repsGiven: 0,
      repsTaken: 0,
      status: "pending",
      logId: "log3",
    },
  ];

  describe("participant stats aggregation", () => {
    it("should have sum of participant.damageDealt equal totalDamageDealt in analysis", () => {
      const mergedEntries = mergeFleetLogs([mockLog1, mockLog2, mockLog3]);
      const participantStats = calculateParticipantStats(
        mergedEntries,
        mockParticipants,
      );
      const analysis = analyzeFleetCombat(mergedEntries, participantStats);

      const totalDamageDealtFromParticipants = participantStats.reduce(
        (sum, p) => sum + p.damageDealt,
        0,
      );
      const totalDamageDealtFromAnalysis = Array.from(
        analysis.damageDealt.byPilot.values(),
      ).reduce((sum, val) => sum + val, 0);

      expect(totalDamageDealtFromParticipants).toBe(
        totalDamageDealtFromAnalysis,
      );
      expect(totalDamageDealtFromParticipants).toBe(100 + 80 + 120); // 300
    });

    it("should have sum of participant.damageTaken equal totalDamageTaken in analysis", () => {
      const mergedEntries = mergeFleetLogs([mockLog1, mockLog2, mockLog3]);
      const participantStats = calculateParticipantStats(
        mergedEntries,
        mockParticipants,
      );
      const analysis = analyzeFleetCombat(mergedEntries, participantStats);

      const totalDamageTakenFromParticipants = participantStats.reduce(
        (sum, p) => sum + p.damageTaken,
        0,
      );
      const totalDamageTakenFromAnalysis = Array.from(
        analysis.damageTaken.byPilot.values(),
      ).reduce((sum, val) => sum + val, 0);

      expect(totalDamageTakenFromParticipants).toBe(
        totalDamageTakenFromAnalysis,
      );
      expect(totalDamageTakenFromParticipants).toBe(50); // Only Pilot1 took damage
    });

    it("should have sum of participant.repsGiven equal totalRepsGiven in analysis", () => {
      const mergedEntries = mergeFleetLogs([mockLog1, mockLog2, mockLog3]);
      const participantStats = calculateParticipantStats(
        mergedEntries,
        mockParticipants,
      );
      const analysis = analyzeFleetCombat(mergedEntries, participantStats);

      const totalRepsGivenFromParticipants = participantStats.reduce(
        (sum, p) => sum + p.repsGiven,
        0,
      );
      const totalRepsGivenFromAnalysis = Array.from(
        analysis.repFlows.totalRepsGiven.values(),
      ).reduce((sum, val) => sum + val, 0);

      expect(totalRepsGivenFromParticipants).toBe(totalRepsGivenFromAnalysis);
      expect(totalRepsGivenFromParticipants).toBe(200 + 150); // Pilot1: 200, Pilot3: 150
    });
  });

  describe("rep flow bidirectionality", () => {
    it("should verify repsGiven by pilot A equals repsTaken by pilot B for same repair event", () => {
      const mergedEntries = mergeFleetLogs([mockLog1, mockLog2, mockLog3]);
      const participantStats = calculateParticipantStats(
        mergedEntries,
        mockParticipants,
      );

      const pilot1 = participantStats.find((p) => p.pilotName === "Pilot1")!;
      const pilot2 = participantStats.find((p) => p.pilotName === "Pilot2")!;
      const pilot3 = participantStats.find((p) => p.pilotName === "Pilot3")!;

      // Pilot1 gave 200 to Pilot2, Pilot2 received 200 from Pilot1
      expect(pilot1.repsGiven).toBe(200);
      expect(pilot2.repsTaken).toBe(200);

      // Pilot3 gave 150 to Pilot1, Pilot1 received 150 from Pilot3
      expect(pilot3.repsGiven).toBe(150);
      expect(pilot1.repsTaken).toBe(150);
    });
  });

  describe("merge data preservation", () => {
    it("should contain all original events from all pilots", () => {
      const mergedEntries = mergeFleetLogs([mockLog1, mockLog2, mockLog3]);

      const originalEventIds = [
        ...mockLog1.entries.map((e) => e.id),
        ...mockLog2.entries.map((e) => e.id),
        ...mockLog3.entries.map((e) => e.id),
      ];

      const mergedEventIds = mergedEntries.map((e) => e.id);

      // All original events should be present
      expect(mergedEventIds).toHaveLength(originalEventIds.length);
      expect(new Set(mergedEventIds)).toEqual(new Set(originalEventIds));
    });

    it("should retain pilot/shipType metadata for each event", () => {
      const mergedEntries = mergeFleetLogs([mockLog1, mockLog2, mockLog3]);

      // Check specific events retain metadata
      const pilot1Damage = mergedEntries.find((e) => e.id === "1");
      expect(pilot1Damage?.pilotName).toBe("Pilot1");
      expect(pilot1Damage?.shipType).toBe("Typhoon");

      const pilot2Damage = mergedEntries.find((e) => e.id === "5");
      expect(pilot2Damage?.pilotName).toBe("Pilot2");
      expect(pilot2Damage?.shipType).toBe("Tempest");

      const pilot3Damage = mergedEntries.find((e) => e.id === "7");
      expect(pilot3Damage?.pilotName).toBe("Pilot3");
      expect(pilot3Damage?.shipType).toBe("Apocalypse");
    });

    it("should not lose any events during merging", () => {
      const mergedEntries = mergeFleetLogs([mockLog1, mockLog2, mockLog3]);

      // Total events: 4 + 2 + 2 = 8
      expect(mergedEntries).toHaveLength(8);
    });
  });

  describe("deduplication logic", () => {
    it("should deduplicate identical events (same timestamp + rawLine)", () => {
      // Create logs with duplicate entries
      const duplicateLog1: FleetLogData = {
        pilot: "Pilot1",
        shipType: "Typhoon",
        entries: [
          {
            id: "dup1",
            timestamp: new Date(baseTime.getTime() + 1000),
            rawLine: "duplicate event",
            eventType: "damage-dealt",
            amount: 50,
            pilotName: "Pilot1",
            shipType: "Typhoon",
          },
        ],
      };

      const duplicateLog2: FleetLogData = {
        pilot: "Pilot2",
        shipType: "Tempest",
        entries: [
          {
            id: "dup2",
            timestamp: new Date(baseTime.getTime() + 1000),
            rawLine: "duplicate event", // Same rawLine and timestamp
            eventType: "damage-dealt",
            amount: 50,
            pilotName: "Pilot2",
            shipType: "Tempest",
          },
        ],
      };

      const mergedEntries = mergeFleetLogs([duplicateLog1, duplicateLog2]);

      // Should deduplicate to 1 event
      expect(mergedEntries).toHaveLength(1);
      expect(mergedEntries[0].rawLine).toBe("duplicate event");
    });

    it("should preserve similar events from different pilot perspectives separately", () => {
      // Create logs with similar but not identical events
      const perspectiveLog1: FleetLogData = {
        pilot: "Pilot1",
        shipType: "Typhoon",
        entries: [
          {
            id: "pers1",
            timestamp: new Date(baseTime.getTime() + 5000),
            rawLine: "rep event from pilot1 perspective",
            eventType: "rep-outgoing",
            amount: 100,
            pilotName: "Pilot1",
            shipType: "Typhoon",
          },
        ],
      };

      const perspectiveLog2: FleetLogData = {
        pilot: "Pilot2",
        shipType: "Tempest",
        entries: [
          {
            id: "pers2",
            timestamp: new Date(baseTime.getTime() + 5000),
            rawLine: "rep event from pilot2 perspective", // Different rawLine
            eventType: "rep-received",
            amount: 100,
            pilotName: "Pilot2",
            shipType: "Tempest",
          },
        ],
      };

      const mergedEntries = mergeFleetLogs([perspectiveLog1, perspectiveLog2]);

      // Should preserve both events
      expect(mergedEntries).toHaveLength(2);
      const events = mergedEntries.map((e) => e.id);
      expect(events).toContain("pers1");
      expect(events).toContain("pers2");
    });
  });
});
