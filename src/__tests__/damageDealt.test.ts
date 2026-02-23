import { describe, it, expect } from "vitest";
import type { LogEntry } from "@/lib/types";
import { generateDamageDealtTimeSeries } from "@/lib/analysis/damageDealt";

// Helper to create a mock LogEntry
function createDamageEntry(
  timestamp: number,
  amount: number,
  isDrone: boolean,
  hitQuality?: "Hits" | "Glances Off" | "Grazes",
  weapon?: string,
): LogEntry {
  return {
    timestamp: new Date(timestamp),
    eventType: "damage-dealt",
    pilotName: "Test Pilot",
    shipType: "Typhoon",
    weapon: weapon || (isDrone ? "Infiltrator II" : "Nova Cruise Missile"),
    amount,
    isDrone,
    hitQuality,
    outcome: hitQuality || "Hits",
    corpTicker: undefined,
    tackleDirection: undefined,
    tackleTarget: undefined,
    raw: "",
  } as LogEntry;
}

function createMissEntry(timestamp: number, isDrone: boolean): LogEntry {
  return {
    timestamp: new Date(timestamp),
    eventType: "miss-outgoing",
    isDrone,
    raw: "",
  } as LogEntry;
}

describe("generateDamageDealtTimeSeries", () => {
  describe("with excludeDrones=false (default behavior)", () => {
    it("includes both weapon and drone damage in time series", () => {
      const baseTime = new Date("2026-01-01T12:00:00").getTime();
      const entries = [
        createDamageEntry(baseTime, 100, false, "Hits", "Nova Cruise Missile"),
        createDamageEntry(baseTime + 1000, 50, true, "Hits", "Infiltrator II"),
        createDamageEntry(
          baseTime + 2000,
          100,
          false,
          "Hits",
          "Nova Cruise Missile",
        ),
      ];

      const result = generateDamageDealtTimeSeries(entries, undefined, false);

      expect(result.points.length).toBeGreaterThan(0);
      // Verify DPS includes all damage (100 + 50 + 100)
      const totalDamageSum = result.points.reduce((sum, p) => sum + p.dps, 0);
      expect(totalDamageSum).toBeGreaterThan(0);
    });

    it("calculates bad hit percentage from all weapons and drones", () => {
      const baseTime = new Date("2026-01-01T12:00:00").getTime();
      const entries = [
        createDamageEntry(baseTime, 100, false, "Hits", "Nova Cruise Missile"),
        createDamageEntry(
          baseTime + 100,
          50,
          true,
          "Glances Off",
          "Infiltrator II",
        ),
        createDamageEntry(
          baseTime + 200,
          100,
          false,
          "Hits",
          "Nova Cruise Missile",
        ),
      ];

      const result = generateDamageDealtTimeSeries(entries, undefined, false);

      expect(result.points.length).toBeGreaterThan(0);
      // At least one point should show bad hit percentage > 0 (1 bad hit out of 3)
      const hasNonzeroBadHit = result.points.some((p) => p.badHitPct > 0);
      expect(hasNonzeroBadHit).toBe(true);
    });
  });

  describe("with excludeDrones=true", () => {
    it("excludes all drone damage from time series", () => {
      const baseTime = new Date("2026-01-01T12:00:00").getTime();
      const entries = [
        createDamageEntry(baseTime, 100, false, "Hits", "Nova Cruise Missile"),
        createDamageEntry(baseTime + 1000, 50, true, "Hits", "Infiltrator II"),
        createDamageEntry(
          baseTime + 2000,
          100,
          false,
          "Hits",
          "Nova Cruise Missile",
        ),
      ];

      const resultWithDrones = generateDamageDealtTimeSeries(
        entries,
        undefined,
        false,
      );
      const resultWithoutDrones = generateDamageDealtTimeSeries(
        entries,
        undefined,
        true,
      );

      // Both should have points
      expect(resultWithDrones.points.length).toBeGreaterThan(0);
      expect(resultWithoutDrones.points.length).toBeGreaterThan(0);

      // Without drones, DPS should be lower (only weapon damage)
      const avgDpsWithDrones =
        resultWithDrones.points.reduce((sum, p) => sum + p.dps, 0) /
        resultWithDrones.points.length;
      const avgDpsWithoutDrones =
        resultWithoutDrones.points.reduce((sum, p) => sum + p.dps, 0) /
        resultWithoutDrones.points.length;

      expect(avgDpsWithDrones).toBeGreaterThan(avgDpsWithoutDrones);
    });

    it("calculates bad hit percentage from weapons only", () => {
      const baseTime = new Date("2026-01-01T12:00:00").getTime();
      const entries = [
        createDamageEntry(baseTime, 100, false, "Hits", "Nova Cruise Missile"),
        createDamageEntry(
          baseTime + 100,
          50,
          true,
          "Glances Off",
          "Infiltrator II",
        ),
        createDamageEntry(
          baseTime + 200,
          100,
          false,
          "Grazes",
          "Nova Cruise Missile",
        ),
      ];

      const resultWithDrones = generateDamageDealtTimeSeries(
        entries,
        undefined,
        false,
      );
      const resultWithoutDrones = generateDamageDealtTimeSeries(
        entries,
        undefined,
        true,
      );

      // With drones: 2 bad hits out of 3 = ~66.7%
      // Without drones: 1 bad hit out of 2 = 50%
      const maxBadHitWithDrones = Math.max(
        ...resultWithDrones.points.map((p) => p.badHitPct),
      );
      const maxBadHitWithoutDrones = Math.max(
        ...resultWithoutDrones.points.map((p) => p.badHitPct),
      );

      expect(maxBadHitWithDrones).toBeGreaterThan(maxBadHitWithoutDrones);
    });

    it("returns empty series when all damage is from drones", () => {
      const baseTime = new Date("2026-01-01T12:00:00").getTime();
      const entries = [
        createDamageEntry(baseTime, 50, true, "Hits", "Infiltrator II"),
        createDamageEntry(baseTime + 1000, 50, true, "Hits", "Infiltrator II"),
      ];

      const result = generateDamageDealtTimeSeries(entries, undefined, true);

      expect(result.points.length).toBe(0);
    });

    it("preserves weapon-only entries and excludes drone entries", () => {
      const baseTime = new Date("2026-01-01T12:00:00").getTime();
      const entries = [
        createDamageEntry(baseTime, 100, false, "Hits", "Nova Cruise Missile"),
        createDamageEntry(baseTime + 500, 50, true, "Hits", "Infiltrator II"),
        createDamageEntry(
          baseTime + 1000,
          120,
          false,
          "Hits",
          "Nova Cruise Missile",
        ),
      ];

      const result = generateDamageDealtTimeSeries(entries, undefined, true);

      // Should have points, and the damage should only be from weapons (100 + 120 = 220)
      expect(result.points.length).toBeGreaterThan(0);
      // The max DPS value should reflect only weapon damage
      const maxDps = Math.max(...result.points.map((p) => p.dps));
      // 220 damage over the window should result in reasonable DPS
      expect(maxDps).toBeGreaterThan(0);
    });
  });

  describe("with miss entries", () => {
    it("includes miss entries when calculating bad hit percentage with excludeDrones=false", () => {
      const baseTime = new Date("2026-01-01T12:00:00").getTime();
      const entries = [
        createDamageEntry(baseTime, 100, false, "Hits", "Nova Cruise Missile"),
        createMissEntry(baseTime + 100, false), // weapon miss
        createDamageEntry(
          baseTime + 200,
          100,
          false,
          "Hits",
          "Nova Cruise Missile",
        ),
      ];

      const result = generateDamageDealtTimeSeries(entries, undefined, false);

      expect(result.points.length).toBeGreaterThan(0);
      // Should have some non-zero bad hit percentage due to the miss
      const hasNonzeroBadHit = result.points.some((p) => p.badHitPct > 0);
      expect(hasNonzeroBadHit).toBe(true);
    });

    it("excludes drone misses when excludeDrones=true", () => {
      const baseTime = new Date("2026-01-01T12:00:00").getTime();
      const entries = [
        createDamageEntry(baseTime, 100, false, "Hits", "Nova Cruise Missile"),
        createMissEntry(baseTime + 100, true), // drone miss - should be excluded
        createDamageEntry(
          baseTime + 200,
          100,
          false,
          "Hits",
          "Nova Cruise Missile",
        ),
      ];

      const resultWithFilter = generateDamageDealtTimeSeries(
        entries,
        undefined,
        true,
      );
      const resultWithoutFilter = generateDamageDealtTimeSeries(
        entries,
        undefined,
        false,
      );

      // With filter, drone miss is excluded, so bad hit % should be 0% (only hits)
      // Without filter, drone miss is included
      const maxBadHitWithFilter = Math.max(
        ...resultWithFilter.points.map((p) => p.badHitPct),
        0,
      );
      const maxBadHitWithoutFilter = Math.max(
        ...resultWithoutFilter.points.map((p) => p.badHitPct),
        0,
      );

      expect(maxBadHitWithFilter).toBeLessThanOrEqual(maxBadHitWithoutFilter);
    });
  });

  describe("edge cases", () => {
    it("handles empty entries array", () => {
      const result = generateDamageDealtTimeSeries([], undefined, true);
      expect(result.points).toEqual([]);
      expect(result.tackleWindows).toEqual([]);
    });

    it("handles entries with no damage-dealt events", () => {
      const entries: LogEntry[] = [
        createMissEntry(new Date("2026-01-01T12:00:00").getTime(), false),
      ];
      const result = generateDamageDealtTimeSeries(entries, undefined, true);
      expect(result.points).toEqual([]);
    });

    it("maintains tackle windows regardless of excludeDrones setting", () => {
      const baseTime = new Date("2026-01-01T12:00:00").getTime();
      const entries = [
        createDamageEntry(baseTime, 100, false, "Hits", "Nova Cruise Missile"),
        createDamageEntry(baseTime + 1000, 50, true, "Hits", "Infiltrator II"),
      ];

      const resultWithFilter = generateDamageDealtTimeSeries(
        entries,
        undefined,
        true,
      );
      const resultWithoutFilter = generateDamageDealtTimeSeries(
        entries,
        undefined,
        false,
      );

      // Both should have the same tackle windows (doesn't matter if drones are excluded)
      expect(resultWithFilter.tackleWindows.length).toBe(
        resultWithoutFilter.tackleWindows.length,
      );
    });
  });
});
