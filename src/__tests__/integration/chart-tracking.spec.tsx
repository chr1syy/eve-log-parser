import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import DamageDealtChart, {
  buildEnrichedTrackingData,
} from "../../components/charts/DamageDealtChart";
import type { DamageDealtPoint } from "../../lib/analysis/damageDealt";
import type { TrackingSeries } from "../../lib/types";

// Recharts ResponsiveContainer relies on ResizeObserver and renders nothing in
// jsdom because it sees zero dimensions. Mock it to pass fixed dimensions so
// the chart children can render at all.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: React.ReactElement;
      width?: number | string;
      height?: number | string;
    }) => {
      const React = require("react") as typeof import("react");
      return React.cloneElement(children, { width: 800, height: 300 });
    },
  };
});

describe("DamageDealtChart tracking series", () => {
  const now = Date.now();

  const series = {
    points: [
      { timestamp: new Date(now - 20000), dps: 100, badHitPct: 0 },
      { timestamp: new Date(now - 10000), dps: 150, badHitPct: 0 },
      { timestamp: new Date(now), dps: 120, badHitPct: 0 },
    ],
    tackleWindows: [],
  };

  const tracking: TrackingSeries[] = [
    { timestamp: now - 20000, trackingQuality: 1.1, shotCount: 3, hitCount: 3, missCount: 0 },
    { timestamp: now - 10000, trackingQuality: 0.85, shotCount: 3, hitCount: 3, missCount: 0 },
    { timestamp: now, trackingQuality: 0.5, shotCount: 3, hitCount: 3, missCount: 0 },
  ];

  it("renders without throwing when trackingSeries provided", () => {
    expect(() =>
      render(<DamageDealtChart series={series} trackingSeries={tracking} />),
    ).not.toThrow();
  });

  it("enriches data with correct tier keys for a High→Mid→Low sequence", () => {
    const dataPoints = series.points.map((pt) => ({
      ...pt,
      timestampMs: pt.timestamp.getTime(),
    })) as (DamageDealtPoint & { timestampMs: number })[];

    const enriched = buildEnrichedTrackingData(dataPoints, tracking);

    // T0 (tq=1.1): High tier — own value in High
    expect(enriched[0].trackingHigh).toBeCloseTo(1.1);
    expect(enriched[0].trackingMid).toBeNull();
    expect(enriched[0].trackingLow).toBeNull();

    // T1 (tq=0.85): Mid tier — prev=High, bridge on arrival writes value into High too
    expect(enriched[1].trackingMid).toBeCloseTo(0.85);
    expect(enriched[1].trackingHigh).toBeCloseTo(0.85);
    expect(enriched[1].trackingLow).toBeNull();

    // T2 (tq=0.5): Low tier — prev=Mid, bridge on arrival writes value into Mid too
    expect(enriched[2].trackingLow).toBeCloseTo(0.5);
    expect(enriched[2].trackingMid).toBeCloseTo(0.5);
    expect(enriched[2].trackingHigh).toBeNull();
  });
});
