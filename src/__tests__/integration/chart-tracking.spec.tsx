import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import DamageDealtChart from "../../components/charts/DamageDealtChart";
import type { DamageDealtTimeSeries } from "../../lib/analysis/damageDealt";
import type { TrackingSeries } from "../../lib/types";

// Mock recharts to render simple elements we can inspect
import { vi } from "vitest";

vi.mock("recharts", async () => {
  const React = await import("react");
  const Passthrough = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  );

  return {
    ResponsiveContainer: Passthrough,
    ComposedChart: Passthrough,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    ReferenceArea: () => null,
    Bar: () => null,
    Line: ({ dataKey, stroke }: any) => (
      <path data-testid={`line-${dataKey}`} stroke={stroke} />
    ),
    Brush: () => null,
  };
});

describe("DamageDealtChart tracking line", () => {
  it("renders tracking lines with expected colors", () => {
    const base = new Date("2024-01-01T00:00:00Z");
    const points = [
      { timestamp: base, dps: 5, badHitPct: 1 },
      { timestamp: new Date(base.getTime() + 10_000), dps: 12, badHitPct: 2 },
      { timestamp: new Date(base.getTime() + 20_000), dps: 18, badHitPct: 3 },
    ];

    const series: DamageDealtTimeSeries = {
      points,
      tackleWindows: [],
    };

    const tracking: TrackingSeries[] = [
      {
        timestamp: base.getTime(),
        trackingQuality: 1.05,
        shotCount: 5,
        hitCount: 4,
        missCount: 1,
      },
      {
        timestamp: base.getTime() + 10_000,
        trackingQuality: 0.85,
        shotCount: 3,
        hitCount: 2,
        missCount: 1,
      },
      {
        timestamp: base.getTime() + 20_000,
        trackingQuality: 0.55,
        shotCount: 4,
        hitCount: 3,
        missCount: 1,
      },
    ];

    render(<DamageDealtChart series={series} trackingSeries={tracking} />);

    // Assert that the three tracking line paths exist and have the correct stroke
    const high = screen.getByTestId("line-trackingHigh");
    const mid = screen.getByTestId("line-trackingMid");
    const low = screen.getByTestId("line-trackingLow");

    expect(high).toBeTruthy();
    expect(high.getAttribute("stroke")).toBe("#16a34a");
    expect(mid.getAttribute("stroke")).toBe("#eab308");
    expect(low.getAttribute("stroke")).toBe("#dc2626");
  });
});
