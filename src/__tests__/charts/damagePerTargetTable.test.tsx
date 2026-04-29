import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import DamagePerTargetTable from "@/components/charts/DamagePerTargetTable";
import DamageReceivedPerTargetTable from "@/components/charts/DamageReceivedPerTargetTable";
import type { LogEntry } from "@/lib/types";

let idCounter = 0;

function mkEntry(partial: Partial<LogEntry>): LogEntry {
  idCounter += 1;
  return {
    id: partial.id ?? `entry-${idCounter}`,
    timestamp: partial.timestamp ?? new Date("2026-01-01T00:00:00Z"),
    rawLine: partial.rawLine ?? "",
    eventType: partial.eventType ?? "other",
    ...partial,
  };
}

describe("DamagePerTargetTable — misses", () => {
  it("counts outgoing misses against the same player target as damage-dealt", () => {
    const entries: LogEntry[] = [
      // Damage parser stores pilot in pilotName and ship in shipType.
      mkEntry({
        eventType: "damage-dealt",
        pilotName: "Xerathul Naskingar",
        shipType: "Vigil",
        weapon: "Imperial Navy Acolyte",
        amount: 38,
        hitQuality: "Hits",
        timestamp: new Date("2026-01-01T00:00:00Z"),
      }),
      mkEntry({
        eventType: "damage-dealt",
        pilotName: "Xerathul Naskingar",
        shipType: "Vigil",
        weapon: "Imperial Navy Acolyte",
        amount: 67,
        hitQuality: "Smashes",
        timestamp: new Date("2026-01-01T00:00:05Z"),
      }),
      // Miss parser stores target name in shipType (no pilotName) — historical
      // shape that broke the join with damage rows.
      mkEntry({
        eventType: "miss-outgoing",
        shipType: "Xerathul Naskingar",
        weapon: "Imperial Navy Acolyte",
        timestamp: new Date("2026-01-01T00:00:02Z"),
      }),
      mkEntry({
        eventType: "miss-outgoing",
        shipType: "Xerathul Naskingar",
        weapon: "Imperial Navy Acolyte",
        timestamp: new Date("2026-01-01T00:00:03Z"),
      }),
      mkEntry({
        eventType: "miss-outgoing",
        shipType: "Xerathul Naskingar",
        weapon: "Imperial Navy Acolyte",
        timestamp: new Date("2026-01-01T00:00:04Z"),
      }),
    ];

    render(<DamagePerTargetTable entries={entries} brushWindow={null} />);

    const row = screen.getByText("Xerathul Naskingar").closest("tr")!;
    expect(row).toBeTruthy();
    const cells = within(row).getAllByRole("cell");
    // Columns: Target/Ship, Corp, Total Dmg, DPS, Hits, Min, Max, Avg, Misses
    expect(cells[8].textContent).toBe("3");
    expect(cells[4].textContent).toBe("2"); // hits
    // Ship comes from the damage row — not from the miss event's "shipType".
    expect(within(row).getByText("Vigil")).toBeTruthy();
  });

  it("includes misses in the hit-quality tooltip breakdown", () => {
    const entries: LogEntry[] = [
      mkEntry({
        eventType: "damage-dealt",
        pilotName: "Target One",
        shipType: "Atron",
        amount: 100,
        hitQuality: "Hits",
      }),
      mkEntry({
        eventType: "miss-outgoing",
        shipType: "Target One",
      }),
      mkEntry({
        eventType: "miss-outgoing",
        shipType: "Target One",
      }),
    ];

    render(<DamagePerTargetTable entries={entries} brushWindow={null} />);

    // Trigger tooltip
    const trigger = screen.getByText("1");
    fireEvent.mouseEnter(trigger.parentElement!);

    // Tooltip is portaled — locate it via its role and assert the breakdown.
    const tooltip = screen.getByRole("tooltip");
    const missesLabel = within(tooltip).getByText("Misses");
    expect(missesLabel).toBeTruthy();
    // Misses 2 / 66.7% (over total shots = 3); count and percent are in
    // adjacent spans so collapse whitespace before matching.
    expect(tooltip.textContent?.replace(/\s+/g, "")).toContain(
      "Misses2(66.7%)",
    );
  });
});

describe("DamageReceivedPerTargetTable — misses", () => {
  it("counts incoming misses against the same attacker as damage-received", () => {
    const entries: LogEntry[] = [
      mkEntry({
        eventType: "damage-received",
        pilotName: "Hostile Bob",
        shipType: "Cerberus",
        weapon: "Scourge Heavy Missile",
        amount: 250,
        hitQuality: "Hits",
      }),
      // miss-incoming carries pilotName but no shipType.
      mkEntry({
        eventType: "miss-incoming",
        pilotName: "Hostile Bob",
        weapon: "Scourge Heavy Missile",
      }),
      mkEntry({
        eventType: "miss-incoming",
        pilotName: "Hostile Bob",
        weapon: "Scourge Heavy Missile",
      }),
    ];

    render(
      <DamageReceivedPerTargetTable entries={entries} brushWindow={null} />,
    );

    const row = screen.getByText("Hostile Bob").closest("tr")!;
    const cells = within(row).getAllByRole("cell");
    expect(cells[8].textContent).toBe("2");
    expect(cells[4].textContent).toBe("1");
    expect(within(row).getByText("Cerberus")).toBeTruthy();
  });
});
