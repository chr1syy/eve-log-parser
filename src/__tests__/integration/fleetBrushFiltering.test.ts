import { describe, it, expect } from "vitest";
import type { LogEntry } from "@/lib/types";
import { analyzeDamageDealt } from "@/lib/analysis/damageDealt";
import { analyzeDamageTaken } from "@/lib/analysis/damageTaken";

function makeEntry(
  id: string,
  offsetMs: number,
  eventType: "damage-dealt" | "damage-received",
  amount: number,
): LogEntry {
  const base = Date.parse("2026-01-01T00:00:00.000Z");
  return {
    id,
    rawLine: "[combat]",
    timestamp: new Date(base + offsetMs),
    eventType,
    amount,
  } as LogEntry;
}

describe("fleet brush filtering", () => {
  const allEntries: LogEntry[] = [
    makeEntry("dealt-0", 0, "damage-dealt", 100),
    makeEntry("received-0", 0, "damage-received", 10),
    makeEntry("dealt-60", 60_000, "damage-dealt", 200),
    makeEntry("received-60", 60_000, "damage-received", 20),
    makeEntry("dealt-120", 120_000, "damage-dealt", 300),
    makeEntry("received-120", 120_000, "damage-received", 30),
    makeEntry("dealt-180", 180_000, "damage-dealt", 400),
    makeEntry("received-180", 180_000, "damage-received", 40),
    makeEntry("dealt-240", 240_000, "damage-dealt", 500),
    makeEntry("received-240", 240_000, "damage-received", 50),
    makeEntry("dealt-300", 300_000, "damage-dealt", 600),
    makeEntry("received-300", 300_000, "damage-received", 60),
  ];

  const brushWindow = {
    start: new Date("2026-01-01T00:01:30.000Z"),
    end: new Date("2026-01-01T00:03:30.000Z"),
  };

  const applyBrushFilter = (
    entries: LogEntry[],
    window: { start: Date; end: Date } | null,
  ) => {
    if (window === null) return entries;
    return entries.filter(
      (e) => e.timestamp >= window.start && e.timestamp <= window.end,
    );
  };

  const windowedEntries = applyBrushFilter(allEntries, brushWindow);

  it("filters both damage-dealt and damage-received analyses to the brush window", () => {
    const dealt = analyzeDamageDealt(windowedEntries);
    const taken = analyzeDamageTaken(windowedEntries);

    expect(dealt.totalDamageDealt).toBe(700);
    expect(dealt.totalHits).toBe(2);

    expect(taken.totalDamageReceived).toBe(70);
    expect(taken.totalIncomingHits).toBe(2);
  });

  it("returns all entries when brush window is null", () => {
    const allWindowEntries = applyBrushFilter(allEntries, null);
    const allDealt = analyzeDamageDealt(allWindowEntries);
    const allTaken = analyzeDamageTaken(allWindowEntries);

    expect(allDealt.totalDamageDealt).toBe(2100);
    expect(allDealt.totalHits).toBe(6);

    expect(allTaken.totalDamageReceived).toBe(210);
    expect(allTaken.totalIncomingHits).toBe(6);
  });
});
