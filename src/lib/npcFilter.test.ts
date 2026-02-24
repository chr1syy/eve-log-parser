import { describe, it, expect } from "vitest";
import {
  isHostileNpc,
  filterOutHostileNpcs,
  filterOnlyHostileNpcs,
} from "./npcFilter";
import type { LogEntry } from "./types";

describe("npcFilter", () => {
  describe("isHostileNpc", () => {
    it("identifies Sansha faction NPCs", () => {
      expect(isHostileNpc("Centatis Daemon")).toBe(true);
      expect(isHostileNpc("Centatis Wraith")).toBe(true);
      expect(isHostileNpc("Centatis Devil")).toBe(true);
      expect(isHostileNpc("Centatis Behemoth")).toBe(true);
      expect(isHostileNpc("Centus Dread Lord")).toBe(true);
      expect(isHostileNpc("Centus Tyrant")).toBe(true);
    });

    it("identifies Serpentis faction NPCs", () => {
      expect(isHostileNpc("Arch Gistii Rogue")).toBe(true);
      expect(isHostileNpc("Arch Gistii Thug")).toBe(true);
      expect(isHostileNpc("Arch Gistii Hijacker")).toBe(true);
      expect(isHostileNpc("Gist Cherubim")).toBe(true);
    });

    it("identifies individual NPC names", () => {
      expect(isHostileNpc("Erolissi Merr")).toBe(true);
      expect(isHostileNpc("Kuikkatoh Kun Saisima")).toBe(true);
      expect(isHostileNpc("QRNDU")).toBe(true);
    });

    it("rejects player ship types", () => {
      expect(isHostileNpc("Typhoon")).toBe(false);
      expect(isHostileNpc("Brutix Navy Issue")).toBe(false);
      expect(isHostileNpc("Drake")).toBe(false);
    });

    it("rejects player names with corp tickers", () => {
      expect(isHostileNpc("Kasa Habalu")).toBe(false);
      expect(isHostileNpc("HenrySolo")).toBe(false);
    });

    it("handles empty/undefined input", () => {
      expect(isHostileNpc("")).toBe(false);
      expect(isHostileNpc(undefined)).toBe(false);
    });

    it("is case-insensitive", () => {
      expect(isHostileNpc("centatis daemon")).toBe(true);
      expect(isHostileNpc("ARCH GISTII ROGUE")).toBe(true);
      expect(isHostileNpc("erolissi merr")).toBe(true);
    });
  });

  describe("filterOutHostileNpcs", () => {
    const createEntry = (
      shipType?: string,
      pilotName?: string,
      eventType: "damage-received" | "damage-dealt" = "damage-received",
    ): LogEntry => ({
      id: "test-1",
      timestamp: new Date(),
      rawLine: "test",
      eventType,
      shipType,
      pilotName,
      amount: 100,
    });

    it("filters out hostile NPC entries", () => {
      const entries: LogEntry[] = [
        createEntry("Centatis Daemon"),
        createEntry("Arch Gistii Rogue"),
        createEntry(undefined, "Gist Cherubim"),
        createEntry("Typhoon", "Kasa Habalu"),
      ];
      const filtered = filterOutHostileNpcs(entries);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].pilotName).toBe("Kasa Habalu");
    });

    it("keeps player entries", () => {
      const entries: LogEntry[] = [
        createEntry("Typhoon", "Player One"),
        createEntry("Drake", "Player Two"),
      ];
      const filtered = filterOutHostileNpcs(entries);
      expect(filtered).toHaveLength(2);
    });

    it("removes entries with hostile NPC shipType and no pilotName", () => {
      const entries: LogEntry[] = [
        createEntry("Erolissi Merr", undefined),
        createEntry("QRNDU", undefined),
      ];
      const filtered = filterOutHostileNpcs(entries);
      expect(filtered).toHaveLength(0);
    });

    it("removes entries with hostile NPC pilotName and no corp", () => {
      const entries: LogEntry[] = [
        createEntry(undefined, "Erolissi Merr"),
        createEntry(undefined, "QRNDU"),
      ];
      const filtered = filterOutHostileNpcs(entries);
      expect(filtered).toHaveLength(0);
    });

    it("keeps entries with unknown shipTypes (not player, not NPC)", () => {
      const entries: LogEntry[] = [createEntry("Unknown Structure", undefined)];
      const filtered = filterOutHostileNpcs(entries);
      expect(filtered).toHaveLength(1);
    });
  });

  describe("filterOnlyHostileNpcs", () => {
    const createEntry = (shipType?: string, pilotName?: string): LogEntry => ({
      id: "test-1",
      timestamp: new Date(),
      rawLine: "test",
      eventType: "damage-received",
      shipType,
      pilotName,
      amount: 100,
    });

    it("keeps only hostile NPC entries", () => {
      const entries: LogEntry[] = [
        createEntry("Centatis Daemon"),
        createEntry("Arch Gistii Rogue"),
        createEntry(undefined, "Erolissi Merr"),
        createEntry("Typhoon", "Kasa Habalu"),
      ];
      const filtered = filterOnlyHostileNpcs(entries);
      expect(filtered).toHaveLength(3);
      expect(filtered[0].shipType).toBe("Centatis Daemon");
      expect(filtered[1].shipType).toBe("Arch Gistii Rogue");
    });

    it("excludes player entries", () => {
      const entries: LogEntry[] = [
        createEntry("Typhoon", "Player One"),
        createEntry("Drake", "Player Two"),
      ];
      const filtered = filterOnlyHostileNpcs(entries);
      expect(filtered).toHaveLength(0);
    });
  });
});
