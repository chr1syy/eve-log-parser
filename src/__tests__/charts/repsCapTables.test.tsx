import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import RepsPerSourceTable from "@/components/charts/RepsPerSourceTable";
import CapPressurePerSourceTable from "@/components/charts/CapPressurePerSourceTable";
import type { LogEntry } from "@/lib/types";

function mkEntry(partial: Partial<LogEntry>): LogEntry {
  return {
    id: partial.id ?? crypto.randomUUID(),
    timestamp: partial.timestamp ?? new Date("2026-01-01T00:00:00Z"),
    rawLine: partial.rawLine ?? "",
    eventType: partial.eventType ?? "other",
    ...partial,
  };
}

describe("RepsPerSourceTable", () => {
  it("renders hits and supports row-click zoom callback", () => {
    const onSourceClick = vi.fn();
    const entries: LogEntry[] = [
      mkEntry({
        eventType: "rep-received",
        timestamp: new Date("2026-01-01T00:00:00Z"),
        amount: 300,
        repShipType: "Guardian",
        repModule: "Large Remote Armor Repairer II",
      }),
      mkEntry({
        eventType: "rep-received",
        timestamp: new Date("2026-01-01T00:00:10Z"),
        amount: 200,
        repShipType: "Guardian",
        repModule: "Large Remote Armor Repairer II",
      }),
    ];

    render(
      <RepsPerSourceTable
        entries={entries}
        brushWindow={null}
        onSourceClick={onSourceClick}
      />,
    );

    expect(screen.getByText("REPS BY SOURCE — FULL SESSION")).toBeTruthy();
    expect(screen.getByText("Hits")).toBeTruthy();
    expect(screen.getByText("Guardian")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();

    fireEvent.click(screen.getByText("Guardian"));
    expect(onSourceClick).toHaveBeenCalledTimes(1);
    const [start, end] = onSourceClick.mock.calls[0] as [Date, Date];
    expect(start.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-01-01T00:00:10.000Z");
  });

  it("applies brush-window filtering and updates subtitle", () => {
    const entries: LogEntry[] = [
      mkEntry({
        eventType: "rep-received",
        timestamp: new Date("2026-01-01T00:00:00Z"),
        amount: 100,
        repShipType: "Oneiros",
        repModule: "Medium Remote Armor Repairer II",
      }),
      mkEntry({
        eventType: "rep-received",
        timestamp: new Date("2026-01-01T00:01:00Z"),
        amount: 250,
        repShipType: "Oneiros",
        repModule: "Medium Remote Armor Repairer II",
      }),
    ];

    render(
      <RepsPerSourceTable
        entries={entries}
        brushWindow={{
          start: new Date("2026-01-01T00:00:30Z"),
          end: new Date("2026-01-01T00:01:30Z"),
        }}
      />,
    );

    expect(screen.getByText("REPS BY SOURCE — BRUSH SELECTION")).toBeTruthy();
    expect(screen.queryByText("100")).toBeNull();
    expect(screen.getByText("Oneiros")).toBeTruthy();
  });
});

describe("CapPressurePerSourceTable", () => {
  it("renders hits and supports row-click zoom callback", () => {
    const onSourceClick = vi.fn();
    const entries: LogEntry[] = [
      mkEntry({
        eventType: "neut-received",
        capEventType: "neut-received",
        timestamp: new Date("2026-01-01T00:00:05Z"),
        capAmount: 300,
        capShipType: "Curse",
        capModule: "Heavy Energy Neutralizer II",
      }),
      mkEntry({
        eventType: "neut-received",
        capEventType: "neut-received",
        timestamp: new Date("2026-01-01T00:00:20Z"),
        capAmount: 0,
        capShipType: "Curse",
        capModule: "Heavy Energy Neutralizer II",
      }),
      mkEntry({
        eventType: "neut-dealt",
        capEventType: "neut-dealt",
        direction: "outgoing",
        timestamp: new Date("2026-01-01T00:00:30Z"),
        capAmount: 180,
        capShipType: "Bhaalgorn",
        capModule: "Heavy Energy Neutralizer II",
      }),
    ];

    render(
      <CapPressurePerSourceTable
        entries={entries}
        brushWindow={null}
        onSourceClick={onSourceClick}
      />,
    );

    expect(
      screen.getByText("CAP PRESSURE BY SOURCE — FULL SESSION"),
    ).toBeTruthy();
    expect(screen.getByText("Hits")).toBeTruthy();
    expect(screen.getByText("Zero Hits")).toBeTruthy();
    expect(screen.getByText("Curse")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("Curse"));
    expect(onSourceClick).toHaveBeenCalledTimes(1);
    const [start, end] = onSourceClick.mock.calls[0] as [Date, Date];
    expect(start.toISOString()).toBe("2026-01-01T00:00:05.000Z");
    expect(end.toISOString()).toBe("2026-01-01T00:00:20.000Z");
  });
});
