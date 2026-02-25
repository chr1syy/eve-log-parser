import { describe, it, expect } from "vitest";
import {
  matchLogsByTimestamp,
  mergeFleetLogs,
  FleetLogData,
} from "@/lib/fleet/logMerging";

describe("logMerging", () => {
  describe("matchLogsByTimestamp", () => {
    it("should return overlapping true for logs within tolerance", () => {
      const baseTime = new Date("2023-01-01T12:00:00Z");

      const log1: FleetLogData = {
        pilot: "Pilot1",
        shipType: "Typhoon",
        entries: [
          {
            id: "1",
            timestamp: new Date(baseTime.getTime() + 1000),
            rawLine: "line1",
            eventType: "other",
          },
          {
            id: "2",
            timestamp: new Date(baseTime.getTime() + 60000),
            rawLine: "line2",
            eventType: "other",
          },
        ],
      };

      const log2: FleetLogData = {
        pilot: "Pilot2",
        shipType: "Tempest",
        entries: [
          {
            id: "3",
            timestamp: new Date(baseTime.getTime() + 5000),
            rawLine: "line3",
            eventType: "other",
          },
          {
            id: "4",
            timestamp: new Date(baseTime.getTime() + 65000),
            rawLine: "line4",
            eventType: "other",
          },
        ],
      };

      const result = matchLogsByTimestamp([log1, log2]);

      expect(result.overlapping).toBe(true);
      expect(result.validationErrors).toEqual([]);
      expect(result.overlapStart).toEqual(new Date(baseTime.getTime() + 5000));
      expect(result.overlapEnd).toEqual(new Date(baseTime.getTime() + 60000));
    });

    it("should return overlapping false for non-overlapping logs", () => {
      const baseTime = new Date("2023-01-01T12:00:00Z");

      const log1: FleetLogData = {
        pilot: "Pilot1",
        shipType: "Typhoon",
        entries: [
          {
            id: "1",
            timestamp: baseTime,
            rawLine: "line1",
            eventType: "other",
          },
          {
            id: "2",
            timestamp: new Date(baseTime.getTime() + 60000),
            rawLine: "line2",
            eventType: "other",
          },
        ],
      };

      const log2: FleetLogData = {
        pilot: "Pilot2",
        shipType: "Tempest",
        entries: [
          {
            id: "3",
            timestamp: new Date(baseTime.getTime() + 400000),
            rawLine: "line3",
            eventType: "other",
          }, // 400s later
          {
            id: "4",
            timestamp: new Date(baseTime.getTime() + 460000),
            rawLine: "line4",
            eventType: "other",
          },
        ],
      };

      const result = matchLogsByTimestamp([log1, log2]);

      expect(result.overlapping).toBe(false);
      expect(result.validationErrors.length).toBeGreaterThan(0);
      expect(result.overlapStart).toBeNull();
      expect(result.overlapEnd).toBeNull();
    });
  });

  describe("mergeFleetLogs", () => {
    it("should merge and sort entries chronologically", () => {
      const baseTime = new Date("2023-01-01T12:00:00Z");

      const log1: FleetLogData = {
        pilot: "Pilot1",
        shipType: "Typhoon",
        entries: [
          {
            id: "1",
            timestamp: new Date(baseTime.getTime() + 2000),
            rawLine: "line1",
            eventType: "other",
          },
        ],
      };

      const log2: FleetLogData = {
        pilot: "Pilot2",
        shipType: "Tempest",
        entries: [
          {
            id: "2",
            timestamp: new Date(baseTime.getTime() + 1000),
            rawLine: "line2",
            eventType: "other",
          },
        ],
      };

      const result = mergeFleetLogs([log1, log2]);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("2");
      expect(result[1].id).toBe("1");
      expect(result[0].pilotName).toBe("Pilot2");
      expect(result[0].shipType).toBe("Tempest");
      expect(result[1].pilotName).toBe("Pilot1");
      expect(result[1].shipType).toBe("Typhoon");
    });

    it("should deduplicate identical events", () => {
      const baseTime = new Date("2023-01-01T12:00:00Z");

      const log1: FleetLogData = {
        pilot: "Pilot1",
        shipType: "Typhoon",
        entries: [
          {
            id: "1",
            timestamp: baseTime,
            rawLine: "duplicate",
            eventType: "other",
          },
        ],
      };

      const log2: FleetLogData = {
        pilot: "Pilot2",
        shipType: "Tempest",
        entries: [
          {
            id: "2",
            timestamp: baseTime,
            rawLine: "duplicate",
            eventType: "other",
          },
        ],
      };

      const result = mergeFleetLogs([log1, log2]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("1"); // First one kept
    });
  });
});
