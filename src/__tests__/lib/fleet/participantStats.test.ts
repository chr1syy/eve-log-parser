import { describe, it, expect } from "vitest";
import { calculateParticipantStats } from "@/lib/fleet/participantStats";
import { LogEntry } from "@/lib/types";
import { FleetParticipant } from "@/types/fleet";

describe("participantStats", () => {
  describe("calculateParticipantStats", () => {
    it("should calculate per-pilot stats correctly", () => {
      const mergedEntries: LogEntry[] = [
        {
          id: "1",
          timestamp: new Date("2023-01-01T12:00:00Z"),
          rawLine: "damage dealt",
          eventType: "damage-dealt",
          pilotName: "Pilot1",
          shipType: "Typhoon",
          amount: 100,
        },
        {
          id: "2",
          timestamp: new Date("2023-01-01T12:00:01Z"),
          rawLine: "damage taken",
          eventType: "damage-received",
          pilotName: "Pilot1",
          shipType: "Typhoon",
          amount: 50,
        },
        {
          id: "3",
          timestamp: new Date("2023-01-01T12:00:02Z"),
          rawLine: "rep given",
          eventType: "rep-outgoing",
          pilotName: "Pilot1",
          shipType: "Typhoon",
          amount: 200,
        },
        {
          id: "4",
          timestamp: new Date("2023-01-01T12:00:03Z"),
          rawLine: "rep taken",
          eventType: "rep-received",
          pilotName: "Pilot1",
          shipType: "Typhoon",
          amount: 150,
        },
        {
          id: "5",
          timestamp: new Date("2023-01-01T12:00:04Z"),
          rawLine: "damage dealt by pilot2",
          eventType: "damage-dealt",
          pilotName: "Pilot2",
          shipType: "Tempest",
          amount: 80,
        },
      ];

      const participants: FleetParticipant[] = [
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
      ];

      const result = calculateParticipantStats(mergedEntries, participants);

      expect(result).toHaveLength(2);

      const pilot1 = result.find((p) => p.pilotName === "Pilot1");
      expect(pilot1).toBeDefined();
      expect(pilot1!.damageDealt).toBe(100);
      expect(pilot1!.damageTaken).toBe(50);
      expect(pilot1!.repsGiven).toBe(200);
      expect(pilot1!.repsTaken).toBe(150);
      expect(pilot1!.status).toBe("active");

      const pilot2 = result.find((p) => p.pilotName === "Pilot2");
      expect(pilot2).toBeDefined();
      expect(pilot2!.damageDealt).toBe(80);
      expect(pilot2!.damageTaken).toBe(0);
      expect(pilot2!.repsGiven).toBe(0);
      expect(pilot2!.repsTaken).toBe(0);
      expect(pilot2!.status).toBe("active");
    });

    it("should handle pilots with no entries gracefully", () => {
      const mergedEntries: LogEntry[] = [
        {
          id: "1",
          timestamp: new Date("2023-01-01T12:00:00Z"),
          rawLine: "damage",
          eventType: "damage-dealt",
          pilotName: "Pilot1",
          shipType: "Typhoon",
          amount: 100,
        },
      ];

      const participants: FleetParticipant[] = [
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
      ];

      const result = calculateParticipantStats(mergedEntries, participants);

      expect(result).toHaveLength(2);

      const pilot2 = result.find((p) => p.pilotName === "Pilot2");
      expect(pilot2!.damageDealt).toBe(0);
      expect(pilot2!.damageTaken).toBe(0);
      expect(pilot2!.repsGiven).toBe(0);
      expect(pilot2!.repsTaken).toBe(0);
      expect(pilot2!.status).toBe("active");
    });
  });
});
