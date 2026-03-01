import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ChartsPage from "@/app/charts/page";
import type { ActiveToggles } from "@/components/charts/CombinedChart";
import type { LogEntry } from "@/lib/types";

const mockUseParsedLogs = vi.fn();

vi.mock("@/hooks/useParsedLogs", () => ({
  useParsedLogs: () => mockUseParsedLogs(),
}));

vi.mock("@/components/ui/Panel", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/charts/RawLogPanel", () => ({
  default: ({
    brushWindow,
  }: {
    brushWindow: { start: Date; end: Date } | null;
  }) => (
    <div data-testid="raw-log">{brushWindow ? "brush-on" : "brush-off"}</div>
  ),
}));

vi.mock("@/components/charts/CombinedChart", () => ({
  default: ({
    onBrushChange,
    brushResetKey,
    initialBrushWindow,
    activeToggles,
  }: {
    onBrushChange?: (start: Date | null, end: Date | null) => void;
    brushResetKey?: number;
    initialBrushWindow?: { start: Date; end: Date } | null;
    activeToggles: ActiveToggles;
  }) => (
    <div>
      <div data-testid="combined-reset-key">{brushResetKey ?? 0}</div>
      <div data-testid="combined-initial-window">
        {initialBrushWindow
          ? `${initialBrushWindow.start.toISOString()}|${initialBrushWindow.end.toISOString()}`
          : "none"}
      </div>
      <div data-testid="combined-toggles">{JSON.stringify(activeToggles)}</div>
      <button
        type="button"
        data-testid="set-brush"
        onClick={() =>
          onBrushChange?.(
            new Date("2026-01-01T00:00:10Z"),
            new Date("2026-01-01T00:00:30Z"),
          )
        }
      >
        set brush
      </button>
    </div>
  ),
}));

vi.mock("@/components/charts/DamagePerTargetTable", () => ({
  default: ({
    onTargetClick,
  }: {
    onTargetClick?: (start: Date, end: Date) => void;
  }) => (
    <div>
      <span>damage-out-table</span>
      <button
        type="button"
        data-testid="damage-out-zoom"
        onClick={() =>
          onTargetClick?.(
            new Date("2026-01-01T01:00:00Z"),
            new Date("2026-01-01T01:00:20Z"),
          )
        }
      >
        zoom damage out
      </button>
    </div>
  ),
}));

vi.mock("@/components/charts/DamageReceivedPerTargetTable", () => ({
  default: () => <div>damage-in-table</div>,
}));

vi.mock("@/components/charts/RepsPerSourceTable", () => ({
  default: () => <div>reps-table</div>,
}));

vi.mock("@/components/charts/CapPressurePerSourceTable", () => ({
  default: () => <div>cap-table</div>,
}));

// Mock CapHitTimelineChart to allow toggle testing
vi.mock("@/components/charts/CapHitTimelineChart", () => ({
  default: () => <div data-testid="cap-hit-timeline">cap-hit-timeline</div>,
}));

describe("ChartsPage", () => {
  beforeEach(() => {
    const entries: LogEntry[] = [
      {
        id: "e1",
        timestamp: new Date("2026-01-01T00:00:00Z"),
        rawLine: "",
        eventType: "damage-dealt",
      },
    ];
    mockUseParsedLogs.mockReturnValue({ activeLog: { entries } });
  });

  it("supports toggles, brush reset, and row-click zoom wiring", () => {
    render(<ChartsPage />);

    expect(screen.getByText("damage-out-table")).toBeInTheDocument();
    expect(screen.queryByText("Reset Zoom")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Damage Out" }));
    expect(screen.queryByText("damage-out-table")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Damage Out" }));
    expect(screen.getByText("damage-out-table")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("set-brush"));
    expect(screen.getByText("Reset Zoom")).toBeInTheDocument();
    expect(screen.getByTestId("raw-log")).toHaveTextContent("brush-on");

    fireEvent.click(screen.getByTestId("damage-out-zoom"));
    expect(screen.getByTestId("combined-reset-key")).toHaveTextContent("1");
    expect(screen.getByTestId("combined-initial-window")).toHaveTextContent(
      "2026-01-01T01:00:00.000Z|2026-01-01T01:00:20.000Z",
    );

    fireEvent.click(screen.getByText("Reset Zoom"));
    expect(screen.queryByText("Reset Zoom")).not.toBeInTheDocument();
    expect(screen.getByTestId("combined-reset-key")).toHaveTextContent("2");
    expect(screen.getByTestId("combined-initial-window")).toHaveTextContent(
      "none",
    );
  });

  it("toggles CapHitTimelineChart visibility (off by default)", () => {
    render(<ChartsPage />);

    // Chart is hidden by default
    expect(screen.queryByTestId("cap-hit-timeline")).not.toBeInTheDocument();

    // Click the "Cap Hits" toggle to show it
    fireEvent.click(screen.getByRole("button", { name: "Cap Hits" }));
    expect(screen.getByTestId("cap-hit-timeline")).toBeInTheDocument();

    // Click again to hide
    fireEvent.click(screen.getByRole("button", { name: "Cap Hits" }));
    expect(screen.queryByTestId("cap-hit-timeline")).not.toBeInTheDocument();
  });
});
