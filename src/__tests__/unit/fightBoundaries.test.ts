import { describe, it, expect } from "vitest";
import { detectFightBoundaries } from "../../lib/analysis/fightBoundaries";

import type { LogEntry } from "../../lib/types";

describe("detectFightBoundaries", () => {
  it("returns empty for no entries", () => {
    expect(detectFightBoundaries([])).toEqual([]);
  });

  it("no gaps -> single start", () => {
    const now = Date.now();
    const entries: LogEntry[] = [
      {
        id: "1",
        timestamp: new Date(now),
        rawLine: "",
        eventType: "damage-received",
      },
      {
        id: "2",
        timestamp: new Date(now + 1000),
        rawLine: "",
        eventType: "damage-received",
      },
      {
        id: "3",
        timestamp: new Date(now + 2000),
        rawLine: "",
        eventType: "damage-received",
      },
    ];
    const starts = detectFightBoundaries(entries, 5000);
    expect(starts.length).toBe(1);
    expect(starts[0]).toBe(now);
  });

  it("gap > gapMs produces new boundary", () => {
    const now = Date.now();
    const entries: LogEntry[] = [
      {
        id: "1",
        timestamp: new Date(now),
        rawLine: "",
        eventType: "damage-received",
      },
      {
        id: "2",
        timestamp: new Date(now + 1000),
        rawLine: "",
        eventType: "damage-received",
      },
      {
        id: "3",
        timestamp: new Date(now + 10_000),
        rawLine: "",
        eventType: "damage-received",
      },
    ];
    const starts = detectFightBoundaries(entries, 5000);
    expect(starts.length).toBe(2);
    expect(starts[0]).toBe(now);
    expect(starts[1]).toBe(now + 10_000);
  });

  it("mixed cases produce correct boundaries", () => {
    const now = Date.now();
    const entries: LogEntry[] = [
      {
        id: "1",
        timestamp: new Date(now),
        rawLine: "",
        eventType: "damage-received",
      },
      {
        id: "2",
        timestamp: new Date(now + 1000),
        rawLine: "",
        eventType: "damage-received",
      },
      {
        id: "3",
        timestamp: new Date(now + 70_000),
        rawLine: "",
        eventType: "damage-received",
      },
      {
        id: "4",
        timestamp: new Date(now + 71_000),
        rawLine: "",
        eventType: "damage-received",
      },
    ];
    const starts = detectFightBoundaries(entries, 60_000);
    expect(starts.length).toBe(2);
    expect(starts[0]).toBe(now);
    expect(starts[1]).toBe(now + 70_000);
  });
});
