import { describe, it, expect } from "vitest";
import type { LogEntry } from "@/lib/types";
import { computeDpsTimeSeries } from "@/lib/analysis/damageTaken";
import { generateDamageDealtTimeSeries } from "@/lib/analysis/damageDealt";

function makeEntry(t: number, amt: number): LogEntry {
  return {
    id: `e-${t}`,
    rawLine: "",
    timestamp: new Date(t),
    eventType: "damage-received",
    amount: amt,
  } as LogEntry;
}

function makeDealtEntry(t: number, amt: number): LogEntry {
  return {
    id: `d-${t}`,
    rawLine: "",
    timestamp: new Date(t),
    eventType: "damage-dealt",
    amount: amt,
  } as LogEntry;
}

describe("Damage time sampling (10s grid)", () => {
  it("incoming DPS: emits 10s-spaced samples with zeros across long gaps", () => {
    const t1 = new Date("2026-01-01T12:00:00").getTime();
    const t2 = t1 + 3 * 60 * 1000 + 500; // >3 minutes later
    const entries = [makeEntry(t1, 100), makeEntry(t2, 150)];

    // Segment fights using the module's segmentFights behavior indirectly
    const fights = [
      {
        start: new Date(t1),
        end: new Date(t2),
        durationSeconds: Math.max(1, (t2 - t1) / 1000),
        entries: entries,
      },
    ];

    const points = computeDpsTimeSeries(fights, 10_000);
    // Expect regular spacing: maximum gap between consecutive points <= 10s + 1ms
    for (let i = 1; i < points.length; i++) {
      const gap =
        points[i].timestamp.getTime() - points[i - 1].timestamp.getTime();
      expect(gap).toBeLessThanOrEqual(10_000 + 1);
    }

    // There should be at least one zero dps sample in the middle range
    const hasZero = points.some((p) => p.dps === 0);
    expect(hasZero).toBe(true);
  });

  it("outgoing DPS: emits 10s grid and zeros between sparse hits", () => {
    const base = new Date("2026-01-01T12:00:00").getTime();
    const t1 = base;
    const t2 = base + 3 * 60 * 1000 + 2000; // >3 minutes later
    const entries = [makeDealtEntry(t1, 100), makeDealtEntry(t2, 200)];

    const result = generateDamageDealtTimeSeries(entries, false);
    const pts = result.points;
    expect(pts.length).toBeGreaterThan(1);

    // Verify timestamps are on approx 10s grid (allow small mismatch for last point)
    for (let i = 1; i < pts.length; i++) {
      const gap = pts[i].timestamp.getTime() - pts[i - 1].timestamp.getTime();
      expect(gap).toBeLessThanOrEqual(10_000 + 1);
    }

    // Ensure zeros exist between hits
    const hasZero = pts.some((p) => p.dps === 0);
    expect(hasZero).toBe(true);
  });

  it("edge cases: single hit produces at least one sample", () => {
    const t = new Date("2026-01-01T12:00:00").getTime();
    const fights = [
      {
        start: new Date(t),
        end: new Date(t),
        durationSeconds: 1,
        entries: [makeEntry(t, 50)],
      },
    ];
    const points = computeDpsTimeSeries(fights, 10_000);
    expect(points.length).toBeGreaterThanOrEqual(1);

    const dealt = generateDamageDealtTimeSeries([makeDealtEntry(t, 75)], false);
    expect(dealt.points.length).toBeGreaterThanOrEqual(1);
  });
});
