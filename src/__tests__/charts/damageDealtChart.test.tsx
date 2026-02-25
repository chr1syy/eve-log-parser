import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { DamageDealtTimeSeries } from "../../lib/analysis/damageDealt";
import DamageDealtChart, {
  resolveBrushRange,
} from "../../components/charts/DamageDealtChart";

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
    Line: () => null,
    Brush: ({
      onChange,
    }: {
      onChange?: (range?: { startIndex?: number; endIndex?: number }) => void;
    }) => (
      <button
        type="button"
        data-testid="brush"
        onClick={() => onChange?.({ startIndex: 1, endIndex: 2 })}
      >
        brush
      </button>
    ),
  };
});

describe("resolveBrushRange", () => {
  it("returns null when data or indices are missing", () => {
    const base = new Date("2024-01-01T00:00:00Z");
    expect(resolveBrushRange([], 0, 1)).toBeNull();
    expect(resolveBrushRange([{ timestamp: base }], undefined, 1)).toBeNull();
    expect(resolveBrushRange([{ timestamp: base }], 0, undefined)).toBeNull();
  });

  it("clamps and orders indices to return a valid range", () => {
    const base = new Date("2024-01-01T00:00:00Z");
    const data = [
      { timestamp: base },
      { timestamp: new Date(base.getTime() + 1000) },
      { timestamp: new Date(base.getTime() + 2000) },
    ];

    const range = resolveBrushRange(data, 5, -2);

    expect(range?.start.getTime()).toBe(data[0]?.timestamp.getTime());
    expect(range?.end.getTime()).toBe(data[2]?.timestamp.getTime());
  });
});

describe("DamageDealtChart brush selection", () => {
  it("maps brush indices to exact Date values", () => {
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
    const onRangeSelect = vi.fn();

    render(<DamageDealtChart series={series} onRangeSelect={onRangeSelect} />);

    fireEvent.click(screen.getByTestId("brush"));

    expect(onRangeSelect).toHaveBeenCalledTimes(1);
    const [start, end] = onRangeSelect.mock.calls[0] ?? [];
    expect(start?.getTime()).toBe(points[1]?.timestamp.getTime());
    expect(end?.getTime()).toBe(points[2]?.timestamp.getTime());
  });
});
