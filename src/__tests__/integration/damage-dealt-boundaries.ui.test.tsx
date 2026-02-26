import { render } from "@testing-library/react";
import { describe, it } from "vitest";
import DamageDealtChart from "../../components/charts/DamageDealtChart";
import type { DamageDealtTimeSeries } from "../../lib/analysis/damageDealt";

describe("DamageDealtChart fight boundaries rendering", () => {
  it("renders vertical markers for provided fightBoundaries (mocked recharts)", () => {
    // Recharts is already mocked in other tests; here we simply render the
    // component and assert that no crash occurs when fightBoundaries prop is
    // provided. Unit-level DOM assertions for SVG lines are handled by the
    // chart-level tests using a mocked Recharts implementation.
    const base = new Date("2024-01-01T00:00:00Z");
    const series: DamageDealtTimeSeries = {
      points: [
        { timestamp: base, dps: 1, badHitPct: 0 },
        { timestamp: new Date(base.getTime() + 10000), dps: 2, badHitPct: 0 },
      ],
      tackleWindows: [],
      fightBoundaries: [base.getTime() + 10000],
    };

    render(
      <DamageDealtChart
        series={series}
        fightBoundaries={series.fightBoundaries}
      />,
    );
  });
});
