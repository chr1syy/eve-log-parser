import { describe, it, expect } from "vitest";
import { analyzeCapPressure } from "@/lib/analysis/capAnalysis";
import type { LogEntry } from "@/lib/types";

let idCounter = 0;
function mkEntry(partial: Partial<LogEntry>): LogEntry {
  idCounter += 1;
  return {
    id: partial.id ?? `entry-${idCounter}`,
    timestamp: partial.timestamp ?? new Date("2026-01-01T00:00:00Z"),
    rawLine: partial.rawLine ?? "",
    eventType: partial.eventType ?? "other",
    ...partial,
  } as LogEntry;
}

describe("analyzeCapPressure — neutReceivedTimeline", () => {
  it("returns entries sorted ascending by timestamp", () => {
    const entries: LogEntry[] = [
      mkEntry({
        eventType: "neut-received",
        capEventType: "neut-received",
        timestamp: new Date("2026-01-01T00:00:30Z"),
        capAmount: 150,
        capModule: "Heavy Energy Neutralizer II",
        capShipType: "Curse",
      }),
      mkEntry({
        eventType: "neut-received",
        capEventType: "neut-received",
        timestamp: new Date("2026-01-01T00:00:10Z"),
        capAmount: 300,
        capModule: "Heavy Energy Neutralizer II",
        capShipType: "Curse",
      }),
    ];

    const { neutReceivedTimeline } = analyzeCapPressure(entries);
    expect(neutReceivedTimeline).toHaveLength(2);
    expect(neutReceivedTimeline[0].timestamp.toISOString()).toBe(
      "2026-01-01T00:00:10.000Z",
    );
    expect(neutReceivedTimeline[1].timestamp.toISOString()).toBe(
      "2026-01-01T00:00:30.000Z",
    );
  });

  it("includes zero-GJ (dry hit) entries with gjAmount 0", () => {
    const entries: LogEntry[] = [
      mkEntry({
        eventType: "neut-received",
        capEventType: "neut-received",
        timestamp: new Date("2026-01-01T00:00:05Z"),
        capAmount: 0,
        capModule: "Medium Energy Neutralizer II",
        capShipType: "Pilgrim",
      }),
    ];

    const { neutReceivedTimeline } = analyzeCapPressure(entries);
    expect(neutReceivedTimeline).toHaveLength(1);
    expect(neutReceivedTimeline[0].gjAmount).toBe(0);
  });

  it("maps capModule and capShipType; falls back to 'Unknown' when absent", () => {
    const entries: LogEntry[] = [
      mkEntry({
        eventType: "neut-received",
        capEventType: "neut-received",
        timestamp: new Date("2026-01-01T00:00:00Z"),
        capAmount: 200,
        capModule: "Heavy Energy Neutralizer II",
        capShipType: "Curse",
      }),
      mkEntry({
        eventType: "neut-received",
        capEventType: "neut-received",
        timestamp: new Date("2026-01-01T00:00:01Z"),
        capAmount: 100,
        // no capModule or capShipType
      }),
    ];

    const { neutReceivedTimeline } = analyzeCapPressure(entries);
    expect(neutReceivedTimeline[0].module).toBe("Heavy Energy Neutralizer II");
    expect(neutReceivedTimeline[0].shipType).toBe("Curse");
    expect(neutReceivedTimeline[1].module).toBe("Unknown");
    expect(neutReceivedTimeline[1].shipType).toBe("Unknown");
  });

  it("excludes neut-dealt and nos-dealt entries from the timeline", () => {
    const entries: LogEntry[] = [
      mkEntry({
        eventType: "neut-received",
        capEventType: "neut-received",
        timestamp: new Date("2026-01-01T00:00:00Z"),
        capAmount: 300,
        capModule: "Heavy Energy Neutralizer II",
        capShipType: "Curse",
      }),
      mkEntry({
        eventType: "neut-dealt",
        capEventType: "neut-dealt",
        timestamp: new Date("2026-01-01T00:00:05Z"),
        capAmount: 180,
        capModule: "Heavy Energy Neutralizer II",
        capShipType: "Bhaalgorn",
      }),
      mkEntry({
        eventType: "nos-dealt",
        capEventType: "nos-dealt",
        timestamp: new Date("2026-01-01T00:00:10Z"),
        capAmount: 90,
        capModule: "Heavy Nosferatu II",
        capShipType: "Bhaalgorn",
      }),
    ];

    const { neutReceivedTimeline } = analyzeCapPressure(entries);
    expect(neutReceivedTimeline).toHaveLength(1);
    expect(neutReceivedTimeline[0].gjAmount).toBe(300);
  });
});
