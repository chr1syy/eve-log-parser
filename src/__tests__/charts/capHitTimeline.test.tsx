import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CapHitTimelineChart from "@/components/charts/CapHitTimelineChart";

// Copy recharts mock pattern from damageDealtChart.test.tsx
vi.mock("recharts", async () => {
  const React = await import("react");
  const Passthrough = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  );

  return {
    ResponsiveContainer: Passthrough,
    ComposedChart: Passthrough,
    BarChart: Passthrough,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    ReferenceArea: () => null,
    Bar: Passthrough,
    Cell: () => null,
    Line: () => null,
    Brush: () => null,
  };
});

vi.mock("@/lib/analysis/capAnalysis", () => ({
  analyzeCapPressure: vi.fn(),
}));

import { analyzeCapPressure } from "@/lib/analysis/capAnalysis";
const mockAnalyze = analyzeCapPressure as unknown as ReturnType<typeof vi.fn>;

describe("CapHitTimelineChart", () => {
  it("renders without crashing when timeline has entries", () => {
    mockAnalyze.mockReturnValue({
      neutReceivedTimeline: [
        {
          timestamp: new Date("2026-01-01T00:00:10Z"),
          gjAmount: 300,
          module: "Heavy Energy Neutralizer II",
          shipType: "Curse",
        },
        {
          timestamp: new Date("2026-01-01T00:00:20Z"),
          gjAmount: 0,
          module: "Heavy Energy Neutralizer II",
          shipType: "Curse",
        },
      ],
      totalGjNeutDealt: 0,
      totalGjNosDrained: 0,
      totalGjOutgoing: 0,
      outgoingModuleSummaries: [],
      totalGjNeutReceived: 300,
      incomingByShipType: [],
      incomingModuleSummaries: [],
    });

    const { container } = render(<CapHitTimelineChart entries={[]} />);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders empty-state text when timeline is empty", () => {
    mockAnalyze.mockReturnValue({
      neutReceivedTimeline: [],
      totalGjNeutDealt: 0,
      totalGjNosDrained: 0,
      totalGjOutgoing: 0,
      outgoingModuleSummaries: [],
      totalGjNeutReceived: 0,
      incomingByShipType: [],
      incomingModuleSummaries: [],
    });

    render(<CapHitTimelineChart entries={[]} />);
    expect(screen.getByText("NO INCOMING NEUT HITS RECORDED")).toBeTruthy();
  });
});
