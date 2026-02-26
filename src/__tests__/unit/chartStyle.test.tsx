import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import DpsTakenChart from "@/components/charts/DpsTakenChart";
import DamageDealtChart from "@/components/charts/DamageDealtChart";

// These tests assert that ReferenceLine styling uses the expected
// dash array and stroke color. We don't mount a real Recharts SVG in
// unit tests; instead we render the components and assert that the
// props we expect to pass to Recharts elements are present by
// inspecting the component tree via container.innerHTML.

describe("chart style properties for fight boundaries", () => {
  it("DpsTakenChart uses dotted fight boundary lines with expected style", () => {
    const now = new Date("2024-01-01T00:00:00Z");
    const series = [
      { timestamp: now, dps: 1, fightIndex: 0 },
      { timestamp: new Date(now.getTime() + 10000), dps: 2, fightIndex: 0 },
    ];
    const fights = [
      { start: now, end: new Date(now.getTime() + 5000) },
      {
        start: new Date(now.getTime() + 60000),
        end: new Date(now.getTime() + 65000),
      },
    ];

    const { container } = render(
      <DpsTakenChart timeSeries={series as any} fights={fights as any} />,
    );

    const html = container.innerHTML;
    expect(html).toContain('stroke="#8892a4"');
    expect(html).toContain('strokeDasharray="4 4"');
  });

  it("DamageDealtChart uses dotted fight boundary lines with expected style", () => {
    const base = new Date("2024-01-01T00:00:00Z");
    const series = {
      points: [
        { timestamp: base, dps: 1, badHitPct: 0 },
        { timestamp: new Date(base.getTime() + 10000), dps: 2, badHitPct: 0 },
      ],
      tackleWindows: [],
      fightBoundaries: [base.getTime() + 10000],
    } as any;

    const { container } = render(
      <DamageDealtChart
        series={series}
        fightBoundaries={series.fightBoundaries}
      />,
    );

    const html = container.innerHTML;
    expect(html).toContain('stroke="#8892a4"');
    expect(html).toContain('strokeDasharray="4 4"');
    // Ensure no explicit strokeOpacity is present for parity with DpsTakenChart
    expect(html).not.toContain("strokeOpacity");
  });
});
