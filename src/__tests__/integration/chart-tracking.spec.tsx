import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import DamageDealtChart from "../../components/charts/DamageDealtChart";
import type { TrackingSeries } from "../../lib/types";

describe("DamageDealtChart tracking series", () => {
  it("renders tracking lines when trackingSeries provided", () => {
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
      {
        timestamp: now - 20000,
        trackingQuality: 1.1,
        shotCount: 3,
        hitCount: 3,
        missCount: 0,
      },
      {
        timestamp: now - 10000,
        trackingQuality: 0.85,
        shotCount: 3,
        hitCount: 3,
        missCount: 0,
      },
      {
        timestamp: now,
        trackingQuality: 0.5,
        shotCount: 3,
        hitCount: 3,
        missCount: 0,
      },
    ];

    const { container } = render(
      <DamageDealtChart series={series} trackingSeries={tracking} />,
    );

    // Expect SVG paths for the three tracking lines to exist
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);

    // There should be path elements for the three Line components (tracking)
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThan(0);
  });
});
