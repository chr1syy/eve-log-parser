import { describe, it, expect } from "vitest";
import { analyzeDamageTaken } from "@/lib/analysis/damageTaken";
import { generateDamageDealtTimeSeries } from "@/lib/analysis/damageDealt";
import { detectFightBoundaries } from "@/lib/analysis/fightBoundaries";
import type { LogEntry } from "@/lib/types";

describe("damage-dealt fight boundaries", () => {
  it("matches damage-taken boundaries for a shared sample log", () => {
    const now = Date.now();
    const entries: LogEntry[] = [
      // incoming damage events (for damage-taken analysis)
      {
        id: "in-1",
        timestamp: new Date(now),
        rawLine: "",
        eventType: "damage-received",
        amount: 100,
      },
      {
        id: "in-2",
        timestamp: new Date(now + 1000),
        rawLine: "",
        eventType: "damage-received",
        amount: 200,
      },
      // gap > 60s -> new fight
      {
        id: "in-3",
        timestamp: new Date(now + 70_000),
        rawLine: "",
        eventType: "damage-received",
        amount: 50,
      },

      // outgoing damage events (for damage-dealt analysis)
      {
        id: "out-1",
        timestamp: new Date(now + 10),
        rawLine: "",
        eventType: "damage-dealt",
        amount: 120,
      },
      {
        id: "out-2",
        timestamp: new Date(now + 1100),
        rawLine: "",
        eventType: "damage-dealt",
        amount: 80,
      },
      {
        id: "out-3",
        timestamp: new Date(now + 70_010),
        rawLine: "",
        eventType: "damage-dealt",
        amount: 60,
      },
    ];

    const taken = analyzeDamageTaken(entries);
    const takenBoundaries = detectFightBoundaries(
      entries.filter((e) => e.eventType === "damage-received"),
    );

    const dealtSeries = generateDamageDealtTimeSeries(entries, false);
    const dealtBoundaries = dealtSeries.fightBoundaries ?? [];

    // The damage-dealt boundaries should equal the damage-received boundaries
    expect(dealtBoundaries).toEqual(takenBoundaries);
    // Sanity: ensure analyzeDamageTaken recognized 2 fights
    expect(taken.fights.length).toBe(2);
  });
});
