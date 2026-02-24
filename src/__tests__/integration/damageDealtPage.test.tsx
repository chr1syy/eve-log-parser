import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type {
  DamageDealtAnalysis,
  DamageDealtTimeSeries,
} from "../../lib/analysis/damageDealt";
import type { ParsedLog } from "../../lib/types";
import DamageDealtPage from "../../app/damage-dealt/page";
import {
  analyzeDamageDealt,
  generateDamageDealtTimeSeries,
} from "../../lib/analysis/damageDealt";
import { useParsedLogs } from "../../hooks/useParsedLogs";

vi.mock("../../components/layout/AppLayout", () => ({
  default: ({ title, children }: { title: string; children: ReactNode }) => (
    <div>
      <div>{title}</div>
      {children}
    </div>
  ),
}));

vi.mock("../../components/charts/DamageDealtChart", () => ({
  default: ({
    zoomedWindow,
    onRangeSelect,
  }: {
    zoomedWindow?: { start: Date; end: Date };
    onRangeSelect: (start: Date, end: Date) => void;
  }) => (
    <div>
      <div data-testid="zoom-window">
        {zoomedWindow
          ? `${zoomedWindow.start.toISOString()}|${zoomedWindow.end.toISOString()}`
          : "none"}
      </div>
      <button
        type="button"
        onClick={() =>
          onRangeSelect(
            new Date("2024-01-01T00:00:05Z"),
            new Date("2024-01-01T00:00:10Z"),
          )
        }
      >
        select-range
      </button>
    </div>
  ),
}));

vi.mock("../../hooks/useParsedLogs", () => ({
  useParsedLogs: vi.fn(),
}));

vi.mock("../../lib/analysis/damageDealt", async () => {
  const actual = await vi.importActual<
    typeof import("../../lib/analysis/damageDealt")
  >("../../lib/analysis/damageDealt");
  return {
    ...actual,
    analyzeDamageDealt: vi.fn(),
    generateDamageDealtTimeSeries: vi.fn(),
  };
});

const baseEngagement = {
  target: "Rhea Ormand",
  shipType: "Caracal",
  corp: "PIR",
  firstHit: new Date("2024-01-01T00:00:00Z"),
  lastHit: new Date("2024-01-01T00:00:20Z"),
  windowSeconds: 20,
  totalDamage: 4200,
  hitCount: 12,
  dps: 210,
  minHit: 200,
  maxHit: 600,
  avgHit: 350,
  hitQualities: { Hits: 10, Grazes: 2 },
} satisfies DamageDealtAnalysis["engagements"][number];

const mockLog: ParsedLog = {
  sessionId: "session-1",
  fileName: "test-log.txt",
  parsedAt: new Date("2024-01-01T00:00:00Z"),
  entries: [],
  stats: {
    totalEvents: 0,
    damageDealt: 0,
    damageReceived: 0,
    topWeapons: [],
    topTargets: [],
    hitQualityDealt: {},
    hitQualityReceived: {},
    totalRepReceived: 0,
    totalRepOutgoing: 0,
    capNeutReceived: 0,
    capNeutDealt: 0,
    capNosDrained: 0,
    activeTimeMinutes: 0,
    damageDealtByTarget: [],
    repReceivedBySource: [],
    capReceivedByShipType: [],
    capDealtByModule: [],
  },
};

describe("DamageDealtPage integration", () => {
  const mockUseParsedLogs = vi.mocked(useParsedLogs);
  const mockAnalyzeDamageDealt = vi.mocked(analyzeDamageDealt);
  const mockGenerateDamageDealtTimeSeries = vi.mocked(
    generateDamageDealtTimeSeries,
  );

  beforeEach(() => {
    mockUseParsedLogs.mockReturnValue({
      logs: [mockLog],
      activeLog: mockLog,
      userId: "test",
      needsRecovery: false,
      setActiveLog: vi.fn(),
      removeLog: vi.fn(),
      clearLogs: vi.fn(),
      restoreFromUserId: vi.fn(),
    });

    const analysis: DamageDealtAnalysis = {
      engagements: [baseEngagement],
      weaponSummaries: [],
      droneSummaries: [],
      overallDps: 0,
      totalDamageDealt: baseEngagement.totalDamage,
      totalHits: baseEngagement.hitCount,
      overallHitQualities: {},
    };

    const series: DamageDealtTimeSeries = {
      points: [
        {
          timestamp: new Date("2024-01-01T00:00:00Z"),
          dps: 100,
          badHitPct: 0,
        },
      ],
      tackleWindows: [],
    };

    mockAnalyzeDamageDealt.mockReturnValue(analysis);
    mockGenerateDamageDealtTimeSeries.mockReturnValue(series);
  });

  it("updates zoomed window when switching between chart range and target", () => {
    const chartRangeText = "2024-01-01T00:00:05.000Z|2024-01-01T00:00:10.000Z";
    const targetRangeText = "2024-01-01T00:00:00.000Z|2024-01-01T00:00:20.000Z";

    render(<DamageDealtPage />);

    expect(screen.getByTestId("zoom-window")).toHaveTextContent("none");

    fireEvent.click(screen.getByRole("button", { name: "select-range" }));
    expect(screen.getByTestId("zoom-window")).toHaveTextContent(chartRangeText);

    fireEvent.click(screen.getByRole("button", { name: /Rhea Ormand/i }));
    expect(screen.getByTestId("zoom-window")).toHaveTextContent(
      targetRangeText,
    );

    fireEvent.click(screen.getByRole("button", { name: "select-range" }));
    expect(screen.getByTestId("zoom-window")).toHaveTextContent(chartRangeText);
  });
});
