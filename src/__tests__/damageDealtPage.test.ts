import { describe, expect, it } from "vitest";
import type { TargetEngagement } from "../lib/analysis/damageDealt";
import { resolveZoomedWindow } from "../lib/zoom";

const baseTarget: TargetEngagement = {
  target: "Rhea Ormand",
  shipType: "Caracal",
  corp: "PIR",
  firstHit: new Date("2024-01-01T00:00:00Z"),
  lastHit: new Date("2024-01-01T00:00:10Z"),
  windowSeconds: 10,
  totalDamage: 4200,
  hitCount: 12,
  dps: 420,
  minHit: 200,
  maxHit: 600,
  avgHit: 350,
  hitQualities: { Hits: 10, Grazes: 2 },
};

describe("resolveZoomedWindow", () => {
  it("prefers the chart-selected range when provided", () => {
    const chartRange = {
      start: new Date("2024-01-01T00:00:02Z"),
      end: new Date("2024-01-01T00:00:06Z"),
    };

    const resolved = resolveZoomedWindow(chartRange, baseTarget);

    expect(resolved).toEqual(chartRange);
  });

  it("falls back to the target engagement range when no chart range exists", () => {
    const resolved = resolveZoomedWindow(undefined, baseTarget);

    expect(resolved).toEqual({
      start: baseTarget.firstHit,
      end: baseTarget.lastHit,
    });
  });

  it("returns undefined when neither target nor chart range are active", () => {
    expect(resolveZoomedWindow(undefined, null)).toBeUndefined();
  });
});
