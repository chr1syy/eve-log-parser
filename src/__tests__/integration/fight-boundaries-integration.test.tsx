import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, it, expect, beforeAll, vi } from "vitest";
import { parseLogFile } from "../../lib/parser";
import { generateDamageDealtTimeSeries } from "../../lib/analysis/damageDealt";
import { analyzeDamageTaken } from "../../lib/analysis/damageTaken";
import { detectFightBoundaries } from "../../lib/analysis/fightBoundaries";
import DamageDealtChart from "../../components/charts/DamageDealtChart";
import DpsTakenChart from "../../components/charts/DpsTakenChart";
import { render } from "@testing-library/react";

// Lightweight Recharts mock that preserves `x` prop on ReferenceLine so tests
// can assert the boundary values. Keep this mock local to the integration
// test so other chart/unit tests can use more specific mocks when required.
vi.mock("recharts", async () => {
  const React = await import("react");

  const Passthrough = ({ children }: { children?: React.ReactNode }) => {
    return React.createElement("div", null, children);
  };

  // ReferenceLine renders an svg line with a data-x attr set to the x prop.
  const ReferenceLine = ({ x }: { x?: number | string }) => (
    <svg data-testid="ref-line-mock">
      {/* Store the raw x value so tests can read it */}
      <line data-role="ref-line" data-x={String(x)} />
    </svg>
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
    Line: () => null,
    Brush: () => null,
    Area: () => null,
    ReferenceLine,
  };
});

// Helper: create a File from disk path (same pattern used by other integration tests)
function fileFromDisk(filePath: string): File {
  const buffer = readFileSync(filePath);
  const blob = new Blob([buffer], { type: "text/plain" });
  return new File([blob], filePath.split("/").pop()!, { type: "text/plain" });
}

const LOG_PATH = resolve(__dirname, "../../../20251023_013333_151402274.txt");

let parsed: Awaited<ReturnType<typeof parseLogFile>>;

beforeAll(async () => {
  parsed = await parseLogFile(fileFromDisk(LOG_PATH));
});

describe("Integration — fight boundary parity and visual alignment", () => {
  it("detects identical fight boundaries between damage-taken and damage-dealt pipelines", () => {
    const dealtSeries = generateDamageDealtTimeSeries(parsed.entries, false);

    const receivedEntries = parsed.entries.filter(
      (e) => e.eventType === "damage-received",
    );
    const takenBoundaries = detectFightBoundaries(receivedEntries);

    const dealtBoundaries = dealtSeries.fightBoundaries ?? [];

    expect(dealtBoundaries).toEqual(takenBoundaries);
    // basic sanity
    expect(dealtBoundaries.length).toBeGreaterThan(0);
  });

  it("renders both charts and asserts first boundary positions align within 2 pixels (approx)", () => {
    const dealtSeries = generateDamageDealtTimeSeries(parsed.entries, false);
    const dt = analyzeDamageTaken(parsed.entries);

    // Render charts into isolated containers
    const { container: dealtContainer } = render(
      <DamageDealtChart
        series={dealtSeries}
        fightBoundaries={dealtSeries.fightBoundaries}
      />,
    );

    const { container: takenContainer } = render(
      <DpsTakenChart timeSeries={dt.dpsTimeSeries} fights={dt.fights} />,
    );

    // Query the mocked ReferenceLine outputs inside each container
    const dealtLines = dealtContainer.querySelectorAll(
      '[data-role="ref-line"]',
    );
    const takenLines = takenContainer.querySelectorAll(
      '[data-role="ref-line"]',
    );

    expect(dealtLines.length).toBeGreaterThan(0);
    expect(takenLines.length).toBeGreaterThan(0);

    // Parse the first boundary x values (these are raw timestamp numbers in ms)
    const dealtX = Number(dealtLines[0].getAttribute("data-x"));
    const takenX = Number(takenLines[0].getAttribute("data-x"));

    expect(Number.isFinite(dealtX)).toBe(true);
    expect(Number.isFinite(takenX)).toBe(true);

    // Map timestamps to a pixel space using each chart's data domain. Use the
    // same width for both charts so the computed pixel positions are
    // comparable; small differences in domain ranges are allowed.
    const pxWidth = 800;

    const dealtTimestamps = dealtSeries.points.map((p) =>
      p.timestamp.getTime(),
    );
    const dealtMin = Math.min(...dealtTimestamps);
    const dealtMax = Math.max(...dealtTimestamps);

    const takenTimestamps = dt.dpsTimeSeries.map((p) => p.timestamp.getTime());
    const takenMin = Math.min(...takenTimestamps);
    const takenMax = Math.max(...takenTimestamps);

    const mapToPx = (x: number, min: number, max: number) => {
      if (max <= min) return 0;
      return ((x - min) / (max - min)) * pxWidth;
    };

    const pxDealt = mapToPx(dealtX, dealtMin, dealtMax);
    const pxTaken = mapToPx(takenX, takenMin, takenMax);

    // The two pixel positions should be close — allow a small tolerance.
    const diff = Math.abs(pxDealt - pxTaken);
    expect(diff).toBeLessThanOrEqual(2);
  });
});
